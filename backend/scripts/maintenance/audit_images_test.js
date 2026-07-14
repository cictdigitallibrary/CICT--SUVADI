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
     ORDER BY s.id ASC LIMIT 2`
  );

  console.log(`Found ${rows.length} records to audit.`);

  let totalChecked = 0;
  let incorrectFixed = 0;
  let missingRestored = 0;
  let noImageOnLive = 0;
  let errors = 0;

  for (const row of rows) {
    totalChecked++;
    try {
      const form = new FormData();
      form.append('do', 'search');
      form.append('sfind', String(row.fid));
      form.append('book_id', String(row.book_id));
      form.append('category_id', String(row.category_id));
      form.append('sub_category_id', String(row.cid));
      form.append('iSearch', 'தேடுக');

      const res = await axios.post('https://suvadi.cict.in/suvadi/search.php', form, {
        headers: form.getHeaders(),
        httpsAgent
      });

      const match = res.data.match(/<img[^>]+id="iFile"[^>]+src=["']([^"']+)["']/i);
      
      if (match && match[1]) {
        let liveUrl = match[1];
        if (!liveUrl.startsWith('http')) {
          liveUrl = 'https://suvadi.cict.in/suvadi/' + liveUrl.replace(/^(\.\.\/)+/, '');
        }

        const fileName = path.basename(liveUrl); // e.g., 17266_41.jpg
        
        // Ensure directory exists
        const dirPath = path.join(SONGS_PATH, String(row.cid));
        if (!fs.existsSync(dirPath)) {
          fs.mkdirSync(dirPath, { recursive: true });
        }
        
        const localPath = path.join(dirPath, fileName);
        
        // 1. If it doesn't exist locally, download it
        if (!fs.existsSync(localPath)) {
          console.log(`[Missing] ${row.id} - Downloading ${liveUrl} to ${localPath}`);
          await downloadImage(liveUrl, localPath);
          missingRestored++;
        }

        // 2. If the filename in our DB is missing/wrong, update it
        if (row.filename !== fileName) {
           await pool.query('UPDATE sv_songs SET filename = $1 WHERE id = $2', [fileName, row.id]);
           incorrectFixed++;
        }

      } else {
        // No image on live site
        noImageOnLive++;
      }
    } catch (err) {
      console.error(`[Error] row ${row.id}:`, err.message);
      errors++;
    }

    if (totalChecked % 100 === 0) {
      console.log(`Progress: ${totalChecked} / ${rows.length}...`);
    }
    
    // Add small delay to avoid rate limiting
    await new Promise(r => setTimeout(r, 100));
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
