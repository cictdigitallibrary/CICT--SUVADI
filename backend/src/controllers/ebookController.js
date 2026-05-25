const db = require('../config/db');

exports.getAll = (req, res) => {
  try {
    const ebooks = db.prepare('SELECT * FROM ebooks').all();
    res.json(ebooks);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
