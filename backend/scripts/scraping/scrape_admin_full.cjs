const axios = require('axios');
const cheerio = require('cheerio');
const qs = require('qs');
const { Client } = require('pg');

const client = new Client({ connectionString: 'postgresql://postgres:cict26@192.168.0.169:5432/suvadi' });

async function run() {
    await client.connect();
    console.log('Connected to DB');

    try {
        console.log('Logging in...');
        const loginRes = await axios.post('https://suvadi.cict.in/suvadi/globals.php', qs.stringify({uname: 'admin', upass: 'suvadii@123', submit: 'Login'}));
        const cookie = loginRes.headers['set-cookie'][0].split(';')[0];
        console.log('Got cookie:', cookie);

        console.log('Fetching songs page...');
        const pageRes = await axios.get('https://suvadi.cict.in/suvadi/admin/views/songs/index.php', { headers: { Cookie: cookie }, maxContentLength: Infinity, maxBodyLength: Infinity });
        
        const $ = cheerio.load(pageRes.data);
        const rows = $('#dataTable tbody tr');
        console.log('Total rows scraped:', rows.length);

        let inserted = 0;
        let updated = 0;
        let unchanged = 0;
        let failed = 0;

        for (let i = 0; i < rows.length; i++) {
            const cols = $(rows[i]).find('td');
            if (cols.length < 5) continue;

            const idStr = $(cols[0]).text().trim();
            const subCategory = $(cols[1]).text().trim();
            const fname = $(cols[2]).html().trim(); // song text
            const statusHtml = $(cols[3]).html();
            const createdAtStr = $(cols[4]).text().trim();

            const id = parseInt(idStr, 10);
            if (isNaN(id)) continue;

            let status = '0';
            if (statusHtml.includes('green')) status = '1';

            // Parse Date: DD-MM-YYYY hh:mm A
            let upload_date = null;
            if (createdAtStr) {
                const match = createdAtStr.match(/(\d{2})-(\d{2})-(\d{4}) (\d{2}):(\d{2}) (AM|PM)/);
                if (match) {
                    let [ , d, m, y, h, min, ampm ] = match;
                    let hour = parseInt(h, 10);
                    if (ampm === 'PM' && hour < 12) hour += 12;
                    if (ampm === 'AM' && hour === 12) hour = 0;
                    
                    upload_date = `${y}-${m}-${d} ${hour.toString().padStart(2, '0')}:${min}:00`;
                }
            }

            try {
                const res = await client.query('SELECT id, fname, status, CAST(upload_date AS text) as upload_date FROM sv_songs WHERE id = $1', [id]);
                if (res.rows.length === 0) {
                    // Fix null constraints by adding fid, cid, group_id defaults based on id 23207
                    await client.query('INSERT INTO sv_songs (id, fid, cid, group_id, filename, filetype, fname, status, upload_date) VALUES ($1, 39, 38, 23202, $2, $3, $4, $5, $6)', [id, '', 'image/jpeg', fname, status, upload_date]);
                    inserted++;
                } else {
                    const row = res.rows[0];
                    let needsUpdate = false;
                    let updates = [];
                    let values = [];
                    let vIdx = 1;

                    // don't overwrite with empty
                    if (fname && row.fname !== fname) {
                        updates.push(`fname = $${vIdx++}`);
                        values.push(fname);
                        needsUpdate = true;
                    }
                    if (status && row.status !== status) {
                        updates.push(`status = $${vIdx++}`);
                        values.push(status);
                        needsUpdate = true;
                    }
                    
                    if (upload_date) {
                        let existingDate = row.upload_date ? row.upload_date.substring(0, 19) : null;
                        if (existingDate !== upload_date) {
                            updates.push(`upload_date = $${vIdx++}`);
                            values.push(upload_date);
                            needsUpdate = true;
                        }
                    }

                    if (needsUpdate) {
                        values.push(id);
                        await client.query(`UPDATE sv_songs SET ${updates.join(', ')} WHERE id = $${vIdx}`, values);
                        updated++;
                    } else {
                        unchanged++;
                    }
                }
            } catch (err) {
                console.error('Failed on id', id, err.message);
                failed++;
            }
        }

        console.log('--- SYNC REPORT ---');
        console.log('Total scraped:', rows.length);
        console.log('Inserted:', inserted);
        console.log('Updated:', updated);
        console.log('Unchanged:', unchanged);
        console.log('Failed:', failed);

    } catch (e) {
        console.error(e);
    } finally {
        await client.end();
    }
}
run();
