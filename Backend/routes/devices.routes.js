const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const { getConnection } = require('../config/database');

const router = express.Router();
const allowedPlatforms = new Set(['android', 'ios', 'web']);
router.use(authMiddleware);

router.post('/register', async (req, res) => {
  const token = typeof req.body?.token === 'string' ? req.body.token.trim() : '';
  const platform = typeof req.body?.platform === 'string' ? req.body.platform.trim().toLowerCase() : '';
  if (!token || token.length > 4096 || !allowedPlatforms.has(platform)) {
    return res.status(400).json({ error: 'Jeton ou plateforme invalide.' });
  }

  const conn = await getConnection();
  try {
    await conn.query(
      `INSERT INTO device_tokens (user_id, token, platform, last_seen_at, created_at)
       VALUES (?, ?, ?, NOW(), NOW())
       ON CONFLICT (token)
       DO UPDATE SET user_id = EXCLUDED.user_id, platform = EXCLUDED.platform, last_seen_at = NOW()`,
      [Number(req.userId), token, platform]
    );
    return res.json({ success: true });
  } catch (error) {
    console.error('[Devices] Registration failed:', error.message);
    return res.status(500).json({ error: 'Impossible d’enregistrer cet appareil.' });
  } finally {
    conn.release();
  }
});

router.delete('/:token', async (req, res) => {
  const token = String(req.params.token || '').trim();
  if (!token || token.length > 4096) return res.status(400).json({ error: 'Jeton invalide.' });

  const conn = await getConnection();
  try {
    await conn.query(
      'DELETE FROM device_tokens WHERE token = ? AND user_id = ?',
      [token, Number(req.userId)]
    );
    return res.json({ success: true });
  } catch (error) {
    console.error('[Devices] Unregistration failed:', error.message);
    return res.status(500).json({ error: 'Impossible de supprimer cet appareil.' });
  } finally {
    conn.release();
  }
});

module.exports = router;