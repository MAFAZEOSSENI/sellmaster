const ShopifyConfig = require('../models/ShopifyConfig');
const Order = require('../models/Order');
const axios = require('axios');

class ShopifyService {
  constructor(userId) {
    this.userId = userId;
  }

  // Test de connexion Shopify
  async testConnection(shopName, accessToken) {
    console.log(`🔗 [ShopifyService] Test connexion pour: ${shopName}`);
    
    try {
      // Nettoyer le nom de boutique
      let cleanShopName = shopName;
      if (cleanShopName.includes('.myshopify.com')) {
        cleanShopName = cleanShopName.replace('.myshopify.com', '');
      }
      cleanShopName = cleanShopName.replace('https://', '').replace('http://', '').trim();
      
      const url = `https://${cleanShopName}.myshopify.com/admin/api/2024-01/shop.json`;
      
      console.log(`🔗 URL: ${url}`);
      
      const response = await axios.get(url, {
        headers: {
          'X-Shopify-Access-Token': accessToken,
          'Content-Type': 'application/json'
        },
        timeout: 15000
      });
      
      console.log(`✅ Connexion réussie à: ${response.data.shop.name}`);
      return {
        success: true,
        shop: response.data.shop
      };
      
    } catch (error) {
      console.error(`❌ Erreur connexion Shopify:`, {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data
      });
      
      return {
        success: false,
        error: error.response?.data?.errors || error.message,
        statusCode: error.response?.status
      };
    }
  }

  // Récupérer les commandes Shopify
  async getOrders(storeId, limit = 50) {
    console.log(`📦 [ShopifyService] Récupération commandes pour store: ${storeId}`);
    
    try {
      // Récupérer les infos du store
      const config = await ShopifyConfig.findById(storeId, this.userId);
      if (!config) {
        throw new Error('Store non trouvé ou non autorisé');
      }
      
      // Nettoyer le nom de boutique
      let cleanShopName = config.shop_name;
      if (cleanShopName.includes('.myshopify.com')) {
        cleanShopName = cleanShopName.replace('.myshopify.com', '');
      }
      cleanShopName = cleanShopName.replace('https://', '').replace('http://', '').trim();
      
      const url = `https://${cleanShopName}.myshopify.com/admin/api/2024-01/orders.json?limit=${limit}&status=any`;
      
      const response = await axios.get(url, {
        headers: {
          'X-Shopify-Access-Token': config.access_token,
          'Content-Type': 'application/json'
        },
        timeout: 20000
      });
      
      const orders = response.data.orders || [];
      console.log(`✅ ${orders.length} commandes récupérées`);
      
      return {
        success: true,
        count: orders.length,
        orders: orders,
        store: config.shop_name,
        storeId: storeId
      };
      
    } catch (error) {
      console.error(`❌ Erreur récupération commandes:`, error.message);
      return {
        success: false,
        error: error.message,
        orders: []
      };
    }
  }

  // Synchroniser et sauvegarder les commandes
  async syncAndSaveOrders(storeId) {
    try {
      // Récupérer les commandes Shopify
      const result = await this.getOrders(storeId);
      
      if (!result.success) {
        return result;
      }
      
      let savedCount = 0;
      let updatedCount = 0;
      let errorCount = 0;
      
      // Sauvegarder chaque commande dans la base de données
      for (const shopifyOrder of result.orders) {
        try {
          const saveResult = await this.saveOrderToDatabase(shopifyOrder, storeId);
          
          if (saveResult === 'created') {
            savedCount++;
          } else if (saveResult === 'updated') {
            updatedCount++;
          }
        } catch (error) {
          console.error(`❌ Erreur sauvegarde commande ${shopifyOrder.id}:`, error.message);
          errorCount++;
        }
      }
      
      // Mettre à jour la dernière synchro
      if (result.orders.length > 0) {
        await ShopifyConfig.updateLastSync(storeId, this.userId);
      }
      
      return {
        success: true,
        message: `${result.count} commandes Shopify récupérées (${savedCount} nouvelles, ${updatedCount} mises à jour, ${errorCount} erreurs)`,
        count: result.count,
        savedCount,
        updatedCount,
        errorCount,
        store: result.store
      };
      
    } catch (error) {
      console.error(`❌ Erreur syncAndSaveOrders:`, error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Sauvegarder une commande Shopify dans la base de données
  async saveOrderToDatabase(shopifyOrder, storeId) {
    // Extraire les données client
    const customerName = this.extractCustomerName(shopifyOrder);
    const customerPhone = this.extractCustomerPhone(shopifyOrder);
    const customerAddress = this.extractCustomerAddress(shopifyOrder);
    const customerEmail = this.extractCustomerEmail(shopifyOrder);
    
    // Extraire les données produit
    const products = this.extractProducts(shopifyOrder);
    
    // Préparer les données de la commande
    const orderData = {
      order_number: shopifyOrder.order_number || parseInt(shopifyOrder.name.replace('#', '')) || 0,
      customer_name: customerName,
      customer_phone: customerPhone,
      customer_address: customerAddress,
      customer_email: customerEmail,
      total_amount: parseFloat(shopifyOrder.total_price) || 0,
      currency: shopifyOrder.currency || 'XOF',
      status: this.mapShopifyStatus(shopifyOrder.financial_status),
      payment_method: this.extractPaymentMethod(shopifyOrder),
      shipping_method: this.extractShippingMethod(shopifyOrder),
      notes: this.formatNotes(shopifyOrder),
      products: JSON.stringify(products),
      shopify_order_id: shopifyOrder.id.toString(),
      shopify_store_id: storeId,
      shopify_data: JSON.stringify(shopifyOrder), // Sauvegarde complète des données Shopify
      order_date: new Date(shopifyOrder.created_at || shopifyOrder.processed_at)
    };
    
    // Vérifier si la commande existe déjà
    const existingOrder = await Order.findByShopifyOrderId(shopifyOrder.id.toString());
    
    if (!existingOrder) {
      // Créer une nouvelle commande
      await Order.createFromShopify(orderData, this.userId);
      console.log(`✅ Commande #${orderData.order_number} créée (Shopify ID: ${shopifyOrder.id})`);
      return 'created';
    } else {
      // Mettre à jour la commande existante
      await Order.updateFromShopify(existingOrder.id, orderData, this.userId);
      console.log(`🔄 Commande #${orderData.order_number} mise à jour (Shopify ID: ${shopifyOrder.id})`);
      return 'updated';
    }
  }

  // Méthodes d'extraction des données
  extractCustomerName(shopifyOrder) {
    // Essayer d'abord les note_attributes
    if (shopifyOrder.note_attributes && Array.isArray(shopifyOrder.note_attributes)) {
      const nameAttr = shopifyOrder.note_attributes.find(attr => 
        attr.name && attr.name.toLowerCase().includes('name')
      );
      if (nameAttr && nameAttr.value) {
        return nameAttr.value;
      }
    }
    
    // Essayer le customer
    if (shopifyOrder.customer) {
      const firstName = shopifyOrder.customer.first_name || '';
      const lastName = shopifyOrder.customer.last_name || '';
      if (firstName || lastName) {
        return `${firstName} ${lastName}`.trim();
      }
    }
    
    // Fallback
    return 'Client Shopify';
  }

  extractCustomerPhone(shopifyOrder) {
    // Chercher dans note_attributes
    if (shopifyOrder.note_attributes && Array.isArray(shopifyOrder.note_attributes)) {
      const phoneAttr = shopifyOrder.note_attributes.find(attr => 
        attr.name && attr.name.toLowerCase().includes('phone')
      );
      if (phoneAttr && phoneAttr.value) {
        return phoneAttr.value;
      }
    }
    
    // Chercher dans billing_address
    if (shopifyOrder.billing_address && shopifyOrder.billing_address.phone) {
      return shopifyOrder.billing_address.phone;
    }
    
    return null;
  }

  extractCustomerAddress(shopifyOrder) {
    // Chercher dans note_attributes
    if (shopifyOrder.note_attributes && Array.isArray(shopifyOrder.note_attributes)) {
      const addressAttr = shopifyOrder.note_attributes.find(attr => 
        attr.name && attr.name.toLowerCase().includes('address')
      );
      if (addressAttr && addressAttr.value) {
        return addressAttr.value;
      }
    }
    
    // Construire depuis shipping_address
    if (shopifyOrder.shipping_address) {
      const addr = shopifyOrder.shipping_address;
      const parts = [];
      if (addr.address1) parts.push(addr.address1);
      if (addr.address2) parts.push(addr.address2);
      if (addr.city) parts.push(addr.city);
      if (addr.province) parts.push(addr.province);
      if (addr.country) parts.push(addr.country);
      if (addr.zip) parts.push(addr.zip);
      
      return parts.join(', ');
    }
    
    return null;
  }

  extractCustomerEmail(shopifyOrder) {
    if (shopifyOrder.customer && shopifyOrder.customer.email) {
      return shopifyOrder.customer.email;
    }
    
    if (shopifyOrder.email) {
      return shopifyOrder.email;
    }
    
    return null;
  }

  extractProducts(shopifyOrder) {
    if (!shopifyOrder.line_items || !Array.isArray(shopifyOrder.line_items)) {
      return [];
    }
    
    return shopifyOrder.line_items.map(item => ({
      name: item.title || item.name || 'Produit',
      quantity: item.quantity || 1,
      price: parseFloat(item.price) || 0,
      total: parseFloat(item.price) * (item.quantity || 1),
      variant_id: item.variant_id,
      product_id: item.product_id,
      sku: item.sku
    }));
  }

  mapShopifyStatus(shopifyStatus) {
    const statusMap = {
      'pending': 'en_attente',
      'authorized': 'autorisé',
      'partially_paid': 'partiellement_payé',
      'paid': 'payé',
      'partially_refunded': 'partiellement_remboursé',
      'refunded': 'remboursé',
      'voided': 'annulé'
    };
    
    return statusMap[shopifyStatus] || 'en_attente';
  }

  extractPaymentMethod(shopifyOrder) {
    if (shopifyOrder.payment_gateway_names && shopifyOrder.payment_gateway_names.length > 0) {
      return shopifyOrder.payment_gateway_names[0];
    }
    
    if (shopifyOrder.gateway) {
      return shopifyOrder.gateway;
    }
    
    return 'Non spécifié';
  }

  extractShippingMethod(shopifyOrder) {
    if (shopifyOrder.shipping_lines && shopifyOrder.shipping_lines.length > 0) {
      return shopifyOrder.shipping_lines[0].title || 'Livraison';
    }
    
    return 'Standard';
  }

  formatNotes(shopifyOrder) {
    const notes = [];
    
    // Ajouter les note_attributes
    if (shopifyOrder.note_attributes && Array.isArray(shopifyOrder.note_attributes)) {
      shopifyOrder.note_attributes.forEach(attr => {
        if (attr.name && attr.value) {
          notes.push(`${attr.name}: ${attr.value}`);
        }
      });
    }
    
    // Ajouter la note principale
    if (shopifyOrder.note) {
      notes.push(`Note: ${shopifyOrder.note}`);
    }
    
    // Ajouter les tags
    if (shopifyOrder.tags) {
      notes.push(`Tags: ${shopifyOrder.tags}`);
    }
    
    return notes.join(' | ');
  }

  // Obtenir les statistiques de synchronisation
  async getSyncStats(storeId) {
    try {
      const config = await ShopifyConfig.findById(storeId, this.userId);
      if (!config) {
        throw new Error('Store non trouvé');
      }
      
      // Compter les commandes dans la base de données pour ce store
      const dbOrders = await Order.findByShopifyStoreId(storeId, this.userId);
      
      return {
        success: true,
        store: config.shop_name,
        last_sync: config.last_sync,
        total_in_shopify: await this.getShopifyOrdersCount(storeId),
        total_in_database: dbOrders.length,
        sync_status: 'active'
      };
      
    } catch (error) {
      console.error(`❌ Erreur getSyncStats:`, error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Compter les commandes Shopify
  async getShopifyOrdersCount(storeId) {
    try {
      const config = await ShopifyConfig.findById(storeId, this.userId);
      if (!config) {
        return 0;
      }
      
      let cleanShopName = config.shop_name;
      if (cleanShopName.includes('.myshopify.com')) {
        cleanShopName = cleanShopName.replace('.myshopify.com', '');
      }
      cleanShopName = cleanShopName.replace('https://', '').replace('http://', '').trim();
      
      const url = `https://${cleanShopName}.myshopify.com/admin/api/2024-01/orders/count.json`;
      
      const response = await axios.get(url, {
        headers: {
          'X-Shopify-Access-Token': config.access_token,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      });
      
      return response.data.count || 0;
      
    } catch (error) {
      console.error(`❌ Erreur comptage commandes:`, error.message);
      return 0;
    }
  }
}

module.exports = ShopifyService;