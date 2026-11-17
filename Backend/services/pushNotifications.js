const { getConnection } = require('../config/database');

let messagingInstance;
let initializationAttempted = false;
let missingCredentialsLogged = false;

function getMessaging() {
  if (messagingInstance) return messagingInstance;
  if (initializationAttempted) return null;
  initializationAttempted = true;

  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!serviceAccountJson) {
    if (!missingCredentialsLogged) {
      console.warn('[FCM] FIREBASE_SERVICE_ACCOUNT is not configured; push delivery is disabled.');
      missingCredentialsLogged = true;
    }
    return null;
  }

  try {
    const admin = require('firebase-admin');
    const serviceAccount = JSON.parse(serviceAccountJson);
    const app = admin.apps.length
      ? admin.app()
      : admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
    messagingInstance = admin.messaging(app);
    return messagingInstance;
  } catch (error) {
    console.error('[FCM] Firebase Admin initialization failed:', error.message);
    return null;
  }
}

function shouldDeleteRejectedToken(errorCode) {
  return errorCode === 'messaging/registration-token-not-registered'
    || errorCode === 'messaging/invalid-argument';
}

function createPushMessage(notification, token) {
  return {
    token,
    notification: {
      title: String(notification.title || ''),
      body: String(notification.message || ''),
    },
    data: {
      relatedType: String(notification.related_type || ''),
      relatedId: String(notification.related_id ?? ''),
      notificationId: String(notification.id),
    },
    android: {
      priority: 'high',
      notification: { channelId: 'orders', sound: 'default' },
    },
  };
}

async function removeRejectedTokens(tokens) {
  if (!tokens.length) return;
  let conn;
  try {
    conn = await getConnection();
    await conn.query('DELETE FROM device_tokens WHERE token = ANY($1::text[])', [tokens]);
  } catch (error) {
    console.error('[FCM] Failed to remove rejected device tokens:', error.message);
  } finally {
    if (conn) conn.release();
  }
}

async function sendPushNotifications(notifications) {
  try {
    if (!Array.isArray(notifications) || notifications.length === 0) return;
    const messaging = getMessaging();
    if (!messaging) return;

    const userIds = [...new Set(notifications.map(row => Number(row.user_id)).filter(id => Number.isInteger(id) && id > 0))];
    if (!userIds.length) return;

    const conn = await getConnection();
    let tokens;
    try {
      const [rows] = await conn.query(
        'SELECT user_id, token FROM device_tokens WHERE user_id = ANY($1::int[])',
        [userIds]
      );
      tokens = rows;
    } finally {
      conn.release();
    }
    if (!tokens.length) return;

    const notificationsByUser = new Map(notifications.map(row => [Number(row.user_id), row]));
    const messages = tokens.map(device => createPushMessage(notificationsByUser.get(Number(device.user_id)), device.token));

    for (let offset = 0; offset < messages.length; offset += 500) {
      const batch = messages.slice(offset, offset + 500);
      const response = await messaging.sendEach(batch);
      const rejectedTokens = [];
      response.responses.forEach((result, index) => {
        if (!result.success) {
          const code = result.error?.code || 'unknown';
          console.warn('[FCM] Push delivery failed:', code);
          if (shouldDeleteRejectedToken(code)) rejectedTokens.push(batch[index].token);
        }
      });
      await removeRejectedTokens(rejectedTokens);
    }
  } catch (error) {
    console.error('[FCM] Push delivery failed; business operation remains successful:', error.message);
  }
}

module.exports = { createPushMessage, shouldDeleteRejectedToken, sendPushNotifications };