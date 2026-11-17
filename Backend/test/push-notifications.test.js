process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgres://localhost/sellmaster_test';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createPushMessage, shouldDeleteRejectedToken } = require('../services/pushNotifications');

test('push contains notification and string-valued related data with Android delivery settings', () => {
  const message = createPushMessage({
    id: 42,
    user_id: 7,
    title: 'Commande assignée',
    message: 'La commande SM-2026-001 vous a été assignée.',
    related_type: 'order',
    related_id: 19,
  }, 'fcm-token');

  assert.deepEqual(message.notification, {
    title: 'Commande assignée',
    body: 'La commande SM-2026-001 vous a été assignée.',
  });
  assert.deepEqual(message.data, {
    relatedType: 'order',
    relatedId: '19',
    notificationId: '42',
  });
  assert.deepEqual(message.android, {
    priority: 'high',
    notification: { channelId: 'orders', sound: 'default' },
  });
});

test('only the specified invalid FCM token response codes trigger token deletion', () => {
  assert.equal(shouldDeleteRejectedToken('messaging/registration-token-not-registered'), true);
  assert.equal(shouldDeleteRejectedToken('messaging/invalid-argument'), true);
  assert.equal(shouldDeleteRejectedToken('messaging/internal-error'), false);
});