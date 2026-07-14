/**
 * seed-pg-editions-metadata.js
 *
 * One-time (idempotent) seeder that writes all ebook edition metadata
 * into the PostgreSQL sv_ebook_editions table, including:
 *   - image_folder, total_pages (for image-based flipbooks)
 *   - title_english, editor, publisher, year_published
 *
 * Safe to run multiple times:
 *   - Only updates rows where the column is currently NULL or empty.
 *   - Never touches pdf_url or the existing primary metadata columns.
 *
 * Run: node seed-pg-editions-metadata.js
 */

'use strict';

const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host:     process.env.DB_HOST,
  port:     parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME,
  user:     process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

// ── Complete edition metadata table ──────────────────────────────────────────
// image_folder = the folder name used by the CICT server
//   URL pattern: https://suvadi.cict.in/asp/ebooks/<image_folder>/files/mobile/<N>.jpg
// total_pages  = page count (from config.js probe or manually confirmed)
// Set image_folder: null for editions that are PDF-only (no image flipbook on CICT site)
// ─────────────────────────────────────────────────────────────────────────────
const EDITION_META = [
  // ── Tolkappiyam (book_id: 9) ─────────────────────────────────────────────
  { id:  1, title_english: 'Tolkappiyam – Eluthu – Nacch. – Mahalinga Iyer (1847)',        editor: 'மழைவை மகாலிங்கையர்',         publisher: 'சரஸ்வதி மஹால் அச்சகம்',  year: 1847, image_folder: 'thol_1847',              total_pages: null },
  { id:  2, title_english: 'Tolkappiyam – Eluthu – Ilam. – Subbarai Chettiyar (1868)',     editor: 'சுப்பராய செட்டியார்',         publisher: '',                        year: 1868, image_folder: 'thol_1868_ezhuthu_ilam',  total_pages: null },
  { id:  3, title_english: 'Tolkappiyam – Sol. Sena. – Gomala Iyer (1868)',                editor: 'கோமளபுரம் இராசகோபால பிள்ளை', publisher: '',                        year: 1868, image_folder: 'thol_1868_sol_sena',     total_pages: null },
  { id:  4, title_english: 'Tolkappiyam – Sol. Ilam. – K. Namachivaiyam (1927)',           editor: 'கா. நமச்சிவாய முதலியார்',     publisher: 'கழக வெளியீடு',            year: 1927, image_folder: 'thol_1927',              total_pages: null },
  { id:  5, title_english: 'Tolkappiyam – Sol. Nacch. – Dhamodaram (1892)',                editor: 'சி.வை. தாமோதரம் பிள்ளை',    publisher: '',                        year: 1892, image_folder: 'thol_1892',              total_pages: null },
  { id:  6, title_english: 'Tolkappiyam – Sol. Deivam. – Aranga Venkata (1929)',           editor: 'அரங்க வேங்கடாசலம்',          publisher: 'கரத்நாத தமிழ்ச் சங்கம்', year: 1929, image_folder: 'thol_1929',              total_pages: null },
  { id:  7, title_english: 'Tolkappiyam – Porul. Ilam. – K. Namachivaiyam (1920)',        editor: 'கா. நமச்சிவாய முதலியார்',     publisher: '',                        year: 1920, image_folder: 'thol_1920',              total_pages: null },
  { id:  8, title_english: 'Tolkappiyam – Porul. Ilam. Kalavu & Karpu – V.U.C.P. (1933)', editor: 'வ.உ. சிதம்பரம் பிள்ளை',     publisher: '',                        year: 1933, image_folder: 'thol_1933',              total_pages: null },
  { id:  9, title_english: 'Tolkappiyam – Porul. Ilam. Mey,Uva,Sey,Marpu – V.U.C.P. (1935)', editor: 'வ.உ. சிதம்பரம் பிள்ளை', publisher: '',                        year: 1935, image_folder: 'thol_1935_a',           total_pages: null },
  { id: 10, title_english: 'Tolkappiyam – Porul. Nacch. – Damodaram (1885)',               editor: 'சி.வை. தாமோதரம் பிள்ளை',    publisher: '',                        year: 1885, image_folder: 'thol_1885',              total_pages: null },
  { id: 11, title_english: 'Tolkappiyam – Porul. Last 4 Iyal – Damodaram (1885)',         editor: 'சி.வை. தாமோதரம் பிள்ளை',    publisher: '',                        year: 1885, image_folder: 'thol_1885',              total_pages: null },
  { id: 12, title_english: 'Tolkappiyam – Porul. Seyyu. Nacch. – Raghava Iyer (1917)',    editor: 'ரா. இராகவையங்கார்',          publisher: '',                        year: 1917, image_folder: 'thol_1917',              total_pages: null },
  { id: 13, title_english: 'Tolkappiyam – Nannul Mulam – Samuel Pillai (1858)',            editor: 'எஸ். சாமுவேல் பிள்ளை',       publisher: '',                        year: 1858, image_folder: 'thol_1858',              total_pages: null },
  { id: 14, title_english: 'Tolkappiyam – Porul. Ilam. (1935, Alt.)',                      editor: 'வ.உ. சிதம்பரம் பிள்ளை',     publisher: '',                        year: 1935, image_folder: 'thol_1935',              total_pages: null },
  { id: 15, title_english: 'Tolkappiyam – Porul. Perasiriyar – Pavanandam (1917)',        editor: 'ச. பவானந்தம் பிள்ளை',        publisher: '',                        year: 1917, image_folder: 'thol_porul_1917',        total_pages: null },
  { id: 16, title_english: 'Tolkappiyam – Sol. Kalladanar Urai (1964)',                    editor: 'கல்லாடனார்',                 publisher: '',                        year: 1964, image_folder: 'thol_sol_kal',           total_pages: null },

  // ── Ettuthokai (book_id: 10) ──────────────────────────────────────────────
  { id: 17, title_english: 'Natrinai – First Edition (1915)',        editor: 'ந.மு. வேங்கடசாமி நாட்டார்',  publisher: '', year: 1915, image_folder: 'natrinai_1915',         total_pages: null },
  { id: 18, title_english: 'Kurunthokai – First Edition (1915)',     editor: 'சௌரிப்பெருமாள் அரங்கனார்',   publisher: '', year: 1915, image_folder: 'kurunthokai_1915',      total_pages: null },
  { id: 19, title_english: 'Ainkurunuru – First Edition (1903)',     editor: '',                             publisher: '', year: 1903, image_folder: 'ainkurunuru_1903',      total_pages: null },
  { id: 20, title_english: 'Pathirrupathu – First Edition (1904)',   editor: '',                             publisher: '', year: 1904, image_folder: 'pathirrupathu_1904',    total_pages: null },
  { id: 21, title_english: 'Paripadal – First Edition (1918)',       editor: '',                             publisher: '', year: 1918, image_folder: 'paripadal_1918',        total_pages: null },
  { id: 22, title_english: 'Kalithokai – First Edition (1887)',      editor: 'சி.வை. தாமோதரம் பிள்ளை',    publisher: '', year: 1887, image_folder: 'kalithokai_1887',       total_pages: null },
  { id: 23, title_english: 'Agananuru – First Edition (1918)',       editor: '',                             publisher: '', year: 1918, image_folder: 'agananuru_1918',        total_pages: null },
  { id: 24, title_english: 'Purananuru – First Edition (1894)',      editor: '',                             publisher: '', year: 1894, image_folder: 'purananuru_1894',       total_pages: null },

  // ── Pattupattu (book_id: 11) ──────────────────────────────────────────────
  { id: 25, title_english: 'Pattupattu – First Edition (1889)',      editor: 'உ.வே. சாமிநாதையர்',          publisher: '', year: 1889, image_folder: 'pathupatu_1889',        total_pages: null },

  // ── Pathinenkilkanakku (book_id: 13) ─────────────────────────────────────
  { id: 26, title_english: 'Thirukkural – First Edition (1812)',     editor: 'ஞானப்பிரகாசன்',              publisher: '', year: 1812, image_folder: 'thirukkural_1812',      total_pages: null },
  { id: 27, title_english: 'Naladiyar – First Edition (1812)',       editor: 'ஞானப்பிரகாசன்',              publisher: '', year: 1812, image_folder: 'naladiyar_1812',        total_pages: null },
  { id: 28, title_english: 'Iniyavai 40 – First Edition',            editor: '',                             publisher: '', year: null, image_folder: 'iniyavai40',             total_pages: null },
  { id: 29, title_english: 'Asarakovai – First Edition (1857)',      editor: '',                             publisher: '', year: 1857, image_folder: 'asarakovai_1857',       total_pages: null },
  { id: 30, title_english: 'Thirikadugam – First Edition (1868)',    editor: '',                             publisher: '', year: 1868, image_folder: 'thirikadugam_1868',     total_pages: null },
  { id: 31, title_english: 'Nanmanikadigai – First Edition (1872)',  editor: '',                             publisher: '', year: 1872, image_folder: 'nanmanikadigai_1872',   total_pages: null },
  { id: 32, title_english: 'Palamoli 400 – First Edition (1874)',    editor: '',                             publisher: '', year: 1874, image_folder: 'palamoli_1874',         total_pages: null },
  { id: 33, title_english: 'Sirupanjamoolam – First Edition (1875)', editor: '',                             publisher: '', year: 1875, image_folder: 'sirupanjamoolam_1875',  total_pages: null },
  { id: 34, title_english: 'Kalavazhi 40 – First Edition (1875)',    editor: '',                             publisher: '', year: 1875, image_folder: 'kalavali40_1875',       total_pages: null },
  { id: 35, title_english: 'Kaar 40 – First Edition (1875)',         editor: '',                             publisher: '', year: 1875, image_folder: 'kaar40_1875',           total_pages: null },
  { id: 36, title_english: 'Inna 40 – First Edition (1881)',         editor: '',                             publisher: '', year: 1881, image_folder: 'inna40_1881',           total_pages: null },
  { id: 37, title_english: 'Mudumozhikanchi – First Edition (1895)', editor: '',                             publisher: '', year: 1895, image_folder: 'mutumozhikanchi_1895',  total_pages: null },
  { id: 38, title_english: 'Elathi – First Edition (1887)',          editor: '',                             publisher: '', year: 1887, image_folder: 'elathi_1887',           total_pages: null },
  { id: 39, title_english: 'Ainthinai 50 – First Edition (1903)',    editor: '',                             publisher: '', year: 1903, image_folder: 'ainthinal50_1903',      total_pages: null },
  { id: 40, title_english: 'Thinaimalai 150 – First Edition (1904)', editor: '',                             publisher: '', year: 1904, image_folder: 'thinaimalai150_1904',   total_pages: null },
  { id: 41, title_english: 'Ainthinai 70 – First Edition (1906)',    editor: '',                             publisher: '', year: 1906, image_folder: 'ainthinai70_1906',      total_pages: null },
  { id: 42, title_english: 'Thinaemoli 50 – First Edition (1918)',   editor: '',                             publisher: '', year: 1918, image_folder: 'thinaemoli50_1918',     total_pages: null },
  { id: 43, title_english: 'Kainilai – First Edition (1931)',        editor: '',                             publisher: '', year: 1931, image_folder: 'kainilai_1931',         total_pages: null },

  // ── Silappatikaram (book_id: 12) — CONFIRMED with page counts ────────────
  { id: 44, title_english: 'Cilappatikaram – Edition 1 (1872)',        editor: '',                   publisher: '', year: 1872, image_folder: 'silapathikaram_1872',  total_pages: 306 },
  { id: 45, title_english: 'Cilappatikaram – Edition 2 (1876)',        editor: '',                   publisher: '', year: 1876, image_folder: 'silapathikaram_1876',  total_pages: 56  },
  { id: 46, title_english: 'Cilappatikaram – Edition 3 (1880)',        editor: '',                   publisher: '', year: 1880, image_folder: 'silappathikaram_1880', total_pages: 423 },
  { id: 47, title_english: 'Cilappatikaram – U.Ve.Sa Edition (1892)', editor: 'உ.வே. சாமிநாதையர்', publisher: '', year: 1892, image_folder: 'silampathikaram_1892', total_pages: 820 },

  // ── Muttollayiram (book_id: 16) ───────────────────────────────────────────
  { id: 48, title_english: 'Muttollayiram – First Edition (1905)',     editor: '',                   publisher: '', year: 1905, image_folder: 'mutholayiram_1905',    total_pages: null },

  // ── Irayanar Agapporul (book_id: 15) ─────────────────────────────────────
  { id: 49, title_english: 'Irayanar Agapporul – First Edition (1883)', editor: '',                  publisher: '', year: 1883, image_folder: 'irayanar_1883',        total_pages: null },
];

// ── Config.js URL pattern for probing total_pages ──────────────────────────
// https://suvadi.cict.in/asp/ebooks/<folder>/mobile/javascript/config.js
const https = require('https');

function fetchText(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { timeout: 12000 }, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
  });
}

function extractPageCount(text) {
  const m = text.match(/bookConfig\.totalPageCount\s*=\s*(\d+)/);
  return m ? parseInt(m[1]) : null;
}

async function probePageCount(folder) {
  const url = `https://suvadi.cict.in/asp/ebooks/${folder}/mobile/javascript/config.js`;
  try {
    const { status, body } = await fetchText(url);
    if (status === 200) {
      return extractPageCount(body);
    }
  } catch (_) {}
  return null;
}

async function main() {
  console.log('==========================================================');
  console.log(' SUVADI Ebook Editions Metadata Seeder (PostgreSQL)');
  console.log('==========================================================\n');

  // Ensure columns exist
  const alterCols = [
    `ALTER TABLE sv_ebook_editions ADD COLUMN IF NOT EXISTS image_folder   TEXT`,
    `ALTER TABLE sv_ebook_editions ADD COLUMN IF NOT EXISTS total_pages    INTEGER`,
    `ALTER TABLE sv_ebook_editions ADD COLUMN IF NOT EXISTS title_english  TEXT`,
    `ALTER TABLE sv_ebook_editions ADD COLUMN IF NOT EXISTS editor         TEXT`,
    `ALTER TABLE sv_ebook_editions ADD COLUMN IF NOT EXISTS publisher      TEXT`,
    `ALTER TABLE sv_ebook_editions ADD COLUMN IF NOT EXISTS year_published INTEGER`,
  ];
  for (const q of alterCols) {
    await pool.query(q).catch(e => console.error('  Column add:', e.message));
  }
  console.log('✅ Columns verified/added\n');

  // Fetch current state from DB
  const { rows: current } = await pool.query(
    'SELECT id, image_folder, total_pages, title_english FROM sv_ebook_editions ORDER BY id'
  );
  const currentMap = {};
  for (const r of current) currentMap[r.id] = r;

  console.log(`📚 Seeding metadata for ${EDITION_META.length} editions...\n`);

  let seeded = 0;
  let probed = 0;
  let probeFound = 0;

  for (const meta of EDITION_META) {
    const existing = currentMap[meta.id];
    if (!existing) {
      console.log(`  ⚠️  Edition ID ${meta.id} not found in DB — skipping`);
      continue;
    }

    let { image_folder, total_pages } = meta;

    // If total_pages is null and we have an image_folder, probe the live server
    if (image_folder && total_pages === null) {
      probed++;
      process.stdout.write(`  🌐 Probing ${image_folder} for page count... `);
      const count = await probePageCount(image_folder);
      if (count) {
        total_pages = count;
        probeFound++;
        console.log(`${count} pages`);
      } else {
        console.log('not found on server (will be PDF-only or folder name differs)');
        // If not found on server, don't store a folder that doesn't work
        image_folder = null;
        total_pages = null;
      }
      await new Promise(r => setTimeout(r, 250)); // polite delay
    }

    // Update — but only set values that are currently null/empty (preserve existing data)
    await pool.query(
      `UPDATE sv_ebook_editions SET
         title_english  = COALESCE(NULLIF(title_english,''),  $1),
         editor         = COALESCE(NULLIF(editor,''),         $2),
         publisher      = COALESCE(NULLIF(publisher,''),      $3),
         year_published = COALESCE(year_published,            $4),
         image_folder   = COALESCE(NULLIF(image_folder,''),   $5),
         total_pages    = COALESCE(total_pages,               $6)
       WHERE id = $7`,
      [
        meta.title_english || null,
        meta.editor || null,
        meta.publisher || null,
        meta.year || null,
        image_folder || null,
        total_pages || null,
        meta.id,
      ]
    );
    seeded++;
  }

  // Final summary
  const { rows: final } = await pool.query(
    `SELECT id, title_english, image_folder, total_pages
     FROM sv_ebook_editions
     WHERE status = 1
     ORDER BY id`
  );

  const withFolder = final.filter(r => r.image_folder);
  const withPages  = final.filter(r => r.image_folder && r.total_pages);
  const noFolder   = final.filter(r => !r.image_folder);

  console.log('\n==========================================================');
  console.log(' SEED COMPLETE');
  console.log('==========================================================');
  console.log(`  Total editions in DB:           ${final.length}`);
  console.log(`  Editions seeded/updated:        ${seeded}`);
  console.log(`  Folders probed on live server:  ${probed}`);
  console.log(`  Folders confirmed on server:    ${probeFound}`);
  console.log(`  Editions WITH image_folder:     ${withFolder.length}`);
  console.log(`  Editions WITH total_pages:      ${withPages.length}`);
  console.log(`  Editions PDF-only (no folder):  ${noFolder.length}`);

  if (withFolder.length > 0) {
    console.log('\n  Image-folder editions:');
    for (const r of withFolder) {
      console.log(`    [${String(r.id).padStart(2,' ')}] ${r.image_folder}  pages=${r.total_pages ?? '?'}`);
    }
  }

  if (noFolder.length > 0) {
    console.log('\n  PDF-only editions (no image folder found):');
    for (const r of noFolder) {
      console.log(`    [${String(r.id).padStart(2,' ')}] ${(r.title_english || '').substring(0,60)}`);
    }
  }

  await pool.end();
  console.log('\n✅ All done. PostgreSQL is now the single source of truth.');
}

main().catch(async err => {
  console.error('Fatal:', err.message);
  await pool.end().catch(() => {});
  process.exit(1);
});
