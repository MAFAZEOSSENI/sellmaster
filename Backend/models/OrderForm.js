const crypto = require('crypto');
const { getConnection } = require('../config/database');

const DEFAULT_FIELDS_CONFIG = {
  phone: true,
  city: true,
  address: true,
  product_variant: true,
  quantity: true,
};
const DEFAULT_COD_GATEWAY_NAME = 'Cash on Delivery (COD)';

class OrderForm {
  static async create(ownerUserId, fieldsConfig = DEFAULT_FIELDS_CONFIG, codGatewayName = DEFAULT_COD_GATEWAY_NAME) {
    const normalizedOwnerId = Number(ownerUserId);
    if (!Number.isInteger(normalizedOwnerId) || normalizedOwnerId <= 0) {
      throw new Error('ownerUserId invalide');
    }

    const publicToken = crypto.randomBytes(32).toString('hex');
    const config = { ...DEFAULT_FIELDS_CONFIG, ...fieldsConfig };
    const gatewayName = String(codGatewayName || '').trim();
    if (!gatewayName || gatewayName.length > 255) throw new Error('Nom du moyen de paiement COD invalide');
    const conn = await getConnection();
    try {
      const [result] = await conn.query(
        `INSERT INTO order_forms (owner_user_id, public_token, fields_config, cod_gateway_name)
         VALUES ($1, $2, $3::jsonb, $4)
         RETURNING id`,
        [normalizedOwnerId, publicToken, JSON.stringify(config), gatewayName]
      );
      const [rows] = await conn.query('SELECT * FROM order_forms WHERE id = $1', [result.insertId]);
      return rows[0] || null;
    } finally {
      conn.release();
    }
  }

  static async findByToken(publicToken) {
    if (typeof publicToken !== 'string' || publicToken.length < 32 || publicToken.length > 64) {
      return null;
    }

    const conn = await getConnection();
    try {
      const [rows] = await conn.query(
        `SELECT id, owner_user_id, public_token, fields_config, cod_gateway_name, is_published, created_at, updated_at
         FROM order_forms
         WHERE public_token = $1 AND is_published = TRUE
         LIMIT 1`,
        [publicToken]
      );
      return rows[0] || null;
    } finally {
      conn.release();
    }
  }

  static async findByOwner(ownerUserId) {
    const normalizedOwnerId = Number(ownerUserId);
    if (!Number.isInteger(normalizedOwnerId) || normalizedOwnerId <= 0) {
      return [];
    }

    const conn = await getConnection();
    try {
      const [rows] = await conn.query(
        `SELECT id, owner_user_id, public_token, fields_config, cod_gateway_name, is_published, created_at, updated_at
         FROM order_forms
         WHERE owner_user_id = $1
         ORDER BY created_at DESC`,
        [normalizedOwnerId]
      );
      return rows;
    } finally {
      conn.release();
    }
  }

  static async update(id, ownerUserId, fieldsConfig, codGatewayName = DEFAULT_COD_GATEWAY_NAME) {
    const normalizedId = Number(id);
    const normalizedOwnerId = Number(ownerUserId);
    if (!Number.isInteger(normalizedId) || normalizedId <= 0 || !Number.isInteger(normalizedOwnerId) || normalizedOwnerId <= 0) {
      throw new Error('Identifiant de formulaire invalide');
    }
    if (!fieldsConfig || typeof fieldsConfig !== 'object' || Array.isArray(fieldsConfig)) {
      throw new Error('fields_config invalide');
    }
    const gatewayName = String(codGatewayName || '').trim();
    if (!gatewayName || gatewayName.length > 255) throw new Error('Nom du moyen de paiement COD invalide');

    const conn = await getConnection();
    try {
      const [result] = await conn.query(
        `UPDATE order_forms
         SET fields_config = $1::jsonb, cod_gateway_name = $2, updated_at = NOW()
         WHERE id = $3 AND owner_user_id = $4`,
        [JSON.stringify({ ...DEFAULT_FIELDS_CONFIG, ...fieldsConfig }), gatewayName, normalizedId, normalizedOwnerId]
      );
      if (result.affectedRows === 0) return null;

      const [rows] = await conn.query('SELECT * FROM order_forms WHERE id = $1 AND owner_user_id = $2', [normalizedId, normalizedOwnerId]);
      return rows[0] || null;
    } finally {
      conn.release();
    }
  }

  static async publish(id, ownerUserId) {
    return this.setPublished(id, ownerUserId, true);
  }

  static async unpublish(id, ownerUserId) {
    return this.setPublished(id, ownerUserId, false);
  }

  static async setPublished(id, ownerUserId, isPublished) {
    const normalizedId = Number(id);
    const normalizedOwnerId = Number(ownerUserId);
    if (!Number.isInteger(normalizedId) || normalizedId <= 0 || !Number.isInteger(normalizedOwnerId) || normalizedOwnerId <= 0) {
      throw new Error('Identifiant de formulaire invalide');
    }

    const conn = await getConnection();
    try {
      const [result] = await conn.query(
        `UPDATE order_forms
         SET is_published = $1, updated_at = NOW()
         WHERE id = $2 AND owner_user_id = $3`,
        [isPublished, normalizedId, normalizedOwnerId]
      );
      if (result.affectedRows === 0) return null;

      const [rows] = await conn.query('SELECT * FROM order_forms WHERE id = $1 AND owner_user_id = $2', [normalizedId, normalizedOwnerId]);
      return rows[0] || null;
    } finally {
      conn.release();
    }
  }
}

module.exports = OrderForm;
