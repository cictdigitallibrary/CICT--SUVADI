const schema = `
-- 1. Classical Tamil Texts (41 books)
CREATE TABLE IF NOT EXISTS classical_texts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  text_number INTEGER NOT NULL UNIQUE,
  title_tamil TEXT NOT NULL,
  title_transliteration TEXT,
  category TEXT NOT NULL,
  subcategory TEXT,
  description_tamil TEXT,
  description_english TEXT,
  cover_image_url TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 2. Critical Editions (செம்பதிப்புகள்)
CREATE TABLE IF NOT EXISTS critical_editions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  text_id INTEGER REFERENCES classical_texts(id),
  title_tamil TEXT NOT NULL,
  title_english TEXT,
  year_published INTEGER,
  status TEXT DEFAULT 'published', 
  cover_image_url TEXT,
  pdf_url TEXT,
  description TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 3. Palm-leaf Manuscripts (ஓலைச்சுவடிகள்)
CREATE TABLE IF NOT EXISTS manuscripts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  text_id INTEGER REFERENCES classical_texts(id),
  title_tamil TEXT NOT NULL,
  title_english TEXT,
  cd_number TEXT,
  category TEXT,
  total_pages INTEGER,
  library_source TEXT,
  description TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 4. Manuscript Pages (individual ola leaf images)
CREATE TABLE IF NOT EXISTS manuscript_pages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  manuscript_id INTEGER REFERENCES manuscripts(id),
  page_number INTEGER NOT NULL,
  image_url TEXT NOT NULL,
  text_content TEXT,
  poem_number INTEGER,
  keywords TEXT, -- Stored as comma-separated in SQLite
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 5. E-Books (மின் நூல்கள்)
CREATE TABLE IF NOT EXISTS ebooks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  text_id INTEGER REFERENCES classical_texts(id),
  title_tamil TEXT NOT NULL,
  title_english TEXT,
  editor_name TEXT,
  publisher TEXT,
  year_published INTEGER,
  library_source TEXT,
  pdf_url TEXT,
  cover_image_url TEXT,
  is_first_edition BOOLEAN DEFAULT 1,
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 6. Team Members (Specific 7 members from prompt)
CREATE TABLE IF NOT EXISTS team_members (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name_tamil TEXT NOT NULL,
  name_english TEXT,
  title_tamil TEXT,
  title_english TEXT,
  role TEXT,
  photo_url TEXT,
  email TEXT,
  bio_tamil TEXT,
  bio_english TEXT,
  display_order INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 7. Contact/Enquiries
CREATE TABLE IF NOT EXISTS enquiries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  subject TEXT,
  message TEXT NOT NULL,
  status TEXT DEFAULT 'unread',
  submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 8. Search Logs
CREATE TABLE IF NOT EXISTS search_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  search_type TEXT,
  query TEXT,
  manuscript_id INTEGER,
  results_count INTEGER,
  searched_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_manuscript_pages_poem ON manuscript_pages(poem_number);
CREATE INDEX IF NOT EXISTS idx_manuscripts_text_id ON manuscripts(text_id);
CREATE INDEX IF NOT EXISTS idx_ebooks_text_id ON ebooks(text_id);
`;

module.exports = schema;
