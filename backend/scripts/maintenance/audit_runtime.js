const axios = require('axios');
const http = require('http');

const agent = new http.Agent({ keepAlive: true });

async function run() {
  let broken = 0, checked = 0;
  try {
    const res = await axios.get('http://127.0.0.1:3001/api/texts');
    const books = res.data;
    
    for (const book of books) {
      console.log(`Checking book ${book.id}...`);
      const subs = await axios.get(`http://127.0.0.1:3001/api/manuscripts?book_id=${book.id}`);
      
      for (const sub of subs.data) {
        const songs = await axios.get(`http://127.0.0.1:3001/api/songs?sub_id=${sub.id}&limit=10000`);
        
        for (const song of songs.data.results) {
          checked++;
          if (!song.image_url) {
            broken++;
            console.log(`[Missing URL] id: ${song.id}, fid: ${song.page_number}`);
            continue;
          }
          
          try {
            await axios.head(`http://127.0.0.1:3001${song.image_url}`, { httpAgent: agent });
          } catch (e) {
            broken++;
            console.log(`[Broken Link] id: ${song.id}, fid: ${song.page_number}, url: ${song.image_url}, status: ${e.response?.status || e.message}`);
          }
        }
      }
    }
    console.log(`\nAudit Complete! Checked: ${checked}, Broken: ${broken}`);
  } catch(e) {
    console.error('Error fetching texts:', e.message);
  }
}
run();