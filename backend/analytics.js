// ── Visitor counter & visitor location statistics ────────────────────────────
//
//   POST /api/analytics/visit           record a visitor (once per IST day) and its location
//   GET  /api/analytics/stats           { total, today, month }
//   GET  /api/analytics/location-stats  aggregate countries / cities / today's locations
//
// Uses the shared PostgreSQL pool (db.js) — no other pool is created. All SQL is
// parameterised. Public responses contain counts and place names only: never IP
// addresses, visitor IDs or individual records. All dates are IST (Asia/Kolkata),
// independent of the server's own time zone.
const fs = require('fs');
const path = require('path');
const { randomUUID } = require('crypto');

// ── IST dates ────────────────────────────────────────────────────────────────
const IST_DATE = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' });
/** 'YYYY-MM-DD' of the given instant in IST */
const istDate = (d = new Date()) => IST_DATE.format(d);
/** First day of the IST month containing `dateStr`, and of the following month */
function istMonthRange(dateStr) {
  const [y, m] = dateStr.split('-').map(Number);
  const pad = n => String(n).padStart(2, '0');
  const next = m === 12 ? `${y + 1}-01-01` : `${y}-${pad(m + 1)}-01`;
  return { start: `${y}-${pad(m)}-01`, next };
}

// ── Client IP (behind Cloudflare / IIS / reverse proxies) ────────────────────
function extractIp(req) {
  const h = req.headers;
  const first = v => (Array.isArray(v) ? v[0] : v);
  const candidates = [h['cf-connecting-ip'], h['x-real-ip'], h['x-client-ip']];
  let ip = candidates.map(first).find(v => typeof v === 'string' && v.trim());
  if (!ip) {
    const fwd = first(h['x-forwarded-for']);
    if (typeof fwd === 'string') ip = fwd.split(',')[0];
  }
  if (!ip || !ip.trim()) ip = (req.socket && req.socket.remoteAddress) || '';
  return ip.trim().replace(/^::ffff:/i, '').slice(0, 64);
}

/** Private, loopback, link-local or otherwise non-public addresses are not geolocated */
function isPrivateIp(ip) {
  if (!ip) return true;
  const v = ip.toLowerCase();
  if (v === '::1' || v === '::' || v === 'localhost') return true;
  if (/^(fc|fd)[0-9a-f]{2}:/.test(v) || /^fe[89ab][0-9a-f]:/.test(v)) return true; // IPv6 ULA / link-local
  const m = v.match(/^(\d{1,3})\.(\d{1,3})\.\d{1,3}\.\d{1,3}$/);
  if (!m) return false;
  const [a, b] = [Number(m[1]), Number(m[2])];
  return a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127);
}

// ── City from a BigDataCloud reverse-geocode response ────────────────────────
// Chennai metropolitan suburbs are grouped under Chennai; otherwise the first
// municipal-level (adminLevel 5 or 6) entry that is not a taluk or district.
function cityFromBigDataCloud(data) {
  const admin = (data && data.localityInfo && data.localityInfo.administrative) || [];
  const isChennai = admin.some(a => /Chennai/i.test(a.name || '') || /Chennai/i.test(a.description || ''));
  if (isChennai) return 'Chennai';
  const candidate = admin.find(a =>
    (a.adminLevel === 5 || a.adminLevel === 6) &&
    !/taluk|district/i.test(a.name || ''));
  return (candidate && candidate.name) || data.city || data.locality || '';
}

// ── Server-side IP geolocation (fallback when the browser could not supply one) ─
const GEO_CACHE_MAX = 5000;
const geoCache = new Map(); // ip -> { country, countryCode, region, city }
const cacheSet = (ip, geo) => {
  if (geoCache.size >= GEO_CACHE_MAX) geoCache.delete(geoCache.keys().next().value); // drop oldest
  geoCache.set(ip, geo);
};

async function geolocate(ip, { fetchImpl = fetch } = {}) {
  if (isPrivateIp(ip)) return null;
  if (geoCache.has(ip)) return geoCache.get(ip);

  // 1. BigDataCloud (HTTPS)
  try {
    const res = await fetchImpl(`https://api.bigdatacloud.net/data/reverse-geocode-client?ip=${encodeURIComponent(ip)}`, { signal: AbortSignal.timeout(4000) });
    if (res.ok) {
      const data = await res.json();
      const geo = {
        country: (data && data.countryName) || '',
        countryCode: ((data && data.countryCode) || '').toUpperCase(),
        region: (data && data.principalSubdivision) || '',
        city: data ? cityFromBigDataCloud(data) : '',
      };
      if (geo.city && geo.country) { cacheSet(ip, geo); return geo; }
    }
  } catch { /* fall through to the next service */ }

  // 2. ip-api.com
  try {
    const res = await fetchImpl(`http://ip-api.com/json/${encodeURIComponent(ip)}?fields=status,country,countryCode,regionName,city`, { signal: AbortSignal.timeout(4000) });
    const data = await res.json();
    if (data && data.status === 'success' && data.city && data.country) {
      const geo = { country: data.country, countryCode: (data.countryCode || '').toUpperCase(), region: data.regionName || '', city: data.city };
      cacheSet(ip, geo);
      return geo;
    }
  } catch { /* best effort only */ }

  return null; // never invent a location
}

// ── Input clean-up ────────────────────────────────────────────────────────────
const cleanText = (v, max = 100) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : null);
const cleanCode = v => (typeof v === 'string' && /^[A-Za-z]{2}$/.test(v.trim()) ? v.trim().toUpperCase() : null);
const INVALID_PLACE = ['', 'unknown', 'undefined', 'null'];

// ── Short cache for the public statistics (all open pages poll them) ─────────
function cached(ttlMs) {
  let value = null, at = 0, pending = null;
  return {
    async get(load) {
      if (value && Date.now() - at < ttlMs) return value;
      if (!pending) pending = load().then(v => { value = v; at = Date.now(); return v; }).finally(() => { pending = null; });
      return pending;
    },
    clear() { value = null; },
  };
}

function registerAnalyticsRoutes(app, db, { geolocateImpl = geolocate, log = console, now = () => new Date(), statsTtlMs = 10_000, locationTtlMs = 30_000 } = {}) {
  const statsCache = cached(statsTtlMs);
  const locationCache = cached(locationTtlMs);

  // Create the two tables if missing (idempotent; see the SQL file for details)
  const migration = fs.readFileSync(path.join(__dirname, 'db', 'migrations', '001_visitor_analytics.sql'), 'utf8');
  const ready = db.query(migration)
    .then(() => true)
    .catch(e => { log.error('Visitor analytics tables:', (e.cause || e).message); return false; });

  // ── POST /api/analytics/visit ──────────────────────────────────────────────
  app.post('/api/analytics/visit', async (req, res) => {
    const body = req.body || {};
    const { sessionId } = body;
    if (typeof sessionId !== 'string' || !sessionId.trim() || sessionId.length > 64) {
      return res.status(400).json({ error: 'Invalid sessionId' });
    }
    try {
      if (!(await ready)) await db.query(migration); // tables could not be created at start-up
      const today = istDate(now());
      const ip = extractIp(req) || null;

      // Location priority: browser geotag → Cloudflare headers → server IP lookup
      const client = { city: cleanText(body.city, 150), region: cleanText(body.region, 150), country: cleanText(body.country), countryCode: cleanCode(body.countryCode) };
      const hasClientGeotag = Boolean(client.city && client.country);
      const cfCity = cleanText(req.headers['cf-ipcity'], 150);
      const cfCode = cleanCode(req.headers['cf-ipcountry']);
      let geo = null;
      if (hasClientGeotag) {
        geo = client;
      } else if (cfCity && cfCode) {
        geo = { city: cfCity, region: cleanText(req.headers['cf-region'], 150), country: cfCode === 'IN' ? 'India' : cfCode, countryCode: cfCode };
      } else {
        // Only look the IP up if this visitor has no city yet. The lookup happens
        // without holding a database connection.
        const { rows } = await db.query('SELECT city FROM site_visits WHERE session_id = $1', [sessionId]);
        if (!rows.length || !rows[0].city) geo = await geolocateImpl(ip).catch(() => null);
      }

      // New visitor: insert with the best location. Existing visitor: refresh
      // updated_at; a browser geotag always replaces the location, any other source
      // only fills it in when the city is still missing. One statement, so
      // simultaneous requests cannot create duplicates.
      await db.query(
        `INSERT INTO site_visits (id, session_id, ip, country, country_code, region, city)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (session_id) DO UPDATE SET
           updated_at   = CURRENT_TIMESTAMP,
           ip           = CASE WHEN $8 OR (site_visits.city IS NULL AND EXCLUDED.city IS NOT NULL)
                               THEN COALESCE(EXCLUDED.ip, site_visits.ip) ELSE site_visits.ip END,
           country      = CASE WHEN $8 OR (site_visits.city IS NULL AND EXCLUDED.city IS NOT NULL)
                               THEN EXCLUDED.country ELSE site_visits.country END,
           country_code = CASE WHEN $8 OR (site_visits.city IS NULL AND EXCLUDED.city IS NOT NULL)
                               THEN COALESCE(EXCLUDED.country_code, site_visits.country_code) ELSE site_visits.country_code END,
           region       = CASE WHEN $8 OR (site_visits.city IS NULL AND EXCLUDED.city IS NOT NULL)
                               THEN COALESCE(EXCLUDED.region, site_visits.region) ELSE site_visits.region END,
           city         = CASE WHEN $8 OR (site_visits.city IS NULL AND EXCLUDED.city IS NOT NULL)
                               THEN EXCLUDED.city ELSE site_visits.city END`,
        [randomUUID(), sessionId, ip,
          geo ? geo.country : null, geo ? (geo.countryCode || null) : null,
          geo ? (geo.region || null) : null, geo ? geo.city : null, hasClientGeotag]
      );
      // Count this visitor once for today (IST)
      await db.query(
        `INSERT INTO site_daily_visits (id, session_id, date) VALUES ($1, $2, $3::date)
         ON CONFLICT (session_id, date) DO NOTHING`,
        [randomUUID(), sessionId, today]
      );
      statsCache.clear();
      res.json({ ok: true });
    } catch (e) {
      if (e.code !== 'DB_UNAVAILABLE') log.error('Failed to record visit:', e.message);
      res.status(500).json({ error: e.code === 'DB_UNAVAILABLE' ? e.message : 'Failed to record visit' });
    }
  });

  // ── GET /api/analytics/stats ───────────────────────────────────────────────
  app.get('/api/analytics/stats', async (req, res) => {
    try {
      await ready;
      const today = istDate(now());
      const { start, next } = istMonthRange(today);
      const stats = await statsCache.get(async () => {
        const [total, todayCount, month] = await Promise.all([
          db.query('SELECT count(*)::int AS n FROM site_visits'),
          db.query('SELECT count(*)::int AS n FROM site_daily_visits WHERE date = $1::date', [today]),
          db.query('SELECT count(DISTINCT session_id)::int AS n FROM site_daily_visits WHERE date >= $1::date AND date < $2::date', [start, next]),
        ]);
        return { total: total.rows[0].n, today: todayCount.rows[0].n, month: month.rows[0].n };
      });
      res.set('Cache-Control', 'no-store').json(stats);
    } catch (e) {
      if (e.code !== 'DB_UNAVAILABLE') log.error('Failed to fetch visitor stats:', e.message);
      res.status(500).json({ error: e.code === 'DB_UNAVAILABLE' ? e.message : 'Failed to fetch stats' });
    }
  });

  // ── GET /api/analytics/location-stats ──────────────────────────────────────
  app.get('/api/analytics/location-stats', async (req, res) => {
    try {
      await ready;
      const today = istDate(now());
      const data = await locationCache.get(async () => {
        const [countries, cities, todayRows, todayTotal] = await Promise.all([
          db.query(
            `SELECT country, country_code, count(*)::int AS count FROM site_visits
              WHERE country IS NOT NULL AND lower(btrim(country)) <> ALL($1::text[])
              GROUP BY country, country_code ORDER BY count DESC, country LIMIT 15`, [INVALID_PLACE]),
          db.query(
            `SELECT city, region, country, count(*)::int AS count FROM site_visits
              WHERE city IS NOT NULL AND country IS NOT NULL
                AND lower(btrim(city)) <> ALL($1::text[]) AND lower(btrim(country)) <> ALL($1::text[])
              GROUP BY city, region, country ORDER BY count DESC, city LIMIT 15`, [INVALID_PLACE]),
          db.query(
            `SELECT v.city, v.region, v.country, v.country_code, count(*)::int AS count
               FROM site_daily_visits d JOIN site_visits v ON v.session_id = d.session_id
              WHERE d.date = $1::date AND v.city IS NOT NULL AND v.country IS NOT NULL
                AND lower(btrim(v.city)) <> ALL($2::text[]) AND lower(btrim(v.country)) <> ALL($2::text[])
              GROUP BY v.city, v.region, v.country, v.country_code`, [today, INVALID_PLACE]),
          db.query('SELECT count(*)::int AS n FROM site_daily_visits WHERE date = $1::date', [today]),
        ]);
        // Merge today's rows that differ only in country code (e.g. one missing it)
        const merged = new Map();
        for (const r of todayRows.rows) {
          const key = [r.city, r.region || '', r.country].join('|').toLowerCase();
          const row = merged.get(key);
          if (row) { row.count += r.count; if (!row.countryCode && r.country_code) row.countryCode = r.country_code; }
          else merged.set(key, { city: r.city, region: r.region || '', country: r.country, countryCode: r.country_code || '', count: r.count });
        }
        const todayCities = [...merged.values()].sort((a, b) => b.count - a.count || a.city.localeCompare(b.city));
        return {
          countries: countries.rows.map(r => ({ country: r.country, countryCode: r.country_code || '', count: r.count })),
          cities: cities.rows.map(r => ({ city: r.city, region: r.region || '', country: r.country, count: r.count })),
          today: {
            date: today,
            totalVisitors: todayTotal.rows[0].n,
            locatedVisitors: todayCities.reduce((s, c) => s + c.count, 0),
            cities: todayCities,
          },
        };
      });
      res.set('Cache-Control', 'no-store').json(data);
    } catch (e) {
      if (e.code !== 'DB_UNAVAILABLE') log.error('Failed to fetch location stats:', e.message);
      res.status(500).json({ error: e.code === 'DB_UNAVAILABLE' ? e.message : 'Failed to fetch location stats' });
    }
  });
}

module.exports = { registerAnalyticsRoutes, istDate, istMonthRange, extractIp, isPrivateIp, cityFromBigDataCloud, geolocate };
