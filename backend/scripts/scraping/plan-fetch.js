const cheerio = require('cheerio');
const https = require('https');

const pages = [
  { url: 'https://suvadi.cict.in/asp/manimekalai.aspx', category: 'manimekalai' },
  { url: 'https://suvadi.cict.in/asp/irayanar.aspx', category: 'irayanar' }
];

function fetchText(url) {
  return new Promise((resolve, reject) => {
    https.get(url, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
      res.on('error', reject);
    }).on('error', reject);
  });
}

async function run() {
  const results = [];
  for (const page of pages) {
    const html = await fetchText(page.url);
    const $ = cheerio.load(html);
    
    $('a[href*="pdf/"]').each((i, el) => {
      const pdf = $(el).attr('href').replace(/^(\.\.\/)+/, '');
      const tr = $(el).closest('tr');
      const title = tr.find('td').eq(1).text().trim() || $(el).text().trim();
      
      let img = tr.find('img[src*="../images/"]').first();
      if (!img.length) img = tr.prev('tr').find('img[src*="../images/"]').first();
      if (!img.length) img = tr.next('tr').find('img[src*="../images/"]').first();
      
      const cover = img.length ? img.attr('src').replace(/^(\.\.\/)+/, '') : null;
      
      results.push({ category: page.category, title, pdf, cover });
    });
  }
  console.log(JSON.stringify(results, null, 2));
}

run().catch(console.error);
