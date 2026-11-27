const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const sandbox = { globalThis: {}, URL, Date };
vm.runInNewContext(fs.readFileSync(require.resolve('../selection-state.js'), 'utf8'), sandbox);
const {
	createSelectionState,
	normalizeLibraryId,
	buildAdPayload,
	chunkItems,
	isImportSettled,
	mergeDetectedAd,
} = sandbox.globalThis.SellmasterAdSelection;

const state = createSelectionState();
assert.equal(normalizeLibraryId(' 90071992547409931234 '), '90071992547409931234');
assert.equal(normalizeLibraryId('not-an-id'), '');
assert.equal(state.set('123', true), true);
assert.equal(state.set('123', true), true);
assert.equal(state.set('456', true), true);
assert.equal(state.ids().join(','), '123,456');
assert.equal(state.selectAll(['456', '789', 'bad']), 3);
assert.equal(state.has('789'), true);
state.remove(['456', '789']);
assert.equal(state.ids().join(','), '123');
state.clear();
assert.equal(state.size, 0);

const manyIds = Array.from({ length: 201 }, (_, index) => String(index + 1));
const batches = chunkItems(manyIds, 200);
assert.equal(batches.length, 2);
assert.equal(batches[0].length, 200);
assert.equal(batches[1].length, 1);
assert.equal(isImportSettled('created'), true);
assert.equal(isImportSettled('existing'), true);
assert.equal(isImportSettled('rejected'), false);
assert.equal(isImportSettled('error'), false);

const mergedCardRecord = mergeDetectedAd({
	libraryId: '123',
	adImageUrl: 'https://scontent.xx.fbcdn.net/old-ad.jpg',
	videoUrl: 'https://video.xx.fbcdn.net/old-video.mp4',
	imageUrl: 'https://cdn.shopify.com/product.jpg',
	productImageUrl: 'https://cdn.shopify.com/product.jpg',
}, {
	libraryId: '123',
	adImageUrl: '',
	videoUrl: '',
	imageUrl: '',
	productImageUrl: '',
});
assert.equal(mergedCardRecord.adImageUrl, 'https://scontent.xx.fbcdn.net/old-ad.jpg');
assert.equal(mergedCardRecord.videoUrl, 'https://video.xx.fbcdn.net/old-video.mp4');
assert.equal(mergedCardRecord.productImageUrl, 'https://cdn.shopify.com/product.jpg');

state.set('999', true);
assert.equal(state.has('999'), true, 'Selection state survives when the card DOM is absent.');
assert.equal(state.has('1000'), false, 'A recycled card with a different library ID gets a fresh selection state.');
state.clear();
assert.equal(state.size, 0, 'A new search clears selection explicitly.');

const payload = buildAdPayload({
	libraryId: '123456789',
	adLibraryUrl: 'https://www.facebook.com/ads/library/?id=123456789',
	adImageUrl: 'https://scontent.xx.fbcdn.net/ad-image.jpg',
	videoUrl: 'https://video.xx.fbcdn.net/ad-video.mp4',
	productImageUrl: 'https://cdn.shopify.com/s/files/1/product.jpg',
	imageUrl: 'https://cdn.shopify.com/s/files/1/product.jpg',
	productPageUrl: 'https://shop.example/products/item',
	page: 'Annonceur',
	product: 'Produit',
});
assert.equal(payload.externalAdId, '123456789');
assert.equal(payload.originalUrl, 'https://www.facebook.com/ads/library/?id=123456789');
assert.equal(payload.creativeUrl, 'https://scontent.xx.fbcdn.net/ad-image.jpg');
assert.equal(payload.productImageUrl, 'https://cdn.shopify.com/s/files/1/product.jpg');
assert.equal(payload.videoUrl, 'https://video.xx.fbcdn.net/ad-video.mp4');
assert.equal(Object.hasOwn(payload.metadata, 'adCount'), false);
assert.equal(Object.hasOwn(payload.metadata, 'pageCount'), false);
assert.equal(buildAdPayload({ libraryId: '123', adLibraryUrl: 'https://www.facebook.com/ads/library/?id=456' }), null);
assert.equal(buildAdPayload({ libraryId: '123', adLibraryUrl: 'https://www.facebook.com/ads/library/' }), null);
assert.equal(buildAdPayload({ libraryId: '123', adLibraryUrl: 'https://evil.example/ads/library/?id=123' }), null);

console.log('selection state tests passed');