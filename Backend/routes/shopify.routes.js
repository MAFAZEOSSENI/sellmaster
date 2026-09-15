const express = require('express');
const crypto = require('crypto');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const shopifyMiddleware = require('../middleware/shopify.middleware');
const orderAuth = require('../extensions/middleware/orderAuth'); // ← AJOUTER
const ShopifyController = require('../controllers/shopify.controller');
const ShopifyConfig = require('../models/ShopifyConfig');
const ShopifyService = require('../services/ShopifyService');

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