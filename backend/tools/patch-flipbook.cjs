const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, 'frontend/src/pages/FlipbookReader.jsx');

let src = fs.readFileSync(file, 'utf8');

const OLD_VARS = `  const rawPdfUrl = params.get('pdfUrl');
  const bookTitle = params.get('title') || 'Edition';
  const backTo    = params.get('back')  || '/ebooks';

  // Backend proxy URL — serves PDF from local storage/pdfs/
  const proxyUrl = rawPdfUrl
    ? \`\${BACKEND}/api/proxy/pdf?url=\${encodeURIComponent(rawPdfUrl)}\`
    : null;`;

const NEW_VARS = `  const editionId = params.get('edition');
  const bookTitle = params.get('title') || 'Edition';
  const backTo    = params.get('back')  || '/ebooks';

  // Backend proxy URL — serves PDF directly by edition ID
  const proxyUrl = editionId
    ? \`\${BACKEND}/api/proxy/pdf/\${editionId}\`
    : null;`;

if (src.includes(OLD_VARS)) {
    src = src.replace(OLD_VARS, NEW_VARS);
    console.log("✅ Patched proxyUrl setup in FlipbookReader.jsx");
} else {
    console.log("⚠️  Could not find proxyUrl setup exactly. Trying a looser match.");
    // Fallback using loose replace
    src = src.replace("const rawPdfUrl = params.get('pdfUrl');", "const editionId = params.get('edition');");
    src = src.replace(
        "const proxyUrl = rawPdfUrl\n    ? `${BACKEND}/api/proxy/pdf?url=${encodeURIComponent(rawPdfUrl)}`\n    : null;",
        "const proxyUrl = editionId\n    ? `${BACKEND}/api/proxy/pdf/${editionId}`\n    : null;"
    );
    src = src.replace(
        "const proxyUrl = rawPdfUrl\r\n    ? `${BACKEND}/api/proxy/pdf?url=${encodeURIComponent(rawPdfUrl)}`\r\n    : null;",
        "const proxyUrl = editionId\r\n    ? `${BACKEND}/api/proxy/pdf/${editionId}`\r\n    : null;"
    );
}

fs.writeFileSync(file, src, 'utf8');
console.log('✅ FlipbookReader.jsx updated');
