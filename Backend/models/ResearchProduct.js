const { getConnection } = require('../config/database');

function numericId(value) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

const ResearchProduct = {
  async importFromSource(ownerUserId, sourceResult) {
    const ownerId = numericId(ownerUserId);
    if (!ownerId) throw new Error('Utilisateur propriétaire invalide.');

    const conn = await getConnection();
    try {
      await conn.beginTransaction();
      const [productRows] = await conn.query(`
        INSERT INTO research_products
          (owner_user_id, canonical_url, source_type, source_key, title, description, image_url, metadata, first_seen_at, last_seen_at, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, NOW(), NOW(), NOW(), NOW())
        ON CONFLICT (owner_user_id, canonical_url)
        DO UPDATE SET
          title = COALESCE(EXCLUDED.title, research_products.title),
          description = COALESCE(EXCLUDED.description, research_products.description),
          image_url = COALESCE(EXCLUDED.image_url, research_products.image_url),
          metadata = EXCLUDED.metadata,
          last_seen_at = NOW(),
          updated_at = NOW()
        RETURNING id, owner_user_id, canonical_url, source_type, source_key, title, description, image_url, metadata, first_seen_at, last_seen_at, created_at, updated_at
      `, [
        ownerId,
        sourceResult.canonicalUrl,
        sourceResult.sourceType,
        sourceResult.sourceKey,
        sourceResult.title,
        sourceResult.description,
        sourceResult.imageUrl,
        JSON.stringify(sourceResult.metadata || {}),
      ]);

      const product = productRows[0] || productRows.rows?.[0];
      if (!product) throw new Error('Produit recherché non enregistré.');

      await conn.query(`
        INSERT INTO research_observations
          (owner_user_id, research_product_id, source_type, observed_at, price, currency, availability, source_reported_at, source_url, metadata, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb, NOW())
      `, [
        ownerId,
        product.id,
        sourceResult.sourceType,
        sourceResult.observedAt || new Date(),
        sourceResult.price,
        sourceResult.currency,
        sourceResult.availability || 'unknown',
        sourceResult.reportedAt,
        sourceResult.originalUrl,
        JSON.stringify(sourceResult.metadata || {}),
      ]);
      await conn.commit();
      return product;
    } catch (error) {
      await conn.rollback();
      throw error;
    } finally {
      conn.release();
    }
  },

  async findById(ownerUserId, productId) {
    const conn = await getConnection();
    try {
      const [rows] = await conn.query(`
        SELECT rp.*,
          EXISTS (
            SELECT 1 FROM saved_research_products srp
            WHERE srp.owner_user_id = $1 AND srp.research_product_id = rp.id
          ) AS saved
        FROM research_products rp
        WHERE rp.owner_user_id = $1 AND rp.id = $2
        LIMIT 1
      `, [numericId(ownerUserId), numericId(productId)]);
      return rows[0] || null;
    } finally {
      conn.release();
    }
  },

  async list(ownerUserId, { q = '', sourceType = '', limit = 30, cursor = null } = {}) {
    const conn = await getConnection();
    try {
      const safeLimit = Math.min(100, Math.max(1, Number(limit) || 30));
      const params = [numericId(ownerUserId)];
      let conditions = 'rp.owner_user_id = $1';
      if (q.trim()) {
        params.push(`%${q.trim().toLowerCase()}%`);
        conditions += ` AND LOWER(COALESCE(rp.title, '') || ' ' || COALESCE(rp.canonical_url, '')) LIKE $${params.length}`;
      }
      if (sourceType) {
        params.push(sourceType);
        conditions += ` AND rp.source_type = $${params.length}`;
      }
      if (cursor) {
        params.push(cursor);
        conditions += ` AND rp.id < $${params.length}`;
      }
      params.push(safeLimit + 1);
      const [rows] = await conn.query(`
        SELECT rp.*,
          EXISTS (
            SELECT 1 FROM saved_research_products srp
            WHERE srp.owner_user_id = $1 AND srp.research_product_id = rp.id
          ) AS saved
        FROM research_products rp
        WHERE ${conditions}
        ORDER BY rp.last_seen_at DESC, rp.id DESC
        LIMIT $${params.length}
      `, params);
      const hasMore = rows.length > safeLimit;
      const items = hasMore ? rows.slice(0, safeLimit) : rows;
      return { items, nextCursor: hasMore ? String(items[items.length - 1].id) : null };
    } finally {
      conn.release();
    }
  },

  async observations(ownerUserId, productId, { limit = 50, cursor = null } = {}) {
    const conn = await getConnection();
    try {
      const ownerId = numericId(ownerUserId);
      const productIdNumber = numericId(productId);
      if (!ownerId || !productIdNumber) return { items: [], nextCursor: null };
      const safeLimit = Math.min(200, Math.max(1, Number(limit) || 50));
      const params = [ownerId, productIdNumber];
      let cursorCondition = '';
      if (cursor) {
        params.push(cursor);
        cursorCondition = ` AND id < $${params.length}`;
      }
      params.push(safeLimit + 1);
      const [rows] = await conn.query(`
        SELECT id, research_product_id, source_type, observed_at, price, currency, availability,
               source_reported_at, source_url, metadata, created_at
        FROM research_observations
        WHERE owner_user_id = $1 AND research_product_id = $2${cursorCondition}
        ORDER BY observed_at DESC, id DESC
        LIMIT $${params.length}
      `, params);
      const hasMore = rows.length > safeLimit;
      const items = hasMore ? rows.slice(0, safeLimit) : rows;
      return { items, nextCursor: hasMore ? String(items[items.length - 1].id) : null };
    } finally {
      conn.release();
    }
  },
};

module.exports = ResearchProduct;