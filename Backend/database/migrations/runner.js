const fs = require('node:fs');
const path = require('node:path');
const { pool } = require('../config/database');

const MIGRATIONS_DIRECTORY = __dirname;
const LOCK_NAMESPACE = 1475069231;

async function runMigrations(databasePool = pool) {
  const client = await databasePool.connect();
  let lockAcquired = false;
  let primaryError;
  let releaseError;

  try {
    const lockTimeoutMs = 30000;
    const pollIntervalMs = 200;
    const deadline = Date.now() + lockTimeoutMs;
    while (!lockAcquired) {
      const lockResult = await client.query('SELECT pg_try_advisory_lock($1, hashtext($2)) AS acquired', [LOCK_NAMESPACE, 'sellmaster-schema-migrations']);
      lockAcquired = lockResult.rows[0]?.acquired === true;
      if (lockAcquired) break;
      if (Date.now() >= deadline) {
        const error = new Error(`Timed out waiting for the PostgreSQL migration lock after ${lockTimeoutMs}ms.`);
        error.code = 'MIGRATION_LOCK_TIMEOUT';
        throw error;
      }
      await new Promise(resolve => setTimeout(resolve, Math.min(pollIntervalMs, Math.max(1, deadline - Date.now()))));
    }
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version VARCHAR(200) PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    const migrationFiles = fs.readdirSync(MIGRATIONS_DIRECTORY)
      .filter(file => /^\d+_[a-z0-9_-]+\.js$/i.test(file))
      .sort();

    for (const file of migrationFiles) {
      const version = file.slice(0, -3);
      const applied = await client.query('SELECT 1 FROM schema_migrations WHERE version = $1', [version]);
      if (applied.rowCount) continue;

      const migration = require(path.join(MIGRATIONS_DIRECTORY, file));
      if (typeof migration.up !== 'function') {
        throw new Error(`Migration ${version} must export an up(client) function.`);
      }

      await client.query('BEGIN');
      try {
        await client.query("SET LOCAL lock_timeout = '30s'");
        await migration.up(client);
        await client.query('INSERT INTO schema_migrations (version) VALUES ($1)', [version]);
        await client.query('COMMIT');
        console.log(`[DB migrations] Applied ${version}`);
      } catch (error) {
        try {
          await client.query('ROLLBACK');
        } catch (rollbackError) {
          error.rollbackError = rollbackError;
          releaseError = rollbackError;
        }
        throw error;
      }
    }
  } catch (error) {
    primaryError = error;
    throw error;
  } finally {
    let unlockError;
    try {
      if (lockAcquired) {
        const unlockResult = await client.query('SELECT pg_advisory_unlock($1, hashtext($2)) AS unlocked', [LOCK_NAMESPACE, 'sellmaster-schema-migrations']);
        if (unlockResult.rows[0]?.unlocked !== true) {
          throw new Error('PostgreSQL reported that the migration advisory lock was not held during unlock.');
        }
      }
    } catch (error) {
      unlockError = error;
      releaseError = error;
    } finally {
      client.release(releaseError);
    }

    if (unlockError) {
      if (primaryError) primaryError.unlockError = unlockError;
      else throw unlockError;
    }
  }
}

module.exports = runMigrations;