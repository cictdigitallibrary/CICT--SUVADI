const Database = require('better-sqlite3');
const fs = require('fs');

const db = new Database('./db/suvadi.sqlite');
db.exec('PRAGMA foreign_keys = OFF;');

// create tables
db.exec(`
CREATE TABLE IF NOT EXISTS sv_book (
  book_id INTEGER PRIMARY KEY,
  name TEXT DEFAULT NULL,
  status INTEGER DEFAULT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT NULL
);

CREATE TABLE IF NOT EXISTS sv_main_category (
  cid INTEGER PRIMARY KEY,
  book_id INTEGER NOT NULL,
  cname TEXT NOT NULL,
  status INTEGER NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT NULL
);

CREATE TABLE IF NOT EXISTS sv_songs (
  id INTEGER PRIMARY KEY,
  fid INTEGER NOT NULL,
  fname TEXT NOT NULL,
  filename TEXT NOT NULL,
  filetype TEXT NOT NULL,
  cid INTEGER DEFAULT NULL,
  group_id INTEGER DEFAULT NULL,
  upload_date TEXT NOT NULL,
  down_counts INTEGER DEFAULT 0,
  view_counts INTEGER DEFAULT 0,
  author TEXT DEFAULT NULL,
  description TEXT DEFAULT NULL,
  status INTEGER NOT NULL DEFAULT 1,
  trash INTEGER NOT NULL DEFAULT 0
);
`);

db.exec('DELETE FROM sv_book;');
db.exec('DELETE FROM sv_main_category;');
db.exec('DELETE FROM sv_songs;');

let sqlContent = fs.readFileSync('../suvadi (1).sql', 'utf8');

// The SQL file is a MySQL dump
const statements = sqlContent.split(';');

let success = 0, errors = 0;
for (let stmt of statements) {
    let cleanStmt = stmt.trim();
    if (cleanStmt.startsWith('INSERT INTO `sv_book`') || 
        cleanStmt.startsWith('INSERT INTO `sv_main_category`') || 
        cleanStmt.startsWith('INSERT INTO `sv_songs`')) {
        
        // Remove all backticks from the insert statement
        cleanStmt = cleanStmt.replace(/`/g, '');
        
        try {
            db.exec(cleanStmt + ';');
            success++;
        } catch (e) {
            console.error('Error executing query:', cleanStmt.substring(0, 100));
            console.error(e.message);
            errors++;
        }
    }
}
console.log('Import successful:', success, 'errors:', errors);
