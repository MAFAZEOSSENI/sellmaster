const { getConnection } = require('../config/database');

class FormUpsell {
  static calculateDiscountedPrice(basePrice, discountPercent = 0) {
    const numericBasePrice = Number(basePrice) || 0;
    const numericDiscount = Number(discountPercent) || 0;
    const clampedDiscount = Math.min(Math.max(numericDiscount, 0), 100);
    return Math.round((numericBasePrice * (1 - clampedDiscount / 100)) * 100) / 100;
  }

  static async create({ orderFormId, productVariantId, title, discountPercent = 0, position = 0, isActive = true }) {
    const normalizedFormId = Number(orderFormId);
    const normalizedPosition = Number(position) || 0;
    const normalizedDiscount = Number(discountPercent) || 0;
    const normalizedIsActive = isActive !== false;

    if (!Number.isInteger(normalizedFormId) || normalizedFormId <= 0) {
      throw new Error('Identifiant de formulaire invalide');
    }
    if (!productVariantId && productVariantId !== 0) {
      throw new Error('Produit upsell requis');
    }
    const safeTitle = String(title || '').trim();
    if (!safeTitle) {
      throw new Error('Titre de l’upsell requis');
    }

    const conn = await getConnection();
    try {
      const [rows] = await conn.query(
        `INSERT INTO form_upsells (order_form_id, product_variant_id, title, discount_percent, position, is_active)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [normalizedFormId, String(productVariantId), safeTitle, Math.max(0, Math.min(normalizedDiscount, 100)), normalizedPosition, normalizedIsActive]
      );
      return rows[0] || null;
    } finally {
      conn.release();
    }
  }

  static async update(id, orderFormId, payload = {}) {
    const normalizedId = Number(id);
    const normalizedFormId = Number(orderFormId);
    if (!Number.isInteger(normalizedId) || normalizedId <= 0) {
      throw new Error('Identifiant d’upsell invalide');
    }
    if (!Number.isInteger(normalizedFormId) || normalizedFormId <= 0) {
      throw new Error('Identifiant de formulaire invalide');
    }

    const title = payload?.title != null ? String(payload.title || '').trim() : null;
    const productVariantId = payload?.product_variant_id != null ? String(payload.product_variant_id) : null;
    const discountPercent = payload?.discount_percent != null ? Number(payload.discount_percent) : null;
    const position = payload?.position != null ? Number(payload.position) : null;
    const isActive = payload?.is_active != null ? Boolean(payload.is_active) : null;

    if (title !== null && !title) {
      throw new Error('Titre de l’upsell requis');
    }
    if (productVariantId !== null && !productVariantId) {
      throw new Error('Produit upsell requis');
    }

    const conn = await getConnection();
    try {
      const sets = [];
      const values = [];
      let index = 1;

      if (title !== null) {
        sets.push(`title = $${index++}`);
        values.push(title);
      }
      if (productVariantId !== null) {
        sets.push(`product_variant_id = $${index++}`);
        values.push(productVariantId);
      }
      if (discountPercent !== null) {
        sets.push(`discount_percent = $${index++}`);
        values.push(Math.max(0, Math.min(Number(discountPercent) || 0, 100)));
      }
      if (position !== null) {
        sets.push(`position = $${index++}`);
        values.push(Number(position) || 0);
      }
      if (isActive !== null) {
        sets.push(`is_active = $${index++}`);
        values.push(isActive);
      }

      if (!sets.length) {
        return await this.findById(id);
      }

      values.push(normalizedId, normalizedFormId);
      const [rows] = await conn.query(
        `UPDATE form_upsells
         SET ${sets.join(', ')}
         WHERE id = $${index} AND order_form_id = $${index + 1}
         RETURNING *`,
        values
      );
      return rows[0] || null;
    } finally {
      conn.release();
    }
  }

  static async delete(id, orderFormId) {
    const normalizedId = Number(id);
    const normalizedFormId = Number(orderFormId);
    if (!Number.isInteger(normalizedId) || normalizedId <= 0) {
      throw new Error('Identifiant d’upsell invalide');
    }
    if (!Number.isInteger(normalizedFormId) || normalizedFormId <= 0) {
      throw new Error('Identifiant de formulaire invalide');
    }

    const conn = await getConnection();
    try {
      const [rows] = await conn.query(
        `DELETE FROM form_upsells
         WHERE id = $1 AND order_form_id = $2
         RETURNING *`,
        [normalizedId, normalizedFormId]
      );
      return rows[0] || null;
    } finally {
      conn.release();
    }
  }

  static async findByFormId(orderFormId) {
    const normalizedFormId = Number(orderFormId);
    if (!Number.isInteger(normalizedFormId) || normalizedFormId <= 0) {
      return [];
    }

    const conn = await getConnection();
    try {
      const [rows] = await conn.query(
        `SELECT *
         FROM form_upsells
         WHERE order_form_id = $1
         ORDER BY position ASC, id ASC`,
        [normalizedFormId]
      );
      return rows;
    } finally {
      conn.release();
    }
  }

  static async findActiveByFormId(orderFormId) {
    const normalizedFormId = Number(orderFormId);
    if (!Number.isInteger(normalizedFormId) || normalizedFormId <= 0) {
      return [];
    }

    const conn = await getConnection();
    try {
      const [rows] = await conn.query(
        `SELECT *
         FROM form_upsells
         WHERE order_form_id = $1 AND is_active = TRUE
         ORDER BY position ASC, id ASC`,
        [normalizedFormId]
      );
      return rows;
    } finally {
      conn.release();
    }
  }

  static async findById(id) {
    const normalizedId = Number(id);
    if (!Number.isInteger(normalizedId) || normalizedId <= 0) {
      return null;
    }

    const conn = await getConnection();
    try {
      const [rows] = await conn.query(
        `SELECT * FROM form_upsells WHERE id = $1 LIMIT 1`,
        [normalizedId]
      );
      return rows[0] || null;
    } finally {
      conn.release();
    }
  }
}

module.exports = FormUpsell;
