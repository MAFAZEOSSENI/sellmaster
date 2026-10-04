const crypto = require('crypto');
const { getConnection } = require('../config/database');

const DEFAULT_FIELDS_CONFIG = {
  phone: true,
  city: true,
  address: true,
  product_variant: true,
  quantity: true,
};

class OrderForm {
  static async create(ownerUserId, fieldsConfig = DEFAULT_FIELDS_CONFIG) {
    const normalizedOwnerId = Number(ownerUserId);
    if (!Number.isInteger(normalizedOwnerId) || normalizedOwnerId <= 0) {
      throw new Error('ownerUserId invalide');
    }

    const publicToken = crypto.randomBytes(32).toString('hex');
    const config = { ...DEFAULT_FIELDS_CONFIG, ...fieldsConfig };
    const conn = await getConnection();
    try {
      const [result] = await conn.query(
        `INSERT INTO order_forms (owner_user_id, public_token, fields_config)
         VALUES ($1, $2, $3::jsonb)
         RETURNING id`,
        [normalizedOwnerId, publicToken, JSON.stringify(config)]
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
        `SELECT id, owner_user_id, public_token, fields_config, is_published, created_at, updated_at
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
        `SELECT id, owner_user_id, public_token, fields_config, is_published, created_at, updated_at
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

  static async update(id, ownerUserId, fieldsConfig) {
    const normalizedId = Number(id);
    const normalizedOwnerId = Number(ownerUserId);
    if (!Number.isInteger(normalizedId) || normalizedId <= 0 || !Number.isInteger(normalizedOwnerId) || normalizedOwnerId <= 0) {
      throw new Error('Identifiant de formulaire invalide');
    }
    if (!fieldsConfig || typeof fieldsConfig !== 'object' || Array.isArray(fieldsConfig)) {
      throw new Error('fields_config invalide');
    }

    const conn = await getConnection();
    try {
      const [result] = await conn.query(
        `UPDATE order_forms
         SET fields_config = $1::jsonb, updated_at = NOW()
         WHERE id = $2 AND owner_user_id = $3`,
        [JSON.stringify({ ...DEFAULT_FIELDS_CONFIG, ...fieldsConfig }), normalizedId, normalizedOwnerId]
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
