const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, 'frontend/src/pages/EBookDetail.jsx');

let src = fs.readFileSync(file, 'utf8');

const OLD_NAVIGATE = `                          // All editions read from local storage via backend PDF proxy
                          const back   = encodeURIComponent(\`/ebooks/\${id}\`);
                          const title  = encodeURIComponent(edition.title_tamil);
                          const pdfUrl = encodeURIComponent(edition.pdf_url);
                          navigate(\`/ebooks/\${id}/read?pdfUrl=\${pdfUrl}&title=\${title}&back=\${back}\`);`;

const NEW_NAVIGATE = `                          // All editions read from local storage via backend PDF proxy
                          const back  = encodeURIComponent(\`/ebooks/\${id}\`);
                          const title = encodeURIComponent(edition.title_tamil);
                          navigate(\`/ebooks/\${id}/read?edition=\${edition.id}&title=\${title}&back=\${back}\`);`;

if (src.includes(OLD_NAVIGATE)) {
  src = src.replace(OLD_NAVIGATE, NEW_NAVIGATE);
  console.log('✅ Patched navigate to use edition id');
} else {
  console.log('⚠️  Could not find target navigate block. Let\'s try a looser match.');
  src = src.replace(
      "const pdfUrl = encodeURIComponent(edition.pdf_url);\n                          navigate(`/ebooks/${id}/read?pdfUrl=${pdfUrl}&title=${title}&back=${back}`);",
      "navigate(`/ebooks/${id}/read?edition=${edition.id}&title=${title}&back=${back}`);"
  );
  if (!src.includes("?edition=${edition.id}")) {
      // Third attempt
      src = src.replace(
          "const pdfUrl = encodeURIComponent(edition.pdf_url);\r\n                          navigate(`/ebooks/${id}/read?pdfUrl=${pdfUrl}&title=${title}&back=${back}`);",
          "navigate(`/ebooks/${id}/read?edition=${edition.id}&title=${title}&back=${back}`);"
      );
  }
}

fs.writeFileSync(file, src, 'utf8');
console.log('✅ EBookDetail.jsx updated');
