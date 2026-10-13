const test = require('node:test');
const assert = require('node:assert/strict');
const {
  parseShopifyProductUrl,
  normalizeScrapedProduct,
  normalizeImportPayload,
} = require('../utils/shopifyProductImport');

test('accepts only HTTPS Shopify product URLs with a valid handle', () => {
  assert.deepEqual(parseShopifyProductUrl('https://shop-name.myshopify.com/products/item-1?variant=123'), {
    shopDomain: 'shop-name.myshopify.com',
    handle: 'item-1',
  });
  assert.equal(parseShopifyProductUrl('http://shop-name.myshopify.com/products/item-1'), null);
  assert.equal(parseShopifyProductUrl('https://example.com/collections/all'), null);
    assert.equal(parseShopifyProductUrl('https://shop-name.myshopify.com/collections/all'), null);
    assert.equal(parseShopifyProductUrl('https://shop-name.myshopify.com/products/a%2Fb'), null);
    assert.deepEqual(parseShopifyProductUrl('https://shop.example.com/products/item_2/'), {
      shopDomain: 'shop.example.com',
      handle: 'item_2',
    });
    assert.equal(parseShopifyProductUrl('https://127.0.0.1/products/item'), null);
    assert.equal(parseShopifyProductUrl('https://shop.localhost/products/item'), null);
});

test('normalizes public Shopify product fields', () => {
  assert.deepEqual(normalizeScrapedProduct({
    title: ' Item ',
    body_html: '<p>Details</p>',
    vendor: 'Brand',
    images: [{ src: 'https://cdn.shopify.com/item.jpg' }, { src: 'http://invalid.test/image.jpg' }],
    variants: [{ title: 'Blue', price: '12.50', sku: 'BLUE-1' }],
  }), {
    title: 'Item',
    body_html: '<p>Details</p>',
    vendor: 'Brand',
    images: ['https://cdn.shopify.com/item.jpg'],
    variants: [{ title: 'Blue', price: '12.50', sku: 'BLUE-1' }],
  });
  assert.equal(normalizeScrapedProduct({ title: '' }), null);
});

test('validates and normalizes import payload, with a default variant when absent', () => {
  const result = normalizeImportPayload({
    title: 'Imported item',
    description: '<p>Description</p>',
    price: '14.9',
    images: ['https://cdn.shopify.com/item.jpg'],
  });
  assert.deepEqual(result.value, {
    title: 'Imported item',
    description: '<p>Description</p>',
    price: '14.90',
    images: ['https://cdn.shopify.com/item.jpg'],
    variants: [{ title: 'Default Title', price: '14.90' }],
  });
  assert.equal(normalizeImportPayload({ title: 'X', price: 0 }).error, 'Le prix doit être supérieur à zéro.');
  assert.match(normalizeImportPayload({ title: 'X', price: 2, images: ['http://invalid.test/x.jpg'] }).error, /URL HTTPS/);
  assert.match(normalizeImportPayload({ title: 'X', price: 2, variants: [{ title: 'Blue', price: 'NaN' }] }).error, /variantes/);
});
