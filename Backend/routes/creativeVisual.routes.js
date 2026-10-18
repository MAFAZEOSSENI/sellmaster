const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/rbacMiddleware');
const { getConnection } = require('../config/database');
const { isValidVisualHash, hammingDistance, similarityPercent } = require('../utils/visualHash');

const router = express.Router();
router.use(authMiddleware, requireRole('owner'));

function safeHttpsUrl(value, allowedHost) {
  try {
    const url = new URL(String(value || ''));
    return url.protocol === 'https:' && allowedHost(url.hostname) ? url.toString().slice(0, 2000) : '';
  } catch (_) {
    return '';
  }
}

const isMetaCdn = hostname => /(^|\.)fbcdn\.net$/i.test(hostname);
const isImageHost = hostname => isMetaCdn(hostname) || hostname === 'cdn.shopify.com' || /(^|\.)myshopify\.com$/i.test(hostname);

router.post('/index', async (req, res) => {
  const incoming = Array.isArray(req.body?.items) ? req.body.items.slice(0, 50) : [];
  const items = incoming.map(item => ({
    libraryId: String(item?.libraryId || '').replace(/\D/g, '').slice(0, 32),
    imageHash: String(item?.imageHash || '').toLowerCase(),
    imageUrl: safeHttpsUrl(item?.imageUrl, isImageHost),
    storeUrl: safeHttpsUrl(item?.storeUrl, hostname => isImageHost(hostname) || !/(^|\.)(facebook\.com|instagram\.com)$/i.test(hostname)),
    videoUrl: safeHttpsUrl(item?.videoUrl, isMetaCdn),
    productName: String(item?.productName || '').trim().slice(0, 300),
    pageName: String(item?.pageName || '').trim().slice(0, 300),
    country: String(item?.country || '').trim().slice(0, 100),
    startedAt: item?.startedAt && !Number.isNaN(Date.parse(item.startedAt)) ? new Date(item.startedAt).toISOString() : null,
  })).filter(item => item.libraryId && isValidVisualHash(item.imageHash) && item.imageUrl);

  if (!items.length) return res.status(400).json({ error: 'Aucune création valide à indexer.' });

  const conn = await getConnection();
  try {
    let indexed = 0;
    for (const item of items) {
      await conn.query(
        `INSERT INTO creative_visual_index
           (owner_user_id, library_id, image_hash, image_url, store_url, video_url, product_name, page_name, country, started_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
         ON CONFLICT (owner_user_id, library_id)
         DO UPDATE SET image_hash = EXCLUDED.image_hash, image_url = EXCLUDED.image_url,
           store_url = EXCLUDED.store_url, video_url = EXCLUDED.video_url,
           product_name = EXCLUDED.product_name, page_name = EXCLUDED.page_name,
           country = EXCLUDED.country, started_at = EXCLUDED.started_at, updated_at = NOW()`,
        [Number(req.userId), item.libraryId, item.imageHash, item.imageUrl, item.storeUrl || null, item.videoUrl || null,
          item.productName || null, item.pageName || null, item.country || null, item.startedAt]
      );
      indexed += 1;
    }
    return res.json({ indexed });
  } catch (error) {
    console.error('[Creative visual] Index failed:', error.message);
    return res.status(500).json({ error: 'Impossible d’enregistrer les créations visuelles.' });
  } finally {
    conn.release();
  }
});

router.post('/search', async (req, res) => {
  const imageHash = String(req.body?.imageHash || '').toLowerCase();
  if (!isValidVisualHash(imageHash)) return res.status(400).json({ error: 'Image de référence invalide.' });
  const limit = Math.min(100, Math.max(1, Number.parseInt(req.body?.limit, 10) || 30));
  const parsedDistance = Number.parseInt(req.body?.maxDistance, 10);
  const maxDistance = Math.min(32, Math.max(0, Number.isInteger(parsedDistance) ? parsedDistance : 20));

  const conn = await getConnection();
  try {
    const [rows] = await conn.query(
      `SELECT library_id, image_hash, image_url, store_url, video_url, product_name, page_name, country, started_at
       FROM creative_visual_index
       WHERE owner_user_id = $1
       ORDER BY updated_at DESC
       LIMIT 5000`,
      [Number(req.userId)]
    );
    const matches = rows.map(row => ({
      ...row,
      distance: hammingDistance(imageHash, row.image_hash),
    })).filter(row => row.distance <= maxDistance)
      .sort((left, right) => left.distance - right.distance || new Date(right.started_at || 0) - new Date(left.started_at || 0))
      .slice(0, limit)
      .map(row => ({
        libraryId: row.library_id,
        imageHash: row.image_hash,
        imageUrl: row.image_url,
        storeUrl: row.store_url,
        videoUrl: row.video_url,
        productName: row.product_name || 'Nom non détecté',
        pageName: row.page_name || 'Page non détectée',
        country: row.country || '',
        startedAt: row.started_at,
        distance: row.distance,
        similarity: similarityPercent(row.distance),
      }));
    return res.json({ indexedCount: rows.length, matches });
  } catch (error) {
    console.error('[Creative visual] Search failed:', error.message);
    return res.status(500).json({ error: 'Impossible de rechercher dans la bibliothèque visuelle.' });
  } finally {
    conn.release();
  }
});

module.exports = router;