const db = require('../config/db');

exports.getAll = (req, res) => {
  try {
    const team = db.prepare('SELECT * FROM team_members ORDER BY display_order ASC').all();
    res.json(team);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
