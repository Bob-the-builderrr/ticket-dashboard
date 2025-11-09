// api/_db.js
const { createClient } = require('@libsql/client');

// Hardcoded creds (you asked for this)
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

module.exports = { db, ensureSchema };
