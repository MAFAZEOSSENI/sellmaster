// models/Product.js - VERSION FINALE CORRIGÉE
const { pool } = require('../config/database');

// Fonction utilitaire pour convertir les résultats MariaDB
const convertRowToPlainObject = (row) => {
  if (!row) return null;
  
  const plain = {};
  for (const key in row) {
    const value = row[key];
    
    // Gérer les types spéciaux
    if (value instanceof Date) {
      plain[key] = value.toISOString();
    } else if (typeof value === 'bigint') {
      plain[key] = Number(value); // ou value.toString() si vous voulez une string
    } else if (value && typeof value === 'object') {
      // Cas spécial pour les buffers ou objets complexes
      plain[key] = value;
    } else {
      plain[key] = value;
    }
  }
  
  return plain;
};

const Product = {
  async findAll(userId = null) {
    let conn;
    try {
      conn = await pool.getConnection();
      
      console.log(`🔍 Product.findAll pour user: ${userId}`);
      
      let query = `SELECT * FROM products `;
      let params = [];
      
      if (userId) {
        query += ` WHERE user_id = ? `;
        params.push(userId);
      }
      
      query += ` ORDER BY created_at DESC `;
      
      console.log(`📝 Query: ${query}`);
      console.log(`📝 Params: ${JSON.stringify(params)}`);
      
      // Utiliser query() pour MariaDB
      const [rows] = await conn.query(query, params);
      
      console.log(`✅ ${rows.length} lignes retournées par la DB`);
      
      if (rows.length === 0) {
        console.log('📭 Aucun produit trouvé');
        return [];
      }
      
      // DEBUG: Afficher le premier élément pour voir sa structure
      if (rows.length > 0) {
        console.log('🔬 Premier élément brut:', rows[0]);
        console.log('🔬 Type:', typeof rows[0]);
        console.log('🔬 Clés:', Object.keys(rows[0]));
      }
      
      // Convertir chaque ligne
      const products = rows.map(row => convertRowToPlainObject(row));
      
      console.log(`🛍️  ${products.length} produits convertis`);
      return products;
      
    } catch (error) {
      console.error('❌ Erreur Product.findAll:', error);
      console.error('❌ Stack:', error.stack);
      throw error;
    } finally {
      if (conn) conn.release();
    }
  },

  async findById(id, userId = null) {
    let conn;
    try {
      conn = await pool.getConnection();
      
      let query = `SELECT * FROM products WHERE id = ?`;
      let params = [id];
      
      if (userId) {
        query += ` AND user_id = ?`;
        params.push(userId);
      }
      
      const [rows] = await conn.query(query, params);
      
      if (rows.length === 0) {
        console.log(`❌ Produit ${id} non trouvé pour user ${userId}`);
        return null;
      }
      
      return convertRowToPlainObject(rows[0]);
      
    } catch (error) {
      console.error('❌ Erreur Product.findById:', error);
      throw error;
    } finally {
      if (conn) conn.release();
    }
  },

  async create(productData, userId = null) {
    let conn;
    try {
      conn = await pool.getConnection();
      
      console.log('➕ Product.create appelé');
      console.log('📦 Données:', productData);
      console.log('👤 User ID:', userId);
      
      // Validation
      if (!userId) {
        throw new Error('User ID requis pour créer un produit');
      }
      
      if (!productData.name || !productData.price) {
        throw new Error('Nom et prix sont requis');
      }
      
      const [result] = await conn.query(`
        INSERT INTO products (
          user_id, 
          name, 
          description, 
          price, 
          stock, 
          image_url,
          created_at
        ) VALUES (?, ?, ?, ?, ?, ?, NOW())
      `, [
        userId,
        productData.name,
        productData.description || '',
        parseFloat(productData.price),
        parseInt(productData.stock || 0),
        productData.image_url || null
      ]);
      
      console.log(`✅ Insertion réussie, insertId: ${result.insertId}`);
      console.log(`✅ Rows affected: ${result.affectedRows}`);
      
      // Récupérer le produit créé
      const [products] = await conn.query(
        'SELECT * FROM products WHERE id = ?',
        [result.insertId]
      );
      const newProduct = products[0];
      
      if (!newProduct) {
        throw new Error('Produit créé mais non retrouvé');
      }
      
      const product = convertRowToPlainObject(newProduct);
      console.log('✅ Produit créé:', product);
      return product;
      
    } catch (error) {
      console.error('❌ Erreur Product.create:');
      console.error('❌ Message:', error.message);
      console.error('❌ Code:', error.code);
      console.error('❌ SQL State:', error.sqlState);
      console.error('❌ SQL Message:', error.sqlMessage);
      throw error;
    } finally {
      if (conn) conn.release();
    }
  },

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
        productData.description || '',
        parseFloat(productData.price),
        parseInt(productData.stock || 0),
        productData.image_url || null,
        id
      ];
      
      if (userId) {
        query += ` AND user_id = ?`;
        params.push(userId);
      }
      
      const [result] = await conn.query(query, params);
      
      if (result.affectedRows === 0) {
        throw new Error('Produit non trouvé ou non autorisé');
      }
      
      console.log(`✅ Produit ${id} mis à jour`);
      return await this.findById(id, userId);
      
    } catch (error) {
      console.error('❌ Erreur Product.update:', error);
      throw error;
    } finally {
      if (conn) conn.release();
    }
  },

  async delete(id, userId = null) {
    let conn;
    try {
      conn = await pool.getConnection();
      
      let query = `DELETE FROM products WHERE id = ?`;
      let params = [id];
      
      if (userId) {
        query += ` AND user_id = ?`;
        params.push(userId);
      }
      
      const [result] = await conn.query(query, params);
      
      const deleted = result.affectedRows > 0;
      console.log(`✅ Produit ${id} ${deleted ? 'supprimé' : 'non trouvé'}`);
      return deleted;
      
    } catch (error) {
      console.error('❌ Erreur Product.delete:', error);
      throw error;
    } finally {
      if (conn) conn.release();
    }
  },

  async findByUserId(userId) {
    let conn;
    try {
      conn = await pool.getConnection();
      
      console.log(`🔍 Recherche produits pour user ${userId}`);
      
      const [rows] = await conn.query(
        'SELECT * FROM products WHERE user_id = ? ORDER BY created_at DESC',
        [userId]
      );
      
      console.log(`✅ ${rows.length} produits trouvés`);
      
      return rows.map(row => convertRowToPlainObject(row));
      
    } catch (error) {
      console.error('❌ Erreur Product.findByUserId:', error);
      throw error;
    } finally {
      if (conn) conn.release();
    }
  }
};

module.exports = Product;
