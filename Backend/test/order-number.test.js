const test = require('node:test');
const assert = require('node:assert/strict');
const { formatCustomOrderNumber } = require('../utils/orderNumber');

test('formats new order numbers as SM-year-six-digit sequence', () => {
  assert.equal(formatCustomOrderNumber(2026, 1), 'SM-2026-000001');
  assert.equal(formatCustomOrderNumber('2026', '123'), 'SM-2026-000123');
  assert.equal(formatCustomOrderNumber(2026, 1000000), 'SM-2026-1000000');
});

test('rejects invalid year or sequence values', () => {
  assert.throws(() => formatCustomOrderNumber(1999, 1), /Année invalide/);
  assert.throws(() => formatCustomOrderNumber(10000, 1), /Année invalide/);
  assert.throws(() => formatCustomOrderNumber(2026, 0), /Séquence invalide/);
  assert.throws(() => formatCustomOrderNumber(2026, Number.MAX_SAFE_INTEGER + 1), /Séquence invalide/);
});
