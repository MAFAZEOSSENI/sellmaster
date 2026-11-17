process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgres://localhost/sellmaster_test';

const test = require('node:test');
const assert = require('node:assert/strict');
const Notification = require('../models/Notification');

const members = [
  { member_user_id: 1, role_name: 'owner' },
  { member_user_id: 2, role_name: 'manager' },
  { member_user_id: 2, role_name: 'manager' },
  { member_user_id: 3, role_name: 'courier' },
  { member_user_id: 4, role_name: 'courier' },
];

test('event recipients exclude the actor, deduplicate users, and only notify the assigned courier', () => {
  const recipients = Notification.resolveEventRecipients({
    ownerUserId: 1,
    event: 'assigned',
    actorUserId: 2,
    order: { id: 99, assigned_to: 3 },
    members,
  });

  assert.deepEqual(recipients, [
    { userId: 1, role: 'owner' },
    { userId: 3, role: 'courier' },
  ]);
  assert.equal(new Set(recipients.map(({ userId }) => userId)).size, recipients.length);
  assert.equal(recipients.some(({ userId }) => userId === 2), false);
  assert.equal(recipients.some(({ userId }) => userId === 4), false);
});

test('invitation notifications never go back to their author', () => {
  const recipients = Notification.resolveEventRecipients({
    ownerUserId: 10,
    event: 'invitation',
    actorUserId: 10,
    order: { memberUserId: 10 },
  });

  assert.deepEqual(recipients, []);
});

test('courier notification text names only the order number', () => {
  const payload = Notification.eventNotification('assigned', 'courier', {
    id: 7,
    custom_order_number: 'SM-2026-007',
    customer_name: 'Private Customer',
    customer_phone: '+10000000000',
    customer_address: 'Private Address',
  });

  assert.equal(payload.message, 'La commande SM-2026-007 vous a été assignée.');
  assert.doesNotMatch(payload.message, /Private Customer|10000000000|Private Address/);
});
