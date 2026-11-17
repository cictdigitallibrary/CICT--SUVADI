/**
 * siteContent.js — Page Content and Banner management for the public website.
 *
 * Kept apart from the book / manuscript / e-book modules: its own two tables, its own
 * upload folder and its own routes. Nothing here reads or writes the existing tables
 * or the existing upload folders.
 *
 * Model
 * - site_content: one row per editable section of a page (page_key, item_key).
 *     section → { title_ta, title_en, body_ta, body_en }   a content window: heading (plain
 *               text) and rich text (paragraphs, lists, links, tables)
 *     fields  → { values: { name: { ta, en } } }            short texts and numbers
 *     list    → { title_ta, title_en, rows: [ { type, ta, en } ] }
 *               rows of a list page (type: heading, subheading, item, gap)
 * - site_banners: one row per banner placement (slot_key).
 *     { image, image_mobile, image_width, image_height, …text fields… }
 *
 * Draft and publish: every row has `draft` and `published`. The public site reads only
 * `published`; a missing row or a null `published` means "the page's built-in content",
 * so the website looks exactly as before until something is published.
 *   draft = null              → no unpublished changes
 *   draft = { reset: true }   → publishing restores the built-in content
 *
 * Rich text is sanitised here (allow-list of tags and attributes) before it is stored,
 * and again in the browser before it is shown.
 */
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const cheerio = require('cheerio');

// ── Banner placements ────────────────────────────────────────────────────────
// Sizes measured from the current website: the hero banners and category banners are
// shown in a box of the image's own 1920 × 555 shape, the image filling it exactly
// (stretched to the box on the home page and the ≥640px page heroes, object-fit: cover
// on the category banners). A replacement must therefore have the same proportions,
// or it would be distorted / cropped — uploads with another shape are refused.
const PANORAMA = { width: 1920, height: 555, ratioTolerance: 0.02 };
const HERO_MOBILE = {
  width: 1200, height: 600, ratioTolerance: null, minWidth: 640,
  note: 'Phones (below 640px wide): the banner box is about 260–400px tall and the image is cropped from its centre (cover). Optional: without a mobile image the desktop image is cropped.',
};
const BANNER_SLOTS = {
  'home.hero': {
    page: 'Home', section: 'Top banner (hero)', defaultImage: '/images/bg/home_hero_final.png',
    desktop: { ...PANORAMA, fit: 'stretch', note: 'Shown at 1920:555 on every screen size; the image is fitted to that box exactly (heading text is drawn over the centre).' },
    mobile: null,
    text: [{ key: 'title', label: 'Heading' }, { key: 'subtitle', label: 'Sub-heading' }],
  },
  'search.hero': {
    page: 'Manuscript Search', section: 'Top banner (hero)', defaultImage: '/images/bg/search-hero-panoramic.png',
    desktop: { ...PANORAMA, fit: 'stretch', note: 'Tablets and desktops (640px and wider): shown at 1920:555, fitted to that box exactly.' },
    mobile: HERO_MOBILE,
    text: [{ key: 'title', label: 'Heading' }],
  },
  'ebooks.hero': {
    page: 'E-Books', section: 'Top banner (hero)', defaultImage: '/images/bg/ebooks-panoramic-clean.jpg',
    desktop: { ...PANORAMA, fit: 'stretch', note: 'Tablets and desktops (640px and wider): shown at 1920:555, fitted to that box exactly.' },
    mobile: HERO_MOBILE,
    text: [{ key: 'label', label: 'Small label above the heading' }, { key: 'title', label: 'Heading' }],
  },
  'contact.hero': {
    page: 'Contact', section: 'Top banner (hero)', defaultImage: '/images/bg/Contact.png',
    desktop: { ...PANORAMA, fit: 'stretch', note: 'Tablets and desktops (640px and wider): shown at 1920:555, fitted to that box exactly, with a dark gradient over it for the text.' },
    mobile: { ...HERO_MOBILE, note: 'Phones (below 640px wide): the banner box is 320–480px tall and the image is cropped around 42% from the top (cover). Optional.' },
    text: [{ key: 'label', label: 'Small label above the heading' }, { key: 'title', label: 'Heading' }],
  },
};
// E-book category banners (the book pages /ebooks/:id)
const CATEGORY_BANNERS = [
  ['9', 'தொல்காப்பியம்', '/images/bg/hero_ebook_9_panoramic_fit1920.png'],
  ['13', 'பத்துப்பாட்டு', '/images/bg/hero_ebook_13_panoramic_fit1920.png'],
  ['11', 'பதினெண் கீழ்க்கணக்கு', '/images/bg/hero_ebook_11_panoramic_fit1920.png'],
  ['15', 'இறையனார் அகப்பொருள்', '/images/bg/hero_ebook_15_panoramic_fit1920.png'],
  ['16', 'சிலப்பதிகாரம்', '/images/bg/hero_ebook_16_panoramic_fit1920.png'],
  ['17', 'மணிமேகலை', '/images/bg/hero_ebook_17_panoramic_fit1920.png'],
  ['12', 'முத்தொள்ளாயிரம்', '/images/bg/hero_panoramic_12_fit1920.png'],
];
for (const [id, name, img] of CATEGORY_BANNERS) {
  BANNER_SLOTS[`ebook.${id}`] = {
    page: `E-Book page: ${name} (/ebooks/${id})`, section: 'Category banner', defaultImage: img,
    desktop: { ...PANORAMA, fit: 'cover', note: 'Shown at 1920:555 on every screen size, filling the box (object-fit: cover).' },
    mobile: null,
    text: [{ key: 'alt', label: 'Image description (for screen readers)' }],
  };
}
BANNER_SLOTS['ebook.10'] = {
  page: 'E-Book page: எட்டுத்தொகை (/ebooks/10)', section: 'Category banner', defaultImage: '/hero_ebook_10.jpg',
  desktop: { width: 1920, height: 555, ratioTolerance: null, minWidth: 800, fit: 'contain', note: 'Shown whole (object-fit: contain) inside a 1920:555 box with padding and a dark background, so any proportion fits without cropping.' },
  mobile: null,
  text: [{ key: 'alt', label: 'Image description (for screen readers)' }],
};

// ── Limits ───────────────────────────────────────────────────────────────────
const KEY = /^[a-z0-9][a-z0-9._-]{0,79}$/;
const MAX_FIELD = 4000;          // characters in a plain-text field
const MAX_TITLE = 600;
const MAX_BODY = 300 * 1024;     // characters of HTML per language per section
const MAX_ROWS = 500;
const MAX_FIELDS = 60;
const MAX_BANNER_BYTES = 15 * 1024 * 1024;
const BANNER_FILE = /^banner_[a-z0-9._-]+_\d+_[a-f0-9]{8}\.(jpg|png|webp)$/;

// ── Text sanitising ──────────────────────────────────────────────────────────
const plain = (v, max) => String(v ?? '').replace(/<[^>]*>/g, '').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').slice(0, max);

const ALLOWED_TAGS = new Set(['p', 'br', 'strong', 'b', 'em', 'i', 'u', 's', 'small', 'ul', 'ol', 'li', 'a', 'h3', 'h4', 'blockquote', 'table', 'thead', 'tbody', 'tr', 'th', 'td']);
const DROP_WITH_CONTENT = new Set(['script', 'style', 'iframe', 'object', 'embed', 'noscript', 'template', 'svg', 'math', 'head', 'title', 'meta', 'link', 'form', 'textarea', 'select', 'button', 'input']);
const SAFE_HREF = /^(https?:\/\/|mailto:|tel:|\/(?!\/)|#)/i;

function sanitizeHtml(html) {
  const $ = cheerio.load(String(html ?? ''), null, false);
  const walk = (nodes) => {
    nodes.each((_, el) => {
      if (el.type === 'comment' || el.type === 'directive' || el.type === 'cdata') { $(el).remove(); return; }
      if (el.type !== 'tag' && el.type !== 'script' && el.type !== 'style') return; // text
      const tag = (el.name || '').toLowerCase();
      if (DROP_WITH_CONTENT.has(tag) || el.type === 'script' || el.type === 'style') { $(el).remove(); return; }
      walk($(el).contents());
      if (!ALLOWED_TAGS.has(tag)) { $(el).replaceWith($(el).contents()); return; }
      const attrs = { ...el.attribs };
      for (const name of Object.keys(attrs)) $(el).removeAttr(name);
      if (tag === 'a') {
        const href = String(attrs.href || '').trim();
        if (SAFE_HREF.test(href)) $(el).attr('href', href);
        if (attrs.target === '_blank') $(el).attr('target', '_blank').attr('rel', 'noopener noreferrer');
      }
      if (tag === 'ol' && /^\d{1,4}$/.test(attrs.start || '')) $(el).attr('start', attrs.start);
    });
  };
  walk($.root().contents());
  return $.html().trim();
}

// ── Values ───────────────────────────────────────────────────────────────────
const KINDS = new Set(['section', 'fields', 'list']);
function cleanSection(v) {
  if (!v || typeof v !== 'object') throw bad('Invalid section');
  const bt = String(v.body_ta ?? ''), be = String(v.body_en ?? '');
  if (bt.length > MAX_BODY || be.length > MAX_BODY) throw bad('The text is too long');
  return { title_ta: plain(v.title_ta, MAX_TITLE), title_en: plain(v.title_en, MAX_TITLE), body_ta: sanitizeHtml(bt), body_en: sanitizeHtml(be) };
}
function cleanFields(v) {
  if (!v || typeof v !== 'object' || !v.values || typeof v.values !== 'object') throw bad('Invalid fields');
  const names = Object.keys(v.values);
  if (names.length > MAX_FIELDS) throw bad('Too many fields');
  const values = {};
  for (const n of names) {
    if (!KEY.test(n)) throw bad('Invalid field name');
    values[n] = { ta: plain(v.values[n]?.ta, MAX_FIELD), en: plain(v.values[n]?.en, MAX_FIELD) };
  }
  return { values };
}
const ROW_TYPES = new Set(['heading', 'subheading', 'item', 'gap']);
function cleanList(v) {
  if (!v || typeof v !== 'object' || !Array.isArray(v.rows)) throw bad('Invalid list');
  if (v.rows.length > MAX_ROWS) throw bad(`At most ${MAX_ROWS} rows`);
  return {
    title_ta: plain(v.title_ta, MAX_TITLE), title_en: plain(v.title_en, MAX_TITLE),
    rows: v.rows.map((r) => {
      const type = ROW_TYPES.has(r?.type) ? r.type : 'item';
      return type === 'gap' ? { type } : { type, ta: plain(r.ta, MAX_TITLE), en: plain(r.en, MAX_TITLE) };
    }),
  };
}
const CLEAN = { section: cleanSection, fields: cleanFields, list: cleanList };
function cleanBannerText(slot, v) {
  const out = {};
  for (const t of BANNER_SLOTS[slot].text) {
    out[`${t.key}_ta`] = plain(v?.[`${t.key}_ta`], MAX_FIELD);
    out[`${t.key}_en`] = plain(v?.[`${t.key}_en`], MAX_FIELD);
  }
  return out;
}
const bad = (message) => Object.assign(new Error(message), { status: 400, expose: true });

// ── Image size from the file header (JPEG, PNG, WebP) ────────────────────────
function imageSize(buf) {
  if (buf.length >= 24 && buf[0] === 0x89 && buf.toString('latin1', 1, 4) === 'PNG') {
    return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
  }
  if (buf.length >= 30 && buf.toString('latin1', 0, 4) === 'RIFF' && buf.toString('latin1', 8, 12) === 'WEBP') {
    const kind = buf.toString('latin1', 12, 16);
    if (kind === 'VP8X') return { width: 1 + buf.readUIntLE(24, 3), height: 1 + buf.readUIntLE(27, 3) };
    if (kind === 'VP8L') { const b = buf.readUInt32LE(21); return { width: (b & 0x3FFF) + 1, height: ((b >> 14) & 0x3FFF) + 1 }; }
    if (kind === 'VP8 ') return { width: buf.readUInt16LE(26) & 0x3FFF, height: buf.readUInt16LE(28) & 0x3FFF };
  }
  if (buf[0] === 0xFF && buf[1] === 0xD8) {
    let i = 2;
    while (i + 9 < buf.length) {
      if (buf[i] !== 0xFF) { i++; continue; }
      const marker = buf[i + 1];
      if (marker === 0xD8 || marker === 0x01 || (marker >= 0xD0 && marker <= 0xD7)) { i += 2; continue; }
      const len = buf.readUInt16BE(i + 2);
      if (marker >= 0xC0 && marker <= 0xCF && marker !== 0xC4 && marker !== 0xC8 && marker !== 0xCC) {
        return { width: buf.readUInt16BE(i + 7), height: buf.readUInt16BE(i + 5) };
      }
      i += 2 + len;
    }
  }
  return null;
}

// Check an image against a placement's size rules. Returns { error } or { warning? }.
function checkBannerSize(spec, size) {
  if (!size || !size.width || !size.height) return { error: 'Could not read the image size' };
  const { width, height } = size;
  if (spec.ratioTolerance != null) {
    const want = spec.width / spec.height, got = width / height;
    if (Math.abs(got - want) / want > spec.ratioTolerance) {
      return { error: `This placement needs an image of ${spec.width} × ${spec.height} pixels (proportion ${(want).toFixed(2)}:1). The uploaded image is ${width} × ${height} (${got.toFixed(2)}:1), which would be distorted or cropped. Please resize or crop it to ${spec.width} × ${spec.height}.` };
    }
  }
  const minWidth = spec.minWidth || Math.round(spec.width * 0.6);
  if (width < minWidth) return { error: `The image is only ${width} pixels wide; at least ${minWidth} are needed (recommended ${spec.width} × ${spec.height}).` };
  if (width < spec.width) return { warning: `The image is ${width} × ${height}; ${spec.width} × ${spec.height} is recommended, so it may look slightly soft on large screens.` };
  return {};
}

// ─────────────────────────────────────────────────────────────────────────────
module.exports = function registerSiteContent(app, { db, STORAGE_PATH, sniffFile, jwt, JWT_SECRET, multer }) {
  const BANNER_DIR = path.join(STORAGE_PATH, 'site-banners');
  const bannerUrl = (file) => `/api/site-banners/file/${file}`;

  const ready = (async () => {
    await db.query(`CREATE TABLE IF NOT EXISTS site_content (
      page_key TEXT NOT NULL,
      item_key TEXT NOT NULL,
      kind TEXT NOT NULL,
      draft JSONB,
      published JSONB,
      draft_updated_at TIMESTAMPTZ,
      published_at TIMESTAMPTZ,
      updated_by TEXT,
      PRIMARY KEY (page_key, item_key)
    )`);
    await db.query(`CREATE TABLE IF NOT EXISTS site_banners (
      slot_key TEXT PRIMARY KEY,
      draft JSONB,
      published JSONB,
      draft_updated_at TIMESTAMPTZ,
      published_at TIMESTAMPTZ,
      updated_by TEXT
    )`);
  })().catch((e) => console.error('Site content tables:', e.message));

  const who = (req) => (req.user && req.user.username) || 'admin';
  const noStore = (res) => res.set('Cache-Control', 'no-store, max-age=0');
  const route = (fn) => async (req, res) => {
    try { await ready; await fn(req, res); } catch (e) {
      const status = e.status || 500;
      if (status >= 500) console.error('Site content:', e.message);
      res.status(status).json({ error: status >= 500 ? 'Could not complete the request' : e.message });
    }
  };
  const checkKeys = (...keys) => { for (const k of keys) if (!KEY.test(String(k || ''))) throw bad('Invalid key'); };

  // Published (or, for a preview, draft-over-published) values of every page and banner
  async function snapshot(useDraft) {
    const [c, b] = await Promise.all([
      db.query('SELECT page_key, item_key, draft, published FROM site_content'),
      db.query('SELECT slot_key, draft, published FROM site_banners'),
    ]);
    const pick = (row) => {
      if (useDraft && row.draft) return row.draft.reset ? null : row.draft;
      return row.published;
    };
    const content = {};
    for (const r of c.rows) {
      const v = pick(r);
      if (v == null) continue;
      (content[r.page_key] = content[r.page_key] || {})[r.item_key] = v;
    }
    const banners = {};
    for (const r of b.rows) {
      const v = pick(r);
      if (v != null && BANNER_SLOTS[r.slot_key]) banners[r.slot_key] = v;
    }
    return { content, banners };
  }

  // ── Public ─────────────────────────────────────────────────────────────────
  app.get('/api/site-content', route(async (req, res) => {
    noStore(res);
    res.json(await snapshot(false));
  }));

  // Draft preview for the admin: a short-lived token that can only read drafts
  app.get('/api/site-content/preview', route(async (req, res) => {
    noStore(res);
    const token = String(req.get('Authorization') || '').replace(/^Bearer\s+/i, '');
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      if (decoded.scope !== 'site-preview' && !decoded.username) throw new Error('scope');
    } catch { return res.status(401).json({ error: 'The preview link has expired. Open the preview again from the admin panel.' }); }
    res.json(await snapshot(true));
  }));

  // Uploaded banner images. Names are unique per upload and never reused, so they can be
  // cached for a long time without ever showing an old banner.
  app.get('/api/site-banners/file/:name', route(async (req, res) => {
    const name = String(req.params.name || '');
    if (!BANNER_FILE.test(name)) return res.status(404).end();
    const file = path.join(BANNER_DIR, name);
    if (!fs.existsSync(file)) return res.status(404).end();
    res.set('Cache-Control', 'public, max-age=31536000, immutable');
    res.set('X-Content-Type-Options', 'nosniff');
    res.sendFile(file);
  }));

  // ── Admin: page content ────────────────────────────────────────────────────
  app.get('/api/admin/site-content/status', route(async (req, res) => {
    noStore(res);
    const { rows } = await db.query(`SELECT page_key, count(*) FILTER (WHERE draft IS NOT NULL)::int AS pending,
      count(*) FILTER (WHERE published IS NOT NULL)::int AS customised, max(published_at) AS published_at
      FROM site_content GROUP BY page_key`);
    const banners = await db.query(`SELECT slot_key, draft IS NOT NULL AS pending, published IS NOT NULL AS customised FROM site_banners`);
    res.json({ pages: rows, banners: banners.rows });
  }));

  app.get('/api/admin/site-content/:page', route(async (req, res) => {
    noStore(res);
    checkKeys(req.params.page);
    const { rows } = await db.query(
      'SELECT item_key, kind, draft, published, draft_updated_at, published_at, updated_by FROM site_content WHERE page_key = $1',
      [req.params.page]);
    res.json(rows);
  }));

  // Save the draft of one item
  app.put('/api/admin/site-content/:page/:item', route(async (req, res) => {
    const { page, item } = req.params;
    checkKeys(page, item);
    const kind = req.body?.kind;
    if (!KINDS.has(kind)) throw bad('Unknown kind');
    const draft = req.body?.reset ? { reset: true } : CLEAN[kind](req.body?.value);
    const { rows } = await db.query(`INSERT INTO site_content (page_key, item_key, kind, draft, draft_updated_at, updated_by)
      VALUES ($1, $2, $3, $4, NOW(), $5)
      ON CONFLICT (page_key, item_key) DO UPDATE SET draft = EXCLUDED.draft, kind = EXCLUDED.kind,
        draft_updated_at = NOW(), updated_by = EXCLUDED.updated_by
      RETURNING item_key, kind, draft, published, draft_updated_at, published_at, updated_by`,
      [page, item, kind, JSON.stringify(draft), who(req)]);
    res.json(rows[0]);
  }));

  // Publish every draft of a page. One UPDATE statement, so all items of the page change
  // together (atomic); rows left with nothing in them are then removed.
  app.post('/api/admin/site-content/:page/publish', route(async (req, res) => {
    checkKeys(req.params.page);
    const r = await db.query(`UPDATE site_content SET
        published = CASE WHEN draft ? 'reset' THEN NULL ELSE draft END,
        published_at = NOW(), draft = NULL, updated_by = $2
      WHERE page_key = $1 AND draft IS NOT NULL`, [req.params.page, who(req)]);
    await db.query('DELETE FROM site_content WHERE page_key = $1 AND draft IS NULL AND published IS NULL', [req.params.page]);
    res.json({ published: r.rowCount });
  }));

  // Throw away the drafts of a page (or of one item)
  app.post('/api/admin/site-content/:page/discard', route(async (req, res) => {
    checkKeys(req.params.page);
    const item = req.body?.item;
    if (item) checkKeys(item);
    const r = await db.query(`UPDATE site_content SET draft = NULL, draft_updated_at = NOW()
      WHERE page_key = $1 AND draft IS NOT NULL ${item ? 'AND item_key = $2' : ''}`, item ? [req.params.page, item] : [req.params.page]);
    await db.query('DELETE FROM site_content WHERE page_key = $1 AND draft IS NULL AND published IS NULL', [req.params.page]);
    res.json({ discarded: r.rowCount });
  }));

  app.post('/api/admin/site-content-preview-token', route(async (req, res) => {
    res.json({ token: jwt.sign({ scope: 'site-preview' }, JWT_SECRET, { expiresIn: '1h' }) });
  }));

  // ── Admin: banners ─────────────────────────────────────────────────────────
  app.get('/api/admin/site-banners', route(async (req, res) => {
    noStore(res);
    const { rows } = await db.query('SELECT slot_key, draft, published, draft_updated_at, published_at, updated_by FROM site_banners');
    const bySlot = Object.fromEntries(rows.map((r) => [r.slot_key, r]));
    res.json(Object.entries(BANNER_SLOTS).map(([key, spec]) => ({ key, ...spec, row: bySlot[key] || null })));
  }));

  // Current working copy of a banner: draft, else published, else the built-in banner
  const working = (row) => (row && row.draft && !row.draft.reset ? row.draft : row && row.draft && row.draft.reset ? {} : (row && row.published) || {});
  async function saveBannerDraft(slot, draft, user) {
    const { rows } = await db.query(`INSERT INTO site_banners (slot_key, draft, draft_updated_at, updated_by) VALUES ($1, $2, NOW(), $3)
      ON CONFLICT (slot_key) DO UPDATE SET draft = EXCLUDED.draft, draft_updated_at = NOW(), updated_by = EXCLUDED.updated_by
      RETURNING slot_key, draft, published, draft_updated_at, published_at, updated_by`, [slot, JSON.stringify(draft), user]);
    return rows[0];
  }
  const slotOf = (req) => {
    const slot = String(req.params.slot || '');
    if (!BANNER_SLOTS[slot]) throw Object.assign(new Error('Unknown banner placement'), { status: 404, expose: true });
    return slot;
  };

  // Text of a banner (heading, description…)
  app.put('/api/admin/site-banners/:slot', route(async (req, res) => {
    const slot = slotOf(req);
    const { rows } = await db.query('SELECT draft, published FROM site_banners WHERE slot_key = $1', [slot]);
    const draft = { ...working(rows[0]), ...cleanBannerText(slot, req.body || {}) };
    res.json(await saveBannerDraft(slot, draft, who(req)));
  }));

  // Upload a new image (desktop or mobile) into the draft
  const upload = multer({
    storage: multer.diskStorage({
      destination: (req, file, cb) => fs.mkdir(BANNER_DIR, { recursive: true }, (err) => cb(err, BANNER_DIR)),
      filename: (req, file, cb) => cb(null, `incoming_${Date.now()}_${crypto.randomBytes(4).toString('hex')}.tmp`),
    }),
    limits: { fileSize: MAX_BANNER_BYTES, files: 1 },
    fileFilter: (req, file, cb) => (/\.(jpe?g|png|webp)$/i.test(file.originalname)
      ? cb(null, true) : cb(bad('Banners must be JPEG, PNG or WebP images'))),
  }).single('image');

  app.post('/api/admin/site-banners/:slot/image', (req, res, next) => upload(req, res, (err) => {
    if (!err) return next();
    const message = err.code === 'LIMIT_FILE_SIZE' ? `Banner images can be at most ${MAX_BANNER_BYTES / 1024 / 1024} MB` : err.message;
    res.status(400).json({ error: message });
  }), route(async (req, res) => {
    const tmp = req.file && req.file.path;
    try {
      const slot = slotOf(req);
      if (!tmp) throw bad('Choose an image file');
      const variant = req.body?.variant === 'mobile' ? 'mobile' : 'desktop';
      const spec = BANNER_SLOTS[slot][variant];
      if (!spec) throw bad('This placement has no mobile image');
      const type = await sniffFile(tmp);
      const ext = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }[type];
      if (!ext) throw bad('The file is not a JPEG, PNG or WebP image');
      const head = Buffer.alloc(256 * 1024);
      const fh = await fs.promises.open(tmp, 'r');
      let n; try { ({ bytesRead: n } = await fh.read(head, 0, head.length, 0)); } finally { await fh.close(); }
      const size = imageSize(head.subarray(0, n));
      const check = checkBannerSize(spec, size);
      if (check.error) throw bad(check.error);
      const name = `banner_${slot}_${variant}_${Date.now()}_${crypto.randomBytes(4).toString('hex')}.${ext}`;
      await fs.promises.rename(tmp, path.join(BANNER_DIR, name));
      const { rows } = await db.query('SELECT draft, published FROM site_banners WHERE slot_key = $1', [slot]);
      const draft = { ...working(rows[0]) };
      if (variant === 'mobile') Object.assign(draft, { image_mobile: bannerUrl(name), image_mobile_width: size.width, image_mobile_height: size.height });
      else Object.assign(draft, { image: bannerUrl(name), image_width: size.width, image_height: size.height });
      const row = await saveBannerDraft(slot, draft, who(req));
      res.json({ ...row, warning: check.warning || null });
    } catch (e) {
      if (tmp) fs.promises.unlink(tmp).catch(() => {});
      throw e;
    }
  }));

  // Remove the uploaded mobile image from the draft (phones then crop the desktop image)
  app.post('/api/admin/site-banners/:slot/remove-mobile', route(async (req, res) => {
    const slot = slotOf(req);
    const { rows } = await db.query('SELECT draft, published FROM site_banners WHERE slot_key = $1', [slot]);
    const draft = { ...working(rows[0]) };
    delete draft.image_mobile; delete draft.image_mobile_width; delete draft.image_mobile_height;
    res.json(await saveBannerDraft(slot, draft, who(req)));
  }));

  // Back to the built-in banner (takes effect when published)
  app.post('/api/admin/site-banners/:slot/reset', route(async (req, res) => {
    const slot = slotOf(req);
    res.json(await saveBannerDraft(slot, { reset: true }, who(req)));
  }));

  app.post('/api/admin/site-banners/:slot/publish', route(async (req, res) => {
    const slot = slotOf(req);
    const { rows } = await db.query(`UPDATE site_banners SET published = CASE WHEN draft ? 'reset' THEN NULL ELSE draft END,
      published_at = NOW(), draft = NULL, updated_by = $2 WHERE slot_key = $1 AND draft IS NOT NULL
      RETURNING slot_key, draft, published, draft_updated_at, published_at, updated_by`, [slot, who(req)]);
    await db.query('DELETE FROM site_banners WHERE slot_key = $1 AND draft IS NULL AND published IS NULL', [slot]);
    cleanupBannerFiles();
    res.json(rows[0] || null);
  }));

  app.post('/api/admin/site-banners/:slot/discard', route(async (req, res) => {
    const slot = slotOf(req);
    await db.query('UPDATE site_banners SET draft = NULL, draft_updated_at = NOW() WHERE slot_key = $1', [slot]);
    await db.query('DELETE FROM site_banners WHERE slot_key = $1 AND draft IS NULL AND published IS NULL', [slot]);
    cleanupBannerFiles();
    res.json({ ok: true });
  }));

  // Delete uploaded banner files no draft or published banner uses any more. Only files
  // this module created (banner_… names) in its own folder are ever touched.
  async function cleanupBannerFiles() {
    try {
      const { rows } = await db.query('SELECT draft, published FROM site_banners');
      const used = new Set();
      for (const r of rows) for (const v of [r.draft, r.published]) {
        if (!v) continue;
        for (const k of ['image', 'image_mobile']) if (v[k]) used.add(path.basename(v[k]));
      }
      const files = await fs.promises.readdir(BANNER_DIR).catch(() => []);
      const hourAgo = Date.now() - 3600 * 1000;
      for (const f of files) {
        if (BANNER_FILE.test(f) && !used.has(f)) await fs.promises.unlink(path.join(BANNER_DIR, f)).catch(() => {});
        // Uploads interrupted before they were checked
        if (/^incoming_\d+_[a-f0-9]{8}\.tmp$/.test(f)) {
          const st = await fs.promises.stat(path.join(BANNER_DIR, f)).catch(() => null);
          if (st && st.mtimeMs < hourAgo) await fs.promises.unlink(path.join(BANNER_DIR, f)).catch(() => {});
        }
      }
    } catch (e) { console.error('Banner cleanup:', e.message); }
  }
};

module.exports.sanitizeHtml = sanitizeHtml;
module.exports.imageSize = imageSize;
module.exports.checkBannerSize = checkBannerSize;
module.exports.BANNER_SLOTS = BANNER_SLOTS;
