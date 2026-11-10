// Tests for backend/db.js connection handling — run with: npm test (in backend/)
// Uses a simulated pool and clock: no database is needed.
const { test } = require('node:test');
const assert = require('node:assert');
const { EventEmitter } = require('node:events');

process.env.DB_HOST = process.env.DB_HOST || '127.0.0.1'; // db.js builds (but does not connect) its real pool on load
const { createDb, DB_UNAVAILABLE_MESSAGE } = require('../db');

function fakePool() {
  const pool = new EventEmitter();
  Object.assign(pool, { totalCount: 0, idleCount: 0, waitingCount: 0, calls: 0,
    options: { max: 10, idleTimeoutMillis: 10000, connectionTimeoutMillis: 5000, maxLifetimeSeconds: 1800 } });
  pool.next = () => Promise.resolve({ rows: [{ ok: 1 }] });
  pool.query = () => { pool.calls += 1; return pool.next(); };
  return pool;
}
const pgError = (code, message) => Object.assign(new Error(message), { code });
const quiet = { error() {}, warn() {} };
function setup() {
  let t = 1_000_000;
  const clock = { now: () => t, advance: ms => { t += ms; } };
  const pool = fakePool();
  return { pool, clock, db: createDb(pool, { now: clock.now, log: quiet }) };
}

test('successful query returns the result', async () => {
  const { db } = setup();
  assert.deepStrictEqual((await db.query('SELECT 1')).rows, [{ ok: 1 }]);
  assert.strictEqual(db.snapshot().stats.queries, 1);
});

test('ordinary SQL errors are passed through unchanged and do not pause the database', async () => {
  const { db, pool } = setup();
  pool.next = () => Promise.reject(pgError('42P01', 'relation "x" does not exist'));
  await assert.rejects(db.query('SELECT * FROM x'), e => e.code === '42P01');
  assert.strictEqual(db.breakerOpen(), false);
});

test('"too many clients" gives a generic error and pauses new attempts with growing back-off', async () => {
  const { db, pool, clock } = setup();
  pool.next = () => Promise.reject(pgError('53300', 'sorry, too many clients already'));

  await assert.rejects(db.query('SELECT 1'), e => e.code === 'DB_UNAVAILABLE' && e.message === DB_UNAVAILABLE_MESSAGE);
  assert.strictEqual(db.breakerOpen(), true);
  assert.strictEqual(db.retryAfterSeconds(), 1);

  // During the pause: fails at once, without another connection attempt
  const callsBefore = pool.calls;
  await assert.rejects(db.query('SELECT 1'), e => e.code === 'DB_UNAVAILABLE');
  assert.strictEqual(pool.calls, callsBefore);
  assert.strictEqual(db.snapshot().stats.fastFailed, 1);

  // After the pause: one new attempt; failing again doubles the pause (2 s, 4 s, …)
  clock.advance(1001);
  await assert.rejects(db.query('SELECT 1'));
  assert.strictEqual(pool.calls, callsBefore + 1);
  assert.strictEqual(db.retryAfterSeconds(), 2);
});

test('back-off is capped at 30 seconds', async () => {
  const { db, pool, clock } = setup();
  pool.next = () => Promise.reject(pgError('ECONNREFUSED', 'connect ECONNREFUSED'));
  for (let i = 0; i < 10; i++) { await db.query('SELECT 1').catch(() => {}); clock.advance(60_000); }
  await db.query('SELECT 1').catch(() => {});
  assert.ok(db.retryAfterSeconds() <= 30, `pause ${db.retryAfterSeconds()} s`);
});

test('the same pool recovers once the server accepts connections again', async () => {
  const { db, pool, clock } = setup();
  pool.next = () => Promise.reject(pgError('53300', 'sorry, too many clients already'));
  await db.query('SELECT 1').catch(() => {});
  clock.advance(1001);
  pool.next = () => Promise.resolve({ rows: [] });
  await db.query('SELECT 1');
  assert.strictEqual(db.breakerOpen(), false);
  assert.strictEqual(db.snapshot().breaker.consecutiveFailures, 0);
});

test('during a pause, an already-open idle connection is still used', async () => {
  const { db, pool } = setup();
  pool.next = () => Promise.reject(pgError('53300', 'sorry, too many clients already'));
  await db.query('SELECT 1').catch(() => {});
  pool.idleCount = 1; pool.totalCount = 1;
  pool.next = () => Promise.resolve({ rows: [] });
  await db.query('SELECT 1');
  assert.strictEqual(db.breakerOpen(), false);
});

test('pool saturation (acquire timeout) is counted, reported generically, and does not pause', async () => {
  const { db, pool } = setup();
  pool.next = () => Promise.reject(new Error('timeout exceeded when trying to connect'));
  await assert.rejects(db.query('SELECT 1'), e => e.code === 'DB_UNAVAILABLE');
  assert.strictEqual(db.snapshot().stats.acquireTimeouts, 1);
  assert.strictEqual(db.breakerOpen(), false);
});

test('errors on idle connections are counted without crashing', () => {
  const { db, pool } = setup();
  pool.emit('error', pgError('57P01', 'terminating connection due to administrator command'));
  assert.strictEqual(db.snapshot().stats.poolErrors, 1);
});

test('snapshot reports pool usage', () => {
  const { db, pool } = setup();
  Object.assign(pool, { totalCount: 4, idleCount: 1, waitingCount: 2 });
  const s = db.snapshot().pool;
  assert.deepStrictEqual([s.max, s.total, s.idle, s.active, s.waiting], [10, 4, 1, 3, 2]);
});
