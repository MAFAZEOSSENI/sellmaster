const { pool } = require('../config/database');

class ShopifyConfig {
  // Trouver par ID de store
  static async findById(id, userId = null) {
    let conn;
    try {
      conn = await pool.getConnection();
      let query = `SELECT * FROM shopify_configs WHERE id = ?`;
      let params = [id];
      
      if (userId) {
        query += ` AND user_id = ?`;
        params.push(userId);
      }
      
      const [config] = await conn.query(query, params);
      return config;
    } finally {
      if (conn) conn.release();
    }
  }

  // Trouver tous les stores d'un utilisateur
  static async findByUserId(userId) {
    let conn;
    try {
      conn = await pool.getConnection();
      const configs = await conn.query(
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

  // Créer un nouveau store
  static async create(storeData, userId) {
    let conn;
    try {
      conn = await pool.getConnection();
      
      const result = await conn.query(`
        INSERT INTO shopify_configs 
        (shop_name, api_key, access_token, user_id, is_active, connected_at)
        VALUES (?, ?, ?, ?, 1, NOW())
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

  // Mettre à jour le dernier sync
  static async updateLastSync(id, userId) {
    let conn;
    try {
      conn = await pool.getConnection();
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
      conn = await pool.getConnection();
      const result = await conn.query(
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
      conn = await pool.getConnection();
      const [config] = await conn.query(
        `SELECT access_token FROM shopify_configs WHERE id = ? AND user_id = ?`,
        [id, userId]
      );
      return config ? config.access_token : null;
    } finally {
      if (conn) conn.release();
    }
  }
}

module.exports = ShopifyConfig;