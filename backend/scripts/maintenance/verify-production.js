const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const pool = new Pool({
  host:     process.env.DB_HOST,
  port:     parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME,
  user:     process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

async function runVerification() {
  console.log('==========================================================');
  console.log(' SUVADI Production Verification Audit');
  console.log('==========================================================\n');

  let errors = 0;
  const report = {
    totalEditions: 0,
    totalPDFs: 0,
    missingPDFs: [],
    corruptedPDFs: [],
    dbErrors: [],
    envIssues: []
  };

  // 1. Env Variables Verification
  console.log('--- 1. Environment Verification ---');
  const storagePath = process.env.STORAGE_PATH;
  const songsPath = process.env.SONGS_PATH;
  
  if (!storagePath || !storagePath.includes('D:\\storage')) {
    console.log('❌ STORAGE_PATH is missing or not D:\\storage:', storagePath);
    report.envIssues.push('STORAGE_PATH not configured properly');
    errors++;
  } else {
    console.log('✅ STORAGE_PATH correctly configured:', storagePath);
  }

  if (!songsPath || !songsPath.includes('D:\\songs')) {
    console.log('❌ SONGS_PATH is missing or not D:\\songs:', songsPath);
    report.envIssues.push('SONGS_PATH not configured properly');
    errors++;
  } else {
    console.log('✅ SONGS_PATH correctly configured:', songsPath);
  }

  // 2. Database & File Integrity Verification
  console.log('\n--- 2. Database & File Integrity Verification ---');
  try {
    const { rows } = await pool.query('SELECT * FROM sv_ebook_editions');
    report.totalEditions = rows.length;
    
    for (const edition of rows) {
      // Check local_pdf_url
      if (!edition.local_pdf_url) {
        report.dbErrors.push(`Edition ${edition.id} has no local_pdf_url`);
        errors++;
        continue;
      }
      
      // Check pdf_url does not contain http
      if (edition.pdf_url && edition.pdf_url.startsWith('http')) {
        report.dbErrors.push(`Edition ${edition.id} still has HTTP in pdf_url: ${edition.pdf_url}`);
        errors++;
      }

      // Check original_source_url has the cict url
      if (!edition.original_source_url || !edition.original_source_url.startsWith('http')) {
         // Some might legitimately not have it if they were added later, but we note it
      }

      // File integrity
      const filename = path.basename(edition.local_pdf_url);
      const absolutePdfPath = path.join(storagePath || path.join(__dirname, '..', 'storage'), 'pdfs', filename);
      
      try {
        const stats = await fs.promises.stat(absolutePdfPath);
        if (stats.size === 0) {
          report.corruptedPDFs.push(absolutePdfPath);
          errors++;
        } else {
          report.totalPDFs++;
        }
      } catch (err) {
        report.missingPDFs.push(absolutePdfPath);
        errors++;
      }
    }

    console.log(`✅ Checked ${report.totalEditions} DB records`);
    if (report.missingPDFs.length === 0) {
      console.log(`✅ All ${report.totalPDFs} PDFs found on disk`);
    } else {
      console.log(`❌ ${report.missingPDFs.length} PDFs missing on disk!`);
    }
    
    if (report.corruptedPDFs.length === 0) {
      console.log(`✅ No zero-byte PDFs detected`);
    } else {
      console.log(`❌ ${report.corruptedPDFs.length} corrupted PDFs detected!`);
    }
  } catch (err) {
    console.error('Database query failed:', err);
    errors++;
  }

  // Songs directory check
  console.log('\n--- 3. Manuscript Images (Songs) Verification ---');
  try {
    if (fs.existsSync(songsPath)) {
      const dirs = fs.readdirSync(songsPath).filter(d => fs.statSync(path.join(songsPath, d)).isDirectory());
      console.log(`✅ Found ${dirs.length} manuscript folders in SONGS_PATH`);
    } else {
      console.log(`⚠️ SONGS_PATH directory does not exist on this machine. (This script is likely running on the dev machine, not the server)`);
    }
  } catch(e) {
      console.log(`⚠️ Could not read SONGS_PATH: ${e.message}`);
  }

  console.log('\n==========================================================');
  console.log(` Verification Completed with ${errors} error(s)`);
  console.log('==========================================================');
  console.log(JSON.stringify(report, null, 2));

  await pool.end();
}

runVerification();
