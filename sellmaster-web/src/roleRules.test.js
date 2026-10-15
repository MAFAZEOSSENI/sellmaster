import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeRoles, getPrimaryRole, hasAnyRole, getAvailablePages, canManageProducts, filterOrdersForRole } from './roleRules.js';

test('normalizeRoles lowercases and filters blanks', () => {
  assert.deepEqual(normalizeRoles(['Owner', ' Manager ', '', null, undefined]), ['owner', 'manager']);
});

test('primary role respects backend priority ordering', () => {
  assert.equal(getPrimaryRole(['closer', 'manager']), 'closer');
  assert.equal(getPrimaryRole(['owner', 'manager']), 'owner');
  assert.equal(getPrimaryRole([]), 'owner');
});

test('courier has no product access and restricted pages', () => {
  assert.equal(hasAnyRole(['courier'], 'owner', 'manager', 'closer'), false);
  assert.equal(canManageProducts(['courier']), false);
  assert.deepEqual(getAvailablePages(['courier']), ['overview', 'orders', 'team']);
});

test('owner and manager keep all pages and allow product management', () => {
  assert.equal(hasAnyRole(['owner'], 'owner', 'manager'), true);
  assert.equal(hasAnyRole(['manager'], 'owner', 'manager'), true);
  assert.equal(canManageProducts(['manager']), true);
  assert.deepEqual(getAvailablePages(['owner']), ['overview', 'orders', 'products', 'shopify', 'team']);
});

test('closer can access products', () => {
  assert.equal(canManageProducts(['closer']), true);
  assert.deepEqual(getAvailablePages(['closer']), ['overview', 'orders', 'products', 'team']);
});

const orders = [
  { id: 1, assigned_to: 20, status: 'dashboard' },
  { id: 2, assigned_to: 20, status: 'reportee' },
  { id: 3, assigned_to: 20, status: 'livree' },
  { id: 4, assigned_to: 21, status: 'dashboard' },
  { id: 5, assigned_to: null, status: 'dashboard' },
  { id: 6, assigned_to: null, status: 'reportee' },
  { id: 7, assigned_to: 20, status: 'annulee' },
];

test('courier sees only assigned orders in dashboard, reportee or livree status', () => {
  assert.deepEqual(
    filterOrdersForRole(orders, ['courier'], 20).map((order) => order.id),
    [1, 2, 3],
  );
});

test('closer sees unassigned and own dashboard/reportee orders only', () => {
  assert.deepEqual(
    filterOrdersForRole(orders, ['closer'], '20').map((order) => order.id),
    [1, 2, 5, 6],
  );
});

test('owner and manager see all orders without filtering', () => {
  assert.deepEqual(filterOrdersForRole(orders, ['owner'], 20), orders);
  assert.deepEqual(filterOrdersForRole(orders, ['manager'], 20), orders);
});
