const db = require('./_db');

module.exports = async function handler(req, res) {
  try {
    const { from, to, plan_types } = req.query;
    if (!from || !to) return res.status(400).json({ error: 'Please provide from and to dates' });

    let where = `WHERE date BETWEEN ? AND ?`;
    const params = [from, to];

    if (plan_types && plan_types !== 'ALL') {
      const arr = String(plan_types).split(',').map(s => s.trim()).filter(Boolean);
      if (arr.length) {
        where += ` AND plan_type IN (${arr.map(() => '?').join(',')})`;
        params.push(...arr);
      }
    }

    const sql = `
      SELECT date, COUNT(DISTINCT ticket_id) AS count
      FROM tickets
      ${where}
      GROUP BY date
      ORDER BY date ASC
    `;
    const r = await db.execute(sql, params);
    res.status(200).json(r.rows);
  } catch (e) {
    res.status(500).json({ error: String(e.message || e) });
  }
};
