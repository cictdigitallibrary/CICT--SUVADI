const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host:     process.env.DB_HOST,
  port:     parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME,
  user:     process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

async function main() {
  console.log('==========================================================');
  console.log(' SUVADI Database Migration: Local Storage Redesign');
  console.log('==========================================================\n');

  try {
    // 1. Create a backup table
    const backupName = `sv_ebook_editions_backup_${Date.now()}`;
    await pool.query(`CREATE TABLE ${backupName} AS SELECT * FROM sv_ebook_editions`);
    console.log(`✅ Backup created: ${backupName}`);

    // 2. Add original_source_url column if it doesn't exist
    await pool.query('ALTER TABLE sv_ebook_editions ADD COLUMN IF NOT EXISTS original_source_url TEXT');
    console.log(`✅ Added column original_source_url`);

    // 3. Move existing CICT URLs to the new column
    const res1 = await pool.query(
      `UPDATE sv_ebook_editions 
       SET original_source_url = pdf_url 
       WHERE pdf_url LIKE 'http%' AND original_source_url IS NULL`
    );
    console.log(`✅ Archived CICT URLs to original_source_url (${res1.rowCount} rows)`);

    // 4. Update pdf_url to use local paths
    const res2 = await pool.query(
      `UPDATE sv_ebook_editions 
       SET pdf_url = local_pdf_url 
       WHERE local_pdf_url IS NOT NULL AND (pdf_url LIKE 'http%' OR pdf_url IS NULL)`
    );
    console.log(`✅ Updated pdf_url to local path (${res2.rowCount} rows)`);

    // 5. Verification
    const { rows: remaining } = await pool.query(`SELECT id FROM sv_ebook_editions WHERE pdf_url LIKE 'http%'`);
    if (remaining.length > 0) {
      console.log(`⚠️ Warning: ${remaining.length} editions still have HTTP URLs in pdf_url`);
    } else {
      console.log(`✅ No HTTP URLs remain in pdf_url column`);
    }

    console.log('\n✅ Migration complete!');
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
  } finally {
    await pool.end();
  }
}

main();
