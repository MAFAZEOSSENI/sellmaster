const { pool } = require('../config/database');

async function createTables() {
  let conn;
  try {
    conn = await pool.getConnection();
    
    // Table produits
    await conn.query(`
      CREATE TABLE IF NOT EXISTS products (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        price DECIMAL(10,2) NOT NULL,
        stock INT DEFAULT 0,
        image_url VARCHAR(500),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Table commandes
    await conn.query(`
      CREATE TABLE IF NOT EXISTS orders (
        id INT AUTO_INCREMENT PRIMARY KEY,
        client_name VARCHAR(255) NOT NULL,
        client_phone VARCHAR(50) NOT NULL,
        client_address TEXT NOT NULL,
        status VARCHAR(20) DEFAULT 'dashboard',
        total_amount DECIMAL(10,2) NOT NULL,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Table order_items (AJOUT CRITIQUE)
    await conn.query(`
      CREATE TABLE IF NOT EXISTS order_items (
        id INT AUTO_INCREMENT PRIMARY KEY,
        order_id INT NOT NULL,
        product_id INT NOT NULL,
        product_name VARCHAR(255) NOT NULL,
        unit_price DECIMAL(10,2) NOT NULL,
        quantity INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
        FOREIGN KEY (product_id) REFERENCES products(id)
      )
    `);

    console.log('✅ Tables créées avec succès!');
  } catch (error) {
    console.error('❌ Erreur création tables:', error);
  } finally {
    if (conn) conn.release();
  }
}

module.exports = createTables;