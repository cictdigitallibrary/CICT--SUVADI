const fs = require('fs');
const https = require('https');
const path = require('path');

const covers = [
  {
    id: 50,
    url: 'https://suvadi.cict.in/images/manimekalai/small%20cover%20page/1894.jpg'
  },
  {
    id: 51,
    url: 'https://suvadi.cict.in/images/manimekalai/small%20cover%20page/1898.jpg' // Used a different image if available, else 1894
  },
  {
    id: 49,
    url: 'https://suvadi.cict.in/images/irayanar/book%20cover.jpg'
  }
];

function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    const file = fs.createWriteStream(dest);
    https.get(url, (response) => {
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve();
      });
    }).on('error', (err) => {
      fs.unlink(dest, () => {});
      reject(err);
    });
  });
}

async function run() {
  for (const cover of covers) {
    const dest = path.join(__dirname, '..', 'frontend', 'public', 'images', 'cover', 'editions', `edition_${cover.id}.jpg`);
    console.log(`Downloading ${cover.url} to ${dest}`);
    await downloadFile(cover.url, dest);
  }
  console.log('Done!');
}

run().catch(console.error);
