const ShopifyConfig = require('../models/ShopifyConfig');
const Order = require('../models/Order');
const axios = require('axios');
const {
  extractCustomerPhone,
  extractCustomerAddress,
  extractShippingMethod,
  formatNotes,
} = require('../utils/shopifyOrderNormalizer');

const SHOPIFY_API_VERSION = '2026-07';

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
      
      const url = `https://${cleanShopName}.myshopify.com/admin/api/${SHOPIFY_API_VERSION}/shop.json`;
      
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

  async createOrderFromForm(config, formData) {
    const shopDomain = String(config?.shop_name || '')
      .trim()
      .toLowerCase()
      .replace(/^https?:\/\//, '')
      .replace(/\/$/, '');
    if (!/^[a-z0-9][a-z0-9-]*\.myshopify\.com$/.test(shopDomain) || !config?.access_token) {
      throw new Error('Configuration Shopify invalide');
    }

    const items = Array.isArray(formData.items) ? formData.items : [];
    if (!items.length || items.some(item => !/^\d+$/.test(String(item.variantId)) || !Number.isInteger(Number(item.quantity)) || Number(item.quantity) < 1)) {
      throw new Error('Produits ou quantités invalides');
    }

    const gatewayName = String(config.cod_gateway_name || '').trim();
    if (!gatewayName || gatewayName.length > 255) {
      throw new Error('Nom du moyen de paiement COD invalide');
    }
    const totalCents = items.reduce((total, item) => {
      const unitPrice = Number(item.unitPrice);
      if (!Number.isFinite(unitPrice) || unitPrice < 0) throw new Error('Prix produit invalide');
      return total + Math.round(unitPrice * 100) * Number(item.quantity);
    }, Math.round(Math.max(0, Number(formData.shipping_option?.price) || 0) * 100));
    const totalAmount = (totalCents / 100).toFixed(2);
    const shippingOption = formData.shipping_option;

    const fullName = String(formData.customer_name || '').trim();
    const nameParts = fullName.split(/\s+/);
    const firstName = nameParts[0] || 'Client';
    const lastName = nameParts.slice(1).join(' ') || firstName;
    const order = {
      financial_status: 'pending',
      gateway: gatewayName,
      processing_method: 'manual',
      payment_gateway_names: [gatewayName],
      transactions: [{ kind: 'sale', status: 'pending', amount: totalAmount, gateway: gatewayName }],
      tags: 'COD, SELLMASTER_FORM',
      line_items: items.map(item => ({ variant_id: Number(item.variantId), quantity: Number(item.quantity) })),
      shipping_lines: shippingOption ? [{ title: String(shippingOption.label), price: (Math.round(Number(shippingOption.price) * 100) / 100).toFixed(2) }] : [],
      note: 'Commande créée via le formulaire public Sellmaster',
      note_attributes: [
        formData.city ? { name: 'Ville', value: String(formData.city).trim() } : null,
        formData.address ? { name: 'Adresse de livraison', value: String(formData.address).trim() } : null,
        formData.delivery_note ? { name: 'Heure de livraison souhaitée', value: String(formData.delivery_note).trim() } : null,
        formData.country ? { name: 'Pays', value: String(formData.country.label || formData.country.value) } : null,
      ].filter(Boolean),
      customer: {
        first_name: firstName,
        last_name: lastName,
        email: formData.email || undefined,
        phone: formData.phone || undefined,
      },
    };
    if (formData.email) order.email = String(formData.email).trim();
    if (formData.phone) order.phone = String(formData.phone).trim();
    if (formData.ip) order.browser_ip = String(formData.ip).trim();
    if (formData.address || formData.city || formData.phone || formData.country) {
      order.shipping_address = {
        first_name: firstName,
        last_name: lastName,
        address1: formData.address ? String(formData.address).trim() : undefined,
        city: formData.city ? String(formData.city).trim() : undefined,
        phone: formData.phone ? String(formData.phone).trim() : undefined,
        country_code: /^[A-Za-z]{2}$/.test(String(formData.country?.value || '')) ? String(formData.country.value).toUpperCase() : undefined,
      };
    }

    const response = await axios.post(
      `https://${shopDomain}/admin/api/${SHOPIFY_API_VERSION}/orders.json`,
      { order },
      {
        headers: {
          'X-Shopify-Access-Token': config.access_token,
          'Content-Type': 'application/json',
        },
        timeout: 20000,
      }
    );
    const createdOrder = response.data?.order;
    if (!createdOrder?.id) throw new Error('Shopify n’a pas retourné la commande créée');
    return {
      id: createdOrder.id,
      name: createdOrder.name,
      financial_status: createdOrder.financial_status,
      status_url: createdOrder.order_status_url || null,
    };
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
      
      const url = `https://${cleanShopName}.myshopify.com/admin/api/${SHOPIFY_API_VERSION}/orders.json?limit=${limit}&status=any`;
      
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

  async syncProducts(storeId) {
    const config = await ShopifyConfig.findById(storeId, this.userId);
    if (!config) throw new Error('Store non trouvé ou non autorisé');

    const shopDomain = config.shop_name.replace(/^https?:\/\//, '').replace(/\/$/, '');
    const response = await axios.get(
      `https://${shopDomain}/admin/api/${SHOPIFY_API_VERSION}/products.json?limit=250&status=active`,
      { headers: { 'X-Shopify-Access-Token': config.access_token, 'Content-Type': 'application/json' }, timeout: 20000 }
    );
    const shopifyProducts = response.data.products || [];
    const variants = shopifyProducts.flatMap(product => (product.variants || []).map(variant => ({
      name: (product.title || 'Produit Shopify') + (variant.title && variant.title !== 'Default Title' ? ` - ${variant.title}` : ''),
      price: Number(variant.price || 0),
      productId: product.id,
      variantId: variant.id,
      sku: variant.sku || null,
    })));
    const costs = variants.length ? await this.getVariantCosts(config, variants.map(item => `gid://shopify/ProductVariant/${item.variantId}`)) : [];
    const costByVariant = new Map(costs.map(item => [String(item.id).split('/').pop(), item.inventoryItem?.unitCost?.amount == null ? null : Number(item.inventoryItem.unitCost.amount)]));
    const conn = await require('../config/database').getConnection();
    let created = 0;
    let updated = 0;
    try {
      for (const item of variants) {
        const cost = costByVariant.get(String(item.variantId));
        const [existing] = await conn.query(
          'SELECT id FROM products WHERE user_id = ? AND shopify_store_id = ? AND shopify_variant_id = ? LIMIT 1',
          [this.userId, storeId, String(item.variantId)]
        );
        if (existing.length) {
          await conn.query(
            `UPDATE products
             SET name = ?, description = ?, price = ?,
                 cost_price = COALESCE(?, cost_price), shopify_product_id = ?, shopify_sku = ?
             WHERE id = ?`,
            [item.name, `Shopify SKU: ${item.sku || 'N/A'}`, item.price, cost, String(item.productId), item.sku, existing[0].id]
          );
          updated++;
        } else {
          await conn.query(
            `INSERT INTO products
             (user_id, name, description, price, cost_price, shopify_store_id, shopify_product_id, shopify_variant_id, shopify_sku, stock, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, NOW())`,
            [this.userId, item.name, `Shopify SKU: ${item.sku || 'N/A'}`, item.price, cost, storeId, String(item.productId), String(item.variantId), item.sku]
          );
          created++;
        }
      }
    } finally {
      conn.release();
    }
    return { success: true, count: variants.length, created, updated, message: `${variants.length} variantes Shopify synchronisées` };
  }

  // Sauvegarder une commande Shopify dans la base de données
  async saveOrderToDatabase(shopifyOrder, storeId) {
    // Extraire les données client
    const customerName = this.extractCustomerName(shopifyOrder);
    const customerPhone = extractCustomerPhone(shopifyOrder);
    const customerAddress = extractCustomerAddress(shopifyOrder);
    const customerEmail = this.extractCustomerEmail(shopifyOrder);
    
    // Extraire les données produit
    const products = await this.extractProducts(shopifyOrder, storeId);
    
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
      shipping_method: extractShippingMethod(shopifyOrder),
      notes: formatNotes(shopifyOrder),
      products: JSON.stringify(products),
      shopify_order_id: shopifyOrder.id.toString(),
      shopify_store_id: storeId,
      shopify_data: JSON.stringify(shopifyOrder), // Sauvegarde complète des données Shopify
      order_date: new Date(shopifyOrder.created_at || shopifyOrder.processed_at)
    };
    
    // Vérifier si la commande existe déjà pour ce store / cette boutique
    const existingOrder = await Order.findByShopifyOrderId(
      shopifyOrder.id.toString(),
      this.userId,
      storeId
    );
    
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
    return extractCustomerPhone(shopifyOrder);
  }

  extractCustomerAddress(shopifyOrder) {
    return extractCustomerAddress(shopifyOrder);
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

  async extractProducts(shopifyOrder, storeId) {
    if (!shopifyOrder.line_items || !Array.isArray(shopifyOrder.line_items)) {
      return [];
    }

    const config = await ShopifyConfig.findById(storeId, this.userId);
    const variantIds = shopifyOrder.line_items
      .map(item => item.variant_id)
      .filter(Boolean)
      .map(id => `gid://shopify/ProductVariant/${id}`);
    const costsByVariantId = new Map();

    if (config && variantIds.length > 0) {
      try {
        const data = await this.getVariantCosts(config, variantIds);
        for (const node of data) {
          const numericId = String(node.id || '').split('/').pop();
          const cost = node.inventoryItem?.unitCost?.amount;
          if (numericId && cost !== null && cost !== undefined) {
            costsByVariantId.set(numericId, Number(cost));
          }
        }
      } catch (error) {
        console.warn('[Shopify] Coûts d’achat indisponibles, import poursuivi:', error.message);
      }
    }

    return shopifyOrder.line_items.map(item => ({
      name: item.title || item.name || 'Produit',
      quantity: item.quantity || 1,
      price: parseFloat(item.price) || 0,
      total: parseFloat(item.price) * (item.quantity || 1),
      cost_price: costsByVariantId.get(String(item.variant_id)) ?? null,
      variant_id: item.variant_id,
      product_id: item.product_id,
      sku: item.sku
    }));
  }

  async getVariantCosts(config, variantIds) {
    const data = await axios.post(
      `https://${config.shop_name}/admin/api/${SHOPIFY_API_VERSION}/graphql.json`,
      {
        query: `query VariantCosts($ids: [ID!]!) {
          nodes(ids: $ids) {
            ... on ProductVariant {
              id
              inventoryItem { unitCost { amount currencyCode } }
            }
          }
        }`,
        variables: { ids: variantIds }
      },
      {
        headers: {
          'X-Shopify-Access-Token': config.access_token,
          'Content-Type': 'application/json'
        },
        timeout: 20000
      }
    );
    if (data.data.errors?.length) {
      throw new Error(data.data.errors.map(error => error.message).join('; '));
    }
    return (data.data.data?.nodes || []).filter(Boolean);
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
    return extractShippingMethod(shopifyOrder);
  }

  formatNotes(shopifyOrder) {
    return formatNotes(shopifyOrder);
  }

  // Obtenir les statistiques de synchronisation
  async getSyncStats(storeId) {
    try {
      const config = await ShopifyConfig.findById(storeId, this.userId);
      if (!config) {
        throw new Error('Store non trouvé');
      }

      const cleanShopName = String(config.shop_name || '')
        .replace(/^https?:\/\//, '')
        .replace(/\.myshopify\.com$/, '')
        .trim();
      const url = `https://${cleanShopName}.myshopify.com/admin/api/${SHOPIFY_API_VERSION}/orders/count.json`;
      const response = await axios.get(url, {
        headers: {
          'X-Shopify-Access-Token': config.access_token,
          'Content-Type': 'application/json',
        },
        timeout: 10000,
      });

      return response.data.count || 0;
    } catch (error) {
      console.error('❌ Erreur comptage commandes:', error.message);
      return 0;
    }
  }
}

module.exports = ShopifyService;