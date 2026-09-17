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