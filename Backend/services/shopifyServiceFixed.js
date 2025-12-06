const axios = require('axios');

console.log('🔄 CHARGEMENT DE shopifyServiceFixed.js');

class ShopifyServiceFixed {
  // ✅ Version ultra-simple qui marche
  static async testConnection(shopName, accessToken) {
    try {
      console.log(`🔗 [FIXED] Test connexion: ${shopName}`);
      
      // Nettoyer le nom
      let cleanName = shopName;
      if (cleanName.includes('.myshopify.com')) {
        cleanName = cleanName.replace('.myshopify.com', '');
      }
      cleanName = cleanName.replace('https://', '').replace('http://', '').trim();
      
      const url = `https://${cleanName}.myshopify.com/admin/api/2024-01/products.json?limit=1`;
      
      console.log(`🔗 [FIXED] URL: ${url}`);
      
      const response = await axios.get(url, {
        headers: {
          'X-Shopify-Access-Token': accessToken,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      });
      
      console.log(`✅ [FIXED] Réussi! Status: ${response.status}`);
      return true;
      
    } catch (error) {
      console.error(`❌ [FIXED] Erreur:`, error.message);
      
      // Pour debug, loggez tout
      if (error.response) {
        console.error(`📡 [FIXED] Response status: ${error.response.status}`);
        console.error(`📡 [FIXED] Response data:`, error.response.data);
      }
      
      return false;
    }
  }
  
  static async getShopifyOrdersCount(shopName, accessToken) {
    try {
      let cleanName = shopName.replace('.myshopify.com', '').trim();
      cleanName = cleanName.replace('https://', '').replace('http://', '');
      
      const url = `https://${cleanName}.myshopify.com/admin/api/2024-01/orders/count.json`;
      
      const response = await axios.get(url, {
        headers: {
          'X-Shopify-Access-Token': accessToken,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      });
      
      return response.data.count || 0;
    } catch (error) {
      console.error('❌ [FIXED] Erreur count:', error.message);
      return 0;
    }
  }
}

module.exports = ShopifyServiceFixed;