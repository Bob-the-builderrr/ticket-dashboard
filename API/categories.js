const { db, ensureSchema } = require('./_db');

module.exports = async (_req, res) => {
  try {
    await ensureSchema();
    const sql = `SELECT DISTINCT category FROM tickets WHERE category IS NOT NULL AND category <> '' ORDER BY category ASC`;
    const r = await db.execute(sql);
    res.status(200).json(r.rows.map(x => x.category));
  } catch (e) {
    console.error('Error /api/categories:', e);
    res.status(500).json({ error: e.message || 'Internal error' });
  }
};
