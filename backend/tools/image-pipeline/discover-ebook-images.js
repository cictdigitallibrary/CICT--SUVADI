/**
 * discover-ebook-images.js
 * Probes the live suvadi.cict.in server to find image-based flipbook folders
 * for all 51 editions, then updates the sv_ebook_editions table with
 * image_base_url and total_pages fields.
 */
const https = require('https');
const Database = require('better-sqlite3');
const path = require('path');
require('dotenv').config();

const sqliteDbPath = path.join(__dirname, 'db', 'suvadi.sqlite');

// ── Known folder mappings (manually mapped from the live site URL patterns) ──
// Pattern: https://suvadi.cict.in/asp/ebooks/{folder}/files/mobile/{n}.jpg
const FOLDER_MAP = [
  // Tolkappiyam (book_id: 9)
  { pdf_hint: 'thol/1.1847',   folder: 'thol_1847'         },
  { pdf_hint: 'thol/2.1868',   folder: 'thol_1868_ezhuthu_ilam' },
  { pdf_hint: 'thol/3.1868',   folder: 'thol_1868_sol_sena' },
  { pdf_hint: 'thol/5.1927',   folder: 'thol_1927'         },
  { pdf_hint: 'thol/6.1982',   folder: 'thol_1892'         },
  { pdf_hint: 'thol/7.1929',   folder: 'thol_1929'         },
  { pdf_hint: 'thol/9.1920',   folder: 'thol_1920'         },
  { pdf_hint: 'thol/10.1933',  folder: 'thol_1933'         },
  { pdf_hint: 'thol/11.1935',  folder: 'thol_1935_a'       },
  { pdf_hint: 'thol/12.1985',  folder: 'thol_1885'         },
  { pdf_hint: 'thol/14.1917',  folder: 'thol_1917'         },
  { pdf_hint: 'thol/15.1858',  folder: 'thol_1858'         },
  { pdf_hint: 'thol_1935.pdf', folder: 'thol_1935'         },
  { pdf_hint: 'thol_porul_1917', folder: 'thol_porul_1917' },
  { pdf_hint: 'thol_sol_kal',  folder: 'thol_sol_kal'      },

  // Ettuthokai (book_id: 10)
  { pdf_hint: 'ettothokai/1.1915', folder: 'natrinai_1915' },
  { pdf_hint: 'ettothokai/2.1915', folder: 'kurunthokai_1915' },
  { pdf_hint: 'ettothokai/3.1903', folder: 'ainkurunuru_1903' },
  { pdf_hint: 'ettothokai/4.1904', folder: 'pathirrupathu_1904' },
  { pdf_hint: 'ettothokai/5.1918', folder: 'paripadal_1918' },
  { pdf_hint: 'ettothokai/6.1887', folder: 'kalithokai_1887' },
  { pdf_hint: 'ettothokai/7.1918', folder: 'agananuru_1918' },
  { pdf_hint: 'ettothokai/8.1894', folder: 'purananuru_1894' },

  // Pattupattu (book_id: 11)
  { pdf_hint: 'ettothokai/10-1889', folder: 'pathupatu_1889' },

  // Pathinenkilkanakku (book_id: 13)
  { pdf_hint: 'kilkanakku/1.thirukkural', folder: 'thirukkural_1812' },
  { pdf_hint: 'kilkanakku/2.naladiyar',   folder: 'naladiyar_1812'   },
  { pdf_hint: 'kilkanakku/iniyavai40',    folder: 'iniyavai40'       },
  { pdf_hint: 'kilkanakku/04.aasarakovai', folder: 'asarakovai_1857' },
  { pdf_hint: 'kilkanakku/thirukadugam',  folder: 'thirikadugam_1868'},
  { pdf_hint: 'kilkanakku/naamanikadigai', folder: 'nanmanikadigai_1872' },
  { pdf_hint: 'kilkanakku/7.palamoli400', folder: 'palamoli_1874'    },
  { pdf_hint: 'kilkanakku/sirupanjamoolam', folder: 'sirupanjamoolam_1875' },
  { pdf_hint: 'kilkanakku/9.kalavizhi40', folder: 'kalavali40_1875'  },
  { pdf_hint: 'kilkanakku/10.kaar40',     folder: 'kaar40_1875'      },
  { pdf_hint: 'kilkanakku/inna40',        folder: 'inna40_1881'      },
  { pdf_hint: 'kilkanakku/muthumozhikanchi', folder: 'mutumozhikanchi_1895' },
  { pdf_hint: 'kilkanakku/13.elathi',     folder: 'elathi_1887'      },
  { pdf_hint: 'kilkanakku/Aindhinai50',   folder: 'ainthinal50_1903' },
  { pdf_hint: 'kilkanakku/15.thinaimalai150', folder: 'thinaimalai150_1904' },
  { pdf_hint: 'kilkanakku/16.ainthenai70', folder: 'ainthinai70_1906' },
  { pdf_hint: 'kilkanakku/17.thinaimoli50', folder: 'thinaemoli50_1918' },
  { pdf_hint: 'kilkanakku/18.kainilai_1931', folder: 'kainilai_1931' },

  // Silappatikaram (book_id: 12)
  { pdf_hint: 'Silappathikaram/1.1872', folder: 'silampathikaram_1872' },
  { pdf_hint: 'Silappathikaram/2.1876', folder: 'silampathikaram_1876' },
  { pdf_hint: 'Silappathikaram/3.1880', folder: 'silampathikaram_1880' },
  { pdf_hint: 'Silappathikaram/silambu_1892', folder: 'silampathikaram_1892' },

  // Muttollaiyiram (book_id: 16)
  { pdf_hint: 'Mutholayiram/mutholayiram_1905', folder: 'mutholayiram_1905' },

  // Irayanar (book_id: 15)
  { pdf_hint: 'irayanar/irayanar', folder: 'irayanar_1883' },
];

// Fetch a URL and return text
function fetchText(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { timeout: 10000 }, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
      res.on('error', reject);
    }).on('error', reject).on('timeout', () => reject(new Error('Timeout')));
  });
}

// Extract totalPageCount from config.js
function extractPageCount(configText) {
  const match = configText.match(/bookConfig\.totalPageCount=(\d+)/);
  return match ? parseInt(match[1]) : null;
}

// Test if a folder exists on the server by fetching its config.js
async function probeFolder(folder) {
  const url = `https://suvadi.cict.in/asp/ebooks/${folder}/mobile/javascript/config.js`;
  try {
    const text = await fetchText(url);
    const pages = extractPageCount(text);
    return pages;
  } catch {
    return null;
  }
}

async function main() {
  const db = new Database(sqliteDbPath);

  // Add columns if not exist
  try { db.exec('ALTER TABLE sv_ebook_editions ADD COLUMN image_folder TEXT'); } catch {}
  try { db.exec('ALTER TABLE sv_ebook_editions ADD COLUMN total_pages INTEGER'); } catch {}

  const editions = db.prepare('SELECT id, pdf_url FROM sv_ebook_editions ORDER BY id').all();
  
  console.log(`\n📚 Probing ${editions.length} editions...\n`);
  
  const update = db.prepare('UPDATE sv_ebook_editions SET image_folder = ?, total_pages = ? WHERE id = ?');

  let found = 0;
  for (const edition of editions) {
    // Match to known folder map
    const mapping = FOLDER_MAP.find(m => edition.pdf_url.includes(m.pdf_hint));
    if (!mapping) {
      console.log(`  ⚠️  No folder mapping for: ${edition.pdf_url}`);
      continue;
    }

    const pages = await probeFolder(mapping.folder);
    if (pages) {
      update.run(mapping.folder, pages, edition.id);
      console.log(`  ✅ ${mapping.folder} → ${pages} pages`);
      found++;
    } else {
      console.log(`  ❌ Not found on server: ${mapping.folder}`);
    }

    // Small delay to not hammer the server
    await new Promise(r => setTimeout(r, 200));
  }

  db.close();
  console.log(`\n🎉 Done! Found image folders for ${found}/${editions.length} editions.`);
}

main().catch(console.error);
