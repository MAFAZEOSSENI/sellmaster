const test = require('node:test');
const assert = require('node:assert/strict');
const {
  normalizeShopHost,
  getShopAliases,
  getCanonicalShopDomain,
} = require('../utils/shopifyStoreIdentity');

test('normalizes URL, scheme, path, case and www into comparable hosts', () => {
  assert.equal(normalizeShopHost('HTTPS://WWW.Shop.Example.com/admin'), 'shop.example.com');
  assert.equal(normalizeShopHost('shop.example.com/'), 'shop.example.com');
});

test('deduplicates aliases and resolves Shopify canonical shop domain', () => {
  assert.deepEqual(getShopAliases([
    'https://store.myshopify.com/admin',
    'store.myshopify.com',
    'www.store-example.com',
    'https://store-example.com',
  ]), ['store.myshopify.com', 'store-example.com']);
  assert.equal(getCanonicalShopDomain({
    myshopify_domain: 'store.myshopify.com',
    domain: 'store-example.com',
    primary_domain: { host: 'www.store-example.com' },
  }), 'store.myshopify.com');
});

test('falls back to the callback shop domain when Shopify shop info is unavailable', () => {
  assert.equal(getCanonicalShopDomain({}, 'store.myshopify.com'), 'store.myshopify.com');
  assert.equal(getCanonicalShopDomain({}, 'custom-domain.example'), '');
});
