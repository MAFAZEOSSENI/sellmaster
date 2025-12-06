const ShopifyService = require('../services/ShopifyService');
const ShopifyConfig = require('../models/ShopifyConfig');

class ShopifyController {
  // Test de connexion Shopify
  static async testConnection(req, res) {
    try {
      const { shopName, accessToken } = req.body;
      
      if (!shopName || !accessToken) {
        return res.status(400).json({
          success: false,
          message: 'Nom de boutique et access token requis'
        });
      }

      const service = new ShopifyService(req.userId);
      const result = await service.testConnection(shopName, accessToken);
      
      res.json(result);
      
    } catch (error) {
      console.error('[ShopifyController] testConnection error:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors du test de connexion'
      });
    }
  }

  // Configurer un nouveau store Shopify
  static async configureStore(req, res) {
    try {
      const { shopName, apiKey, accessToken } = req.body;
      
      if (!shopName || !apiKey || !accessToken) {
        return res.status(400).json({
          success: false,
          message: 'Tous les champs sont requis'
        });
      }

      // Tester d'abord la connexion
      const service = new ShopifyService(req.userId);
      const testResult = await service.testConnection(shopName, accessToken);
      
      if (!testResult.success) {
        return res.status(400).json({
          success: false,
          message: `Connexion Shopify échouée: ${testResult.error || 'Identifiants invalides'}`
        });
      }

      // Vérifier si le store existe déjà pour cet utilisateur
      const existingConfigs = await ShopifyConfig.findByUserId(req.userId);
      const alreadyExists = existingConfigs.some(config => 
        config.shop_name.toLowerCase() === shopName.toLowerCase()
      );
      
      if (alreadyExists) {
        return res.status(400).json({
          success: false,
          message: 'Ce store Shopify est déjà configuré'
        });
      }

      // Créer la configuration
      const config = await ShopifyConfig.create({
        shopName,
        apiKey,
        accessToken
      }, req.userId);

      res.status(201).json({
        success: true,
        message: 'Store Shopify configuré avec succès',
        store: {
          id: config.id,
          shopName: config.shop_name,
          connectedAt: config.connected_at
        },
        shopInfo: testResult.shop
      });
      
    } catch (error) {
      console.error('[ShopifyController] configureStore error:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la configuration du store'
      });
    }
  }

  // Récupérer tous les stores de l'utilisateur
  static async getStores(req, res) {
    try {
      const stores = await ShopifyConfig.findByUserId(req.userId);
      
      res.json({
        success: true,
        count: stores.length,
        stores: stores
      });
      
    } catch (error) {
      console.error('[ShopifyController] getStores error:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la récupération des stores'
      });
    }
  }

  // Synchroniser les commandes d'un store
  static async syncOrders(req, res) {
  console.log('\n' + '='.repeat(60));
  console.log('🎯 [ShopifyController] syncOrders DÉBUT');
  console.log(`   User ID: ${req.userId}`);
  console.log(`   Store ID: ${req.params.storeId}`);
  console.log(`   Headers Auth: ${req.headers.authorization ? 'PRÉSENT' : 'ABSENT'}`);
  
  try {
    const { storeId } = req.params;
    
    if (!storeId) {
      console.log('❌ Store ID manquant');
      return res.status(400).json({
        success: false,
        message: 'Store ID requis'
      });
    }

    console.log(`🔧 Création ShopifyService pour user ${req.userId}...`);
    const service = new ShopifyService(req.userId);
    
    console.log(`🔄 Appel à syncAndSaveOrders(${storeId})...`);
    const result = await service.syncAndSaveOrders(storeId);
    
    console.log(`📊 Résultat: ${JSON.stringify(result, null, 2)}`);
    
    if (result.success) {
      console.log('✅ Synchronisation réussie');
      res.json(result);
    } else {
      console.log(`❌ Échec synchronisation: ${result.error}`);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la synchronisation des commandes',
        details: result.error
      });
    }
    
  } catch (error) {
    console.error('🔥 ERREUR NON GÉRÉE dans syncOrders:');
    console.error('   Message:', error.message);
    console.error('   Stack:', error.stack);
    
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la synchronisation des commandes',
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
  
  console.log('🎯 [ShopifyController] syncOrders FIN');
  console.log('='.repeat(60) + '\n');
}
  // Obtenir les statistiques de synchronisation
static async getSyncStats(req, res) {
  try {
    const { storeId } = req.params;
    
    if (!storeId) {
      return res.status(400).json({
        success: false,
        message: 'Store ID requis'
      });
    }

    const service = new ShopifyService(req.userId);
    const result = await service.getSyncStats(storeId);
    
    res.json(result);
    
  } catch (error) {
    console.error('[ShopifyController] getSyncStats error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des statistiques'
    });
  }
}

  // Supprimer un store
  static async deleteStore(req, res) {
    try {
      const { storeId } = req.params;
      
      if (!storeId) {
        return res.status(400).json({
          success: false,
          message: 'Store ID requis'
        });
      }

      const deleted = await ShopifyConfig.delete(storeId, req.userId);
      
      if (!deleted) {
        return res.status(404).json({
          success: false,
          message: 'Store non trouvé ou non autorisé'
        });
      }

      res.json({
        success: true,
        message: 'Store Shopify supprimé avec succès'
      });
      
    } catch (error) {
      console.error('[ShopifyController] deleteStore error:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la suppression du store'
      });
    }
  }
}

module.exports = ShopifyController;