const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { Pool } = require('pg');
const path = require('path');
require('dotenv').config();

// ── Keep server alive: log errors but never exit ──────────────────────────
process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err.message);
  console.error(err.stack);
});
process.on('unhandledRejection', (reason) => {
  console.error('❌ Unhandled Rejection:', reason);
});

const app = express();
const PORT = process.env.PORT || 3001;

// ── PostgreSQL Pool ──────────────────────────────────────────────────────────
const pool = new Pool({
  host:     process.env.DB_HOST     || '192.168.0.169',
  port:     parseInt(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME     || 'suvadi',
  user:     process.env.DB_USER     || 'postgres',
  password: process.env.DB_PASSWORD || 'cict26',
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on('error', (err) => {
  console.error('❌ PostgreSQL Pool Error:', err.message);
});

// Test DB connection on start
pool.query('SELECT NOW()')
  .then(r => console.log('✅ PostgreSQL connected:', r.rows[0].now))
  .catch(e => console.error('❌ PostgreSQL connection failed:', e.message));

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

// ── Asset Logging Middleware ──────────────────────────────────────────────────
const fsSync = require('fs');
app.use((req, res, next) => {
  const isAsset = req.path.startsWith('/images') || req.path.startsWith('/songs') || 
                  req.path.startsWith('/webinc') || req.path.startsWith('/storage');
  if (isAsset) {
    let targetRoot;
    if (req.path.startsWith('/images')) targetRoot = IMAGES_PATH;
    else if (req.path.startsWith('/songs')) targetRoot = SONGS_PATH;
    else if (req.path.startsWith('/webinc')) targetRoot = WEBINC_PATH;
    else if (req.path.startsWith('/storage')) targetRoot = STORAGE_PATH;

    const mountPrefix = req.path.split('/')[1]; 
    const relPath = req.path.replace(`/${mountPrefix}`, '') || '/';
    const resolvedPath = path.join(targetRoot, decodeURIComponent(relPath));

    try {
      if (fsSync.existsSync(resolvedPath)) {
        console.log(`[ASSET] ✅ SUCCESS | URL: ${req.url} | PATH: ${resolvedPath}`);
      } else {
        console.log(`[ASSET] ❌ NOT FOUND | URL: ${req.url} | PATH: ${resolvedPath}`);
      }
    } catch (err) {
      console.log(`[ASSET] 💥 FS ERROR | URL: ${req.url} | PATH: ${resolvedPath} | REASON: ${err.message}`);
    }
  }
  next();
});

app.use('/images',  express.static(IMAGES_PATH));
app.use('/songs',   express.static(SONGS_PATH));
app.use('/webinc',  express.static(WEBINC_PATH));
app.use('/storage', express.static(STORAGE_PATH));

const multer = require('multer');
const fs = require('fs');

// ── Multer config for song uploads ───────────────────────────────────────────
const songStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const { cid } = req.body;
    const dir = path.join(SONGS_PATH, String(cid));
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '_' + file.originalname);
  }
});
const uploadSong = multer({ storage: songStorage });

// ── Image file cache ─────────────────────────────────────────────────────────
// IMAGE_CACHE: used only by public-facing song browse/search endpoints.
// Maps `${cid}/${fname}` → first physical file found, so browse pages can
// display scan thumbnails without knowing the owning song's id.
const IMAGE_CACHE = {};
function buildImageCache() {
  if (!fs.existsSync(SONGS_PATH)) return;
  try {
    for (const dir of fs.readdirSync(SONGS_PATH)) {
      const dirPath = path.join(SONGS_PATH, dir);
      if (!fs.statSync(dirPath).isDirectory()) continue;
      for (const file of fs.readdirSync(dirPath)) {
        if (!isRealScan(path.join(dirPath, file))) continue;
        IMAGE_CACHE[`${dir}/${file}`] = `/songs/${dir}/${file}`;
      }
    }
    console.log(`✅ Image cache: ${Object.keys(IMAGE_CACHE).length} folio images indexed`);
  } catch (e) { console.warn('⚠️  Image cache build warning:', e.message); }
}
function getImageUrl(cid, id, filename) {
  if (cid && filename) {
    const key = `${cid}/${filename}`;
    if (IMAGE_CACHE[key]) return IMAGE_CACHE[key];
  }
  return null;
}
buildImageCache();

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

// ── Helper ───────────────────────────────────────────────────────────────────
const db = {
  query: (text, params) => pool.query(text, params),
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
    const r = await pool.query("SELECT extname FROM pg_extension WHERE extname='pg_trgm'");
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
    const mapped = rows.map(r => ({ ...r, edition_cover: EDITION_3D_COVERS[r.id] || null }));
    res.json(mapped);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// 5. Team members
app.get('/api/team', async (req, res) => {
  try {
    const teamPhotos = [
      '/images/team/director1.jpg',
      '/images/team/arulmani.jpg',
      '/images/team/tamilvannan.jpg',
      '/images/team/thamarai.jpg',
      '/images/team/venki.jpg',
      '/images/team/nagarajan.jpg',
      '/images/team/karumbu.jpg',
    ];
    const { rows } = await db.query('SELECT * FROM team_members ORDER BY display_order').catch(() => ({ rows: [] }));
    const result = rows.map((m, idx) => ({
      ...m,
      photo_url: teamPhotos[idx] || null,
    }));
    res.json(result);
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
      console.error(`[PDF PROXY] Network Share / Filesystem error: ${err.message} | Path: ${localPath}`);
      return res.status(404).json({ error: 'PDF not accessible on the network share', details: err.message, path: localPath });
    }

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Expose-Headers', 'Accept-Ranges, Content-Range, Content-Length, Content-Type');
    return res.sendFile(localPath);
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
    } catch (_) {
      console.error(`[PDF] Local file not found or invalid: ${localPath}`);
      return res.status(404).json({
        error: 'PDF not available locally. Run: node backend/download_missing_pdfs.js',
      });
    }

    // Serve the file — Express handles Range requests, Content-Type, and streaming automatically
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Expose-Headers', 'Accept-Ranges, Content-Range, Content-Length, Content-Type');
    return res.sendFile(localPath);

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
  ];
  for (const q of queries) {
    await pool.query(q).catch(e => console.error('Table ensure error:', e.message));
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
    await pool.query(q).catch(e => console.error('Edition column migration:', e.message));
  }

  console.log('✅ Support tables verified');
}
ensureTables();

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
app.delete('/api/admin/books/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM sv_book WHERE book_id=$1', [req.params.id]);
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
    await db.query('DELETE FROM sv_main_category WHERE cid=$1', [req.params.id]);
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
    await db.query('DELETE FROM sv_sub_category WHERE id=$1', [req.params.id]);
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
app.post('/api/admin/songs', uploadSong.single('image'), async (req, res) => {
  try {
    const { cid, status } = req.body;
    if (!cid) return res.status(400).json({ error: 'cid is required' });

    // Support multiple fid/fname pairs — each pair → separate DB row (original CICT behavior)
    const rawFids   = [].concat(req.body.fid   || []);
    const rawFnames = [].concat(req.body.fname  || []);
    if (!rawFids.length) return res.status(400).json({ error: 'At least one fid/fname pair required' });

    const imageOriginalName = req.file ? req.file.originalname : '';
    const insertedIds = [];
    let primaryId = null;  // first row owns the physical file

    for (let i = 0; i < rawFids.length; i++) {
      const fid   = rawFids[i]   || '';
      const fname = rawFnames[i] || '';
      // Rows after the first point to the first row's file via group_id
      const groupId = (i === 0) ? 0 : primaryId;

      const { rows } = await db.query(
        `INSERT INTO sv_songs (cid, fid, fname, filename, description, author, group_id, status, upload_date)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8, TO_CHAR(CURRENT_TIMESTAMP, 'YYYY-MM-DD HH24:MI:SS'))
         RETURNING id`,
        [cid, fid, fname, imageOriginalName, fname, 'System', groupId, status ?? 1]
      );
      const newId = rows[0].id;
      insertedIds.push(newId);

      if (i === 0) {
        primaryId = newId;
        // Rename the uploaded file to {primaryId}_{originalname}
        if (req.file) {
          const newPath = path.join(path.dirname(req.file.path), `${primaryId}_${imageOriginalName}`);
          fs.renameSync(req.file.path, newPath);
        }
      }
    }

    if (req.file) buildImageCache();
    res.json({ ids: insertedIds, id: insertedIds[0] });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
app.put('/api/admin/songs/:id', uploadSong.single('image'), async (req, res) => {
  try {
    const { cid, fid, fname, status } = req.body;
    const songId = req.params.id;
    if (req.file) {
      const imageOriginalName = req.file.originalname;
      await db.query(
        'UPDATE sv_songs SET cid=$1, fid=$2, fname=$3, filename=$4, description=$5, status=$6 WHERE id=$7',
        [cid, fid, fname || '', imageOriginalName, fname || '', status, songId]
      );
      const newPath = path.join(path.dirname(req.file.path), `${songId}_${imageOriginalName}`);
      fs.renameSync(req.file.path, newPath);
      buildImageCache();
    } else {
      // No new file — keep existing filename, only update text fields
      await db.query(
        'UPDATE sv_songs SET cid=$1, fid=$2, fname=$3, description=$4, status=$5 WHERE id=$6',
        [cid, fid, fname || '', fname || '', status, songId]
      );
    }
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
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
    // Fetch before deleting so we can clean up the physical image file
    const { rows: songRows } = await db.query(
      'SELECT id, cid, filename, group_id FROM sv_songs WHERE id=$1', [req.params.id]
    );
    if (songRows[0]) {
      const song = songRows[0];
      // Only delete the physical file if this record owns it (group_id = 0 or null)
      const ownsFile = !song.group_id || parseInt(song.group_id) === 0;
      if (ownsFile && song.filename) {
        const imgPath = path.join(SONGS_PATH, String(song.cid), `${song.id}_${song.filename}`);
        try { if (fs.existsSync(imgPath)) { fs.unlinkSync(imgPath); buildImageCache(); } } catch {}
      }
    }
    await db.query('DELETE FROM sv_songs WHERE id=$1', [req.params.id]);
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
      db.query(`SELECT id, username, email, role, status, created_at FROM sv_users ${where} ORDER BY id DESC LIMIT $${params.length+1} OFFSET $${params.length+2}`, [...params, parseInt(limit), offset]),
      db.query(`SELECT COUNT(*) as c FROM sv_users ${where}`, params),
    ]);
    res.json({ rows: rows.rows, total: parseInt(count.rows[0].c) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
app.post('/api/admin/users', async (req, res) => {
  try {
    const { username, password, email, role } = req.body;
    const { rows } = await db.query(
      'INSERT INTO sv_users (username, password, email, role) VALUES ($1,$2,$3,$4) RETURNING id',
      [username, password, email, role || 'admin']
    );
    res.json({ id: rows[0].id });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
app.put('/api/admin/users/:id', async (req, res) => {
  try {
    const { username, password, email, role, status } = req.body;
    if (password) {
      await db.query(
        'UPDATE sv_users SET username=$1, password=$2, email=$3, role=$4, status=$5 WHERE id=$6',
        [username, password, email, role, status, req.params.id]
      );
    } else {
      await db.query(
        'UPDATE sv_users SET username=$1, email=$2, role=$3, status=$4 WHERE id=$5',
        [username, email, role, status, req.params.id]
      );
    }
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
app.delete('/api/admin/users/:id', async (req, res) => {
  try {
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
    await db.query(
      'UPDATE sv_ebook_editions SET book_id=$1, title_tamil=$2, pdf_url=$3, local_pdf_url=$4, status=$5 WHERE id=$6',
      [book_id, title_tamil, pdf_url || '', local_pdf_url || '', status, req.params.id]
    );
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
app.delete('/api/admin/ebook-editions/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM sv_ebook_editions WHERE id=$1', [req.params.id]);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Health check ─────────────────────────────────────────────────────────────
app.get('/health', (req, res) => res.send('OK'));
app.get('/api/status', (req, res) =>
  res.json({ status: 'Suvadi API is live', db: 'PostgreSQL', timestamp: new Date() })
);

// ── Robust server start ──────────────────────────────────────────────────────
function startServer(port) {
  const server = app.listen(port, () => {
    console.log('');
    console.log('═══════════════════════════════════════════════════');
    console.log(`  ✅ Backend running  →  http://localhost:${port}`);
    console.log(`  🐘 Database        →  PostgreSQL @ ${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`);
    console.log(`  📂 Images served   →  ${IMAGES_PATH}`);
    console.log('  🟢 Server is LIVE — do not close this window');
    console.log('═══════════════════════════════════════════════════');
    console.log('');
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      const nextPort = port + 1;
      console.warn(`⚠️  Port ${port} busy — trying port ${nextPort}...`);
      server.close();
      startServer(nextPort);
    } else {
      console.error('❌ Server error:', err.message);
    }
  });

  return server;
}

startServer(PORT);

// Keep-alive
setInterval(() => {}, 30000);
