const fs = require('fs');
const ebook = fs.readFileSync('frontend/src/pages/EBookDetail.jsx', 'utf8');
const flip  = fs.readFileSync('frontend/src/pages/FlipbookReader.jsx', 'utf8');

console.log('=== EBookDetail.jsx ===');
console.log('Has VITE_API_URL:', ebook.includes('VITE_API_URL'));
console.log('Has /storage/ebooks/:', ebook.includes('/storage/ebooks/'));
console.log('Has suvadi.cict.in/asp/ebooks:', ebook.includes('suvadi.cict.in/asp/ebooks'));
console.log('Has hardcoded localhost API:', ebook.includes("const API = 'http://localhost:3001'"));

console.log('\n=== FlipbookReader.jsx ===');
console.log('Has VITE_API_URL:', flip.includes('VITE_API_URL'));
console.log('Has hardcoded localhost BACKEND:', flip.includes("const BACKEND   = 'http://localhost:3001'"));
console.log('Has suvadi.cict.in:', flip.includes('suvadi.cict.in'));
