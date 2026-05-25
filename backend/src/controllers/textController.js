const db = require('../config/db');

exports.getAll = (req, res) => {
  try {
    const texts = db.prepare('SELECT * FROM classical_texts ORDER BY text_number ASC').all();
    res.json(texts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getById = (req, res) => {
  try {
    const text = db.prepare('SELECT * FROM classical_texts WHERE id = ?').get(req.params.id);
    if (!text) return res.status(404).json({ message: 'Text not found' });
    res.json(text);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getEditions = (req, res) => {
  try {
    const sql = 'SELECT ce.*, ct.title_tamil as text_title_tamil FROM critical_editions ce JOIN classical_texts ct ON ce.text_id = ct.id ORDER BY ce.year_published DESC';
    const editions = db.prepare(sql).all();
    res.json(editions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
