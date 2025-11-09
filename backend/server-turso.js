// backend/server-turso.js
const express = require('express');
const cors = require('cors');

// Uses your hardcoded creds inside backend/database-turso.js
const { db, createTables } = require('./database-turso');

const app = express();
app.use(cors());
app.use(express.json());

// Health
app.get('/health', (_req, res) => res.json({ ok: true }));

// Tickets summary by date (COUNT DISTINCT ticket_id)
app.get('/api/tickets', async (req, res) => {
  const { from, to, plan_types } = req.query;
  if (!from || !to) return res.status(400).json({ error: 'Please provide from and to dates' });

  try {
    let where = `WHERE date BETWEEN ? AND ?`;
    const params = [from, to];

    if (plan_types && plan_types !== 'ALL') {
      const arr = plan_types.split(',').map(s => s.trim()).filter(Boolean);
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
    const result = await db.execute(sql, params);
    res.json(result.rows);
  } catch (err) {
    console.error('Error /api/tickets:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Category/date pivot
app.get('/api/pivot', async (req, res) => {
  const { from, to, sortBy, sortOrder, plan_types, categories } = req.query;
  if (!from || !to) return res.status(400).json({ error: 'Please provide from and to dates' });

  try {
    const sortField = sortBy === 'count' ? 'count' : 'category';
    const order = (sortOrder || '').toLowerCase() === 'desc' ? 'DESC' : 'ASC';

    let where = `WHERE date BETWEEN ? AND ?`;
    const params = [from, to];

    if (plan_types && plan_types !== 'ALL') {
      const arr = plan_types.split(',').map(s => s.trim()).filter(Boolean);
      if (arr.length) {
        where += ` AND plan_type IN (${arr.map(() => '?').join(',')})`;
        params.push(...arr);
      }
    }

    if (categories && categories !== 'ALL') {
      const cats = categories.split(',').map(s => s.trim()).filter(Boolean);
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
    const result = await db.execute(sql, params);
    res.json(result.rows);
  } catch (err) {
    console.error('Error /api/pivot:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Distinct plan types
app.get('/api/plan-types', async (_req, res) => {
  try {
    const sql = `SELECT DISTINCT plan_type FROM tickets WHERE plan_type IS NOT NULL AND plan_type <> '' ORDER BY plan_type ASC`;
    const result = await db.execute(sql);
    res.json(result.rows.map(r => r.plan_type));
  } catch (err) {
    console.error('Error /api/plan-types:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Distinct categories
app.get('/api/categories', async (_req, res) => {
  try {
    const sql = `SELECT DISTINCT category FROM tickets WHERE category IS NOT NULL AND category <> '' ORDER BY category ASC`;
    const result = await db.execute(sql);
    res.json(result.rows.map(r => r.category));
  } catch (err) {
    console.error('Error /api/categories:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Summary
app.get('/api/summary', async (req, res) => {
  const { from, to, plan_types } = req.query;
  if (!from || !to) return res.status(400).json({ error: 'Please provide from and to dates' });

  try {
    let where = `WHERE date BETWEEN ? AND ?`;
    const params = [from, to];

    if (plan_types && plan_types !== 'ALL') {
      const arr = plan_types.split(',').map(s => s.trim()).filter(Boolean);
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
    const result = await db.execute(sql, params);
    res.json(result.rows[0] || {});
  } catch (err) {
    console.error('Error /api/summary:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Boot
(async function start() {
  try {
    const ok = await createTables();
    if (!ok) {
      console.error('DB init failed. Server not started.');
      process.exit(1);
    }
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('Fatal DB init error:', err.message);
    process.exit(1);
  }
})();
