/**
 * Patches EBookDetail.jsx:
 * 1. Replaces the conditional image/PDF branch with always-PDF
 * 2. Updates the edition type label from conditional to 'PDF READER'
 */
const fs = require('fs');
const file = 'frontend/src/pages/EBookDetail.jsx';
let src = fs.readFileSync(file, 'utf8');

// ── Patch 1: Replace READ button onClick with PDF-only navigation ─────────
const OLD_ONCLICK =
`                           const back = encodeURIComponent(\`/ebooks/\${id}\`);
                           const title = encodeURIComponent(edition.title_tamil);
                           if (edition.image_folder && edition.total_pages) {
                             // Fast image-based flipbook
                             const imageBase = encodeURIComponent(
                               \`\${API}/storage/ebooks/\${edition.image_folder}/files/mobile/\`
                             );
                             navigate(\`/ebooks/\${id}/read?imageBase=\${imageBase}&pages=\${edition.total_pages}&title=\${title}&back=\${back}\`);
                           } else {
                             // PDF-based flipbook via backend proxy
                             const pdfUrl = encodeURIComponent(edition.pdf_url);
                             navigate(\`/ebooks/\${id}/read?pdfUrl=\${pdfUrl}&title=\${title}&back=\${back}\`);
                           }`;

const NEW_ONCLICK =
`                           // All editions use the local PDF via backend proxy
                           const back   = encodeURIComponent(\`/ebooks/\${id}\`);
                           const title  = encodeURIComponent(edition.title_tamil);
                           const pdfUrl = encodeURIComponent(edition.pdf_url);
                           navigate(\`/ebooks/\${id}/read?pdfUrl=\${pdfUrl}&title=\${title}&back=\${back}\`);`;

if (src.includes(OLD_ONCLICK)) {
  src = src.replace(OLD_ONCLICK, NEW_ONCLICK);
  console.log('✅ Patch 1: READ button simplified to PDF-only');
} else {
  console.log('⚠️  Patch 1: onClick block not found (may already be patched or whitespace differs)');
}

// ── Patch 2: Replace conditional type label ────────────────────────────────
const OLD_LABEL = "{edition.image_folder ? 'FLIPBOOK' : 'PDF FLIPBOOK'}";
const NEW_LABEL = "{'PDF READER'}";

if (src.includes(OLD_LABEL)) {
  src = src.replace(OLD_LABEL, NEW_LABEL);
  console.log('✅ Patch 2: Edition type label unified to PDF READER');
} else {
  console.log('⚠️  Patch 2: label not found — may already be patched');
}

// ── Patch 3: Remove unused FileText import ────────────────────────────────
src = src.replace(
  "import { ArrowLeft, BookOpen, FileText } from 'lucide-react';",
  "import { ArrowLeft, BookOpen } from 'lucide-react';"
);

// ── Final check ───────────────────────────────────────────────────────────
if (src.includes('suvadi.cict.in')) {
  console.log('⚠️  WARNING: suvadi.cict.in still present!');
} else {
  console.log('✅ No suvadi.cict.in references remain');
}
if (src.includes('image_folder') && src.includes('navigate')) {
  console.log('⚠️  WARNING: image_folder still in navigate path!');
} else {
  console.log('✅ No image_folder references in navigate path');
}

fs.writeFileSync(file, src, 'utf8');
console.log('Done.');
