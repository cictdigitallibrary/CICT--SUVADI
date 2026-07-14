const { Pool } = require('pg');
require('dotenv').config();
const pool = new Pool({ host: process.env.DB_HOST, port: process.env.DB_PORT, database: process.env.DB_NAME, user: process.env.DB_USER, password: process.env.DB_PASSWORD });

async function run() {
  const r = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'sv_ebook_editions' ORDER BY ordinal_position");
  console.log('COLUMNS:');
  r.rows.forEach(c => console.log(' ', c.column_name, '-', c.data_type));

  const r2 = await pool.query("SELECT id, title_tamil, image_folder, total_pages, pdf_url FROM sv_ebook_editions WHERE image_folder IS NOT NULL AND image_folder != '' ORDER BY id");
  console.log('\nEDITIONS WITH image_folder (' + r2.rows.length + '):');
  r2.rows.forEach(e => console.log('  [' + e.id + '] ' + e.image_folder + ' pages=' + e.total_pages));
  
  await pool.end();
}
run().catch(e => { console.error(e.message); process.exit(1); });
