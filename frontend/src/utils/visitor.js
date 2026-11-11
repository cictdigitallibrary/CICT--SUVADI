/**
 * visitor.js — browser side of the visitor counter.
 *
 * A "visitor" is one browser: a random ID kept in a cookie and in localStorage.
 * No personal data is collected, and the browser's location permission is never
 * requested — the approximate city comes from the visitor's network address.
 */

const VISITOR_KEY = 'cict_visitor_id';

// Storage can be unavailable (private mode, blocked site data): never let that break the page
const safe = fn => { try { return fn(); } catch { return null; } };

/** Visitor ID: cookie, else localStorage, else a new random UUID; written back to both */
export function getOrCreateSessionId() {
  const fromCookie = safe(() => {
    const m = document.cookie.match(/(?:^|;\s*)cict_visitor_id=([^;]+)/);
    return m ? decodeURIComponent(m[1]) : null;
  });
  const valid = v => typeof v === 'string' && /^[A-Za-z0-9-]{8,64}$/.test(v);
  let id = valid(fromCookie) ? fromCookie : null;
  if (!id) {
    const stored = safe(() => localStorage.getItem(VISITOR_KEY));
    id = valid(stored) ? stored : null;
  }
  if (!id) id = safe(() => crypto.randomUUID());
  if (!id) return null;
  safe(() => { document.cookie = `${VISITOR_KEY}=${id}; path=/; max-age=31536000; SameSite=Lax`; });
  safe(() => localStorage.setItem(VISITOR_KEY, id));
  return id;
}

/** Today's date in India (Asia/Kolkata) as YYYY-MM-DD, whatever the device's time zone */
export const istDateString = (d = new Date()) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);

/**
 * Approximate visitor location (city, state, country) from BigDataCloud's free
 * client endpoint, which resolves the requesting network address. Silent: no
 * permission prompt, 5 s timeout, and null — never a made-up default — if unknown.
 */
export async function resolveVisitorGeotag({ fetchImpl = fetch } = {}) {
  try {
    const res = await fetchImpl('https://api.bigdatacloud.net/data/reverse-geocode-client', { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return null;
    const data = await res.json();
    if (!data || !data.countryName) return null;

    const admin = (data.localityInfo && data.localityInfo.administrative) || [];
    // Chennai metropolitan suburbs are counted as Chennai
    const isChennai = admin.some(a => /Chennai/i.test(a.name || '') || /Chennai/i.test(a.description || ''));
    let city = isChennai ? 'Chennai' : '';
    if (!city) {
      const candidate = admin.find(a =>
        (a.adminLevel === 5 || a.adminLevel === 6) && !/taluk|district/i.test(a.name || ''));
      city = (candidate && candidate.name) || data.city || data.locality || '';
    }
    const country = (data.countryName || '').trim();
    if (!city.trim() || !country) return null;
    return {
      city: city.trim(),
      region: (data.principalSubdivision || '').trim(),
      country,
      countryCode: (data.countryCode || '').trim().toUpperCase(),
    };
  } catch {
    return null; // network failure, timeout or blocked request: no location
  }
}

/** Flag emoji from a two-letter country code (regional indicator symbols); 🌐 otherwise */
export function flagEmoji(code) {
  if (typeof code !== 'string' || !/^[A-Za-z]{2}$/.test(code)) return '🌐';
  return String.fromCodePoint(...code.toUpperCase().split('').map(c => 0x1F1E6 + c.charCodeAt(0) - 65));
}
