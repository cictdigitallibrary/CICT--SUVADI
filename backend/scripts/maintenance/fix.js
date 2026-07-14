const fs = require('fs');
let code = fs.readFileSync('index.js', 'utf8');
const start = code.indexOf('// Reads the first 4 bytes of a file');
const end = code.indexOf('// ── Book image / English name maps');
if (start > 0 && end > start) {
  code = code.substring(0, start) + `// Reads the first 4 bytes of a file and returns false if it is a PNG.
function isRealScan(filePath) {
  try {
    const buf = Buffer.alloc(4);
    const fd2 = fs.openSync(filePath, 'r');
    fs.readSync(fd2, buf, 0, 4, 0);
    fs.closeSync(fd2);
    return !(buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4E && buf[3] === 0x47);
  } catch { return false; }
}

function resolveAdminImage(cid, id, filename, group_id) {
  if (!filename) return { url: null, actual_filename: null, is_missing: true };
  const cidStr = String(cid);
  const filePath = require('path').join(__dirname, '..', 'songs', cidStr, filename);
  if (fs.existsSync(filePath) && isRealScan(filePath)) {
    return { url: \`/songs/\${cidStr}/\${filename}\`, actual_filename: filename, is_missing: false };
  }
  return { url: null, actual_filename: null, is_missing: true };
}

` + code.substring(end);
  fs.writeFileSync('index.js', code);
  console.log('Fixed');
}
