const crypto = require('crypto');
const { getConnection } = require('../config/database');

const DEFAULT_FIELDS_CONFIG = {
  phone: true,
  city: true,
  address: true,
  product_variant: true,
  quantity: true,
  button_text: 'Commander',
  button_color: '#00a6b2',
  phone_label: 'Numéro WhatsApp',
  delivery_note: false,
  country: [],
  shipping_options: [],
};
const DEFAULT_COD_GATEWAY_NAME = 'Cash on Delivery (COD)';
const VALID_DISPLAY_MODES = new Set(['popup', 'embedded']);

function normalizeFieldsConfig(fieldsConfig = {}) {
  const config = { ...DEFAULT_FIELDS_CONFIG, ...(fieldsConfig && typeof fieldsConfig === 'object' ? fieldsConfig : {}) };
  config.button_text = String(config.button_text || DEFAULT_FIELDS_CONFIG.button_text).trim().slice(0, 60) || DEFAULT_FIELDS_CONFIG.button_text;
  config.button_color = /^#[0-9a-fA-F]{6}$/.test(String(config.button_color))
    ? String(config.button_color)
    : DEFAULT_FIELDS_CONFIG.button_color;
  config.phone_label = String(config.phone_label || DEFAULT_FIELDS_CONFIG.phone_label).trim().slice(0, 60) || DEFAULT_FIELDS_CONFIG.phone_label;
  config.delivery_note = config.delivery_note === true;
  config.country = (Array.isArray(config.country) ? config.country : []).slice(0, 100).map(option => {
    const label = String(option?.label ?? option?.value ?? option ?? '').trim().slice(0, 100);
    const value = String(option?.value ?? label).trim().slice(0, 100);
    return label && value ? { label, value } : null;
  }).filter(Boolean);
  config.shipping_options = (Array.isArray(config.shipping_options) ? config.shipping_options : []).slice(0, 30).map(option => {
    const label = String(option?.label || '').trim().slice(0, 100);
    const price = Number(option?.price);
    return label && Number.isFinite(price) && price >= 0
      ? { label, price: Math.round(price * 100) / 100 }
      : null;
  }).filter(Boolean);
  return config;
}

class OrderForm {
  static normalizeFieldsConfig(fieldsConfig) {
    return normalizeFieldsConfig(fieldsConfig);
  }

  static async create(ownerUserId, fieldsConfig = DEFAULT_FIELDS_CONFIG, codGatewayName = DEFAULT_COD_GATEWAY_NAME, displayMode = 'embedded') {
    const normalizedOwnerId = Number(ownerUserId);
    if (!Number.isInteger(normalizedOwnerId) || normalizedOwnerId <= 0) {
      throw new Error('ownerUserId invalide');
    }

    const publicToken = crypto.randomBytes(32).toString('hex');
    const config = normalizeFieldsConfig(fieldsConfig);
    const normalizedDisplayMode = VALID_DISPLAY_MODES.has(displayMode) ? displayMode : 'embedded';
    const gatewayName = String(codGatewayName || '').trim();
    if (!gatewayName || gatewayName.length > 255) throw new Error('Nom du moyen de paiement COD invalide');
    const conn = await getConnection();
    try {
      const [result] = await conn.query(
        `INSERT INTO order_forms (owner_user_id, public_token, fields_config, cod_gateway_name, display_mode)
         VALUES ($1, $2, $3::jsonb, $4, $5)
         RETURNING id`,
        [normalizedOwnerId, publicToken, JSON.stringify(config), gatewayName, normalizedDisplayMode]
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
        `SELECT id, owner_user_id, public_token, fields_config, cod_gateway_name, display_mode, is_published, created_at, updated_at
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
        `SELECT id, owner_user_id, public_token, fields_config, cod_gateway_name, display_mode, is_published, created_at, updated_at
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

  static async update(id, ownerUserId, fieldsConfig, codGatewayName = DEFAULT_COD_GATEWAY_NAME, displayMode = 'embedded') {
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
    if (!VALID_DISPLAY_MODES.has(displayMode)) throw new Error('Mode d’affichage invalide');

    const conn = await getConnection();
    try {
      const [result] = await conn.query(
        `UPDATE order_forms
         SET fields_config = $1::jsonb, cod_gateway_name = $2, display_mode = $3, updated_at = NOW()
         WHERE id = $4 AND owner_user_id = $5`,
        [JSON.stringify(normalizeFieldsConfig(fieldsConfig)), gatewayName, displayMode, normalizedId, normalizedOwnerId]
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
