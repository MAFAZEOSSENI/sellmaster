const express = require('express');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { rateLimit } = require('express-rate-limit');
const authMiddleware = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/rbacMiddleware');
const PageBuilder = require('../models/PageBuilder');
const { extractProduct } = require('../services/pageBuilder/productExtractor');
const { generateText, generateImage } = require('../services/pageBuilder/aiProvider');
const Order = require('../models/Order');

const router = express.Router();
const aiLimiter = rateLimit({ windowMs: 60 * 1000, limit: 12, standardHeaders: 'draft-7', legacyHeaders: false, message: { error: 'Limite de génération IA atteinte. Réessayez dans une minute.' } });
const publicOrderLimiter = rateLimit({ windowMs: 60 * 1000, limit: 5, standardHeaders: 'draft-7', legacyHeaders: false, message: { error: 'Trop de tentatives. Réessayez dans une minute.' } });

router.get('/public/:slug', async (req, res) => {
  const page = await PageBuilder.getPublicBySlug(req.params.slug);
  if (!page) return res.status(404).json({ error: 'Page introuvable ou non publiée.' });
  return res.json({ page });
});

router.post('/public/:slug/orders', publicOrderLimiter, async (req, res) => {
  const page = await PageBuilder.getPublicBySlug(req.params.slug);
  if (!page) return res.status(404).json({ error: 'Page introuvable ou non publiée.' });
  const name = String(req.body?.customer_name || '').trim().slice(0, 255);
  const phone = String(req.body?.customer_phone || '').trim().slice(0, 50);
  const address = String(req.body?.customer_address || '').trim().slice(0, 1000);
  const quantity = Number(req.body?.quantity || 1);
  if (!name || !phone || !address) return res.status(400).json({ error: 'Nom, téléphone et adresse sont requis.' });
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 100) return res.status(400).json({ error: 'Quantité invalide.' });

  try {
    const productId = page.product_id ? Number(page.product_id) : null;
    const price = Number(req.body?.unit_price ?? page.content_json?.offer?.price ?? 0);
    if (!Number.isFinite(price) || price <= 0) return res.status(400).json({ error: 'Prix de la commande invalide.' });
    const order = await Order.createWithCustomNumber({
      client_name: name, client_phone: phone, client_address: address, total_amount: price * quantity,
      status: 'dashboard', notes: `Commande depuis la landing page /p/${page.slug}`,
      source: 'page-builder', ownerId: page.owner_user_id,
      items: productId ? [{ productId, productName: page.title, unitPrice: price, quantity }] : [],
      shopify_data: { landing_page_id: page.id, landing_page_slug: page.slug, variant: req.body?.variant || null },
    }, page.owner_user_id);
    return res.status(201).json({ success: true, order });
  } catch (error) {
    return res.status(400).json({ error: error.message || 'Impossible d’enregistrer la commande.' });
  }
});

router.use(authMiddleware, requireRole('owner', 'manager'));

router.post('/import', aiLimiter, async (req, res) => {
  try {
    if (req.body?.manual === true) {
      const product = req.body.product || {};
      if (!String(product.title || '').trim()) return res.status(400).json({ error: 'Le titre du produit est requis.' });
      const project = await PageBuilder.createProject(Number(req.userId), { source_type: 'manual', product_data: {
        title: String(product.title).trim().slice(0, 300), description: String(product.description || '').slice(0, 10000),
        images: Array.isArray(product.images) ? product.images.filter((url) => /^https:\/\//i.test(url)).slice(0, 20) : [],
        features: Array.isArray(product.features) ? product.features.slice(0, 100) : [], variants: Array.isArray(product.variants) ? product.variants.slice(0, 100) : [],
        price: product.price == null ? null : Number(product.price), supplier: String(product.supplier || '').slice(0, 300), source_url: null,
      } });
      return res.status(201).json({ project });
    }
    const product = await extractProduct(req.body?.url);
    const project = await PageBuilder.createProject(Number(req.userId), { source_url: product.source_url, source_type: product.source_type, product_data: product });
    return res.status(201).json({ project, product });
  } catch (error) {
    const status = /invalide|interdite|interne|publique|bloquée|introuvable/i.test(error.message) ? 422 : 502;
    return res.status(status).json({ error: error.message || 'Impossible d’analyser ce produit.' });
  }
});

router.post('/projects/:id/analyze', aiLimiter, async (req, res) => {
  try {
    const project = await PageBuilder.findProject(Number(req.userId), req.params.id);
    if (!project) return res.status(404).json({ error: 'Projet introuvable.' });
    const product = project.product_data || {};
    const analysis = await generateText(`Analyse uniquement les données confirmées suivantes. Pour toute donnée incertaine, utilise une chaîne vide ou une liste vide et marque uncertain=true. JSON attendu: {
"commercialName":"", "shortDescription":"", "longDescription":"", "summary":"", "problem":"", "targetAudience":"", "buyerProfile":"", "painPoints":[], "realBenefits":[], "technicalFeatures":[], "salesArguments":[], "objections":[], "objectionAnswers":[], "mainAngle":"", "secondaryAngles":[], "hook":"", "alternativeTitles":[], "cta":[], "faq":[{"question":"","answer":""}], "offerProposal":"", "packSuggestions":[], "uncertainFields":[], "uncertain":true
}\nProduit: ${JSON.stringify(product)}\nMarché: ${req.body?.market || 'Bénin'}\nLangue: ${req.body?.language || 'Français'}\nStyle: ${req.body?.style || 'direct-conversion'}`);
    const updated = await PageBuilder.updateProject(Number(req.userId), project.id, { ai_analysis: analysis, status: 'analyzed' });
    return res.json({ project: updated, analysis });
  } catch (error) {
    return res.status(502).json({ error: error.message });
  }
});

router.post('/projects/:id/copy', aiLimiter, async (req, res) => {
  try {
    const project = await PageBuilder.findProject(Number(req.userId), req.params.id);
    if (!project) return res.status(404).json({ error: 'Projet introuvable.' });
    const angle = String(req.body?.angle || 'Problème → Solution').slice(0, 100);
    const content = await generateText(`Crée un copywriting e-commerce vérifiable. Ne fabrique ni témoignage, ni résultat, ni garantie, ni certification. Retourne JSON: {
"sections":[{"id":"hero","title":"","subtitle":"","body":"","cta":""},{"id":"problem","title":"","subtitle":"","body":"","cta":""},{"id":"solution","title":"","subtitle":"","body":"","cta":""},{"id":"benefits","title":"","items":[{"title":"","text":""}],"cta":""},{"id":"offer","title":"","text":"","packs":[],"cta":""},{"id":"faq","title":"","items":[{"question":"","answer":""}]},{"id":"final_cta","title":"","body":"","cta":""}],
"warnings":[]
}. Produit: ${JSON.stringify(project.product_data)}. Analyse: ${JSON.stringify(project.ai_analysis)}. Marché: ${req.body?.market || 'Bénin'}. Langue: ${req.body?.language || 'Français'}. Angle: ${angle}. Prix validé: ${req.body?.price ?? 'non fourni'}. Livraison/COD: ${JSON.stringify(req.body?.cod || {})}.`);
    await PageBuilder.updateProject(Number(req.userId), project.id, { status: 'copy-ready' });
    return res.json({ content });
  } catch (error) {
    return res.status(502).json({ error: error.message });
  }
});

router.post('/projects/:id/assets/generate', aiLimiter, async (req, res) => {
  try {
    const project = await PageBuilder.findProject(Number(req.userId), req.params.id);
    if (!project) return res.status(404).json({ error: 'Projet introuvable.' });
    const page = await PageBuilder.createOrUpdatePage(Number(req.userId), project.id, req.body?.page || { title: project.product_data?.title || 'Landing page', content_json: req.body?.content || {} });
    if (!page) return res.status(404).json({ error: 'Impossible de créer la page.' });

    const requests = Array.isArray(req.body?.assets) ? req.body.assets.slice(0, 8) : [];
    if (!requests.length) return res.status(400).json({ error: 'Sélectionnez au moins un visuel à générer.' });

    const results = [];
    for (const asset of requests) {
      const prompt = String(asset.prompt || '').trim().slice(0, 4000);
      if (!prompt) {
        results.push({ status: 'failed', error: 'Prompt requis.' });
        continue;
      }
      const ratioMap = { '1:1': '1024x1024', '4:5': '1024x1280', '3:4': '1024x1365', '16:9': '1536x1024', '9:16': '1024x1792' };
      const pending = await PageBuilder.addAsset(Number(req.userId), page.id, { asset_type: asset.type || 'hero', source_type: 'generated', prompt, generation_status: 'pending', metadata_json: { ratio: asset.ratio || '1:1', style: asset.style || '', context: asset.context || '' } });
      if (!pending) continue;
      try {
        const image = await generateImage(`${prompt}\nRespecter exactement la forme, les couleurs, les proportions et la configuration visibles du produit source. Ne pas ajouter de produit différent, de texte, de badge, de prix ni de marque.`, { size: ratioMap[asset.ratio] || '1024x1024' });
        let sourceUrl = image.sourceUrl;
        if (!sourceUrl && image.b64) {
          const uploadDir = path.join(__dirname, '../../uploads/page-builder');
          fs.mkdirSync(uploadDir, { recursive: true });
          const filename = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}.png`;
          fs.writeFileSync(path.join(uploadDir, filename), Buffer.from(image.b64, 'base64'));
          sourceUrl = `/uploads/page-builder/${filename}`;
        }
        const updated = await PageBuilder.updateAsset(Number(req.userId), pending.id, { source_url: sourceUrl, generation_status: 'succeeded', metadata_json: { ratio: asset.ratio || '1:1', style: asset.style || '', context: asset.context || '' } });
        results.push(updated || { id: pending.id, status: 'succeeded', source_url: sourceUrl });
      } catch (error) {
        const failed = await PageBuilder.updateAsset(Number(req.userId), pending.id, { generation_status: 'failed', metadata_json: { ratio: asset.ratio || '1:1', error: error.message } });
        results.push(failed || { id: pending.id, generation_status: 'failed', error: error.message });
      }
    }
    const successfulUrls = results
      .map((item) => item?.source_url)
      .filter((value) => typeof value === 'string' && value.trim())
    if (successfulUrls.length) {
      await PageBuilder.createOrUpdatePage(Number(req.userId), project.id, {
        id: page.id,
        title: page.title,
        template: page.template,
        content_json: { ...(req.body?.content || {}), images: successfulUrls },
        theme_json: page.theme_json || {},
        seo_json: page.seo_json || {},
        status: page.status,
      })
    }
    return res.json({ pageId: page.id, assets: results });
  } catch (error) {
    return res.status(502).json({ error: error.message });
  }
});

router.get('/projects', async (req, res) => res.json({ projects: await PageBuilder.listProjects(Number(req.userId)) }));
router.get('/projects/:id', async (req, res) => {
  const project = await PageBuilder.findProject(Number(req.userId), req.params.id);
  return project ? res.json({ project }) : res.status(404).json({ error: 'Projet introuvable.' });
});
router.put('/projects/:id', async (req, res) => {
  const project = await PageBuilder.updateProject(Number(req.userId), req.params.id, req.body || {});
  return project ? res.json({ project }) : res.status(404).json({ error: 'Projet introuvable.' });
});
router.get('/pages', async (req, res) => res.json({ pages: await PageBuilder.listPages(Number(req.userId)) }));
router.get('/pages/:id', async (req, res) => {
  const page = await PageBuilder.getPage(Number(req.userId), req.params.id);
  return page ? res.json({ page }) : res.status(404).json({ error: 'Page introuvable.' });
});
router.put('/pages/:id', async (req, res) => {
  const page = await PageBuilder.createOrUpdatePage(Number(req.userId), req.body.project_id, { ...req.body, id: req.params.id });
  return page ? res.json({ page }) : res.status(404).json({ error: 'Page introuvable.' });
});
router.post('/pages/:id/publish', async (req, res) => {
  const page = await PageBuilder.publish(Number(req.userId), req.params.id);
  if (!page) return res.status(404).json({ error: 'Page introuvable.' });
  const publicBase = String(process.env.PAGE_BUILDER_PUBLIC_URL || process.env.SHOPIFY_FRONTEND_URL || 'https://www.sellmaster.site').replace(/\/$/, '');
  return res.json({ page, url: `${publicBase}/p/${encodeURIComponent(page.slug)}` });
});

module.exports = router;
