const { pool } = require('../../config/database');
const User = require('../../models/User');
const Rbac = require('../../models/Rbac');

const allowedTeamRoles = ['manager', 'closer', 'courier'];

async function ensureExclusiveOwnerRoleAssignment(conn, { memberUserId, ownerUserId, roleName }) {
  const normalizedRole = String(roleName || '').trim().toLowerCase();
  if (!['manager', 'closer'].includes(normalizedRole)) {
    return;
  }

  const [rows] = await conn.query(
    `SELECT id
     FROM team_memberships
     WHERE member_user_id = ?
       AND role_name IN ('manager', 'closer')
       AND status IN ('pending', 'active')
       AND owner_user_id != ?
     LIMIT 1`,
    [memberUserId, ownerUserId]
  );

  if (rows.length > 0) {
    throw new Error('Ce rôle est exclusif à un seul e-commerçant.');
  }
}

const adminController = {
  async get(req, res) {
    res.json({
      message: 'API Admin active',
      userId: req.userId,
      allowedRoles: ['owner', 'manager']
    });
  },

  async getUsers(req, res) {
    try {
      const ownerUserId = Number(req.userId);
      const conn = await pool.getConnection();

      try {
        const [rows] = await conn.query(
          `SELECT DISTINCT member_user_id AS user_id
           FROM team_memberships
           WHERE owner_user_id = ? AND status IN ('active', 'pending')
           UNION
           SELECT ? AS user_id`,
          [ownerUserId, ownerUserId]
        );

        const memberIds = [...new Set(rows.map((row) => Number(row.user_id)).filter((id) => Number.isInteger(id) && id > 0))];

        const users = [];
        for (const userId of memberIds) {
          const user = await User.findById(userId);
          if (!user) continue;

          users.push({
            id: Number(user.id),
            email: user.email,
            phone: user.phone,
            full_name: user.full_name || (user.email ? user.email.split('@')[0] : null),
            order_count: Number(user.order_count || 0),
            max_orders: Number(user.max_orders || 10),
            license_key: user.license_key,
            license_expiry: user.license_expiry,
            roles: await Rbac.getRolesForUser(userId)
          });
        }

        res.json({ users });
      } finally {
        conn.release();
      }
    } catch (error) {
      console.error('[ADMIN] Fetch users error:', error);
      res.status(500).json({ error: 'Erreur lors du chargement de votre équipe' });
    }
  },

  async searchUsers(req, res) {
    try {
      const { q, role } = req.query;
      const ownerUserId = Number(req.userId);
      const targetRole = String(role || '').trim().toLowerCase();
      const users = await User.searchUsers(q || '', ownerUserId, targetRole || null);
      res.json({ users });
    } catch (error) {
      console.error('[ADMIN] Search users error:', error);
      res.status(500).json({ error: 'Erreur de recherche utilisateur' });
    }
  },

  async createMember(req, res) {
    try {
      const { email, password, phone, fullName, role } = req.body;
      const normalizedEmail = String(email || '').trim().toLowerCase();
      const roleName = String(role || 'closer').toLowerCase();

      if (!normalizedEmail) {
        return res.status(400).json({ error: 'Email requis' });
      }

      if (!allowedTeamRoles.includes(roleName)) {
        return res.status(400).json({ error: 'Rôle invalide pour un membre d’équipe' });
      }

      let existingUser = await User.findByEmail(normalizedEmail);
      if (!existingUser) {
        if (!password) {
          return res.status(400).json({ error: 'Mot de passe requis pour créer un nouveau compte' });
        }

        const created = await User.create({
          email: normalizedEmail,
          passwordHash: await require('bcrypt').hash(password, 10),
          phone: phone || null,
          fullName: fullName || null,
          role: roleName
        });
        existingUser = await User.findById(created.id);
      }

      const ownerUserId = Number(req.userId);
      const memberUserId = Number(existingUser.id);
      const conn = await pool.getConnection();
      try {
        await ensureExclusiveOwnerRoleAssignment(conn, { memberUserId, ownerUserId, roleName });

        await conn.query(
          `INSERT INTO team_memberships (owner_user_id, member_user_id, role_name, status, invited_by)
           VALUES (?, ?, ?, 'pending', ?)
           ON DUPLICATE KEY UPDATE role_name = VALUES(role_name), status = VALUES(status), invited_by = VALUES(invited_by)`,
          [ownerUserId, memberUserId, roleName, ownerUserId]
        );
      } finally {
        conn.release();
      }

      await Rbac.assignRole(memberUserId, roleName);

      res.status(201).json({
        message: 'Membre ajouté à l’équipe',
        user: {
          id: memberUserId,
          email: existingUser.email,
          full_name: existingUser.full_name || fullName || null,
          role: roleName,
          status: 'pending'
        }
      });
    } catch (error) {
      console.error('[ADMIN] Create member error:', error);
      res.status(500).json({ error: 'Erreur lors de la création du membre' });
    }
  },

  async getTeamMembers(req, res) {
    try {
      const conn = await pool.getConnection();
      try {
        const [rows] = await conn.query(`
          SELECT tm.id, tm.owner_user_id, tm.member_user_id, tm.role_name, tm.status, tm.created_at,
                 u.email, u.full_name, u.phone
          FROM team_memberships tm
          JOIN app_users u ON u.id = tm.member_user_id
          WHERE tm.owner_user_id = ?
          ORDER BY tm.created_at DESC`, [req.userId]);

        res.json({ members: rows });
      } finally {
        conn.release();
      }
    } catch (error) {
      console.error('[ADMIN] Get team members error:', error);
      res.status(500).json({ error: 'Erreur chargement équipe' });
    }
  },

  async getPendingMemberships(req, res) {
    try {
      const conn = await pool.getConnection();
      try {
        const [rows] = await conn.query(`
          SELECT tm.id, tm.owner_user_id, tm.member_user_id, tm.role_name, tm.status, tm.created_at,
                 u.email, u.full_name, u.phone,
                 owner.full_name AS owner_name
          FROM team_memberships tm
          JOIN app_users u ON u.id = tm.member_user_id
          JOIN app_users owner ON owner.id = tm.owner_user_id
          WHERE tm.member_user_id = ?
          ORDER BY tm.created_at DESC`, [req.userId]);

        res.json({ memberships: rows });
      } finally {
        conn.release();
      }
    } catch (error) {
      console.error('[ADMIN] Get pending memberships error:', error);
      res.status(500).json({ error: 'Erreur chargement invitations' });
    }
  },

  async inviteMember(req, res) {
    try {
      const { memberUserId, role } = req.body;
      const roleName = String(role || 'closer').toLowerCase();
      if (!allowedTeamRoles.includes(roleName)) {
        return res.status(400).json({ error: 'Rôle invalide' });
      }

      const conn = await pool.getConnection();
      try {
        await ensureExclusiveOwnerRoleAssignment(conn, { memberUserId: Number(memberUserId), ownerUserId: Number(req.userId), roleName });

        await conn.query(
          `INSERT INTO team_memberships (owner_user_id, member_user_id, role_name, status, invited_by)
           VALUES (?, ?, ?, 'pending', ?)
           ON DUPLICATE KEY UPDATE role_name = VALUES(role_name), status = VALUES(status), invited_by = VALUES(invited_by)`,
          [req.userId, Number(memberUserId), roleName, req.userId]
        );
      } finally {
        conn.release();
      }

      res.json({ message: 'Invitation envoyée' });
    } catch (error) {
      console.error('[ADMIN] Invite member error:', error);
      res.status(500).json({ error: 'Erreur invitation' });
    }
  },

  async approveMember(req, res) {
    try {
      const { id } = req.params;
      const { status } = req.body;
      const finalStatus = status === 'rejected' ? 'rejected' : 'active';

      const conn = await pool.getConnection();
      try {
        await conn.query(
          `UPDATE team_memberships
           SET status = ?, confirmed_at = NOW()
           WHERE id = ? AND owner_user_id = ?`,
          [finalStatus, id, req.userId]
        );
      } finally {
        conn.release();
      }

      res.json({ message: 'Statut de membre mis à jour' });
    } catch (error) {
      console.error('[ADMIN] Approve member error:', error);
      res.status(500).json({ error: 'Erreur mise à jour statut' });
    }
  },

  async confirmMember(req, res) {
    try {
      const { membershipId } = req.body;
      const conn = await pool.getConnection();
      try {
        const [rows] = await conn.query(
          `SELECT * FROM team_memberships WHERE id = ? AND member_user_id = ?`,
          [membershipId, req.userId]
        );

        if (!rows.length) {
          return res.status(404).json({ error: 'Invitation introuvable' });
        }

        const membership = rows[0];
        await conn.query(
          `UPDATE team_memberships SET status = 'active', confirmed_at = NOW() WHERE id = ?`,
          [membershipId]
        );

        if (['manager', 'closer', 'courier'].includes(String(membership.role_name).toLowerCase())) {
          await Rbac.assignRole(req.userId, String(membership.role_name).toLowerCase());
        }
      } finally {
        conn.release();
      }

      res.json({ message: 'Invitation confirmée, vous pouvez commencer à travailler ensemble' });
    } catch (error) {
      console.error('[ADMIN] Confirm member error:', error);
      res.status(500).json({ error: 'Erreur de confirmation' });
    }
  },

  async updateUserRoles(req, res) {
    try {
      const { id } = req.params;
      const { roles } = req.body;

      if (!Array.isArray(roles)) {
        return res.status(400).json({ error: 'Le champ roles doit être un tableau' });
      }

      const normalizedRoles = [...new Set(roles.map((role) => String(role).trim().toLowerCase()).filter(Boolean))];
      const conn = await pool.getConnection();
      try {
        if (normalizedRoles.some((role) => ['manager', 'closer'].includes(role))) {
          const [rows] = await conn.query(
            `SELECT id
             FROM team_memberships
             WHERE member_user_id = ?
               AND role_name IN ('manager', 'closer')
               AND status IN ('pending', 'active')
               AND owner_user_id != ?
             LIMIT 1`,
            [Number(id), Number(req.userId)]
          );

          if (rows.length > 0) {
            return res.status(400).json({ error: 'Ce rôle est exclusif à un seul e-commerçant.' });
          }
        }
      } finally {
        conn.release();
      }

      await Rbac.setRolesForUser(Number(id), normalizedRoles);

      const updatedUser = (await Rbac.getUsersWithRoles()).find((user) => Number(user.id) === Number(id));

      res.json({
        message: 'Rôles mis à jour',
        user: updatedUser || { id: Number(id), roles: normalizedRoles }
      });
    } catch (error) {
      console.error('[ADMIN] Update roles error:', error);
      res.status(500).json({ error: 'Erreur lors de la mise à jour des rôles' });
    }
  }
};

module.exports = adminController;