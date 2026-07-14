const fs = require('fs');
const path = require('path');

function check(label, file) {
  let src;
  try { src = fs.readFileSync(file, 'utf8'); }
  catch { console.log(`  ❌ ${label}: FILE NOT FOUND`); return; }

  const issues = [];
  const ok = [];

  const checks = [
    { test: !src.includes('suvadi.cict.in'), msg: 'No suvadi.cict.in references (excluding comments)' },
    { test: !src.includes("pdfUrl="), msg: 'No pdfUrl query param' },
    { test: src.includes("editionId") || src.includes("edition="), msg: 'Uses edition ID' },
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

check('EBookDetail.jsx',    path.join(__dirname, 'frontend/src/pages/EBookDetail.jsx'));
check('FlipbookReader.jsx', path.join(__dirname, 'frontend/src/pages/FlipbookReader.jsx'));

// Check backend proxy
const idx = fs.readFileSync(path.join(__dirname, 'backend/index.js'), 'utf8');
console.log('\n  📄 backend/index.js');
console.log(idx.includes('/api/proxy/pdf/:editionId') ? '    ✅ New ID-based endpoint exists' : '    ❌ Missing new endpoint');
console.log(idx.includes('/api/proxy/pdf') ? '    ✅ Old endpoint retained' : '    ❌ Missing old endpoint');
console.log(idx.includes('process.env.STORAGE_PATH') ? '    ✅ Uses STORAGE_PATH env var' : '    ❌ Missing STORAGE_PATH env var');
console.log(idx.includes('process.env.SONGS_PATH') ? '    ✅ Uses SONGS_PATH env var' : '    ❌ Missing SONGS_PATH env var');

console.log('\n=== Done ===\n');
