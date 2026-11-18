const express = require('express');
const { rateLimit } = require('express-rate-limit');
const authMiddleware = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/rbacMiddleware');
const ResearchProduct = require('../models/ResearchProduct');
const ResearchLibrary = require('../models/ResearchLibrary');
const { fetchShopifyPublicProduct } = require('../services/productResearch/shopifyPublicSource');
const ResearchAd = require('../models/ResearchAd');

const router = express.Router();
router.use(authMiddleware, requireRole('owner'));

const importLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 30,
  keyGenerator: (req) => `product-research:${req.userId}`,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Limite de recherches atteinte. Réessayez plus tard.' },
});

const jobLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 20,
  keyGenerator: (req) => `product-research-job:${req.userId}`,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Limite de recherches créées atteinte.' },
});

function numericId(value) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

router.post('/import-url', importLimiter, async (req, res) => {
  try {
    const url = String(req.body?.url || '').trim();
    if (!url) return res.status(400).json({ error: 'URL du produit requise.' });
    if (url.length > 2000) return res.status(400).json({ error: 'URL du produit trop longue.' });

    const sourceResult = await fetchShopifyPublicProduct(url);
    const product = await ResearchProduct.importFromSource(Number(req.userId), sourceResult);
    const latest = await ResearchProduct.findById(Number(req.userId), product.id);
    return res.status(201).json({ success: true, product: latest });
  } catch (error) {
    const status = error.statusCode || 502;
    return res.status(status).json({ error: error.message || 'Impossible d’analyser cette URL.' });
  }
});

router.get('/products', async (req, res) => {
  try {
    const result = await ResearchProduct.list(Number(req.userId), {
      q: String(req.query.q || '').slice(0, 200),
      sourceType: String(req.query.sourceType || '').slice(0, 30),
      limit: req.query.limit,
      cursor: req.query.cursor,
    });
    return res.json({ success: true, ...result });
  } catch (error) {
    return res.status(500).json({ error: 'Impossible de charger les produits recherchés.' });
  }
});

router.get('/products/:id', async (req, res) => {
  const productId = numericId(req.params.id);
  if (!productId) return res.status(400).json({ error: 'Identifiant produit invalide.' });
  const product = await ResearchProduct.findById(Number(req.userId), productId);
  if (!product) return res.status(404).json({ error: 'Produit introuvable.' });
  return res.json({ success: true, product });
});

router.get('/products/:id/observations', async (req, res) => {
  const productId = numericId(req.params.id);
  if (!productId) return res.status(400).json({ error: 'Identifiant produit invalide.' });
  const product = await ResearchProduct.findById(Number(req.userId), productId);
  if (!product) return res.status(404).json({ error: 'Produit introuvable.' });
  const result = await ResearchProduct.observations(Number(req.userId), productId, {
    limit: req.query.limit,
    cursor: req.query.cursor,
  });
  return res.json({ success: true, ...result });
});

router.get('/library', async (req, res) => {
  const result = await ResearchLibrary.listSaved(Number(req.userId), {
    limit: req.query.limit,
    cursor: req.query.cursor,
  });
  return res.json({ success: true, ...result });
});

router.put('/products/:id/saved', async (req, res) => {
  const productId = numericId(req.params.id);
  if (!productId) return res.status(400).json({ error: 'Identifiant produit invalide.' });
  const saved = await ResearchLibrary.setSaved(Number(req.userId), productId, req.body?.saved !== false);
  return res.json({ success: true, saved });
});

router.delete('/products/:id/saved', async (req, res) => {
  const productId = numericId(req.params.id);
  if (!productId) return res.status(400).json({ error: 'Identifiant produit invalide.' });
  await ResearchLibrary.setSaved(Number(req.userId), productId, false);
  return res.json({ success: true, saved: false });
});

router.get('/collections', async (req, res) => {
  const collections = await ResearchLibrary.listCollections(Number(req.userId));
  return res.json({ success: true, collections });
});

router.post('/collections', async (req, res) => {
  try {
    const name = String(req.body?.name || '').trim();
    if (!name || name.length > 120) return res.status(400).json({ error: 'Nom de collection requis (120 caractères maximum).' });
    const description = String(req.body?.description || '').trim().slice(0, 1000) || null;
    const collection = await ResearchLibrary.createCollection(Number(req.userId), name, description);
    return res.status(201).json({ success: true, collection });
  } catch (error) {
    if (String(error.code) === '23505') return res.status(409).json({ error: 'Cette collection existe déjà.' });
    return res.status(500).json({ error: 'Impossible de créer la collection.' });
  }
});

router.delete('/collections/:id', async (req, res) => {
  const collectionId = numericId(req.params.id);
  if (!collectionId) return res.status(400).json({ error: 'Identifiant collection invalide.' });
  const deleted = await ResearchLibrary.deleteCollection(Number(req.userId), collectionId);
  if (!deleted) return res.status(404).json({ error: 'Collection introuvable.' });
  return res.json({ success: true, deleted: true });
});

router.put('/collections/:collectionId/products/:productId', async (req, res) => {
  try {
    await ResearchLibrary.setCollectionProduct(
      Number(req.userId), req.params.collectionId, req.params.productId, true
    );
    return res.json({ success: true, added: true });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ error: error.message || 'Impossible d’ajouter le produit.' });
  }
});

router.delete('/collections/:collectionId/products/:productId', async (req, res) => {
  try {
    await ResearchLibrary.setCollectionProduct(
      Number(req.userId), req.params.collectionId, req.params.productId, false
    );
    return res.json({ success: true, removed: true });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ error: error.message || 'Impossible de retirer le produit.' });
  }
});

router.get('/products/:id/notes', async (req, res) => {
  const productId = numericId(req.params.id);
  if (!productId) return res.status(400).json({ error: 'Identifiant produit invalide.' });
  const notes = await ResearchLibrary.listNotes(Number(req.userId), productId);
  return res.json({ success: true, notes });
});

router.post('/products/:id/notes', async (req, res) => {
  const productId = numericId(req.params.id);
  const body = String(req.body?.body || '').trim();
  if (!productId) return res.status(400).json({ error: 'Identifiant produit invalide.' });
  if (!body || body.length > 10000) return res.status(400).json({ error: 'Note requise (10000 caractères maximum).' });
  const note = await ResearchLibrary.createNote(Number(req.userId), productId, body);
  if (!note) return res.status(404).json({ error: 'Produit introuvable.' });
  return res.status(201).json({ success: true, note });
});

router.patch('/notes/:id', async (req, res) => {
  const noteId = numericId(req.params.id);
  const body = String(req.body?.body || '').trim();
  if (!noteId) return res.status(400).json({ error: 'Identifiant note invalide.' });
  if (!body || body.length > 10000) return res.status(400).json({ error: 'Note requise (10000 caractères maximum).' });
  const note = await ResearchLibrary.updateNote(Number(req.userId), noteId, body);
  if (!note) return res.status(404).json({ error: 'Note introuvable.' });
  return res.json({ success: true, note });
});

router.delete('/notes/:id', async (req, res) => {
  const noteId = numericId(req.params.id);
  if (!noteId) return res.status(400).json({ error: 'Identifiant note invalide.' });
  const deleted = await ResearchLibrary.deleteNote(Number(req.userId), noteId);
  if (!deleted) return res.status(404).json({ error: 'Note introuvable.' });
  return res.json({ success: true, deleted: true });
});

router.get('/collections/:id', async (req, res) => {
  const collectionId = numericId(req.params.id);
  if (!collectionId) return res.status(400).json({ error: 'Identifiant collection invalide.' });
  const collection = await ResearchLibrary.getCollection(Number(req.userId), collectionId);
  if (!collection) return res.status(404).json({ error: 'Collection introuvable.' });
  const products = await ResearchLibrary.listCollectionProducts(Number(req.userId), collectionId);
  return res.json({ success: true, collection, products });
});

router.patch('/collections/:id', async (req, res) => {
  try {
    const collectionId = numericId(req.params.id);
    if (!collectionId) return res.status(400).json({ error: 'Identifiant collection invalide.' });
    const name = req.body?.name == null ? null : String(req.body.name).trim();
    const description = req.body?.description == null ? null : String(req.body.description).trim().slice(0, 1000);
    if (name !== null && (!name || name.length > 120)) {
      return res.status(400).json({ error: 'Nom de collection invalide.' });
    }
    const collection = await ResearchLibrary.updateCollection(Number(req.userId), collectionId, name, description);
    if (!collection) return res.status(404).json({ error: 'Collection introuvable.' });
    return res.json({ success: true, collection });
  } catch (error) {
    if (String(error.code) === '23505') return res.status(409).json({ error: 'Cette collection existe déjà.' });
    return res.status(500).json({ error: 'Impossible de modifier la collection.' });
  }
});

router.post('/jobs', jobLimiter, async (req, res) => {
  try {
    const sourceType = String(req.body?.sourceType || 'meta_extension').toLowerCase();
    if (!['meta_extension', 'manual'].includes(sourceType)) {
      return res.status(400).json({ error: 'Source de recherche non prise en charge.' });
    }
    const queryText = String(req.body?.queryText || '').trim();
    if (!queryText) return res.status(400).json({ error: 'Mot-clé requis.' });
    if (queryText.length > 200) return res.status(400).json({ error: 'Mot-clé trop long.' });
    const job = await ResearchAd.createJob(Number(req.userId), {
      sourceType,
      queryText,
      targetUrl: req.body?.targetUrl,
      marketCode: req.body?.marketCode,
    });
    return res.status(201).json({ success: true, job });
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Impossible de créer la recherche.' });
  }
});

router.get('/jobs', async (req, res) => {
  const result = await ResearchAd.listJobs(Number(req.userId), {
    limit: req.query.limit,
    cursor: req.query.cursor,
  });
  return res.json({ success: true, ...result });
});

router.get('/jobs/:id', async (req, res) => {
  const jobId = numericId(req.params.id);
  if (!jobId) return res.status(400).json({ error: 'Identifiant job invalide.' });
  const job = await ResearchAd.getJob(Number(req.userId), jobId);
  if (!job) return res.status(404).json({ error: 'Recherche introuvable.' });
  return res.json({ success: true, job });
});

router.get('/jobs/:id/ads', async (req, res) => {
  const jobId = numericId(req.params.id);
  if (!jobId) return res.status(400).json({ error: 'Identifiant job invalide.' });
  const job = await ResearchAd.getJob(Number(req.userId), jobId);
  if (!job) return res.status(404).json({ error: 'Recherche introuvable.' });
  const result = await ResearchAd.listJobAds(Number(req.userId), jobId, {
    limit: req.query.limit,
    cursor: req.query.cursor,
  });
  return res.json({ success: true, ...result });
});

router.patch('/jobs/:id/cancel', async (req, res) => {
  const jobId = numericId(req.params.id);
  if (!jobId) return res.status(400).json({ error: 'Identifiant job invalide.' });
  const job = await ResearchAd.cancelJob(Number(req.userId), jobId);
  if (!job) return res.status(404).json({ error: 'Recherche introuvable ou déjà terminée.' });
  return res.json({ success: true, job });
});

router.patch('/jobs/:id/progress', async (req, res) => {
  const jobId = numericId(req.params.id);
  if (!jobId) return res.status(400).json({ error: 'Identifiant job invalide.' });
  const allowedStatus = new Set(['running', 'completed', 'failed', 'cancelled']);
  const status = String(req.body?.status || 'running');
  if (!allowedStatus.has(status)) return res.status(400).json({ error: 'Statut job invalide.' });
  const job = await ResearchAd.updateProgress(Number(req.userId), jobId, req.body || {});
  if (!job) return res.status(404).json({ error: 'Recherche introuvable.' });
  return res.json({ success: true, job });
});

router.post('/jobs/:id/ads/ingest', jobLimiter, async (req, res) => {
  try {
    const jobId = numericId(req.params.id);
    if (!jobId) return res.status(400).json({ error: 'Identifiant job invalide.' });
    if (!Array.isArray(req.body?.ads)) return res.status(400).json({ error: 'Liste d’annonces requise.' });
    const result = await ResearchAd.ingestAds(Number(req.userId), jobId, req.body.ads);
    return res.status(201).json({ success: true, ...result });
  } catch (error) {
    return res.status(error.statusCode || 400).json({ error: error.message || 'Ingestion impossible.' });
  }
});

router.get('/ads', async (req, res) => {
  const result = await ResearchAd.listAds(Number(req.userId), {
    productId: req.query.productId,
    platform: req.query.platform,
    limit: req.query.limit,
    cursor: req.query.cursor,
  });
  return res.json({ success: true, ...result });
});

router.get('/products/:id/ads', async (req, res) => {
  const productId = numericId(req.params.id);
  if (!productId) return res.status(400).json({ error: 'Identifiant produit invalide.' });
  const result = await ResearchAd.listAds(Number(req.userId), {
    productId,
    platform: req.query.platform,
    limit: req.query.limit,
    cursor: req.query.cursor,
  });
  return res.json({ success: true, ...result });
});

module.exports = router;