// backend/server-turso.js
const express = require('express');
const cors = require('cors');
const { createClient } = require('@libsql/client');

// Hardcoded Turso credentials
const TURSO_URL   = 'https://dashboard-v2-new-bob-the-builderrr.aws-us-east-1.turso.io';
const TURSO_TOKEN = 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3NjI2ODU5MDgsImlkIjoiYjIwYmEzYmMtNDM1ZS00MTZkLTg1NTgtZjNiMWU0MjU1Njk2IiwicmlkIjoiYTk5ZjBlOWYtNjZmMy00MmFmLWFhYzAtNDRjNjY5Y2Y4NDhkIn0.wstJXPnEZ9ApXRp5rknkc2GfD-6AeCMTNSzdjoovOC_Cd3LqNjRR-TUKHvtqYArmmigAA1DKDGvG1UVCuEBADw';

const db = createClient({ url: TURSO_URL, authToken: TURSO_TOKEN });

async function ensureSchema() {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS tickets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT,
      ticket_id TEXT,
      plan_type TEXT,
      agent_name TEXT,
      category TEXT,
      gleap_url TEXT,
      complaint TEXT
    );
  `);
}

const app = express();
app.use(cors());
app.use(express.json());

// Health
app.get('/health', async (_req, res) => {
  try {
    await ensureSchema();
    res.json({ ok: true });
  } catch (e) {
    console.error('Error /health:', e);
    res.status(500).json({ error: e.message || 'Internal error' });
  }
});

// Tickets summary by date - COUNT DISTINCT ticket_id
app.get('/api/tickets', async (req, res) => {
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
    res.json(r.rows);
  } catch (e) {
    console.error('Error /api/tickets:', e);
    res.status(500).json({ error: e.message || 'Internal error' });
  }
});

// Category-date pivot - regular COUNT for breakdown
app.get('/api/pivot', async (req, res) => {
  try {
    const { from, to, sortBy, sortOrder, plan_types, categories } = req.query;
    if (!from || !to) return res.status(400).json({ error: 'Please provide from and to dates' });

    const sortField = sortBy === 'category' ? 'category' : 'count';
    const order = (String(sortOrder || '').toLowerCase() === 'asc') ? 'ASC' : 'DESC';

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
    res.json(r.rows);
  } catch (e) {
    console.error('Error /api/pivot:', e);
    res.status(500).json({ error: e.message || 'Internal error' });
  }
});

// Distinct plan types
app.get('/api/plan-types', async (_req, res) => {
  try {
    const r = await db.execute(`
      SELECT DISTINCT plan_type
      FROM tickets
      WHERE plan_type IS NOT NULL AND plan_type <> ''
      ORDER BY plan_type ASC
    `);
    res.json(r.rows.map(x => x.plan_type));
  } catch (e) {
    console.error('Error /api/plan-types:', e);
    res.status(500).json({ error: e.message || 'Internal error' });
  }
});

// Distinct categories
app.get('/api/categories', async (_req, res) => {
  try {
    const r = await db.execute(`
      SELECT DISTINCT category
      FROM tickets
      WHERE category IS NOT NULL AND category <> ''
      ORDER BY category ASC
    `);
    res.json(r.rows.map(x => x.category));
  } catch (e) {
    console.error('Error /api/categories:', e);
    res.status(500).json({ error: e.message || 'Internal error' });
  }
});

// Summary
app.get('/api/summary', async (req, res) => {
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
        SELECT date, COUNT(DISTINCT ticket_id) AS daily_count
        FROM tickets
        ${where}
        GROUP BY date
      )
      SELECT
        (SELECT SUM(daily_count) FROM daily_counts) AS total_tickets,
        (SELECT COUNT(*) FROM daily_counts) AS total_days,
        (SELECT COUNT(DISTINCT category) FROM tickets ${where}) AS total_categories,
        (SELECT AVG(daily_count) FROM daily_counts) AS avg_daily_tickets
    `;
    const r = await db.execute(sql, params);
    res.json(r.rows[0] || {});
  } catch (e) {
    console.error('Error /api/summary:', e);
    res.status(500).json({ error: e.message || 'Internal error' });
  }
});

// Boot - local only
(async function start() {
  try {
    await ensureSchema();
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => console.log(`Local Turso API on http://localhost:${PORT}`));
  } catch (e) {
    console.error('Fatal DB init error:', e);
    process.exit(1);
  }
})();
