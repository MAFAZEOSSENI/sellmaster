const { pool } = require('../config/database');

const Order = {
  async ensureAssignmentColumns() {
    let conn;
    try {
      conn = await pool.getConnection();
      const [columns] = await conn.query('SHOW COLUMNS FROM orders');
      const availableColumns = new Set(columns.map((column) => column.Field));
      const migrations = [
        { name: 'user_id', sql: 'ALTER TABLE orders ADD COLUMN user_id INT NULL AFTER notes' },
        { name: 'assigned_to', sql: 'ALTER TABLE orders ADD COLUMN assigned_to INT NULL AFTER user_id' },
        { name: 'assigned_by', sql: 'ALTER TABLE orders ADD COLUMN assigned_by INT NULL AFTER assigned_to' },
        { name: 'assigned_at', sql: 'ALTER TABLE orders ADD COLUMN assigned_at TIMESTAMP NULL AFTER assigned_by' },
        { name: 'assignment_note', sql: 'ALTER TABLE orders ADD COLUMN assignment_note TEXT AFTER assigned_at' },
      ];

      for (const migration of migrations) {
        if (!availableColumns.has(migration.name)) {
          await conn.query(migration.sql);
        }
      }
    } catch (error) {
      console.warn('⚠️ Migration des colonnes d’assignation non appliquée:', error.message);
      throw error;
    } finally {
      if (conn) conn.release();
    }
  },

  async getOrderColumnSet() {
    let conn;
    try {
      conn = await pool.getConnection();
      const [columns] = await conn.query('SHOW COLUMNS FROM orders');
      return new Set(columns.map((column) => column.Field));
    } finally {
      if (conn) conn.release();
    }
  },

  async getVisibleOwnerIds(userId) {
    if (!userId) {
      return [];
    }

    let conn;
    try {
      conn = await pool.getConnection();
      const [rows] = await conn.query(
        `SELECT owner_user_id
         FROM team_memberships
         WHERE member_user_id = ? AND status = 'active'
         UNION
         SELECT ? AS owner_user_id`,
        [userId, userId]
      );

      return [...new Set(rows.map((row) => Number(row.owner_user_id)).filter((id) => Number.isInteger(id) && id > 0))];
    } finally {
      if (conn) conn.release();
    }
  },

  // 🆕 MÉTHODE : Générer le numéro de commande personnalisé
  async generateCustomOrderNumber(userId) {
    let conn;
    try {
      conn = await pool.getConnection();
      
      // Compter les commandes de cet utilisateur
      const [rows] = await conn.query(
        'SELECT COUNT(*) as order_count FROM orders WHERE user_id = ?',
        [userId]
      );
      
      const orderCount = Number(rows[0].order_count) + 1;
      
      // Format: USR{user_id}-CMD{numero}
      const customNumber = `USR${userId}-CMD${orderCount}`;
      
      console.log(`🔢 Génération numéro commande: ${customNumber} pour user ${userId}`);
      return customNumber;
      
    } finally {
      if (conn) conn.release();
    }
  },

  // 🆕 MÉTHODE : Créer une commande avec numéro personnalisé
  async createWithCustomNumber(orderData, userId) {
    let conn;
    try {
      conn = await pool.getConnection();
      await conn.beginTransaction();

      console.log('📦 Création commande avec numéro personnalisé pour user:', userId);

      // Générer le numéro personnalisé
      const customOrderNumber = await this.generateCustomOrderNumber(userId);
      
      // Gestion sécurisée du shopify_order_id
      const shopifyOrderId = orderData.shopify_order_id;
      const safeShopifyOrderId = shopifyOrderId ? shopifyOrderId.toString() : null;

      // 🆕 CRÉER LA COMMANDE AVEC LE NUMÉRO PERSONNALISÉ
      const [orderResult] = await conn.query(`
        INSERT INTO orders 
        (client_name, client_phone, client_address, status, total_amount, notes, source, shopify_order_id, shopify_data, user_id, custom_order_number)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        orderData.clientName || orderData.client_name,
        orderData.clientPhone || orderData.client_phone,
        orderData.clientAddress || orderData.client_address,
        orderData.status || 'dashboard',
        orderData.totalAmount || orderData.total_amount,
        orderData.notes || '',
        orderData.source || 'manual',
        safeShopifyOrderId,
        orderData.shopify_data ? JSON.stringify(orderData.shopify_data) : null,
        userId,
        customOrderNumber
      ]);

      const orderId = orderResult.insertId;
      // Après avoir créé la commande
await conn.query(
  'UPDATE app_users SET order_count = order_count + 1 WHERE id = ?',
  [userId]
);
      console.log(`✅ Commande créée: ${customOrderNumber} (ID: ${orderId}) pour user: ${userId}`);

      // Ajouter les items si fournis
      if (orderData.items && Array.isArray(orderData.items) && orderData.items.length > 0) {
        console.log('📋 Ajout des items:', orderData.items.length);
        
        for (const item of orderData.items) {
          await conn.query(`
            INSERT INTO order_items (order_id, product_id, product_name, unit_price, quantity)
            VALUES (?, ?, ?, ?, ?)
          `, [orderId, item.productId, item.productName, item.unitPrice, item.quantity]);

          // Mettre à jour le stock
          if (item.productId) {
            await conn.query(`
              UPDATE products SET stock = stock - ? WHERE id = ?
            `, [item.quantity, item.productId]);
          }
        }
      }

      await conn.commit();
      
      // Retourner la commande complète
      const completeOrder = await this.findById(orderId);
      return completeOrder;
      
    } catch (error) {
      if (conn) await conn.rollback();
      console.error('❌ Erreur création commande personnalisée:', error);
      throw error;
    } finally {
      if (conn) conn.release();
    }
  },

  // 🆕 MÉTHODE : Récupérer les statistiques de numérotation
  async getOrderNumberStats(userId) {
    let conn;
    try {
      conn = await pool.getConnection();
      const visibleOwnerIds = await this.getVisibleOwnerIds(userId);

      if (!visibleOwnerIds.length) {
        return { total_orders: 0, last_order_number: null, first_order_date: null };
      }

      const placeholders = visibleOwnerIds.map(() => '?').join(',');
      const [stats] = await conn.query(`
        SELECT 
          COUNT(*) as total_orders,
          MAX(custom_order_number) as last_order_number,
          MIN(created_at) as first_order_date
        FROM orders 
        WHERE user_id IN (${placeholders})
      `, visibleOwnerIds);
      
      return stats[0];
    } finally {
      if (conn) conn.release();
    }
  },

  // 🆕 MÉTHODE : Trouver une commande par son numéro personnalisé
  async findByCustomNumber(customOrderNumber, userId = null) {
    let conn;
    try {
      conn = await pool.getConnection();
      
      let query = `SELECT * FROM orders WHERE custom_order_number = ?`;
      let params = [customOrderNumber];
      
      if (userId) {
        const visibleOwnerIds = await this.getVisibleOwnerIds(userId);
        if (!visibleOwnerIds.length) {
          return null;
        }
        const placeholders = visibleOwnerIds.map(() => '?').join(',');
        query += ` AND user_id IN (${placeholders})`;
        params.push(...visibleOwnerIds);
      }
      
      const [orders] = await conn.query(query, params);
      return orders.length > 0 ? orders[0] : null;
    } finally {
      if (conn) conn.release();
    }
  },

  // MÉTHODES EXISTANTES AVEC custom_order_number AJOUTÉ
  async findAll(userId = null) {
    let conn;
    try {
      conn = await pool.getConnection();
      const availableColumns = await this.getOrderColumnSet();
      
      let query = `
        SELECT 
          id,
          client_name,
          client_phone, 
          client_address,
          status,
          total_amount,
          notes,
          created_at,
          updated_at,
          source,
          shopify_order_id,
          user_id,
          ${availableColumns.has('assigned_to') ? 'assigned_to,' : ''}
          ${availableColumns.has('assigned_by') ? 'assigned_by,' : ''}
          ${availableColumns.has('assigned_at') ? 'assigned_at,' : ''}
          ${availableColumns.has('assignment_note') ? 'assignment_note,' : ''}
          custom_order_number,
          CASE 
            WHEN shopify_order_id IS NOT NULL THEN CAST(shopify_order_id AS CHAR)
            ELSE NULL 
          END as shopify_order_id_str,
          shopify_data
        FROM orders 
      `;

      query = query.replace(/\n\s*\+\s*/g, '').replace(/\s{2,}/g, ' ').trim();
      query = query.replace(/,\s*custom_order_number/, ', custom_order_number');
      query = query.replace(/,\s*CASE/, ', CASE');
      
      let params = [];
      
      if (userId && userId !== 'null' && userId !== 'undefined' && userId !== '[object Object]') {
        const numericUserId = Number(userId);
        const visibleOwnerIds = await this.getVisibleOwnerIds(numericUserId);
        if (visibleOwnerIds.length === 0) {
          return [];
        }
        const placeholders = visibleOwnerIds.map(() => '?').join(',');
        query += ` WHERE user_id IN (${placeholders}) `;
        params.push(...visibleOwnerIds);
      }
      
      query += ` ORDER BY created_at DESC `;
      
      const [orders] = await conn.query(query, params);
      
      if (userId && userId !== '[object Object]') {
        console.log(`📦 ${orders.length} commandes trouvées pour user ${userId}`);
      } else {
        console.log(`📦 ${orders.length} commandes trouvées (sans filtre user)`);
      }
      
      const safeOrders = orders.map(order => ({
        ...order,
        shopify_order_id: order.shopify_order_id_str
      }));
      
      return safeOrders;
    } finally {
      if (conn) conn.release();
    }
  },

  async findById(id, userId = null) {
    let conn;
    try {
      conn = await pool.getConnection();
      const availableColumns = await this.getOrderColumnSet();
      
      let query = `
        SELECT 
          id,
          client_name,
          client_phone,
          client_address, 
          status,
          total_amount,
          notes,
          created_at,
          updated_at,
          source,
          user_id,
          ${availableColumns.has('assigned_to') ? 'assigned_to,' : ''}
          ${availableColumns.has('assigned_by') ? 'assigned_by,' : ''}
          ${availableColumns.has('assigned_at') ? 'assigned_at,' : ''}
          ${availableColumns.has('assignment_note') ? 'assignment_note,' : ''}
          custom_order_number,
          CASE 
            WHEN shopify_order_id IS NOT NULL THEN CAST(shopify_order_id AS CHAR)
            ELSE NULL 
          END as shopify_order_id,
          shopify_data
        FROM orders WHERE id = ?
      `;

      query = query.replace(/\n\s*\+\s*/g, '').replace(/\s{2,}/g, ' ').trim();
      query = query.replace(/,\s*custom_order_number/, ', custom_order_number');
      query = query.replace(/,\s*CASE/, ', CASE');
      
      let params = [id];
      
      if (userId) {
        const visibleOwnerIds = await this.getVisibleOwnerIds(Number(userId));
        if (!visibleOwnerIds.length) {
          return null;
        }
        const placeholders = visibleOwnerIds.map(() => '?').join(',');
        query += ` AND user_id IN (${placeholders})`;
        params.push(...visibleOwnerIds);
      }
      
      const [orders] = await conn.query(query, params);
      
      if (orders.length === 0) return null;
      
      const order = orders[0];
      
      const [items] = await conn.query(`
        SELECT 
          oi.id,
          oi.order_id,
          oi.product_id,
          oi.product_name,
          oi.unit_price,
          oi.quantity,
          oi.created_at,
          p.image_url
        FROM order_items oi
        LEFT JOIN products p ON oi.product_id = p.id
        WHERE oi.order_id = ?
      `, [id]);
      order.items = items;
      
      return order;
    } finally {
      if (conn) conn.release();
    }
  },

  async create(orderData) {
    let conn;
    try {
      conn = await pool.getConnection();
      await conn.beginTransaction();

      console.log('Données reçues:', orderData);

      const shopifyOrderId = orderData.shopify_order_id;
      const safeShopifyOrderId = shopifyOrderId ? shopifyOrderId.toString() : null;

      // Générer un numéro personnalisé même pour l'ancienne méthode
      const customOrderNumber = orderData.user_id ? 
        await this.generateCustomOrderNumber(orderData.user_id) : 
        `CMD-${Date.now()}`;

      const orderResult = await conn.query(`
        INSERT INTO orders (client_name, client_phone, client_address, status, total_amount, notes, source, shopify_order_id, shopify_data, user_id, custom_order_number)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        orderData.clientName,
        orderData.clientPhone,
        orderData.clientAddress,
        orderData.status || 'dashboard',
        orderData.totalAmount,
        orderData.notes || '',
        orderData.source || 'manual',
        safeShopifyOrderId,
        orderData.shopify_data ? JSON.stringify(orderData.shopify_data) : null,
        orderData.user_id || null,
        customOrderNumber
      ]);

      const orderId = orderResult.insertId;
      console.log('Commande créée, ID:', orderId);

      if (!orderData.items || !Array.isArray(orderData.items)) {
        throw new Error('Items manquants ou invalides');
      }

      for (const item of orderData.items) {
        console.log('Ajout item:', item);
        
        await conn.query(`
          INSERT INTO order_items (order_id, product_id, product_name, unit_price, quantity)
          VALUES (?, ?, ?, ?, ?)
        `, [
          orderId,
          item.productId,
          item.productName,
          item.unitPrice,
          item.quantity
        ]);

        if (item.productId) {
          await conn.query(`
            UPDATE products 
            SET stock = stock - ? 
            WHERE id = ?
          `, [item.quantity, item.productId]);
        }
      }

      await conn.commit();
      
      const completeOrder = await this.findById(orderId);
      console.log('Commande finale:', completeOrder);
      return completeOrder;
      
    } catch (error) {
      if (conn) await conn.rollback();
      console.error('Erreur création commande:', error);
      throw error;
    } finally {
      if (conn) conn.release();
    }
  },

  async createWithUser(orderData, userId) {
    return await this.createWithCustomNumber(orderData, userId);
  },

  async updateStatus(id, status) {
    let conn;
    try {
      conn = await pool.getConnection();
      
      const [existingOrders] = await conn.query('SELECT * FROM orders WHERE id = ?', [id]);
      if (existingOrders.length === 0) {
        throw new Error('Commande non trouvée');
      }
      
      const [result] = await conn.query(`
        UPDATE orders 
        SET status = ?
        WHERE id = ?
      `, [status, id]);
      
      console.log('Résultat mise à jour:', result);
      
      return await this.findById(id);
    } finally {
      if (conn) conn.release();
    }
  },

  async assignToOrder(id, assigneeUserId, assignedByUserId = null, assignmentNote = null) {
    let conn;
    try {
      conn = await pool.getConnection();
      const availableColumns = await this.getOrderColumnSet();

      const [existingOrders] = await conn.query('SELECT * FROM orders WHERE id = ?', [id]);
      if (existingOrders.length === 0) {
        throw new Error('Commande non trouvée');
      }

      if (!availableColumns.has('assigned_to') || !availableColumns.has('assigned_by') || !availableColumns.has('assigned_at') || !availableColumns.has('assignment_note')) {
        await this.ensureAssignmentColumns();
      }

      const targetUserId = assigneeUserId !== undefined && assigneeUserId !== null ? Number(assigneeUserId) : null;
      const byUserId = assignedByUserId !== undefined && assignedByUserId !== null ? Number(assignedByUserId) : null;

      await conn.query(`
        UPDATE orders
        SET assigned_to = ?, assigned_by = ?, assigned_at = NOW(), assignment_note = ?
        WHERE id = ?
      `, [targetUserId, byUserId, assignmentNote ?? null, id]);

      return await this.findById(id);
    } finally {
      if (conn) conn.release();
    }
  },

  async getDashboardStats(userId = null) {
    let conn;
    try {
      conn = await pool.getConnection();
      
      const today = new Date().toISOString().split('T')[0];
      
      let query = `
        SELECT 
          COUNT(*) as total_orders,
          SUM(CASE WHEN status = 'livree' THEN 1 ELSE 0 END) as delivered,
          SUM(CASE WHEN status = 'annulee' THEN 1 ELSE 0 END) as cancelled,
          SUM(CASE WHEN status = 'reportee' THEN 1 ELSE 0 END) as postponed,
          COALESCE(SUM(CASE WHEN status = 'livree' THEN total_amount ELSE 0 END), 0) as revenue
        FROM orders 
        WHERE DATE(created_at) = ?
      `;
      
      let params = [today];
      
      if (userId) {
        query += ` AND user_id = ?`;
        params.push(userId);
      }
      
      const [stats] = await conn.query(query, params);
      
      console.log(`📊 Stats${userId ? ` pour user ${userId}` : ''}:`, stats[0]);
      
      const result = stats[0];
      return {
        total_orders: Number(result.total_orders),
        delivered: Number(result.delivered),
        cancelled: Number(result.cancelled),
        postponed: Number(result.postponed),
        revenue: Number(result.revenue)
      };
    } finally {
      if (conn) conn.release();
    }
  },

  async findByUserId(userId) {
    let conn;
    try {
      conn = await pool.getConnection();
      const [orders] = await conn.query(
        'SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC',
        [userId]
      );
      console.log(`📦 ${orders.length} commandes pour user ${userId}`);
      return orders;
    } finally {
      if (conn) conn.release();
    }
  },

  async countByUserId(userId) {
    let conn;
    try {
      conn = await pool.getConnection();
      const [rows] = await conn.query(
        'SELECT COUNT(*) as count FROM orders WHERE user_id = ?',
        [userId]
      );
      const count = Number(rows[0].count);
      console.log(`🔢 ${count} commandes au total pour user ${userId}`);
      return count;
    } finally {
      if (conn) conn.release();
    }
  },
  async findByShopifyOrderId(shopifyOrderId) {
    let conn;
    try {
      conn = await pool.getConnection();
      const [orders] = await conn.query(
        'SELECT * FROM orders WHERE shopify_order_id = ?',
        [shopifyOrderId]
      );
      return orders[0] || null;
    } finally {
      if (conn) conn.release();
    }
  },

  // Trouver les commandes par store Shopify
  async findByShopifyStoreId(shopifyStoreId, userId = null) {
    let conn;
    try {
      conn = await pool.getConnection();
      let query = 'SELECT * FROM orders WHERE shopify_store_id = ?';
      let params = [shopifyStoreId];
      
      if (userId) {
        query += ' AND user_id = ?';
        params.push(userId);
      }
      
      query += ' ORDER BY order_date DESC';
      
      const orders = await conn.query(query, params);
      return orders;
    } finally {
      if (conn) conn.release();
    }
  },

  // Créer une commande avec données Shopify
  // Créer une commande avec données Shopify - VERSION CORRIGÉE POUR VOTRE STRUCTURE
async createFromShopify(orderData, userId) {
  let conn;
  try {
    conn = await pool.getConnection();
    
    console.log('📦 [Order.createFromShopify] Données reçues:', {
      userId,
      shopifyOrderId: orderData.shopify_order_id,
      customerName: orderData.customer_name,
      totalAmount: orderData.total_amount
    });
    
    // Gestion sécurisée du shopify_order_id
    const shopifyOrderId = orderData.shopify_order_id;
    const safeShopifyOrderId = shopifyOrderId ? shopifyOrderId.toString() : null;
    
    // Générer un numéro personnalisé (comme votre autre méthode)
    const customOrderNumber = await this.generateCustomOrderNumber(userId);
    
    // IMPORTANT: Vérifier et parser total_amount
    const totalAmount = parseFloat(orderData.total_amount) || 0;
    if (isNaN(totalAmount)) {
      console.error('❌ total_amount invalide:', orderData.total_amount);
      throw new Error('Montant total invalide');
    }
    
    //  STRUCTURE RÉELLE DE TABLE - CORRECTE
    // Colonnes: user_id, client_name, client_phone, client_address, total_amount, status, notes, 
    // products, shopify_order_id, shopify_store_id, shopify_data, custom_order_number, created_at
    const result = await conn.query(`
      INSERT INTO orders (
        user_id, client_name, client_phone, 
        client_address, total_amount, 
        status, notes, source,
        products, shopify_order_id, shopify_store_id, shopify_data,
        custom_order_number, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
    `, [
      userId,                                  // user_id
      orderData.customer_name || '',           // client_name
      orderData.customer_phone || '',          // client_phone
      orderData.customer_address || '',        // client_address
      totalAmount,                             // total_amount (déjà parsé)
      orderData.status || 'en_attente',        // status
      orderData.notes || '',                   // notes
      'shopify',                               // source
      orderData.products || '[]',              // products
      safeShopifyOrderId,                      // shopify_order_id
      orderData.shopify_store_id || null,      // shopify_store_id
      orderData.shopify_data || '{}',          // shopify_data
      customOrderNumber                        // custom_order_number (pas order_number!)
    ]);
    // Après avoir créé la commande
await conn.query(
  'UPDATE app_users SET order_count = order_count + 1 WHERE id = ?',
  [userId]
);
    
    // Récupérer la commande créée
    const [newOrder] = await conn.query(
      'SELECT * FROM orders WHERE id = ?',
      [result.insertId]
    );
    
    console.log(`✅ Commande Shopify créée: ${customOrderNumber} (ID: ${result.insertId})`);
    console.log(`   Client: ${newOrder.client_name}`);
    console.log(`   Total: ${newOrder.total_amount}`);
    console.log(`   Shopify ID: ${newOrder.shopify_order_id}`);
    
    return newOrder;
    
  } catch (error) {
    console.error('❌ [Order.createFromShopify] Erreur:', error.message);
    console.error('   Stack:', error.stack);
    throw error;
  } finally {
    if (conn) conn.release();
  }
},

  // Mettre à jour une commande depuis Shopify - VERSION CORRIGÉE POUR VOTRE STRUCTURE
async updateFromShopify(orderId, orderData, userId) {
  let conn;
  try {
    conn = await pool.getConnection();
    
    console.log(`🔄 [Order.updateFromShopify] Mise à jour commande ${orderId}`);
    
    // Vérifier que la commande appartient à l'utilisateur
    const [existingOrder] = await conn.query(
      'SELECT id FROM orders WHERE id = ? AND user_id = ?',
      [orderId, userId]
    );
    
    if (!existingOrder) {
      throw new Error('Commande non trouvée ou non autorisée');
    }
    
    // IMPORTANT: Vérifier et parser total_amount
    const totalAmount = parseFloat(orderData.total_amount) || 0;
    if (isNaN(totalAmount)) {
      console.error('❌ total_amount invalide:', orderData.total_amount);
      throw new Error('Montant total invalide');
    }
    
    // VOTRE STRUCTURE RÉELLE DE TABLE - CORRECTE
    await conn.query(`
      UPDATE orders SET
        client_name = ?,
        client_phone = ?,
        client_address = ?,
        total_amount = ?,
        status = ?,
        notes = ?,
        products = ?,
        shopify_data = ?,
        updated_at = NOW()
      WHERE id = ?
    `, [
      orderData.customer_name || '',           // client_name
      orderData.customer_phone || '',          // client_phone
      orderData.customer_address || '',        // client_address
      totalAmount,                             // total_amount (déjà parsé)
      orderData.status || 'en_attente',        // status
      orderData.notes || '',                   // notes
      orderData.products || '[]',              // products
      orderData.shopify_data || '{}',          // shopify_data
      orderId                                  // WHERE id = ?
    ]);
    
    // Récupérer la commande mise à jour
    const [updatedOrder] = await conn.query(
      'SELECT * FROM orders WHERE id = ?',
      [orderId]
    );
    
    console.log(`✅ Commande Shopify mise à jour: ${updatedOrder.custom_order_number}`);
    
    return updatedOrder;
    
  } catch (error) {
    console.error('❌ [Order.updateFromShopify] Erreur:', error.message);
    console.error('   Stack:', error.stack);
    throw error;
  } finally {
    if (conn) conn.release();
  }
},
  // Méthode utilitaire pour créer ou mettre à jour
  async create(orderData, userId) {
    // Si c'est une commande Shopify, utiliser la méthode spécifique
    if (orderData.shopify_order_id) {
      return this.createFromShopify(orderData, userId);
    }
    
    // Sinon, utiliser la méthode normale existante
    // ... votre code existant pour create ...
  },

  // Mettre à jour une commande
  async update(orderId, orderData, userId) {
    // Si c'est une commande Shopify, utiliser la méthode spécifique
    if (orderData.shopify_order_id) {
      return this.updateFromShopify(orderId, orderData, userId);
    }
    
    // Sinon, utiliser la méthode normale existante
    // ... votre code existant pour update ...
  }
};

module.exports = Order;