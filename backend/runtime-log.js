// ── Runtime log ──────────────────────────────────────────────────────────────
// Dependency-free file logger, required first by index.js so it also captures
// failures while the other modules load. Writes to backend/logs/app-YYYY-MM-DD.log
// (override with SUVADI_LOG_DIR); falls back to the OS temp dir if not writable.
// Daily files, capped at 10 MB/day, kept for 14 days.
// Secrets from .env, connection-string credentials and bearer tokens are redacted.
const fs = require('fs');
const os = require('os');
const path = require('path');
const util = require('util');

const MAX_BYTES_PER_DAY = 10 * 1024 * 1024;
const KEEP_DAYS = 14;
const SECRET_ENV_KEYS = ['DB_PASSWORD', 'JWT_SECRET', 'DATABASE_URL'];

function pickWritableDir() {
  const candidates = [
    process.env.SUVADI_LOG_DIR,
    path.join(__dirname, 'logs'),
    path.join(os.tmpdir(), 'suvadi-logs'),
  ].filter(Boolean);
  for (const dir of candidates) {
    try {
      fs.mkdirSync(dir, { recursive: true });
      // Real write probe: on Windows fs.access(W_OK) ignores folder ACLs
      const probe = path.join(dir, `.write-probe-${process.pid}`);
      fs.writeFileSync(probe, '');
      fs.unlinkSync(probe);
      return dir;
    } catch { /* try next */ }
  }
  return null;
}

const LOG_DIR = pickWritableDir();

function redact(text) {
  let s = String(text);
  for (const key of SECRET_ENV_KEYS) {
    const value = process.env[key];
    if (value && value.length >= 4) s = s.split(value).join(`<${key}>`);
  }
  return s
    .replace(/(postgres(?:ql)?:\/\/)[^@\s/]+@/gi, '$1<credentials>@')
    .replace(/(bearer\s+)[\w.~+/=-]+/gi, '$1<token>')
    .replace(/((?:password|passwd|secret|token)["']?\s*[:=]\s*["']?)[^"'\s,}]+/gi, '$1<redacted>');
}

function write(level, ...parts) {
  if (!LOG_DIR) return;
  try {
    const msg = parts.map(p => (typeof p === 'string' ? p : util.inspect(p, { depth: 3 }))).join(' ');
    const file = path.join(LOG_DIR, `app-${new Date().toISOString().slice(0, 10)}.log`);
    if (fs.existsSync(file) && fs.statSync(file).size > MAX_BYTES_PER_DAY) return;
    fs.appendFileSync(file, `${new Date().toISOString()} [${process.pid}] ${level} ${redact(msg)}\n`);
  } catch { /* logging must never break the app */ }
}

function pruneOldLogs() {
  if (!LOG_DIR) return;
  const cutoff = Date.now() - KEEP_DAYS * 24 * 60 * 60 * 1000;
  try {
    for (const name of fs.readdirSync(LOG_DIR)) {
      if (!/^app-\d{4}-\d{2}-\d{2}\.log$/.test(name)) continue;
      const file = path.join(LOG_DIR, name);
      if (fs.statSync(file).mtimeMs < cutoff) fs.unlinkSync(file);
    }
  } catch { /* ignore */ }
}

// Mirror console.error / console.warn into the log file (existing code reports
// DB and startup failures through them). console.log is not mirrored — volume.
for (const [method, level] of [['error', 'ERROR'], ['warn', 'WARN']]) {
  const original = console[method].bind(console);
  console[method] = (...args) => { write(level, ...args); original(...args); };
}

process.on('uncaughtException', (err) => write('UNCAUGHT', err && err.stack || err));
process.on('unhandledRejection', (reason) => write('UNHANDLED_REJECTION', reason && reason.stack || reason));
process.on('exit', (code) => write('EXIT', `code=${code} uptime=${Math.round(process.uptime())}s`));

pruneOldLogs();
const port = process.env.PORT || '';
write('START',
  `node=${process.version} exec=${process.execPath} cwd=${process.cwd()}`,
  `NODE_ENV=${process.env.NODE_ENV || '(unset)'}`,
  `listen=${port.startsWith('\\\\.\\pipe\\') ? 'iisnode-named-pipe' : port || '(unset)'}`,
  `logDir=${LOG_DIR}`);

// Express middleware: records every 5xx response with method, path (no query
// string), duration and the error message the route returned.
function httpErrorLogger(req, res, next) {
  const started = Date.now();
  const json = res.json.bind(res);
  res.json = (body) => {
    if (res.statusCode >= 500 && body && typeof body === 'object') {
      res.locals.errorDetail = body.message || body.error;
    }
    return json(body);
  };
  res.on('finish', () => {
    if (res.statusCode < 500) return;
    write('HTTP_5XX', `${req.method} ${req.path} -> ${res.statusCode} ${Date.now() - started}ms`,
      res.locals.errorDetail ? `error="${res.locals.errorDetail}"` : '');
  });
  next();
}

module.exports = { write, redact, httpErrorLogger, LOG_DIR };
