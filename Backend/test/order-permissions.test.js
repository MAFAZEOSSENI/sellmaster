const test = require('node:test');
const assert = require('node:assert/strict');
const { canTransitionOrderStatus, canViewOrderForRole } = require('../utils/orderPermissions');

test('only couriers are limited to the delivered status', () => {
  assert.deepEqual(
    ['dashboard', 'livree', 'annulee', 'reportee'].filter(status => canTransitionOrderStatus('courier', status)),
    ['livree'],
  );
  assert.equal(canTransitionOrderStatus('owner', 'annulee'), true);
  assert.equal(canTransitionOrderStatus('manager', 'reportee'), true);
  assert.equal(canTransitionOrderStatus('closer', 'dashboard'), true);
  assert.equal(canTransitionOrderStatus('unknown', 'livree'), false);
});

test('couriers only see their assigned open and delivered orders', () => {
  const assignedOpen = { assigned_to: 7, status: 'dashboard' };
  const assignedDelivered = { assigned_to: 7, status: 'livree' };
  const someoneElses = { assigned_to: 8, status: 'dashboard' };
  const assignedCancelled = { assigned_to: 7, status: 'annulee' };

  assert.equal(canViewOrderForRole(assignedOpen, 'courier', 7), true);
  assert.equal(canViewOrderForRole(assignedDelivered, 'courier', 7), true);
  assert.equal(canViewOrderForRole(someoneElses, 'courier', 7), false);
  assert.equal(canViewOrderForRole(assignedCancelled, 'courier', 7), false);
});

test('closers see unassigned or their own active orders, not closed or other assigned orders', () => {
  assert.equal(canViewOrderForRole({ assigned_to: null, status: 'dashboard' }, 'closer', 7), true);
  assert.equal(canViewOrderForRole({ assigned_to: 7, status: 'reportee' }, 'closer', 7), true);
  assert.equal(canViewOrderForRole({ assigned_to: 8, status: 'dashboard' }, 'closer', 7), false);
  assert.equal(canViewOrderForRole({ assigned_to: null, status: 'annulee' }, 'closer', 7), false);
});

test('owners and managers retain visibility across order statuses', () => {
  const archived = { assigned_to: 8, status: 'annulee' };
  assert.equal(canViewOrderForRole(archived, 'owner', 7), true);
  assert.equal(canViewOrderForRole(archived, 'manager', 7), true);
  assert.equal(canViewOrderForRole(archived, 'unknown', 7), false);
});
