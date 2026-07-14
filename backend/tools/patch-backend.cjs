const fs = require('fs');
const path = require('path');

// 1. Update .env
const envPath = path.join(__dirname, 'backend', '.env');
let envStr = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';
if (!envStr.includes('STORAGE_PATH')) {
  envStr += '\nSTORAGE_PATH=D:\\storage\n';
}
if (!envStr.includes('SONGS_PATH')) {
  envStr += 'SONGS_PATH=D:\\songs\n';
}
fs.writeFileSync(envPath, envStr);
console.log('✅ Updated backend/.env');

// 2. Update index.js
const indexPath = path.join(__dirname, 'backend', 'index.js');
let indexStr = fs.readFileSync(indexPath, 'utf8');

// Replace static paths
const oldPaths = `const SONGS_PATH   = path.join(__dirname, '..', 'songs');
const WEBINC_PATH  = path.join(__dirname, '..', 'webinc');
const STORAGE_PATH = path.join(__dirname, '..', 'storage');`;

const newPaths = `const SONGS_PATH   = process.env.SONGS_PATH || path.join(__dirname, '..', 'songs');
const WEBINC_PATH  = path.join(__dirname, '..', 'webinc');
const STORAGE_PATH = process.env.STORAGE_PATH || path.join(__dirname, '..', 'storage');`;

if (indexStr.includes(oldPaths)) {
  indexStr = indexStr.replace(oldPaths, newPaths);
  console.log('✅ Patched index.js paths');
} else {
    // try line by line
    indexStr = indexStr.replace(
        "const SONGS_PATH   = path.join(__dirname, '..', 'songs');",
        "const SONGS_PATH   = process.env.SONGS_PATH || path.join(__dirname, '..', 'songs');"
    );
    indexStr = indexStr.replace(
        "const STORAGE_PATH = path.join(__dirname, '..', 'storage');",
        "const STORAGE_PATH = process.env.STORAGE_PATH || path.join(__dirname, '..', 'storage');"
    );
    console.log('✅ Patched index.js paths (fallback)');
}

// Update PDF endpoint
const newEndpoint = `
// NEW PDF server — looks up by edition ID
app.get('/api/proxy/pdf/:editionId', async (req, res) => {
  const { editionId } = req.params;
  try {
    const { rows } = await db.query(
      'SELECT local_pdf_url FROM sv_ebook_editions WHERE id = $1 LIMIT 1',
      [parseInt(editionId, 10)]
    );
    const edition = rows[0];

    if (!edition || !edition.local_pdf_url) {
      return res.status(404).json({ error: 'Edition not found' });
    }

    const filename = require('path').basename(edition.local_pdf_url);
    const localPath = require('path').join(STORAGE_PATH, 'pdfs', filename);

    try {
      const stats = await fs.promises.stat(localPath);
      if (!stats.isFile() || stats.size < 1024) throw new Error('File missing or too small');
    } catch (_) {
      return res.status(404).json({ error: 'PDF not available locally.' });
    }

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Expose-Headers', 'Accept-Ranges, Content-Range, Content-Length, Content-Type');
    return res.sendFile(localPath);
  } catch (err) {
    console.error('[PDF NEW] Error:', err.message);
    if (!res.headersSent) res.status(500).json({ error: err.message });
  }
});

`;

if (!indexStr.includes('/api/proxy/pdf/:editionId')) {
    indexStr = indexStr.replace(
        "// PDF server — serves PDFs exclusively from local storage",
        newEndpoint + "// DEPRECATED PDF server — serves PDFs exclusively from local storage"
    );
    console.log('✅ Injected new PDF endpoint');
}

// Fix old endpoint to use STORAGE_PATH instead of __dirname
indexStr = indexStr.replace(
    "const localPath = path.join(__dirname, '..', edition.local_pdf_url);",
    "const filename = path.basename(edition.local_pdf_url);\n    const localPath = path.join(STORAGE_PATH, 'pdfs', filename);"
);

fs.writeFileSync(indexPath, indexStr);
console.log('✅ index.js updated successfully.');
