// api/summary.js
const { createClient } = require('@libsql/client');

const RAW_TURSO_URL = 'https://dashboard-v2-new-bob-the-builderrr.aws-us-east-1.turso.io';
const TURSO_TOKEN   = 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3NjI2ODU5MDgsImlkIjoiYjIwYmEzYmMtNDM1ZS00MTZkLTg1NTgtZjNiMWU0MjU1Njk2IiwicmlkIjoiYTk5ZjBlOWYtNjZmMy00MmFmLWFhYzAtNDRjNjY5Y2Y4NDhkIn0.wstJXPnEZ9ApXRp5rknkc2GfD-6AeCMTNSzdjoovOC_Cd3LqNjRR-TUKHvtqYArmmigAA1DKDGvG1UVCuEBADw';

const db = createClient({ url: RAW_TURSO_URL, authToken: TURSO_TOKEN });

function buildWhere(q) {
  const { from, to, plan_types } = q;
  if (!from || !to) {
    const e = new Error('Please provide from and to dates as YYYY-MM-DD');
    e.status = 400;
    throw e;
  }
  let where = 'WHERE date BETWEEN ? AND ?';
  const params = [from, to];

  if (plan_types && plan_types !== 'ALL') {
    const arr = String(plan_types).split(',').map(s => s.trim()).filter(Boolean);
    if (arr.length) {
      where += ` AND plan_type IN (${arr.map(() => '?').join(',')})`;
      params.push(...arr);
    }
  }
  return { where, params };
}

module.exports = async (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  try {
    const { where, params } = buildWhere(req.query);
    const sql = `
      WITH daily_counts AS (
        SELECT date, COUNT(DISTINCT ticket_id) AS daily_count
        FROM tickets
        ${where}
        GROUP BY date
      )
      SELECT
        (SELECT SUM(daily_count) FROM daily_counts) AS total_tickets,
        (SELECT COUNT(*) FROM daily_counts)         AS total_days,
        (SELECT COUNT(DISTINCT category)
           FROM tickets
           ${where})                                AS total_categories,
        (SELECT AVG(daily_count) FROM daily_counts) AS avg_daily_tickets
    `;
    const { rows } = await db.execute(sql, params);
    res.status(200).send(JSON.stringify(rows[0] || {}));
  } catch (e) {
    res.status(e.status || 500).send(JSON.stringify({ error: e.message }));
  }
};
