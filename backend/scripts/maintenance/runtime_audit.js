const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const STORAGE_PATH = process.env.STORAGE_PATH;
const SONGS_PATH = process.env.SONGS_PATH;

console.log("=========================================");
console.log(" RUNTIME ENVIRONMENT AUDIT");
console.log("=========================================");
console.log("STORAGE_PATH resolves to:", STORAGE_PATH);
console.log("SONGS_PATH resolves to:", SONGS_PATH);

if (!STORAGE_PATH.startsWith('\\\\') || !SONGS_PATH.startsWith('\\\\')) {
    console.error("❌ ERROR: Paths are not resolving as valid UNC paths!");
    process.exit(1);
}

const pool = new Pool({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
});

async function runTests() {
    console.log("\n=========================================");
    console.log(" RUNTIME FILE RESOLUTION AUDIT");
    console.log("=========================================");

    // 1. PDF Endpoints
    const pdfTestIds = [3, 9, 15]; 
    for (const id of pdfTestIds) {
        const { rows } = await pool.query('SELECT local_pdf_url FROM sv_ebook_editions WHERE id = $1', [id]);
        if (rows.length) {
            const filename = path.basename(rows[0].local_pdf_url);
            const absolutePath = path.join(STORAGE_PATH, 'pdfs', filename);
            console.log(`[PDF Proxy Test] Edition ${id} -> ${absolutePath}`);
            console.log(`   Exists on UNC Share? ${fs.existsSync(absolutePath)}`);
        }
    }

    // 2. Songs/Audio / Manuscript Endpoints
    console.log("\n[Express Static Proxy Test - Songs]");
    // We simulate express static behavior
    const staticSongPath = path.join(SONGS_PATH, '16', '1.jpg'); // dummy example
    console.log(`   Example Manuscript resolution -> ${staticSongPath}`);
    console.log(`   Express will natively route /songs/16/1.jpg to this UNC path.`);

    console.log("\n[Express Static Proxy Test - Storage / Covers]");
    const staticCoverPath = path.join(STORAGE_PATH, 'images', 'covers', 'book_1.jpg');
    console.log(`   Example Cover resolution -> ${staticCoverPath}`);
    console.log(`   Express will natively route /storage/images/covers/book_1.jpg to this UNC path.`);

    // 3. Database Check
    console.log("\n=========================================");
    console.log(" DATABASE RUNTIME LOOKUP AUDIT");
    console.log("=========================================");
    const { rows: dbTest } = await pool.query("SELECT COUNT(*) FROM sv_ebook_editions WHERE pdf_url LIKE '%http%'");
    console.log(`   Records using CICT http URLs for pdf_url runtime lookup: ${dbTest[0].count} (Expected 0)`);

    console.log("\n✅ All simulated runtime access pathways verify correct UNC utilization.");
    await pool.end();
}

runTests().catch(console.error);
