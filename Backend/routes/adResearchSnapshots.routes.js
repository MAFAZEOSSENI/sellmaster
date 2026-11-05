const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/rbacMiddleware');
const { getConnection } = require('../config/database');

const router = express.Router();
router.use(authMiddleware, requireRole('owner'));

function normalizeProductUrl(value) {
  if (!value) return '';
  try {
    const url = new URL(String(value));
    return url.origin + url.pathname;
  } catch (_) {
    return String(value).trim();
  }
}

router.post('/', async (req, res) => {
  const records = Array.isArray(req.body?.items) ? req.body.items : [];
  if (!records.length) return res.status(400).json({ error: 'Aucune donnée de snapshot fournie.' });

  const conn = await getConnection();
  try {
    let inserted = 0;
    for (const record of records) {
      const productUrl = normalizeProductUrl(record?.productUrl || record?.product_url || record?.store || '');
      if (!productUrl) continue;
      await conn.query(
        `INSERT INTO "ad_research_snapshots" (owner_id, product_url, ad_count, page_count, price, available, score, scanned_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
        [
          Number(req.userId),
          productUrl,
          Math.max(0, Number(record?.adCount || record?.ad_count || 0) || 0),
          Math.max(0, Number(record?.pageCount || record?.page_count || 0) || 0),
          record?.price != null && Number(record.price) >= 0 ? Number(record.price) : null,
          record?.available == null ? null : Boolean(record.available),
          Math.max(0, Number(record?.score || 0) || 0),
        ]
      );
      inserted += 1;
    }
    return res.json({ inserted });
  } catch (error) {
    console.error('[Ad research snapshots] Save failed:', error.message);
    return res.status(500).json({ error: 'Impossible d’enregistrer l’historique de recherche.' });
  } finally {
    conn.release();
  }
});

router.get('/', async (req, res) => {
  const conn = await getConnection();
  try {
    const limit = Math.min(200, Math.max(1, Number.parseInt(req.query.limit, 10) || 50));
    const [rows] = await conn.query(
      `SELECT id, owner_id, product_url, ad_count, page_count, price, available, score, scanned_at
       FROM "ad_research_snapshots"
       WHERE owner_id = $1
       ORDER BY scanned_at DESC
       LIMIT $2`,
      [Number(req.userId), limit]
    );
    return res.json({ items: rows });
  } catch (error) {
    console.error('[Ad research snapshots] List failed:', error.message);
    return res.status(500).json({ error: 'Impossible de lire l’historique de recherche.' });
  } finally {
    conn.release();
  }
});

module.exports = router;
