// Tests for backend/analytics.js — run with: npm test (in backend/)
//
// Unit tests always run. The database tests run only when
// ANALYTICS_TEST_DATABASE_URL points at a disposable PostgreSQL database, e.g.
//   ANALYTICS_TEST_DATABASE_URL=postgresql://postgres@127.0.0.1:55440/suvadi_test npm test
// They create the two analytics tables there and empty them between tests.
const { test, describe, before, after, beforeEach } = require('node:test');
const assert = require('node:assert');

process.env.DB_HOST = process.env.DB_HOST || '127.0.0.1'; // db.js builds (but does not use) its default pool on load
const { istDate, istMonthRange, extractIp, isPrivateIp, cityFromBigDataCloud, geolocate, registerAnalyticsRoutes } = require('../analytics');

// ── Unit tests ────────────────────────────────────────────────────────────────
describe('IST dates', () => {
  test('midnight IST is 18:30 UTC', () => {
    assert.strictEqual(istDate(new Date('2026-11-10T18:29:59Z')), '2026-11-10');
    assert.strictEqual(istDate(new Date('2026-11-10T18:30:00Z')), '2026-11-11');
  });
  test('month boundaries, including the year end', () => {
    assert.strictEqual(istDate(new Date('2026-10-31T18:30:00Z')), '2026-11-01');
    assert.deepStrictEqual(istMonthRange('2026-11-11'), { start: '2026-11-01', next: '2026-12-01' });
    assert.deepStrictEqual(istMonthRange('2026-12-31'), { start: '2026-12-01', next: '2027-01-01' });
  });
});

describe('client IP', () => {
  const req = (headers, remote = '::ffff:10.0.0.9') => ({ headers, socket: { remoteAddress: remote } });
  test('header priority', () => {
    assert.strictEqual(extractIp(req({ 'cf-connecting-ip': '1.1.1.1', 'x-real-ip': '2.2.2.2' })), '1.1.1.1');
    assert.strictEqual(extractIp(req({ 'x-real-ip': '2.2.2.2', 'x-client-ip': '3.3.3.3' })), '2.2.2.2');
    assert.strictEqual(extractIp(req({ 'x-client-ip': '3.3.3.3', 'x-forwarded-for': '4.4.4.4' })), '3.3.3.3');
    assert.strictEqual(extractIp(req({ 'x-forwarded-for': '4.4.4.4, 5.5.5.5' })), '4.4.4.4');
  });
  test('socket address with ::ffff: removed', () => {
    assert.strictEqual(extractIp(req({})), '10.0.0.9');
  });
  test('private and loopback addresses are recognised', () => {
    for (const ip of ['127.0.0.1', '10.1.2.3', '192.168.0.169', '172.16.0.1', '172.31.9.9', '169.254.1.1', '::1', 'fd00::1', 'fe80::1', ''])
      assert.ok(isPrivateIp(ip), ip);
    for (const ip of ['218.248.27.194', '172.32.0.1', '8.8.8.8', '2001:4860::8888'])
      assert.ok(!isPrivateIp(ip), ip);
  });
});

describe('city selection (BigDataCloud)', () => {
  const resp = (admin, extra = {}) => ({ localityInfo: { administrative: admin }, ...extra });
  test('Chennai suburbs are grouped under Chennai', () => {
    assert.strictEqual(cityFromBigDataCloud(resp([
      { name: 'Tamil Nadu', adminLevel: 4 },
      { name: 'Chengalpattu', adminLevel: 5, description: 'district' },
      { name: 'Perumbakkam', adminLevel: 8, description: 'suburb in Chennai metropolitan area' },
    ])), 'Chennai');
  });
  test('first adminLevel 5/6 entry that is not a taluk or district', () => {
    assert.strictEqual(cityFromBigDataCloud(resp([
      { name: 'Coimbatore district', adminLevel: 5 },
      { name: 'Coimbatore North Taluk', adminLevel: 6 },
      { name: 'Coimbatore', adminLevel: 6 },
    ])), 'Coimbatore');
  });
  test('falls back to city, then locality', () => {
    assert.strictEqual(cityFromBigDataCloud(resp([], { city: 'Madurai' })), 'Madurai');
    assert.strictEqual(cityFromBigDataCloud(resp([], { locality: 'Kodaikanal' })), 'Kodaikanal');
    assert.strictEqual(cityFromBigDataCloud(resp([])), '');
  });
});

describe('server-side geolocation', () => {
  const json = (body, ok = true) => Promise.resolve({ ok, json: () => Promise.resolve(body) });
  test('private addresses are never sent to a service', async () => {
    let called = false;
    assert.strictEqual(await geolocate('192.168.1.5', { fetchImpl: () => { called = true; } }), null);
    assert.strictEqual(called, false);
  });
  test('falls back to ip-api.com, and caches the result', async () => {
    let calls = 0;
    const fetchImpl = url => { calls++; return url.includes('bigdatacloud') ? json({ countryName: 'India' }) : json({ status: 'success', country: 'India', countryCode: 'in', regionName: 'Kerala', city: 'Kochi' }); };
    const geo = await geolocate('203.0.113.77', { fetchImpl });
    assert.deepStrictEqual(geo, { country: 'India', countryCode: 'IN', region: 'Kerala', city: 'Kochi' });
    await geolocate('203.0.113.77', { fetchImpl });
    assert.strictEqual(calls, 2, 'second lookup served from the cache');
  });
  test('returns null (no invented defaults) when both services fail', async () => {
    const fetchImpl = () => Promise.reject(new Error('network down'));
    assert.strictEqual(await geolocate('198.51.100.20', { fetchImpl }), null);
  });
});

// ── Database tests ────────────────────────────────────────────────────────────
const DB_URL = process.env.ANALYTICS_TEST_DATABASE_URL;
describe('API with PostgreSQL', { skip: DB_URL ? false : 'set ANALYTICS_TEST_DATABASE_URL to run' }, () => {
  let pool, server, base, clock, geoResult, geoCalls;
  const post = (body, headers = {}) => fetch(`${base}/api/analytics/visit`, { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify(body) });
  const get = async p => (await fetch(base + p)).json();
  const q = async (sql, params) => (await pool.query(sql, params)).rows;

  before(async () => {
    const express = require('express');
    const { Pool } = require('pg');
    const { createDb } = require('../db');
    pool = new Pool({ connectionString: DB_URL, max: 5 });
    const db = createDb(pool, { log: { error() {}, warn() {} } });
    const app = express();
    app.use(express.json());
    clock = { t: new Date('2026-11-11T06:00:00Z') }; // 11:30 IST
    registerAnalyticsRoutes(app, db, {
      now: () => clock.t, statsTtlMs: 0, locationTtlMs: 0, log: { error() {} },
      geolocateImpl: async ip => { geoCalls.push(ip); if (geoResult instanceof Error) throw geoResult; return geoResult; },
    });
    await new Promise(r => { server = app.listen(0, '127.0.0.1', r); });
    base = `http://127.0.0.1:${server.address().port}`;
    await post({ sessionId: 'warm-up' }); // waits for the tables to exist
  });
  after(async () => { server && server.close(); pool && await pool.end(); });
  beforeEach(async () => {
    await pool.query('TRUNCATE site_daily_visits, site_visits');
    clock.t = new Date('2026-11-11T06:00:00Z');
    geoResult = null; geoCalls = [];
  });

  test('invalid sessionId → 400', async () => {
    for (const body of [{}, { sessionId: '' }, { sessionId: '   ' }, { sessionId: 42 }, { sessionId: 'x'.repeat(65) }])
      assert.strictEqual((await post(body)).status, 400, JSON.stringify(body).slice(0, 40));
  });

  test('first visit, then more pages the same day: counted once', async () => {
    assert.deepStrictEqual(await (await post({ sessionId: 'v1' })).json(), { ok: true });
    await post({ sessionId: 'v1' }); await post({ sessionId: 'v1' });
    assert.deepStrictEqual(await get('/api/analytics/stats'), { total: 1, today: 1, month: 1 });
    assert.strictEqual((await q('SELECT count(*)::int n FROM site_daily_visits'))[0].n, 1);
  });

  test('returning visitor on the next IST day; month and total counts', async () => {
    clock.t = new Date('2026-11-10T18:29:00Z'); // 23:59 IST on 10 Nov
    await post({ sessionId: 'a' }); await post({ sessionId: 'b' });
    clock.t = new Date('2026-11-10T18:31:00Z'); // 00:01 IST on 11 Nov
    await post({ sessionId: 'a' });
    assert.deepStrictEqual(await get('/api/analytics/stats'), { total: 2, today: 1, month: 2 });
    const rows = await q("SELECT date::text FROM site_daily_visits WHERE session_id = 'a' ORDER BY date");
    assert.deepStrictEqual(rows.map(r => r.date), ['2026-11-10', '2026-11-11']);
  });

  test('a new IST month starts a new monthly count', async () => {
    clock.t = new Date('2026-10-31T18:29:00Z'); // 23:59 IST, 31 Oct
    await post({ sessionId: 'oct-only' }); await post({ sessionId: 'both' });
    clock.t = new Date('2026-10-31T18:30:00Z'); // 00:00 IST, 1 Nov
    await post({ sessionId: 'both' });
    assert.deepStrictEqual(await get('/api/analytics/stats'), { total: 2, today: 1, month: 1 });
  });

  test('20 simultaneous first requests from one browser create one visitor and one daily record', async () => {
    const res = await Promise.all(Array.from({ length: 20 }, () => post({ sessionId: 'burst' })));
    assert.ok(res.every(r => r.status === 200), res.map(r => r.status).join(','));
    assert.strictEqual((await q("SELECT count(*)::int n FROM site_visits WHERE session_id='burst'"))[0].n, 1);
    assert.strictEqual((await q("SELECT count(*)::int n FROM site_daily_visits WHERE session_id='burst'"))[0].n, 1);
  });

  test('browser geotag is stored, and always replaces an earlier location', async () => {
    geoResult = { city: 'Mumbai', region: 'Maharashtra', country: 'India', countryCode: 'IN' };
    await post({ sessionId: 'g' }); // no geotag yet → server lookup
    assert.deepStrictEqual(geoCalls.length, 1);
    await post({ sessionId: 'g', city: 'Chennai', region: 'Tamil Nadu', country: 'India', countryCode: 'in' });
    const [row] = await q("SELECT city, region, country, country_code FROM site_visits WHERE session_id='g'");
    assert.deepStrictEqual(row, { city: 'Chennai', region: 'Tamil Nadu', country: 'India', country_code: 'IN' });
  });

  test('without a geotag, an existing location is kept and no lookup is made', async () => {
    await post({ sessionId: 'k', city: 'Chennai', region: 'Tamil Nadu', country: 'India', countryCode: 'IN' });
    geoResult = { city: 'Delhi', region: 'Delhi', country: 'India', countryCode: 'IN' };
    await post({ sessionId: 'k' });
    await post({ sessionId: 'k' }, { 'cf-ipcity': 'Kolkata', 'cf-ipcountry': 'IN' });
    assert.strictEqual(geoCalls.length, 0);
    assert.strictEqual((await q("SELECT city FROM site_visits WHERE session_id='k'"))[0].city, 'Chennai');
  });

  test('Cloudflare headers fill a missing location; IN becomes India', async () => {
    await post({ sessionId: 'cf' });
    await post({ sessionId: 'cf' }, { 'cf-ipcity': 'Kolkata', 'cf-region': 'West Bengal', 'cf-ipcountry': 'IN' });
    const [row] = await q("SELECT city, region, country, country_code FROM site_visits WHERE session_id='cf'");
    assert.deepStrictEqual(row, { city: 'Kolkata', region: 'West Bengal', country: 'India', country_code: 'IN' });
  });

  test('geolocation failure never stops the visit being counted', async () => {
    geoResult = new Error('lookup crashed');
    assert.strictEqual((await post({ sessionId: 'nogeo' })).status, 200);
    geoResult = null;
    assert.strictEqual((await post({ sessionId: 'nogeo2' })).status, 200);
    assert.deepStrictEqual(await get('/api/analytics/stats'), { total: 2, today: 2, month: 2 });
    assert.deepStrictEqual(await q("SELECT city FROM site_visits WHERE session_id IN ('nogeo','nogeo2')"), [{ city: null }, { city: null }]);
  });

  test('location statistics: aggregates only, invalid places excluded, today merged', async () => {
    const visit = (id, city, region, country, countryCode) => post({ sessionId: id, city, region, country, countryCode });
    await visit('c1', 'Chennai', 'Tamil Nadu', 'India', 'IN');
    await visit('c2', 'Chennai', 'Tamil Nadu', 'India', 'IN');
    await visit('c3', 'Chennai', 'Tamil Nadu', 'India', '');      // same city, country code missing
    await visit('l1', 'London', 'England', 'United Kingdom', 'GB');
    await visit('u1', 'Unknown', '', 'Unknown', '');               // invalid → excluded
    await post({ sessionId: 'n1' });                                 // no location at all
    clock.t = new Date('2026-11-09T06:00:00Z');                      // an earlier day
    await visit('old', 'Madurai', 'Tamil Nadu', 'India', 'IN');
    clock.t = new Date('2026-11-11T06:00:00Z');

    const res = await fetch(base + '/api/analytics/location-stats');
    const text = await res.text();
    const data = JSON.parse(text);
    assert.deepStrictEqual(data.countries.find(c => c.countryCode === 'IN'), { country: 'India', countryCode: 'IN', count: 3 });
    assert.ok(!data.countries.some(c => /unknown/i.test(c.country)));
    assert.deepStrictEqual(data.cities[0], { city: 'Chennai', region: 'Tamil Nadu', country: 'India', count: 3 });
    assert.strictEqual(data.today.date, '2026-11-11');
    assert.strictEqual(data.today.totalVisitors, 6);           // c1 c2 c3 l1 u1 n1
    assert.strictEqual(data.today.locatedVisitors, 4);         // c1 c2 c3 l1
    assert.deepStrictEqual(data.today.cities[0], { city: 'Chennai', region: 'Tamil Nadu', country: 'India', countryCode: 'IN', count: 3 });
    assert.ok(!data.today.cities.some(c => c.city === 'Madurai'), 'other days excluded from Today');
    // nothing identifying in the public response
    for (const secret of ['c1', 'u1', 'n1', '127.0.0.1', 'session', '"ip"']) assert.ok(!text.includes(secret), `response contains ${secret}`);
  });

  test('deleting a visitor removes its daily records (ON DELETE CASCADE)', async () => {
    await post({ sessionId: 'del' });
    await pool.query("DELETE FROM site_visits WHERE session_id='del'");
    assert.strictEqual((await q("SELECT count(*)::int n FROM site_daily_visits WHERE session_id='del'"))[0].n, 0);
  });
});
