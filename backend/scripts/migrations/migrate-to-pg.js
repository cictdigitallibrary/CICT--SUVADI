const Database = require('better-sqlite3');
const { Client } = require('pg');
const path = require('path');
require('dotenv').config();

const sqliteDbPath = path.join(__dirname, 'db', 'suvadi.sqlite');
const pgUrl = process.env.DATABASE_URL;

async function runMigration() {
  console.log('🚀 Starting Suvadi SQLite to PostgreSQL migration...');
  console.log(`📂 SQLite path: ${sqliteDbPath}`);
  console.log(`🔌 PostgreSQL URL: ${pgUrl}`);

  const sqlite = new Database(sqliteDbPath);
  const pg = new Client({
    connectionString: pgUrl,
  });

  try {
    await pg.connect();
    console.log('✅ Connected to PostgreSQL successfully.');

    // ── Drop existing tables to ensure a clean state ──
    console.log('🧹 Dropping existing tables if any...');
    await pg.query('DROP TABLE IF EXISTS sv_songs CASCADE;');
    await pg.query('DROP TABLE IF EXISTS sv_sub_category CASCADE;');
    await pg.query('DROP TABLE IF EXISTS sv_main_category CASCADE;');
    await pg.query('DROP TABLE IF EXISTS sv_book CASCADE;');
    await pg.query('DROP TABLE IF EXISTS sv_users CASCADE;');

    // ── Create Tables ──
    console.log('🛠️ Creating PostgreSQL tables...');

    await pg.query(`
      CREATE TABLE sv_book (
        book_id SERIAL PRIMARY KEY,
        name TEXT,
        status INTEGER DEFAULT 1,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE
      );
    `);

    await pg.query(`
      CREATE TABLE sv_main_category (
        cid SERIAL PRIMARY KEY,
        book_id INTEGER REFERENCES sv_book(book_id) ON DELETE CASCADE,
        cname TEXT NOT NULL,
        status INTEGER NOT NULL DEFAULT 1,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE
      );
    `);

    await pg.query(`
      CREATE TABLE sv_sub_category (
        id SERIAL PRIMARY KEY,
        book_id INTEGER REFERENCES sv_book(book_id) ON DELETE CASCADE,
        main_category_id INTEGER REFERENCES sv_main_category(cid) ON DELETE CASCADE,
        sub_cat_name TEXT NOT NULL,
        status INTEGER NOT NULL DEFAULT 1,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE
      );
    `);

    await pg.query(`
      CREATE TABLE sv_songs (
        id SERIAL PRIMARY KEY,
        fid INTEGER NOT NULL,
        fname TEXT NOT NULL,
        filename TEXT DEFAULT '',
        filetype TEXT DEFAULT 'image/jpeg',
        cid INTEGER REFERENCES sv_sub_category(id) ON DELETE CASCADE,
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

    await pg.query(`
      CREATE TABLE sv_users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(100) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        email VARCHAR(255),
        role VARCHAR(50) DEFAULT 'admin',
        status INTEGER DEFAULT 1,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    const cleanDate = (d) => {
      if (!d || d === '0000-00-00 00:00:00' || d.startsWith('0000')) return null;
      return d;
    };

    console.log('✅ Tables created successfully.');

    // ── Migrate sv_book ──
    // Track migrated IDs to validate foreign keys dynamically
    const bookIds = new Set();
    const mainCatIds = new Set();
    const subCatIds = new Set();

    console.log('📦 Migrating sv_book...');
    const books = sqlite.prepare('SELECT * FROM sv_book').all();
    for (const b of books) {
      await pg.query(
        `INSERT INTO sv_book (book_id, name, status, created_at, updated_at) VALUES ($1, $2, $3, $4, $5)`,
        [b.book_id, b.name, b.status, cleanDate(b.created_at), cleanDate(b.updated_at)]
      );
      bookIds.add(b.book_id);
    }
    console.log(`   Migrated ${books.length} books.`);

    // ── Migrate sv_main_category ──
    console.log('📦 Migrating sv_main_category...');
    const cats = sqlite.prepare('SELECT * FROM sv_main_category').all();
    let migratedCats = 0;
    for (const c of cats) {
      if (!bookIds.has(c.book_id)) {
        console.warn(`   ⚠️ Skipping main category ID ${c.cid} due to missing parent book_id: ${c.book_id}`);
        continue;
      }
      await pg.query(
        `INSERT INTO sv_main_category (cid, book_id, cname, status, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6)`,
        [c.cid, c.book_id, c.cname, c.status, cleanDate(c.created_at), cleanDate(c.updated_at)]
      );
      mainCatIds.add(c.cid);
      migratedCats++;
    }
    console.log(`   Migrated ${migratedCats} of ${cats.length} main categories.`);

    // ── Migrate sv_sub_category ──
    console.log('📦 Migrating sv_sub_category...');
    const subcats = sqlite.prepare('SELECT * FROM sv_sub_category').all();
    let migratedSubCats = 0;
    for (const s of subcats) {
      if (!bookIds.has(s.book_id) || !mainCatIds.has(s.main_category_id)) {
        console.warn(`   ⚠️ Skipping sub-category ID ${s.id} due to missing parent book_id/main_category_id`);
        continue;
      }
      await pg.query(
        `INSERT INTO sv_sub_category (id, book_id, main_category_id, sub_cat_name, status, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [s.id, s.book_id, s.main_category_id, s.sub_cat_name, s.status, cleanDate(s.created_at), cleanDate(s.updated_at)]
      );
      subCatIds.add(s.id);
      migratedSubCats++;
    }
    console.log(`   Migrated ${migratedSubCats} of ${subcats.length} sub-categories.`);

    // ── Migrate sv_songs ──
    console.log('📦 Migrating sv_songs (this might take a moment)...');
    const songs = sqlite.prepare('SELECT * FROM sv_songs').all();
    let migratedSongs = 0;
    for (const s of songs) {
      if (s.cid && !subCatIds.has(s.cid)) {
        console.warn(`   ⚠️ Skipping song ID ${s.id} due to missing parent sub-category ID: ${s.cid}`);
        continue;
      }
      await pg.query(
        `INSERT INTO sv_songs (id, fid, fname, filename, filetype, cid, group_id, upload_date, down_counts, view_counts, author, description, status, trash) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
        [s.id, s.fid, s.fname, s.filename, s.filetype, s.cid, s.group_id, s.upload_date, s.down_counts, s.view_counts, s.author, s.description, s.status, s.trash]
      );
      migratedSongs++;
    }
    console.log(`   Migrated ${migratedSongs} of ${songs.length} folios/songs.`);

    // ── Migrate sv_users ──
    console.log('📦 Migrating sv_users...');
    // Fetch users if the table exists, otherwise insert default admin user
    let users = [];
    try {
      users = sqlite.prepare('SELECT * FROM sv_users').all();
    } catch (e) {
      // Table might not exist in SQLite
    }
    if (users.length > 0) {
      for (const u of users) {
        await pg.query(
          `INSERT INTO sv_users (id, username, password, email, role, status, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [u.id, u.username, u.password, u.email, u.role, u.status, u.created_at]
        );
      }
      console.log(`   Migrated ${users.length} users.`);
    } else {
      // Insert default admin: username=admin, password=admin
      const bcrypt = require('bcryptjs');
      const hash = bcrypt.hashSync('admin', 10);
      await pg.query(
        `INSERT INTO sv_users (username, password, email, role, status) VALUES ($1, $2, $3, $4, $5)`,
        ['admin', hash, 'admin@cict.in', 'admin', 1]
      );
      console.log('   No SQLite users found. Default admin created (username: admin, password: admin).');
    }

    // ── Reset auto-incrementing PK sequences ──
    console.log('🔄 Aligning PostgreSQL primary key sequences...');
    await pg.query(`SELECT setval('sv_book_book_id_seq', COALESCE((SELECT MAX(book_id)+1 FROM sv_book), 1), false);`);
    await pg.query(`SELECT setval('sv_main_category_cid_seq', COALESCE((SELECT MAX(cid)+1 FROM sv_main_category), 1), false);`);
    await pg.query(`SELECT setval('sv_sub_category_id_seq', COALESCE((SELECT MAX(id)+1 FROM sv_sub_category), 1), false);`);
    await pg.query(`SELECT setval('sv_songs_id_seq', COALESCE((SELECT MAX(id)+1 FROM sv_songs), 1), false);`);
    await pg.query(`SELECT setval('sv_users_id_seq', COALESCE((SELECT MAX(id)+1 FROM sv_users), 1), false);`);

    console.log('🎉 Migration completed successfully!');

  } catch (err) {
    console.error('❌ Migration error:', err.message);
  } finally {
    sqlite.close();
    await pg.end();
    console.log('🔌 Connections closed.');
  }
}

runMigration();
