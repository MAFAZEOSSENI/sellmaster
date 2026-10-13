const ShopifyConfig = require('../models/ShopifyConfig');
const User = require('../models/User');

module.exports.validateStoreOwnership = async (req, res, next) => {
  try {
    const storeId = req.params.storeId || req.body.storeId;
    
    if (!storeId) {
      return res.status(400).json({
        success: false,
        message: 'Store ID requis'
      });
    }

    const store = await ShopifyConfig.findById(storeId);
    
    if (!store) {
      return res.status(403).json({
        success: false,
        message: 'Store non trouvé ou accès non autorisé'
      });
    }

    const requesterId = Number(req.userId);
    const ownerUserId = Number(store.user_id);
    if (requesterId !== ownerUserId) {
      const fixedRole = await User.getFixedRole(requesterId);
      const canAccessOwnerStore = ['manager', 'closer'].includes(fixedRole)
        && await User.isActiveTeamMemberForOwner(requesterId, ownerUserId);
      if (!canAccessOwnerStore) {
        return res.status(403).json({
          success: false,
          message: 'Store non trouvé ou accès non autorisé'
        });
      }
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