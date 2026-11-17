const { getConnection } = require('../config/database');
const { sendPushNotifications } = require('../services/pushNotifications');

const ORDER_EVENTS = new Set(['new_order', 'assigned', 'postponed', 'cancelled', 'delivered']);

function numericId(value) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function getOrderNumber(order = {}) {
  return String(order.custom_order_number || order.order_number || order.name || order.id || '');
}

function resolveEventRecipients({ ownerUserId, event, actorUserId, order = {}, members = [] }) {
  const ownerId = numericId(ownerUserId);
  const actorId = numericId(actorUserId);
  const assignedCourierId = numericId(order.assigned_to ?? order.assignedTo);
  const closerId = numericId(order.assigned_closer_id ?? order.assignedCloserId ?? order.created_by);
  const recipients = new Map();
  const add = (userId, role) => {
    const id = numericId(userId);
    if (id && id !== actorId && !recipients.has(id)) recipients.set(id, role);
  };

  if (event === 'invitation') {
    add(order.memberUserId ?? order.member_user_id ?? order.inviteeUserId ?? order.invitee_user_id, 'invitee');
  } else if (event === 'invitation_accepted') {
    add(ownerId, 'owner');
  } else if (ORDER_EVENTS.has(event)) {
    add(ownerId, 'owner');
    const allowedRoles = event === 'new_order'
      ? new Set(['manager', 'closer'])
      : new Set(['manager', 'closer']);

    for (const member of members) {
      const userId = numericId(member.member_user_id ?? member.user_id);
      const role = String(member.role_name || '').trim().toLowerCase();
      if (allowedRoles.has(role)) add(userId, role);
      if (role === 'courier' && userId === assignedCourierId) add(userId, 'courier');
    }

    if (closerId) add(closerId, 'closer');
    if (assignedCourierId) add(assignedCourierId, 'courier');
  }

  return [...recipients].map(([userId, role]) => ({ userId, role }));
}

function eventNotification(event, role, order) {
  const orderNumber = getOrderNumber(order);
  const messages = {
    new_order: role === 'courier'
      ? `La commande ${orderNumber} vous a été assignée.`
      : `Nouvelle commande ${orderNumber}.`,
    assigned: role === 'courier'
      ? `La commande ${orderNumber} vous a été assignée.`
      : `La commande ${orderNumber} a été assignée.`,
    postponed: `La commande ${orderNumber} a été reportée.`,
    cancelled: `La commande ${orderNumber} a été annulée.`,
    delivered: `La commande ${orderNumber} a été livrée.`,
    invitation: 'Vous avez reçu une invitation à rejoindre une équipe.',
    invitation_accepted: 'Votre invitation a été acceptée.',
  };
  const titles = {
    new_order: 'Nouvelle commande',
    assigned: 'Commande assignée',
    postponed: 'Commande reportée',
    cancelled: 'Commande annulée',
    delivered: 'Commande livrée',
    invitation: 'Invitation d’équipe',
    invitation_accepted: 'Invitation acceptée',
  };
  return {
    title: titles[event],
    message: messages[event],
    type: event === 'cancelled' ? 'warning' : event === 'delivered' ? 'success' : 'info',
    relatedType: ORDER_EVENTS.has(event) ? 'order' : 'team_invitation',
    relatedId: ORDER_EVENTS.has(event) ? numericId(order.id) : numericId(order.membershipId ?? order.membership_id),
  };
}

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

    const insertsByUser = new Map();
    for (const recipient of recipients) {
      const userId = numericId(typeof recipient === 'object' ? recipient.userId : recipient);
      if (!userId || insertsByUser.has(userId)) continue;
      const recipientPayload = typeof payload === 'function' ? payload(userId, recipient) : payload;
      if (recipientPayload) insertsByUser.set(userId, [
        userId,
        recipientPayload.title,
        recipientPayload.message,
        recipientPayload.type || 'info',
        recipientPayload.relatedType || null,
        recipientPayload.relatedId || null,
      ]);
    }
    const inserts = [...insertsByUser.values()];
    if (inserts.length === 0) {
      return [];
    }

    const conn = await getConnection();
    let notifications = [];
    try {
      const values = [];
      const valueGroups = inserts.map((row) => {
        const offset = values.length;
        values.push(...row);
        return `(${row.map((_, index) => `$${offset + index + 1}`).join(', ')}, false, NOW())`;
      });
      const [result] = await conn.query(
        `INSERT INTO notifications (user_id, title, message, type, related_type, related_id, is_read, created_at)
         VALUES ${valueGroups.join(', ')}
         RETURNING *`,
        values
      );
      notifications = result.rows || [];
    } finally {
      conn.release();
    }
    await sendPushNotifications(notifications);
    return notifications;
  }

  static async notifyEvent({ ownerUserId, event, actorUserId, order = {} }) {
    const normalizedEvent = String(event || '').trim().toLowerCase();
    if (!ORDER_EVENTS.has(normalizedEvent) && !['invitation', 'invitation_accepted'].includes(normalizedEvent)) return [];

    let members = [];
    if (ORDER_EVENTS.has(normalizedEvent)) {
      const conn = await getConnection();
      try {
        const [rows] = await conn.query(
          `SELECT DISTINCT member_user_id, role_name
           FROM team_memberships
           WHERE owner_user_id = ? AND status = 'active'`,
          [numericId(ownerUserId)]
        );
        members = rows;
      } finally {
        conn.release();
      }
    }

    const recipients = resolveEventRecipients({
      ownerUserId,
      event: normalizedEvent,
      actorUserId,
      order,
      members,
    });
    return this.createMany(recipients, (_userId, recipient) => eventNotification(normalizedEvent, recipient.role, order));
  }

  static resolveEventRecipients(input) {
    return resolveEventRecipients(input);
  }

  static async markAsRead(notificationId, userId) {
    const conn = await getConnection();
    try {
      const [result] = await conn.query(
        'UPDATE notifications SET is_read = true WHERE id = ? AND user_id = ? RETURNING id',
        [notificationId, userId]
      );
      return (result.rowCount || result.rows?.length || 0) > 0;
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

Notification.eventNotification = eventNotification;
module.exports = Notification;
