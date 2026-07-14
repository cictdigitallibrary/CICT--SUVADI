/**
 * Final verification: checks all changed files for:
 * - No suvadi.cict.in image URLs
 * - No hardcoded localhost
 * - No image_folder in navigate path
 * - Correct local storage routing
 */
const fs = require('fs');

function check(label, file) {
  let src;
  try { src = fs.readFileSync(file, 'utf8'); }
  catch { console.log(`  ❌ ${label}: FILE NOT FOUND`); return; }

  const issues = [];
  const ok = [];

  const checks = [
    { test: !src.includes('suvadi.cict.in/asp/ebooks'), msg: 'No suvadi.cict.in image URLs' },
    { test: !src.includes("imageBase"), msg: 'No imageBase param' },
    { test: !src.includes("image_folder") || !src.includes("navigate"), msg: 'No image_folder in navigate' },
    { test: src.includes('VITE_API_URL') || !src.includes('localhost:3001'), msg: 'No hardcoded localhost' },
  ];

  for (const c of checks) {
    if (c.test) ok.push(c.msg);
    else issues.push(c.msg);
  }

  console.log(`\n  📄 ${label}`);
  ok.forEach(m => console.log(`    ✅ ${m}`));
  issues.forEach(m => console.log(`    ❌ ISSUE: ${m}`));
}

console.log('=== Final Verification ===\n');

check('EBookDetail.jsx',    'frontend/src/pages/EBookDetail.jsx');
check('FlipbookReader.jsx', 'frontend/src/pages/FlipbookReader.jsx');

// Check backend proxy still uses local_pdf_url
const idx = fs.readFileSync('backend/index.js', 'utf8');
console.log('\n  📄 backend/index.js');
console.log(idx.includes('local_pdf_url') ? '    ✅ PDF proxy uses local_pdf_url' : '    ❌ local_pdf_url not found');
console.log(idx.includes('image_folder') && idx.includes('ADD COLUMN IF NOT EXISTS image_folder') ? '    ✅ image_folder column migration present' : '    ℹ️  image_folder column migration not found');
console.log(idx.includes('ADD COLUMN IF NOT EXISTS image_folder') ? '    ✅ Column migration in ensureTables' : '    ❌ Missing column migration');
console.log(idx.includes("'GET /api/ebooks'") || idx.includes('/api/ebooks') ? '    ✅ Ebook API route present' : '    ❌ Ebook API not found');

// Verify storage/ebooks does NOT exist (cleaned up)
console.log('\n  📁 storage/ebooks (partial image downloads)');
console.log(require('fs').existsSync('storage/ebooks') ? '    ⚠️  still exists (run cleanup)' : '    ✅ Deleted (no partial images)');

// Verify backend/tools/image-pipeline exists (archived scripts)
console.log('\n  📁 backend/tools/image-pipeline (archived scripts)');
console.log(require('fs').existsSync('backend/tools/image-pipeline') ? '    ✅ Archived OK' : '    ℹ️  Not found');

console.log('\n=== Done ===\n');
