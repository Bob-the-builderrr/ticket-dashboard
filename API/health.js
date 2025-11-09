const { ensureSchema } = require('./_db');

module.exports = async (_req, res) => {
  try {
    await ensureSchema();
    res.status(200).json({ ok: true });
  } catch (e) {
    console.error('Error /api/health:', e);
    res.status(500).json({ error: e.message || 'Internal error' });
  }
};
