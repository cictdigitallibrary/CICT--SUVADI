/**
 * seed-sv-tables.js
 * Directly inserts sv_book, sv_main_category (and verifies sv_songs) into suvadi.sqlite.
 * Run once: node seed-sv-tables.js
 */
const Database = require('better-sqlite3');
const path     = require('path');

const db = new Database(path.join(__dirname, 'db', 'suvadi.sqlite'));
db.exec('PRAGMA foreign_keys = OFF;');
db.exec('PRAGMA journal_mode = WAL;');

// ── 1. Create / ensure tables exist ───────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS sv_book (
    book_id   INTEGER PRIMARY KEY,
    name      TEXT,
    status    INTEGER DEFAULT 1,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT
  );

  CREATE TABLE IF NOT EXISTS sv_main_category (
    cid        INTEGER PRIMARY KEY,
    book_id    INTEGER NOT NULL,
    cname      TEXT NOT NULL,
    status     INTEGER NOT NULL DEFAULT 1,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT
  );

  CREATE TABLE IF NOT EXISTS sv_songs (
    id          INTEGER PRIMARY KEY,
    fid         INTEGER NOT NULL,
    fname       TEXT NOT NULL,
    filename    TEXT DEFAULT '',
    filetype    TEXT DEFAULT 'image/jpeg',
    cid         INTEGER,
    group_id    INTEGER,
    upload_date TEXT NOT NULL,
    down_counts INTEGER DEFAULT 0,
    view_counts INTEGER DEFAULT 0,
    author      TEXT,
    description TEXT,
    status      INTEGER NOT NULL DEFAULT 1,
    trash       INTEGER NOT NULL DEFAULT 0
  );
`);

// ── 2. Seed sv_book ────────────────────────────────────────────────────────
const books = [
  [9,  'தொல்காப்பியம்',           1, '2019-03-23 13:00:07'],
  [10, 'எட்டுத்தொகை',             1, '2019-03-23 13:32:35'],
  [11, 'பத்துப்பாட்டு',            1, '2019-03-24 13:15:12'],
  [12, 'சிலப்பதிகாரம்',           1, '2019-03-24 16:54:41'],
  [13, 'பதினெண் கீழ்க்கணக்கு',   1, '2019-04-02 10:17:06'],
  [15, 'இறையனார்',                0, '2023-03-23 05:11:21'],
  [16, 'முத்தொள்ளாயிரம்',         1, '2023-08-10 10:32:57'],
];

const insertBook = db.prepare(`
  INSERT OR REPLACE INTO sv_book (book_id, name, status, created_at) VALUES (?,?,?,?)
`);
db.transaction(() => books.forEach(r => insertBook.run(...r)))();
console.log(`✅  sv_book: ${books.length} rows inserted`);

// ── 3. Seed sv_main_category ───────────────────────────────────────────────
const cats = [
  [15, 9,  'பொருள்-அகம்-சி.வை.தா பதிப்பு',                        1],
  [16, 10, 'ஐங்குறுநூறு',                                           1],
  [17, 11, 'திருமுருகாற்றுப்படை',                                   1],
  [18, 12, 'பதிகம்',                                                 1],
  [19, 13, 'நாலடியார்',                                              1],
  [20, 9,  'பொருள்-புறம்-சி.வை.தா பதிப்பு',                        1],
  [21, 13, 'திருக்குறள்',                                            1],
  [22, 10, 'அகநானூறு',                                              1],
  [33, 9,  'சொல்.சேனா',                                             1],
  [34, 9,  'மூலம் (எழுத்து)',                                        1],
  [35, 9,  'மூலம் (பொருள்)',                                         1],
  [36, 13, 'ஏலாதி',                                                  1],
  [37, 16, 'முத்தொள்ளாயிரம்',                                       1],
  [38, 13, 'திரிகடுகம்',                                             1],
  [39, 12, 'புகார்க் காண்டம் - மங்கல வாழ்த்துப் பாடல்',            1],
  [40, 12, 'புகார்க் காண்டம் - மனையறம்படுத்த காதை',               1],
  [41, 12, 'புகார்க் காண்டம் - அரங்கேற்று காதை',                   1],
  [42, 12, 'புகார்க் காண்டம் - அந்திமாலைச் சிறப்புசெய் காதை',     1],
  [43, 12, 'புகார்க் காண்டம் - இந்திர விழவு ஊர் எடுத்த காதை',     1],
  [44, 12, 'புகார்க் காண்டம் - கடலாடு காதை',                       1],
  [45, 12, 'புகார்க் காண்டம் - கானல் வரி',                         1],
];

const insertCat = db.prepare(`
  INSERT OR REPLACE INTO sv_main_category (cid, book_id, cname, status) VALUES (?,?,?,?)
`);
db.transaction(() => cats.forEach(r => insertCat.run(...r)))();
console.log(`✅  sv_main_category: ${cats.length} rows inserted`);

// ── 4. Verify sv_songs ─────────────────────────────────────────────────────
const songCount = db.prepare('SELECT COUNT(*) as c FROM sv_songs WHERE status=1 AND trash=0').get().c;
console.log(`✅  sv_songs: ${songCount} rows already present`);

// ── 5. Quick summary ───────────────────────────────────────────────────────
const bookCount = db.prepare('SELECT COUNT(*) as c FROM sv_book').get().c;
const catCount  = db.prepare('SELECT COUNT(*) as c FROM sv_main_category').get().c;
console.log('\n── Database summary ──');
console.log(`   sv_book:          ${bookCount}`);
console.log(`   sv_main_category: ${catCount}`);
console.log(`   sv_songs:         ${songCount}`);
console.log('\n✅  Seed complete. You can now start the backend server.');
db.close();
