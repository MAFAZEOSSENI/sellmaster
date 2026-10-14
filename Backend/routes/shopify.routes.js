const express = require('express');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const dns = require('node:dns').promises;
const https = require('node:https');
const { rateLimit } = require('express-rate-limit');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const shopifyMiddleware = require('../middleware/shopify.middleware');
const orderAuth = require('../extensions/middleware/orderAuth'); // ← AJOUTER
const ShopifyController = require('../controllers/shopify.controller');
const ShopifyConfig = require('../models/ShopifyConfig');
const Product = require('../models/Product');
const { parseShopifyProductUrl, normalizeScrapedProduct, normalizeImportPayload } = require('../utils/shopifyProductImport');
const ShopifyService = require('../services/ShopifyService');
const { verifyShopifyOAuthHmac } = require('../utils/shopifyOAuth');

const SHOPIFY_API_VERSION = process.env.SHOPIFY_API_VERSION || '2026-07';
const SHOPIFY_SCOPES = process.env.SHOPIFY_SCOPES || 'read_orders,write_orders,read_products,write_products,read_customers,read_inventory';
const SHOPIFY_REDIRECT_URI = process.env.SHOPIFY_REDIRECT_URI || 'https://sellmaster-1.onrender.com/api/shopify/auth/callback';
const FRONTEND_URL = process.env.SHOPIFY_FRONTEND_URL || 'https://www.sellmaster.site/';
const scrapeProductLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 20,
  keyGenerator: (req) => `user:${req.userId}`,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Limite de récupération atteinte. Réessayez dans une heure.' },
});

function isPublicIpv4(address) {
  const octets = address.split('.').map(Number);
  if (octets.length !== 4 || octets.some((octet) => !Number.isInteger(octet) || octet < 0 || octet > 255)) return false;
  const [first, second, third] = octets;
  if (first === 0 || first === 10 || first === 127 || first >= 224) return false;
  if (first === 100 && second >= 64 && second <= 127) return false;
  if (first === 169 && second === 254) return false;
  if (first === 172 && second >= 16 && second <= 31) return false;
  if (first === 192 && (second === 168 || (second === 0 && third === 0) || (second === 0 && third === 2) || (second === 88 && third === 99) || (second === 168))) return false;
  if (first === 198 && ((second === 18 || second === 19) || (second === 51 && third === 100))) return false;
  if (first === 203 && second === 0 && third === 113) return false;
  return true;
}

function normalizeShopDomain(shop) {
  const value = String(shop || '')
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/\/$/, '');
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

router.post('/products/scrape', authMiddleware, scrapeProductLimiter, async (req, res) => {
  const parsedUrl = parseShopifyProductUrl(req.body?.url);
  if (!parsedUrl) {
    return res.status(422).json({
      error: 'URL invalide. Fournissez une URL HTTPS de boutique Shopify au format https://boutique.myshopify.com/products/handle.',
    });
  }

  try {
    let resolvedAddresses;
    try {
      resolvedAddresses = await dns.lookup(parsedUrl.shopDomain, { all: true, family: 4, verbatim: true });
    } catch {
      return res.status(422).json({ error: 'Le domaine de cette URL ne correspond pas à une boutique Shopify publique.' });
    }
    const publicAddress = resolvedAddresses.find(({ address }) => isPublicIpv4(address))?.address;
    if (!publicAddress) {
      return res.status(422).json({ error: 'Le domaine de cette URL ne correspond pas à une boutique Shopify publique.' });
    }

    const pinnedAgent = new https.Agent({
      keepAlive: false,
      lookup: (_hostname, options, callback) => {
        if (options?.all) callback(null, [{ address: publicAddress, family: 4 }]);
        else callback(null, publicAddress, 4);
      },
    });
    let response;
    try {
      response = await axios.get(
        `https://${parsedUrl.shopDomain}/products/${encodeURIComponent(parsedUrl.handle)}.json`,
        { timeout: 12000, maxRedirects: 0, httpsAgent: pinnedAgent, headers: { Accept: 'application/json' } }
      );
    } finally {
      pinnedAgent.destroy();
    }
    const product = normalizeScrapedProduct(response.data?.product);
    if (!product) {
      return res.status(422).json({ error: 'Cette URL ne correspond pas à un produit Shopify public valide.' });
    }
    return res.json({ product });
  } catch (error) {
    const upstreamStatus = error.response?.status;
    if (upstreamStatus === 404 || upstreamStatus === 301 || upstreamStatus === 302) {
      return res.status(422).json({ error: 'Produit Shopify introuvable ou URL non valide.' });
    }
    console.error('[Shopify product scrape] Failed:', error.response?.data || error.message);
    return res.status(502).json({ error: 'Impossible de récupérer ce produit depuis Shopify pour le moment.' });
  }
});

router.post('/products/import', authMiddleware, shopifyMiddleware.validateStoreOwnership, async (req, res) => {
  const storeId = Number(req.body?.storeId);
  if (!Number.isInteger(storeId) || storeId <= 0 || Number(req.shopifyStore?.id) !== storeId) {
    return res.status(400).json({ error: 'Identifiant de boutique Shopify invalide.' });
  }
  if (!req.shopifyStore?.is_active || !req.shopifyStore?.access_token) {
    return res.status(409).json({ error: 'Cette boutique Shopify est inactive ou ne possède pas de jeton d’accès.' });
  }

  const normalized = normalizeImportPayload(req.body);
  if (normalized.error) return res.status(400).json({ error: normalized.error });

  const { title, description, price, images, variants } = normalized.value;
  const shopDomain = String(req.shopifyStore.shop_name || '')
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/\/$/, '');
  if (!/^[a-z0-9][a-z0-9-]*\.myshopify\.com$/.test(shopDomain)) {
    return res.status(409).json({ error: 'Le domaine de la boutique Shopify configurée est invalide.' });
  }

  const shopifyProduct = {
    title,
    body_html: description,
    images: images.map((src) => ({ src })),
    options: [{ name: 'Title', values: [...new Set(variants.map((variant) => variant.title))] }],
    variants: variants.map((variant) => ({
      option1: variant.title,
      price: variant.price,
      ...(variant.sku ? { sku: variant.sku } : {}),
    })),
  };

  let createdProduct;
  try {
    const response = await axios.post(
      `https://${shopDomain}/admin/api/${SHOPIFY_API_VERSION}/products.json`,
      { product: shopifyProduct },
      {
        timeout: 20000,
        headers: {
          'X-Shopify-Access-Token': req.shopifyStore.access_token,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
      }
    );
    createdProduct = response.data?.product;
    if (!createdProduct?.id) throw new Error('Shopify n’a pas retourné le produit créé.');
  } catch (error) {
    const details = error.response?.data?.errors;
    console.error('[Shopify product import] Shopify create failed:', details || error.message);
    return res.status(error.response?.status === 401 || error.response?.status === 403 ? 403 : 502).json({
      error: 'Shopify n’a pas pu créer ce produit. Vérifiez les autorisations write_products de la boutique.',
      details: typeof details === 'string' ? details : undefined,
    });
  }

  try {
    const localProduct = await Product.create({
      name: title,
      description,
      price,
      cost_price: null,
      stock: 0,
      image_url: images[0] || null,
    }, req.userId, Number(req.shopifyStore.user_id));

    return res.status(201).json({
      success: true,
      shopifyProduct: createdProduct,
      localProduct,
    });
  } catch (error) {
    console.error('[Shopify product import] Local mirror failed:', error.message);
    return res.status(502).json({
      error: 'Le produit a été créé dans Shopify, mais son enregistrement local a échoué.',
      shopifyProductId: createdProduct.id,
    });
  }
});

router.post('/register-store-credentials', authMiddleware, async (req, res) => {
  try {
    const shopDomain = normalizeShopDomain(req.body?.shopDomain);
    const clientId = String(req.body?.clientId || '').trim();
    const clientSecret = String(req.body?.clientSecret || '').trim();
    if (!clientId || clientId.length > 255 || !clientSecret || clientSecret.length > 4096) {
      return res.status(400).json({ error: 'clientId et clientSecret valides sont requis.' });
    }

    const result = await ShopifyConfig.registerOAuthCredentials(
      { shopName: shopDomain, clientId, clientSecret },
      Number(req.userId)
    );
    return res.status(200).json({ success: true, storeId: result.id, shopName: shopDomain });
  } catch (error) {
    console.error('[Shopify OAuth] Credential registration failed:', error.message);
    return res.status(400).json({ error: 'Impossible d’enregistrer les identifiants Shopify.' });
  }
});

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

router.get('/stores/:storeId/products/sync',
  authMiddleware,
  shopifyMiddleware.validateStoreOwnership,
  ShopifyController.syncProducts
);

router.get('/stores/:storeId/stats', 
  authMiddleware, 
  shopifyMiddleware.validateStoreOwnership,
  ShopifyController.getSyncStats
);

function buildShopifyAuthorizationUrl(shopDomain, userId, clientId) {
  const state = jwt.sign(
    { userId, shop: shopDomain, clientId },
    process.env.JWT_SECRET || 'votre_secret_jwt',
    { expiresIn: '10m' }
  );
  const params = new URLSearchParams({
    client_id: clientId,
    scope: SHOPIFY_SCOPES,
    redirect_uri: SHOPIFY_REDIRECT_URI,
    state
  });
  return `https://${shopDomain}/admin/oauth/authorize?${params.toString()}`;
}

// Prépare l'installation Shopify depuis Sellmaster sans exposer le JWT dans l'URL.
router.get('/auth/start', authMiddleware, async (req, res) => {
  try {
    const shopDomain = normalizeShopDomain(req.query.shop);
    const registered = await ShopifyConfig.findOAuthCredentials(shopDomain, Number(req.userId));
    const useStoreApp = Boolean(registered?.api_key && registered?.client_secret);
    const clientId = useStoreApp ? registered.api_key : process.env.SHOPIFY_CLIENT_ID;
    const clientSecret = useStoreApp ? registered.client_secret : getShopifySecret();
    if (!clientId || !clientSecret) {
      return res.status(500).json({ error: 'Shopify OAuth is not configured' });
    }
    return res.json({ url: buildShopifyAuthorizationUrl(shopDomain, Number(req.userId), clientId) });
  } catch (error) {
    console.error('[Shopify OAuth] Authorization error:', error.message);
    return res.status(400).json({ error: 'Invalid Shopify OAuth request' });
  }
});

// Reçoit le code Shopify, sauvegarde le token et crée les webhooks automatiquement.
router.get('/auth/callback', async (req, res) => {
  try {
    const { code, state, shop } = req.query;
    if (req.query.error) {
      console.warn('[Shopify OAuth] Merchant declined or Shopify returned an error:', {
        error: req.query.error,
        errorDescription: req.query.error_description,
        shop
      });
      return res.redirect(`${FRONTEND_URL}?shopify=cancelled`);
    }

    if (!code || !state || !shop) {
      console.warn('[Shopify OAuth] Missing callback parameters:', {
        hasCode: Boolean(code),
        hasState: Boolean(state),
        hasShop: Boolean(shop)
      });
      return res.status(400).send('Invalid Shopify OAuth callback: missing parameters');
    }

    const decoded = jwt.verify(String(state || ''), process.env.JWT_SECRET || 'votre_secret_jwt');
    const requestedShopDomain = normalizeShopDomain(decoded.shop);
    const shopDomain = normalizeShopDomain(shop);
    const clientId = decoded.clientId || process.env.SHOPIFY_CLIENT_ID;
    if (!clientId) return res.status(500).send('Shopify OAuth is not configured');
    const storeCredentials = await ShopifyConfig.findOAuthCredentials(requestedShopDomain, Number(decoded.userId), clientId);
    const clientSecret = storeCredentials?.client_secret || (clientId === process.env.SHOPIFY_CLIENT_ID ? getShopifySecret() : null);
    if (!clientSecret) return res.status(400).send('Shopify app credentials not registered for this store');
    if (!verifyShopifyOAuthHmac(req.query, clientSecret)) {
      return res.status(401).send('Invalid Shopify OAuth callback: HMAC verification failed');
    }

    const tokenResponse = await axios.post(`https://${shopDomain}/admin/oauth/access_token`, {
      client_id: clientId,
      client_secret: clientSecret,
      code
    });
    const accessToken = tokenResponse.data.access_token;
    if (!accessToken) throw new Error('Shopify access token missing');

    let shopInfo = {};
    try {
      const shopResponse = await axios.get(`https://${shopDomain}/admin/api/${SHOPIFY_API_VERSION}/shop.json`, {
        headers: { 'X-Shopify-Access-Token': accessToken, Accept: 'application/json' },
        timeout: 15000,
      });
      shopInfo = shopResponse.data?.shop || {};
    } catch (error) {
      console.warn('[Shopify OAuth] Could not resolve store aliases:', error.response?.data || error.message);
    }

    const savedStore = await ShopifyConfig.upsertOAuthStore({
      shopName: shopDomain,
      apiKey: clientId,
      clientSecret,
      accessToken,
      shopInfo,
      shopAliases: [
        shopDomain,
        shopInfo.domain,
        shopInfo.primary_domain?.host,
        shopInfo.primary_domain,
      ],
    }, decoded.userId);
    await registerShopifyWebhooks(savedStore.shop_name, accessToken);

    const redirect = new URL(FRONTEND_URL);
    redirect.searchParams.set('shopify', 'connected');
    redirect.searchParams.set('store', savedStore.shop_name);
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

    if (!hmacHeader || !topic || !shopDomain) {
      console.warn('[Shopify Webhook] Missing required webhook headers', {
        hmacHeader: !!hmacHeader,
        topic: !!topic,
        shopDomain: !!shopDomain,
      });
      return res.status(401).send('Missing Shopify webhook headers');
    }

    const storeConfig = await ShopifyConfig.findByShopName(shopDomain);
    if (!storeConfig) {
      console.warn('[Shopify Webhook] Store not found for shop domain:', shopDomain);
      return res.status(404).send('Store not configured');
    }
    const webhookSecret = storeConfig.client_secret || getShopifySecret();
    if (!webhookSecret) {
      console.error('[Shopify Webhook] No signing secret configured for store');
      return res.status(500).send('Webhook secret missing');
    }

    const generatedHmac = crypto
      .createHmac('sha256', webhookSecret)
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