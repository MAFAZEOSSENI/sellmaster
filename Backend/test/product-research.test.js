process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgres://localhost/sellmaster_test';

const test = require('node:test');
const assert = require('node:assert/strict');
const { isPublicIpv4 } = require('../services/productResearch/shopifyPublicSource');
const { normalizeAd, numericId } = require('../models/ResearchAd');

const validObservedAd = {
  platform: 'meta',
  externalAdId: '123456789',
  originalUrl: 'https://www.facebook.com/ads/library/?id=123456789',
  advertiserName: 'Annonceur observé',
  creativeUrl: 'https://video.xx.fbcdn.net/v/t39.35426-6/creative.jpg',
  videoUrl: 'https://video.xx.fbcdn.net/v/t39.25447-2/video.mp4',
  productImageUrl: 'https://cdn.shopify.com/s/files/1/product.jpg',
};

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

test('selected-ad validation requires Meta ID and an Ads Library URL', () => {
  assert.equal(normalizeAd(validObservedAd).value.externalAdId, '123456789');
  assert.match(normalizeAd({ ...validObservedAd, externalAdId: '' }).error, /Identifiant externe invalide/);
  assert.match(normalizeAd({ ...validObservedAd, externalAdId: Number.MAX_SAFE_INTEGER + 1 }).error, /Identifiant externe invalide/);
  assert.match(normalizeAd({ ...validObservedAd, originalUrl: 'https://evil.example/ads/library/?id=1' }).error, /Lien original/);
  assert.match(normalizeAd({ ...validObservedAd, platform: 'unknown' }).error, /Plateforme/);
});

test('Meta external ID must match the single ID query parameter in the original URL', () => {
  assert.equal(normalizeAd(validObservedAd).value.externalAdId, '123456789');
  assert.match(normalizeAd({ ...validObservedAd, originalUrl: 'https://www.facebook.com/ads/library/?id=987654321' }).error, /ne correspond pas/);
  assert.match(normalizeAd({ ...validObservedAd, originalUrl: 'https://www.facebook.com/ads/library/' }).error, /ne correspond pas/);
  assert.match(normalizeAd({ ...validObservedAd, originalUrl: 'not a URL' }).error, /Lien original/);
  assert.match(normalizeAd({ ...validObservedAd, originalUrl: 'https://evil.example/ads/library/?id=123456789' }).error, /Lien original/);
  assert.match(normalizeAd({ ...validObservedAd, originalUrl: 'https://user@www.facebook.com/ads/library/?id=123456789' }).error, /Lien original/);
  assert.equal(normalizeAd({
    ...validObservedAd,
    originalUrl: 'https://facebook.com/ads/library/?id=123456789',
  }).value.externalAdId, '123456789');
});

test('PostgreSQL BIGINT IDs stay exact as strings and unsafe numbers are rejected', () => {
  assert.equal(numericId('9223372036854775807'), '9223372036854775807');
  assert.equal(numericId('9223372036854775808'), null);
  assert.equal(numericId(Number.MAX_SAFE_INTEGER + 1), null);
  assert.equal(numericId('42'), '42');
});

test('ad media are validated and kept in separate fields', () => {
  const normalized = normalizeAd(validObservedAd).value;
  assert.match(normalized.creativeUrl, /fbcdn\.net/);
  assert.match(normalized.videoUrl, /fbcdn\.net/);
  assert.match(normalized.productImageUrl, /cdn\.shopify\.com/);
  assert.equal(normalizeAd({ ...validObservedAd, creativeUrl: 'https://cdn.shopify.com/product.jpg' }).error.includes('création'), true);
  assert.equal(normalizeAd({ ...validObservedAd, productImageUrl: 'https://evil.example/image.jpg' }).error.includes('produit'), true);
  assert.equal(normalizeAd({ ...validObservedAd, videoUrl: '' }).value.videoUrl, null);
  assert.equal(normalizeAd({ ...validObservedAd, creativeUrl: '', videoUrl: '' }).value.format, null);
});

test('selected-ad normalization preserves unknown dates and ignores submitted owner IDs', () => {
  const normalized = normalizeAd({
    ...validObservedAd,
    reportedLaunchAt: null,
    owner_user_id: 9999,
    metadata: { adCount: 12, pageCount: 4 },
  }).value;
  assert.equal(normalized.reportedLaunchAt, null);
  assert.equal(Object.hasOwn(normalized, 'owner_user_id'), false);
  assert.deepEqual(normalized.metadata.reportedByClient, { adCount: 12, pageCount: 4 });
  assert.equal(Object.hasOwn(normalized.metadata, 'adCount'), false);
  assert.equal(Object.hasOwn(normalized.metadata, 'pageCount'), false);
  assert.deepEqual(normalizeAd(validObservedAd).value.metadata.reportedByClient, { adCount: null, pageCount: null });
  assert.match(normalizeAd({ ...validObservedAd, metadata: { adCount: true } }).error, /compteurs rapportés/);
});
