// ── PostgreSQL: the one shared connection pool for this backend process ─────
//
// Every query in index.js goes through `db.query()` (pool.query underneath), which
// checks a connection out and always returns it, also when the query fails — so
// no route can leak a connection. This module adds what the shared database needs:
//
//  • A bounded pool (DB_POOL_MAX, default 10) that gives idle connections back
//    quickly and renews long-lived ones.
//  • application_name 'suvadi-web', so the website's connections can be told
//    apart from other applications in pg_stat_activity on the database server.
//  • Fast failure with back-off while PostgreSQL refuses connections (e.g.
//    "too many clients already"): instead of every request opening yet another
//    connection attempt, requests fail at once for a short, growing pause
//    (1 s … 30 s). The same pool recovers by itself once the server accepts again.
//  • Counters for the admin diagnostics endpoint (/api/admin/db-pool).
//
// Connection settings (host, port, database, user, password) are unchanged.
const { Pool } = require('pg');

const POOL_MAX = Math.max(1, parseInt(process.env.DB_POOL_MAX, 10) || 10);

// Message sent to visitors (HTTP 503) when the database cannot be reached.
// Internal details (e.g. "sorry, too many clients already") stay in the server log.
const DB_UNAVAILABLE_MESSAGE = 'Database temporarily unavailable. Please try again shortly.';

// Errors meaning "could not get a connection", as opposed to an error in a query.
// 53300 too_many_connections, 53400 configuration_limit_exceeded,
// 57P01 admin_shutdown (connection ended by an administrator), 57P02/57P03 crash/startup,
// 08xxx connection exceptions.
const CONNECTION_ERROR_CODES = new Set([
  '53300', '53400', '57P01', '57P02', '57P03',
  '08000', '08001', '08003', '08004', '08006',
  'ECONNREFUSED', 'ECONNRESET', 'ETIMEDOUT', 'EHOSTUNREACH', 'ENETUNREACH', 'ENOTFOUND', 'EPIPE', 'EAI_AGAIN',
]);
const isAcquireTimeout = err => /timeout exceeded when trying to connect/i.test(err && err.message || '');
const isConnectionError = err => !!err && (
  CONNECTION_ERROR_CODES.has(err.code) ||
  /Connection terminated|connection timeout/i.test(err.message || '')
);

function createDb(pool, { now = Date.now, log = console } = {}) {
  const stats = {
    startedAt: new Date().toISOString(),
    queries: 0, queryErrors: 0,
    connectionFailures: 0, acquireTimeouts: 0, fastFailed: 0, poolErrors: 0,
    peakTotal: 0, peakWaiting: 0,
    lastError: null, // { at, code, message } — message only, never connection details
  };

  let lastSaturationWarning = 0;

  // Back-off ("circuit breaker") while connections are refused
  const breaker = { consecutiveFailures: 0, openUntil: 0 };
  const breakerOpen = () => now() < breaker.openUntil;
  const retryAfterSeconds = () => Math.max(1, Math.ceil((breaker.openUntil - now()) / 1000));

  const record = (err) => {
    stats.lastError = { at: new Date(now()).toISOString(), code: err.code || null, message: String(err.message || err).slice(0, 200) };
  };
  const onConnectionFailure = (err) => {
    stats.connectionFailures += 1;
    breaker.consecutiveFailures += 1;
    const delay = Math.min(1000 * 2 ** (breaker.consecutiveFailures - 1), 30000);
    const wasOpen = breakerOpen();
    breaker.openUntil = now() + delay;
    if (!wasOpen) log.error(`❌ PostgreSQL unavailable (${err.code || err.message}); pausing new connection attempts for ${delay / 1000}s`);
  };
  const onSuccess = () => {
    if (breaker.consecutiveFailures > 0) log.warn('✅ PostgreSQL reachable again; normal operation resumed');
    breaker.consecutiveFailures = 0;
    breaker.openUntil = 0;
  };
  const unavailable = (cause) => {
    const e = new Error(DB_UNAVAILABLE_MESSAGE);
    e.code = 'DB_UNAVAILABLE';
    e.cause = cause;
    return e;
  };
  const trackPeaks = () => {
    stats.peakTotal = Math.max(stats.peakTotal, pool.totalCount);
    stats.peakWaiting = Math.max(stats.peakWaiting, pool.waitingCount);
  };

  pool.on('error', (err) => { // an idle connection was closed by the server or network
    stats.poolErrors += 1;
    record(err);
    log.error('❌ PostgreSQL Pool Error:', err.message);
  });

  async function query(text, params) {
    // While paused, fail at once unless an already-open connection is free to use
    if (breakerOpen() && pool.idleCount === 0) {
      stats.fastFailed += 1;
      throw unavailable(stats.lastError);
    }
    stats.queries += 1;
    try {
      const promise = pool.query(text, params);
      trackPeaks();
      const result = await promise;
      onSuccess();
      return result;
    } catch (err) {
      stats.queryErrors += 1;
      record(err);
      if (isAcquireTimeout(err)) {
        // All POOL_MAX connections busy for connectionTimeoutMillis: the pool is
        // saturated, not the server down — reported, but no back-off pause
        stats.acquireTimeouts += 1;
        if (now() - lastSaturationWarning > 60000) {
          lastSaturationWarning = now();
          log.warn(`⚠️  PostgreSQL pool saturated: all ${pool.options.max} connections busy, ${pool.waitingCount} request(s) waiting`);
        }
        throw unavailable(err);
      }
      if (isConnectionError(err)) {
        onConnectionFailure(err);
        throw unavailable(err);
      }
      throw err; // ordinary query error: unchanged behaviour
    }
  }

  function snapshot() {
    return {
      pool: {
        max: pool.options.max,
        total: pool.totalCount,
        idle: pool.idleCount,
        active: pool.totalCount - pool.idleCount,
        waiting: pool.waitingCount,
        idleTimeoutMs: pool.options.idleTimeoutMillis,
        connectionTimeoutMs: pool.options.connectionTimeoutMillis,
        maxLifetimeSeconds: pool.options.maxLifetimeSeconds,
      },
      breaker: {
        paused: breakerOpen(),
        retryInSeconds: breakerOpen() ? retryAfterSeconds() : 0,
        consecutiveFailures: breaker.consecutiveFailures,
      },
      stats: { ...stats },
    };
  }

  return { query, snapshot, breakerOpen, retryAfterSeconds };
}

const pool = new Pool({
  host:     process.env.DB_HOST     || '192.168.0.169',
  port:     parseInt(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME     || 'suvadi',
  user:     process.env.DB_USER     || 'postgres',
  password: process.env.DB_PASSWORD || 'cict26',
  max: POOL_MAX,
  // Give unused connections back to the shared server after 10 s (was 30 s)
  idleTimeoutMillis: 10000,
  // Wait at most 5 s for a connection (unchanged)
  connectionTimeoutMillis: 5000,
  // Replace connections after 30 min, so none is held indefinitely
  maxLifetimeSeconds: 1800,
  // Shown in pg_stat_activity, to identify this website's connections
  application_name: 'suvadi-web',
});

const db = createDb(pool);

// Close the pool's connections on an orderly shutdown, so the server frees them at
// once; then exit as Node would by default (a listener replaces the default exit).
// A hard kill (e.g. iisnode recycling) closes the sockets anyway.
let closing = false;
const closePoolAndExit = () => {
  if (closing) return;
  closing = true;
  const timer = setTimeout(() => process.exit(0), 3000); // never hang on shutdown
  pool.end().catch(() => {}).finally(() => { clearTimeout(timer); process.exit(0); });
};
process.once('SIGTERM', closePoolAndExit);
process.once('SIGINT', closePoolAndExit);

module.exports = { pool, db, createDb, POOL_MAX, DB_UNAVAILABLE_MESSAGE, isConnectionError };
