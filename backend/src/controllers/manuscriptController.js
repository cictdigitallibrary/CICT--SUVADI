const db = require('../config/db');

exports.getAll = (req, res) => {
  try {
    const manuscripts = db.prepare('SELECT * FROM manuscripts').all();
    res.json(manuscripts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getPages = (req, res) => {
  try {
    const pages = db.prepare('SELECT * FROM manuscript_pages WHERE manuscript_id = ? ORDER BY page_number ASC').all(req.params.id);
    res.json(pages);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.search = (req, res) => {
  const { manuscript_id, type, q } = req.query;
  try {
    let result;
    if (type === 'by_number') {
      result = db.prepare('SELECT mp.*, m.title_tamil, m.cd_number FROM manuscript_pages mp JOIN manuscripts m ON mp.manuscript_id = m.id WHERE mp.manuscript_id = ? AND mp.poem_number = ?').all(manuscript_id, q);
    } else {
      result = db.prepare('SELECT mp.*, m.title_tamil, m.cd_number FROM manuscript_pages mp JOIN manuscripts m ON mp.manuscript_id = m.id WHERE mp.manuscript_id = ? AND mp.keywords LIKE ?').all(manuscript_id, `%${q}%`);
    }

    db.prepare('INSERT INTO search_logs (search_type, query, manuscript_id, results_count) VALUES (?, ?, ?, ?)').run(type, q, manuscript_id, result.length);

    res.json({ results: result, count: result.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
