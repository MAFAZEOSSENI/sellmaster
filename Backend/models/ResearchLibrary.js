const { getConnection } = require('../config/database');

function numericId(value) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

const ResearchLibrary = {
  async setSaved(ownerUserId, productId, saved) {
    const conn = await getConnection();
    const ownerId = numericId(ownerUserId);
    const product = numericId(productId);
    if (!ownerId || !product) throw new Error('Identifiant invalide.');
    try {
      if (saved) {
        await conn.query(`
          INSERT INTO saved_research_products (owner_user_id, research_product_id, created_at)
          SELECT $1, $2, NOW()
          WHERE EXISTS (
            SELECT 1 FROM research_products rp
            WHERE rp.id = $2 AND rp.owner_user_id = $1
          )
          ON CONFLICT (owner_user_id, research_product_id) DO NOTHING
        `, [ownerId, product]);
      } else {
        await conn.query(`
          DELETE FROM saved_research_products
          WHERE owner_user_id = $1 AND research_product_id = $2
        `, [ownerId, product]);
      }
      const [rows] = await conn.query(`
        SELECT EXISTS (
          SELECT 1 FROM saved_research_products
          WHERE owner_user_id = $1 AND research_product_id = $2
        ) AS saved
      `, [ownerId, product]);
      return Boolean(rows[0]?.saved);
    } finally {
      conn.release();
    }
  },

  async listSaved(ownerUserId, { limit = 30, cursor = null } = {}) {
    const conn = await getConnection();
    try {
      const safeLimit = Math.min(100, Math.max(1, Number(limit) || 30));
      const params = [numericId(ownerUserId)];
      let cursorCondition = '';
      if (cursor) {
        params.push(cursor);
        cursorCondition = `AND rp.id < $${params.length}`;
      }
      params.push(safeLimit + 1);
      const [rows] = await conn.query(`
        SELECT rp.*
        FROM saved_research_products srp
        JOIN research_products rp ON rp.id = srp.research_product_id
        WHERE srp.owner_user_id = $1 ${cursorCondition}
        ORDER BY srp.created_at DESC, rp.id DESC
        LIMIT $${params.length}
      `, params);
      const hasMore = rows.length > safeLimit;
      const items = hasMore ? rows.slice(0, safeLimit) : rows;
      return { items, nextCursor: hasMore ? String(items[items.length - 1].id) : null };
    } finally {
      conn.release();
    }
  },

  async listCollections(ownerUserId) {
    const conn = await getConnection();
    try {
      const [rows] = await conn.query(`
        SELECT c.*, COUNT(cop.research_product_id)::int AS product_count
        FROM research_collections c
        LEFT JOIN research_collection_products cop ON cop.collection_id = c.id
        WHERE c.owner_user_id = $1
        GROUP BY c.id
        ORDER BY c.updated_at DESC
      `, [numericId(ownerUserId)]);
      return rows;
    } finally {
      conn.release();
    }
  },

  async createCollection(ownerUserId, name, description = null) {
    const conn = await getConnection();
    try {
      const [rows] = await conn.query(`
        INSERT INTO research_collections (owner_user_id, name, description, created_at, updated_at)
        VALUES ($1, $2, $3, NOW(), NOW())
        RETURNING *
      `, [numericId(ownerUserId), name, description]);
      return rows[0] || null;
    } finally {
      conn.release();
    }
  },

  async updateCollection(ownerUserId, collectionId, name, description) {
    const conn = await getConnection();
    try {
      const [rows] = await conn.query(`
        UPDATE research_collections
        SET name = COALESCE($3, name),
            description = $4,
            updated_at = NOW()
        WHERE owner_user_id = $1 AND id = $2
        RETURNING *
      `, [numericId(ownerUserId), numericId(collectionId), name, description]);
      return rows[0] || null;
    } finally {
      conn.release();
    }
  },

  async setCollectionProduct(ownerUserId, collectionId, productId, present) {
    const conn = await getConnection();
    const ownerId = numericId(ownerUserId);
    const collection = numericId(collectionId);
    const product = numericId(productId);
    if (!ownerId || !collection || !product) throw new Error('Identifiant invalide.');
    try {
      await conn.beginTransaction();
      const [ownedRows] = await conn.query(`
        SELECT
          EXISTS (SELECT 1 FROM research_collections WHERE id = $2 AND owner_user_id = $1) AS collection_owned,
          EXISTS (SELECT 1 FROM research_products WHERE id = $3 AND owner_user_id = $1) AS product_owned
      `, [ownerId, collection, product]);
      if (!ownedRows[0]?.collection_owned || !ownedRows[0]?.product_owned) {
        const error = new Error('Collection ou produit introuvable.');
        error.statusCode = 404;
        throw error;
      }
      if (present) {
        await conn.query(`
          INSERT INTO research_collection_products (owner_user_id, collection_id, research_product_id, created_at)
          VALUES ($1, $2, $3, NOW())
          ON CONFLICT (collection_id, research_product_id) DO NOTHING
        `, [ownerId, collection, product]);
      } else {
        await conn.query(`
          DELETE FROM research_collection_products
          WHERE owner_user_id = $1 AND collection_id = $2 AND research_product_id = $3
        `, [ownerId, collection, product]);
      }
      await conn.query('UPDATE research_collections SET updated_at = NOW() WHERE id = $1 AND owner_user_id = $2', [collection, ownerId]);
      await conn.commit();
      return true;
    } catch (error) {
      await conn.rollback();
      throw error;
    } finally {
      conn.release();
    }
  },

  async deleteCollection(ownerUserId, collectionId) {
    const conn = await getConnection();
    try {
      const [rows] = await conn.query(`
        DELETE FROM research_collections
        WHERE owner_user_id = $1 AND id = $2
        RETURNING id
      `, [numericId(ownerUserId), numericId(collectionId)]);
      return rows.length > 0;
    } finally {
      conn.release();
    }
  },

  async listNotes(ownerUserId, productId) {
    const conn = await getConnection();
    try {
      const [rows] = await conn.query(`
        SELECT rn.* FROM research_notes rn
        JOIN research_products rp ON rp.id = rn.research_product_id
        WHERE rn.owner_user_id = $1 AND rn.research_product_id = $2 AND rp.owner_user_id = $1
        ORDER BY rn.updated_at DESC
      `, [numericId(ownerUserId), numericId(productId)]);
      return rows;
    } finally {
      conn.release();
    }
  },

  async createNote(ownerUserId, productId, body) {
    const conn = await getConnection();
    try {
      const [rows] = await conn.query(`
        INSERT INTO research_notes (owner_user_id, research_product_id, body, created_at, updated_at)
        SELECT $1, $2, $3, NOW(), NOW()
        WHERE EXISTS (
          SELECT 1 FROM research_products rp
          WHERE rp.id = $2 AND rp.owner_user_id = $1
        )
        RETURNING *
      `, [numericId(ownerUserId), numericId(productId), body]);
      return rows[0] || null;
    } finally {
      conn.release();
    }
  },

  async updateNote(ownerUserId, noteId, body) {
    const conn = await getConnection();
    try {
      const [rows] = await conn.query(`
        UPDATE research_notes
        SET body = $3, updated_at = NOW()
        WHERE owner_user_id = $1 AND id = $2
        RETURNING *
      `, [numericId(ownerUserId), numericId(noteId), body]);
      return rows[0] || null;
    } finally {
      conn.release();
    }
  },

  async deleteNote(ownerUserId, noteId) {
    const conn = await getConnection();
    try {
      const [rows] = await conn.query(`
        DELETE FROM research_notes
        WHERE owner_user_id = $1 AND id = $2
        RETURNING id
      `, [numericId(ownerUserId), numericId(noteId)]);
      return rows.length > 0;
    } finally {
      conn.release();
    }
  },

  async getCollection(ownerUserId, collectionId) {
    const conn = await getConnection();
    try {
      const [rows] = await conn.query(`
        SELECT c.*, COUNT(cop.research_product_id)::int AS product_count
        FROM research_collections c
        LEFT JOIN research_collection_products cop ON cop.collection_id = c.id
        WHERE c.owner_user_id = $1 AND c.id = $2
        GROUP BY c.id
      `, [numericId(ownerUserId), numericId(collectionId)]);
      return rows[0] || null;
    } finally {
      conn.release();
    }
  },

  async listCollectionProducts(ownerUserId, collectionId) {
    const conn = await getConnection();
    try {
      const [rows] = await conn.query(`
        SELECT rp.*
        FROM research_collection_products cop
        JOIN research_products rp ON rp.id = cop.research_product_id
        WHERE cop.owner_user_id = $1 AND cop.collection_id = $2 AND rp.owner_user_id = $1
        ORDER BY cop.created_at DESC, rp.id DESC
      `, [numericId(ownerUserId), numericId(collectionId)]);
      return rows;
    } finally {
      conn.release();
    }
  },
};

module.exports = ResearchLibrary;