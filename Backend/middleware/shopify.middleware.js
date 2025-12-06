const ShopifyConfig = require('../models/ShopifyConfig');

module.exports.validateStoreOwnership = async (req, res, next) => {
  try {
    const storeId = req.params.storeId || req.body.storeId;
    
    if (!storeId) {
      return res.status(400).json({
        success: false,
        message: 'Store ID requis'
      });
    }

    const store = await ShopifyConfig.findById(storeId, req.userId);
    
    if (!store) {
      return res.status(403).json({
        success: false,
        message: 'Store non trouvé ou accès non autorisé'
      });
    }

    req.shopifyStore = store;
    next();
  } catch (error) {
    console.error('[ShopifyMiddleware] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur de validation du store'
    });
  }
};