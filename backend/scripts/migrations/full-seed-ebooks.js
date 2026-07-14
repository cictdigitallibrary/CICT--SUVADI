/**
 * full-seed-ebooks.js
 * 
 * Adds missing columns to sv_book and sv_ebook_editions,
 * then seeds all data needed for the ebooks flipbook feature:
 *  - sv_book: title_english, description_tamil, description_english, cover_image, first_edition_year
 *  - sv_ebook_editions: title_english, editor, publisher, year_published
 *  - image_folder + total_pages (already exists, will not overwrite non-null values)
 *  - Also probes the live server for missing image folders (Silappatikaram)
 */

const Database = require('better-sqlite3');
const https    = require('https');
const path     = require('path');

const db = new Database(path.join(__dirname, 'db', 'suvadi.sqlite'));

/* ── 1. Add missing columns ── */
const addCol = (table, col, type, defaultVal = 'NULL') => {
  try {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${col} ${type} DEFAULT ${defaultVal}`);
    console.log(`  ✅ Added ${table}.${col}`);
  } catch (e) {
    if (!e.message.includes('duplicate column')) throw e;
    console.log(`  ℹ️  ${table}.${col} already exists`);
  }
};

console.log('\n📦 Adding missing columns...');
addCol('sv_book', 'title_english',        'TEXT');
addCol('sv_book', 'description_tamil',    'TEXT');
addCol('sv_book', 'description_english',  'TEXT');
addCol('sv_book', 'cover_image',          'TEXT');
addCol('sv_book', 'first_edition_year',   'INTEGER');
addCol('sv_ebook_editions', 'title_english', 'TEXT');
addCol('sv_ebook_editions', 'editor',        'TEXT');
addCol('sv_ebook_editions', 'publisher',     'TEXT');
addCol('sv_ebook_editions', 'year_published','INTEGER');

/* ── 2. sv_book data ── */
const books = [
  {
    book_id: 9,
    title_english:       'Tolkappiyam',
    description_tamil:   'தொல்காப்பியம் தமிழின் மிகப் பழமையான இலக்கண நூலாகும். இதன் முதல் அச்சுப் பதிப்பு 1847இல் மழைவை மகாலிங்கையரால் வெளியிடப்பட்டது.',
    description_english: 'Tolkappiyam is the oldest surviving grammar of Tamil. Its first printed edition appeared in 1847, edited by Mazhaivai Mahalinga Iyer.',
    cover_image:         null,
    first_edition_year:  1847,
  },
  {
    book_id: 10,
    title_english:       'Ettuthokai',
    description_tamil:   'எட்டுத்தொகை சங்க இலக்கியத்தின் எட்டு தொகுப்பு நூல்களை உள்ளடக்கியது. கலித்தொகை 1887இல் முதன்முதலாக அச்சிடப்பட்டது.',
    description_english: 'Ettuthokai is a collection of eight Sangam anthologies. Kalitogai was the first to be printed in 1887 by C.W. Damodaram Pillai.',
    cover_image:         null,
    first_edition_year:  1887,
  },
  {
    book_id: 11,
    title_english:       'Pattupattu',
    description_tamil:   'பத்துப்பாட்டு சங்க இலக்கியத்தில் உள்ள பத்து நெடும் பாடல்களின் தொகுப்பாகும். இதன் முதல் அச்சுப் பதிப்பு 1889இல் வெளிவந்தது.',
    description_english: 'Pattupattu is a collection of ten long poems of Sangam literature. Its first printed edition appeared in 1889.',
    cover_image:         null,
    first_edition_year:  1889,
  },
  {
    book_id: 12,
    title_english:       'Cilappatikaram',
    description_tamil:   'சிலப்பதிகாரம் தமிழின் முதல் காப்பியமாகும். 1872இல் இது முதன்முதலாக அச்சு வடிவம் பெற்றது.',
    description_english: 'Cilappatikaram is the first Tamil epic poem. It was first printed in 1872.',
    cover_image:         null,
    first_edition_year:  1872,
  },
  {
    book_id: 13,
    title_english:       'Pathinenkilkanakku',
    description_tamil:   'பதினெண் கீழ்க்கணக்கு நூல்களுள் திருக்குறளும் நாலடியாரும் 1812இல் தமிழ் நூல்களில் முதன்முதலாக அச்சிடப்பட்டன.',
    description_english: 'Among the Pathinenkilkanakku texts, Thirukkural and Naladiyar were the very first Tamil works to be printed, in 1812.',
    cover_image:         null,
    first_edition_year:  1812,
  },
  {
    book_id: 15,
    title_english:       'Irayanar Agapporul',
    description_tamil:   'இறையனார் களவியல் உரை 1883இல் முதன்முதலாக அச்சு வடிவம் பெற்றது.',
    description_english: 'The first printed edition of Irayanar Agapporul commentary appeared in 1883.',
    cover_image:         null,
    first_edition_year:  1883,
  },
  {
    book_id: 16,
    title_english:       'Muttollayiram',
    description_tamil:   'முத்தொள்ளாயிரம் 1905இல் முதன்முதலாக அச்சு வடிவம் பெற்றது.',
    description_english: 'Muttollayiram was first printed in 1905.',
    cover_image:         null,
    first_edition_year:  1905,
  },
];

console.log('\n📚 Seeding sv_book English metadata...');
const updateBook = db.prepare(`
  UPDATE sv_book SET
    title_english = ?, description_tamil = ?, description_english = ?,
    cover_image = ?, first_edition_year = ?
  WHERE book_id = ?
`);
for (const b of books) {
  updateBook.run(b.title_english, b.description_tamil, b.description_english, b.cover_image, b.first_edition_year, b.book_id);
  console.log(`  ✅ book_id=${b.book_id} → ${b.title_english}`);
}

/* ── 3. sv_ebook_editions extra metadata ── */
const editionMeta = [
  // Tolkappiyam (book_id: 9)
  { id: 1,  title_english: 'Tolkappiyam – Eluthu – Nacch. – Mahalinga Iyer (1847)',        editor: 'மழைவை மகாலிங்கையர்',               publisher: 'சரஸ்வதி மஹால் அச்சகம்',         year: 1847 },
  { id: 2,  title_english: 'Tolkappiyam – Eluthu – Ilam. – Subbarai Chettiyar (1868)',     editor: 'சுப்பராய செட்டியார்',               publisher: '',                              year: 1868 },
  { id: 3,  title_english: 'Tolkappiyam – Sol. Sena. – Gomala Iyer (1868)',                editor: 'கோமளபுரம் இராசகோபால பிள்ளை',       publisher: '',                              year: 1868 },
  { id: 4,  title_english: 'Tolkappiyam – Sol. Ilam. – K. Namachivaiyam (1927)',           editor: 'கா. நமச்சிவாய முதலியார்',            publisher: 'கழக வெளியீடு',                  year: 1927 },
  { id: 5,  title_english: 'Tolkappiyam – Sol. Nacch. – Dhamodaram (1892)',                editor: 'சி.வை. தாமோதரம் பிள்ளை',           publisher: '',                              year: 1892 },
  { id: 6,  title_english: 'Tolkappiyam – Sol. Deivam. – Aranga Venkata (1929)',           editor: 'அரங்க வேங்கடாசலம்',                publisher: 'கரத்நாத தமிழ்ச் சங்கம்',       year: 1929 },
  { id: 7,  title_english: 'Tolkappiyam – Porul. Ilam. – K. Namachivaiyam (1920)',        editor: 'கா. நமச்சிவாய முதலியார்',            publisher: '',                              year: 1920 },
  { id: 8,  title_english: 'Tolkappiyam – Porul. Ilam. Kalavu & Karpu – V.U.C.P. (1933)', editor: 'வ.உ. சிதம்பரம் பிள்ளை',            publisher: '',                              year: 1933 },
  { id: 9,  title_english: 'Tolkappiyam – Porul. Ilam. Mey, Uva, Sey, Marpu – V.U.C.P. (1935)', editor: 'வ.உ. சிதம்பரம் பிள்ளை',     publisher: '',                              year: 1935 },
  { id: 10, title_english: 'Tolkappiyam – Porul. Nacch. – Damodaram (1885)',               editor: 'சி.வை. தாமோதரம் பிள்ளை',           publisher: '',                              year: 1885 },
  { id: 11, title_english: 'Tolkappiyam – Porul. Last 4 Iyal – Damodaram (1885)',         editor: 'சி.வை. தாமோதரம் பிள்ளை',           publisher: '',                              year: 1885 },
  { id: 12, title_english: 'Tolkappiyam – Porul. Seyyu. Nacch. – Raghava Iyer (1917)',    editor: 'ரா. இராகவையங்கார்',                publisher: '',                              year: 1917 },
  { id: 13, title_english: 'Tolkappiyam – Nannul Mulam – Samuel Pillai (1858)',            editor: 'எஸ். சாமுவேல் பிள்ளை',              publisher: '',                              year: 1858 },
  { id: 14, title_english: 'Tolkappiyam – Porul. Ilam. (1935, Alt.)',                      editor: 'வ.உ. சிதம்பரம் பிள்ளை',            publisher: '',                              year: 1935 },
  { id: 15, title_english: 'Tolkappiyam – Porul. Perasiriyar – Pavanandam (1917)',        editor: 'ச. பவானந்தம் பிள்ளை',               publisher: '',                              year: 1917 },
  { id: 16, title_english: 'Tolkappiyam – Sol. Kalladanar Urai (1964)',                    editor: 'கல்லாடனார்',                         publisher: '',                              year: 1964 },

  // Ettuthokai (book_id: 10)
  { id: 17, title_english: 'Natrinai – First Edition (1915)',          editor: 'ந.மு. வேங்கடசாமி நாட்டார்',   publisher: '', year: 1915 },
  { id: 18, title_english: 'Kurunthokai – First Edition (1915)',       editor: 'சௌரிப்பெருமாள் அரங்கனார்',    publisher: '', year: 1915 },
  { id: 19, title_english: 'Ainkurunuru – First Edition (1903)',       editor: '',                              publisher: '', year: 1903 },
  { id: 20, title_english: 'Pathirrupathu – First Edition (1904)',     editor: '',                              publisher: '', year: 1904 },
  { id: 21, title_english: 'Paripadal – First Edition (1918)',         editor: '',                              publisher: '', year: 1918 },
  { id: 22, title_english: 'Kalithokai – First Edition (1887)',        editor: 'சி.வை. தாமோதரம் பிள்ளை',     publisher: '', year: 1887 },
  { id: 23, title_english: 'Agananuru – First Edition (1918)',         editor: '',                              publisher: '', year: 1918 },
  { id: 24, title_english: 'Purananuru – First Edition (1894)',        editor: '',                              publisher: '', year: 1894 },

  // Pattupattu (book_id: 11)
  { id: 25, title_english: 'Pattupattu – First Edition (1889)',        editor: 'உ.வே. சாமிநாதையர்',           publisher: '', year: 1889 },

  // Silappatikaram (book_id: 12)
  { id: 26, title_english: 'Cilappatikaram – Edition 1 (1872)',        editor: '',                              publisher: '', year: 1872 },
  { id: 27, title_english: 'Cilappatikaram – Edition 2 (1876)',        editor: '',                              publisher: '', year: 1876 },
  { id: 28, title_english: 'Cilappatikaram – Edition 3 (1880)',        editor: '',                              publisher: '', year: 1880 },
  { id: 29, title_english: 'Cilappatikaram – U.Ve.Sa Edition (1892)', editor: 'உ.வே. சாமிநாதையர்',           publisher: '', year: 1892 },

  // Pathinenkilkanakku (book_id: 13)
  { id: 30, title_english: 'Thirukkural – First Edition (1812)',       editor: 'ஞானப்பிரகாசன்',               publisher: '', year: 1812 },
  { id: 31, title_english: 'Naladiyar – First Edition (1812)',         editor: 'ஞானப்பிரகாசன்',               publisher: '', year: 1812 },
  { id: 32, title_english: 'Iniyavai 40 – First Edition',             editor: '',                              publisher: '', year: null },
  { id: 33, title_english: 'Asarakovai – First Edition (1857)',        editor: '',                              publisher: '', year: 1857 },
  { id: 34, title_english: 'Thirikadugam – First Edition (1868)',      editor: '',                              publisher: '', year: 1868 },
  { id: 35, title_english: 'Nanmanikadigai – First Edition (1872)',    editor: '',                              publisher: '', year: 1872 },
  { id: 36, title_english: 'Palamoli 400 – First Edition (1874)',      editor: '',                              publisher: '', year: 1874 },
  { id: 37, title_english: 'Sirupanjamoolam – First Edition (1875)',   editor: '',                              publisher: '', year: 1875 },
  { id: 38, title_english: 'Kalavazhi 40 – First Edition (1875)',      editor: '',                              publisher: '', year: 1875 },
  { id: 39, title_english: 'Kaar 40 – First Edition (1875)',           editor: '',                              publisher: '', year: 1875 },
  { id: 40, title_english: 'Inna 40 – First Edition (1881)',           editor: '',                              publisher: '', year: 1881 },
  { id: 41, title_english: 'Mudumozhikanchi – First Edition (1895)',   editor: '',                              publisher: '', year: 1895 },
  { id: 42, title_english: 'Elathi – First Edition (1887)',            editor: '',                              publisher: '', year: 1887 },
  { id: 43, title_english: 'Ainthinai 50 – First Edition (1903)',      editor: '',                              publisher: '', year: 1903 },
  { id: 44, title_english: 'Thinaimalai 150 – First Edition (1904)',   editor: '',                              publisher: '', year: 1904 },
  { id: 45, title_english: 'Ainthinai 70 – First Edition (1906)',      editor: '',                              publisher: '', year: 1906 },
  { id: 46, title_english: 'Thinaemoli 50 – First Edition (1918)',     editor: '',                              publisher: '', year: 1918 },
  { id: 47, title_english: 'Kainilai – First Edition (1931)',          editor: '',                              publisher: '', year: 1931 },

  // Irayanar (book_id: 15)
  { id: 48, title_english: 'Irayanar Agapporul – First Edition (1883)', editor: '',                             publisher: '', year: 1883 },

  // Muttollayiram (book_id: 16)
  { id: 49, title_english: 'Muttollayiram – First Edition (1905)',     editor: '',                              publisher: '', year: 1905 },
];

console.log('\n📖 Seeding sv_ebook_editions metadata...');
const updateEdition = db.prepare(`
  UPDATE sv_ebook_editions SET
    title_english = ?, editor = ?, publisher = ?, year_published = ?
  WHERE id = ?
`);
for (const e of editionMeta) {
  try {
    updateEdition.run(e.title_english, e.editor, e.publisher, e.year, e.id);
    console.log(`  ✅ id=${e.id} → ${e.title_english}`);
  } catch (err) {
    console.log(`  ⚠️  id=${e.id}: ${err.message}`);
  }
}

/* ── 4. Probe for Silappatikaram image folders ── */
function fetchText(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { timeout: 8000 }, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => resolve(d));
      res.on('error', reject);
    }).on('error', reject).on('timeout', () => reject(new Error('timeout')));
  });
}

function extractPageCount(text) {
  const m = text.match(/bookConfig\.totalPageCount=(\d+)/);
  return m ? parseInt(m[1]) : null;
}

// Known possible Silappatikaram folder names from the live site
const silaFolders = [
  { id: 26, folder: 'silampathikaram_1872' },
  { id: 26, folder: 'silapathikaram_1872' },
  { id: 26, folder: 'silappathikaram_1872' },
  { id: 27, folder: 'silampathikaram_1876' },
  { id: 27, folder: 'silapathikaram_1876' },
  { id: 27, folder: 'silappathikaram_1876' },
  { id: 28, folder: 'silampathikaram_1880' },
  { id: 28, folder: 'silappathikaram_1880' },
  { id: 29, folder: 'silampathikaram_1892' },
  { id: 29, folder: 'silappathikaram_1892' },
];

const updateImageFolder = db.prepare('UPDATE sv_ebook_editions SET image_folder = ?, total_pages = ? WHERE id = ? AND image_folder IS NULL');

async function probeAll() {
  console.log('\n🌐 Probing Silappatikaram image folders on live server...');
  const tried = new Set();
  for (const { id, folder } of silaFolders) {
    if (tried.has(`${id}-done`)) continue;
    const url = `https://suvadi.cict.in/asp/ebooks/${folder}/mobile/javascript/config.js`;
    try {
      const text = await fetchText(url);
      const pages = extractPageCount(text);
      if (pages) {
        updateImageFolder.run(folder, pages, id);
        console.log(`  ✅ id=${id} → ${folder} (${pages} pages)`);
        tried.add(`${id}-done`);
      }
    } catch {}
    await new Promise(r => setTimeout(r, 150));
  }

  /* ── Final summary ── */
  const stats = db.prepare('SELECT book_id, COUNT(*) cnt, SUM(CASE WHEN image_folder IS NOT NULL THEN 1 ELSE 0 END) img FROM sv_ebook_editions GROUP BY book_id').all();
  console.log('\n📊 Final summary:');
  stats.forEach(s => console.log(`  book_id=${s.book_id}: ${s.img}/${s.cnt} editions have image folder`));

  db.close();
  console.log('\n✅ All done!');
}

probeAll().catch(console.error);
