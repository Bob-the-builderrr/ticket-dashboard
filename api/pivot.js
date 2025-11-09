// api/pivot.js
const { createClient } = require('@libsql/client');

const RAW_TURSO_URL = 'https://dashboard-v2-new-bob-the-builderrr.aws-us-east-1.turso.io';
const TURSO_TOKEN   = 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3NjI2ODU5MDgsImlkIjoiYjIwYmEzYmMtNDM1ZS00MTZkLTg1NTgtZjNiMWU0MjU1Njk2IiwicmlkIjoiYTk5ZjBlOWYtNjZmMy00MmFmLWFhYzAtNDRjNjY5Y2Y4NDhkIn0.wstJXPnEZ9ApXRp5rknkc2GfD-6AeCMTNSzdjoovOC_Cd3LqNjRR-TUKHvtqYArmmigAA1DKDGvG1UVCuEBADw';

const db = createClient({ url: RAW_TURSO_URL, authToken: TURSO_TOKEN });

function buildWhere(q) {
  const { from, to, plan_types, categories } = q;
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
  if (categories && categories !== 'ALL') {
    const cats = String(categories).split(',').map(s => s.trim()).filter(Boolean);
    if (cats.length) {
      where += ` AND category IN (${cats.map(() => '?').join(',')})`;
      params.push(...cats);
    }
  }
  return { where, params };
}

module.exports = async (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  try {
    const sortField = req.query.sortBy === 'category' ? 'category' : 'count';
    const order = (req.query.sortOrder || '').toLowerCase() === 'asc' ? 'ASC' : 'DESC';

    const { where, params } = buildWhere(req.query);
    const sql = `
      SELECT date, category, COUNT(*) AS count
      FROM tickets
      ${where}
      GROUP BY date, category
      ORDER BY date ASC, ${sortField} ${order}
    `;
    const { rows } = await db.execute(sql, params);
    res.status(200).send(JSON.stringify(rows));
  } catch (e) {
    res.status(e.status || 500).send(JSON.stringify({ error: e.message }));
  }
};
