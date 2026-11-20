const { getConnection } = require('../../config/database');

async function recordAiUsage({ userId, projectId = null, operation, model, units = 1, metadata = {} }) {
  const conn = await getConnection();
  try {
    await conn.query(`
      INSERT INTO ai_usage (owner_user_id, project_id, operation, model, units, metadata_json, created_at)
      VALUES ($1, $2, $3, $4, $5, $6::jsonb, NOW())
    `, [Number(userId), projectId ? Number(projectId) : null, String(operation).slice(0, 50), String(model).slice(0, 150), Number(units) || 1, JSON.stringify(metadata || {})]);
  } finally {
    conn.release();
  }
}

async function countPageImageUsage(ownerId, pageId) {
  const conn = await getConnection();
  try {
    const [rows] = await conn.query(`
      SELECT COALESCE(SUM(units), 0)::int AS count
      FROM ai_usage
      WHERE owner_user_id = $1
        AND metadata_json->>'page_id' = $2
        AND operation = 'image.generate'
    `, [Number(ownerId), String(pageId)]);
    return Number(rows[0]?.count || 0);
  } finally {
    conn.release();
  }
}

module.exports = { recordAiUsage, countPageImageUsage };