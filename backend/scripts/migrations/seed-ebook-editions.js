const Database = require('better-sqlite3');
const { Client } = require('pg');
const path = require('path');
require('dotenv').config();

const sqliteDbPath = path.join(__dirname, 'db', 'suvadi.sqlite');
const pgUrl = process.env.DATABASE_URL;

// All 51 editions extracted from the live site
const editions = [
  // 1. Tolkappiyam (Parent ID: 9)
  { book_id: 9, title: 'தொல்காப்பியம் - எழுத்து – நச்சர். – மழைவை மகாலிங்கையர் (1847)', pdf: 'https://suvadi.cict.in/asp/pdf/thol/1.1847.pdf' },
  { book_id: 9, title: 'தொல்காப்பியம் - எழுத்து – இளம். – சுப்பராய செட்டியார் (1868)', pdf: 'https://suvadi.cict.in/asp/pdf/thol/2.1868.pdf' },
  { book_id: 9, title: 'தொல்காப்பியம் - சொல். சேனா. – கோமளபுரம் இராசகோபால பிள்ளை ( 1868)', pdf: 'https://suvadi.cict.in/asp/pdf/thol/3.1868.pdf' },
  { book_id: 9, title: 'தொல்காப்பியம் - சொல் – இளம் – கா. நமச்சிவாய முதலியார் (1927)', pdf: 'https://suvadi.cict.in/asp/pdf/thol/5.1927.pdf' },
  { book_id: 9, title: 'தொல்காப்பியம் - சொல் – நச்சர். – சி.வை. தாமோதரம் பிள்ளை (1892)', pdf: 'https://suvadi.cict.in/asp/pdf/thol/6.1982.pdf' },
  { book_id: 9, title: 'தொல்காப்பியம் - சொல் – தெய்வ. - அரங்க வேங்கடாசலம் (1929)', pdf: 'https://suvadi.cict.in/asp/pdf/thol/7.1929.pdf' },
  { book_id: 9, title: 'தொல்காப்பியம் - பொருள் – இளம் – அகம், புறம் – கா. நமச்சிவாய முதலியார் (1920)', pdf: 'https://suvadi.cict.in/asp/pdf/thol/9.1920.pdf' },
  { book_id: 9, title: 'தொல்காப்பியம் - பொருள் – இளம் - களவு, கற்பு, பொருளியல் – வ.உ. சிதம்பரம் பிள்ளை (1933)', pdf: 'https://suvadi.cict.in/asp/pdf/thol/10.1933.pdf' },
  { book_id: 9, title: 'தொல்காப்பியம் - பொருள் – இளம் - மெய், உவ, செய், மரபு - வ.உ. சிதம்பரம் பிள்ளை (1935)', pdf: 'https://suvadi.cict.in/asp/pdf/thol/11.1935.pdf' },
  { book_id: 9, title: 'தொல்காப்பியம் - பொருள் – நச்சர். - சி.வை. தாமோதரம் பிள்ளை (1885)', pdf: 'https://suvadi.cict.in/asp/pdf/thol/12.1985.pdf' },
  { book_id: 9, title: 'தொல்காப்பியம் - பொருள் – பின்னான்கு இயல், பேரா. சி.வை. தாமோதரம் பிள்ளை (1885)', pdf: 'https://suvadi.cict.in/asp/pdf/thol/12.1985.pdf' },
  { book_id: 9, title: 'தொல்காப்பியம் - பொருள் – செய்யு. நச்சர். ரா. இராகவையங்கார் (1917)', pdf: 'https://suvadi.cict.in/asp/pdf/thol/14.1917.pdf' },
  { book_id: 9, title: 'தொல்காப்பியம் - நன்னூல் மூலம் – எஸ். சாமுவேல் பிள்ளை - (1858)', pdf: 'https://suvadi.cict.in/asp/pdf/thol/15.1858.pdf' },
  { book_id: 9, title: 'தொல்காப்பியம் - பொருள் – இளம் - மெய், உவ, செய், மரபு - வ.உ.சிதம்பரம் பிள்ளை(1935)', pdf: 'https://suvadi.cict.in/asp/pdf/thol/thol_1935.pdf' },
  { book_id: 9, title: 'தொல்காப்பியம் - பொருள் - பேராசிரியர் உரை, ச. பவானந்தம் பிள்ளை (1917)', pdf: 'https://suvadi.cict.in/asp/pdf/thol/thol_porul_1917.pdf' },
  { book_id: 9, title: 'தொல்காப்பியம் - சொல் - கல்லாடனார் உரை (1964)', pdf: 'https://suvadi.cict.in/asp/pdf/thol/thol_sol_kal.pdf' },

  // 2. Ettuthokai (Parent ID: 10)
  { book_id: 10, title: 'நற்றிணை மூலமும் உரையும் – பின்னத்தூர் நாராயணசாமி ஐயங்கார் (1915)', pdf: 'https://suvadi.cict.in/asp/pdf/ettothokai/1.1915.pdf' },
  { book_id: 10, title: 'குறுந்தொகை மூலமும் உரையும் – திருக்கண்ணபுரத்து சௌரிப்பெருமாளரங்கனார் (1915)', pdf: 'https://suvadi.cict.in/asp/pdf/ettothokai/2.1915.pdf' },
  { book_id: 10, title: 'ஐங்குறுநூறு மூலமும் பழைய உரையும் – உ.வே. சாமிநாதையர் (1903)', pdf: 'https://suvadi.cict.in/asp/pdf/ettothokai/3.1903.pdf' },
  { book_id: 10, title: 'பதிற்றுப்பத்து மூலமும் பழைய உரையும் - உ.வே. சாமிநாதையர் (1904)', pdf: 'https://suvadi.cict.in/asp/pdf/ettothokai/4.1904.pdf' },
  { book_id: 10, title: 'பரிபாடல் மூலமும் பரிமேலழகர் உரையும் - உ.வே. சாமிநாதையர் ( 1918)', pdf: 'https://suvadi.cict.in/asp/pdf/ettothokai/5.1918.pdf' },
  { book_id: 10, title: 'கலித்தொகை மூலமும் நச்சினார்க்கினியர் உரையும் – சி.வை.தாமோதரம் பிள்ளை (1887)', pdf: 'https://suvadi.cict.in/asp/pdf/ettothokai/6.1887.pdf' },
  { book_id: 10, title: 'அகநானூறு மூலமும் உரையும் – கம்பர் விலாசம் வே. இராஜகோபாலையங்கார் (1918)', pdf: 'https://suvadi.cict.in/asp/pdf/ettothokai/7.1918.pdf' },
  { book_id: 10, title: 'புறநானூறு மூலமும் பழைய உரையும் - உ.வே. சாமிநாதையர் (1894)', pdf: 'https://suvadi.cict.in/asp/pdf/ettothokai/8.1894.pdf' },

  // 3. Pattupattu (Parent ID: 11)
  { book_id: 11, title: 'பத்துப்பாட்டு மூலமும் நச்சினார்க்கினியர் உரையும் - உ.வே. சாமிநாதையர் - (1889)', pdf: 'https://suvadi.cict.in/asp/pdf/ettothokai/10-1889.pdf' },

  // 4. Pathinenkilkanakku (Parent ID: 13)
  { book_id: 13, title: 'திருக்குறள் – தஞ்சை ஞானப்பிறகாசன்(1812)', pdf: 'https://suvadi.cict.in/asp/pdf/kilkanakku/1.thirukkural.pdf' },
  { book_id: 13, title: 'நாலடியார் – தஞ்சை ஞானப்பிறகாசன் (1812)', pdf: 'https://suvadi.cict.in/asp/pdf/kilkanakku/2.naladiyar.pdf' },
  { book_id: 13, title: 'இனியவை நாற்பது – முகவை இராமாநுச கவிராயர் (1844)', pdf: 'https://suvadi.cict.in/asp/pdf/kilkanakku/iniyavai40.pdf' },
  { book_id: 13, title: 'ஆசாரக்கோவை – தில்லையம்பூர் சந்திசேகர கவிராஜ பண்டிதர் (1857)', pdf: 'https://suvadi.cict.in/asp/pdf/kilkanakku/04.aasarakovai.pdf' },
  { book_id: 13, title: 'திரிகடுகம் – நல்லூர் சதாசிவப்பிள்ளை (1868)', pdf: 'https://suvadi.cict.in/asp/pdf/kilkanakku/thirukadugam.pdf' },
  { book_id: 13, title: 'நான்மணிக்கடிகை – தி.ஈ. ஸ்ரீநிவாசராகவாசாரியார் (1872)', pdf: 'https://suvadi.cict.in/asp/pdf/kilkanakku/naamanikadigai.pdf' },
  { book_id: 13, title: 'பழமொழி – சோடசாவதானம் சுப்பராயசெட்டியார் (1874)', pdf: 'https://suvadi.cict.in/asp/pdf/kilkanakku/7.palamoli400.pdf' },
  { book_id: 13, title: 'சிறுபஞ்சமூலம் – சண்முகசுந்தரமுதலியார் (1875)', pdf: 'https://suvadi.cict.in/asp/pdf/kilkanakku/sirupanjamoolam.pdf' },
  { book_id: 13, title: 'களவழி நாற்பது – சண்முகசுந்தர முதலியார் (1875)', pdf: 'https://suvadi.cict.in/asp/pdf/kilkanakku/9.kalavizhi40.pdf' },
  { book_id: 13, title: 'கார்நாற்பது – சண்முகசுந்தர முதலியார் (1875)', pdf: 'https://suvadi.cict.in/asp/pdf/kilkanakku/10.kaar40.pdf' },
  { book_id: 13, title: 'இன்னா நாற்பது – சண்முகசுந்தர முதலியார் (1881)', pdf: 'https://suvadi.cict.in/asp/pdf/kilkanakku/inna40.pdf' },
  { book_id: 13, title: 'முதுமொழிக் காஞ்சி – உரையூர் மதுரைநாயக முதலியார் (1895)', pdf: 'https://suvadi.cict.in/asp/pdf/kilkanakku/muthumozhikanchi.pdf' },
  { book_id: 13, title: 'ஏலாதி – ஊ. புஷ்பரத செட்டியார் (1887)', pdf: 'https://suvadi.cict.in/asp/pdf/kilkanakku/13.elathi.pdf' },
  { book_id: 13, title: 'ஐந்திணையைம்பது – ரா. இராகவையங்கார் (1903)', pdf: 'https://suvadi.cict.in/asp/pdf/kilkanakku/Aindhinai50.pdf' },
  { book_id: 13, title: 'திணைமாலை நூற்றைம்பது - ரா. இராகவையங்கார் (1904)', pdf: 'https://suvadi.cict.in/asp/pdf/kilkanakku/15.thinaimalai150.pdf' },
  { book_id: 13, title: 'ஐந்திணையெழுபது - மு. இராகவையங்கார் (1906)', pdf: 'https://suvadi.cict.in/asp/pdf/kilkanakku/16.ainthenai70.pdf' },
  { book_id: 13, title: 'திணைமொழியைம்பது – ஸ்ரீ சோமசுந்தர தேசிகர் (1918)', pdf: 'https://suvadi.cict.in/asp/pdf/kilkanakku/17.thinaimoli50.pdf' },
  { book_id: 13, title: 'கைந்நிலை – இ.வை. அனந்தராமையர் (1931)', pdf: 'https://suvadi.cict.in/asp/pdf/kilkanakku/18.kainilai_1931.pdf' },

  // 5. Silappatikaram (Parent ID: 12)
  { book_id: 12, title: 'சிலப்பதிகாரம் – வேனிற்காதை வரை – மூலம் மட்டும் - தி.ஈ. ஸ்ரீநிவாசராகவாசாரியார் (1872)', pdf: 'https://suvadi.cict.in/asp/pdf/Silappathikaram/1.1872.pdf' },
  { book_id: 12, title: 'சிலப்பதிகாரம் – புகார் காண்டம் – மூலம் மட்டும் - தி.ஈ. ஸ்ரீநிவாசராகவாசாரியார் (1876)', pdf: 'https://suvadi.cict.in/asp/pdf/Silappathikaram/2.1876.pdf' },
  { book_id: 12, title: 'சிலப்பதிகாரம் – புகார் காண்டம் – மூலமும் அடியார்க்கு நல்லார் உரையும், தி. க. சுப்பராய செட்டியார்(1880)', pdf: 'https://suvadi.cict.in/asp/pdf/Silappathikaram/3.1880.pdf' },
  { book_id: 12, title: 'சிலப்பதிகார மூலமும் அடியார்க்கு நல்லார் உரையும் – உ.வே.சா. – (1892)', pdf: 'https://suvadi.cict.in/asp/pdf/Silappathikaram/silambu_1892.pdf' },

  // 6. Muttollaiyiram (Parent ID: 16)
  { book_id: 16, title: 'முத்தொள்ளாயிரம் - ரா. இராகவையங்கார் (1905)', pdf: 'https://suvadi.cict.in/asp/pdf/Mutholayiram/mutholayiram_1905.pdf' },

  // 7. Irayanar Akapporul (Parent ID: 15)
  { book_id: 15, title: 'இறையனாரகப்பொருள் மூலமும் உரையும் – சி.வை. தாமோதரம் பிள்ளை (1883)', pdf: 'https://suvadi.cict.in/asp/pdf/irayanar/irayanar.pdf' }
];

async function seedEditions() {
  console.log('🔄 Seeding sv_ebook_editions...');

  // 1. Seed SQLite
  console.log('📦 Seeding SQLite...');
  const sqlite = new Database(sqliteDbPath);
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS sv_ebook_editions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      book_id INTEGER NOT NULL,
      title_tamil TEXT NOT NULL,
      pdf_url TEXT NOT NULL,
      status INTEGER DEFAULT 1,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);
  
  // Clear old SQLite editions
  sqlite.exec('DELETE FROM sv_ebook_editions');
  const insertSqlite = sqlite.prepare('INSERT INTO sv_ebook_editions (book_id, title_tamil, pdf_url) VALUES (?, ?, ?)');
  sqlite.transaction(() => {
    editions.forEach(ed => insertSqlite.run(ed.book_id, ed.title, ed.pdf));
  })();
  sqlite.close();
  console.log('   SQLite Seeding complete.');

  // 2. Seed PostgreSQL
  if (pgUrl) {
    console.log('🔌 Connecting to PostgreSQL...');
    const pg = new Client({ connectionString: pgUrl });
    try {
      await pg.connect();
      console.log('   PostgreSQL connection active.');
      await pg.query('DROP TABLE IF EXISTS sv_ebook_editions CASCADE;');
      await pg.query(`
        CREATE TABLE sv_ebook_editions (
          id SERIAL PRIMARY KEY,
          book_id INTEGER REFERENCES sv_book(book_id) ON DELETE CASCADE,
          title_tamil TEXT NOT NULL,
          pdf_url TEXT NOT NULL,
          status INTEGER DEFAULT 1,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
      `);
      
      for (const ed of editions) {
        await pg.query(
          'INSERT INTO sv_ebook_editions (book_id, title_tamil, pdf_url) VALUES ($1, $2, $3)',
          [ed.book_id, ed.title, ed.pdf]
        );
      }
      console.log('   PostgreSQL Seeding complete.');
    } catch (e) {
      console.error('❌ PostgreSQL seeding error:', e.message);
    } finally {
      await pg.end();
    }
  }
  
  console.log('🎉 Done seeding editions!');
}

seedEditions();
