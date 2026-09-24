require('dotenv').config();

const mysql = require('mysql2/promise');
const { Pool } = require('pg');

const required = ['DATABASE_URL', 'MYSQLHOST', 'MYSQLUSER', 'MYSQLPASSWORD', 'MYSQLDATABASE'];
const missing = required.filter((name) => !process.env[name]);
if (missing.length > 0) {
  throw new Error(`Variables manquantes pour la migration: ${missing.join(', ')}`);
}

const mysqlPool = mysql.createPool({
  host: process.env.MYSQLHOST,
  port: Number(process.env.MYSQLPORT || 3306),
  user: process.env.MYSQLUSER,
  password: process.env.MYSQLPASSWORD,
  database: process.env.MYSQLDATABASE,
  waitForConnections: true,
  connectionLimit: 2,
});

const postgresPool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL.includes('supabase') || process.env.DATABASE_URL.includes('supavisor')
    ? { rejectUnauthorized: false }
    : false,
});

const tables = [
  'app_users',
  'products',
  'orders',
  'order_items',
  'team_memberships',
  'roles',
  'permissions',
  'user_roles',
  'role_permissions',
  'licenses',
  'shopify_configs',
];

function quoteIdentifier(identifier) {
  return `"${String(identifier).replace(/"/g, '""')}"`;
}

async function tableColumns(mysqlConnection, tableName) {
  const [rows] = await mysqlConnection.query(`SHOW COLUMNS FROM ${quoteIdentifier(tableName)}`);
  return rows.map((row) => row.Field);
}

async function migrateTable(mysqlConnection, postgresClient, tableName) {
  const columns = await tableColumns(mysqlConnection, tableName);
  if (columns.length === 0) return;

  const [rows] = await mysqlConnection.query(`SELECT ${columns.map(quoteIdentifier).join(', ')} FROM ${quoteIdentifier(tableName)}`);
  if (rows.length === 0) return;

  const columnSql = columns.map(quoteIdentifier).join(', ');
  const placeholders = columns.map((_, index) => `$${index + 1}`).join(', ');
  const insertSql = `INSERT INTO ${quoteIdentifier(tableName)} (${columnSql}) VALUES (${placeholders}) ON CONFLICT DO NOTHING`;

  for (const row of rows) {
    await postgresClient.query(insertSql, columns.map((column) => row[column]));
  }

  const idColumn = columns.includes('id') ? 'id' : null;
  if (idColumn) {
    const sequenceName = `${tableName}_id_seq`;
    await postgresClient.query(
      `SELECT setval($1, COALESCE((SELECT MAX(${quoteIdentifier(idColumn)}) FROM ${quoteIdentifier(tableName)}), 1), true)`,
      [`public.${sequenceName}`]
    );
  }

  console.log(`✅ ${tableName}: ${rows.length} lignes traitées`);
}

async function main() {
  const mysqlConnection = await mysqlPool.getConnection();
  const postgresClient = await postgresPool.connect();

  try {
    await postgresClient.query('BEGIN');
    for (const tableName of tables) {
      await migrateTable(mysqlConnection, postgresClient, tableName);
    }
    await postgresClient.query('COMMIT');
    console.log('✅ Migration MySQL → PostgreSQL terminée');
  } catch (error) {
    await postgresClient.query('ROLLBACK');
    console.error('❌ Migration annulée:', error.message);
    process.exitCode = 1;
  } finally {
    mysqlConnection.release();
    await mysqlPool.end();
    postgresClient.release();
    await postgresPool.end();
  }
}

main();