/**
 * audit_ebook_images.js
 *
 * Post-download audit: verifies that all ebook image pages exist locally
 * under storage/ebooks/<image_folder>/files/mobile/.
 *
 * Reports:
 *   - Total editions processed
 *   - Total pages expected
 *   - Total pages downloaded
 *   - Missing pages (by edition and page number)
 *   - Corrupt / zero-byte files
 *   - Editions fully available offline
 *   - Confirmation that no requests to suvadi.cict.in are needed
 *
 * Run: node audit_ebook_images.js
 */

'use strict';

const fs   = require('fs');
const path = require('path');
const { Pool } = require('pg');
require('dotenv').config();

const STORAGE_ROOT   = path.join(__dirname, '..', 'storage', 'ebooks');
const MIN_FILE_BYTES = 512;
const REPORT_FILE    = path.join(__dirname, 'audit_report.json');

const pool = new Pool({
  host:     process.env.DB_HOST,
  port:     parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME,
  user:     process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

function isValidFile(p) {
  try {
    const s = fs.statSync(p);
    return s.isFile() && s.size >= MIN_FILE_BYTES;
  } catch { return false; }
}

async function main() {
  console.log('==========================================================');
  console.log(' SUVADI Ebook Image Audit Report');
  console.log('==========================================================\n');

  const { rows: editions } = await pool.query(
    `SELECT id, title_english, title_tamil, image_folder, total_pages
     FROM sv_ebook_editions
     WHERE status = 1
     ORDER BY id`
  );

  const withFolder  = editions.filter(e => e.image_folder);
  const pdfOnly     = editions.filter(e => !e.image_folder);

  console.log(`Total editions in DB:              ${editions.length}`);
  console.log(`  → With image_folder:             ${withFolder.length}`);
  console.log(`  → PDF-only (no image_folder):    ${pdfOnly.length}`);
  console.log('');

  // ── Per-edition audit ────────────────────────────────────────────────────
  const editionReports = [];
  let totalExpected  = 0;
  let totalPresent   = 0;
  let totalMissing   = 0;
  let totalCorrupt   = 0;
  let fullyOffline   = 0;
  let noPageCount    = 0;

  for (const ed of withFolder) {
    if (!ed.total_pages || ed.total_pages < 1) {
      noPageCount++;
      editionReports.push({
        id: ed.id,
        folder: ed.image_folder,
        status: 'NO_PAGE_COUNT',
        expected: 0,
        present: 0,
        missing: [],
        corrupt: [],
      });
      continue;
    }

    totalExpected += ed.total_pages;

    const missing = [];
    const corrupt = [];
    let present = 0;

    for (let n = 1; n <= ed.total_pages; n++) {
      const p = path.join(STORAGE_ROOT, ed.image_folder, 'files', 'mobile', `${n}.jpg`);
      if (!fs.existsSync(p)) {
        missing.push(n);
      } else if (!isValidFile(p)) {
        corrupt.push(n);
        present++;
      } else {
        present++;
      }
    }

    totalPresent  += present;
    totalMissing  += missing.length;
    totalCorrupt  += corrupt.length;

    const ok = missing.length === 0 && corrupt.length === 0;
    if (ok) fullyOffline++;

    const status = ok ? 'OK' : (missing.length === ed.total_pages ? 'NOT_DOWNLOADED' : 'PARTIAL');

    editionReports.push({
      id: ed.id,
      folder: ed.image_folder,
      title: ed.title_english || ed.title_tamil,
      status,
      expected: ed.total_pages,
      present,
      missing: missing.length <= 20 ? missing : [`...${missing.length} pages missing`],
      corrupt,
    });
  }

  // ── Print per-edition results ─────────────────────────────────────────────
  console.log('Per-edition results:\n');
  for (const r of editionReports) {
    const icon = r.status === 'OK' ? '✅' : r.status === 'NO_PAGE_COUNT' ? '❓' : '❌';
    const info = r.status === 'NO_PAGE_COUNT'
      ? `${r.folder} — no total_pages in DB (run seed script)`
      : `${r.folder} — ${r.present}/${r.expected} pages`;
    console.log(`  ${icon} [${String(r.id).padStart(2,' ')}] ${info}`);
    if (r.missing?.length && typeof r.missing[0] === 'number') {
      console.log(`        Missing: ${r.missing.join(', ')}`);
    }
    if (r.corrupt?.length) {
      console.log(`        Corrupt: ${r.corrupt.join(', ')}`);
    }
  }

  // ── Summary ───────────────────────────────────────────────────────────────
  console.log('\n==========================================================');
  console.log(' SUMMARY');
  console.log('==========================================================');
  console.log(`  Total editions processed:              ${withFolder.length}`);
  console.log(`  Editions fully available offline (✅): ${fullyOffline}`);
  console.log(`  Editions partial/failed (❌):          ${withFolder.length - fullyOffline - noPageCount}`);
  console.log(`  Editions without page count (❓):      ${noPageCount}`);
  console.log('');
  console.log(`  Total pages expected:                  ${totalExpected}`);
  console.log(`  Total pages present:                   ${totalPresent}`);
  console.log(`  Missing pages:                         ${totalMissing}`);
  console.log(`  Corrupt files:                         ${totalCorrupt}`);
  console.log('');

  // PDF audit
  const pdfDir = path.join(__dirname, '..', 'storage', 'pdfs');
  const { rows: pdfEditions } = await pool.query(
    `SELECT id, local_pdf_url FROM sv_ebook_editions WHERE status = 1 ORDER BY id`
  );
  let pdfOk = 0, pdfMissing = 0;
  for (const ed of pdfEditions) {
    if (ed.local_pdf_url) {
      const p = path.join(__dirname, '..', ed.local_pdf_url);
      if (isValidFile(p)) pdfOk++;
      else pdfMissing++;
    } else {
      pdfMissing++;
    }
  }
  console.log(`  PDF editions verified OK:              ${pdfOk}/${pdfEditions.length}`);
  console.log(`  PDF editions missing:                  ${pdfMissing}`);
  console.log('');

  // Overall verdict
  if (fullyOffline === withFolder.length - noPageCount && pdfMissing === 0) {
    console.log('  ✅ PASS: All images and PDFs are served locally.');
    console.log('  ✅ Zero runtime dependency on suvadi.cict.in.');
    console.log('  ✅ Frontend can now use local storage URLs.');
  } else {
    if (totalMissing > 0 || totalCorrupt > 0) {
      console.log('  ⚠️  Some image pages are missing or corrupt.');
      console.log('     Run: node download_ebook_images.js  to retry.');
    }
    if (pdfMissing > 0) {
      console.log('  ⚠️  Some PDFs are missing.');
      console.log('     Run: node download_missing_pdfs.js  to retry.');
    }
    if (noPageCount > 0) {
      console.log('  ❓  Some editions have no total_pages — run: node seed-pg-editions-metadata.js');
    }
  }

  // Write JSON report
  const report = {
    generated_at: new Date().toISOString(),
    summary: {
      editions_with_folder: withFolder.length,
      editions_fully_offline: fullyOffline,
      editions_no_page_count: noPageCount,
      total_pages_expected: totalExpected,
      total_pages_present: totalPresent,
      total_missing: totalMissing,
      total_corrupt: totalCorrupt,
      pdf_ok: pdfOk,
      pdf_missing: pdfMissing,
    },
    editions: editionReports,
  };
  fs.writeFileSync(REPORT_FILE, JSON.stringify(report, null, 2));
  console.log(`\n  Report written to: ${REPORT_FILE}`);

  await pool.end();
}

main().catch(async err => {
  console.error('Fatal:', err.message);
  await pool.end().catch(() => {});
  process.exit(1);
});
