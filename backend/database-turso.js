// backend/database-turso.js
const { createClient } = require('@libsql/client');

// ---- DIRECT CREDENTIALS (bypass .env) ----
const RAW_TURSO_URL = 'https://dashboard-v2-new-bob-the-builderrr.aws-us-east-1.turso.io';
const TURSO_TOKEN   = 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3NjI2ODU5MDgsImlkIjoiYjIwYmEzYmMtNDM1ZS00MTZkLTg1NTgtZjNiMWU0MjU1Njk2IiwicmlkIjoiYTk5ZjBlOWYtNjZmMy00MmFmLWFhYzAtNDRjNjY5Y2Y4NDhkIn0.wstJXPnEZ9ApXRp5rknkc2GfD-6AeCMTNSzdjoovOC_Cd3LqNjRR-TUKHvtqYArmmigAA1DKDGvG1UVCuEBADw';

// Normalize host once
const host = RAW_TURSO_URL.replace(/^https?:\/\//, '').replace(/^libsql:\/\//, '');

// Try https first, then libsql as fallback
const CANDIDATE_URLS = [
  `https://${host}`,
  `libsql://${host}`,
];

let db;

/**
 * Build a client and test it quickly with SELECT 1.
 */
async function tryClient(url) {
  const client = createClient({ url, authToken: TURSO_TOKEN });
  const probe = await client.execute('SELECT 1 AS ok;'); // fail fast on 404/401
  if (!probe || !probe.rows || !probe.rows.length) {
    throw new Error('No rows from SELECT 1');
  }
  return client;
}

/**
 * Initialize the client with fallback and basic retries on 404/transient errors.
 */
async function initClient() {
  let lastErr;
  for (const url of CANDIDATE_URLS) {
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const client = await tryClient(url);
        db = client;
        console.log(`✅ Connected to Turso: ${url} (attempt ${attempt})`);
        return db;
      } catch (e) {
        lastErr = e;
        const msg = String(e && e.message || e);
        const code = e && (e.code || e.rawCode);
        const retryable = /SERVER_ERROR|404|ECONNRESET|ETIMEDOUT|ENOTFOUND/i.test(msg) || code === 'SERVER_ERROR';
        console.warn(`⚠️ Connection failed using ${url} (attempt ${attempt}): ${msg}`);
        if (!retryable || attempt === 2) break;
        await new Promise(r => setTimeout(r, 400)); // small backoff
      }
    }
  }
  throw lastErr;
}

/**
 * Return a ready client. Initializes once per process.
 */
async function getDb() {
  if (!db) await initClient();
  return db;
}

/**
 * Your original test + table creation, kept intact but routed via getDb().
 */
async function testConnection() {
  try {
    const c = await getDb();
    const r = await c.execute('SELECT 1 AS ok;');
    if (!r || !r.rows) throw new Error('No rows from SELECT 1');
    console.log('✅ SELECT 1 ok');
  } catch (err) {
    console.error('❌ Connection test failed:', err.message);
    throw err;
  }
}

async function createTables() {
  await testConnection(); // fail early with clear error

  try {
    console.log('🔄 Creating tickets table...');
    const c = await getDb();
    await c.execute(`
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
    // Helpful index if you filter/summarize a lot
    await c.execute(`CREATE INDEX IF NOT EXISTS idx_tickets_date ON tickets(date);`);
    await c.execute(`CREATE INDEX IF NOT EXISTS idx_tickets_ticket_id ON tickets(ticket_id);`);
    await c.execute(`CREATE INDEX IF NOT EXISTS idx_tickets_category ON tickets(category);`);
    await c.execute(`CREATE INDEX IF NOT EXISTS idx_tickets_plan_type ON tickets(plan_type);`);

    console.log('✅ Tickets table created successfully!');
    return true;
  } catch (error) {
    console.error('❌ Table creation failed:', error.message);
    return false;
  }
}

module.exports = { db: { execute: (...args) => getDb().then(c => c.execute(...args)) }, createTables };
