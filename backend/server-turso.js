// backend/server-turso.js
const express = require('express');
const cors = require('cors');
const { createClient } = require('@libsql/client');

// 🔒 Hardcoded Turso creds (as you requested)
const RAW_TURSO_URL = 'https://dashboard-v2-new-bob-the-builderrr.aws-us-east-1.turso.io';
const TURSO_TOKEN   = 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3NjI2ODU5MDgsImlkIjoiYjIwYmEzYmMtNDM1ZS00MTZkLTg1NTgtZjNiMWU0MjU1Njk2IiwicmlkIjoiYTk5ZjBlOWYtNjZmMy00MmFmLWFhYzAtNDRjNjY5Y2Y4NDhkIn0.wstJXPnEZ9ApXRp5rknkc2GfD-6AeCMTNSzdjoovOC_Cd3LqNjRR-TUKHvtqYArmmigAA1DKDGvG1UVCuEBADw';

const db = createClient({ url: RAW_TURSO_URL, authToken: TURSO_TOKEN });

// Ensure table exists
async function createTables() {
  await db.execute('SELECT 1');
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
    )
  `);
  return true;
}

const app = express();
app.use(cors());
app.use(express.json());

// Helpers
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
    if (arr.length) { where += ` AND plan_type IN (${arr.map(() => '?').join(',')})`; params.push(...arr); }
  }
  if (categories && categories !== 'ALL') {
    const cats = String(categories).split(',').map(s => s.trim()).filter(Boolean);
    if (cats.length) { where += ` AND category IN (${cats.map(() => '?').join(',')})`; params.push(...cats); }
  }
  return { where, params };
}

// Routes
app.get('/health', (_req, res) => res.json({ ok: true }));

app.get('/api/plan-types', async (_req, res) => {
  try {
    const { rows } = await db.execute(`
      SELECT DISTINCT plan_type
      FROM tickets
      WHERE plan_type IS NOT NULL AND plan_type <> ''
      ORDER BY plan_type ASC
    `);
    res.json(rows.map(r => r.plan_type));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/categories', async (_req, res) => {
  try {
    const { rows } = await db.execute(`
      SELECT DISTINCT category
      FROM tickets
      WHERE category IS NOT NULL AND category <> ''
      ORDER BY category ASC
    `);
    res.json(rows.map(r => r.category));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/tickets', async (req, res) => {
  try {
    const { where, params } = buildWhere(req.query);
    const { rows } = await db.execute(`
      SELECT date, COUNT(DISTINCT ticket_id) AS count
      FROM tickets
      ${where}
      GROUP BY date
      ORDER BY date ASC
    `, params);
    res.json(rows);
  } catch (e) { res.status(e.status || 500).json({ error: e.message }); }
});

app.get('/api/pivot', async (req, res) => {
  try {
    const sortField = req.query.sortBy === 'category' ? 'category' : 'count';
    const order = (req.query.sortOrder || '').toLowerCase() === 'asc' ? 'ASC' : 'DESC';
    const { where, params } = buildWhere(req.query);
    const { rows } = await db.execute(`
      SELECT date, category, COUNT(*) AS count
      FROM tickets
      ${where}
      GROUP BY date, category
      ORDER BY date ASC, ${sortField} ${order}
    `, params);
    res.json(rows);
  } catch (e) { res.status(e.status || 500).json({ error: e.message }); }
});

app.get('/api/summary', async (req, res) => {
  try {
    const { where, params } = buildWhere(req.query);
    const { rows } = await db.execute(`
      WITH daily_counts AS (
        SELECT date, COUNT(DISTINCT ticket_id) AS daily_count
        FROM tickets
        ${where}
        GROUP BY date
      )
      SELECT
        (SELECT SUM(daily_count) FROM daily_counts) AS total_tickets,
        (SELECT COUNT(*) FROM daily_counts)         AS total_days,
        (SELECT COUNT(DISTINCT category) FROM tickets ${where}) AS total_categories,
        (SELECT AVG(daily_count) FROM daily_counts) AS avg_daily_tickets
    `, params);
    res.json(rows[0] || {});
  } catch (e) { res.status(e.status || 500).json({ error: e.message }); }
});

// Boot
(async function start() {
  const ok = await createTables();
  if (!ok) { console.error('DB init failed'); process.exit(1); }
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => console.log(`Server on http://localhost:${PORT}`));
})();
