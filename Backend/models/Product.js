const { pool } = require('../config/database');

const Product = {
  // ✅ CORRECTION : findAll avec filtre user_id
  async findAll(userId = null) {
    let conn;
    try {
      conn = await pool.getConnection();
      
      let query = `
        SELECT * FROM products 
      `;
      let params = [];
      
      // ✅ FILTRER PAR USER_ID SI FOURNI
      if (userId) {
        query += ` WHERE user_id = ? `;
        params.push(userId);
      }
      
      query += ` ORDER BY created_at DESC `;
      
      const rows = await conn.query(query, params);
      console.log(`🛍️ ${rows.length} produits trouvés${userId ? ` pour user ${userId}` : ''}`);
      return rows;
    } finally {
      if (conn) conn.release();
    }
  },

  // ✅ CORRECTION : findById avec vérification user_id
  async findById(id, userId = null) {
    let conn;
    try {
      conn = await pool.getConnection();
      
      let query = `
        SELECT * FROM products WHERE id = ?
      `;
      let params = [id];
      
      // ✅ VÉRIFICATION USER_ID SI FOURNI
      if (userId) {
        query += ` AND user_id = ?`;
        params.push(userId);
      }
      
      const rows = await conn.query(query, params);
      return rows[0];
    } finally {
      if (conn) conn.release();
    }
  },

  // ✅ CORRECTION : create avec user_id
  async create(productData, userId = null) {
    let conn;
    try {
      conn = await pool.getConnection();
      
      console.log('🛍️ Création produit avec user_id:', userId);
      
      // ✅ AJOUTER USER_ID DANS L'INSERTION
      const result = await conn.query(`
        INSERT INTO products (name, description, price, stock, image_url, user_id) 
        VALUES (?, ?, ?, ?, ?, ?)
      `, [
        productData.name,
        productData.description || '',
        productData.price,
        productData.stock,
        productData.image_url || null,
        userId // 🆕 USER_ID AJOUTÉ
      ]);
      
      console.log('✅ Produit créé avec ID:', result.insertId);
      
      // Retourner le produit créé
      const [newProduct] = await conn.query('SELECT * FROM products WHERE id = ?', [result.insertId]);
      return newProduct;
    } finally {
      if (conn) conn.release();
    }
  },

  // ✅ CORRECTION : update avec vérification user_id
  async update(id, productData, userId = null) {
    let conn;
    try {
      conn = await pool.getConnection();
      
      let query = `
        UPDATE products 
        SET name = ?, description = ?, price = ?, stock = ?, image_url = ?
        WHERE id = ?
      `;
      let params = [
        productData.name,
        productData.description,
        productData.price,
        productData.stock,
        productData.image_url,
        id
      ];
      
      // ✅ VÉRIFICATION USER_ID SI FOURNI
      if (userId) {
        query += ` AND user_id = ?`;
        params.push(userId);
      }
      
      await conn.query(query, params);
      
      console.log('✅ Produit mis à jour, ID:', id);
      return await this.findById(id, userId);
    } finally {
      if (conn) conn.release();
    }
  },

  // ✅ CORRECTION : delete avec vérification user_id
  async delete(id, userId = null) {
    let conn;
    try {
      conn = await pool.getConnection();
      
      let query = `DELETE FROM products WHERE id = ?`;
      let params = [id];
      
      // ✅ VÉRIFICATION USER_ID SI FOURNI
      if (userId) {
        query += ` AND user_id = ?`;
        params.push(userId);
      }
      
      const result = await conn.query(query, params);
      
      const isDeleted = result.affectedRows > 0;
      console.log(`✅ Produit ${id} ${isDeleted ? 'supprimé' : 'non trouvé ou accès non autorisé'}`);
      
      return isDeleted;
    } finally {
      if (conn) conn.release();
    }
  },

  // ✅ NOUVELLE MÉTHODE : Produits par utilisateur
  async findByUserId(userId) {
    let conn;
    try {
      conn = await pool.getConnection();
      const rows = await conn.query(
        'SELECT * FROM products WHERE user_id = ? ORDER BY created_at DESC',
        [userId]
      );
      console.log(`🛍️ ${rows.length} produits trouvés pour user ${userId}`);
      return rows;
    } finally {
      if (conn) conn.release();
    }
  }
};

module.exports = Product;