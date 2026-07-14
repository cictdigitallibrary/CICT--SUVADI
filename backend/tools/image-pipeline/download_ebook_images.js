/**
 * download_ebook_images.js  (v1 — concurrent, resumable, self-verifying)
 *
 * Downloads all ebook flipbook images from the CICT website into local storage.
 * Mirrors the exact directory structure used on the live server:
 *
 *   storage/ebooks/<image_folder>/files/mobile/<N>.jpg
 *   storage/ebooks/<image_folder>/files/large/<N>.jpg   (if available)
 *
 * Features:
 *   ✅ Resumable — skips already-downloaded valid files
 *   ✅ Concurrent — downloads multiple pages per edition simultaneously
 *   ✅ Verified  — checks file size after each download; retries corrupted files
 *   ✅ Logged    — all failures written to download_failures.json for re-run
 *   ✅ Audited   — full summary report at end
 *
 * Run: node download_ebook_images.js
 * Re-run safely at any time to pick up where it left off.
 */

'use strict';

const https = require('https');
const http  = require('http');
const fs    = require('fs');
const path  = require('path');
const { Pool } = require('pg');
require('dotenv').config();

// ── Config ───────────────────────────────────────────────────────────────────
const BASE_URL       = 'https://suvadi.cict.in/asp/ebooks';
const STORAGE_ROOT   = path.join(__dirname, '..', 'storage', 'ebooks');
const FAILURES_FILE  = path.join(__dirname, 'download_failures.json');
const CONCURRENCY    = 6;    // parallel page downloads per edition
const MIN_FILE_BYTES = 512;  // files smaller than this are considered corrupt
const CONNECT_TIMEOUT_MS = 20_000;
const READ_TIMEOUT_MS    = 60_000;
const MAX_RETRIES        = 3;
const SIZES              = ['mobile']; // also try 'large' if mobile succeeded

const pool = new Pool({
  host:     process.env.DB_HOST,
  port:     parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME,
  user:     process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

fs.mkdirSync(STORAGE_ROOT, { recursive: true });

// ── Helpers ───────────────────────────────────────────────────────────────────

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function isValidFile(filePath) {
  try {
    const s = fs.statSync(filePath);
    return s.isFile() && s.size >= MIN_FILE_BYTES;
  } catch { return false; }
}

/**
 * Download a single URL to destPath.
 * Returns file size on success, throws on failure.
 */
function downloadFile(url, destPath) {
  return new Promise((resolve, reject) => {
    const proto = url.startsWith('https') ? https : http;
    const tmpPath = destPath + '.tmp';

    // Ensure parent dir exists
    fs.mkdirSync(path.dirname(destPath), { recursive: true });

    const req = proto.get(url, { timeout: CONNECT_TIMEOUT_MS }, res => {
      if (res.statusCode === 404) {
        res.resume();
        return reject(Object.assign(new Error('HTTP 404'), { code: 'NOT_FOUND' }));
      }
      if (res.statusCode !== 200) {
        res.resume();
        return reject(new Error(`HTTP ${res.statusCode}`));
      }

      const writer = fs.createWriteStream(tmpPath);
      let received = 0;
      let timer;

      const resetTimer = () => {
        clearTimeout(timer);
        timer = setTimeout(() => {
          req.destroy();
          writer.destroy();
          reject(new Error('Read timeout'));
        }, READ_TIMEOUT_MS);
      };

      resetTimer();
      res.on('data', chunk => { received += chunk.length; resetTimer(); });
      res.pipe(writer);

      writer.on('finish', () => {
        clearTimeout(timer);
        if (received < MIN_FILE_BYTES) {
          try { fs.unlinkSync(tmpPath); } catch (_) {}
          return reject(new Error(`Too small: ${received} bytes`));
        }
        try {
          fs.renameSync(tmpPath, destPath);
          resolve(received);
        } catch (e) { reject(e); }
      });
      writer.on('error', e => { clearTimeout(timer); try { fs.unlinkSync(tmpPath); } catch (_) {} reject(e); });
    });

    req.on('timeout', () => { req.destroy(); reject(new Error('Connect timeout')); });
    req.on('error', reject);
  });
}

/**
 * Download one page image with retries.
 * Returns { ok, size, error, skipped }
 */
async function downloadPage(folder, size, pageNum) {
  const remoteUrl = `${BASE_URL}/${folder}/files/${size}/${pageNum}.jpg`;
  const localPath = path.join(STORAGE_ROOT, folder, 'files', size, `${pageNum}.jpg`);

  // Skip if already valid
  if (isValidFile(localPath)) {
    return { ok: true, skipped: true, size: fs.statSync(localPath).size };
  }

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const bytes = await downloadFile(remoteUrl, localPath);
      return { ok: true, skipped: false, size: bytes };
    } catch (err) {
      if (err.code === 'NOT_FOUND') {
        return { ok: false, skipped: false, error: 'NOT_FOUND', url: remoteUrl };
      }
      if (attempt < MAX_RETRIES) {
        await sleep(attempt * 1000);
      } else {
        return { ok: false, skipped: false, error: err.message, url: remoteUrl };
      }
    }
  }
}

/**
 * Download all pages for one edition with a concurrency pool.
 */
async function downloadEdition(edition) {
  const { id, image_folder, total_pages } = edition;
  const label = `[${String(id).padStart(2,' ')}] ${image_folder}`;

  if (!image_folder) return null;
  if (!total_pages || total_pages < 1) {
    console.log(`${label} — no total_pages, skipping`);
    return { id, folder: image_folder, total: 0, downloaded: 0, skipped: 0, failed: [], noPages: true };
  }

  console.log(`\n${label} — ${total_pages} pages`);

  const pageNums = Array.from({ length: total_pages }, (_, i) => i + 1);
  let downloaded = 0;
  let skipped    = 0;
  const failed   = [];

  // Process pages in batches of CONCURRENCY
  for (let i = 0; i < pageNums.length; i += CONCURRENCY) {
    const batch = pageNums.slice(i, i + CONCURRENCY);
    const results = await Promise.all(batch.map(n => downloadPage(image_folder, 'mobile', n)));

    for (let j = 0; j < batch.length; j++) {
      const n = batch[j];
      const r = results[j];
      if (r.ok && r.skipped)   { skipped++; }
      else if (r.ok)            { downloaded++; }
      else                      { failed.push({ page: n, ...r }); }
    }

    // Progress tick
    const done = Math.min(i + CONCURRENCY, total_pages);
    const pct  = Math.round(done / total_pages * 100);
    process.stdout.write(`\r  ${done}/${total_pages} (${pct}%)  new:${downloaded}  skip:${skipped}  fail:${failed.length}   `);
  }
  console.log(); // newline after progress

  // Also attempt large/ variant (best-effort, do not count as failure if missing)
  const largeDir = path.join(STORAGE_ROOT, image_folder, 'files', 'large');
  const firstLargePath = path.join(largeDir, '1.jpg');
  const firstLargeUrl  = `${BASE_URL}/${image_folder}/files/large/1.jpg`;
  let hasLarge = false;
  try {
    await downloadFile(firstLargeUrl, firstLargePath);
    hasLarge = true;
  } catch (_) {}

  if (hasLarge) {
    process.stdout.write(`  Downloading large/ variant...`);
    let largeOk = 1;
    for (let i = 2; i <= total_pages; i += CONCURRENCY) {
      const batch = Array.from({ length: Math.min(CONCURRENCY, total_pages - i + 1) }, (_, j) => i + j);
      await Promise.all(batch.map(n => downloadPage(image_folder, 'large', n)));
      largeOk += batch.length;
      process.stdout.write(`\r  large/ ${largeOk}/${total_pages}   `);
    }
    console.log();
  }

  return { id, folder: image_folder, total: total_pages, downloaded, skipped, failed };
}

// ── Verification pass ─────────────────────────────────────────────────────────
function verifyEdition(edition) {
  const { id, image_folder, total_pages } = edition;
  if (!image_folder || !total_pages) return { id, skipped: true };

  let missing = [];
  let corrupt = [];
  for (let n = 1; n <= total_pages; n++) {
    const p = path.join(STORAGE_ROOT, image_folder, 'files', 'mobile', `${n}.jpg`);
    if (!fs.existsSync(p)) {
      missing.push(n);
    } else {
      const sz = fs.statSync(p).size;
      if (sz < MIN_FILE_BYTES) corrupt.push(n);
    }
  }
  return { id, folder: image_folder, total: total_pages, missing, corrupt, ok: missing.length === 0 && corrupt.length === 0 };
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log('==========================================================');
  console.log(' SUVADI Ebook Image Downloader (v1)');
  console.log('==========================================================\n');

  const { rows: editions } = await pool.query(
    `SELECT id, image_folder, total_pages, title_english, title_tamil
     FROM sv_ebook_editions
     WHERE image_folder IS NOT NULL AND image_folder != ''
     ORDER BY id`
  );

  if (editions.length === 0) {
    console.log('No editions with image_folder found.');
    console.log('Run: node seed-pg-editions-metadata.js first.\n');
    await pool.end();
    return;
  }

  console.log(`Found ${editions.length} editions with image_folder.\n`);

  // ── Download phase ────────────────────────────────────────────────────────
  const results = [];
  for (const edition of editions) {
    const r = await downloadEdition(edition);
    if (r) results.push(r);
    await sleep(300); // brief pause between editions
  }

  // ── Verification phase ────────────────────────────────────────────────────
  console.log('\n==========================================================');
  console.log(' Verification Pass');
  console.log('==========================================================\n');

  const verifications = editions.map(verifyEdition);
  const failures = [];

  // Auto-retry missing/corrupt pages
  for (const v of verifications) {
    if (v.skipped) continue;
    const allBad = [...(v.missing || []), ...(v.corrupt || [])];
    if (allBad.length > 0) {
      const ed = editions.find(e => e.id === v.id);
      console.log(`  ⚠️  [${v.id}] ${v.folder}: ${allBad.length} bad pages — retrying...`);
      for (const n of allBad) {
        const localPath = path.join(STORAGE_ROOT, v.folder, 'files', 'mobile', `${n}.jpg`);
        try { fs.unlinkSync(localPath); } catch (_) {}
        const result = await downloadPage(v.folder, 'mobile', n);
        if (!result.ok) {
          failures.push({ edition_id: v.id, folder: v.folder, page: n, error: result.error });
        }
      }
    }
  }

  // Final verification after retries
  const finalVerifications = editions.map(verifyEdition);

  // ── Report ────────────────────────────────────────────────────────────────
  const totalEditions     = finalVerifications.filter(v => !v.skipped).length;
  const fullyOk           = finalVerifications.filter(v => v.ok).length;
  const totalPagesExpected = finalVerifications.reduce((s, v) => s + (v.total || 0), 0);
  const totalMissing       = finalVerifications.reduce((s, v) => s + (v.missing?.length || 0), 0);
  const totalCorrupt       = finalVerifications.reduce((s, v) => s + (v.corrupt?.length || 0), 0);
  const noPages            = results.filter(r => r && r.noPages).length;

  console.log('\n==========================================================');
  console.log(' FINAL AUDIT REPORT');
  console.log('==========================================================');
  console.log(`  Editions with image_folder:   ${editions.length}`);
  console.log(`  Editions with total_pages:     ${totalEditions}`);
  console.log(`  Editions fully offline (✅):  ${fullyOk}`);
  console.log(`  Editions missing total_pages:  ${noPages}`);
  console.log(`  Total pages expected:          ${totalPagesExpected}`);
  console.log(`  Total pages downloaded OK:     ${totalPagesExpected - totalMissing - totalCorrupt}`);
  console.log(`  Missing pages (after retries): ${totalMissing}`);
  console.log(`  Corrupt files (after retries): ${totalCorrupt}`);

  if (totalMissing + totalCorrupt > 0) {
    console.log('\n  Failed editions:');
    for (const v of finalVerifications) {
      if (!v.ok && !v.skipped) {
        console.log(`    [${v.id}] ${v.folder}`);
        if (v.missing?.length) console.log(`      Missing pages: ${v.missing.join(', ')}`);
        if (v.corrupt?.length) console.log(`      Corrupt pages: ${v.corrupt.join(', ')}`);
      }
    }
  }

  // Write failures file for manual inspection
  if (failures.length > 0) {
    fs.writeFileSync(FAILURES_FILE, JSON.stringify(failures, null, 2));
    console.log(`\n  Failures written to: ${FAILURES_FILE}`);
  }

  if (fullyOk === totalEditions && noPages === 0) {
    console.log('\n✅ SUCCESS: All editions are fully available offline!');
    console.log('   No requests to suvadi.cict.in are needed at runtime.');
    console.log('   You may now restart the backend and switch the frontend.');
  } else if (fullyOk > 0) {
    console.log(`\n⚠️  PARTIAL: ${fullyOk}/${totalEditions} editions are fully offline.`);
    console.log('   Some pages could not be downloaded. Check failures above.');
    console.log('   Run this script again to retry — it is fully resumable.');
  } else {
    console.log('\n❌ Most images could not be downloaded. Check your network connection.');
  }

  await pool.end();
}

main().catch(async err => {
  console.error('\nFatal error:', err.message);
  await pool.end().catch(() => {});
  process.exit(1);
});
