// Read-only report: uploaded files and database references that do not match.
//
//   node scripts/maintenance/find-orphan-files.js            (from backend/)
//
// Lists
//   • records whose scan / PDF file is missing          (shown as missing on the site)
//   • scan / PDF files no record refers to              (left by deleted records; safe to
//                                                         archive after checking)
//   • unfinished uploads (upload_*.tmp)                 (left only if the app stopped mid-upload)
// Uses SONGS_PATH / STORAGE_PATH and the database settings from backend/.env, like the
// application. It never deletes, moves or changes anything; the database session is
// read-only.
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env'), quiet: true });
const { Client } = require('pg');

const SONGS_PATH = process.env.SONGS_PATH || path.join(__dirname, '..', '..', '..', 'songs');
const STORAGE_PATH = process.env.STORAGE_PATH || path.join(__dirname, '..', '..', '..', 'storage');
const PDF_DIR = path.join(STORAGE_PATH, 'pdfs');
const LIST_MAX = 50;

const show = (title, items) => {
  console.log(`\n${title}: ${items.length}`);
  items.slice(0, LIST_MAX).forEach(i => console.log('   ' + i));
  if (items.length > LIST_MAX) console.log(`   … and ${items.length - LIST_MAX} more`);
};

(async () => {
  const c = new Client({
    host: process.env.DB_HOST, port: process.env.DB_PORT, user: process.env.DB_USER,
    password: process.env.DB_PASSWORD, database: process.env.DB_NAME,
    application_name: 'suvadi-orphan-report', connectionTimeoutMillis: 15000,
  });
  await c.connect();
  try {
    await c.query('SET SESSION CHARACTERISTICS AS TRANSACTION READ ONLY');
    const songs = (await c.query("SELECT id, cid, filename FROM sv_songs WHERE COALESCE(filename, '') <> ''")).rows;
    const editions = (await c.query("SELECT id, local_pdf_url FROM sv_ebook_editions WHERE COALESCE(local_pdf_url, '') <> ''")).rows;

    // ── Manuscript scans ──
    const referenced = new Set(songs.map(s => `${s.cid}/${s.filename}`));
    const onDisk = new Set();
    const tmpFiles = [];
    if (!fs.existsSync(SONGS_PATH)) console.log(`Scans folder not reachable: ${SONGS_PATH}`);
    else for (const dir of fs.readdirSync(SONGS_PATH)) {
      const dirPath = path.join(SONGS_PATH, dir);
      if (!fs.statSync(dirPath).isDirectory()) continue;
      for (const f of fs.readdirSync(dirPath)) {
        if (/^upload_\d+_[a-z0-9]+\.tmp$/.test(f)) tmpFiles.push(path.join(dirPath, f));
        else onDisk.add(`${dir}/${f}`);
      }
    }
    const missingScans = [...referenced].filter(k => !onDisk.has(k));
    const unusedScans = [...onDisk].filter(k => !referenced.has(k));
    console.log(`Scan records: ${songs.length} (files referenced: ${referenced.size}); files in ${SONGS_PATH}: ${onDisk.size}`);
    show('Scan files referenced by a record but missing on disk', missingScans);
    show('Scan files on disk that no record refers to', unusedScans);

    // ── Edition PDFs ──
    const pdfRefs = new Map(editions.map(e => [path.basename(e.local_pdf_url), e.id]));
    const pdfFiles = fs.existsSync(PDF_DIR) ? fs.readdirSync(PDF_DIR) : [];
    if (!fs.existsSync(PDF_DIR)) console.log(`\nPDF folder not reachable: ${PDF_DIR}`);
    for (const f of pdfFiles) if (/^upload_\d+_[a-z0-9]+\.tmp$/.test(f)) tmpFiles.push(path.join(PDF_DIR, f));
    const pdfSet = new Set(pdfFiles);
    show('\nEdition PDFs referenced but missing', [...pdfRefs].filter(([f]) => !pdfSet.has(f)).map(([f, id]) => `edition ${id}: ${f}`));
    show('PDF files that no edition refers to', pdfFiles.filter(f => /\.pdf$/i.test(f) && !pdfRefs.has(f)));
    show('Unfinished uploads (upload_*.tmp)', tmpFiles);
  } finally {
    await c.end();
  }
})().catch(e => { console.error('Report failed:', e.code || '', e.message); process.exit(1); });
