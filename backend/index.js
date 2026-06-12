const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const Database = require('better-sqlite3');
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
const dbPath = process.env.DB_PATH || './db/suvadi.sqlite';

// Serve static images from the parent images folder
const IMAGES_PATH = path.join(__dirname, '..', 'images');
const SONGS_PATH = path.join(__dirname, '..', 'songs');
const WEBINC_PATH = path.join(__dirname, '..', 'webinc');

app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());

// Static image serving
app.use('/images', express.static(IMAGES_PATH));
app.use('/songs', express.static(SONGS_PATH));
app.use('/webinc', express.static(WEBINC_PATH));

const multer = require('multer');
const fs = require('fs');

// Database connection
const db = new Database(dbPath);

// Initialize sv_users if not exists
db.exec(`
  CREATE TABLE IF NOT EXISTS sv_users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    email TEXT,
    role TEXT DEFAULT 'admin',
    status INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )
`);

// Initialize contacts table
db.exec(`
  CREATE TABLE IF NOT EXISTS contacts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    subject TEXT,
    message TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )
`);

// Multer config for song uploads
const songStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const { cid } = req.body;
    const dir = path.join(SONGS_PATH, String(cid));
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    // We'll rename after DB insert to match {id}_{fname}
    cb(null, Date.now() + '_' + file.originalname);
  }
});
const uploadSong = multer({ storage: songStorage });

// ── Admin API ───────────────────────────────────────────────────────────────

// BOOKS CRUD
app.get('/api/admin/books', (req, res) => {
  const rows = db.prepare('SELECT * FROM sv_book ORDER BY book_id DESC').all();
  res.json(rows);
});
app.post('/api/admin/books', (req, res) => {
  const { name, status } = req.body;
  const info = db.prepare('INSERT INTO sv_book (name, status) VALUES (?, ?)').run(name, status);
  res.json({ id: info.lastInsertRowid });
});
app.put('/api/admin/books/:id', (req, res) => {
  const { name, status } = req.body;
  db.prepare('UPDATE sv_book SET name = ?, status = ? WHERE book_id = ?').run(name, status, req.params.id);
  res.json({ success: true });
});
app.delete('/api/admin/books/:id', (req, res) => {
  db.prepare('DELETE FROM sv_book WHERE book_id = ?').run(req.params.id);
  // Cascade delete
  const categories = db.prepare('SELECT cid FROM sv_main_category WHERE book_id = ?').all(req.params.id);
  for (const cat of categories) {
    db.prepare('DELETE FROM sv_main_category WHERE cid = ?').run(cat.cid);
    const subcats = db.prepare('SELECT id FROM sv_sub_category WHERE main_category_id = ?').all(cat.cid);
    for (const sub of subcats) {
      db.prepare('DELETE FROM sv_sub_category WHERE id = ?').run(sub.id);
      db.prepare('UPDATE sv_songs SET trash = 1 WHERE cid = ?').run(sub.id);
    }
  }
  res.json({ success: true });
});

// MAIN CATEGORY CRUD
app.get('/api/admin/categories', (req, res) => {
  const rows = db.prepare('SELECT mc.*, b.name as book_name FROM sv_main_category mc JOIN sv_book b ON b.book_id = mc.book_id ORDER BY cid DESC').all();
  res.json(rows);
});
app.post('/api/admin/categories', (req, res) => {
  const { book_id, cname, status } = req.body;
  const info = db.prepare('INSERT INTO sv_main_category (book_id, cname, status) VALUES (?, ?, ?)').run(book_id, cname, status);
  res.json({ id: info.lastInsertRowid });
});
app.put('/api/admin/categories/:id', (req, res) => {
  const { book_id, cname, status } = req.body;
  db.prepare('UPDATE sv_main_category SET book_id = ?, cname = ?, status = ? WHERE cid = ?').run(book_id, cname, status, req.params.id);
  res.json({ success: true });
});
app.delete('/api/admin/categories/:id', (req, res) => {
  db.prepare('DELETE FROM sv_main_category WHERE cid = ?').run(req.params.id);
  // Cascade delete
  const subcats = db.prepare('SELECT id FROM sv_sub_category WHERE main_category_id = ?').all(req.params.id);
  for (const sub of subcats) {
    db.prepare('DELETE FROM sv_sub_category WHERE id = ?').run(sub.id);
    db.prepare('UPDATE sv_songs SET trash = 1 WHERE cid = ?').run(sub.id);
  }
  res.json({ success: true });
});

// SUB CATEGORY CRUD
app.get('/api/admin/subcategories', (req, res) => {
  const rows = db.prepare(`
    SELECT sc.*, mc.cname as category_name, b.name as book_name 
    FROM sv_sub_category sc 
    JOIN sv_main_category mc ON mc.cid = sc.main_category_id
    JOIN sv_book b ON b.book_id = sc.book_id
    ORDER BY sc.id DESC
  `).all();
  res.json(rows);
});
app.post('/api/admin/subcategories', (req, res) => {
  const { book_id, main_category_id, sub_cat_name, status } = req.body;
  const info = db.prepare('INSERT INTO sv_sub_category (book_id, main_category_id, sub_cat_name, status) VALUES (?, ?, ?, ?)').run(book_id, main_category_id, sub_cat_name, status);
  res.json({ id: info.lastInsertRowid });
});
app.put('/api/admin/subcategories/:id', (req, res) => {
  const { book_id, main_category_id, sub_cat_name, status } = req.body;
  db.prepare('UPDATE sv_sub_category SET book_id = ?, main_category_id = ?, sub_cat_name = ?, status = ? WHERE id = ?').run(book_id, main_category_id, sub_cat_name, status, req.params.id);
  res.json({ success: true });
});
app.delete('/api/admin/subcategories/:id', (req, res) => {
  db.prepare('DELETE FROM sv_sub_category WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// SONGS CRUD
app.get('/api/admin/songs', (req, res) => {
  const { page = 1, limit = 50 } = req.query;
  const offset = (page - 1) * limit;
  const rows = db.prepare(`
    SELECT s.*, sc.sub_cat_name 
    FROM sv_songs s 
    LEFT JOIN sv_sub_category sc ON sc.id = s.cid
    WHERE s.trash = 0
    ORDER BY s.id DESC LIMIT ? OFFSET ?
  `).all(limit, offset);
  const total = db.prepare('SELECT COUNT(*) as c FROM sv_songs WHERE trash = 0').get().c;
  res.json({ rows, total });
});

app.post('/api/admin/songs', uploadSong.single('image'), (req, res) => {
  const { cid, fid, description, status } = req.body;
  const fname = req.file ? req.file.originalname : '';
  const info = db.prepare('INSERT INTO sv_songs (cid, fid, fname, description, status) VALUES (?, ?, ?, ?, ?)').run(cid, fid, fname, description, status);
  
  if (req.file) {
    const newName = `${info.lastInsertRowid}_${fname}`;
    const oldPath = req.file.path;
    const newPath = path.join(path.dirname(oldPath), newName);
    fs.renameSync(oldPath, newPath);
  }
  res.json({ id: info.lastInsertRowid });
});

app.put('/api/admin/songs/:id', uploadSong.single('image'), (req, res) => {
  const { cid, fid, description, status } = req.body;
  
  if (req.file) {
    const fname = req.file.originalname;
    db.prepare('UPDATE sv_songs SET cid = ?, fid = ?, fname = ?, description = ?, status = ? WHERE id = ?').run(cid, fid, fname, description, status, req.params.id);
    
    const newName = `${req.params.id}_${fname}`;
    const oldPath = req.file.path;
    const newPath = path.join(path.dirname(oldPath), newName);
    fs.renameSync(oldPath, newPath);
  } else {
    // Check if category changed and move file if it did
    const oldSong = db.prepare('SELECT cid, fname FROM sv_songs WHERE id = ?').get(req.params.id);
    if (oldSong && String(oldSong.cid) !== String(cid) && oldSong.fname) {
      const oldFilePath = path.join(SONGS_PATH, String(oldSong.cid), `${req.params.id}_${oldSong.fname}`);
      const newDir = path.join(SONGS_PATH, String(cid));
      if (!fs.existsSync(newDir)) fs.mkdirSync(newDir, { recursive: true });
      const newFilePath = path.join(newDir, `${req.params.id}_${oldSong.fname}`);
      
      if (fs.existsSync(oldFilePath)) {
        fs.renameSync(oldFilePath, newFilePath);
      }
    }
    
    db.prepare('UPDATE sv_songs SET cid = ?, fid = ?, description = ?, status = ? WHERE id = ?').run(cid, fid, description, status, req.params.id);
  }
  res.json({ success: true });
});

app.delete('/api/admin/songs/:id', (req, res) => {
  // Soft Delete: Keep physical file and update trash flag
  db.prepare('UPDATE sv_songs SET trash = 1 WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// USERS CRUD
app.get('/api/admin/users', (req, res) => {
  const rows = db.prepare('SELECT id, username, email, role, status, created_at FROM sv_users').all();
  res.json(rows);
});
app.post('/api/admin/users', (req, res) => {
  const { username, password, email, role } = req.body;
  const info = db.prepare('INSERT INTO sv_users (username, password, email, role) VALUES (?, ?, ?, ?)').run(username, password, email, role);
  res.json({ id: info.lastInsertRowid });
});
app.put('/api/admin/users/:id', (req, res) => {
  const { username, password, email, role, status } = req.body;
  if (password) {
    db.prepare('UPDATE sv_users SET username = ?, password = ?, email = ?, role = ?, status = ? WHERE id = ?').run(username, password, email, role, status, req.params.id);
  } else {
    db.prepare('UPDATE sv_users SET username = ?, email = ?, role = ?, status = ? WHERE id = ?').run(username, email, role, status, req.params.id);
  }
  res.json({ success: true });
});
app.delete('/api/admin/users/:id', (req, res) => {
  db.prepare('DELETE FROM sv_users WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// ── Global Stats ────────────────────────────────────────────────────────────

// ── Book image map ──────────────────────────────────────────────────────────
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
  16: 'Muttollayiram'
};

// ── 3D Edition Covers Map ───────────────────────────────────────────────────
const EDITION_3D_COVERS = {
  1: '/images/thol-cvr-sl/1.jpg',
  2: '/images/thol-cvr-sl/2.jpg',
  3: '/images/thol-cvr-sl/3.jpg',
  4: '/images/thol-cvr-sl/thol.porul-1917.jpg',
  5: '/images/thol-cvr-sl/5.jpg',
  6: '/images/thol-cvr-sl/6.jpg',
  7: '/images/thol-cvr-sl/7.jpg',
  8: '/images/thol-cvr-sl/empty.jpg',
  9: '/images/thol-cvr-sl/9.jpg',
  10: '/images/thol-cvr-sl/10.jpg',
  11: '/images/thol-cvr-sl/11.jpg',
  12: '/images/thol-cvr-sl/12.jpg',
  13: '/images/thol-cvr-sl/13.jpg',
  14: '/images/thol-cvr-sl/14.jpg', 
  15: '/images/thol-cvr-sl/15.jpg',
  16: '/images/thol-cvr-sl/thol_kal.jpg',
  17: '/images/8t10p-cvr-sl/1.jpg',
  18: '/images/8t10p-cvr-sl/2.jpg',
  19: '/images/8t10p-cvr-sl/3.jpg',
  20: '/images/8t10p-cvr-sl/4.jpg',
  21: '/images/8t10p-cvr-sl/5.jpg',
  22: '/images/8t10p-cvr-sl/6.jpg',
  23: '/images/8t10p-cvr-sl/7.jpg',
  24: '/images/8t10p-cvr-sl/8.jpg',
  25: '/images/8t10p-cvr-sl/9.jpg',
  26: '/images/Silappathikaram/1.1872.jpg',
  27: '/images/Silappathikaram/2.1876.jpg',
  28: '/images/Silappathikaram/3.1880.jpg',
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
  49: '/images/mutholayiram/muthol_1905.jpg'
};

// ── Team photo map ──────────────────────────────────────────────────────────
const TEAM_PHOTO_MAP = {
  'director':    '/images/team/director1.jpg',
  'coordinator': '/images/team/arulmani.jpg',
  'researcher':  '/images/team/tamilvannan.jpg',
  'researcher2': '/images/team/thamarai.jpg',
  'tech':        '/images/team/venki.jpg',
  'vc':          '/images/team/vc.jpg',
};

// ── Routes ──────────────────────────────────────────────────────────────────

// 1. All books (sv_book) with cover images
app.get('/api/texts', (req, res) => {
  try {
    const rows = db.prepare('SELECT book_id as id, name as title_tamil, status FROM sv_book WHERE status = 1').all();
    const texts = rows.map(r => ({
      ...r,
      title_english: BOOK_ENGLISH_MAP[r.id] || '',
      cover_image:   BOOK_COVER_MAP[r.id] || null,
    }));
    res.json(texts);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// 2. All Classical Books (sv_main_category) – filter by book_id
app.get('/api/manuscripts', (req, res) => {
  try {
    const { book_id } = req.query;
    if (!book_id) return res.json([]);
    const stmt = db.prepare(`
        SELECT mc.cid as id, mc.book_id as text_id, mc.cname as title_tamil,
               b.name as book_name
        FROM sv_main_category mc
        JOIN sv_book b ON b.book_id = mc.book_id
        WHERE mc.book_id = ? AND mc.status = 1
        ORDER BY mc.cid
      `);
    const rows = stmt.all(book_id);
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// 2b. All Specific Manuscripts (sv_sub_category) – filter by main_category_id
app.get('/api/subcategories', (req, res) => {
  try {
    const { cid } = req.query;
    if (!cid) return res.json([]);
    const rows = db.prepare(`
      SELECT id, sub_cat_name as title_tamil, main_category_id
      FROM sv_sub_category
      WHERE main_category_id = ? AND status = 1
      ORDER BY id
    `).all(cid);
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// 3. Search sv_songs by poem number OR word
app.get('/api/manuscripts/search', (req, res) => {
  try {
    const { sub_id, type, q } = req.query;
    if (!sub_id || !q) return res.status(400).json({ error: 'Missing parameters' });

    // Get the category and book names for display
    const info = db.prepare(`
      SELECT sc.sub_cat_name, mc.cname as cat_name, b.name as book_name, mc.cid as main_cid
      FROM sv_sub_category sc
      JOIN sv_main_category mc ON mc.cid = sc.main_category_id
      JOIN sv_book b ON b.book_id = mc.book_id
      WHERE sc.id = ?
    `).get(sub_id);

    let rows;
    if (type === 'by_number') {
      const pageNum = parseInt(q, 10);
      if (isNaN(pageNum)) return res.json({ count: 0, results: [] });
      rows = db.prepare(`
        SELECT id, fid as page_number, fname as image_file, description as text_content,
               group_id, view_counts, cid
        FROM sv_songs
        WHERE cid = ? AND fid = ? AND status = 1 AND trash = 0
        ORDER BY fid
      `).all(sub_id, pageNum);
    } else {
      rows = db.prepare(`
        SELECT id, fid as page_number, fname as image_file, description as text_content,
               group_id, view_counts, cid
        FROM sv_songs
        WHERE cid = ? AND description LIKE ? AND status = 1 AND trash = 0
        ORDER BY fid
        LIMIT 50
      `).all(sub_id, `%${q}%`);
    }

    // Build image URL: usando el esquema /songs/{cid}/{id}_{fname}
    const results = rows.map(r => ({
      ...r,
      image_url: r.image_file ? `/songs/${r.cid}/${r.id}_${r.image_file}` : null,
      manuscript_name: info ? info.sub_cat_name : '',
      book_name: info ? info.book_name : '',
    }));

    res.json({ count: results.length, results });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// PDF proxy — bypasses CORS and supports Range Requests for fast streaming
const https = require('https');
app.get('/api/proxy/pdf', (req, res) => {
  const { url } = req.query;
  if (!url || !url.startsWith('https://suvadi.cict.in/')) {
    return res.status(403).json({ error: 'Forbidden URL' });
  }

  const options = { headers: {} };
  // Forward range request to support pdf.js chunked loading
  if (req.headers.range) {
    options.headers.range = req.headers.range;
  }

  https.get(url, options, (proxyRes) => {
    // Copy all headers from the remote server (including Content-Range, Accept-Ranges, Content-Length)
    for (const [key, value] of Object.entries(proxyRes.headers)) {
      res.setHeader(key, value);
    }
    // Override/Ensure CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Expose-Headers', 'Accept-Ranges, Content-Range, Content-Length, Content-Type');
    
    // Forward the exact status code (200 OK or 206 Partial Content)
    res.status(proxyRes.statusCode);

    proxyRes.pipe(res);
  }).on('error', (err) => {
    console.error('PDF proxy error:', err.message);
    if (!res.headersSent) res.status(500).json({ error: err.message });
  });
});

// Book reader URLs from live site
const BOOK_URL_MAP = {
  9:  'https://suvadi.cict.in/asp/thol.aspx',
  10: 'https://suvadi.cict.in/asp/ettuthokai.aspx',
  11: 'https://suvadi.cict.in/asp/pathuppaatu.aspx',
  12: 'https://suvadi.cict.in/asp/silappathikaram.aspx',
  13: 'https://suvadi.cict.in/asp/kilkanakku.aspx',
  15: 'https://suvadi.cict.in/asp/irayanar.aspx',
  16: 'https://suvadi.cict.in/asp/mutholayiram.aspx',
};

// 4. Ebooks — book list
app.get('/api/ebooks', (req, res) => {
  try {
    const rows = db.prepare(`
      SELECT b.book_id as id,
             b.name as title_tamil,
             b.title_english,
             b.description_tamil,
             b.description_english,
             b.cover_image,
             b.first_edition_year,
             COUNT(e.id) as edition_count
      FROM sv_book b
      LEFT JOIN sv_ebook_editions e ON e.book_id = b.book_id AND e.status = 1
      WHERE b.status = 1
      GROUP BY b.book_id
      ORDER BY b.book_id
    `).all();
    const ebooks = rows.map(r => ({
      ...r,
      book_url: `/ebooks/${r.id}`,
    }));
    res.json(ebooks);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// 4b. Ebook details — single book
app.get('/api/ebooks/:id', (req, res) => {
  try {
    const { id } = req.params;
    const book = db.prepare(`
      SELECT book_id as id, name as title_tamil, title_english,
             description_tamil, description_english, cover_image, first_edition_year
      FROM sv_book WHERE book_id = ?
    `).get(id);
    if (!book) return res.status(404).json({ error: 'Book not found' });
    res.json(book);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// 4c. Ebook Editions — fetch list of editions for a book
app.get('/api/ebooks/:id/editions', (req, res) => {
  try {
    const rows = db.prepare(`
      SELECT e.id, e.title_tamil, e.title_english, e.pdf_url, e.image_folder, e.total_pages, e.editor, e.publisher, e.year_published
      FROM sv_ebook_editions e
      WHERE e.book_id = ?
      ORDER BY e.id ASC
    `).all(req.params.id);
    
    // Map precise 3D edition covers
    const mapped = rows.map(r => ({ ...r, edition_cover: EDITION_3D_COVERS[r.id] || null }));

    res.json(mapped);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// 5. Team members
app.get('/api/team', (req, res) => {
  try {
    const rolePhotoMap = {
      'director':   '/images/team/director1.jpg',
      'coordinator':'/images/team/arulmani.jpg',
      'researcher': '/images/team/tamilvannan.jpg',
    };
    const members = db.prepare('SELECT * FROM team_members ORDER BY display_order').all();
    // Assign real photos from our images folder
    const teamPhotos = [
      '/images/team/director1.jpg',
      '/images/team/arulmani.jpg',
      '/images/team/tamilvannan.jpg',
      '/images/team/thamarai.jpg',
      '/images/team/venki.jpg',
      '/images/team/nagarajan.jpg',
      '/images/team/karumbu.jpg',
    ];
    const result = members.map((m, idx) => ({
      ...m,
      photo_url: teamPhotos[idx] || rolePhotoMap[m.role] || null,
    }));
    res.json(result);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// 6. Stats
app.get('/api/stats', (req, res) => {
  try {
    const textCount       = db.prepare('SELECT COUNT(*) as c FROM sv_book WHERE status=1').get().c;
    const manuscriptCount = db.prepare('SELECT COUNT(*) as c FROM sv_main_category WHERE status=1').get().c;
    const songCount       = db.prepare('SELECT COUNT(*) as c FROM sv_songs WHERE status=1 AND trash=0').get().c;
    res.json({ texts: textCount, manuscripts: manuscriptCount, songs: songCount });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// 7. Get songs for a specific category (for browse view)
app.get('/api/songs', (req, res) => {
  try {
    const { sub_id, page = 1, limit = 20 } = req.query;
    if (!sub_id) return res.status(400).json({ error: 'sub_id required' });

    const info = db.prepare(`
      SELECT sc.main_category_id FROM sv_sub_category sc WHERE sc.id = ?
    `).get(sub_id);

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const rows = db.prepare(`
      SELECT id, fid as page_number, fname as image_file, description as text_content, group_id, cid
      FROM sv_songs
      WHERE cid = ? AND status = 1 AND trash = 0
      ORDER BY fid
      LIMIT ? OFFSET ?
    `).all(sub_id, parseInt(limit), offset);

    const total = db.prepare('SELECT COUNT(*) as c FROM sv_songs WHERE cid=? AND status=1 AND trash=0').get(sub_id).c;

    const results = rows.map(r => ({
      ...r,
      image_url: r.image_file ? `/songs/${r.cid}/${r.id}_${r.image_file}` : null,
    }));
    res.json({ total, page: parseInt(page), results });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// 8. Contact form submission
app.post('/api/contact', (req, res) => {
  try {
    const { name, email, subject, message } = req.body;
    if (!name || !email || !message) {
      return res.status(400).json({ error: 'Name, email, and message are required.' });
    }
    db.prepare('INSERT INTO contacts (name, email, subject, message) VALUES (?, ?, ?, ?)').run(name, email, subject || '', message);
    res.json({ success: true, message: 'Message received. Thank you!' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// 9. Admin - View contact messages
app.get('/api/admin/contacts', (req, res) => {
  try {
    const rows = db.prepare('SELECT * FROM contacts ORDER BY created_at DESC').all();
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Health check
app.get('/health', (req, res) => res.send('OK'));


// ── Robust server start ─────────────────────────────────────────────────────
function startServer(port) {
  const server = app.listen(port, () => {
    console.log('');
    console.log('═══════════════════════════════════════════════════');
    console.log(`  ✅ Backend running  →  http://localhost:${port}`);
    console.log(`  📂 Images served   →  ${IMAGES_PATH}`);
    console.log(`  🗄️  Database        →  ${dbPath}`);
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

// Keep-alive — prevents Node from ever auto-exiting
setInterval(() => {}, 30000);

