const Database = require('better-sqlite3');
const db = new Database('./db/suvadi.sqlite');

// Get columns for each key table
['sv_book', 'sv_ebook_editions', 'sv_main_category', 'sv_sub_category', 'ebooks'].forEach(t => {
  try {
    const cols = db.prepare(`PRAGMA table_info(${t})`).all();
    console.log(`\n=== ${t} columns ===`);
    cols.forEach(c => console.log(`  ${c.cid}: ${c.name} (${c.type})`));
    const count = db.prepare(`SELECT COUNT(*) as n FROM ${t}`).get();
    console.log(`  => ${count.n} rows`);
  } catch(e) { console.log(`  ERROR: ${e.message}`); }
});

// Show sv_book rows
try {
  const cols = db.prepare('PRAGMA table_info(sv_book)').all().map(c => c.name);
  console.log('\n=== sv_book rows ===');
  const rows = db.prepare('SELECT * FROM sv_book').all();
  rows.forEach(r => console.log(' ', JSON.stringify(r)));
} catch(e) { console.log('sv_book error:', e.message); }

// Show ebooks rows
try {
  console.log('\n=== ebooks rows (first 5) ===');
  const rows = db.prepare('SELECT * FROM ebooks LIMIT 5').all();
  rows.forEach(r => console.log(' ', JSON.stringify(r)));
} catch(e) { console.log('ebooks error:', e.message); }

// Count sv_ebook_editions
try {
  console.log('\n=== sv_ebook_editions per book ===');
  const rows = db.prepare('SELECT book_id, COUNT(*) cnt, SUM(CASE WHEN image_folder IS NOT NULL THEN 1 ELSE 0 END) img FROM sv_ebook_editions GROUP BY book_id').all();
  rows.forEach(r => console.log(' ', JSON.stringify(r)));
} catch(e) { console.log('sv_ebook_editions error:', e.message); }

db.close();
