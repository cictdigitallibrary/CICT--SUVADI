const fs = require('fs');
const readline = require('readline');
const Database = require('better-sqlite3');
const dbPath = './db/suvadi.sqlite';
const sqlFile = '../suvadi (1).sql';

async function importAll() {
    const db = new Database(dbPath);
    db.exec('PRAGMA foreign_keys = OFF;');

    console.log('Recreating tables...');
    db.exec(`
    DROP TABLE IF EXISTS sv_book;
    DROP TABLE IF EXISTS sv_main_category;
    DROP TABLE IF EXISTS sv_sub_category;
    DROP TABLE IF EXISTS sv_songs;

    CREATE TABLE sv_book (
      book_id INTEGER PRIMARY KEY,
      name TEXT,
      status INTEGER,
      created_at TEXT,
      updated_at TEXT
    );

    CREATE TABLE sv_main_category (
      cid INTEGER PRIMARY KEY,
      book_id INTEGER NOT NULL,
      cname TEXT NOT NULL,
      status INTEGER NOT NULL,
      created_at TEXT,
      updated_at TEXT
    );

    CREATE TABLE sv_sub_category (
      id INTEGER PRIMARY KEY,
      book_id INTEGER NOT NULL,
      main_category_id INTEGER NOT NULL,
      sub_cat_name TEXT NOT NULL,
      status INTEGER NOT NULL,
      created_at TEXT,
      updated_at TEXT
    );

    CREATE TABLE sv_songs (
      id INTEGER PRIMARY KEY,
      fid INTEGER NOT NULL,
      fname TEXT NOT NULL,
      filename TEXT DEFAULT '',
      filetype TEXT DEFAULT 'image/jpeg',
      cid INTEGER,
      group_id INTEGER,
      upload_date TEXT,
      down_counts INTEGER DEFAULT 0,
      view_counts INTEGER DEFAULT 0,
      author TEXT,
      description TEXT,
      status INTEGER NOT NULL DEFAULT 1,
      trash INTEGER NOT NULL DEFAULT 0
    );
    `);

    const fileStream = fs.createReadStream(sqlFile);
    const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity
    });

    let currentTable = null;
    let sqlBuffer = '';
    let insertCount = 0;

    console.log('Starting line-by-line import...');

    for await (const line of rl) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('--') || trimmed.startsWith('/*')) continue;

        if (trimmed.toUpperCase().startsWith('INSERT INTO')) {
            // New insert block starts
            if (sqlBuffer) {
                try { db.exec(sqlBuffer + ';'); insertCount++; } catch(e) {}
            }
            sqlBuffer = trimmed;
        } else if (sqlBuffer) {
            // Continue previous insert block
            sqlBuffer += ' ' + trimmed;
            if (trimmed.endsWith(';')) {
                try {
                    db.exec(sqlBuffer);
                    insertCount++;
                } catch (e) {
                    // console.error('Error executing query:', e.message);
                }
                sqlBuffer = '';
            }
        }
    }

    // Final buffer
    if (sqlBuffer) {
        try { db.exec(sqlBuffer.endsWith(';') ? sqlBuffer : sqlBuffer + ';'); insertCount++; } catch(e) {}
    }

    console.log(`Import finished. Processed ${insertCount} INSERT statements.`);
    db.close();
}

importAll();
