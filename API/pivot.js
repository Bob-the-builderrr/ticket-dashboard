const { createClient } = require('@libsql/client');
const TURSO_URL   = 'https://dashboard-v2-new-bob-the-builderrr.aws-us-east-1.turso.io';
const TURSO_TOKEN = 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3NjI2ODU5MDgsImlkIjoiYjIwYmEzYmMtNDM1ZS00MTZkLTg1NTgtZjNiMWU0MjU1Njk2IiwicmlkIjoiYTk5ZjBlOWYtNjZmMy00MmFmLWFhYzAtNDRjNjY5Y2Y4NDhkIn0.wstJXPnEZ9ApXRp5rknkc2GfD-6AeCMTNSzdjoovOC_Cd3LqNjRR-TUKHvtqYArmmigAA1DKDGvG1UVCuEBADw';
const db = createClient({ url: TURSO_URL, authToken: TURSO_TOKEN });

module.exports = async (req, res) => {
  try {
    const { from, to, sortBy, sortOrder, plan_types, categories } = req.query;
    if (!from || !to) return res.status(400).json({ error: 'Provide from and to (YYYY-MM-DD)' });

    const sortField = sortBy === 'category' ? 'category' : 'count';
    const order = (String(sortOrder || '').toLowerCase() === 'asc') ? 'ASC' : 'DESC';

    let where = `WHERE date BETWEEN ? AND ?`;
    const params = [from, to];

    if (plan_types && plan_types !== 'ALL') {
      const arr = String(plan_types).split(',').map(s => s.trim()).filter(Boolean);
      if (arr.length) { where += ` AND plan_type IN (${arr.map(() => '?').join(',')})`; params.push(...arr); }
    }

    if (categories && categories !== 'ALL') {
      const cats = String(categories).split(',').map(s => s.trim()).filter(Boolean);
      if (cats.length) { where += ` AND category IN (${cats.map(() => '?').join(',')})`; params.push(...cats); }
    }

    const sql = `
      SELECT date, category, COUNT(*) AS count
      FROM tickets
      ${where}
      GROUP BY date, category
      ORDER BY date ASC, ${sortField} ${order}
    `;
    const r = await db.execute(sql, params);
    res.status(200).json(r.rows);
  } catch (e) {
    console.error('Error /api/pivot:', e);
    res.status(500).json({ error: e.message || 'Internal error' });
  }
};
