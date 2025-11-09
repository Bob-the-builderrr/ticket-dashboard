const db = require('./_db');

module.exports = async function handler(req, res) {
  try {
    const { from, to, sortBy, sortOrder, plan_types, categories } = req.query;
    if (!from || !to) return res.status(400).json({ error: 'Please provide from and to dates' });

    const sortField = sortBy === 'category' ? 'category' : 'count';
    const order = (sortOrder || '').toLowerCase() === 'asc' ? 'ASC' : 'DESC';

    let where = `WHERE date BETWEEN ? AND ?`;
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
    res.status(500).json({ error: String(e.message || e) });
  }
};
