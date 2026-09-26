const { getConnection } = require('../config/database');

class ShopifyConfig {
  // Trouver par ID de store
  static async findById(id, userId = null) {
    let conn;
    try {
      conn = await getConnection();
      let query = `SELECT * FROM shopify_configs WHERE id = ?`;
      let params = [id];
      
      if (userId) {
        query += ` AND user_id = ?`;
        params.push(userId);
      }
      
      const [configs] = await conn.query(query, params);
      return configs[0] || null;
    } finally {
      if (conn) conn.release();
    }
  }

  // Trouver tous les stores d'un utilisateur
  static async findByUserId(userId) {
    let conn;
    try {
      conn = await getConnection();
      const [configs] = await conn.query(
        `SELECT id, shop_name, api_key, is_active, connected_at, last_sync 
         FROM shopify_configs 
         WHERE user_id = ? 
         ORDER BY connected_at DESC`,
        [userId]
      );
      return configs;
    } finally {
      if (conn) conn.release();
    }
  }

  // Trouver un store par le domaine Shopify
  static async findByShopName(shopName) {
    let conn;
    try {
      conn = await getConnection();
      const normalizedShopName = shopName
        .replace(/^https?:\/\//i, '')
        .replace(/\.myshopify\.com.*$/i, '')
        .replace(/\.myshopify\.com$/i, '')
        .trim();

      const [configs] = await conn.query(
        `SELECT * FROM shopify_configs WHERE LOWER(REPLACE(shop_name, 'https://', '')) LIKE ? LIMIT 1`,
        [`%${normalizedShopName}%`]
      );
      return configs[0] || null;
    } finally {
      if (conn) conn.release();
    }
  }

  // Créer un nouveau store
  static async create(storeData, userId) {
    let conn;
    try {
      conn = await getConnection();
      
      const [result] = await conn.query(`
        INSERT INTO shopify_configs 
        (shop_name, api_key, access_token, user_id, is_active, connected_at)
        VALUES (?, ?, ?, ?, TRUE, NOW())
        RETURNING id
      `, [
        storeData.shopName,
        storeData.apiKey,
        storeData.accessToken,
        userId
      ]);
      
      return {
        id: result.insertId,
        shop_name: storeData.shopName,
        user_id: userId,
        connected_at: new Date()
      };
    } finally {
      if (conn) conn.release();
    }
  }

  // Créer ou mettre à jour une boutique connectée via OAuth
  static async upsertOAuthStore(storeData, userId) {
    let conn;
    try {
      conn = await getConnection();
      const [existing] = await conn.query(
        `SELECT id FROM shopify_configs WHERE shop_name = ? AND user_id = ? LIMIT 1`,
        [storeData.shopName, userId]
      );

      if (existing.length > 0) {
        await conn.query(
          `UPDATE shopify_configs
           SET api_key = ?, access_token = ?, is_active = TRUE, connected_at = NOW()
           WHERE id = ? AND user_id = ?`,
          [storeData.apiKey, storeData.accessToken, existing[0].id, userId]
        );
        return { id: existing[0].id, shop_name: storeData.shopName, user_id: userId };
      }

      const [result] = await conn.query(`
        INSERT INTO shopify_configs
        (shop_name, api_key, access_token, user_id, is_active, connected_at)
        VALUES (?, ?, ?, ?, TRUE, NOW())
        RETURNING id
      `, [storeData.shopName, storeData.apiKey, storeData.accessToken, userId]);

      return { id: result.insertId, shop_name: storeData.shopName, user_id: userId };
    } finally {
      if (conn) conn.release();
    }
  }

  // Mettre à jour le dernier sync
  static async updateLastSync(id, userId) {
    let conn;
    try {
      conn = await getConnection();
      await conn.query(
        `UPDATE shopify_configs SET last_sync = NOW() WHERE id = ? AND user_id = ?`,
        [id, userId]
      );
      return true;
    } finally {
      if (conn) conn.release();
    }
  }

  // Supprimer un store
  static async delete(id, userId) {
    let conn;
    try {
      conn = await getConnection();
      const [result] = await conn.query(
        `DELETE FROM shopify_configs WHERE id = ? AND user_id = ?`,
        [id, userId]
      );
      return result.affectedRows > 0;
    } finally {
      if (conn) conn.release();
    }
  }

  // Récupérer l'access token (pour usage interne)
  static async getAccessToken(id, userId) {
    let conn;
    try {
      conn = await getConnection();
      const [configs] = await conn.query(
        `SELECT access_token FROM shopify_configs WHERE id = ? AND user_id = ?`,
        [id, userId]
      );
      return configs[0] ? configs[0].access_token : null;
    } finally {
      if (conn) conn.release();
    }
  }
}

module.exports = ShopifyConfig;