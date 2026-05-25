const Database = require('better-sqlite3');
const path = require('path');
const schema = require('./schema');
const seedData = require('./seed-data');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const dbPath = process.env.DB_PATH || path.join(__dirname, 'suvadi.sqlite');
const db = new Database(dbPath);

function init() {
  console.log('Initializing database at:', dbPath);
  
  // Create tables
  db.exec(schema);
  console.log('Schema applied successfully.');

  // Check if data already exists to avoid duplicates
  const rowCountResult = db.prepare('SELECT COUNT(*) as count FROM classical_texts').get();
  const rowCount = rowCountResult ? rowCountResult.count : 0;
  
  if (rowCount === 0) {
    console.log('Seeding initial data...');
    
    // Seed Classical Texts
    const insertText = db.prepare('INSERT INTO classical_texts (text_number, title_tamil, title_transliteration, category, subcategory) VALUES (?, ?, ?, ?, ?)');
    
    db.transaction(() => {
      seedData.classical_texts.forEach(text => insertText.run(...text));
    })();
    console.log('Classical texts seeded.');

    // Seed Critical Editions
    const insertEdition = db.prepare('INSERT INTO critical_editions (text_id, title_tamil, title_english, year_published, status) VALUES (?, ?, ?, ?, ?)');
    
    db.transaction(() => {
      seedData.critical_editions.forEach(ed => insertEdition.run(...ed));
    })();
    console.log('Critical editions seeded.');

    // Seed Team Members
    const insertTeam = db.prepare('INSERT INTO team_members (name_tamil, name_english, title_tamil, title_english, role, display_order) VALUES (?, ?, ?, ?, ?, ?)');
    
    db.transaction(() => {
      seedData.team_members.forEach(member => insertTeam.run(...member));
    })();
    console.log('Team members seeded.');

    // Seed E-Books
    const insertEbook = db.prepare('INSERT INTO ebooks (text_id, title_tamil, title_english, editor_name, publisher, year_published, library_source) VALUES (?, ?, ?, ?, ?, ?, ?)');
    db.transaction(() => {
      seedData.ebooks.forEach(eb => insertEbook.run(...eb));
    })();
    console.log('E-books seeded.');

    // Seed some dummy Manuscripts
    const insertMS = db.prepare('INSERT INTO manuscripts (text_id, title_tamil, title_english, cd_number, category, total_pages) VALUES (?, ?, ?, ?, ?, ?)');
    
    db.transaction(() => {
      insertMS.run(21, 'நாலடியார்', 'Naladi Yar', 'எண்: 313', 'பதினெண் கீழ்க்கணக்கு', 400);
      insertMS.run(39, 'சிலப்பதிகாரம் - பதிகம்', 'Cilappatikaram - Patikam', 'எண்: 313', 'சிலப்பதிகாரம்', 20);
      insertMS.run(11, 'திருமுருகாற்றுப்படை', 'Tirumurukattruppadai', 'எண்: 314', 'பத்துப்பாட்டு', 317);
    })();
    console.log('Sample manuscripts seeded.');
  } else {
    console.log('Database already contains data. Skipping seed.');
  }

  db.close();
  console.log('Database initialization complete.');
}

init();
