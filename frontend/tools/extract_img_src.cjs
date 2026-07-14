const https = require('https');
https.get('https://suvadi.cict.in/asp/manimekalai.aspx', (res) => {
  let d = '';
  res.on('data', c => d += c);
  res.on('end', () => console.log(d.match(/<img[^>]+src="([^"]+)"/g)));
});
