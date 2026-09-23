const { pool } = require('../config/database');

async function ensureColumnExists(conn, tableName, columnName, columnSql) {
  const { rows } = await conn.query(`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_schema = current_schema()
      AND table_name = $1
  `, [tableName]);

  const columnNames = new Set(rows.map((row) => row.column_name));
  if (!columnNames.has(columnName)) {
    await conn.query(`ALTER TABLE "${tableName}" ${columnSql}`);
  }
}

async function createTables() {
  let conn;
  try {
    conn = await pool.connect();

    await conn.query(`
      CREATE TABLE IF NOT EXISTS "products" (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        price DECIMAL(10,2) NOT NULL,
        stock INT DEFAULT 0,
        image_url VARCHAR(500),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS "orders" (
        id SERIAL PRIMARY KEY,
        client_name VARCHAR(255) NOT NULL,
        client_phone VARCHAR(50) NOT NULL,
        client_address TEXT NOT NULL,
        status VARCHAR(20) DEFAULT 'dashboard',
        total_amount DECIMAL(10,2) NOT NULL,
        notes TEXT,
        user_id INT NULL,
        created_by INT NULL,
        assigned_to INT NULL,
        assigned_by INT NULL,
        assigned_at TIMESTAMP NULL,
        assignment_note TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await ensureColumnExists(conn, 'orders', 'user_id', 'ADD COLUMN "user_id" INT NULL');
    await ensureColumnExists(conn, 'orders', 'created_by', 'ADD COLUMN "created_by" INT NULL');
    await ensureColumnExists(conn, 'orders', 'assigned_to', 'ADD COLUMN "assigned_to" INT NULL');
    await ensureColumnExists(conn, 'orders', 'assigned_by', 'ADD COLUMN "assigned_by" INT NULL');
    await ensureColumnExists(conn, 'orders', 'assigned_at', 'ADD COLUMN "assigned_at" TIMESTAMP NULL');
    await ensureColumnExists(conn, 'orders', 'assignment_note', 'ADD COLUMN "assignment_note" TEXT');

    await conn.query(`
      CREATE TABLE IF NOT EXISTS "order_items" (
        id SERIAL PRIMARY KEY,
        order_id INT NOT NULL,
        product_id INT NOT NULL,
        product_name VARCHAR(255) NOT NULL,
        unit_price DECIMAL(10,2) NOT NULL,
        quantity INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_order_items_order FOREIGN KEY (order_id) REFERENCES "orders"(id) ON DELETE CASCADE,
        CONSTRAINT fk_order_items_product FOREIGN KEY (product_id) REFERENCES "products"(id)
      )
    `);

    await ensureColumnExists(conn, 'app_users', 'full_name', 'ADD COLUMN "full_name" VARCHAR(255) NULL');

    await conn.query(`
      CREATE TABLE IF NOT EXISTS "team_memberships" (
        id SERIAL PRIMARY KEY,
        owner_user_id INT NOT NULL,
        member_user_id INT NOT NULL,
        role_name VARCHAR(50) NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'rejected')),
        invited_by INT NULL,
        nickname VARCHAR(100) NULL,
        is_working BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        confirmed_at TIMESTAMP NULL,
        UNIQUE (owner_user_id, member_user_id, role_name)
      )
    `);

    await ensureColumnExists(conn, 'team_memberships', 'nickname', 'ADD COLUMN "nickname" VARCHAR(100) NULL');
    await ensureColumnExists(conn, 'team_memberships', 'is_working', 'ADD COLUMN "is_working" BOOLEAN NOT NULL DEFAULT FALSE');

    await conn.query(`
      CREATE TABLE IF NOT EXISTS "roles" (
        id SERIAL PRIMARY KEY,
        name VARCHAR(50) NOT NULL UNIQUE,
        description VARCHAR(255) NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS "permissions" (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL UNIQUE,
        description VARCHAR(255) NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS "user_roles" (
        user_id INT NOT NULL,
        role_id INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (user_id, role_id)
      )
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS "role_permissions" (
        role_id INT NOT NULL,
        permission_id INT NOT NULL,
        PRIMARY KEY (role_id, permission_id)
      )
    `);

    const roles = [
      ['owner', 'Accès complet à l’organisation'],
      ['manager', 'Gestion opérationnelle'],
      ['closer', 'Gestion du closing'],
      ['courier', 'Gestion des livraisons']
    ];
    for (const [name, description] of roles) {
      await conn.query(`
        INSERT INTO "roles" (name, description)
        VALUES ($1, $2)
        ON CONFLICT (name) DO NOTHING
      `, [name, description]);
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
      await conn.query(`
        INSERT INTO "permissions" (name, description)
        VALUES ($1, $2)
        ON CONFLICT (name) DO NOTHING
      `, [name, description]);
    }

    await conn.query(`
      INSERT INTO "role_permissions" (role_id, permission_id)
      SELECT r.id, p.id
      FROM "roles" r
      CROSS JOIN "permissions" p
      WHERE r.name = 'owner'
      ON CONFLICT DO NOTHING
    `);

    await conn.query(`
      INSERT INTO "user_roles" (user_id, role_id)
      SELECT u.id, r.id
      FROM app_users u
      JOIN "roles" r ON r.name = 'owner'
      ON CONFLICT DO NOTHING
    `);

    console.log('✅ Tables créées avec succès!');
  } catch (error) {
    console.error('❌ Erreur création tables:', error);
  } finally {
    if (conn) conn.release();
  }
}

module.exports = createTables;