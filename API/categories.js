const db = require('./_db');

module.exports = async function handler(req, res) {
  try {
    const sql = `SELECT DISTINCT category FROM tickets WHERE category IS NOT NULL AND category <> '' ORDER BY category ASC`;
    const r = await db.execute(sql);
    res.status(200).json(r.rows.map(x => x.category));
  } catch (e) {
    res.status(500).json({ error: String(e.message || e) });
  }
};
