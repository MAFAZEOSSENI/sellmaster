import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeRoles, getPrimaryRole, hasAnyRole, getAvailablePages, canManageProducts } from './roleRules.js';

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
