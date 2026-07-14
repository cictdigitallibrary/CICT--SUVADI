/**
 * patch-index.js
 * Applies two targeted patches to backend/index.js:
 * 1. Expand editions API SELECT to include image_folder, total_pages etc.
 * 2. Add idempotent ALTER TABLE migrations inside ensureTables()
 */
const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'index.js');
let src = fs.readFileSync(filePath, 'utf8');

// ── Patch 1: expand editions SELECT ───────────────────────────────────────────
const OLD_SELECT = '`SELECT e.id, e.title_tamil, e.pdf_url, e.local_pdf_url\r\n       FROM sv_ebook_editions e\r\n       WHERE e.book_id = $1 AND e.status = 1\r\n       ORDER BY e.id ASC`';
const NEW_SELECT = '`SELECT e.id, e.title_tamil, e.title_english, e.pdf_url, e.local_pdf_url,\r\n              e.image_folder, e.total_pages, e.editor, e.publisher, e.year_published\r\n       FROM sv_ebook_editions e\r\n       WHERE e.book_id = $1 AND e.status = 1\r\n       ORDER BY e.id ASC`';

if (src.includes(OLD_SELECT)) {
  src = src.replace(OLD_SELECT, NEW_SELECT);
  console.log('✅ Patch 1 applied: editions SELECT expanded');
} else {
  console.log('ℹ️  Patch 1: old SELECT not found — may already be patched');
}

// ── Patch 2: add column migrations inside ensureTables ────────────────────────
const OLD_LOG = "  console.log('\u2705 Support tables verified');\r\n}\r\nensureTables();";
const NEW_LOG = `
  // ── Migrate sv_ebook_editions: add columns missing from older deployments ──
  // Safe to run every startup (IF NOT EXISTS is idempotent in PostgreSQL 9.6+)
  const editionColumns = [
    \`ALTER TABLE sv_ebook_editions ADD COLUMN IF NOT EXISTS image_folder    TEXT\`,
    \`ALTER TABLE sv_ebook_editions ADD COLUMN IF NOT EXISTS total_pages     INTEGER\`,
    \`ALTER TABLE sv_ebook_editions ADD COLUMN IF NOT EXISTS title_english   TEXT\`,
    \`ALTER TABLE sv_ebook_editions ADD COLUMN IF NOT EXISTS editor          TEXT\`,
    \`ALTER TABLE sv_ebook_editions ADD COLUMN IF NOT EXISTS publisher       TEXT\`,
    \`ALTER TABLE sv_ebook_editions ADD COLUMN IF NOT EXISTS year_published  INTEGER\`,
  ];
  for (const q of editionColumns) {
    await pool.query(q).catch(e => console.error('Edition column migration:', e.message));
  }

  console.log('\u2705 Support tables verified');
}
ensureTables();`;

if (src.includes(OLD_LOG)) {
  src = src.replace(OLD_LOG, NEW_LOG);
  console.log('✅ Patch 2 applied: column migrations added to ensureTables()');
} else {
  console.log('ℹ️  Patch 2: marker not found — may already be patched or marker differs');
  // Fallback: try to find it without CRLF
  const OLD_LOG2 = "  console.log('✅ Support tables verified');\n}\nensureTables();";
  if (src.includes(OLD_LOG2)) {
    src = src.replace(OLD_LOG2, NEW_LOG.replace(/\r\n/g, '\n'));
    console.log('✅ Patch 2 applied (LF variant)');
  }
}

fs.writeFileSync(filePath, src, 'utf8');
console.log('Done. File written.');
