const express = require('express');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const shopifyMiddleware = require('../middleware/shopify.middleware');
const orderAuth = require('../extensions/middleware/orderAuth'); // ← AJOUTER
const ShopifyController = require('../controllers/shopify.controller');
const ShopifyConfig = require('../models/ShopifyConfig');
const ShopifyService = require('../services/ShopifyService');

const SHOPIFY_API_VERSION = process.env.SHOPIFY_API_VERSION || '2026-07';
const SHOPIFY_SCOPES = process.env.SHOPIFY_SCOPES || 'read_orders,read_products,read_customers';
const SHOPIFY_REDIRECT_URI = process.env.SHOPIFY_REDIRECT_URI || 'https://sellmaster-1.onrender.com/api/shopify/auth/callback';
const FRONTEND_URL = process.env.SHOPIFY_FRONTEND_URL || 'https://sellmaster.web.app';

function normalizeShopDomain(shop) {
  const value = String(shop || '').trim().toLowerCase();
  const domain = value.endsWith('.myshopify.com') ? value : `${value}.myshopify.com`;
  if (!/^[a-z0-9][a-z0-9-]*\.myshopify\.com$/.test(domain)) {
    throw new Error('Nom de boutique Shopify invalide');
  }
  return domain;
}

function getShopifySecret() {
  return process.env.SHOPIFY_CLIENT_SECRET || process.env.SHOPIFY_API_SECRET;
}

async function shopifyGraphql(shopDomain, accessToken, query, variables = {}) {
  const response = await axios.post(
    `https://${shopDomain}/admin/api/${SHOPIFY_API_VERSION}/graphql.json`,
    { query, variables },
    { headers: { 'X-Shopify-Access-Token': accessToken, 'Content-Type': 'application/json' } }
  );
  if (response.data.errors?.length) {
    throw new Error(response.data.errors.map(error => error.message).join('; '));
  }
  return response.data.data;
}

async function registerShopifyWebhooks(shopDomain, accessToken) {
  const callbackUrl = `${process.env.SHOPIFY_WEBHOOK_URL || 'https://sellmaster-1.onrender.com/api/shopify/webhook'}`;
  const existing = await shopifyGraphql(shopDomain, accessToken, `
    query {
      webhookSubscriptions(first: 50) {
        nodes { topic endpoint { ... on WebhookHttpEndpoint { callbackUrl } } }
      }
    }
  `);
  const current = existing.webhookSubscriptions.nodes || [];
  const topics = ['ORDERS_CREATE', 'ORDERS_UPDATED'];

  for (const topic of topics) {
    const alreadyRegistered = current.some(subscription =>
      subscription.topic === topic && subscription.endpoint?.callbackUrl === callbackUrl
    );
    if (alreadyRegistered) continue;

    const result = await shopifyGraphql(shopDomain, accessToken, `
      mutation CreateWebhook($topic: WebhookSubscriptionTopic!, $webhookSubscription: WebhookSubscriptionInput!) {
        webhookSubscriptionCreate(topic: $topic, webhookSubscription: $webhookSubscription) {
          userErrors { field message }
          webhookSubscription { id topic }
        }
      }
    `, {
      topic,
      webhookSubscription: { callbackUrl, format: 'JSON' }
    });
    const errors = result.webhookSubscriptionCreate.userErrors || [];
    if (errors.length) throw new Error(errors.map(error => error.message).join('; '));
  }
}

// ==================== ROUTES PROTÉGÉES ====================
// Toutes les routes nécessitent l'authentification JWT

// Test de connexion Shopify
router.post('/test-connection', authMiddleware, ShopifyController.testConnection);

// Gestion des stores Shopify
router.post('/stores', authMiddleware, ShopifyController.configureStore);
router.get('/stores', authMiddleware, ShopifyController.getStores);
router.delete('/stores/:storeId', 
  authMiddleware, 
  shopifyMiddleware.validateStoreOwnership,
  ShopifyController.deleteStore
);

// Synchronisation des commandes
router.get('/stores/:storeId/orders/sync', 
  authMiddleware, 
  shopifyMiddleware.validateStoreOwnership,orderAuth,
  ShopifyController.syncOrders
);

router.get('/stores/:storeId/stats', 
  authMiddleware, 
  shopifyMiddleware.validateStoreOwnership,
  ShopifyController.getSyncStats
);

function buildShopifyAuthorizationUrl(shopDomain, userId) {
  const state = jwt.sign(
    { userId, shop: shopDomain },
    process.env.JWT_SECRET || 'votre_secret_jwt',
    { expiresIn: '10m' }
  );
  const params = new URLSearchParams({
    client_id: process.env.SHOPIFY_CLIENT_ID || '',
    scope: SHOPIFY_SCOPES,
    redirect_uri: SHOPIFY_REDIRECT_URI,
    state
  });
  return `https://${shopDomain}/admin/oauth/authorize?${params.toString()}`;
}

// Prépare l'installation Shopify depuis Sellmaster sans exposer le JWT dans l'URL.
router.get('/auth/start', authMiddleware, (req, res) => {
  try {
    const shopDomain = normalizeShopDomain(req.query.shop);
    if (!process.env.SHOPIFY_CLIENT_ID || !getShopifySecret()) {
      return res.status(500).json({ error: 'Shopify OAuth is not configured' });
    }
    return res.json({ url: buildShopifyAuthorizationUrl(shopDomain, req.userId) });
  } catch (error) {
    console.error('[Shopify OAuth] Authorization error:', error.message);
    return res.status(400).json({ error: 'Invalid Shopify OAuth request' });
  }
});

// Reçoit le code Shopify, sauvegarde le token et crée les webhooks automatiquement.
router.get('/auth/callback', async (req, res) => {
  try {
    const { code, state, shop } = req.query;
    const decoded = jwt.verify(String(state || ''), process.env.JWT_SECRET || 'votre_secret_jwt');
    const shopDomain = normalizeShopDomain(shop || decoded.shop);
    const secret = getShopifySecret();
    if (!code || !secret || decoded.shop !== shopDomain) {
      return res.status(400).send('Invalid Shopify OAuth callback');
    }

    const tokenResponse = await axios.post(`https://${shopDomain}/admin/oauth/access_token`, {
      client_id: process.env.SHOPIFY_CLIENT_ID,
      client_secret: secret,
      code
    });
    const accessToken = tokenResponse.data.access_token;
    if (!accessToken) throw new Error('Shopify access token missing');

    await ShopifyConfig.upsertOAuthStore({
      shopName: shopDomain,
      apiKey: process.env.SHOPIFY_CLIENT_ID,
      accessToken
    }, decoded.userId);
    await registerShopifyWebhooks(shopDomain, accessToken);

    const redirect = new URL(FRONTEND_URL);
    redirect.searchParams.set('shopify', 'connected');
    return res.redirect(redirect.toString());
  } catch (error) {
    console.error('[Shopify OAuth] Callback error:', error.response?.data || error.message);
    const redirect = new URL(FRONTEND_URL);
    redirect.searchParams.set('shopify', 'error');
    return res.redirect(redirect.toString());
  }
});

// Webhook Shopify (sans auth JWT, mais avec validation HMAC Shopify)
router.post('/webhook', async (req, res) => {
  try {
    const rawBody = req.body;
    const hmacHeader = req.headers['x-shopify-hmac-sha256'];
    const topic = req.headers['x-shopify-topic'];
    const shopDomain = req.headers['x-shopify-shop-domain'];
    const webhookId = req.headers['x-shopify-webhook-id'];

    if (!rawBody || !Buffer.isBuffer(rawBody)) {
      return res.status(400).send('Invalid raw body');
    }

    if (!process.env.SHOPIFY_API_SECRET) {
      console.error('[Shopify Webhook] Missing SHOPIFY_API_SECRET in environment');
      return res.status(500).send('Webhook secret missing');
    }

    if (!hmacHeader || !topic || !shopDomain) {
      console.warn('[Shopify Webhook] Missing required webhook headers', {
        hmacHeader: !!hmacHeader,
        topic: !!topic,
        shopDomain: !!shopDomain,
      });
      return res.status(401).send('Missing Shopify webhook headers');
    }

    const generatedHmac = crypto
      .createHmac('sha256', process.env.SHOPIFY_API_SECRET)
      .update(rawBody)
      .digest('base64');

    const expectedHmac = Array.isArray(hmacHeader) ? hmacHeader[0] : hmacHeader;
    const providedHmac = Buffer.from(expectedHmac);
    const generatedBuffer = Buffer.from(generatedHmac);

    if (
      providedHmac.length !== generatedBuffer.length ||
      !crypto.timingSafeEqual(providedHmac, generatedBuffer)
    ) {
      console.error('[Shopify Webhook] Invalid HMAC', {
        shopDomain,
        topic,
        webhookId,
      });
      return res.status(401).send('Invalid HMAC');
    }

    const payload = JSON.parse(rawBody.toString('utf8'));
    const orderId = payload?.id || payload?.order?.id || null;
    console.log('[Shopify Webhook] Received:', {
      shopDomain,
      topic,
      webhookId,
      orderId
    });

    if (!orderId && topic && !topic.includes('orders')) {
      return res.status(200).send('OK');
    }

    const storeConfig = await ShopifyConfig.findByShopName(shopDomain);
    if (!storeConfig) {
      console.warn('[Shopify Webhook] Store not found for shop domain:', shopDomain);
      return res.status(404).send('Store not configured');
    }

    const service = new ShopifyService(storeConfig.user_id);
    await service.saveOrderToDatabase(payload, storeConfig.id);

    console.log('[Shopify Webhook] Order synced successfully for store:', storeConfig.id, 'shop:', shopDomain);
    return res.status(200).send('OK');
  } catch (error) {
    console.error('[Shopify Webhook] Error:', error);
    return res.status(500).send('Error');
  }
});

module.exports = router;