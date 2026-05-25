const fs = require('fs');
const Database = require('better-sqlite3');
const dbPath = './db/suvadi.sqlite';
const sqlFile = '../suvadi (1).sql';

const db = new Database(dbPath);

let sqlContent = fs.readFileSync(sqlFile, 'utf8');

// The SQL file is a MySQL dump
const statements = sqlContent.split(';');

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

// clear existing data if needed
db.exec('DELETE FROM sv_book;');
db.exec('DELETE FROM sv_main_category;');
db.exec('DELETE FROM sv_songs;');

// Insert statements
for (let stmt of statements) {
    let cleanStmt = stmt.trim();
    if (cleanStmt.startsWith('INSERT INTO `sv_book`') || 
        cleanStmt.startsWith('INSERT INTO `sv_main_category`') || 
        cleanStmt.startsWith('INSERT INTO `sv_songs`')) {
        try {
            db.exec(cleanStmt + ';');
        } catch (e) {
            console.error('Error executing query:', e.message);
        }
    }
}
console.log('Import successful.');
