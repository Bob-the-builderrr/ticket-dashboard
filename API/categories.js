const { createClient } = require('@libsql/client');
const TURSO_URL   = 'https://dashboard-v2-new-bob-the-builderrr.aws-us-east-1.turso.io';
const TURSO_TOKEN = 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3NjI2ODU5MDgsImlkIjoiYjIwYmEzYmMtNDM1ZS00MTZkLTg1NTgtZjNiMWU0MjU1Njk2IiwicmlkIjoiYTk5ZjBlOWYtNjZmMy00MmFmLWFhYzAtNDRjNjY5Y2Y4NDhkIn0.wstJXPnEZ9ApXRp5rknkc2GfD-6AeCMTNSzdjoovOC_Cd3LqNjRR-TUKHvtqYArmmigAA1DKDGvG1UVCuEBADw';
const db = createClient({ url: TURSO_URL, authToken: TURSO_TOKEN });

module.exports = async (_req, res) => {
  try {
    const r = await db.execute(
      `SELECT DISTINCT category FROM tickets WHERE category IS NOT NULL AND category <> '' ORDER BY category ASC`
    );
    res.status(200).json(r.rows.map(x => x.category));
  } catch (e) {
    console.error('Error /api/categories:', e);
    res.status(500).json({ error: e.message || 'Internal error' });
  }
};
