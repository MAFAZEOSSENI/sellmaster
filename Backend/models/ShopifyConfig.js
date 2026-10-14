const { getConnection } = require('../config/database');
const { normalizeShopHost, getShopAliases, getCanonicalShopDomain } = require('../utils/shopifyStoreIdentity');

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

  static async findOAuthCredentials(shopName, userId, clientId = null) {
    const conn = await getConnection();
    try {
      const params = [shopName, Number(userId)];
      let query = `SELECT id, user_id, shop_name, api_key, client_secret
                   FROM shopify_configs
                   WHERE shop_name = $1 AND user_id = $2`;
      if (clientId) {
        query += ' AND api_key = $3';
        params.push(clientId);
      }
      query += ' ORDER BY connected_at DESC NULLS LAST, id DESC LIMIT 1';
      const [rows] = await conn.query(query, params);
      return rows[0] || null;
    } finally {
      conn.release();
    }
  }

  static async registerOAuthCredentials({ shopName, clientId, clientSecret }, userId) {
    const conn = await getConnection();
    try {
      const [existing] = await conn.query(
        `SELECT id FROM shopify_configs WHERE user_id = $1 AND shop_name = $2
         ORDER BY id DESC LIMIT 1`,
        [Number(userId), shopName]
      );

      if (existing.length) {
        const [result] = await conn.query(
          `UPDATE shopify_configs
           SET api_key = $1, client_secret = $2, updated_at = NOW()
           WHERE id = $3 AND user_id = $4`,
          [clientId, clientSecret, existing[0].id, Number(userId)]
        );
        return { id: existing[0].id, affectedRows: result.affectedRows };
      }

      const [result] = await conn.query(
        `INSERT INTO shopify_configs (user_id, shop_name, api_key, client_secret, is_active)
         VALUES ($1, $2, $3, $4, FALSE)
         RETURNING id`,
        [Number(userId), shopName, clientId, clientSecret]
      );
      return { id: result.insertId };
    } finally {
      conn.release();
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
         WHERE user_id = ? AND access_token IS NOT NULL
         ORDER BY connected_at DESC`,
        [userId]
      );
      return configs;
    } finally {
      if (conn) conn.release();
    }
  }

  static async findActiveByOwner(ownerUserId) {
    const conn = await getConnection();
    try {
      const [configs] = await conn.query(
        `SELECT id, user_id, shop_name, access_token
         FROM shopify_configs
         WHERE user_id = $1 AND is_active = TRUE
         ORDER BY connected_at DESC`,
        [ownerUserId]
      );
      return configs;
    } finally {
      conn.release();
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
    let transactionStarted = false;
    try {
      conn = await getConnection();
      const canonicalShopName = getCanonicalShopDomain(storeData.shopInfo || {}, storeData.shopName);
      if (!canonicalShopName || !storeData.accessToken) {
        throw new Error('Domaine canonique Shopify ou jeton d’accès invalide');
      }
      const aliases = getShopAliases([canonicalShopName, storeData.shopName, ...(storeData.shopAliases || [])]);

      await conn.beginTransaction();
      transactionStarted = true;
      await conn.query(
        `SELECT pg_advisory_xact_lock(?, hashtext(?))`,
        [Number(userId), canonicalShopName]
      );
      const [configuredStores] = await conn.query(
        `SELECT id, shop_name, is_active, access_token, connected_at
         FROM shopify_configs
         WHERE user_id = ?
         ORDER BY connected_at DESC NULLS LAST, id DESC`,
        [Number(userId)]
      );
      const existing = configuredStores
        .filter((store) => aliases.includes(normalizeShopHost(store.shop_name)))
        .sort((left, right) => {
          const leftHasToken = Boolean(left.access_token);
          const rightHasToken = Boolean(right.access_token);
          if (leftHasToken !== rightHasToken) return rightHasToken - leftHasToken;
          const leftActive = Boolean(left.is_active);
          const rightActive = Boolean(right.is_active);
          if (leftActive !== rightActive) return rightActive - leftActive;
          return Number(right.id) - Number(left.id);
        });

      let storeId;
      if (existing.length > 0) {
        storeId = Number(existing[0].id);
        await conn.query(
          `UPDATE shopify_configs
           SET api_key = ?, access_token = ?, client_secret = COALESCE(?, client_secret),
               shop_name = ?, is_active = TRUE, connected_at = NOW(), updated_at = NOW()
           WHERE id = ? AND user_id = ?`,
          [storeData.apiKey, storeData.accessToken, storeData.clientSecret || null, canonicalShopName, storeId, Number(userId)]
        );
        const duplicateIds = existing.slice(1).map((store) => Number(store.id)).filter((id) => Number.isInteger(id) && id > 0);
        if (duplicateIds.length) {
          await conn.query(
            `DELETE FROM shopify_configs WHERE user_id = ? AND id = ANY(?)`,
            [Number(userId), duplicateIds]
          );
        }
      } else {
        const [result] = await conn.query(`
          INSERT INTO shopify_configs
          (shop_name, api_key, client_secret, access_token, user_id, is_active, connected_at)
          VALUES (?, ?, ?, ?, ?, TRUE, NOW())
          RETURNING id
        `, [canonicalShopName, storeData.apiKey, storeData.clientSecret || null, storeData.accessToken, Number(userId)]);
        storeId = Number(result.insertId);
      }

      await conn.commit();
      transactionStarted = false;
      return {
        id: storeId,
        shop_name: canonicalShopName,
        user_id: Number(userId),
        mergedDuplicateCount: Math.max(0, existing.length - 1),
      };
    } catch (error) {
      if (conn && transactionStarted) await conn.rollback();
      throw error;
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