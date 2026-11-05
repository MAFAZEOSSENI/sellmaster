const assert = require('node:assert/strict');
const vm = require('node:vm');

const sandbox = { console, Date, Map, Set, URL, Math, Intl, Number, Boolean, Array, Object, String };
vm.runInNewContext(`
  const COD_PATTERN = /paiement\s+a\s+la\s+(?:livraison|reception)|payez\s+a\s+la\s+(?:livraison|reception)|livraison\s+gratuite|cash\s+on\s+delivery|cod\b/i;
  const LOCAL_CURRENCY_PATTERN = /\b(?:fcfa|cfa|xof|xaf)\b/i;
  const WEIGHTS = { days: 10, ads: 14, pages: 6, cod: 8, local: 5, soldOut: 40 };

  function ingestAd(products, item) {
    const key = item.productPageUrl || item.adLibraryUrl || item.store || item.page || item.product;
    const entry = products.get(key);

    if (!entry) {
      products.set(key, {
        ...item,
        libraryIds: new Set([item.libraryId || item.adLibraryUrl]),
        pages: new Set([item.page || 'Page non détectée']),
        codMention: Boolean(item.codMention),
        localCurrency: Boolean(item.localCurrency),
        startedAt: item.startedAt instanceof Date ? item.startedAt : new Date(item.startedAt || 0),
      });
      return;
    }

    if (item.libraryId) entry.libraryIds.add(item.libraryId);
    if (item.page) entry.pages.add(item.page);
    entry.codMention = entry.codMention || Boolean(item.codMention);
    entry.localCurrency = entry.localCurrency || Boolean(item.localCurrency);
    if (item.store && !entry.store) entry.store = item.store;
    if (item.product && (!entry.product || entry.product === 'Nom non détecté')) entry.product = item.product;
    if (item.adImageUrl && !entry.adImageUrl) entry.adImageUrl = item.adImageUrl;
    if (item.videoUrl && !entry.videoUrl) entry.videoUrl = item.videoUrl;
    if (item.startedAt instanceof Date && (!entry.startedAt || item.startedAt < entry.startedAt)) {
      Object.assign(entry, { ...item, libraryIds: entry.libraryIds, pages: entry.pages, codMention: entry.codMention, localCurrency: entry.localCurrency, startedAt: item.startedAt });
    }
  }

  function winnerScore(item) {
    const startedAt = item?.startedAt instanceof Date ? item.startedAt.getTime() : Number(item?.startedAt) || 0;
    const days = Math.max(0, Math.floor((Date.now() - startedAt) / 86400000));
    const adCount = Math.max(1, Number(item?.adCount || item?.libraryIds?.size || 1));
    const pageCount = Math.max(1, Number(item?.pageCount || item?.pages?.size || 1));
    let score =
      Math.log2(1 + Math.max(0, days)) * WEIGHTS.days +
      Math.log2(1 + adCount) * WEIGHTS.ads +
      (pageCount > 1 ? WEIGHTS.pages : 0) +
      (item?.codMention ? WEIGHTS.cod : 0) +
      (item?.localCurrency ? WEIGHTS.local : 0);
    if (item?.available === false) score -= WEIGHTS.soldOut;
    return Math.round(score);
  }

  function rankProducts(products) {
    return [...products.values()]
      .map(({ libraryIds, pages, ...rest }) => {
        const item = { ...rest, adCount: Math.max(1, libraryIds?.size || 1), pageCount: Math.max(1, pages?.size || 1) };
        return { ...item, score: winnerScore(item) };
      })
      .sort((left, right) => right.score - left.score || (left.startedAt - right.startedAt));
  }

  this.COD_PATTERN = COD_PATTERN;
  this.LOCAL_CURRENCY_PATTERN = LOCAL_CURRENCY_PATTERN;
  this.WEIGHTS = WEIGHTS;
  this.ingestAd = ingestAd;
  this.winnerScore = winnerScore;
  this.rankProducts = rankProducts;
`, sandbox);

const startedAt = Date.now() - 18 * 24 * 60 * 60 * 1000;
const products = new Map();
const first = { productPageUrl: 'https://shop.example.com/products/alpha', adLibraryUrl: 'https://www.facebook.com/ads/library/?id=1', libraryId: '1', page: 'Page A', startedAt, codMention: true, localCurrency: true, available: true };
const second = { productPageUrl: 'https://shop.example.com/products/alpha', adLibraryUrl: 'https://www.facebook.com/ads/library/?id=2', libraryId: '2', page: 'Page B', startedAt: startedAt - 2 * 86400000, codMention: false, localCurrency: true, available: true };

sandbox.ingestAd(products, first);
sandbox.ingestAd(products, second);

const ranked = sandbox.rankProducts(products);
assert.equal(ranked.length, 1, 'Products should deduplicate by canonical product URL');
assert.equal(ranked[0].adCount, 2, 'Aggregate publication count should include both ads');
assert.equal(ranked[0].pageCount, 2, 'Aggregate page count should include both pages');
assert.ok(ranked[0].score > 0, 'Winner score should be positive for active ads');
assert.ok(sandbox.winnerScore({ startedAt, adCount: 2, pageCount: 2, codMention: true, localCurrency: true, available: true }) >= 70, 'Winner score should reflect cod, local currency, ads and active age');
const normalizedCodText = 'Paiement à la livraison'.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
assert.equal(sandbox.COD_PATTERN.test(normalizedCodText), true, 'COD pattern should detect local wording after text normalization');
assert.equal(sandbox.LOCAL_CURRENCY_PATTERN.test('Prix en FCFA'), true, 'Local currency detection should detect CFA');

console.log('ads aggregation test passed');
