const { getConnection } = require('../config/database');

class Notification {
  static async getUnreadCount(userId) {
    const conn = await getConnection();
    try {
      const [rows] = await conn.query(
        'SELECT COUNT(*)::int AS count FROM notifications WHERE user_id = ? AND is_read = false',
        [userId]
      );
      return Number(rows[0]?.count || 0);
    } finally {
      conn.release();
    }
  }

  static async findByUser(userId, { limit = 50, unreadOnly = false } = {}) {
    const conn = await getConnection();
    try {
      let query = 'SELECT * FROM notifications WHERE user_id = ?';
      const params = [userId];

      if (unreadOnly) {
        query += ' AND is_read = false';
      }

      query += ' ORDER BY created_at DESC LIMIT ?';
      params.push(Number(limit) || 50);

      const [rows] = await conn.query(query, params);
      return rows.map((row) => ({
        id: Number(row.id),
        user_id: Number(row.user_id),
        title: row.title,
        message: row.message,
        type: row.type || 'info',
        is_read: row.is_read === true || row.is_read === 'true',
        related_type: row.related_type || null,
        related_id: row.related_id || null,
        created_at: row.created_at,
      }));
    } finally {
      conn.release();
    }
  }

  static async create({ userId, title, message, type = 'info', relatedType = null, relatedId = null }) {
    const conn = await getConnection();
    try {
      const [rows] = await conn.query(
        `INSERT INTO notifications (user_id, title, message, type, related_type, related_id, is_read, created_at)
         VALUES (?, ?, ?, ?, ?, ?, false, NOW())
         RETURNING *`,
        [userId, title, message, type, relatedType, relatedId]
      );
      return rows[0] || null;
    } finally {
      conn.release();
    }
  }

  static async createMany(recipients, payload) {
    if (!Array.isArray(recipients) || recipients.length === 0) {
      return [];
    }

    const safeRecipients = [...new Set(recipients.filter((value) => Number.isFinite(Number(value)) && Number(value) > 0).map((value) => Number(value)))];
    if (safeRecipients.length === 0) {
      return [];
    }

    const conn = await getConnection();
    try {
      const inserts = [];
      for (const userId of safeRecipients) {
        inserts.push([
          userId,
          payload.title,
          payload.message,
          payload.type || 'info',
          payload.relatedType || null,
          payload.relatedId || null,
        ]);
      }

      const rows = [];
      for (const values of inserts) {
        const [result] = await conn.query(
          `INSERT INTO notifications (user_id, title, message, type, related_type, related_id, is_read, created_at)
           VALUES (?, ?, ?, ?, ?, ?, false, NOW())
           RETURNING *`,
          values
        );
        if (result && result[0]) rows.push(result[0]);
      }
      return rows;
    } finally {
      conn.release();
    }
  }

  static async notifyUsers({ userIds, title, message, type = 'info', relatedType = null, relatedId = null }) {
    return this.createMany(userIds, { title, message, type, relatedType, relatedId });
  }

  static async notifyRoleUsers({ ownerUserId, roleName, title, message, type = 'info', relatedType = null, relatedId = null }) {
    const conn = await getConnection();
    try {
      let userIds = [];

      if (roleName) {
        const [rows] = await conn.query(
          `SELECT DISTINCT tm.member_user_id AS user_id
           FROM team_memberships tm
           WHERE tm.owner_user_id = ?
             AND tm.role_name = ?
             AND tm.status = 'active'`,
          [ownerUserId, roleName]
        );
        userIds = rows.map((row) => Number(row.user_id)).filter((value) => Number.isFinite(value) && value > 0);
      }

      if (ownerUserId) {
        userIds.push(Number(ownerUserId));
      }

      return this.createMany(userIds, { title, message, type, relatedType, relatedId });
    } finally {
      conn.release();
    }
  }

  static async notifyRoleGroup({ ownerUserId, roleNames = [], includeOwner = true, title, message, type = 'info', relatedType = null, relatedId = null }) {
    if (!ownerUserId) {
      return [];
    }

    const normalizedRoles = Array.isArray(roleNames)
      ? roleNames.map((role) => String(role).trim().toLowerCase()).filter(Boolean)
      : [String(roleNames).trim().toLowerCase()].filter(Boolean);

    const conn = await getConnection();
    try {
      let userIds = [];

      if (normalizedRoles.length > 0) {
        const placeholders = normalizedRoles.map(() => '?').join(', ');
        const [rows] = await conn.query(
          `SELECT DISTINCT tm.member_user_id AS user_id
           FROM team_memberships tm
           WHERE tm.owner_user_id = ?
             AND tm.role_name IN (${placeholders})
             AND tm.status = 'active'`,
          [Number(ownerUserId), ...normalizedRoles]
        );
        userIds = rows.map((row) => Number(row.user_id)).filter((value) => Number.isFinite(value) && value > 0);
      }

      if (includeOwner) {
        userIds.push(Number(ownerUserId));
      }

      return this.createMany([...new Set(userIds)], { title, message, type, relatedType, relatedId });
    } finally {
      conn.release();
    }
  }

  static async markAllAsRead(userId) {
    const conn = await getConnection();
    try {
      await conn.query('UPDATE notifications SET is_read = true WHERE user_id = ?', [userId]);
      return true;
    } finally {
      conn.release();
    }
  }
}

module.exports = Notification;
