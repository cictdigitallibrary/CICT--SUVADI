// SUVADI deployment self-check. In Plesk "Run Node.js commands" enter: run diag
// Prints only non-secret facts — never passwords, secrets or tokens.
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const BACKEND = path.join(ROOT, 'backend');
const fromBackend = (m) => require(require.resolve(m, { paths: [BACKEND] }));

// Defence in depth for text this script did not compose (DB errors, log lines)
function redact(text) {
  let s = String(text);
  for (const k of ['DB_PASSWORD', 'JWT_SECRET', 'DATABASE_URL']) {
    const v = process.env[k];
    if (v && v.length >= 4) s = s.split(v).join(`<${k}>`);
  }
  return s.replace(/(postgres(?:ql)?:\/\/)[^@\s/]+@/gi, '$1<credentials>@');
}

(async () => {
  console.log('== Node');
  console.log('version:', process.version, '| execPath:', process.execPath);
  const defaultNode = path.join(process.env.ProgramFiles || 'C:\\Program Files', 'nodejs', 'node.exe');
  console.log('iisnode default node.exe exists:', fs.existsSync(defaultNode), `(${defaultNode})`);
  const yml = path.join(BACKEND, 'iisnode.yml');
  console.log('backend/iisnode.yml:', fs.existsSync(yml) ? fs.readFileSync(yml, 'utf8').trim() : 'MISSING (run: npm run deploy:plesk)');

  console.log('== web.config');
  const wcPath = path.join(ROOT, 'web.config');
  if (fs.existsSync(wcPath)) {
    const wc = fs.readFileSync(wcPath, 'utf8').replace(/<!--[\s\S]*?-->/g, '');
    console.log('iisnode handlers:', (wc.match(/<add [^>]*modules="iisnode"[^>]*>/g) || ['(none)']).join(' '));
    console.log('nodeProcessCommandLine:', (wc.match(/nodeProcessCommandLine="([^"]*)"/) || [, '(not set)'])[1]);
    console.log('configOverrides:', (wc.match(/configOverrides="([^"]*)"/) || [, '(not set — iisnode default)'])[1]);
    console.log('watchedFiles:', (wc.match(/watchedFiles="([^"]*)"/) || [, '(default)'])[1]);
  } else console.log('MISSING:', wcPath);

  console.log('== backend/.env (names only)');
  const envFile = path.join(BACKEND, '.env');
  if (fs.existsSync(envFile)) {
    const parsed = fromBackend('dotenv').parse(fs.readFileSync(envFile));
    console.log('keys:', Object.keys(parsed).join(', '));
    for (const [k, v] of Object.entries(parsed)) if (!(k in process.env)) process.env[k] = v;
    console.log('DB target:', `${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`);
  } else console.log('MISSING:', envFile);

  console.log('== Backend dependencies');
  for (const m of ['express', 'cors', 'helmet', 'morgan', 'pg', 'dotenv', 'jsonwebtoken', 'bcryptjs', 'multer', 'mammoth']) {
    try { require.resolve(m, { paths: [BACKEND] }); console.log('ok     ', m); } catch { console.log('MISSING', m); }
  }

  console.log('== Files');
  console.log('frontend/dist/index.html:', fs.existsSync(path.join(ROOT, 'frontend', 'dist', 'index.html')));
  const logDir = path.join(BACKEND, 'logs');
  try {
    fs.mkdirSync(logDir, { recursive: true });
    const probe = path.join(logDir, `.write-test-${process.pid}`);
    fs.writeFileSync(probe, ''); fs.unlinkSync(probe);
    console.log('backend/logs writable: true');
  } catch (e) { console.log('backend/logs writable: false', e.code); }

  console.log('== Latest application log (backend/logs)');
  try {
    const latest = fs.readdirSync(logDir).filter(f => /^app-.*\.log$/.test(f)).sort().pop();
    if (!latest) console.log('(no app log yet — the app has not started since this version was deployed)');
    else console.log(`--- ${latest} (last 40 lines)\n` + redact(fs.readFileSync(path.join(logDir, latest), 'utf8').trimEnd().split('\n').slice(-40).join('\n')));
  } catch { console.log('(no backend/logs folder)'); }

  console.log('== PostgreSQL');
  const { Client } = fromBackend('pg');
  const client = new Client({
    host: process.env.DB_HOST, port: parseInt(process.env.DB_PORT) || 5432,
    database: process.env.DB_NAME, user: process.env.DB_USER, password: process.env.DB_PASSWORD,
    connectionTimeoutMillis: 8000, application_name: 'suvadi-diag',
  });
  try {
    await client.connect();
    console.log('connected:', (await client.query('SELECT version()')).rows[0].version.split(',')[0]);
    console.log('max_connections:', (await client.query('SHOW max_connections')).rows[0].max_connections);
    const { rows } = await client.query(`
      SELECT coalesce(client_addr::text, 'local') AS client, coalesce(state, '?') AS state, count(*)::int AS n
      FROM pg_stat_activity WHERE backend_type = 'client backend'
      GROUP BY 1, 2 ORDER BY n DESC`);
    console.log('connections by client address / state:');
    rows.forEach(r => console.log(`  ${String(r.n).padStart(4)}  ${r.client}  ${r.state}`));
  } catch (e) {
    console.log(redact(`DB ERROR code=${e.code || ''} ${e.message}`));
  } finally {
    await client.end().catch(() => {});
  }
})();
