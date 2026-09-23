const { Pool } = require('pg');

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL est requis pour la connexion PostgreSQL/Supabase.');
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 20000,
  ssl: process.env.DATABASE_URL.includes('supabase') || process.env.DATABASE_URL.includes('supavisor')
    ? { rejectUnauthorized: false }
    : false,
});

function normalizePlaceholders(sql, params = []) {
  let normalizedSql = String(sql || '');
  normalizedSql = normalizedSql.replace(/INSERT\s+IGNORE\s+INTO/i, 'INSERT INTO');
  normalizedSql = normalizedSql.replace(/\bSHOW\s+COLUMNS\s+FROM\s+([`"\w.]+)/i, (match, tableName) => {
    const safeName = String(tableName).replace(/`/g, '').replace(/^"|"$/g, '');
    return `SELECT column_name AS "Field", data_type AS "Type" FROM information_schema.columns WHERE table_schema = current_schema() AND table_name = '${safeName}'`;
  });

  const normalizedParams = Array.isArray(params) ? params : [params];
  let placeholderIndex = 0;
  normalizedSql = normalizedSql.replace(/\?/g, () => {
    placeholderIndex += 1;
    return `$${placeholderIndex}`;
  });

  return { sql: normalizedSql, params: normalizedParams };
}

function buildInsertHeader(result) {
  const rows = Array.isArray(result && result.rows) ? result.rows : [];
  const rowCount = Number(result && result.rowCount ? result.rowCount : rows.length || 0);
  const firstRow = rows[0] || {};

  return {
    insertId: firstRow.id ?? null,
    affectedRows: rowCount,
    rowCount,
    command: result && result.command ? result.command : 'INSERT',
    rows,
  };
}

async function executePgQuery(client, sql, params = []) {
  const { sql: normalizedSql, params: normalizedParams } = normalizePlaceholders(sql, params);
  const result = await client.query(normalizedSql, normalizedParams);

  const isWrite = /^(INSERT|UPDATE|DELETE|CREATE|ALTER|DROP|TRUNCATE)\b/i.test(String(sql || '').trim());
  if (isWrite && !/^SELECT\b/i.test(String(sql || '').trim())) {
    return [buildInsertHeader(result), result];
  }

  return [result.rows, result];
}

async function getConnection() {
  const client = await pool.connect();
  const wrapped = {
    ...client,
    query: (sql, params = []) => executePgQuery(client, sql, params),
    release: () => client.release(),
    beginTransaction: async () => {
      await client.query('BEGIN');
    },
    commit: async () => {
      await client.query('COMMIT');
    },
    rollback: async () => {
      await client.query('ROLLBACK');
    },
  };

  return wrapped;
}

console.log('📊 Database config initialized with PostgreSQL Supabase pooler (Supavisor/TLS enabled).');

module.exports = { pool, getConnection, query: async (sql, params = []) => {
  const client = await pool.connect();
  try {
    return executePgQuery(client, sql, params);
  } finally {
    client.release();
  }
} };