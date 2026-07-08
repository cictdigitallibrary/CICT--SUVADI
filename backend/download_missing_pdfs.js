/**
 * download_missing_pdfs.js (v2 - uses curl for robust large-file downloads)
 *
 * One-time audit: downloads all missing PDFs using curl (handles large files,
 * redirects, and timeouts correctly), then updates the database.
 *
 * Run: node download_missing_pdfs.js
 */

const { execSync, spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
require('dotenv').config();

const STORAGE_DIR = path.join(__dirname, '..', 'storage', 'pdfs');

const pool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

fs.mkdirSync(STORAGE_DIR, { recursive: true });

// Clean up any stale .tmp files from previous runs
const tmpFiles = fs.readdirSync(STORAGE_DIR).filter(f => f.endsWith('.tmp'));
for (const tmp of tmpFiles) {
  fs.unlinkSync(path.join(STORAGE_DIR, tmp));
  console.log('Cleaned up stale: ' + tmp);
}

function downloadWithCurl(url, destPath) {
  // curl options:
  //   -L  follow redirects
  //   -f  fail on HTTP errors
  //   -s  silent
  //   -S  show errors
  //   -C - resume partial download if file exists
  //   --max-time 1800  absolute 30-min timeout (needed for 600MB+ files)
  //   --connect-timeout 30  connection timeout
  //   --retry 3  curl-level retries on transient errors
  //   --retry-delay 5
  //   -o  output file
  const args = [
    '-L', '-f', '-s', '-S',
    '-C', '-',
    '--max-time', '1800',
    '--connect-timeout', '30',
    '--retry', '3',
    '--retry-delay', '5',
    '-o', destPath,
    url
  ];

  const result = spawnSync('curl', args, { stdio: 'inherit', timeout: 1860000 });

  if (result.status !== 0) {
    // Remove partial file if any — but keep it if -C - resumed and just timed out partway
    try { fs.unlinkSync(destPath); } catch (_) {}
    throw new Error('curl exited with code ' + result.status);
  }

  // Validate the file
  const stat = fs.statSync(destPath);
  if (stat.size < 1024) {
    try { fs.unlinkSync(destPath); } catch (_) {}
    throw new Error('Downloaded file too small (' + stat.size + ' bytes) — likely an error page');
  }

  return stat.size;
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function main() {
  console.log('=================================================================');
  console.log(' SUVADI PDF Audit and Download Tool (v2)');
  console.log('=================================================================\n');

  const { rows: editions } = await pool.query(
    'SELECT id, book_id, title_tamil, pdf_url, local_pdf_url FROM sv_ebook_editions ORDER BY id'
  );
  console.log('Found ' + editions.length + ' editions in database.\n');

  const missing = [];
  const present = [];

  for (const ed of editions) {
    const expectedFile = path.join(STORAGE_DIR, 'edition_' + ed.id + '.pdf');
    const expectedRelative = 'storage/pdfs/edition_' + ed.id + '.pdf';

    let fileOk = false;
    try {
      const stat = fs.statSync(expectedFile);
      fileOk = stat.size > 1024;
    } catch (_) { fileOk = false; }

    if (fileOk) {
      present.push({ ed, expectedRelative });
    } else {
      missing.push({ ed, expectedFile, expectedRelative });
    }
  }

  console.log('Already local: ' + present.length + ' PDFs');
  console.log('Missing:       ' + missing.length + ' PDFs\n');

  // Fix DB mappings for already-present files
  for (const { ed, expectedRelative } of present) {
    if (ed.local_pdf_url !== expectedRelative) {
      await pool.query(
        'UPDATE sv_ebook_editions SET local_pdf_url = $1 WHERE id = $2',
        [expectedRelative, ed.id]
      );
      console.log('  Fixed DB mapping for edition_' + ed.id);
    }
  }

  if (missing.length === 0) {
    console.log('All PDFs already present. Nothing to download.\n');
  } else {
    console.log('Downloading ' + missing.length + ' missing PDFs using curl...\n');
    const failed = [];

    for (const { ed, expectedFile, expectedRelative } of missing) {
      const label = 'edition_' + ed.id + '.pdf';
      process.stdout.write('  [' + String(ed.id).padStart(2, ' ') + '] ' + label + ' ... ');
      let retries = 2;
      let downloaded = false;

      while (retries >= 0 && !downloaded) {
        try {
          const bytes = downloadWithCurl(ed.pdf_url, expectedFile);
          const mb = (bytes / 1024 / 1024).toFixed(1);
          console.log('OK (' + mb + ' MB)');
          await pool.query(
            'UPDATE sv_ebook_editions SET local_pdf_url = $1, original_pdf_url = $2 WHERE id = $3',
            [expectedRelative, ed.pdf_url, ed.id]
          );
          downloaded = true;
        } catch (err) {
          retries--;
          if (retries >= 0) {
            process.stdout.write('RETRY... ');
            await sleep(2000);
          } else {
            console.log('FAILED: ' + err.message);
            failed.push({ ed, error: err.message });
          }
        }
      }

      await sleep(300);
    }

    if (failed.length > 0) {
      console.log('\nFailed downloads (' + failed.length + '):');
      for (const { ed, error } of failed) {
        console.log('  [' + ed.id + '] ' + ed.pdf_url);
        console.log('      ' + error);
      }
    }
  }

  // Final verification
  console.log('\n=================================================================');
  console.log(' Final Verification');
  console.log('=================================================================\n');

  const { rows: final } = await pool.query(
    'SELECT id, title_tamil, local_pdf_url FROM sv_ebook_editions ORDER BY id'
  );

  let allGood = true;
  for (const ed of final) {
    const expectedFile = path.join(STORAGE_DIR, 'edition_' + ed.id + '.pdf');
    const expectedRelative = 'storage/pdfs/edition_' + ed.id + '.pdf';
    let fileOk = false;
    try {
      const stat = fs.statSync(expectedFile);
      fileOk = stat.size > 1024;
    } catch (_) { fileOk = false; }
    const dbOk = ed.local_pdf_url === expectedRelative;

    if (!fileOk || !dbOk) {
      allGood = false;
      console.log('FAIL [' + String(ed.id).padStart(2,' ') + '] file=' + (fileOk ? 'OK    ' : 'MISSING') + '  db=' + (dbOk ? 'OK' : 'WRONG') + '  ' + ed.title_tamil.substring(0,60));
    } else {
      console.log('OK   [' + String(ed.id).padStart(2,' ') + '] ' + ed.title_tamil.substring(0,60));
    }
  }

  console.log('');
  if (allGood) {
    console.log('SUCCESS: All ' + final.length + ' editions verified. System is fully self-contained!');
  } else {
    console.log('WARNING: Some editions still have issues. Check above.');
  }

  await pool.end();
}

main().catch(async (err) => {
  console.error('Fatal error:', err);
  await pool.end();
  process.exit(1);
});
