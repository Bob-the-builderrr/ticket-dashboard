const { createClient } = require('@libsql/client');
const TURSO_URL   = 'https://dashboard-v2-new-bob-the-builderrr.aws-us-east-1.turso.io';
const TURSO_TOKEN = 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3NjI2ODU5MDgsImlkIjoiYjIwYmEzYmMtNDM1ZS00MTZkLTg1NTgtZjNiMWU0MjU1Njk2IiwicmlkIjoiYTk5ZjBlOWYtNjZmMy00MmFmLWFhYzAtNDRjNjY5Y2Y4NDhkIn0.wstJXPnEZ9ApXRp5rknkc2GfD-6AeCMTNSzdjoovOC_Cd3LqNjRR-TUKHvtqYArmmigAA1DKDGvG1UVCuEBADw';
const db = createClient({ url: TURSO_URL, authToken: TURSO_TOKEN });

module.exports = async (req, res) => {
  try {
    const { from, to, plan_types } = req.query;
    if (!from || !to) return res.status(400).json({ error: 'Provide from and to (YYYY-MM-DD)' });

    let where = `WHERE date BETWEEN ? AND ?`;
    const params = [from, to];

    if (plan_types && plan_types !== 'ALL') {
      const arr = String(plan_types).split(',').map(s => s.trim()).filter(Boolean);
      if (arr.length) { where += ` AND plan_type IN (${arr.map(() => '?').join(',')})`; params.push(...arr); }
    }

    const sql = `
      WITH daily AS (
        SELECT date, COUNT(DISTINCT ticket_id) AS daily_count
        FROM tickets
        ${where}
        GROUP BY date
      )
      SELECT
        (SELECT SUM(daily_count) FROM daily) AS total_tickets,
        (SELECT COUNT(*) FROM daily) AS total_days,
        (SELECT COUNT(DISTINCT category) FROM tickets ${where}) AS total_categories,
        (SELECT AVG(daily_count) FROM daily) AS avg_daily_tickets
    `;
    const r = await db.execute(sql, params);
    res.status(200).json(r.rows[0] || {});
  } catch (e) {
    console.error('Error /api/summary:', e);
    res.status(500).json({ error: e.message || 'Internal error' });
  }
};
