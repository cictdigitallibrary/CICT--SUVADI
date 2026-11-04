// Writes backend/iisnode.yml so iisnode starts the same node.exe that ran this
// deploy (and therefore installed backend/node_modules). Run via
// `npm run deploy:plesk`; it never needs a hand-typed path.
//
// iisnode.yml is not real YAML: iisnode reads plain `key: value` lines and uses
// the value verbatim, so backslashes are NOT escaped. The double quotes become
// part of the command line, which keeps paths with spaces intact
// (same form as nodeProcessCommandLine="&quot;...&quot;" in web.config).
const fs = require('fs');
const path = require('path');

const exe = process.execPath;
// Reject paths iisnode's minimal parser or the command line could mangle
if (!/^[\x20-\x7E]+$/.test(exe) || /["#]/.test(exe)) {
  console.error(`Refusing to write iisnode.yml: unsupported characters in node path: ${exe}`);
  process.exit(1);
}

const target = path.join(__dirname, '..', 'backend', 'iisnode.yml');
const content = `nodeProcessCommandLine: "${exe}"\r\n`;

const current = fs.existsSync(target) ? fs.readFileSync(target, 'utf8') : null;
if (current === content) {
  console.log(`iisnode.yml unchanged: node ${process.version} at ${exe}`);
} else {
  fs.writeFileSync(target, content, 'ascii');
  console.log(`iisnode.yml written: node ${process.version} at ${exe}`);
}
