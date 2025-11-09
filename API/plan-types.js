const db = require('./_db');

module.exports = async function handler(req, res) {
  try {
    const sql = `SELECT DISTINCT plan_type FROM tickets WHERE plan_type IS NOT NULL AND plan_type <> '' ORDER BY plan_type ASC`;
    const r = await db.execute(sql);
    res.status(200).json(r.rows.map(x => x.plan_type));
  } catch (e) {
    res.status(500).json({ error: String(e.message || e) });
  }
};
