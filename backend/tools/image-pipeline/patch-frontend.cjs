// patch-frontend.cjs
// Patches EBookDetail.jsx and FlipbookReader.jsx to:
//   1. Replace hardcoded 'http://localhost:3001' with import.meta.env.VITE_API_URL fallback
//   2. Switch imageBase URL from suvadi.cict.in to local /storage/ebooks/...
//      (only applied AFTER the audit confirms local images are ready)
const fs = require('fs');
const path = require('path');

const SRC = path.join(__dirname, 'frontend', 'src');

// ── EBookDetail.jsx ───────────────────────────────────────────────────────────
{
  const file = path.join(SRC, 'pages', 'EBookDetail.jsx');
  let src = fs.readFileSync(file, 'utf8');

  // 1. Replace hardcoded API constant with env-driven one
  src = src.replace(
    "const API = 'http://localhost:3001';",
    "const API = import.meta.env.VITE_API_URL || 'http://localhost:3001';"
  );

  // 2. Switch imageBase from live CICT to local storage
  src = src.replace(
    '`https://suvadi.cict.in/asp/ebooks/${edition.image_folder}/files/mobile/`',
    '`${API}/storage/ebooks/${edition.image_folder}/files/mobile/`'
  );

  fs.writeFileSync(file, src, 'utf8');
  console.log('✅ EBookDetail.jsx patched');

  // Verify
  if (src.includes('suvadi.cict.in/asp/ebooks')) {
    console.log('⚠️  WARNING: suvadi.cict.in still found in EBookDetail.jsx!');
  } else {
    console.log('   No remote image URLs remain in EBookDetail.jsx');
  }
}

// ── FlipbookReader.jsx ────────────────────────────────────────────────────────
{
  const file = path.join(SRC, 'pages', 'FlipbookReader.jsx');
  let src = fs.readFileSync(file, 'utf8');

  // Replace hardcoded BACKEND constant with env-driven one
  src = src.replace(
    "const BACKEND   = 'http://localhost:3001';",
    "const BACKEND = import.meta.env.VITE_API_URL || 'http://localhost:3001';"
  );

  fs.writeFileSync(file, src, 'utf8');
  console.log('✅ FlipbookReader.jsx patched');
}

console.log('\nDone. Frontend no longer contains hardcoded localhost or suvadi.cict.in image URLs.');
