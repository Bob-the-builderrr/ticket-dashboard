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
      WITH daily_counts AS (
        SELECT date, COUNT(DISTINCT ticket_id) as daily_count
        FROM tickets
        ${where}
        GROUP BY date
      )
      SELECT 
        (SELECT SUM(daily_count) FROM daily_counts) as total_tickets,
        (SELECT COUNT(*) FROM daily_counts) as total_days,
        (SELECT COUNT(DISTINCT category) FROM tickets ${where}) as total_categories,
        (SELECT AVG(daily_count) FROM daily_counts) as avg_daily_tickets
    `;
    const r = await db.execute(sql, params);
    res.status(200).json(r.rows[0] || {});
  } catch (e) {
    res.status(500).json({ error: String(e.message || e) });
  }
};
