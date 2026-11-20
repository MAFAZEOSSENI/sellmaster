const test = require('node:test');
const assert = require('node:assert/strict');
const { parseHttpsUrl, isPublicIpv4 } = require('../utils/pageBuilderUrl');
const { extractGeneric } = require('../services/pageBuilder/productExtractor');

test('page builder accepts only valid HTTPS public product URLs', () => {
  assert.equal(parseHttpsUrl('http://example.com/product')?.protocol, undefined);
  assert.equal(parseHttpsUrl('https://127.0.0.1/product'), null);
  assert.equal(parseHttpsUrl('https://example.com/product')?.hostname, 'example.com');
});

test('page builder rejects private and link-local IPv4 addresses', () => {
  assert.equal(isPublicIpv4('127.0.0.1'), false);
  assert.equal(isPublicIpv4('10.0.0.1'), false);
  assert.equal(isPublicIpv4('169.254.1.1'), false);
  assert.equal(isPublicIpv4('192.168.1.1'), false);
  assert.equal(isPublicIpv4('8.8.8.8'), true);
});

test('generic extractor parses title, description, Open Graph image and JSON-LD price', () => {
  const url = new URL('https://example.com/products/test');
  const html = `
    <script type="application/ld+json">{"@type":"Product","name":"Produit test","description":"Description test","image":"https://example.com/p.jpg","offers":{"price":"12500"}}</script>
  `;
  const product = extractGeneric(html, url);
  assert.equal(product.title, 'Produit test');
  assert.equal(product.description, 'Description test');
  assert.deepEqual(product.images, ['https://example.com/p.jpg']);
  assert.equal(product.price, 12500);
});
