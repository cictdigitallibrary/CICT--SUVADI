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
const IMAGES_PATH  = path.join(__dirname, '..', 'images');
const SONGS_PATH   = path.join(__dirname, '..', 'songs');
const WEBINC_PATH  = path.join(__dirname, '..', 'webinc');
const STORAGE_PATH = path.join(__dirname, '..', 'storage');

app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());

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
        const sep = file.indexOf('_');
        if (sep > 0) {
          const key = `${dir}/${file.substring(sep + 1)}`;
          if (!IMAGE_CACHE[key]) IMAGE_CACHE[key] = `/songs/${dir}/${file}`;
        }
      }
    }
    console.log(`✅ Image cache: ${Object.keys(IMAGE_CACHE).length} folio images indexed`);
  } catch (e) { console.warn('⚠️  Image cache build warning:', e.message); }
}
function getImageUrl(cid, id, fname) {
  if (!fname) return null;
  const exactKey = `${cid}/${fname}`;
  if (IMAGE_CACHE[exactKey]) return IMAGE_CACHE[exactKey];
  const spaceKey = `${cid}/${fname.replace(/\+/g, ' ')}`;
  if (IMAGE_CACHE[spaceKey]) return IMAGE_CACHE[spaceKey];
  try {
    const decodedKey = `${cid}/${decodeURIComponent(fname)}`;
    if (IMAGE_CACHE[decodedKey]) return IMAGE_CACHE[decodedKey];
  } catch (e) {}
  return `/songs/${cid}/${id}_${fname}`;
}
buildImageCache();

// Reads the first 4 bytes of a file and returns false if it is a PNG.
// The original PHP server returns the Indian emblem (a PNG) as a placeholder
// when a real scan is unavailable. Such files must be treated as missing.
function isRealScan(filePath) {
  try {
    const buf = Buffer.alloc(4);
    const fd2 = fs.openSync(filePath, 'r');
    fs.readSync(fd2, buf, 0, 4, 0);
    fs.closeSync(fd2);
    // PNG magic: 89 50 4E 47
    return !(buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4E && buf[3] === 0x47);
  } catch { return false; }
}

// resolveAdminImage: strict 1:1 mapping for admin panel only.
// Uses group_id from sv_songs to identify the physical file owner deterministically.
//   group_id = 0  → this record owns the scan page; file = {id}_{fname}
//   group_id > 0  → scan page owned by that song; file = {group_id}_{fname}
// Handles + ↔ space encoding: some fnames were stored as "c+2.jpg" when the
// actual file on disk is "c 2.jpg" (URL-encoded space from the original import).
// Never uses IMAGE_CACHE — no random file selection, no mismatched images.
function resolveAdminImage(cid, id, fname, group_id) {
  if (!fname) return { url: null, actual_filename: null, is_missing: true };
  const ownerId = (group_id > 0) ? group_id : id;
  const cidStr  = String(cid);
  // Candidate fnames: exact DB value, + decoded to space, and URL decoded
  const fnameCandidates = [...new Set([
    fname,
    fname.replace(/\+/g, ' '),
    (() => { try { return decodeURIComponent(fname); } catch { return null; } })(),
  ].filter(Boolean))];

  for (const fn of fnameCandidates) {
    const ownerFile = `${ownerId}_${fn}`;
    const ownerPath = path.join(SONGS_PATH, cidStr, ownerFile);
    if (fs.existsSync(ownerPath) && isRealScan(ownerPath)) {
      return { url: `/songs/${cidStr}/${ownerFile}`, actual_filename: ownerFile, is_missing: false };
    }
    // Fallback: own file when ownerId differs (some records have individual files)
    if (ownerId !== id) {
      const ownFile = `${id}_${fn}`;
      const ownPath = path.join(SONGS_PATH, cidStr, ownFile);
      if (fs.existsSync(ownPath) && isRealScan(ownPath)) {
        return { url: `/songs/${cidStr}/${ownFile}`, actual_filename: ownFile, is_missing: false };
      }
    }
  }
  // No file found — report canonical expected filename (space-decoded for readability)
  const displayFname = fname.replace(/\+/g, ' ');
  return { url: null, actual_filename: `${ownerId}_${displayFname}`, is_missing: true };
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
        `SELECT id, fid as page_number, fname as image_file, description as text_content,
                group_id, view_counts, cid
         FROM sv_songs
         WHERE cid = $1 AND fid = $2 AND status = 1 AND trash = 0
         ORDER BY fid`,
        [sub_id, pageNum]
      );
      rows = r.rows;
    } else {
      const r = await db.query(
        `SELECT id, fid as page_number, fname as image_file, description as text_content,
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

// ── ★ NEW: Global Search API ─────────────────────────────────────────────────
// GET /api/search?q=<query>&book_id=<optional>&sub_id=<optional>&page=1&limit=20
app.get('/api/search', async (req, res) => {
  try {
    const { q, book_id, sub_id, page = 1, limit = 20 } = req.query;
    if (!q || q.trim().length < 1) {
      return res.status(400).json({ error: 'Search query is required' });
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const searchTerm = `%${q.trim()}%`;

    // Build dynamic WHERE conditions
    const conditions = ['s.description ILIKE $1', 's.status = 1', 's.trash = 0'];
    const params = [searchTerm];
    let idx = 2;

    if (book_id) {
      conditions.push(`b.book_id = $${idx++}`);
      params.push(book_id);
    }
    if (sub_id) {
      conditions.push(`s.cid = $${idx++}`);
      params.push(sub_id);
    }

    const whereClause = conditions.join(' AND ');

    // Count total matches
    const countQ = await db.query(
      `SELECT COUNT(*) as total
       FROM sv_songs s
       JOIN sv_sub_category sc ON sc.id = s.cid
       JOIN sv_main_category mc ON mc.cid = sc.main_category_id
       JOIN sv_book b ON b.book_id = mc.book_id
       WHERE ${whereClause}`,
      params
    );
    const total = parseInt(countQ.rows[0].total);

    // Fetch paginated results
    const dataQ = await db.query(
      `SELECT s.id, s.fid as page_number, s.fname as image_file,
              s.description as text_content, s.cid, s.group_id, s.view_counts,
              sc.sub_cat_name as manuscript_name, mc.cname as category_name,
              b.name as book_name, b.book_id
       FROM sv_songs s
       JOIN sv_sub_category sc ON sc.id = s.cid
       JOIN sv_main_category mc ON mc.cid = sc.main_category_id
       JOIN sv_book b ON b.book_id = mc.book_id
       WHERE ${whereClause}
       ORDER BY b.book_id, mc.cid, s.fid
       LIMIT $${idx++} OFFSET $${idx++}`,
      [...params, parseInt(limit), offset]
    );

    const results = dataQ.rows.map(r => ({
      ...r,
      image_url: getImageUrl(r.cid, r.id, r.image_file),
      cover_image: BOOK_COVER_MAP[r.book_id] || null,
    }));

    res.json({
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      total_pages: Math.ceil(total / parseInt(limit)),
      query: q,
      results,
    });
  } catch (e) {
    console.error('Search error:', e.message);
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
      `SELECT id, fid as page_number, fname as image_file, description as text_content, group_id, cid
       FROM sv_songs
       WHERE cid = $1 AND status = 1 AND trash = 0
       ORDER BY fid
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
      `SELECT e.id, e.title_tamil, e.pdf_url
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
    const [tc, mc, sc, subs, editions] = await Promise.all([
      db.query('SELECT COUNT(*) as c FROM sv_book WHERE status=1'),
      db.query('SELECT COUNT(*) as c FROM sv_main_category WHERE status=1'),
      db.query('SELECT COUNT(*) as c FROM sv_songs WHERE status=1 AND trash=0'),
      db.query('SELECT COUNT(*) as c FROM sv_sub_category WHERE status=1'),
      db.query('SELECT COUNT(*) as c FROM sv_ebook_editions WHERE status=1'),
    ]);
    res.json({
      texts:          parseInt(tc.rows[0].c),
      manuscripts:    parseInt(mc.rows[0].c),
      sub_categories: parseInt(subs.rows[0].c),
      songs:          parseInt(sc.rows[0].c),
      ebook_editions: parseInt(editions.rows[0].c),
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

// PDF proxy — bypasses CORS for ebook PDFs, with automatic local self-hosting cache
app.get('/api/proxy/pdf', async (req, res) => {
  const { url } = req.query;
  if (!url || !url.startsWith('https://suvadi.cict.in/')) {
    return res.status(403).json({ error: 'Forbidden URL' });
  }

  try {
    // 1. DB Lookup to find the requested edition
    const { rows } = await db.query(
      `SELECT id, pdf_url, local_pdf_url FROM sv_ebook_editions WHERE pdf_url = $1 LIMIT 1`,
      [url]
    );
    const edition = rows[0];

    // 2. Serve from Local Cache if valid
    if (edition && edition.local_pdf_url) {
      const localPath = path.join(__dirname, '..', edition.local_pdf_url);
      try {
        const stats = await fs.promises.stat(localPath);
        if (stats.isFile() && stats.size > 0) {
          // express sendFile automatically handles HTTP Range requests and streaming
          return res.sendFile(localPath);
        }
      } catch (err) {
        console.warn(`[Proxy] Local file missing/unreadable: ${localPath}. Falling back to remote.`);
      }
    }

    // 3. Fallback: Proxy from remote & download in background
    const options = { headers: {} };
    if (req.headers.range) options.headers.range = req.headers.range;

    https.get(url, options, (proxyRes) => {
      for (const [key, value] of Object.entries(proxyRes.headers)) {
        res.setHeader(key, value);
      }
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Expose-Headers', 'Accept-Ranges, Content-Range, Content-Length, Content-Type');
      res.status(proxyRes.statusCode);

      // Cache it locally if it's a full 200 OK response (not a 206 Partial Content)
      if (proxyRes.statusCode === 200 && edition && !req.headers.range) {
        const fileName = `edition_${edition.id}.pdf`;
        const relativePath = `storage/pdfs/${fileName}`;
        const absolutePath = path.join(__dirname, '..', 'storage', 'pdfs', fileName);
        
        // Ensure storage directory exists
        fs.mkdirSync(path.join(__dirname, '..', 'storage', 'pdfs'), { recursive: true });

        const fileStream = fs.createWriteStream(absolutePath);
        
        // Pipe stream to both client and local disk
        proxyRes.pipe(fileStream);
        proxyRes.pipe(res);

        fileStream.on('finish', async () => {
          try {
            await db.query(
              `UPDATE sv_ebook_editions SET local_pdf_url = $1, original_pdf_url = $2 WHERE id = $3`,
              [relativePath, url, edition.id]
            );
            console.log(`[Proxy] Successfully cached PDF locally: ${relativePath}`);
          } catch(e) {
            console.error(`[Proxy] Failed to update DB for cached PDF:`, e.message);
          }
        });
        
        fileStream.on('error', (err) => {
          console.error(`[Proxy] File write error for ${absolutePath}:`, err.message);
        });
      } else {
        // Just proxy normally (e.g. for Range requests)
        proxyRes.pipe(res);
      }
    }).on('error', (err) => {
      if (!res.headersSent) res.status(500).json({ error: err.message });
    });
  } catch (err) {
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
    const { page = 1, limit = 50, search = '' } = req.query;
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
    const { page = 1, limit = 50, search = '', book_id } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const params = [];
    const conditions = [];
    if (book_id) { params.push(book_id); conditions.push(`mc.book_id = $${params.length}`); }
    if (search) { params.push(`%${search}%`); conditions.push(`mc.cname ILIKE $${params.length}`); }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const [rows, count] = await Promise.all([
      db.query(`SELECT mc.*, b.name as book_name FROM sv_main_category mc JOIN sv_book b ON b.book_id = mc.book_id ${where} ORDER BY mc.cid DESC LIMIT $${params.length+1} OFFSET $${params.length+2}`, [...params, parseInt(limit), offset]),
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
    const { page = 1, limit = 50, search = '', book_id, main_category_id } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const params = [];
    const conditions = [];
    if (book_id) { params.push(book_id); conditions.push(`sc.book_id = $${params.length}`); }
    if (main_category_id) { params.push(main_category_id); conditions.push(`sc.main_category_id = $${params.length}`); }
    if (search) { params.push(`%${search}%`); conditions.push(`sc.sub_cat_name ILIKE $${params.length}`); }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const [rows, count] = await Promise.all([
      db.query(`SELECT sc.*, mc.cname as category_name, b.name as book_name FROM sv_sub_category sc JOIN sv_main_category mc ON mc.cid = sc.main_category_id JOIN sv_book b ON b.book_id = sc.book_id ${where} ORDER BY sc.id DESC LIMIT $${params.length+1} OFFSET $${params.length+2}`, [...params, parseInt(limit), offset]),
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
    const { page = 1, limit = 50, cid, search = '', trash = '0' } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const trashVal = trash === '1' ? 1 : 0;
    const conditions = [`s.trash = ${trashVal}`];
    const params = [];
    if (cid) { conditions.push(`s.cid = $${params.length + 1}`); params.push(cid); }
    if (search) {
      params.push(`%${search}%`);
      const sn = params.length;
      conditions.push(`(s.fname ILIKE $${sn} OR s.description ILIKE $${sn} OR CAST(s.fid AS TEXT) ILIKE $${sn} OR s.author ILIKE $${sn})`);
    }
    const where = conditions.join(' AND ');
    const [rows, count] = await Promise.all([
      db.query(
        `SELECT s.id, s.fid, s.fname, s.filename, s.filetype, s.cid, s.group_id, s.description, s.author,
                s.upload_date, s.view_counts, s.down_counts, s.status, s.trash,
                sc.sub_cat_name, mc.cid as main_category_id, b.book_id, b.name as book_name
         FROM sv_songs s
         LEFT JOIN sv_sub_category sc ON sc.id = s.cid
         LEFT JOIN sv_main_category mc ON mc.cid = sc.main_category_id
         LEFT JOIN sv_book b ON b.book_id = mc.book_id
         WHERE ${where}
         ORDER BY s.id DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
        [...params, parseInt(limit), offset]
      ),
      db.query(`SELECT COUNT(*) as c FROM sv_songs s WHERE ${where}`, params),
    ]);
    rows.rows.forEach(r => {
      const { url, actual_filename, is_missing } = resolveAdminImage(r.cid, r.id, r.fname, r.group_id);
      r.image_url       = url;
      r.actual_filename = actual_filename;
      r.is_missing      = is_missing;
    });
    res.json({ rows: rows.rows, total: parseInt(count.rows[0].c) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
app.post('/api/admin/songs', uploadSong.single('image'), async (req, res) => {
  try {
    const { cid, fid, description, author, status } = req.body;
    const fname = req.file ? req.file.originalname : '';
    const { rows } = await db.query(
      'INSERT INTO sv_songs (cid, fid, fname, description, author, status) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id',
      [cid, fid, fname, description || '', author || 'System', status ?? 1]
    );
    const newId = rows[0].id;
    if (req.file) {
      const newName = `${newId}_${fname}`;
      fs.renameSync(req.file.path, path.join(path.dirname(req.file.path), newName));
      buildImageCache();
    }
    res.json({ id: newId });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
app.put('/api/admin/songs/:id', uploadSong.single('image'), async (req, res) => {
  try {
    const { cid, fid, description, author, status } = req.body;
    if (req.file) {
      const fname = req.file.originalname;
      await db.query(
        'UPDATE sv_songs SET cid=$1, fid=$2, fname=$3, description=$4, author=$5, status=$6 WHERE id=$7',
        [cid, fid, fname, description, author || 'System', status, req.params.id]
      );
      fs.renameSync(req.file.path, path.join(path.dirname(req.file.path), `${req.params.id}_${fname}`));
      buildImageCache();
    } else {
      await db.query(
        'UPDATE sv_songs SET cid=$1, fid=$2, description=$3, author=$4, status=$5 WHERE id=$6',
        [cid, fid, description, author || 'System', status, req.params.id]
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
    await db.query('DELETE FROM sv_songs WHERE id=$1', [req.params.id]);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── USERS CRUD ────────────────────────────────────────────────────────────────
app.get('/api/admin/users', async (req, res) => {
  try {
    const { page = 1, limit = 50, search = '' } = req.query;
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
    const { page = 1, limit = 50, search = '' } = req.query;
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
    const { page = 1, limit = 50, search = '' } = req.query;
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
    const { page = 1, limit = 50, search = '', book_id } = req.query;
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
    const ROOT = path.join(__dirname, '..');
    rows.rows.forEach(r => {
      r.is_missing = r.local_pdf_url ? !fs.existsSync(path.join(ROOT, r.local_pdf_url)) : true;
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
