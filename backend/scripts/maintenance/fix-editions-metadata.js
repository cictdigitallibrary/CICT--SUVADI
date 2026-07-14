const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'db', 'suvadi.sqlite'));

const correctMeta = [
  // Pathinenkilkanakku (26-43)
  { id: 26, title_english: 'Thirukkural – First Edition (1812)',       editor: 'ஞானப்பிரகாசன்',               publisher: '', year: 1812, image_folder: null },
  { id: 27, title_english: 'Naladiyar – First Edition (1812)',         editor: 'ஞானப்பிரகாசன்',               publisher: '', year: 1812, image_folder: null },
  { id: 28, title_english: 'Iniyavai 40 – First Edition',             editor: '',                              publisher: '', year: null, image_folder: null },
  { id: 29, title_english: 'Asarakovai – First Edition (1857)',        editor: '',                              publisher: '', year: 1857, image_folder: null },
  { id: 30, title_english: 'Thirikadugam – First Edition (1868)',      editor: '',                              publisher: '', year: 1868, image_folder: null },
  { id: 31, title_english: 'Nanmanikadigai – First Edition (1872)',    editor: '',                              publisher: '', year: 1872, image_folder: null },
  { id: 32, title_english: 'Palamoli 400 – First Edition (1874)',      editor: '',                              publisher: '', year: 1874, image_folder: null },
  { id: 33, title_english: 'Sirupanjamoolam – First Edition (1875)',   editor: '',                              publisher: '', year: 1875, image_folder: null },
  { id: 34, title_english: 'Kalavazhi 40 – First Edition (1875)',      editor: '',                              publisher: '', year: 1875, image_folder: null },
  { id: 35, title_english: 'Kaar 40 – First Edition (1875)',           editor: '',                              publisher: '', year: 1875, image_folder: null },
  { id: 36, title_english: 'Inna 40 – First Edition (1881)',           editor: '',                              publisher: '', year: 1881, image_folder: null },
  { id: 37, title_english: 'Mudumozhikanchi – First Edition (1895)',   editor: '',                              publisher: '', year: 1895, image_folder: null },
  { id: 38, title_english: 'Elathi – First Edition (1887)',            editor: '',                              publisher: '', year: 1887, image_folder: null },
  { id: 39, title_english: 'Ainthinai 50 – First Edition (1903)',      editor: '',                              publisher: '', year: 1903, image_folder: null },
  { id: 40, title_english: 'Thinaimalai 150 – First Edition (1904)',   editor: '',                              publisher: '', year: 1904, image_folder: null },
  { id: 41, title_english: 'Ainthinai 70 – First Edition (1906)',      editor: '',                              publisher: '', year: 1906, image_folder: null },
  { id: 42, title_english: 'Thinaemoli 50 – First Edition (1918)',     editor: '',                              publisher: '', year: 1918, image_folder: null },
  { id: 43, title_english: 'Kainilai – First Edition (1931)',          editor: '',                              publisher: '', year: 1931, image_folder: null },

  // Silappatikaram (44-47)
  { id: 44, title_english: 'Cilappatikaram – Edition 1 (1872)',        editor: '',                              publisher: '', year: 1872, image_folder: 'silapathikaram_1872', total_pages: 306 },
  { id: 45, title_english: 'Cilappatikaram – Edition 2 (1876)',        editor: '',                              publisher: '', year: 1876, image_folder: 'silapathikaram_1876', total_pages: 56 },
  { id: 46, title_english: 'Cilappatikaram – Edition 3 (1880)',        editor: '',                              publisher: '', year: 1880, image_folder: 'silappathikaram_1880', total_pages: 423 },
  { id: 47, title_english: 'Cilappatikaram – U.Ve.Sa Edition (1892)', editor: 'உ.வே. சாமிநாதையர்',           publisher: '', year: 1892, image_folder: 'silampathikaram_1892', total_pages: 820 },

  // Muttollayiram (48)
  { id: 48, title_english: 'Muttollayiram – First Edition (1905)',     editor: '',                              publisher: '', year: 1905, image_folder: null },

  // Irayanar (49)
  { id: 49, title_english: 'Irayanar Agapporul – First Edition (1883)', editor: '',                             publisher: '', year: 1883, image_folder: null },
];

console.log('Fixing sv_ebook_editions...');

const update = db.prepare(`
  UPDATE sv_ebook_editions SET
    title_english = ?, editor = ?, publisher = ?, year_published = ?, image_folder = ?, total_pages = ?
  WHERE id = ?
`);

const resetImg = db.prepare(`UPDATE sv_ebook_editions SET image_folder = NULL, total_pages = NULL WHERE id BETWEEN 26 AND 43`);
resetImg.run();
console.log('Reset wrong image_folders for Pathinenkilkanakku.');

for (const e of correctMeta) {
  const total_pages = e.total_pages || null;
  update.run(e.title_english, e.editor, e.publisher, e.year, e.image_folder, total_pages, e.id);
  console.log(`Updated ID ${e.id} -> ${e.title_english}`);
}

console.log('Done.');
