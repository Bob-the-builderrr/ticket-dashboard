// api/_db.js
const { createClient } = require('@libsql/client');

const HOST  = 'dashboard-v2-new-bob-the-builderrr.aws-us-east-1.turso.io';
const TOKEN = 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3NjI2ODU5MDgsImlkIjoiYjIwYmEzYmMtNDM1ZS00MTZkLTg1NTgtZjNiMWU0MjU1Njk2IiwicmlkIjoiYTk5ZjBlOWYtNjZmMy00MmFmLWFhYzAtNDRjNjY5Y2Y4NDhkIn0.wstJXPnEZ9ApXRp5rknkc2GfD-6AeCMTNSzdjoovOC_Cd3LqNjRR-TUKHvtqYArmmigAA1DKDGvG1UVCuEBADw';

const CANDIDATE_URLS = [`https://${HOST}`, `libsql://${HOST}`];

let client, tried = false, lastErr;

async function getClient() {
  if (client) return client;
  if (tried) throw lastErr;
  tried = true;

  for (const url of CANDIDATE_URLS) {
    try {
      const c = createClient({ url, authToken: TOKEN });
      await c.execute('SELECT 1 AS ok');
      client = c;
      return client;
    } catch (e) {
      lastErr = e;
      // try next candidate
    }
  }
  throw lastErr || new Error('Failed to connect to Turso');
}

async function execute(sql, args = []) {
  const c = await getClient();
  // api routes can pass sql string or {sql, args}
  if (typeof sql === 'string') {
    return c.execute({ sql, args });
  }
  return c.execute(sql);
}

module.exports = { execute };
