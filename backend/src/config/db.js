const Database = require('better-sqlite3');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const dbPath = process.env.DB_PATH || path.join(__dirname, '../../db/suvadi.sqlite');
const db = new Database(dbPath, { verbose: console.log });

module.exports = db;
