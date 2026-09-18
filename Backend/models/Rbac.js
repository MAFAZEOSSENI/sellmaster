const { pool } = require('../config/database');

const Rbac = {
  async assignRole(userId, roleName) {
    const conn = await pool.getConnection();
    try {
      await conn.query(`
        INSERT IGNORE INTO user_roles (user_id, role_id)
        SELECT ?, id FROM roles WHERE name = ?
      `, [userId, roleName]);
    } finally {
      conn.release();
    }
  },

  async getRolesForUser(userId) {
    const conn = await pool.getConnection();
    try {
      const [rows] = await conn.query(`
        SELECT r.name
        FROM user_roles ur
        JOIN roles r ON r.id = ur.role_id
        WHERE ur.user_id = ?
        ORDER BY r.name
      `, [userId]);
      return rows.map(row => row.name);
    } finally {
      conn.release();
    }
  },

  async getUsersWithRoles() {
    const conn = await pool.getConnection();
    try {
      const [rows] = await conn.query(`
        SELECT
          u.id,
          u.email,
          u.phone,
          u.order_count,
          u.max_orders,
          u.license_key,
          u.license_expiry,
          GROUP_CONCAT(DISTINCT r.name ORDER BY r.name SEPARATOR ',') AS roles_csv
        FROM app_users u
        LEFT JOIN user_roles ur ON ur.user_id = u.id
        LEFT JOIN roles r ON r.id = ur.role_id
        GROUP BY u.id, u.email, u.phone, u.order_count, u.max_orders, u.license_key, u.license_expiry
        ORDER BY u.email ASC
      `);

      return rows.map((row) => ({
        id: Number(row.id),
        email: row.email,
        phone: row.phone,
        order_count: Number(row.order_count || 0),
        max_orders: Number(row.max_orders || 10),
        license_key: row.license_key,
        license_expiry: row.license_expiry,
        roles: row.roles_csv ? row.roles_csv.split(',').filter(Boolean) : []
      }));
    } finally {
      conn.release();
    }
  },

  async setRolesForUser(userId, roleNames) {
    const conn = await pool.getConnection();
    try {
      const normalized = [...new Set((roleNames || []).map((role) => String(role).trim().toLowerCase()).filter(Boolean))];

      await conn.query('DELETE FROM user_roles WHERE user_id = ?', [userId]);

      if (normalized.length === 0) {
        return [];
      }

      const placeholders = normalized.map(() => '?').join(',');
      const [roleRows] = await conn.query(`SELECT id, name FROM roles WHERE name IN (${placeholders})`, normalized);
      const roleIds = roleRows.map((row) => row.id);

      if (roleIds.length === 0) {
        return [];
      }

      const values = roleIds.map((roleId) => [userId, roleId]);
      await conn.query('INSERT INTO user_roles (user_id, role_id) VALUES ?', [values]);

      return normalized;
    } finally {
      conn.release();
    }
  },

  async hasRole(userId, roleNames) {
    const roles = await this.getRolesForUser(userId);
    return roleNames.some(role => roles.includes(role));
  },

  async hasPermission(userId, permissionName) {
    const conn = await pool.getConnection();
    try {
      const [rows] = await conn.query(`
        SELECT 1
        FROM user_roles ur
        JOIN roles r ON r.id = ur.role_id
        JOIN role_permissions rp ON rp.role_id = r.id
        JOIN permissions p ON p.id = rp.permission_id
        WHERE ur.user_id = ? AND (r.name = 'owner' OR p.name = ?)
        LIMIT 1
      `, [userId, permissionName]);
      return rows.length > 0;
    } finally {
      conn.release();
    }
  }
};

module.exports = Rbac;