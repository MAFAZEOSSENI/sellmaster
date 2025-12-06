const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const shopifyMiddleware = require('../middleware/shopify.middleware');
const orderAuth = require('../extensions/middleware/orderAuth'); // ← AJOUTER
const ShopifyController = require('../controllers/shopify.controller');

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
    // TODO: Ajouter la validation HMAC Shopify
    console.log('[Shopify Webhook] Received:', req.body);
    
    const shopDomain = req.headers['x-shopify-shop-domain'] || req.body.shop_domain;
    console.log(`Webhook from: ${shopDomain}`);
    
    // Traiter le webhook ici
    
    res.status(200).send('OK');
  } catch (error) {
    console.error('[Shopify Webhook] Error:', error);
    res.status(500).send('Error');
  }
});

module.exports = router;