const html = require('fs').readFileSync('songs.html', 'utf8');
const cheerio = require('cheerio');
const $ = cheerio.load(html);
console.log('Row count:', $('#dataTable tbody tr').length);
