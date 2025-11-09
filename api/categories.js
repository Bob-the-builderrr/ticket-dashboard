// api/categories.js
const { createClient } = require('@libsql/client');

const RAW_TURSO_URL = 'https://dashboard-v2-new-bob-the-builderrr.aws-us-east-1.turso.io';
const TURSO_TOKEN   = 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3NjI2ODU5MDgsImlkIjoiYjIwYmEzYmMtNDM1ZS00MTZkLTg1NTgtZjNiMWU0MjU1Njk2IiwicmlkIjoiYTk5ZjBlOWYtNjZmMy00MmFmLWFhYzAtNDRjNjY5Y2Y4NDhkIn0.wstJXPnEZ9ApXRp5rknkc2GfD-6AeCMTNSzdjoovOC_Cd3LqNjRR-TUKHvtqYArmmigAA1DKDGvG1UVCuEBADw';

const db = createClient({ url: RAW_TURSO_URL, authToken: TURSO_TOKEN });

module.exports = async (_req, res) => {
  res.setHeader('Content-Type', 'application/json');
  try {
    const sql = `
      SELECT DISTINCT category
      FROM tickets
      WHERE category IS NOT NULL AND category <> ''
      ORDER BY category ASC
    `;
    const { rows } = await db.execute(sql);
    res.status(200).send(JSON.stringify(rows.map(r => r.category)));
  } catch (e) {
    res.status(500).send(JSON.stringify({ error: e.message }));
  }
};
