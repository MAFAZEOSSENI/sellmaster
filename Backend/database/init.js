const { pool, queryWithRetry } = require('../config/database');

async function ensureColumnExists(conn, tableName, columnName, columnSql) {
  const [columns] = await conn.query(`SHOW COLUMNS FROM ${tableName}`);
  const columnNames = new Set(columns.map((column) => column.Field));

  if (!columnNames.has(columnName)) {
    await conn.query(`ALTER TABLE ${tableName} ${columnSql}`);
  }
}

async function ensureOrderAssignmentColumns(conn) {
  const columns = await conn.query('SHOW COLUMNS FROM orders');
  const columnNames = new Set(columns[0].map((column) => column.Field));

  const migrations = [
    { name: 'user_id', sql: 'ADD COLUMN user_id INT NULL AFTER notes' },
    { name: 'assigned_to', sql: 'ADD COLUMN assigned_to INT NULL AFTER user_id' },
    { name: 'assigned_by', sql: 'ADD COLUMN assigned_by INT NULL AFTER assigned_to' },
    { name: 'assigned_at', sql: 'ADD COLUMN assigned_at TIMESTAMP NULL AFTER assigned_by' },
    { name: 'assignment_note', sql: 'ADD COLUMN assignment_note TEXT AFTER assigned_at' },
  ];

  for (const migration of migrations) {
    if (!columnNames.has(migration.name)) {
      await conn.query(`ALTER TABLE orders ${migration.sql}`);
    }
  }
}

async function createTables() {
  let conn;
  try {
    conn = await pool.getConnection();

    await queryWithRetry(conn, `
      CREATE TABLE IF NOT EXISTS orders (
        id INT AUTO_INCREMENT PRIMARY KEY,
        client_name VARCHAR(255) NOT NULL,
        client_phone VARCHAR(50) NOT NULL,
        client_address TEXT NOT NULL,
        status VARCHAR(20) DEFAULT 'dashboard',
        total_amount DECIMAL(10,2) NOT NULL,
        notes TEXT,
        user_id INT NULL,
        assigned_to INT NULL,
        assigned_by INT NULL,
        assigned_at TIMESTAMP NULL,
        assignment_note TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await ensureOrderAssignmentColumns(conn);
    
    // Table produits
    await queryWithRetry(conn, `
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
    await queryWithRetry(conn, `
      CREATE TABLE IF NOT EXISTS orders (
        id INT AUTO_INCREMENT PRIMARY KEY,
        client_name VARCHAR(255) NOT NULL,
        client_phone VARCHAR(50) NOT NULL,
        client_address TEXT NOT NULL,
        status VARCHAR(20) DEFAULT 'dashboard',
        total_amount DECIMAL(10,2) NOT NULL,
        notes TEXT,
        user_id INT NULL,
        assigned_to INT NULL,
        assigned_by INT NULL,
        assigned_at TIMESTAMP NULL,
        assignment_note TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await ensureColumnExists(conn, 'orders', 'user_id', 'ADD COLUMN user_id INT NULL AFTER notes');
    await ensureColumnExists(conn, 'orders', 'assigned_to', 'ADD COLUMN assigned_to INT NULL AFTER user_id');
    await ensureColumnExists(conn, 'orders', 'assigned_by', 'ADD COLUMN assigned_by INT NULL AFTER assigned_to');
    await ensureColumnExists(conn, 'orders', 'assigned_at', 'ADD COLUMN assigned_at TIMESTAMP NULL AFTER assigned_by');
    await ensureColumnExists(conn, 'orders', 'assignment_note', 'ADD COLUMN assignment_note TEXT AFTER assigned_at');

    // Table order_items (AJOUT CRITIQUE)
    await queryWithRetry(conn, `
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

    await ensureColumnExists(conn, 'app_users', 'full_name', 'ADD COLUMN full_name VARCHAR(255) NULL AFTER email');

    await queryWithRetry(conn, `
      CREATE TABLE IF NOT EXISTS team_memberships (
        id INT AUTO_INCREMENT PRIMARY KEY,
        owner_user_id INT NOT NULL,
        member_user_id INT NOT NULL,
        role_name VARCHAR(50) NOT NULL,
        status ENUM('pending', 'active', 'rejected') NOT NULL DEFAULT 'pending',
        invited_by INT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        confirmed_at TIMESTAMP NULL,
        UNIQUE KEY unique_team_membership (owner_user_id, member_user_id, role_name),
        INDEX idx_team_memberships_owner (owner_user_id),
        INDEX idx_team_memberships_member (member_user_id),
        INDEX idx_team_memberships_status (status)
      )
    `);

    // RBAC: tables séparées pour préserver les utilisateurs et JWT existants.
    await queryWithRetry(conn, `
      CREATE TABLE IF NOT EXISTS roles (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(50) NOT NULL UNIQUE,
        description VARCHAR(255) NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await queryWithRetry(conn, `
      CREATE TABLE IF NOT EXISTS permissions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL UNIQUE,
        description VARCHAR(255) NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await queryWithRetry(conn, `
      CREATE TABLE IF NOT EXISTS user_roles (
        user_id INT NOT NULL,
        role_id INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (user_id, role_id),
        INDEX idx_user_roles_role (role_id)
      )
    `);

    await queryWithRetry(conn, `
      CREATE TABLE IF NOT EXISTS role_permissions (
        role_id INT NOT NULL,
        permission_id INT NOT NULL,
        PRIMARY KEY (role_id, permission_id),
        INDEX idx_role_permissions_permission (permission_id)
      )
    `);

    const roles = [
      ['owner', 'Accès complet à l’organisation'],
      ['manager', 'Gestion opérationnelle'],
      ['closer', 'Gestion du closing'],
      ['courier', 'Gestion des livraisons']
    ];
    for (const [name, description] of roles) {
      await queryWithRetry(conn, 'INSERT IGNORE INTO roles (name, description) VALUES (?, ?)', [name, description]);
    }

    const permissions = [
      ['orders.view', 'Consulter les commandes'],
      ['orders.create', 'Créer des commandes'],
      ['orders.edit', 'Modifier les commandes'],
      ['orders.delete', 'Supprimer les commandes'],
      ['orders.assign', 'Attribuer les commandes'],
      ['products.view', 'Consulter les produits'],
      ['products.edit', 'Modifier les produits'],
      ['stock.view', 'Consulter le stock'],
      ['stock.edit', 'Modifier le stock'],
      ['customers.view', 'Consulter les clients'],
      ['finance.view', 'Consulter les finances'],
      ['finance.edit', 'Modifier les finances'],
      ['users.manage', 'Gérer les utilisateurs'],
      ['couriers.manage', 'Gérer les livreurs'],
      ['closers.manage', 'Gérer les closeurs'],
      ['analytics.view', 'Consulter les statistiques'],
      ['settings.manage', 'Gérer les paramètres']
    ];
    for (const [name, description] of permissions) {
      await queryWithRetry(conn, 'INSERT IGNORE INTO permissions (name, description) VALUES (?, ?)', [name, description]);
    }

    await queryWithRetry(conn, `
      INSERT IGNORE INTO role_permissions (role_id, permission_id)
      SELECT r.id, p.id FROM roles r CROSS JOIN permissions p WHERE r.name = 'owner'
    `);

    // Compatibilité: les comptes existants deviennent propriétaires jusqu'à attribution explicite.
    await queryWithRetry(conn, `
      INSERT IGNORE INTO user_roles (user_id, role_id)
      SELECT u.id, r.id
      FROM app_users u
      JOIN roles r ON r.name = 'owner'
    `);

    console.log('✅ Tables créées avec succès!');
  } catch (error) {
    console.error('❌ Erreur création tables:', error);
  } finally {
    if (conn) conn.release();
  }
}

module.exports = createTables;