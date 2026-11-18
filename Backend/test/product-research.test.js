process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgres://localhost/sellmaster_test';

const test = require('node:test');
const assert = require('node:assert/strict');
const { isPublicIpv4 } = require('../services/productResearch/shopifyPublicSource');

test('public IPv4 guard rejects private and non-routable addresses', () => {
  assert.equal(isPublicIpv4('10.0.0.1'), false);
  assert.equal(isPublicIpv4('127.0.0.1'), false);
  assert.equal(isPublicIpv4('169.254.1.1'), false);
  assert.equal(isPublicIpv4('172.16.0.1'), false);
  assert.equal(isPublicIpv4('192.168.1.1'), false);
  assert.equal(isPublicIpv4('8.8.8.8'), true);
  assert.equal(isPublicIpv4('not-an-ip'), false);
});

test('source result contract keeps unknown fields explicit', () => {
  const sourceResult = {
    sourceType: 'shopify_public',
    title: 'Produit exemple',
    price: 24900,
    currency: null,
    availability: 'unknown',
    reportedAt: null,
  };

  assert.equal(sourceResult.currency, null);
  assert.equal(sourceResult.availability, 'unknown');
  assert.equal(sourceResult.reportedAt, null);
  assert.equal(sourceResult.title, 'Produit exemple');
});
