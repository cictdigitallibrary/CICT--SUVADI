// Must stay first: records startup failures (including missing modules) to backend/logs
const runtimeLog = require('./runtime-log');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
// Load backend/.env by absolute path — under IIS/iisnode the working directory
// is not guaranteed to be backend/, so a bare config() could miss the file.
require('dotenv').config({ path: path.join(__dirname, '.env') });

// ── Keep server alive: log errors but never exit ──────────────────────────
process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err.message);
  console.error(err.stack);
});
process.on('unhandledRejection', (reason) => {
  console.error('❌ Unhandled Rejection:', reason);
});

const { initRetrieval, handleChatQuery } = require('./chatbot/retrieval');

const app = express();
app.use(runtimeLog.httpErrorLogger);
// Under iisnode PORT is a named pipe (\\.\pipe\...); 3001 is the local-dev default
const PORT = process.env.PORT || 3001;

const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
// Without JWT_SECRET a well-known fallback would let anyone forge an admin token.
// Use a random per-process secret instead: sign-in still works, sessions just end
// when the application restarts.
const JWT_SECRET = process.env.JWT_SECRET || (() => {
  console.error('❌ JWT_SECRET is not set in backend/.env — using a temporary random secret (admins must sign in again after every restart)');
  return require('crypto').randomBytes(48).toString('hex');
})();

// ── PostgreSQL Pool ──────────────────────────────────────────────────────────
// One shared pool per process, with back-off and monitoring: see db.js
const { db, POOL_MAX, DB_UNAVAILABLE_MESSAGE } = require('./db');

// Routes answer failures with res.status(500).json({ error: e.message }). When the
// cause is that the database could not be reached, send 503 + Retry-After instead,
// so clients see a temporary condition (the message is already the generic one
// from db.js; PostgreSQL's own wording stays in the server log).
app.use((req, res, next) => {
  const json = res.json.bind(res);
  res.json = (body) => {
    if (res.statusCode >= 500 && body && body.error === DB_UNAVAILABLE_MESSAGE) {
      res.status(503).set('Retry-After', String(db.breakerOpen() ? db.retryAfterSeconds() : 5));
    }
    return json(body);
  };
  next();
});

// Test DB connection on start
db.query('SELECT NOW()')
  .then(r => console.log(`✅ PostgreSQL connected: ${r.rows[0].now} (pool max ${POOL_MAX})`))
  .catch(e => console.error('❌ PostgreSQL connection failed:', e.cause ? e.cause.message : e.message));

// ── Static paths ─────────────────────────────────────────────────────────────
// PDFs and manuscript scans are on the UNC server share (set in .env).
// Website images and webinc resources are always served from the local project.
const STORAGE_PATH = process.env.STORAGE_PATH || path.join(__dirname, '..', 'storage');
const SONGS_PATH   = process.env.SONGS_PATH   || path.join(__dirname, '..', 'songs');
const IMAGES_PATH  = path.join(__dirname, '..', 'images');
const WEBINC_PATH  = path.join(__dirname, '..', 'webinc');

app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());

// Initialize Chatbot Deterministic Engine
initRetrieval();
console.log('[CHATBOT VERSION] conversational-context-v3 | retrieval:', require('path').resolve('./chatbot/retrieval.js'));

// ── Asset Middleware (silent - errors logged by express.static) ──────────────
const fsSync = require('fs');
app.use((req, res, next) => { next(); });


// Cache lifetimes: file names here are not content-hashed, so keep them modest
// (ETag revalidation still applies). Scans and PDFs are effectively immutable.
app.use('/images',  express.static(IMAGES_PATH,  { maxAge: '1d' }));
app.use('/songs',   express.static(SONGS_PATH,   { maxAge: '7d' }));
app.use('/webinc',  express.static(WEBINC_PATH,  { maxAge: '1d' }));
app.use('/storage', express.static(STORAGE_PATH, { maxAge: '7d' }));

const multer = require('multer');
const fs = require('fs');

// ── Upload helpers ───────────────────────────────────────────────────────────
// File name kept from the upload, made safe for disk and URLs: no folders, no
// characters outside letters (incl. Tamil), digits, dot, dash and underscore. The
// extension is kept separately, so a name made only of symbols ("@@.jpg") still ends
// in ".jpg", and long names are shortened without losing it.
// (Upload names are decoded as UTF-8 — defParamCharset below — so Tamil names arrive intact.)
const cleanNamePart = (s) => s.normalize('NFC').replace(/\s+/g, '_').replace(/[^\p{L}\p{M}\p{N}._-]/gu, '').replace(/_{2,}/g, '_');
const safeFileName = (name) => {
  const base = path.basename(String(name || '').replace(/\\/g, '/'));
  const ext = cleanNamePart(path.extname(base)).replace(/[^.\p{L}\p{N}]/gu, '').toLowerCase().slice(0, 10);
  let stem = cleanNamePart(base.slice(0, base.length - path.extname(base).length)).replace(/^[.]+/, '');
  // Capped in UTF-8 bytes, not characters: Tamil letters take 3 bytes each, and names
  // over 255 bytes cannot be copied, backed up or deleted by many tools (Git Bash,
  // Linux file systems, some backup / zip software) even though Windows accepts them
  while (Buffer.byteLength(stem, 'utf8') > 150) stem = [...stem].slice(0, -1).join('');
  return (stem || 'file') + (ext.length > 1 ? ext : '');
};
// Temporary name while a file arrives; renamed once the record is saved. Each one is
// remembered on the request so a failed or interrupted upload can be cleaned up
// (multer itself only removes files it has finished writing — a file still arriving
// when the client disconnects or cancels was left behind, e.g. 60 MB of a 150 MB PDF).
const TEMP_UPLOAD = /^upload_\d+_[a-z0-9]+\.tmp$/;
function tempUploadName(req, file, cb) {
  const name = `upload_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.tmp`;
  (req.uploadTempFiles = req.uploadTempFiles || []).push(path.join(file.tmpDir, name));
  cb(null, name);
}
// The partial file may still be open for a moment (Windows refuses to delete open
// files), so retry a few times
function removeTempUploads(req) {
  for (const p of req.uploadTempFiles || []) {
    let tries = 0;
    const attempt = () => fs.unlink(p, err => { if (err && err.code !== 'ENOENT' && ++tries < 6) setTimeout(attempt, 1000 * tries * tries).unref(); });
    attempt();
  }
}
const uploadError = (message) => Object.assign(new Error(message), { status: 400, expose: true });
// What a file really is, from its first bytes (the browser-sent type and the file name
// can both be wrong or forged). Returns the MIME type, or null when it is not one of these.
async function sniffFile(filePath) {
  const fh = await fs.promises.open(filePath, 'r');
  const b = Buffer.alloc(16);
  try { await fh.read(b, 0, 16, 0); } finally { await fh.close(); }
  if (b[0] === 0xFF && b[1] === 0xD8 && b[2] === 0xFF) return 'image/jpeg';
  if (b.toString('latin1', 0, 4) === 'GIF8') return 'image/gif';
  if (b.toString('latin1', 0, 2) === 'BM') return 'image/bmp';
  if (b.toString('latin1', 0, 4) === 'RIFF' && b.toString('latin1', 8, 12) === 'WEBP') return 'image/webp';
  if (b.toString('latin1', 4, 8) === 'ftyp' && /^avi[fs]$/.test(b.toString('latin1', 8, 12))) return 'image/avif';
  if (b.toString('latin1', 0, 5) === '%PDF-') return 'application/pdf';
  if (b[0] === 0x89 && b.toString('latin1', 1, 4) === 'PNG') return 'image/png';
  return null;
}

// ── Multer config for manuscript (song) image uploads ────────────────────────
// No size limit in the application (IIS caps a request at maxAllowedContentLength,
// web.config). Only image formats the website can display are accepted: PNG files are
// never shown publicly (isRealScan treats them as legacy placeholders) and browsers
// cannot display TIFF, so those are refused with a clear message instead of silently
// becoming a "missing" scan. SVG is refused because it can carry scripts.
const SCAN_TYPES = /^image\/(jpeg|pjpeg|webp|gif|bmp|avif)$/i;
const SCAN_EXT = /\.(jpe?g|webp|gif|bmp|avif)$/i;
const songStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    // cid arrives before the file in the form (AdminPortal appends it first)
    const cid = parseInt(req.body.cid, 10);
    if (!Number.isInteger(cid) || cid <= 0) return cb(uploadError('A sub-category must be selected before uploading'));
    // Refuse before anything is written (no stray folder, no large upload to a bad id)
    db.query('SELECT 1 FROM sv_sub_category WHERE id = $1', [cid]).then(({ rows }) => {
      if (!rows.length) return cb(uploadError('The selected sub-category does not exist'));
      const dir = path.join(SONGS_PATH, String(cid));
      fs.mkdir(dir, { recursive: true }, err => { file.tmpDir = dir; cb(err, dir); });
    }, cb);
  },
  // Temporary name; renamed to "<id>_<name>" once the record id is known
  filename: tempUploadName,
});
const uploadSong = multer({
  storage: songStorage,
  defParamCharset: 'utf8',
  fileFilter: (req, file, cb) => (SCAN_TYPES.test(file.mimetype) && SCAN_EXT.test(file.originalname))
    ? cb(null, true)
    : cb(uploadError('Manuscript scans must be JPEG, WebP, GIF, BMP or AVIF images (PNG and TIFF are not displayed on the website)')),
});

// Edition PDFs: stored in STORAGE_PATH/pdfs, where the PDF proxy reads them.
const PDF_DIR = path.join(STORAGE_PATH, 'pdfs');
const uploadPdf = multer({
  storage: multer.diskStorage({
    // Refuse before the (possibly very large) file is written when the edition does not exist
    destination: (req, file, cb) => db.query('SELECT 1 FROM sv_ebook_editions WHERE id = $1', [parseInt(req.params.id, 10) || 0]).then(({ rows }) => {
      if (!rows.length) return cb(Object.assign(new Error('Edition not found'), { status: 404 }));
      fs.mkdir(PDF_DIR, { recursive: true }, err => { file.tmpDir = PDF_DIR; cb(err, PDF_DIR); });
    }, cb),
    filename: tempUploadName,
  }),
  defParamCharset: 'utf8',
  fileFilter: (req, file, cb) => (/\.pdf$/i.test(file.originalname) || file.mimetype === 'application/pdf')
    ? cb(null, true) : cb(uploadError('Only PDF files can be uploaded as an edition')),
});

// Run a multer middleware and turn its errors into the JSON errors the admin shows
const withUpload = (mw) => (req, res, next) => mw(req, res, err => {
  if (!err) return next();
  removeTempUploads(req);
  res.status(err.status || 400).json({ error: err.message });
});
const removeQuietly = (p) => fs.promises.unlink(p).catch(() => {});

// ── Image file cache ─────────────────────────────────────────────────────────
// IMAGE_CACHE: used only by public-facing song browse/search endpoints.
// Maps `${cid}/${fname}` → first physical file found, so browse pages can
// display scan thumbnails without knowing the owning song's id.
const IMAGE_CACHE = {};
// Account name for log messages only. os.userInfo() can throw under IIS app pool
// identities (uv_os_get_passwd ENOMEM), so read the environment instead.
function appAccount() {
  return process.env.USERNAME || process.env.USER || 'unknown account';
}
function buildImageCache() {
  try {
    try {
      fs.accessSync(SONGS_PATH);
    } catch (e) {
      console.error(`❌ Manuscript scans unavailable: cannot access SONGS_PATH (${e.code || e.message}) as ${appAccount()}`);
      return;
    }
    for (const dir of fs.readdirSync(SONGS_PATH)) {
      const dirPath = path.join(SONGS_PATH, dir);
      if (!fs.statSync(dirPath).isDirectory()) continue;
      for (const file of fs.readdirSync(dirPath)) {
        if (TEMP_UPLOAD.test(file)) { removeStaleTemp(path.join(dirPath, file)); continue; }
        if (!isRealScan(path.join(dirPath, file))) continue;
        IMAGE_CACHE[`${dir}/${file}`] = `/songs/${dir}/${file}`;
      }
    }
    console.log(`✅ Image cache: ${Object.keys(IMAGE_CACHE).length} folio images indexed`);
  } catch (e) { console.warn('⚠️  Image cache build warning:', e.message); }
}
// Keep the cache current after an admin upload, replacement or deletion — one entry,
// instead of re-scanning every file on the share (buildImageCache), which blocks the
// whole server while it reads tens of thousands of scans.
function cacheSetImage(cid, filename) { IMAGE_CACHE[`${cid}/${filename}`] = `/songs/${cid}/${filename}`; }
function cacheDeleteImage(cid, filename) { delete IMAGE_CACHE[`${cid}/${filename}`]; }
function getImageUrl(cid, id, filename) {
  if (cid && filename) {
    const key = `${cid}/${filename}`;
    if (IMAGE_CACHE[key]) return IMAGE_CACHE[key];
  }
  return null;
}
// Safety net: unfinished uploads older than a day (only this app's own upload_*.tmp
// names, e.g. left by an application restart mid-upload) are removed at startup
function removeStaleTemp(p) {
  fs.stat(p, (err, st) => { if (!err && Date.now() - st.mtimeMs > 24 * 3600 * 1000) fs.unlink(p, () => {}); });
}
fs.readdir(PDF_DIR, (err, names) => { if (!err) names.filter(n => TEMP_UPLOAD.test(n)).forEach(n => removeStaleTemp(path.join(PDF_DIR, n))); });
buildImageCache();
// If the share was unreachable at startup, keep retrying so scans appear once
// access is restored — without needing an application restart.
setInterval(() => {
  if (Object.keys(IMAGE_CACHE).length === 0) buildImageCache();
}, 10 * 60 * 1000).unref();

// Reads the first 4 bytes of a file and returns false if it is a PNG.
function isRealScan(filePath) {
  try {
    const buf = Buffer.alloc(4);
    const fd2 = fs.openSync(filePath, 'r');
    fs.readSync(fd2, buf, 0, 4, 0);
    fs.closeSync(fd2);
    return !(buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4E && buf[3] === 0x47);
  } catch { return false; }
}

function resolveAdminImage(cid, id, filename, group_id) {
  if (!filename) return { url: null, actual_filename: null, is_missing: true };
  const cidStr = String(cid);
  const filePath = path.join(SONGS_PATH, cidStr, filename);
  if (fs.existsSync(filePath) && isRealScan(filePath)) {
    return { url: `/songs/${cidStr}/${filename}`, actual_filename: filename, is_missing: false };
  }
  return { url: null, actual_filename: null, is_missing: true };
}

// ── Book image / English name maps ───────────────────────────────────────────
const BOOK_COVER_MAP = {
  9:  '/images/ebook_title/tholkapiyam.png',
  10: '/images/ebook_title/ettuthokai.png',
  11: '/images/ebook_title/pathuppatu.png',
  12: '/images/ebook_title/silapthikaram.png',
  13: '/images/ebook_title/keezhkanakku.png',
  15: '/images/ebook_title/irayanar.png',
  16: '/images/ebook_title/mutholaiyram.png',
};
const BOOK_ENGLISH_MAP = {
  9:  'Tolkappiyam',
  10: 'Ettuthokai',
  11: 'Pattupattu',
  12: 'Silappatikaram',
  13: 'Pathinenkilkanakku',
  15: 'Irayanar Agapporul',
  16: 'Muttollayiram',
};
const EDITION_3D_COVERS = {
  1:  '/images/thol-cvr-sl/1.jpg',  2:  '/images/thol-cvr-sl/2.jpg',
  3:  '/images/thol-cvr-sl/3.jpg',  4:  '/images/thol-cvr-sl/thol.porul-1917.jpg',
  5:  '/images/thol-cvr-sl/5.jpg',  6:  '/images/thol-cvr-sl/6.jpg',
  7:  '/images/thol-cvr-sl/7.jpg',  8:  '/images/thol-cvr-sl/empty.jpg',
  9:  '/images/thol-cvr-sl/9.jpg',  10: '/images/thol-cvr-sl/10.jpg',
  11: '/images/thol-cvr-sl/11.jpg', 12: '/images/thol-cvr-sl/12.jpg',
  13: '/images/thol-cvr-sl/13.jpg', 14: '/images/thol-cvr-sl/14.jpg',
  15: '/images/thol-cvr-sl/15.jpg', 16: '/images/thol-cvr-sl/thol_kal.jpg',
  17: '/images/8t10p-cvr-sl/1.jpg', 18: '/images/8t10p-cvr-sl/2.jpg',
  19: '/images/8t10p-cvr-sl/3.jpg', 20: '/images/8t10p-cvr-sl/4.jpg',
  21: '/images/8t10p-cvr-sl/5.jpg', 22: '/images/8t10p-cvr-sl/6.jpg',
  23: '/images/8t10p-cvr-sl/7.jpg', 24: '/images/8t10p-cvr-sl/8.jpg',
  25: '/images/8t10p-cvr-sl/9.jpg', 26: '/images/Silappathikaram/1.1872.jpg',
  27: '/images/Silappathikaram/2.1876.jpg', 28: '/images/Silappathikaram/3.1880.jpg',
  29: '/images/Silappathikaram/silambu-1892.jpg',
  30: '/images/kilkanakku/small cover page/1.thirukkural.jpg',
  31: '/images/kilkanakku/small cover page/2.naladiyar.jpg',
  32: '/images/kilkanakku/small cover page/iniyavai 40.jpg',
  33: '/images/kilkanakku/small cover page/04.aasarakovai.jpg',
  34: '/images/kilkanakku/small cover page/thirukadugam.jpg',
  35: '/images/kilkanakku/small cover page/nanmanikadigai.jpg',
  36: '/images/kilkanakku/small cover page/palamoli 400.jpg',
  37: '/images/kilkanakku/small cover page/sirupanchamoolam.jpg',
  38: '/images/kilkanakku/small cover page/kalavizhi 40.jpg',
  39: '/images/kilkanakku/small cover page/10.kaar40.jpg',
  40: '/images/kilkanakku/small cover page/inna40.jpg',
  41: '/images/kilkanakku/small cover page/muthumozi.jpg',
  42: '/images/kilkanakku/small cover page/13.elathi.jpg',
  43: '/images/kilkanakku/small cover page/aintenai-50.jpg',
  44: '/images/kilkanakku/small cover page/15.thinai malai 150.jpg',
  45: '/images/kilkanakku/small cover page/ainthenai 70.jpg',
  46: '/images/kilkanakku/small cover page/thinaimozhi 50.jpg',
  47: '/images/kilkanakku/small cover page/18.kainilai_1931.jpg',
  48: '/images/irayanar/book cover.jpg',
  49: '/images/mutholayiram/muthol_1905.jpg',
};


// ══════════════════════════════════════════════════════════════════════════════
// PUBLIC API ROUTES
// ══════════════════════════════════════════════════════════════════════════════

// 1. All books (sv_book) with cover images
app.get('/api/texts', async (req, res) => {
  try {
    const { rows } = await db.query(
      'SELECT book_id as id, name as title_tamil, status FROM sv_book WHERE status = 1 ORDER BY book_id'
    );
    const texts = rows.map(r => ({
      ...r,
      title_english: BOOK_ENGLISH_MAP[r.id] || '',
      cover_image:   BOOK_COVER_MAP[r.id]   || null,
    }));
    res.json(texts);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// 2. Main categories (sv_main_category) – filter by book_id
app.get('/api/manuscripts', async (req, res) => {
  try {
    const { book_id } = req.query;
    if (!book_id) return res.json([]);
    const { rows } = await db.query(
      `SELECT mc.cid as id, mc.book_id as text_id, mc.cname as title_tamil,
              b.name as book_name
       FROM sv_main_category mc
       JOIN sv_book b ON b.book_id = mc.book_id
       WHERE mc.book_id = $1 AND mc.status = 1
       ORDER BY mc.cid`,
      [book_id]
    );
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// 2b. Sub-categories (sv_sub_category) – filter by main_category_id
app.get('/api/subcategories', async (req, res) => {
  try {
    const { cid } = req.query;
    if (!cid) return res.json([]);
    const { rows } = await db.query(
      `SELECT id, sub_cat_name as title_tamil, main_category_id
       FROM sv_sub_category
       WHERE main_category_id = $1 AND status = 1
       ORDER BY id`,
      [cid]
    );
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// 3. Search sv_songs by folio number OR keyword (within a sub-category)
app.get('/api/manuscripts/search', async (req, res) => {
  try {
    const { sub_id, type, q } = req.query;
    if (!sub_id || !q) return res.status(400).json({ error: 'Missing parameters' });

    const { rows: infoRows } = await db.query(
      `SELECT sc.sub_cat_name, mc.cname as cat_name, b.name as book_name, mc.cid as main_cid
       FROM sv_sub_category sc
       JOIN sv_main_category mc ON mc.cid = sc.main_category_id
       JOIN sv_book b ON b.book_id = mc.book_id
       WHERE sc.id = $1`,
      [sub_id]
    );
    const info = infoRows[0] || null;

    let rows;
    if (type === 'by_number') {
      const pageNum = parseInt(q, 10);
      if (isNaN(pageNum)) return res.json({ count: 0, results: [] });
      const r = await db.query(
        `SELECT id, fid as page_number, filename as image_file, description as text_content,
                group_id, view_counts, cid
         FROM sv_songs
         WHERE cid = $1 AND fid = $2 AND status = 1 AND trash = 0
         ORDER BY fid`,
        [sub_id, pageNum]
      );
      rows = r.rows;
    } else {
      const r = await db.query(
        `SELECT id, fid as page_number, filename as image_file, description as text_content,
                group_id, view_counts, cid
         FROM sv_songs
         WHERE cid = $1 AND description ILIKE $2 AND status = 1 AND trash = 0
         ORDER BY fid
         LIMIT 50`,
        [sub_id, `%${q}%`]
      );
      rows = r.rows;
    }

    const results = rows.map(r => ({
      ...r,
      image_url:       getImageUrl(r.cid, r.id, r.image_file),
      manuscript_name: info ? info.sub_cat_name : '',
      book_name:       info ? info.book_name    : '',
    }));

    res.json({ count: results.length, results });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── ★ ENHANCED: Global Search API ────────────────────────────────────────────
// GET /api/search?q=<query>&book_id=<opt>&main_cid=<opt>&sub_id=<opt>&page=1&limit=20
//
// All filters are OPTIONAL. Without filters, searches ALL manuscripts.
// Automatically detects numeric queries and switches to verse/folio search.
// Uses pg_trgm GIN index if available, falls back to ILIKE gracefully.
// Results are ranked: exact-word > starts-with > whole-word > partial > fuzzy.
// Each result includes a short contextual snippet around the matched word.
// Designed to be future-proof: adding OCR text column requires only minor changes here.

// One-time detection of pg_trgm availability at startup
let hasTrgm = false;
(async () => {
  try {
    const r = await db.query("SELECT extname FROM pg_extension WHERE extname='pg_trgm'");
    hasTrgm = r.rows.length > 0;
    console.log(`✅ pg_trgm: ${hasTrgm ? 'available (fast trigram search enabled)' : 'not installed (falling back to ILIKE)'}`);
  } catch { hasTrgm = false; }
})();

/**
 * extractSnippet — returns a short context window (~120 chars) around the
 * first occurrence of `word` in `text`. Strips HTML tags first.
 * Safe for Unicode / Tamil text (operates on code points, not bytes).
 */
function extractSnippet(text, word, windowSize = 120) {
  if (!text || !word) return '';
  // Strip HTML tags (description field contains <br/> and similar)
  const clean = text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  const lc = clean.toLowerCase();
  const wlc = word.toLowerCase();
  const idx = lc.indexOf(wlc);
  if (idx === -1) return clean.substring(0, windowSize * 2);
  const start = Math.max(0, idx - Math.floor(windowSize / 2));
  const end   = Math.min(clean.length, idx + word.length + Math.floor(windowSize / 2));
  let snippet = clean.substring(start, end);
  if (start > 0) snippet = '…' + snippet;
  if (end < clean.length) snippet = snippet + '…';
  return snippet;
}

app.get('/api/search', async (req, res) => {
  try {
    // ── 1. Parse and validate inputs ─────────────────────────────────────────
    const {
      q,
      book_id,
      main_cid,   // NEW: filter by main category (sv_main_category.cid)
      sub_id,
      page  = 1,
      limit = 20,
    } = req.query;

    if (!q || q.trim().length < 1) {
      return res.status(400).json({ error: 'Search query is required' });
    }

    // ── 2. NFC-normalize the query (critical for Tamil Unicode correctness) ──
    const rawQ    = q.normalize('NFC').trim();
    const isNum   = /^\d+$/.test(rawQ);               // numeric → verse/folio mode
    const limitN  = Math.min(Math.max(parseInt(limit) || 20, 1), 100);
    const pageN   = Math.max(parseInt(page) || 1, 1);
    const offset  = (pageN - 1) * limitN;

    // ── 3. Build WHERE conditions dynamically ─────────────────────────────────
    const conditions = ['s.status = 1', 's.trash = 0'];
    const params     = [];
    let   idx        = 1;

    if (isNum) {
      // Numeric query: exact folio/verse number match
      conditions.push(`s.fid = $${idx++}`);
      params.push(parseInt(rawQ));
    } else {
      // Text query: use pg_trgm similarity OR ILIKE fallback on both description and fname
      const searchTerm = `%${rawQ}%`;
      conditions.push(`(s.description ILIKE $${idx} OR s.fname ILIKE $${idx})`);
      params.push(searchTerm);
      idx++;
      // Future-proof: when an `ocr_text` column is added, extend here:
      // conditions[conditions.length - 1] =
      //   `(s.description ILIKE $N OR s.fname ILIKE $N OR s.ocr_text ILIKE $N)`;
    }

    // Optional hierarchy filters — each is independently optional
    if (book_id)  { conditions.push(`b.book_id = $${idx++}`);  params.push(parseInt(book_id)); }
    if (main_cid) { conditions.push(`mc.cid    = $${idx++}`);  params.push(parseInt(main_cid)); }
    if (sub_id)   { conditions.push(`s.cid     = $${idx++}`);  params.push(parseInt(sub_id)); }

    const whereClause = conditions.join(' AND ');

    // ── 4. Relevance ORDER BY ─────────────────────────────────────────────────
    // Rank: exact-word-boundary > starts-with > partial-match > fid order
    // Works for both Tamil and English. ILIKE is case-insensitive by default.
    const orderClause = isNum
      ? `s.fid`  // numeric: order by folio number
      : `
          CASE
            WHEN COALESCE(s.description, s.fname) ILIKE $${idx}   THEN 1  -- exact word boundary match
            WHEN COALESCE(s.description, s.fname) ILIKE $${idx+1} THEN 2  -- starts-with (prefix)
            WHEN COALESCE(s.description, s.fname) ILIKE $${idx+2} THEN 3  -- word starts within text
            ELSE                                     4  -- partial / fuzzy match
          END, b.book_id, mc.cid, s.fid
        `;

    // Push ranking params only for text queries
    const rankParams = isNum ? [] : [
      `% ${rawQ} %`,       // word with spaces on both sides → exact-word
      `${rawQ}%`,          // starts-with query at beginning
      `% ${rawQ}%`,        // word starts mid-text
    ];

    // ── 5. Count total matches (separate query for pagination) ────────────────
    const countQ = await db.query(
      `SELECT COUNT(*) as total
       FROM sv_songs s
       JOIN sv_sub_category  sc ON sc.id       = s.cid
       JOIN sv_main_category mc ON mc.cid      = sc.main_category_id
       JOIN sv_book          b  ON b.book_id   = mc.book_id
       WHERE ${whereClause}`,
      params
    );
    const total = parseInt(countQ.rows[0].total);

    // ── 6. Map final results ──────────────────────────────────────────────────
    let browsePage = null;
    if (isNum && sub_id && total > 0) {
      // Calculate which page this folio belongs to in browse mode (limit 12)
      const countRes = await db.query(
        'SELECT COUNT(*) as c FROM sv_songs WHERE cid=$1 AND fid <= $2 AND status=1 AND trash=0',
        [parseInt(sub_id), parseInt(rawQ)]
      );
      const index = parseInt(countRes.rows[0].c, 10);
      browsePage = Math.ceil(index / 12);
    }

    // ── 7. Fetch paginated results ────────────────────────────────────────────
    const allParams = [...params, ...rankParams, limitN, offset];
    const limitIdx  = idx + rankParams.length;
    const offsetIdx = limitIdx + 1;

    const dataQ = await db.query(
      `SELECT
         s.id,
         s.fid                 AS page_number,
         s.filename            AS image_file,
         s.description         AS text_content,
         s.cid,
         s.group_id,
         s.view_counts,
         sc.id                 AS sub_cat_id,
         sc.sub_cat_name       AS manuscript_name,
         mc.cid                AS main_cat_id,
         mc.cname              AS category_name,
         b.name                AS book_name,
         b.book_id
       FROM sv_songs s
       JOIN sv_sub_category  sc ON sc.id     = s.cid
       JOIN sv_main_category mc ON mc.cid    = sc.main_category_id
       JOIN sv_book          b  ON b.book_id = mc.book_id
       WHERE ${whereClause}
       ORDER BY ${orderClause}
       LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
      allParams
    );

    // ── 7. Post-process: add image URL, snippet, cover ────────────────────────
    const results = dataQ.rows.map(r => ({
      id:            r.id,
      page_number:   r.page_number,
      image_file:    r.image_file,
      text_content:  r.text_content,
      cid:           r.cid,
      sub_cat_id:    r.sub_cat_id,
      main_cat_id:   r.main_cat_id,
      group_id:      r.group_id,
      view_counts:   r.view_counts,
      manuscript_name: r.manuscript_name,
      category_name: r.category_name,
      book_name:     r.book_name,
      book_id:       r.book_id,
      image_url:     getImageUrl(r.cid, r.id, r.image_file),
      cover_image:   BOOK_COVER_MAP[r.book_id] || null,
      // Contextual snippet with the matched word highlighted in context
      snippet:       isNum ? null : extractSnippet(r.text_content, rawQ),
    }));

    // ── 8. Return structured response ─────────────────────────────────────────
    res.json({
      total,
      page:        pageN,
      limit:       limitN,
      total_pages: Math.ceil(total / limitN) || 0,
      query:       rawQ,
      is_number:   isNum,
      browse_page: browsePage,
      search_mode: sub_id   ? 'manuscript' :
                   main_cid ? 'category'   :
                   book_id  ? 'book'        : 'global',
      trgm_active: hasTrgm,
      results,
    });

  } catch (e) {
    console.error('[Search Error]', e.message);
    res.status(500).json({ error: e.message });
  }
});

// ── Browse songs (paginated) ─────────────────────────────────────────────────
app.get('/api/songs', async (req, res) => {
  try {
    const { sub_id, page = 1, limit = 20 } = req.query;
    if (!sub_id) return res.status(400).json({ error: 'sub_id required' });

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const { rows } = await db.query(
      `SELECT s.id, s.fid as page_number, s.filename as image_file, s.description as text_content, s.group_id, s.cid,
              sc.sub_cat_name as manuscript_name, mc.cname as category_name, b.name as book_name, b.book_id
       FROM sv_songs s
       LEFT JOIN sv_sub_category sc ON sc.id = s.cid
       LEFT JOIN sv_main_category mc ON mc.cid = sc.main_category_id
       LEFT JOIN sv_book b ON b.book_id = mc.book_id
       WHERE s.cid = $1 AND s.status = 1 AND s.trash = 0
       ORDER BY s.fid
       LIMIT $2 OFFSET $3`,
      [sub_id, parseInt(limit), offset]
    );

    const countR = await db.query(
      'SELECT COUNT(*) as c FROM sv_songs WHERE cid=$1 AND status=1 AND trash=0',
      [sub_id]
    );
    const total = parseInt(countR.rows[0].c);

    const results = rows.map(r => ({
      ...r,
      image_url: getImageUrl(r.cid, r.id, r.image_file),
    }));

    res.json({ total, page: parseInt(page), results });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// 4. Ebooks — book list
app.get('/api/ebooks', async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT b.book_id as id,
              b.name as title_tamil,
              COUNT(e.id) as edition_count
       FROM sv_book b
       LEFT JOIN sv_ebook_editions e ON e.book_id = b.book_id AND e.status = 1
       WHERE b.status = 1
       GROUP BY b.book_id, b.name
       ORDER BY b.book_id`
    );
    const ebooks = rows.map(r => ({
      ...r,
      cover_image: r.cover_image || BOOK_COVER_MAP[r.id] || null,
      book_url: `/ebooks/${r.id}`,
    }));
    res.json(ebooks);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// 4b. Ebook details — single book
app.get('/api/ebooks/:id', async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT book_id as id, name as title_tamil
       FROM sv_book WHERE book_id = $1`,
      [req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Book not found' });
    const book = rows[0];
    res.json({ ...book, cover_image: BOOK_COVER_MAP[book.id] || null });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// 4c. Ebook Editions
app.get('/api/ebooks/:id/editions', async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT e.id, e.title_tamil, e.title_english, e.pdf_url, e.local_pdf_url,
              e.image_folder, e.total_pages, e.editor, e.publisher, e.year_published
       FROM sv_ebook_editions e
       WHERE e.book_id = $1 AND e.status = 1
       ORDER BY e.id ASC`,
      [req.params.id]
    );
    // pdf_version (last change of the PDF file) is added to reader / download links, so a
    // replaced PDF is never served from a browser's 1-day cache of the old one
    const mapped = await Promise.all(rows.map(async r => {
      let pdf_version = null;
      if (r.local_pdf_url) {
        const st = await fs.promises.stat(path.join(STORAGE_PATH, 'pdfs', path.basename(r.local_pdf_url))).catch(() => null);
        if (st) pdf_version = Math.floor(st.mtimeMs);
      }
      return { ...r, pdf_version, edition_cover: EDITION_3D_COVERS[r.id] || null };
    }));
    // Read / download counts (0 until an edition is first opened or downloaded)
    const { rows: stats } = await db.query(
      'SELECT edition_id, views, downloads FROM ebook_edition_stats WHERE edition_id = ANY($1::int[])',
      [rows.map(r => r.id)]
    ).catch(() => ({ rows: [] }));
    const byId = new Map(stats.map(s => [s.edition_id, s]));
    mapped.forEach(r => {
      const s = byId.get(r.id);
      r.views = s ? Number(s.views) : 0;
      r.downloads = s ? Number(s.downloads) : 0;
    });
    res.json(mapped);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// 4d. Count a read of an edition (sent once by the reader when it opens). Only active
// editions are counted. Downloads are counted where the file is served (PDF proxy).
async function countEditionStat(editionId, column) {
  const id = parseInt(editionId, 10);
  if (!Number.isInteger(id) || id <= 0) return false;
  const col = column === 'downloads' ? 'downloads' : 'views';
  const { rowCount } = await db.query(
    `INSERT INTO ebook_edition_stats (edition_id, ${col}, updated_at)
       SELECT id, 1, NOW() FROM sv_ebook_editions WHERE id = $1 AND status = 1
     ON CONFLICT (edition_id) DO UPDATE SET ${col} = ebook_edition_stats.${col} + 1, updated_at = NOW()`,
    [id]
  );
  return rowCount > 0;
}
app.post('/api/ebooks/editions/:id/view', async (req, res) => {
  try {
    const counted = await countEditionStat(req.params.id, 'views');
    res.status(counted ? 204 : 404).end();
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// 5. Team members
app.get('/api/team', async (req, res) => {
  try {
    // Active members in the admin's display order, each with the photo set in the admin
    // (previously photos were assigned from a fixed list by position, so edits never showed)
    const { rows } = await db.query('SELECT * FROM team_members WHERE status = 1 ORDER BY display_order, id').catch(() => ({ rows: [] }));
    res.json(rows.map(m => ({ ...m, photo_url: m.photo_url || null })));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// 6. Stats (backward compatible + enhanced)
app.get('/api/stats', async (req, res) => {
  try {
    const [tc, mc, sc, subs, editions, tb] = await Promise.all([
      db.query('SELECT COUNT(*) as c FROM sv_book WHERE status=1'),
      db.query('SELECT COUNT(*) as c FROM sv_main_category WHERE status=1'),
      db.query('SELECT COUNT(*) as c FROM sv_songs WHERE status=1 AND trash=0'),
      db.query('SELECT COUNT(*) as c FROM sv_sub_category WHERE status=1'),
      db.query('SELECT COUNT(*) as c FROM sv_ebook_editions WHERE status=1'),
      db.query('SELECT COUNT(*) as c FROM sv_book'),
    ]);
    res.json({
      texts:          parseInt(tc.rows[0].c),
      manuscripts:    parseInt(mc.rows[0].c),
      sub_categories: parseInt(subs.rows[0].c),
      songs:          parseInt(sc.rows[0].c),
      ebook_editions: parseInt(editions.rows[0].c),
      total_books:    parseInt(tb.rows[0].c),
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// 8. Contact form submission
app.post('/api/contact', async (req, res) => {
  try {
    const { name, email, subject, message } = req.body;
    if (!name || !email || !message) {
      return res.status(400).json({ error: 'Name, email, and message are required.' });
    }
    await db.query(
      'INSERT INTO contacts (name, email, subject, message, is_read) VALUES ($1, $2, $3, $4, false)',
      [name, email, subject || '', message]
    );
    res.json({ success: true, message: 'Message received. Thank you!' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Transliteration proxy — calls Google Inputtools API server-side (avoids CORS)
const https = require('https');
app.get('/api/proxy/transliterate', (req, res) => {
  const { text, lang = 'ta' } = req.query;
  if (!text || !text.trim()) return res.json({ suggestions: [] });

  const encoded = encodeURIComponent(text.trim());
  const url = `https://www.google.com/inputtools/request?ime=transliteration_en_${lang}&num=8&cp=0&cs=0&ie=utf-8&oe=utf-8&app=jsapi&text=${encoded}`;

  https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (proxyRes) => {
    let raw = '';
    proxyRes.on('data', chunk => { raw += chunk; });
    proxyRes.on('end', () => {
      try {
        const parsed = JSON.parse(raw);
        const sugs = (parsed[0] === 'SUCCESS' && parsed[1]?.[0]?.[1]) ? parsed[1][0][1] : [];
        res.json({ suggestions: sugs });
      } catch (_) { res.json({ suggestions: [] }); }
    });
  }).on('error', () => res.json({ suggestions: [] }));
});


// Public response for an unreadable PDF: 404 only when the storage folder is
// reachable but the file is absent; 503 when the storage share itself cannot be
// reached. Paths and OS errors stay in the server log, not the response.
async function sendPdfUnavailable(res) {
  const storageReachable = await fs.promises.access(path.join(STORAGE_PATH, 'pdfs')).then(() => true, () => false);
  if (storageReachable) return res.status(404).json({ error: 'PDF file not found' });
  return res.status(503).json({ error: 'PDF storage is temporarily unavailable' });
}

// NEW PDF server — looks up by edition ID
app.get('/api/proxy/pdf/:editionId', async (req, res) => {
  const { editionId } = req.params;
  try {
    const { rows } = await db.query(
      'SELECT local_pdf_url FROM sv_ebook_editions WHERE id = $1 LIMIT 1',
      [parseInt(editionId, 10)]
    );
    const edition = rows[0];

    if (!edition || !edition.local_pdf_url) {
      return res.status(404).json({ error: 'Edition not found' });
    }

    const filename = require('path').basename(edition.local_pdf_url);
    const localPath = require('path').join(STORAGE_PATH, 'pdfs', filename);

    try {
      const stats = await fs.promises.stat(localPath);
      if (!stats.isFile() || stats.size < 1024) throw new Error('File missing or too small');
    } catch (err) {
      console.error(`[PDF PROXY] Network Share / Filesystem error: ${err.code || ''} ${err.message} | Path: ${localPath}`);
      return sendPdfUnavailable(res);
    }

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Expose-Headers', 'Accept-Ranges, Content-Range, Content-Length, Content-Type');
    // ?download=1 — sent as an attachment, so the browser's own download manager saves
    // the file as it streams (progress shown immediately), instead of the page
    // buffering the whole PDF in memory first. ?name= is the suggested file name.
    if (req.query.download) {
      const name = String(req.query.name || `edition_${parseInt(editionId, 10)}`)
        .replace(/[\\/:*?"<>|\u0000-\u001f]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 150) || 'edition';
      res.attachment(/\.pdf$/i.test(name) ? name : `${name}.pdf`);
      // One download = the request that starts the file (a resumed download asks for a
      // later byte range and is not counted again)
      const range = String(req.headers.range || '');
      if (!range || /^bytes=0-/.test(range)) {
        countEditionStat(editionId, 'downloads').catch(e => console.error('Download count failed:', e.message));
      }
    }
    // Browser cache (ETag revalidation still applies): reopening an edition reuses fetched ranges
    return res.sendFile(localPath, { maxAge: '1d' });
  } catch (err) {
    console.error('[PDF NEW] Error:', err.message);
    if (!res.headersSent) res.status(500).json({ error: err.message });
  }
});

// DEPRECATED PDF server — serves PDFs exclusively from local storage (self-contained, no remote dependency)
app.get('/api/proxy/pdf', async (req, res) => {
  const { url } = req.query;
  if (!url) {
    return res.status(400).json({ error: 'url query parameter is required' });
  }

  try {
    // Look up the edition by its original CICT URL
    const { rows } = await db.query(
      `SELECT id, local_pdf_url FROM sv_ebook_editions WHERE pdf_url = $1 LIMIT 1`,
      [url]
    );
    const edition = rows[0];

    if (!edition || !edition.local_pdf_url) {
      console.warn(`[PDF] No DB record for URL: ${url}`);
      return res.status(404).json({ error: 'Edition not found in database' });
    }

    // Resolve the absolute path to the locally stored PDF
    const filename = path.basename(edition.local_pdf_url);
    const localPath = path.join(STORAGE_PATH, 'pdfs', filename);

    // Verify the file actually exists and is non-empty before serving
    try {
      const stats = await fs.promises.stat(localPath);
      if (!stats.isFile() || stats.size < 1024) {
        throw new Error('File missing or too small');
      }
    } catch (err) {
      console.error(`[PDF] Local file not found or invalid: ${err.code || ''} ${err.message} | Path: ${localPath}`);
      return sendPdfUnavailable(res);
    }

    // Serve the file — Express handles Range requests, Content-Type, and streaming automatically
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Expose-Headers', 'Accept-Ranges, Content-Range, Content-Length, Content-Type');
    return res.sendFile(localPath, { maxAge: '1d' });

  } catch (err) {
    console.error('[PDF] Error:', err.message);
    if (!res.headersSent) res.status(500).json({ error: err.message });
  }
});


// ══════════════════════════════════════════════════════════════════════════════
// ADMIN API ROUTES
// ══════════════════════════════════════════════════════════════════════════════

// Ensure support tables exist on startup
async function ensureTables() {
  const queries = [
    `CREATE TABLE IF NOT EXISTS sv_users (
      id SERIAL PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      email TEXT,
      role TEXT DEFAULT 'admin',
      status INTEGER DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS contacts (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      subject TEXT,
      message TEXT NOT NULL,
      is_read BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS team_members (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      role_english TEXT,
      role_tamil TEXT,
      bio TEXT,
      photo_url TEXT,
      display_order INTEGER DEFAULT 0,
      status INTEGER DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
    // Read / download counts per e-book edition, shown beside the READ and DOWNLOAD
    // buttons. A separate table, so sv_ebook_editions itself is not altered.
    `CREATE TABLE IF NOT EXISTS ebook_edition_stats (
      edition_id INTEGER PRIMARY KEY,
      views      BIGINT NOT NULL DEFAULT 0,
      downloads  BIGINT NOT NULL DEFAULT 0,
      updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    )`,
  ];
  for (const q of queries) {
    await db.query(q).catch(e => console.error('Table ensure error:', e.message));
  }

  // ── Migrate sv_ebook_editions: add columns missing from older deployments ──
  // Safe to run every startup (IF NOT EXISTS is idempotent in PostgreSQL 9.6+)
  const editionColumns = [
    `ALTER TABLE sv_ebook_editions ADD COLUMN IF NOT EXISTS image_folder    TEXT`,
    `ALTER TABLE sv_ebook_editions ADD COLUMN IF NOT EXISTS total_pages     INTEGER`,
    `ALTER TABLE sv_ebook_editions ADD COLUMN IF NOT EXISTS title_english   TEXT`,
    `ALTER TABLE sv_ebook_editions ADD COLUMN IF NOT EXISTS editor          TEXT`,
    `ALTER TABLE sv_ebook_editions ADD COLUMN IF NOT EXISTS publisher       TEXT`,
    `ALTER TABLE sv_ebook_editions ADD COLUMN IF NOT EXISTS year_published  INTEGER`,
  ];
  for (const q of editionColumns) {
    await db.query(q).catch(e => console.error('Edition column migration:', e.message));
  }
  // Last successful sign-in of each admin, shown on the admin Users tab
  await db.query('ALTER TABLE sv_users ADD COLUMN IF NOT EXISTS last_login TIMESTAMPTZ')
    .catch(e => console.error('Users column migration:', e.message));

  console.log('✅ Support tables verified');
}
ensureTables();

// ── ADMIN AUTHENTICATION ─────────────────────────────────────────────────────
// Constant-time comparison for legacy plain-text passwords (hashing both sides gives
// equal-length buffers, so timingSafeEqual works for any lengths)
function plainTextEquals(given, stored) {
  const crypto = require('crypto');
  const h = (s) => crypto.createHash('sha256').update(String(s), 'utf8').digest();
  return stored.length > 0 && crypto.timingSafeEqual(h(given), h(stored));
}
app.post('/api/admin/login', async (req, res) => {
  try {
    const { username, password } = req.body || {};
    if (typeof username !== 'string' || typeof password !== 'string' || !username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }
    const { rows } = await db.query('SELECT * FROM sv_users WHERE username=$1 LIMIT 1', [username]);

    if (rows.length === 0) return res.status(401).json({ error: 'Invalid credentials' });
    const user = rows[0];

    // bcrypt hash → bcrypt check only. Previously the stored text was also compared as
    // plain text, so the hash itself worked as a password. Legacy accounts whose
    // password is still stored as plain text are compared in constant time.
    const stored = String(user.password || '');
    const isHash = /^\$2[aby]\$\d\d\$/.test(stored);
    const isMatch = isHash ? await bcrypt.compare(password, stored) : plainTextEquals(password, stored);

    if (!isMatch) return res.status(401).json({ error: 'Invalid credentials' });
    if (user.status !== 1) return res.status(403).json({ error: 'Account disabled' });
    await db.query('UPDATE sv_users SET last_login = NOW() WHERE id = $1', [user.id])
      .catch(e => console.error('Last-login update failed (sign-in unaffected):', e.message));

    // Opt-in migration (ADMIN_PASSWORD_REHASH=1 in backend/.env): a successful plain-text
    // sign-in stores the same password as a bcrypt hash. The password does not change,
    // so nobody is locked out — but anything else reading sv_users.password as plain
    // text would stop matching, which is why it is off unless enabled.
    if (!isHash && process.env.ADMIN_PASSWORD_REHASH === '1') {
      await db.query('UPDATE sv_users SET password = $1 WHERE id = $2 AND password = $3', [await bcrypt.hash(password, 10), user.id, stored])
        .catch(e => console.error('Password re-hash failed (sign-in unaffected):', e.message));
    }

    const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: '8h' });
    res.json({ token, user: { id: user.id, username: user.username, role: user.role } });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

const adminAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// Apply auth middleware to all admin routes below this point
app.use('/api/admin', adminAuth);

// ── DASHBOARD STATS ──────────────────────────────────────────────────────────
app.get('/api/admin/dashboard-stats', async (req, res) => {
  try {
    const [books, mainCats, subCats, songs, trashedSongs, editions, contacts, unreadContacts, teamMembers, users] = await Promise.all([
      db.query('SELECT COUNT(*) as c FROM sv_book'),
      db.query('SELECT COUNT(*) as c FROM sv_main_category'),
      db.query('SELECT COUNT(*) as c FROM sv_sub_category'),
      db.query('SELECT COUNT(*) as c FROM sv_songs WHERE trash=0 AND status=1'),
      db.query('SELECT COUNT(*) as c FROM sv_songs WHERE trash=1'),
      db.query('SELECT COUNT(*) as c FROM sv_ebook_editions WHERE status=1'),
      db.query('SELECT COUNT(*) as c FROM contacts').catch(() => ({ rows: [{ c: 0 }] })),
      db.query('SELECT COUNT(*) as c FROM contacts WHERE is_read=false').catch(() => ({ rows: [{ c: 0 }] })),
      db.query('SELECT COUNT(*) as c FROM team_members WHERE status=1').catch(() => ({ rows: [{ c: 0 }] })),
      db.query('SELECT COUNT(*) as c FROM sv_users').catch(() => ({ rows: [{ c: 0 }] })),
    ]);
    const recentContacts = await db.query(
      'SELECT id, name, email, subject, is_read, created_at FROM contacts ORDER BY created_at DESC LIMIT 5'
    ).catch(() => ({ rows: [] }));
    res.json({
      books:           parseInt(books.rows[0].c),
      main_categories: parseInt(mainCats.rows[0].c),
      sub_categories:  parseInt(subCats.rows[0].c),
      songs:           parseInt(songs.rows[0].c),
      trashed_songs:   parseInt(trashedSongs.rows[0].c),
      ebook_editions:  parseInt(editions.rows[0].c),
      contacts:        parseInt(contacts.rows[0].c),
      unread_contacts: parseInt(unreadContacts.rows[0].c),
      team_members:    parseInt(teamMembers.rows[0].c),
      users:           parseInt(users.rows[0].c),
      recent_contacts: recentContacts.rows,
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── UPLOAD STATISTICS (for dashboard chart) ───────────────────────────────────
app.get('/api/admin/dashboard/upload-stats', async (req, res) => {
  try {
    const view = (req.query.view || 'monthly').toLowerCase();

    let rows;
    if (view === 'daily') {
      // Group by calendar day using DATE_TRUNC for correctness regardless of time format
      const result = await db.query(`
        SELECT
          TO_CHAR(DATE_TRUNC('day', upload_date::timestamp), 'YYYY-MM-DD') AS period,
          COUNT(*)::int AS count
        FROM sv_songs
        GROUP BY DATE_TRUNC('day', upload_date::timestamp)
        ORDER BY DATE_TRUNC('day', upload_date::timestamp) ASC
      `);
      rows = result.rows;
    } else {
      // Monthly view — group by year+month
      const result = await db.query(`
        SELECT
          TO_CHAR(DATE_TRUNC('month', upload_date::timestamp), 'YYYY-MM') AS period,
          COUNT(*)::int AS count
        FROM sv_songs
        GROUP BY DATE_TRUNC('month', upload_date::timestamp)
        ORDER BY DATE_TRUNC('month', upload_date::timestamp) ASC
      `);
      rows = result.rows;
    }

    // Also return the grand total so the frontend can cross-check
    const totalResult = await db.query(`SELECT COUNT(*)::int AS total FROM sv_songs`);
    const total = totalResult.rows[0].total;

    res.json({ view, data: rows, total });
  } catch (e) { res.status(500).json({ error: e.message }); }
});


// ── SELECT ENDPOINTS (for dropdowns) ─────────────────────────────────────────
app.get('/api/admin/books/select', async (req, res) => {
  try {
    const { rows } = await db.query('SELECT book_id as id, name FROM sv_book ORDER BY book_id');
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});
app.get('/api/admin/categories/select', async (req, res) => {
  try {
    const { book_id } = req.query;
    const q = book_id
      ? 'SELECT cid as id, cname as name FROM sv_main_category WHERE book_id=$1 ORDER BY cid'
      : 'SELECT cid as id, cname as name FROM sv_main_category ORDER BY cid';
    const { rows } = await db.query(q, book_id ? [book_id] : []);
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});
app.get('/api/admin/subcategories/select', async (req, res) => {
  try {
    const { category_id } = req.query;
    const q = category_id
      ? 'SELECT id, sub_cat_name as name FROM sv_sub_category WHERE main_category_id=$1 ORDER BY id'
      : 'SELECT id, sub_cat_name as name FROM sv_sub_category ORDER BY id';
    const { rows } = await db.query(q, category_id ? [category_id] : []);
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── BOOKS CRUD ────────────────────────────────────────────────────────────────
app.get('/api/admin/books', async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '' } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const params = [];
    const conditions = [];
    if (search) { params.push(`%${search}%`); conditions.push(`name ILIKE $${params.length}`); }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const [rows, count] = await Promise.all([
      db.query(`SELECT * FROM sv_book ${where} ORDER BY book_id DESC LIMIT $${params.length+1} OFFSET $${params.length+2}`, [...params, parseInt(limit), offset]),
      db.query(`SELECT COUNT(*) as c FROM sv_book ${where}`, params),
    ]);
    res.json({ rows: rows.rows, total: parseInt(count.rows[0].c) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
app.post('/api/admin/books', async (req, res) => {
  try {
    const { name, status } = req.body;
    const { rows } = await db.query(
      'INSERT INTO sv_book (name, status) VALUES ($1, $2) RETURNING book_id as id',
      [name, status ?? 1]
    );
    res.json({ id: rows[0].id });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
app.put('/api/admin/books/:id', async (req, res) => {
  try {
    const { name, status } = req.body;
    await db.query('UPDATE sv_book SET name=$1, status=$2, updated_at=NOW() WHERE book_id=$3', [name, status, req.params.id]);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
// Deleting a parent must never take its contents with it. The live database has
// ON DELETE CASCADE foreign keys (one book delete would erase all its categories,
// sub-categories, folios and editions, leaving the scan and PDF files orphaned on
// the share); databases restored without those keys would instead keep the children
// hidden from the website. Either way: refuse, and say what is still inside.
const stillContains = (res, what) => res.status(409).json({ error: `Cannot delete: it still contains ${what}. Delete or move those first.` });

app.delete('/api/admin/books/:id', async (req, res) => {
  try {
    const { rows: [c] } = await db.query(
      `SELECT (SELECT count(*)::int FROM sv_main_category WHERE book_id = $1) AS categories,
              (SELECT count(*)::int FROM sv_sub_category WHERE book_id = $1) AS subcategories,
              (SELECT count(*)::int FROM sv_ebook_editions WHERE book_id = $1) AS editions`, [req.params.id]);
    if (c.categories || c.subcategories || c.editions) return stillContains(res, [c.categories && `${c.categories} categories`, c.subcategories && `${c.subcategories} sub-categories`, c.editions && `${c.editions} e-book editions`].filter(Boolean).join(' and '));
    // The live tables cascade deletes (book → categories → sub-categories → folios,
    // book → editions), so the delete itself re-checks in the same statement: nothing
    // added since the check above can be swept away with it
    const del = await db.query(
      `DELETE FROM sv_book b WHERE b.book_id = $1
         AND NOT EXISTS (SELECT 1 FROM sv_main_category WHERE book_id = b.book_id)
         AND NOT EXISTS (SELECT 1 FROM sv_sub_category WHERE book_id = b.book_id)
         AND NOT EXISTS (SELECT 1 FROM sv_ebook_editions WHERE book_id = b.book_id)`, [req.params.id]);
    if (!del.rowCount) return res.status(409).json({ error: 'Not deleted: the book changed meanwhile or no longer exists. Refresh and try again.' });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── MAIN CATEGORY CRUD ────────────────────────────────────────────────────────
app.get('/api/admin/categories', async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '', book_id } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const params = [];
    const conditions = [];
    if (book_id) { params.push(book_id); conditions.push(`mc.book_id = $${params.length}`); }
    if (search) { params.push(`%${search}%`); conditions.push(`mc.cname ILIKE $${params.length}`); }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const [rows, count] = await Promise.all([
      db.query(`SELECT mc.*, b.name as book_name, TO_CHAR(mc.created_at, 'DD-MM-YYYY HH24:MI') as formatted_created_at FROM sv_main_category mc JOIN sv_book b ON b.book_id = mc.book_id ${where} ORDER BY mc.cid DESC LIMIT $${params.length+1} OFFSET $${params.length+2}`, [...params, parseInt(limit), offset]),
      db.query(`SELECT COUNT(*) as c FROM sv_main_category mc ${where}`, params),
    ]);
    res.json({ rows: rows.rows, total: parseInt(count.rows[0].c) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
app.post('/api/admin/categories', async (req, res) => {
  try {
    const { book_id, cname, status } = req.body;
    const { rows } = await db.query(
      'INSERT INTO sv_main_category (book_id, cname, status) VALUES ($1, $2, $3) RETURNING cid as id',
      [book_id, cname, status ?? 1]
    );
    res.json({ id: rows[0].id });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
app.put('/api/admin/categories/:id', async (req, res) => {
  try {
    const { book_id, cname, status } = req.body;
    await db.query(
      'UPDATE sv_main_category SET book_id=$1, cname=$2, status=$3, updated_at=NOW() WHERE cid=$4',
      [book_id, cname, status, req.params.id]
    );
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
app.delete('/api/admin/categories/:id', async (req, res) => {
  try {
    const { rows: [c] } = await db.query('SELECT count(*)::int AS n FROM sv_sub_category WHERE main_category_id = $1', [req.params.id]);
    if (c.n) return stillContains(res, `${c.n} sub-categories`);
    const del = await db.query('DELETE FROM sv_main_category m WHERE m.cid = $1 AND NOT EXISTS (SELECT 1 FROM sv_sub_category WHERE main_category_id = m.cid)', [req.params.id]);
    if (!del.rowCount) return res.status(409).json({ error: 'Not deleted: the category changed meanwhile or no longer exists. Refresh and try again.' });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── SUB CATEGORY CRUD ─────────────────────────────────────────────────────────
app.get('/api/admin/subcategories', async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '', book_id, main_category_id } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const params = [];
    const conditions = [];
    if (book_id) { params.push(book_id); conditions.push(`sc.book_id = $${params.length}`); }
    if (main_category_id) { params.push(main_category_id); conditions.push(`sc.main_category_id = $${params.length}`); }
    if (search) { params.push(`%${search}%`); conditions.push(`sc.sub_cat_name ILIKE $${params.length}`); }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const [rows, count] = await Promise.all([
      db.query(`SELECT sc.*, mc.cname as category_name, b.name as book_name, TO_CHAR(sc.created_at, 'DD-MM-YYYY HH24:MI') as formatted_created_at FROM sv_sub_category sc JOIN sv_main_category mc ON mc.cid = sc.main_category_id JOIN sv_book b ON b.book_id = sc.book_id ${where} ORDER BY sc.id DESC LIMIT $${params.length+1} OFFSET $${params.length+2}`, [...params, parseInt(limit), offset]),
      db.query(`SELECT COUNT(*) as c FROM sv_sub_category sc ${where}`, params),
    ]);
    res.json({ rows: rows.rows, total: parseInt(count.rows[0].c) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
app.post('/api/admin/subcategories', async (req, res) => {
  try {
    const { book_id, main_category_id, sub_cat_name, status } = req.body;
    const { rows } = await db.query(
      'INSERT INTO sv_sub_category (book_id, main_category_id, sub_cat_name, status) VALUES ($1,$2,$3,$4) RETURNING id',
      [book_id, main_category_id, sub_cat_name, status ?? 1]
    );
    res.json({ id: rows[0].id });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
app.put('/api/admin/subcategories/:id', async (req, res) => {
  try {
    const { book_id, main_category_id, sub_cat_name, status } = req.body;
    await db.query(
      'UPDATE sv_sub_category SET book_id=$1, main_category_id=$2, sub_cat_name=$3, status=$4, updated_at=NOW() WHERE id=$5',
      [book_id, main_category_id, sub_cat_name, status, req.params.id]
    );
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
app.delete('/api/admin/subcategories/:id', async (req, res) => {
  try {
    const { rows: [c] } = await db.query('SELECT count(*)::int AS n FROM sv_songs WHERE cid = $1', [req.params.id]);
    if (c.n) return stillContains(res, `${c.n} manuscript folios (including any in the trash)`);
    const del = await db.query('DELETE FROM sv_sub_category s WHERE s.id = $1 AND NOT EXISTS (SELECT 1 FROM sv_songs WHERE cid = s.id)', [req.params.id]);
    if (!del.rowCount) return res.status(409).json({ error: 'Not deleted: the sub-category changed meanwhile or no longer exists. Refresh and try again.' });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── SONGS / MANUSCRIPTS CRUD ──────────────────────────────────────────────────
app.get('/api/admin/songs', async (req, res) => {
  try {
    const { page = 1, limit = 10, cid, search = '', trash = '0' } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const trashVal = trash === '1' ? 1 : 0;
    const conditions = [`s.trash = ${trashVal}`];
    const params = [];
    if (cid) { conditions.push(`s.cid = $${params.length + 1}`); params.push(cid); }
    if (search) {
      params.push(`%${search}%`);
      const sn = params.length;
      // Global search across: id, sub_category_name, song description, folio number, image filename, author
      conditions.push(
        `(CAST(s.id AS TEXT) ILIKE $${sn}` +
        ` OR sc.sub_cat_name ILIKE $${sn}` +
        ` OR s.description ILIKE $${sn}` +
        ` OR CAST(s.fid AS TEXT) ILIKE $${sn}` +
        ` OR s.fname ILIKE $${sn}` +
        ` OR s.author ILIKE $${sn})`
      );
    }
    const where = conditions.join(' AND ');
    // Both data and count queries include LEFT JOINs so sc.sub_cat_name is resolvable in WHERE
    const joinClause = `FROM sv_songs s
         LEFT JOIN sv_sub_category sc ON sc.id = s.cid
         LEFT JOIN sv_main_category mc ON mc.cid = sc.main_category_id
         LEFT JOIN sv_book b ON b.book_id = mc.book_id`;
    const [rows, count] = await Promise.all([
      db.query(
        `SELECT s.id, s.fid, s.fname, s.filename, s.filetype, s.cid, s.group_id, s.description, s.author,
                s.upload_date, s.view_counts, s.down_counts, s.status, s.trash,
                sc.sub_cat_name, mc.cid as main_category_id, b.book_id, b.name as book_name
         ${joinClause}
         WHERE ${where}
         ORDER BY s.id DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
        [...params, parseInt(limit), offset]
      ),
      db.query(
        `SELECT COUNT(*) as c ${joinClause} WHERE ${where}`,
        params
      ),
    ]);
    rows.rows.forEach(r => {
      // Use `filename` (new records) for image lookup; fall back to `fname` for legacy imported data
      const imageFile = r.filename || r.fname;
      const { url, actual_filename, is_missing } = resolveAdminImage(r.cid, r.id, imageFile, r.group_id);
      r.image_url       = url;
      r.actual_filename = actual_filename;
      r.is_missing      = is_missing;
    });
    res.json({ rows: rows.rows, total: parseInt(count.rows[0].c) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
// Scans are stored on disk as "<id>_<name>" and the SAME name is stored in
// sv_songs.filename — the convention of all existing records (e.g. "23259_c45.jpg").
// Rows saved together with one scan (group_id = first row's id) reference the same file.
const scanPath = (cid, filename) => path.join(SONGS_PATH, String(cid), filename);
// Checks an uploaded scan's real content. Returns its MIME type — stored in
// sv_songs.filetype like every existing record ("image/jpeg") — or null after removing
// the file. A PNG/HTML/script renamed to .jpg is refused here.
async function checkScan(tmp) {
  const type = await sniffFile(tmp).catch(() => null);
  if (type && type.startsWith('image/') && type !== 'image/png') return type;
  await removeQuietly(tmp);
  return null;
}
const NOT_A_SCAN = 'The file is not a valid JPEG, WebP, GIF, BMP or AVIF image (its content does not match its name)';
// Remove a scan file only when no record (in or out of the trash) still refers to it
async function removeScanIfUnused(cid, filename) {
  if (!cid || !filename) return;
  const { rows: [r] } = await db.query('SELECT count(*)::int AS n FROM sv_songs WHERE cid = $1 AND filename = $2', [cid, filename]);
  if (r.n > 0) return;
  await removeQuietly(scanPath(cid, filename));
  cacheDeleteImage(cid, filename);
}

app.post('/api/admin/songs', withUpload(uploadSong.single('image')), async (req, res) => {
  const tmp = req.file && req.file.path;
  const insertedIds = [];
  let storedName = '';    // "<primaryId>_<name>", shared by every row of this upload
  try {
    const cid = parseInt(req.body.cid, 10);
    if (!Number.isInteger(cid) || cid <= 0) { if (tmp) await removeQuietly(tmp); return res.status(400).json({ error: 'cid is required' }); }
    const status = Number.isNaN(parseInt(req.body.status, 10)) ? 1 : parseInt(req.body.status, 10);

    // Support multiple fid/fname pairs — each pair → separate DB row (original CICT behavior)
    const rawFids   = [].concat(req.body.fid   || []);
    const rawFnames = [].concat(req.body.fname  || []);
    if (!rawFids.length) { if (tmp) await removeQuietly(tmp); return res.status(400).json({ error: 'At least one fid/fname pair required' }); }

    const filetype = req.file ? await checkScan(tmp) : '';
    if (req.file && !filetype) return res.status(400).json({ error: NOT_A_SCAN });
    const originalName = req.file ? safeFileName(req.file.originalname) : '';
    let primaryId = null;   // first row owns the physical file

    for (let i = 0; i < rawFids.length; i++) {
      const fid   = parseInt(rawFids[i], 10) || 0;
      const fname = rawFnames[i] || '';
      // Rows after the first point to the first row's file via group_id
      const groupId = (i === 0) ? 0 : primaryId;

      const { rows } = await db.query(
        `INSERT INTO sv_songs (cid, fid, fname, filename, filetype, description, author, group_id, status, upload_date)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9, TO_CHAR(CURRENT_TIMESTAMP, 'YYYY-MM-DD HH24:MI:SS'))
         RETURNING id`,
        [cid, fid, fname, storedName, filetype || 'image/jpeg', fname, 'System', groupId, status]
      );
      const newId = rows[0].id;
      insertedIds.push(newId);

      if (i === 0) {
        primaryId = newId;
        if (req.file) {
          storedName = `${primaryId}_${originalName}`;
          await fs.promises.rename(tmp, scanPath(cid, storedName));
          await db.query('UPDATE sv_songs SET filename = $1 WHERE id = $2', [storedName, primaryId]);
          cacheSetImage(cid, storedName);
        }
      }
    }
    res.json({ ids: insertedIds, id: insertedIds[0], filename: storedName });
  } catch (e) {
    // All or nothing: a failure part-way (e.g. the share refused the file) must not
    // leave records behind that show no scan — remove what this request created
    if (tmp) await removeQuietly(tmp);
    if (insertedIds.length) {
      await db.query('DELETE FROM sv_songs WHERE id = ANY($1::int[])', [insertedIds]).catch(err => console.error('Upload rollback failed:', err.message));
      if (storedName) { await removeQuietly(scanPath(parseInt(req.body.cid, 10), storedName)); cacheDeleteImage(parseInt(req.body.cid, 10), storedName); }
    }
    res.status(500).json({ error: e.message });
  }
});

app.put('/api/admin/songs/:id', withUpload(uploadSong.single('image')), async (req, res) => {
  const tmp = req.file && req.file.path;
  try {
    const songId = parseInt(req.params.id, 10);
    const { rows: [cur] } = await db.query('SELECT id, cid, filename FROM sv_songs WHERE id = $1', [songId]);
    if (!cur) { if (tmp) await removeQuietly(tmp); return res.status(404).json({ error: 'Record not found' }); }

    const { fid, fname, status } = req.body;
    const cleanFid = parseInt(fid, 10) || 0;
    const cleanCid = Number.isInteger(parseInt(req.body.cid, 10)) ? parseInt(req.body.cid, 10) : cur.cid;
    const cleanStatus = Number.isNaN(parseInt(status, 10)) ? 1 : parseInt(status, 10);

    if (req.file) {
      const filetype = await checkScan(tmp);
      if (!filetype) return res.status(400).json({ error: NOT_A_SCAN });
      // Replacement scan: a new file name, so browsers never keep showing the old cached
      // scan (the /songs files are cached for 7 days)
      const storedName = `${songId}_${Date.now()}_${safeFileName(req.file.originalname)}`;
      await fs.promises.rename(tmp, scanPath(cleanCid, storedName));
      try {
        await db.query(
          'UPDATE sv_songs SET cid=$1, fid=$2, fname=$3, filename=$4, filetype=$5, description=$6, status=$7 WHERE id=$8',
          [cleanCid, cleanFid, fname || '', storedName, filetype, fname || '', cleanStatus, songId]
        );
      } catch (e) {
        await removeQuietly(scanPath(cleanCid, storedName)); // record unchanged: drop the unused new file
        throw e;
      }
      // Rows saved together with this scan follow it to the new file
      await db.query('UPDATE sv_songs SET filename=$1, cid=$2 WHERE group_id=$3 AND cid=$4 AND filename=$5',
        [storedName, cleanCid, songId, cur.cid, cur.filename]);
      cacheSetImage(cleanCid, storedName);
      await removeScanIfUnused(cur.cid, cur.filename);
    } else {
      // No new file — keep existing filename, only update text fields. If the record moves
      // to another sub-category, its scan is copied into that folder so it stays visible.
      if (cleanCid !== Number(cur.cid)) {
        const { rows: target } = await db.query('SELECT 1 FROM sv_sub_category WHERE id = $1', [cleanCid]);
        if (!target.length) return res.status(400).json({ error: 'The selected sub-category does not exist' });
      }
      if (cleanCid !== Number(cur.cid) && cur.filename) {
        await fs.promises.mkdir(path.join(SONGS_PATH, String(cleanCid)), { recursive: true });
        await fs.promises.copyFile(scanPath(cur.cid, cur.filename), scanPath(cleanCid, cur.filename)).catch(() => {});
        cacheSetImage(cleanCid, cur.filename);
      }
      await db.query(
        'UPDATE sv_songs SET cid=$1, fid=$2, fname=$3, description=$4, status=$5 WHERE id=$6',
        [cleanCid, cleanFid, fname || '', fname || '', cleanStatus, songId]
      );
      if (cleanCid !== Number(cur.cid)) await removeScanIfUnused(cur.cid, cur.filename);
    }
    res.json({ success: true });
  } catch (e) {
    if (tmp) await removeQuietly(tmp);
    res.status(500).json({ error: e.message });
  }
});
app.delete('/api/admin/songs/:id', async (req, res) => {
  try {
    await db.query('UPDATE sv_songs SET trash=1 WHERE id=$1', [req.params.id]);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
app.put('/api/admin/songs/:id/restore', async (req, res) => {
  try {
    await db.query('UPDATE sv_songs SET trash=0 WHERE id=$1', [req.params.id]);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
app.delete('/api/admin/songs/:id/purge', async (req, res) => {
  try {
    const { rows: [song] } = await db.query('SELECT id, cid, filename FROM sv_songs WHERE id=$1', [req.params.id]);
    await db.query('DELETE FROM sv_songs WHERE id=$1', [req.params.id]);
    // The scan file goes only when no other record still shows it (rows of the same
    // upload share one file). filename is the on-disk name ("<id>_<name>").
    if (song) await removeScanIfUnused(song.cid, song.filename);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── USERS CRUD ────────────────────────────────────────────────────────────────
app.get('/api/admin/users', async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '' } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const params = [];
    const conditions = [];
    if (search) { params.push(`%${search}%`); conditions.push(`(username ILIKE $${params.length} OR email ILIKE $${params.length})`); }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const [rows, count] = await Promise.all([
      db.query(`SELECT id, username, email, role, status, last_login FROM sv_users ${where} ORDER BY id DESC LIMIT $${params.length+1} OFFSET $${params.length+2}`, [...params, parseInt(limit), offset]),
      db.query(`SELECT COUNT(*) as c FROM sv_users ${where}`, params),
    ]);
    res.json({ rows: rows.rows, total: parseInt(count.rows[0].c) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
app.post('/api/admin/users', async (req, res) => {
  try {
    const { username, password, email, role } = req.body;
    if (!username || !String(username).trim() || !password) return res.status(400).json({ error: 'Username and password are required' });
    const hashedPassword = bcrypt.hashSync(password, 10);
    const { rows } = await db.query(
      'INSERT INTO sv_users (username, password, email, role) VALUES ($1,$2,$3,$4) RETURNING id',
      [username, hashedPassword, email, role || 'admin']
    );
    res.json({ id: rows[0].id });
  } catch (e) {
    if (e.code === '23505') return res.status(409).json({ error: 'That username is already taken' });
    res.status(500).json({ error: e.message });
  }
});
app.put('/api/admin/users/:id', async (req, res) => {
  try {
    const { username, password, email, role, status } = req.body;
    if (!username || !String(username).trim()) return res.status(400).json({ error: 'Username is required' });
    // Never lock everyone out by disabling: not your own account, not the last active one
    if (Number(status) !== 1) {
      if (req.user && String(req.user.id) === String(req.params.id)) return res.status(400).json({ error: 'You cannot disable the account you are signed in with' });
      const { rows: [a] } = await db.query('SELECT count(*)::int AS n FROM sv_users WHERE status = 1 AND id <> $1', [req.params.id]);
      if (!a.n) return res.status(400).json({ error: 'The last active admin account cannot be disabled' });
    }
    if (password) {
      const hashedPassword = bcrypt.hashSync(password, 10);
      await db.query(
        'UPDATE sv_users SET username=$1, password=$2, email=$3, role=$4, status=$5 WHERE id=$6',
        [username, hashedPassword, email, role, status, req.params.id]
      );
    } else {
      await db.query(
        'UPDATE sv_users SET username=$1, email=$2, role=$3, status=$4 WHERE id=$5',
        [username, email, role, status, req.params.id]
      );
    }
    res.json({ success: true });
  } catch (e) {
    if (e.code === '23505') return res.status(409).json({ error: 'That username is already taken' });
    res.status(500).json({ error: e.message });
  }
});
app.delete('/api/admin/users/:id', async (req, res) => {
  try {
    // Never lock everyone out: not your own account, not the last account
    if (req.user && String(req.user.id) === String(req.params.id)) return res.status(400).json({ error: 'You cannot delete the account you are signed in with' });
    const { rows: [c] } = await db.query('SELECT count(*)::int AS n FROM sv_users WHERE status = 1 AND id <> $1', [req.params.id]);
    if (!c.n) return res.status(400).json({ error: 'The last active admin account cannot be deleted' });
    await db.query('DELETE FROM sv_users WHERE id=$1', [req.params.id]);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── CONTACTS CRUD ─────────────────────────────────────────────────────────────
app.get('/api/admin/contacts', async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '' } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const params = [];
    const conditions = [];
    if (search) { params.push(`%${search}%`); conditions.push(`(name ILIKE $${params.length} OR email ILIKE $${params.length} OR subject ILIKE $${params.length})`); }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const [rows, count] = await Promise.all([
      db.query(`SELECT * FROM contacts ${where} ORDER BY created_at DESC LIMIT $${params.length+1} OFFSET $${params.length+2}`, [...params, parseInt(limit), offset]),
      db.query(`SELECT COUNT(*) as c FROM contacts ${where}`, params),
    ]);
    res.json({ rows: rows.rows, total: parseInt(count.rows[0].c) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
app.put('/api/admin/contacts/:id/read', async (req, res) => {
  try {
    await db.query('UPDATE contacts SET is_read=true WHERE id=$1', [req.params.id]);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
app.delete('/api/admin/contacts/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM contacts WHERE id=$1', [req.params.id]);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── TEAM MEMBERS CRUD ─────────────────────────────────────────────────────────
app.get('/api/admin/team', async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '' } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const params = [];
    const conditions = [];
    if (search) { params.push(`%${search}%`); conditions.push(`(name ILIKE $${params.length} OR role_english ILIKE $${params.length} OR role_tamil ILIKE $${params.length})`); }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const [rows, count] = await Promise.all([
      db.query(`SELECT * FROM team_members ${where} ORDER BY display_order, id LIMIT $${params.length+1} OFFSET $${params.length+2}`, [...params, parseInt(limit), offset]),
      db.query(`SELECT COUNT(*) as c FROM team_members ${where}`, params),
    ]);
    res.json({ rows: rows.rows, total: parseInt(count.rows[0].c) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
app.post('/api/admin/team', async (req, res) => {
  try {
    const { name, role_english, role_tamil, bio, photo_url, display_order, status } = req.body;
    const { rows } = await db.query(
      'INSERT INTO team_members (name, role_english, role_tamil, bio, photo_url, display_order, status) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id',
      [name, role_english || '', role_tamil || '', bio || '', photo_url || '', display_order || 0, status ?? 1]
    );
    res.json({ id: rows[0].id });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
app.put('/api/admin/team/:id', async (req, res) => {
  try {
    const { name, role_english, role_tamil, bio, photo_url, display_order, status } = req.body;
    await db.query(
      'UPDATE team_members SET name=$1, role_english=$2, role_tamil=$3, bio=$4, photo_url=$5, display_order=$6, status=$7 WHERE id=$8',
      [name, role_english, role_tamil, bio, photo_url, display_order, status, req.params.id]
    );
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
app.delete('/api/admin/team/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM team_members WHERE id=$1', [req.params.id]);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── EBOOK EDITIONS CRUD ───────────────────────────────────────────────────────
app.get('/api/admin/ebook-editions', async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '', book_id } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const params = [];
    const conditions = [];
    if (book_id) { params.push(book_id); conditions.push(`e.book_id = $${params.length}`); }
    if (search) { params.push(`%${search}%`); conditions.push(`(e.title_tamil ILIKE $${params.length} OR b.name ILIKE $${params.length})`); }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const [rows, count] = await Promise.all([
      db.query(`SELECT e.*, b.name as book_name FROM sv_ebook_editions e LEFT JOIN sv_book b ON b.book_id = e.book_id ${where} ORDER BY e.book_id, e.id LIMIT $${params.length+1} OFFSET $${params.length+2}`, [...params, parseInt(limit), offset]),
      db.query(`SELECT COUNT(*) as c FROM sv_ebook_editions e LEFT JOIN sv_book b ON b.book_id = e.book_id ${where}`, params),
    ]);
    
    rows.rows.forEach(r => {
      r.is_missing = r.local_pdf_url ? !fs.existsSync(require('path').join(STORAGE_PATH, 'pdfs', require('path').basename(r.local_pdf_url))) : true;
    });
    res.json({ rows: rows.rows, total: parseInt(count.rows[0].c) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
app.post('/api/admin/ebook-editions', async (req, res) => {
  try {
    const { book_id, title_tamil, pdf_url, local_pdf_url, status } = req.body;
    if (!book_id || !String(title_tamil || '').trim()) return res.status(400).json({ error: 'Choose a book and enter the edition title' });
    const { rows } = await db.query(
      'INSERT INTO sv_ebook_editions (book_id, title_tamil, pdf_url, local_pdf_url, status) VALUES ($1,$2,$3,$4,$5) RETURNING id',
      [book_id, title_tamil, pdf_url || '', local_pdf_url || '', status ?? 1]
    );
    res.json({ id: rows[0].id });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
app.put('/api/admin/ebook-editions/:id', async (req, res) => {
  try {
    const { book_id, title_tamil, pdf_url, local_pdf_url, status } = req.body;
    if (!book_id || !String(title_tamil || '').trim()) return res.status(400).json({ error: 'Choose a book and enter the edition title' });
    await db.query(
      'UPDATE sv_ebook_editions SET book_id=$1, title_tamil=$2, pdf_url=$3, local_pdf_url=$4, status=$5 WHERE id=$6',
      [book_id, title_tamil, pdf_url || '', local_pdf_url || '', status, req.params.id]
    );
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
// Upload or replace an edition's PDF (multipart field "pdf"). Saved as
// storage/pdfs/edition_<id>.pdf — the convention of the existing editions — unless that
// name belongs to another edition. No size limit in the application; IIS limits a
// request to maxAllowedContentLength (web.config).
app.post('/api/admin/ebook-editions/:id/pdf', withUpload(uploadPdf.single('pdf')), async (req, res) => {
  const tmp = req.file && req.file.path;
  try {
    if (!req.file) return res.status(400).json({ error: 'Choose a PDF file to upload' });
    const id = parseInt(req.params.id, 10);
    const { rows: [ed] } = await db.query('SELECT id FROM sv_ebook_editions WHERE id = $1', [id]);
    if (!ed) { await removeQuietly(tmp); return res.status(404).json({ error: 'Edition not found' }); }

    // A real PDF starts with "%PDF-"; the reader also needs at least 1 KB
    if ((await sniffFile(tmp).catch(() => null)) !== 'application/pdf' || req.file.size < 1024) {
      await removeQuietly(tmp);
      return res.status(400).json({ error: 'The file is not a valid PDF' });
    }

    let name = `edition_${id}.pdf`;
    const { rows: others } = await db.query("SELECT local_pdf_url FROM sv_ebook_editions WHERE id <> $1 AND COALESCE(local_pdf_url, '') <> ''", [id]);
    if (others.some(r => path.basename(r.local_pdf_url) === name)) name = `edition_${id}_${Date.now()}.pdf`;
    try {
      await fs.promises.rename(tmp, path.join(PDF_DIR, name)); // replaces this edition's previous file of that name
    } catch (e) {
      await removeQuietly(tmp);
      const busy = e.code === 'EBUSY' || e.code === 'EPERM';
      return res.status(busy ? 409 : 500).json({ error: busy ? 'The current PDF is open by a reader right now; please try again in a minute' : e.message });
    }
    const rel = `storage/pdfs/${name}`;
    await db.query('UPDATE sv_ebook_editions SET local_pdf_url = $1 WHERE id = $2', [rel, id]);
    res.json({ success: true, local_pdf_url: rel, size: req.file.size });
  } catch (e) {
    if (tmp) await removeQuietly(tmp);
    res.status(500).json({ error: e.message });
  }
});

app.delete('/api/admin/ebook-editions/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM sv_ebook_editions WHERE id=$1', [req.params.id]);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Database pool diagnostics (admin only — /api/admin requires a login token) ──
// Pool usage of this process; ?server=1 adds the server-wide connection count and
// limit, grouped by application name (no client addresses, no query text).
app.get('/api/admin/db-pool', async (req, res) => {
  const report = db.snapshot();
  if (req.query.server) {
    try {
      // One query at a time: the diagnostics use a single connection
      const { rows: [limits] } = await db.query(
        `SELECT current_setting('max_connections')::int AS max_connections,
                current_setting('superuser_reserved_connections')::int AS reserved_for_superuser,
                (SELECT count(*)::int FROM pg_stat_activity WHERE backend_type = 'client backend') AS client_connections`
      );
      const { rows: byApplication } = await db.query(
        `SELECT COALESCE(NULLIF(application_name, ''), '(not set)') AS application, state, count(*)::int AS connections
           FROM pg_stat_activity WHERE backend_type = 'client backend'
          GROUP BY 1, 2 ORDER BY 3 DESC`
      );
      report.server = { ...limits, byApplication };
    } catch (e) {
      report.server = { error: e.code === 'DB_UNAVAILABLE' ? DB_UNAVAILABLE_MESSAGE : 'Could not read server statistics' };
    }
  }
  res.set('Cache-Control', 'no-store').json(report);
});

// ── Health check ─────────────────────────────────────────────────────────────
// Always 200 while the process is up; `database` reports PostgreSQL reachability
app.get('/health', async (req, res) => {
  let database = 'ok';
  try {
    await db.query('SELECT 1');
  } catch (e) {
    database = 'unavailable';
    const cause = e.cause || e;
    console.error('❌ Health check DB error:', cause.code || '', cause.message);
  }
  res.set('Cache-Control', 'no-store').json({
    status: 'ok',
    database,
    uptimeSeconds: Math.round(process.uptime()),
    timestamp: new Date(),
  });
});
app.get('/api/status', (req, res) =>
  res.json({ status: 'Suvadi API is live', db: 'PostgreSQL', timestamp: new Date() })
);

// ── Visitor counter & visitor location statistics (public) ──────────────────
// POST /api/analytics/visit, GET /api/analytics/stats, GET /api/analytics/location-stats
require('./analytics').registerAnalyticsRoutes(app, db);

// ── Chatbot ──────────────────────────────────────────────────────────────────
app.post('/api/chat', async (req, res) => {
  try {
    const { query, history, sessionId } = req.body;
    if (!query) return res.status(400).json({ error: 'Query is required' });

    const response = await handleChatQuery(query, history || [], sessionId);
    res.json(response);
  } catch (error) {
    console.error('[Chatbot API Error]', error.message, error.stack);
    res.status(500).json({ error: 'Internal Server Error', message: error.message });
  }
});

// ── Frontend (production build) ──────────────────────────────────────────────
// Serves frontend/dist from the same origin as the API, so relative /api and
// /images URLs work. Registered after every API route so nothing is shadowed.
const FRONTEND_DIST  = path.join(__dirname, '..', 'frontend', 'dist');
const FRONTEND_INDEX = path.join(FRONTEND_DIST, 'index.html');

app.use(express.static(FRONTEND_DIST, {
  index: false,
  setHeaders: (res, filePath) => {
    // Vite emits content-hashed files under assets/ — safe to cache long-term
    if (filePath.includes(`${path.sep}assets${path.sep}`)) {
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    } else if (!/pdf\.worker/.test(filePath)) {
      // Files copied from frontend/public (backgrounds, ornaments, covers): same
      // 1-day lifetime as /images, so repeat visits do not re-request them.
      // The PDF.js worker stays revalidated: it must match the bundled PDF.js version.
      res.setHeader('Cache-Control', 'public, max-age=86400');
    }
  },
}));

// React Router fallback: page URLs (no file extension) get index.html.
// API/media paths and missing files fall through to the normal 404.
app.use((req, res, next) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') return next();
  if (/^\/(api|images|songs|webinc|storage|health)(\/|$)/.test(req.path)) return next();
  if (path.extname(req.path)) return next();
  if (!fsSync.existsSync(FRONTEND_INDEX)) return next();
  // helmet's default CSP would block the SPA's fonts, maps and blob URLs
  res.removeHeader('Content-Security-Policy');
  res.setHeader('Cache-Control', 'no-cache');
  res.sendFile(FRONTEND_INDEX);
});

// ── Final error handler ──────────────────────────────────────────────────────
// Errors thrown (or rejected) inside routes land here; in production Express's
// default handler would not log them anywhere.
app.use((err, req, res, next) => {
  const status = err.status || err.statusCode || 500;
  if (status >= 500) console.error(`❌ ${req.method} ${req.path} failed:`, err.stack || err.message);
  if (res.headersSent) return next(err);
  res.status(status).json({ error: status >= 500 || !err.expose ? 'Internal Server Error' : err.message });
});

// ── Robust server start ──────────────────────────────────────────────────────
function startServer(port) {
  const server = app.listen(port, () => {
    runtimeLog.write('LISTENING', `db=${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`);
    console.log('');
    console.log('═══════════════════════════════════════════════════');
    console.log(`  ✅ Backend running  →  http://localhost:${port}`);
    console.log(`  🐘 Database        →  PostgreSQL @ ${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`);
    console.log(`  📂 Images served   →  ${IMAGES_PATH}`);
    console.log('  🟢 Server is LIVE — do not close this window');
    console.log('═══════════════════════════════════════════════════');
    console.log('');
  });

  // Node ends any request still being received after 5 minutes (requestTimeout), which
  // cut off large uploads on slower connections (692 MB needs > 2.3 MB/s to finish in
  // time). Disabled: IIS in front already drops stalled clients (connectionTimeout,
  // minBytesPerSecond), and headersTimeout (60 s) still guards against slow headers.
  server.requestTimeout = 0;

  server.on('error', (err) => {
    const numericPort = Number(port);
    if (err.code === 'EADDRINUSE' && Number.isInteger(numericPort)) {
      // Local development only: try the next TCP port
      const nextPort = numericPort + 1;
      console.warn(`⚠️  Port ${port} busy — trying port ${nextPort}...`);
      server.close();
      startServer(nextPort);
    } else {
      // Cannot listen (e.g. on the iisnode pipe): exit so the host restarts us,
      // instead of leaving an idle process holding database connections.
      console.error('❌ Server failed to listen:', err.code || '', err.message);
      process.exit(1);
    }
  });

  return server;
}

startServer(PORT);

// Keep-alive
setInterval(() => {}, 30000);
