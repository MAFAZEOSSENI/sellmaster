const { pool } = require('../config/database');
const Rbac = require('./Rbac');

class User {
  static async create(userData) {
    const { email, passwordHash, phone, fullName, role } = userData;

    const connection = await pool.getConnection();
    try {
      const assignedRole = ['owner', 'manager', 'closer', 'courier'].includes(role) ? role : 'owner';
      const [columns] = await connection.query('SHOW COLUMNS FROM app_users');
      const hasFullName = columns.some((column) => column.Field === 'full_name');

      const [result] = hasFullName
        ? await connection.query(
            `INSERT INTO app_users (email, password_hash, phone, full_name, trial_used, order_count, max_orders)
             VALUES (?, ?, ?, ?, FALSE, 0, 10)`,
            [email, passwordHash, phone || null, fullName || null]
          )
        : await connection.query(
            `INSERT INTO app_users (email, password_hash, phone, trial_used, order_count, max_orders)
             VALUES (?, ?, ?, FALSE, 0, 10)`,
            [email, passwordHash, phone || null]
          );

      console.log('📝 Résultat insertion:', result);

      try {
        await Rbac.assignRole(result.insertId, assignedRole);
      } catch (error) {
        console.warn('⚠️ Rôle non assigné:', error.message);
      }

      return {
        id: result.insertId,
        email,
        phone: phone || null,
        full_name: fullName || null,
        role: assignedRole,
      };
    } finally {
      connection.release();
    }
  }

  static async getFixedRole(userId) {
    const connection = await pool.getConnection();
    try {
      const [rows] = await connection.query(
        `SELECT r.name
         FROM user_roles ur
         JOIN roles r ON r.id = ur.role_id
         WHERE ur.user_id = ?
         ORDER BY ur.created_at ASC, r.name ASC
         LIMIT 1`,
        [userId]
      );

      return rows.length > 0 ? String(rows[0].name).toLowerCase() : null;
    } finally {
      connection.release();
    }
  }

  static async findByEmail(email) {
    const connection = await pool.getConnection();
    try {
      const [rows] = await connection.query(
        'SELECT * FROM app_users WHERE email = ?',
        [email]
      );

      if (rows.length > 0) {
        const user = rows[0];

        if (user.password_hash && !user.passwordHash) {
          user.passwordHash = user.password_hash;
        }
        if (user.passwordHash && !user.password_hash) {
          user.password_hash = user.passwordHash;
        }

        console.log(`✅ Utilisateur trouvé: ${user.email}`);
        console.log(`🔑 Hash disponible: ${user.password_hash ? 'Oui' : 'Non'}`);

        return user;
      }

      console.log(`❌ Utilisateur non trouvé: ${email}`);
      return null;
    } catch (error) {
      console.error('❌ Erreur findByEmail:', error);
      throw error;
    } finally {
      connection.release();
    }
  }

  static async searchUsers(query, ownerUserId = null, roleName = null) {
    const connection = await pool.getConnection();
    try {
      const trimmedQuery = String(query || '').trim();
      const q = `%${trimmedQuery}%`;
      if (!trimmedQuery || q === '%%') {
        return [];
      }

      const [columns] = await connection.query('SHOW COLUMNS FROM app_users');
      const hasFullName = columns.some((column) => column.Field === 'full_name');

      const params = [q, q, q];
      const baseSql = hasFullName
        ? `SELECT id, email, phone, full_name, trial_used, order_count, max_orders
           FROM app_users
           WHERE (full_name LIKE ? OR email LIKE ? OR phone LIKE ?)`
        : `SELECT id, email, phone, trial_used, order_count, max_orders
           FROM app_users
           WHERE (email LIKE ? OR phone LIKE ?)`;

      let sql = baseSql;
      const values = [...params];

      if (ownerUserId !== null && ownerUserId !== undefined && Number(ownerUserId) > 0) {
        sql += ` AND id != ? AND id NOT IN (
          SELECT member_user_id
          FROM team_memberships
          WHERE owner_user_id = ? AND status IN ('pending', 'active')
        )`;
        values.push(Number(ownerUserId), Number(ownerUserId));
      }

      if (['manager', 'closer'].includes(String(roleName || '').trim().toLowerCase())) {
        sql += ` AND id NOT IN (
          SELECT member_user_id
          FROM team_memberships
          WHERE role_name IN ('manager', 'closer')
            AND status IN ('pending', 'active')
            AND owner_user_id != ?
        )`;
        values.push(Number(ownerUserId || 0));
      }

      sql += hasFullName
        ? ` ORDER BY full_name IS NOT NULL DESC, email ASC LIMIT 20`
        : ` ORDER BY email ASC LIMIT 20`;

      const [rows] = await connection.query(sql, values);

      return rows.map((row) => ({
        id: Number(row.id),
        email: row.email,
        phone: row.phone,
        full_name: row.full_name || (row.email ? row.email.split('@')[0] : null),
        trial_used: row.trial_used,
        order_count: Number(row.order_count || 0),
        max_orders: Number(row.max_orders || 10),
      }));
    } finally {
      connection.release();
    }
  }

  static async findById(id) {
    const connection = await pool.getConnection();
    try {
      const [columns] = await connection.query('SHOW COLUMNS FROM app_users');
      const hasFullName = columns.some((column) => column.Field === 'full_name');

      const [rows] = await connection.query(
        hasFullName
          ? 'SELECT id, email, phone, full_name, trial_used, order_count, max_orders, license_key, license_expiry FROM app_users WHERE id = ?'
          : 'SELECT id, email, phone, trial_used, order_count, max_orders, license_key, license_expiry FROM app_users WHERE id = ?',
        [id]
      );

      if (rows.length > 0) {
        const user = rows[0];
        if (user && user.id && typeof user.id === 'bigint') {
          user.id = Number(user.id);
        }
        return user;
      }
      return null;
    } finally {
      connection.release();
    }
  }

  static async getActiveOwnerIdsForMember(memberUserId) {
    const connection = await pool.getConnection();
    try {
      const [rows] = await connection.query(
        `SELECT DISTINCT owner_user_id
         FROM team_memberships
         WHERE member_user_id = ? AND status = 'active'`,
        [memberUserId]
      );

      return rows
        .map((row) => Number(row.owner_user_id))
        .filter((id) => Number.isInteger(id) && id > 0);
    } finally {
      connection.release();
    }
  }

  static async isActiveTeamMemberForOwner(memberUserId, ownerUserId) {
    if (!memberUserId || !ownerUserId) {
      return false;
    }

    const connection = await pool.getConnection();
    try {
      const [rows] = await connection.query(
        `SELECT 1
         FROM team_memberships
         WHERE member_user_id = ?
           AND owner_user_id = ?
           AND status = 'active'
         LIMIT 1`,
        [memberUserId, ownerUserId]
      );

      return rows.length > 0;
    } finally {
      connection.release();
    }
  }

  static async isActiveWorkingTeamMemberForOwner(memberUserId, ownerUserId) {
    if (!memberUserId || !ownerUserId) {
      return false;
    }

    const connection = await pool.getConnection();
    try {
      const [rows] = await connection.query(
        `SELECT 1
         FROM team_memberships
         WHERE member_user_id = ?
           AND owner_user_id = ?
           AND status = 'active'
           AND is_working = TRUE
         LIMIT 1`,
        [memberUserId, ownerUserId]
      );

      return rows.length > 0;
    } finally {
      connection.release();
    }
  }

  static async updateOrderCount(userId, newCount) {
    const connection = await pool.getConnection();
    try {
      await connection.query(
        'UPDATE app_users SET order_count = ? WHERE id = ?',
        [newCount, userId]
      );
      return true;
    } finally {
      connection.release();
    }
  }

  static async activateLicense(userId, licenseKey, expiryDate) {
    const connection = await pool.getConnection();
    try {
      await connection.query(
        'UPDATE app_users SET license_key = ?, license_expiry = ?, max_orders = 100000 WHERE id = ?',
        [licenseKey, expiryDate, userId]
      );
      return true;
    } finally {
      connection.release();
    }
  }

  static async canCreateOrder(userId, ownerUserId = null) {
    try {
      const effectiveOwnerId = ownerUserId !== null && ownerUserId !== undefined && String(ownerUserId).trim() !== ''
        ? Number(ownerUserId)
        : Number(userId);

      if (!Number.isInteger(effectiveOwnerId) || effectiveOwnerId <= 0) {
        return false;
      }

      const owner = await this.findById(effectiveOwnerId);
      if (!owner) {
        return false;
      }

      const isOwnerSelf = Number(effectiveOwnerId) === Number(userId);
      if (isOwnerSelf) {
        if (owner.license_key && owner.license_expiry && new Date(owner.license_expiry) > new Date()) {
          return true;
        }
        return Number(owner.order_count || 0) < Number(owner.max_orders || 10);
      }

      const fixedRole = await this.getFixedRole(userId);
      if (fixedRole === 'courier') {
        return false;
      }

      if (!['manager', 'closer'].includes(fixedRole)) {
        return false;
      }

      const hasActiveMembership = await this.isActiveTeamMemberForOwner(Number(userId), effectiveOwnerId);
      if (!hasActiveMembership) {
        return false;
      }

      if (owner.license_key && owner.license_expiry && new Date(owner.license_expiry) > new Date()) {
        return true;
      }

      return Number(owner.order_count || 0) < Number(owner.max_orders || 10);
    } catch (error) {
      console.error('❌ Erreur canCreateOrder:', error);
      return false;
    }
  }

  static async canCreateOrderForOwner(memberUserId, ownerUserId = null) {
    const effectiveOwnerId = ownerUserId !== null && ownerUserId !== undefined && String(ownerUserId).trim() !== ''
      ? Number(ownerUserId)
      : Number(memberUserId);

    if (!Number.isInteger(effectiveOwnerId) || effectiveOwnerId <= 0) {
      return false;
    }

    return this.canCreateOrder(memberUserId, effectiveOwnerId);
  }
}

module.exports = User;
