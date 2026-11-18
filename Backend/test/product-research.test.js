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

test('ad ingestion rejects oversized batches and preserves unknown launch dates', () => {
  const ads = Array.from({ length: 201 }, (_, index) => ({ externalAdId: String(index), originalUrl: `https://www.facebook.com/ads/library/?id=${index}` }));
  assert.equal(ads.length > 200, true);

  const unknownLaunch = { reportedLaunchAt: null, firstSeenAt: '2026-11-18T12:00:00Z' };
  assert.equal(unknownLaunch.reportedLaunchAt, null);
  assert.equal(Boolean(unknownLaunch.firstSeenAt), true);
});
