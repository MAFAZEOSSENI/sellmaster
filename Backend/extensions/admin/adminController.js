const { getConnection } = require('../../config/database');
const User = require('../../models/User');
const Rbac = require('../../models/Rbac');

const allowedTeamRoles = ['manager', 'closer', 'courier'];

function readRequestBody(req) {
  if (req.body && typeof req.body === 'object' && !Array.isArray(req.body)) {
    return req.body;
  }

  if (typeof req.body === 'string') {
    const trimmed = req.body.trim();
    if (!trimmed) return {};

    try {
      return JSON.parse(trimmed);
    } catch (error) {
      const parsedPairs = {};
      for (const part of trimmed.split('&')) {
        const [key, ...rest] = part.split('=');
        if (!key) continue;
        parsedPairs[decodeURIComponent(key)] = decodeURIComponent(rest.join('=') || '');
      }
      return Object.keys(parsedPairs).length ? parsedPairs : { raw: trimmed };
    }
  }

  return {};
}

async function ensureExclusiveOwnerRoleAssignment(conn, { memberUserId, ownerUserId, roleName }) {
  const normalizedRole = String(roleName || '').trim().toLowerCase();
  if (!['manager', 'closer'].includes(normalizedRole)) {
    return;
  }

  const [rows] = await conn.query(
    `SELECT id
     FROM team_memberships
     WHERE member_user_id = $1
       AND role_name IN ('manager', 'closer')
       AND status IN ('pending', 'active')
       AND owner_user_id != $2
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
      const currentUserId = Number(req.userId);
      const fixedRole = await User.getFixedRole(currentUserId);
      const conn = await getConnection();

      try {
        let ownerUserId = currentUserId;
        if (fixedRole === 'manager') {
          const [managerMemberships] = await conn.query(
            `SELECT owner_user_id
             FROM team_memberships
             WHERE member_user_id = $1
               AND role_name = 'manager'
               AND status = 'active'
             ORDER BY created_at ASC
             LIMIT 1`,
            [currentUserId]
          );
          ownerUserId = Number(managerMemberships[0]?.owner_user_id || 0);
        }

        if (!ownerUserId) {
          return res.json({ users: [] });
        }

        const [rows] = await conn.query(
          `SELECT DISTINCT member_user_id AS user_id
           FROM team_memberships
           WHERE owner_user_id = $1 AND status IN ('active', 'pending')
           UNION
           SELECT $2 AS user_id`,
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
            roles: await Rbac.getRolesForUser(userId),
            membership_id: null,
            commission_amount: null,
            commission_type: null
          });
        }

        const [memberships] = await conn.query(
          `SELECT id, member_user_id, commission_amount, commission_type
           FROM team_memberships
           WHERE owner_user_id = $1
             AND status IN ('active', 'pending')`,
          [ownerUserId]
        );
        const membershipByMemberId = new Map(
          memberships.map((membership) => [Number(membership.member_user_id), membership])
        );
        for (const user of users) {
          const membership = membershipByMemberId.get(Number(user.id));
          if (membership) {
            user.membership_id = Number(membership.id);
            user.commission_amount = membership.commission_amount;
            user.commission_type = membership.commission_type;
          }
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
        // TODO: future iteration - validate the fixed role during registration for unregistered email/phone invitations.
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

      if (existingUser && memberUserId > 0) {
        const fixedRole = await User.getFixedRole(memberUserId);
        if (fixedRole && fixedRole !== roleName) {
          return res.status(400).json({
            error: `Cet utilisateur est inscrit en tant que ${fixedRole} et ne peut pas rejoindre une équipe avec le rôle ${roleName}.`
          });
        }
      }

      const conn = await getConnection();
      try {
        await ensureExclusiveOwnerRoleAssignment(conn, { memberUserId, ownerUserId, roleName });

        await conn.query(
          `INSERT INTO team_memberships (owner_user_id, member_user_id, role_name, status, invited_by)
           VALUES ($1, $2, $3, 'pending', $4)
           ON CONFLICT (owner_user_id, member_user_id)
           DO UPDATE SET role_name = EXCLUDED.role_name,
                         status = EXCLUDED.status,
                         invited_by = EXCLUDED.invited_by`,
          [ownerUserId, memberUserId, roleName, ownerUserId]
        );
      } finally {
        conn.release();
      }

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
      const requestedOwnerId = Number(req.query.ownerId || req.userId);
      const currentUserId = Number(req.userId);
      const fixedRole = await User.getFixedRole(currentUserId);

      const targetIsCurrentOwner = requestedOwnerId === currentUserId;
      const isActiveTeamMember = await User.isActiveWorkingTeamMemberForOwner(currentUserId, requestedOwnerId);

      if (!targetIsCurrentOwner && !(['owner', 'manager', 'closer'].includes(fixedRole) && isActiveTeamMember)) {
        return res.status(403).json({ error: 'Vous n’êtes pas autorisé à voir les membres de cette équipe.' });
      }

      const conn = await getConnection();
      try {
        const [rows] = await conn.query(`
          SELECT tm.id, tm.owner_user_id, tm.member_user_id, tm.role_name, tm.status, tm.created_at, tm.is_working,
                 u.email, u.full_name, u.phone,
                 CASE WHEN u.id = $1 THEN 'self' ELSE 'member' END AS relation_type
          FROM team_memberships tm
          JOIN app_users u ON u.id = tm.member_user_id
          WHERE tm.owner_user_id = $2
            AND tm.status = 'active'
            AND tm.is_working = TRUE
          ORDER BY tm.created_at DESC`, [currentUserId, requestedOwnerId]);

        res.json({ members: rows });
      } finally {
        conn.release();
      }
    } catch (error) {
      console.error('[ADMIN] Get team members error:', error);
      res.status(500).json({ error: 'Erreur chargement équipe' });
    }
  },

  async getMyTeams(req, res) {
    try {
      const conn = await getConnection();
      try {
        const [rows] = await conn.query(`
          SELECT tm.id,
                 tm.owner_user_id,
                 tm.member_user_id,
                 tm.role_name,
                 tm.status,
                 tm.nickname,
                 tm.is_working,
                 tm.created_at,
                 tm.confirmed_at,
                 owner.email AS owner_email,
                 owner.full_name AS owner_name,
                 owner.phone AS owner_phone,
                 member.email AS member_email,
                 member.full_name AS member_full_name
          FROM team_memberships tm
          JOIN app_users owner ON owner.id = tm.owner_user_id
          JOIN app_users member ON member.id = tm.member_user_id
          WHERE tm.member_user_id = $1
          ORDER BY tm.created_at DESC`, [req.userId]);

        res.json({ memberships: rows.map((row) => ({
          ...row,
          is_working: Boolean(row.is_working),
          owner_name: row.owner_name || row.owner_email || 'Propriétaire',
          nickname: row.nickname || row.owner_name || row.owner_email || null,
        })) });
      } finally {
        conn.release();
      }
    } catch (error) {
      console.error('[ADMIN] Get my teams error:', error);
      res.status(500).json({ error: 'Erreur chargement de mes équipes' });
    }
  },

  async updateMyTeam(req, res) {
    try {
      const membershipId = Number(req.params.membershipId);
      const { nickname, is_working } = req.body;

      if (!membershipId) {
        return res.status(400).json({ error: 'Identifiant de membership invalide' });
      }

      const conn = await getConnection();
      try {
        const [rows] = await conn.query(
          `SELECT * FROM team_memberships WHERE id = $1 AND member_user_id = $2`,
          [membershipId, req.userId]
        );

        if (!rows.length) {
          return res.status(404).json({ error: 'Équipe introuvable' });
        }

        const nextNickname = nickname !== undefined ? String(nickname).trim() : rows[0].nickname;
        const nextIsWorking = is_working !== undefined ? Boolean(is_working) : Boolean(rows[0].is_working);

        await conn.query(
          `UPDATE team_memberships
           SET nickname = $1, is_working = $2
           WHERE id = $3 AND member_user_id = $4`,
          [nextNickname || null, nextIsWorking, membershipId, req.userId]
        );

        const [updatedRows] = await conn.query(
          `SELECT tm.*, owner.full_name AS owner_name
           FROM team_memberships tm
           JOIN app_users owner ON owner.id = tm.owner_user_id
           WHERE tm.id = $1 AND tm.member_user_id = $2`,
          [membershipId, req.userId]
        );

        const membership = updatedRows[0];
        if (!membership) {
          return res.status(404).json({ error: 'Équipe mise à jour introuvable' });
        }

        res.json({
          message: 'Équipe mise à jour',
          membership: {
            ...membership,
            nickname: membership.nickname || membership.owner_name || null,
            is_working: Boolean(membership.is_working),
          }
        });
      } finally {
        conn.release();
      }
    } catch (error) {
      console.error('[ADMIN] Update my team error:', error);
      res.status(500).json({ error: 'Erreur mise à jour équipe' });
    }
  },

  async updateCloserCommission(req, res) {
    const membershipId = Number(req.params.membershipId);
    const body = readRequestBody(req);
    const commissionType = String(body.commission_type || '').trim().toLowerCase();
    const commissionAmount = Number(body.commission_amount);

    if (!membershipId) {
      return res.status(400).json({ error: 'Identifiant de membership invalide' });
    }
    if (!['fixed_amount', 'percentage'].includes(commissionType)) {
      return res.status(400).json({ error: 'Type de commission invalide' });
    }
    if (!Number.isFinite(commissionAmount) || commissionAmount < 0) {
      return res.status(400).json({ error: 'Montant de commission invalide' });
    }

    try {
      const requesterId = Number(req.userId);
      const requesterRole = await User.getFixedRole(requesterId);
      const conn = await getConnection();
      try {
        let ownerUserId = requesterId;
        if (requesterRole === 'manager') {
          const [managerMemberships] = await conn.query(
            `SELECT owner_user_id
             FROM team_memberships
             WHERE member_user_id = $1
               AND role_name = 'manager'
               AND status = 'active'
             ORDER BY created_at ASC
             LIMIT 1`,
            [requesterId]
          );
          ownerUserId = Number(managerMemberships[0]?.owner_user_id || 0);
        }

        const [memberships] = await conn.query(
          `SELECT id, owner_user_id, member_user_id, role_name, status,
                  commission_amount, commission_type
           FROM team_memberships
           WHERE id = $1
             AND owner_user_id = $2
             AND role_name = 'closer'
             AND status IN ('active', 'pending')`,
          [membershipId, ownerUserId]
        );

        if (!memberships.length) {
          return res.status(404).json({ error: 'Membership closer introuvable pour votre équipe' });
        }

        const [updateResult] = await conn.query(
          `UPDATE team_memberships
           SET commission_amount = $1, commission_type = $2
           WHERE id = $3
           RETURNING id, owner_user_id, member_user_id, role_name, status, commission_amount, commission_type`,
          [commissionAmount, commissionType, membershipId]
        );

        return res.json({ membership: updateResult.rows[0] });
      } finally {
        conn.release();
      }
    } catch (error) {
      console.error('[ADMIN] Update closer commission error:', error);
      return res.status(500).json({ error: 'Erreur mise à jour commission' });
    }
  },

  async getPendingMemberships(req, res) {
    try {
      const conn = await getConnection();
      try {
        const [rows] = await conn.query(`
          SELECT tm.id, tm.owner_user_id, tm.member_user_id, tm.role_name, tm.status, tm.created_at,
                 u.email, u.full_name, u.phone,
                 owner.full_name AS owner_name
          FROM team_memberships tm
          JOIN app_users u ON u.id = tm.member_user_id
          JOIN app_users owner ON owner.id = tm.owner_user_id
          WHERE tm.member_user_id = $1
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
      const body = readRequestBody(req);
      const memberUserId = body.memberUserId ?? body.member_id ?? body.memberId ?? body.userId ?? body.user_id ?? body.member ?? body.user ?? body.raw;
      const role = body.role;
      const roleName = String(role || 'closer').toLowerCase();
      if (!allowedTeamRoles.includes(roleName)) {
        return res.status(400).json({ error: 'Rôle invalide' });
      }
      if (memberUserId === undefined || memberUserId === null || memberUserId === '') {
        return res.status(400).json({ error: 'memberUserId requis' });
      }

      const memberId = Number(memberUserId);
      if (memberId > 0) {
        const fixedRole = await User.getFixedRole(memberId);
        if (fixedRole && fixedRole !== roleName) {
          return res.status(400).json({
            error: `Cet utilisateur est inscrit en tant que ${fixedRole} et ne peut pas rejoindre une équipe avec le rôle ${roleName}.`
          });
        }
      } else {
        // TODO: future iteration - validate the fixed role for invited email/phone before creating a memberships entry.
      }

      const conn = await getConnection();
      try {
        await ensureExclusiveOwnerRoleAssignment(conn, { memberUserId: memberId, ownerUserId: Number(req.userId), roleName });

        await conn.query(
          `INSERT INTO team_memberships (owner_user_id, member_user_id, role_name, status, invited_by)
           VALUES ($1, $2, $3, 'pending', $4)
           ON CONFLICT (owner_user_id, member_user_id)
           DO UPDATE SET role_name = EXCLUDED.role_name,
                         status = EXCLUDED.status,
                         invited_by = EXCLUDED.invited_by`,
          [req.userId, memberId, roleName, req.userId]
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

      const conn = await getConnection();
      try {
        await conn.query(
          `UPDATE team_memberships
           SET status = $1, confirmed_at = NOW()
           WHERE id = $2 AND owner_user_id = $3`,
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
      const rawBody = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
      const body = rawBody && typeof rawBody === 'object' ? rawBody : {};
      const membershipId = body.membershipId ?? body.membership_id ?? body.id;
      const conn = await getConnection();
      try {
        const [rows] = await conn.query(
          `SELECT * FROM team_memberships WHERE id = $1 AND member_user_id = $2`,
          [membershipId, req.userId]
        );

        if (!rows.length) {
          return res.status(404).json({ error: 'Invitation introuvable' });
        }

        const membership = rows[0];
        await conn.query(
          `UPDATE team_memberships SET status = 'active', confirmed_at = NOW() WHERE id = $1`,
          [membershipId]
        );

      } finally {
        conn.release();
      }

      res.json({ message: 'Invitation confirmée, vous pouvez commencer à travailler ensemble' });
    } catch (error) {
      console.error('[ADMIN] Confirm member error:', error);
      res.status(500).json({ error: 'Erreur de confirmation' });
    }
  }
};

module.exports = adminController;