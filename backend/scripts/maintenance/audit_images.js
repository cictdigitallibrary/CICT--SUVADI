const axios = require('axios');
const FormData = require('form-data');
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const https = require('https');

const pool = new Pool({ connectionString: 'postgresql://postgres:cict26@192.168.0.169:5432/suvadi' });
const SONGS_PATH = path.join(__dirname, '..', 'songs');

// For skipping self-signed cert errors if they arise on images
const httpsAgent = new https.Agent({ rejectUnauthorized: false });

async function downloadImage(url, dest) {
  const writer = fs.createWriteStream(dest);
  const response = await axios({
    url,
    method: 'GET',
    responseType: 'stream',
    httpsAgent
  });
  response.data.pipe(writer);
  return new Promise((resolve, reject) => {
    writer.on('finish', resolve);
    writer.on('error', reject);
  });
}

async function runAudit() {
  console.log('Fetching all manuscripts...');
  const { rows } = await pool.query(
    `SELECT s.id, s.fid, s.cid, s.filename,
            sc.main_category_id as category_id,
            mc.book_id
     FROM sv_songs s
     JOIN sv_sub_category sc ON sc.id = s.cid
     JOIN sv_main_category mc ON mc.cid = sc.main_category_id
     ORDER BY s.id ASC`
  );

  console.log(`Found ${rows.length} records to audit.`);

  let totalChecked = 5280;
  let incorrectFixed = 0;
  let missingRestored = 0;
  let noImageOnLive = 0;
  let errors = 0;

  const CHUNK_SIZE = 10;

  for (let i = 5280; i < rows.length; i += CHUNK_SIZE) {
    const chunk = rows.slice(i, i + CHUNK_SIZE);
    
    await Promise.all(chunk.map(async (row) => {
      let attempts = 0;
      while (attempts < 3) {
        try {
          const form = new FormData();
          form.append('do', 'search');
          form.append('sfind', String(row.fid));
          form.append('book_id', String(row.book_id));
          form.append('category_id', String(row.category_id));
          form.append('sub_category_id', String(row.cid));
          form.append('iSearch', 'தேடுக');

          const res = await axios.post('https://suvadi.cict.in/suvadi/search.php', form, {
            headers: {
              ...form.getHeaders(),
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
            },
            httpsAgent,
            timeout: 10000 // 10 second timeout
          });

          const match = res.data.match(/<img[^>]+id="iFile"[^>]+src=["']([^"']+)["']/i);
          
          if (match && match[1]) {
            let liveUrl = match[1];
            if (!liveUrl.startsWith('http')) {
              liveUrl = 'https://suvadi.cict.in/suvadi/' + liveUrl.replace(/^(\.\.\/)+/, '');
            }

            const fileName = path.basename(liveUrl); // e.g., 17266_41.jpg
            
            const dirPath = path.join(SONGS_PATH, String(row.cid));
            if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });
            
            const localPath = path.join(dirPath, fileName);
            
            if (!fs.existsSync(localPath)) {
              console.log(`[Missing] ${row.id} - Downloading ${liveUrl} to ${localPath}`);
              await downloadImage(liveUrl, localPath);
              missingRestored++;
            }

            if (row.filename !== fileName) {
               await pool.query('UPDATE sv_songs SET filename = $1 WHERE id = $2', [fileName, row.id]);
               incorrectFixed++;
            }
          } else {
            noImageOnLive++;
          }
          break; // Success, exit retry loop
        } catch (err) {
          attempts++;
          if (err.response && err.response.status === 403) {
             await new Promise(r => setTimeout(r, 2000)); // wait longer if blocked
          }
          if (attempts >= 3) {
            console.error(`[Error] row ${row.id} failed after 3 attempts:`, err.message);
            errors++;
          }
        }
      }
      totalChecked++;
    }));

    console.log(`Progress: ${totalChecked} / ${rows.length}...`);
    await new Promise(r => setTimeout(r, 500)); // Delay between chunks
  }

  console.log('--------------------------------------------------');
  console.log('AUDIT COMPLETE');
  console.log('Total manuscripts checked:', totalChecked);
  console.log('Incorrect mappings fixed (DB updated):', incorrectFixed);
  console.log('Missing images downloaded & restored:', missingRestored);
  console.log('Records with NO image on live site:', noImageOnLive);
  console.log('Errors:', errors);
  
  process.exit(0);
}

runAudit();
