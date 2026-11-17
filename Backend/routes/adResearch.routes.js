const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/rbacMiddleware');
const { getConnection } = require('../config/database');

const router = express.Router();
router.use(authMiddleware, requireRole('owner'));

const AD_CATEGORIES = new Set(['all', 'political_and_issue_ads']);
function boundedInteger(value, fallback, min, max) {
  const number = Number(value);
  return Number.isInteger(number) && number >= min && number <= max ? number : fallback;
}
function cleanText(value, max = 500) {
  return String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, max);
}
function safeHttpsUrl(value, allowedHosts = null) {
  if (!value) return null;
  try {
    const url = new URL(String(value));
    if (url.protocol !== 'https:' || url.username || url.password) return null;
    if (allowedHosts && !allowedHosts.some(host => host(url.hostname))) return null;
    return url.toString().slice(0, 2000);
  } catch (_) { return null; }
}
const isMetaLibrary = host => host === 'facebook.com' || host === 'www.facebook.com';
const isMediaHost = host => /(^|\.)fbcdn\.net$/i.test(host) || host === 'cdn.shopify.com' || /(^|\.)myshopify\.com$/i.test(host);

async function findOwnedJob(conn, jobId, ownerId) {
  const [rows] = await conn.query(\`
    SELECT id, owner_id, status, country, ad_category, keyword, ad_limit, active_days,
      scanned_count, collected_count, progress_stage, progress_message, error_message,
      started_at, completed_at, created_at, updated_at
    FROM ad_research_jobs WHERE id = $1 AND owner_id = $2\`, [jobId, ownerId]);
  return rows[0] || null;
}

router.post('/jobs', async (req, res) => {
  const country = cleanText(req.body?.country || 'ALL', 3).toUpperCase();
  const adCategory = cleanText(req.body?.adCategory || 'all', 40);
  const keyword = cleanText(req.body?.keyword, 120);
  const adLimit = Number(req.body?.adLimit ?? 50);
  const activeDays = Number(req.body?.activeDays ?? 10);
  if (!(country === 'ALL' || /^[A-Z]{2}$/.test(country))) return res.status(400).json({ error: 'Code pays invalide.' });
  if (!AD_CATEGORIES.has(adCategory)) return res.status(400).json({ error: 'Catégorie publicitaire invalide.' });
  if (!keyword) return res.status(400).json({ error: 'Le mot-clé est obligatoire.' });
  if (!Number.isInteger(adLimit) || adLimit < 1 || adLimit > 200) return res.status(400).json({ error: 'Le nombre d’annonces doit être compris entre 1 et 200.' });
  if (!Number.isInteger(activeDays) || activeDays < 0 || activeDays > 3650) return res.status(400).json({ error: 'La durée doit être comprise entre 0 et 3650 jours.' });
  const conn = await getConnection();
  try {
    const [rows] = await conn.query(\`
      INSERT INTO ad_research_jobs (owner_id, status, country, ad_category, keyword, ad_limit, active_days, progress_stage, progress_message)
      VALUES ($1, 'queued', $2, $3, $4, $5, $6, 'queued', 'Recherche créée, en attente de l’extension.')
      RETURNING id, status, country, ad_category, keyword, ad_limit, active_days, scanned_count, collected_count, progress_stage, progress_message, created_at\`,
    [Number(req.userId), country, adCategory, keyword, adLimit, activeDays]);
    return res.status(201).json({ job: rows[0] });
  } catch (error) {
    console.error('[Product Research] Job creation failed:', error.message);
    return res.status(500).json({ error: 'Impossible de créer la recherche.' });
  } finally { conn.release(); }
});

router.get('/jobs', async (req, res) => {
  const limit = boundedInteger(req.query.limit, 20, 1, 50);
  const conn = await getConnection();
  try {
    const [rows] = await conn.query(\`
      SELECT id, status, country, ad_category, keyword, ad_limit, active_days, scanned_count, collected_count,
        progress_stage, progress_message, error_message, started_at, completed_at, created_at, updated_at
      FROM ad_research_jobs WHERE owner_id = $1 ORDER BY created_at DESC LIMIT $2\`,
    [Number(req.userId), limit]);
    return res.json({ jobs: rows });
  } catch (error) {
    console.error('[Product Research] Job list failed:', error.message);
    return res.status(500).json({ error: 'Impossible de charger les recherches.' });
  } finally { conn.release(); }
});

router.get('/jobs/:jobId', async (req, res) => {
  const jobId = Number(req.params.jobId);
  if (!Number.isSafeInteger(jobId) || jobId <= 0) return res.status(400).json({ error: 'Identifiant de recherche invalide.' });
  const conn = await getConnection();
  try {
    const job = await findOwnedJob(conn, jobId, Number(req.userId));
    if (!job) return res.status(404).json({ error: 'Recherche introuvable.' });
    const [ads] = await conn.query(\`
      SELECT id, meta_ad_id, advertiser_name, ad_library_url, product_url, product_name, ad_text,
        image_url, video_url, country, started_at, observed_at, product_data
      FROM ad_research_ads WHERE job_id = $1 AND owner_id = $2
      ORDER BY started_at DESC NULLS LAST, id DESC LIMIT 200\`, [jobId, Number(req.userId)]);
    return res.json({ job, ads });
  } catch (error) {
    console.error('[Product Research] Job read failed:', error.message);
    return res.status(500).json({ error: 'Impossible de charger cette recherche.' });
  } finally { conn.release(); }
});

router.patch('/jobs/:jobId/progress', async (req, res) => {
  const jobId = Number(req.params.jobId);
  if (!Number.isSafeInteger(jobId) || jobId <= 0) return res.status(400).json({ error: 'Identifiant de recherche invalide.' });
  const stage = cleanText(req.body?.stage || 'collecting', 40);
  if (!['starting', 'collecting'].includes(stage)) return res.status(400).json({ error: 'Étape de progression invalide.' });
  const scannedCount = boundedInteger(req.body?.scannedCount, 0, 0, 100000);
  const collectedCount = boundedInteger(req.body?.collectedCount, 0, 0, 200);
  const message = cleanText(req.body?.message || '', 240);
  const conn = await getConnection();
  try {
    const [rows] = await conn.query(\`
      UPDATE ad_research_jobs SET status = $1, progress_stage = $1,
        scanned_count = GREATEST(scanned_count, $2), collected_count = GREATEST(collected_count, $3),
        progress_message = $4, started_at = COALESCE(started_at, NOW()), updated_at = NOW()
      WHERE id = $5 AND owner_id = $6 AND status IN ('queued', 'starting', 'collecting')
      RETURNING id, status, scanned_count, collected_count, progress_stage, progress_message, started_at\`,
    [stage, scannedCount, collectedCount, message, jobId, Number(req.userId)]);
    if (!rows.length) return res.status(404).json({ error: 'Recherche introuvable ou déjà terminée.' });
    return res.json({ job: rows[0] });
  } catch (error) {
    console.error('[Product Research] Progress update failed:', error.message);
    return res.status(500).json({ error: 'Impossible de mettre à jour la progression.' });
  } finally { conn.release(); }
});

router.post('/jobs/:jobId/ads', async (req, res) => {
  const jobId = Number(req.params.jobId);
  if (!Number.isSafeInteger(jobId) || jobId <= 0) return res.status(400).json({ error: 'Identifiant de recherche invalide.' });
  const incoming = Array.isArray(req.body?.items) ? req.body.items.slice(0, 50) : [];
  if (!incoming.length) return res.status(400).json({ error: 'Aucune annonce fournie.' });
  const items = incoming.map(item => ({
    metaAdId: cleanText(item?.metaAdId || item?.libraryId, 64).replace(/\D/g, ''),
    advertiserName: cleanText(item?.advertiserName || item?.page, 255),
    adLibraryUrl: safeHttpsUrl(item?.adLibraryUrl, [isMetaLibrary]),
    productUrl: safeHttpsUrl(item?.productUrl || item?.store),
    productName: cleanText(item?.productName || item?.product, 300),
    adText: cleanText(item?.adText, 5000),
    imageUrl: safeHttpsUrl(item?.imageUrl || item?.adImageUrl, [isMediaHost]),
    videoUrl: safeHttpsUrl(item?.videoUrl, [host => /(^|\.)fbcdn\.net$/i.test(host)]),
    country: cleanText(item?.country, 100),
    startedAt: item?.startedAt && !Number.isNaN(Date.parse(item.startedAt)) ? new Date(item.startedAt).toISOString() : null,
    productData: item?.productData && typeof item.productData === 'object' ? JSON.stringify(item.productData).slice(0, 12000) : null,
  })).filter(item => item.adLibraryUrl && (item.metaAdId || item.productUrl || item.productName));
  if (!items.length) return res.status(400).json({ error: 'Aucune annonce exploitable après validation.' });
  const conn = await getConnection();
  try {
    const job = await findOwnedJob(conn, jobId, Number(req.userId));
    if (!job || !['queued', 'starting', 'collecting'].includes(job.status)) return res.status(404).json({ error: 'Recherche introuvable ou déjà terminée.' });
    for (const item of items) {
      await conn.query(\`
        INSERT INTO ad_research_ads
          (job_id, owner_id, meta_ad_id, advertiser_name, ad_library_url, product_url, product_name, ad_text,
           image_url, video_url, country, started_at, observed_at, product_data)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), $13::jsonb)
        ON CONFLICT (job_id, meta_ad_id) WHERE meta_ad_id IS NOT NULL
        DO UPDATE SET advertiser_name = EXCLUDED.advertiser_name, ad_library_url = EXCLUDED.ad_library_url,
          product_url = EXCLUDED.product_url, product_name = EXCLUDED.product_name, ad_text = EXCLUDED.ad_text,
          image_url = EXCLUDED.image_url, video_url = EXCLUDED.video_url, country = EXCLUDED.country,
          started_at = EXCLUDED.started_at, observed_at = NOW(), product_data = EXCLUDED.product_data\`,
      [jobId, Number(req.userId), item.metaAdId || null, item.advertiserName || null, item.adLibraryUrl,
        item.productUrl, item.productName || null, item.adText || null, item.imageUrl, item.videoUrl,
        item.country || null, item.startedAt, item.productData]);
    }
    await conn.query(\`
      UPDATE ad_research_jobs SET collected_count = (
        SELECT COUNT(*) FROM ad_research_ads WHERE job_id = $1 AND owner_id = $2
      ), updated_at = NOW() WHERE id = $1 AND owner_id = $2\`, [jobId, Number(req.userId)]);
    return res.json({ saved: items.length });
  } catch (error) {
    console.error('[Product Research] Ad persistence failed:', error.message);
    return res.status(500).json({ error: 'Impossible d’enregistrer les annonces.' });
  } finally { conn.release(); }
});

router.post('/jobs/:jobId/complete', async (req, res) => {
  const jobId = Number(req.params.jobId);
  if (!Number.isSafeInteger(jobId) || jobId <= 0) return res.status(400).json({ error: 'Identifiant de recherche invalide.' });
  const status = cleanText(req.body?.status || 'completed', 20);
  if (!['completed', 'failed', 'cancelled'].includes(status)) return res.status(400).json({ error: 'État final invalide.' });
  const message = cleanText(req.body?.message || '', 240);
  const errorMessage = status === 'failed' ? cleanText(req.body?.error || message, 1000) : null;
  const scannedCount = boundedInteger(req.body?.scannedCount, 0, 0, 100000);
  const conn = await getConnection();
  try {
    const [rows] = await conn.query(\`
      UPDATE ad_research_jobs SET status = $1, progress_stage = $1,
        scanned_count = GREATEST(scanned_count, $2),
        collected_count = (SELECT COUNT(*) FROM ad_research_ads WHERE job_id = $3 AND owner_id = $4),
        progress_message = $5, error_message = $6, started_at = COALESCE(started_at, NOW()),
        completed_at = NOW(), updated_at = NOW()
      WHERE id = $3 AND owner_id = $4 AND status IN ('queued', 'starting', 'collecting')
      RETURNING id, status, scanned_count, collected_count, progress_message, error_message, completed_at\`,
    [status, scannedCount, jobId, Number(req.userId), message || (status === 'completed' ? 'Recherche terminée.' : 'Recherche interrompue.'), errorMessage]);
    if (!rows.length) return res.status(404).json({ error: 'Recherche introuvable ou déjà terminée.' });
    return res.json({ job: rows[0] });
  } catch (error) {
    console.error('[Product Research] Job completion failed:', error.message);
    return res.status(500).json({ error: 'Impossible de terminer la recherche.' });
  } finally { conn.release(); }
});

module.exports = router;
