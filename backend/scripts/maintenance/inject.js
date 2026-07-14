const fs = require('fs');

const map = JSON.parse(fs.readFileSync('cheerio_map.json', 'utf8'));
let content = fs.readFileSync('../frontend/src/utils/bookCovers.js', 'utf8');

const mapStr = Object.entries(map).map(([k, v]) => `  '${k}': '${v}',`).join('\n');

const replacement = `const COVER_MAP = {
${mapStr}
  // fallbacks
  'தொல்காப்பியம்': '/images/cover/Tholkappiyam.png',
  'எட்டுத்தொகை': '/images/cover/Ettuthogai.png',
  'பத்துப்பாட்டு': '/images/cover/Pathupaatu.png',
  'சிலப்பதிகாரம்': '/images/cover/silapadhikaram.png',
  'பதினெண் கீழ்க்கணக்கு': '/images/cover/pathinenkeezhkanaku.png',
  'முத்தொள்ளாயிரம்': '/images/cover/mutholayiram.png'
};`;

content = content.replace(/const COVER_MAP = \{[\s\S]*?\};/, replacement);
fs.writeFileSync('../frontend/src/utils/bookCovers.js', content);
console.log('Updated bookCovers.js');
