const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

let messageListener;
let mockResponse = { status: 200, body: { success: true } };
let mockNetworkError = null;
const requests = [];
const chrome = {
  runtime: { onMessage: { addListener(listener) { messageListener = listener; } } },
  storage: {
    local: { get: async () => ({ sellmaster_jwt: 'test-jwt' }), remove: async () => {} },
    session: { get: async () => ({}), set: async () => {} },
  },
  tabs: {
    onUpdated: { addListener() {} },
    create: async () => ({ id: 1 }),
    update: async () => ({}),
    remove: async () => {},
    sendMessage: async () => {},
  },
  downloads: { download: async () => 1 },
};

const context = {
  chrome,
  URL,
  console,
  Date,
  Math,
  Set,
  Map,
  importScripts() {},
  fetch: async (url, options) => {
    requests.push({ url: new URL(url), options });
    if (mockNetworkError) throw mockNetworkError;
    return {
      ok: mockResponse.status >= 200 && mockResponse.status < 300,
      status: mockResponse.status,
      json: async () => mockResponse.body,
    };
  },
};
vm.runInNewContext(fs.readFileSync(require.resolve('../background.js'), 'utf8'), context);

function sendApi(path, method, body) {
  return new Promise(resolve => {
    messageListener(
      { type: 'SELLMASTER_API', path, method, body },
      { tab: { url: 'https://www.facebook.com/ads/library/?q=test' } },
      resolve,
    );
  });
}

async function main() {
  let response = await sendApi('/product-research/ads/favorites', 'GET', {
    query: { limit: 100, cursor: '9223372036854775807' },
  });
  assert.equal(response.ok, true);
  assert.equal(requests.at(-1).url.searchParams.get('limit'), '100');
  assert.equal(requests.at(-1).url.searchParams.get('cursor'), '9223372036854775807');
  assert.equal(requests.at(-1).options.headers.Authorization, 'Bearer test-jwt');

  await sendApi('/product-research/ads', 'GET', { query: { platform: 'meta', limit: 100, cursor: '1234567890123456789' } });
  assert.equal(requests.at(-1).url.searchParams.get('platform'), 'meta');
  assert.equal(requests.at(-1).url.searchParams.get('cursor'), '1234567890123456789');

  mockResponse = { status: 207, body: { success: false, results: [{ externalAdId: '123', status: 'rejected' }] } };
  response = await sendApi('/product-research/ads/import', 'POST', { selectionConfirmed: true, ads: [] });
  assert.equal(response.ok, true);
  assert.equal(response.status, 207);
  assert.equal(response.data.success, false);

  mockResponse = { status: 200, body: { success: true, researchAdId: '9223372036854775807', alreadySaved: false } };
  response = await sendApi('/product-research/ads/favorites', 'POST', { ad: { externalAdId: '123' } });
  assert.equal(response.data.researchAdId, '9223372036854775807');

  await sendApi('/product-research/ads/9223372036854775807/favorite', 'DELETE');
  assert.equal(requests.at(-1).options.method, 'DELETE');

  for (const status of [400, 401, 403, 404, 409, 429, 500]) {
    mockResponse = { status, body: { error: `error-${status}` } };
    response = await sendApi('/product-research/ads/import', 'POST', {});
    assert.equal(response.ok, false);
    assert.equal(response.status, status);
    assert.equal(response.data.error, `error-${status}`);
  }

  const requestCount = requests.length;
  response = await sendApi('/product-research/ads/import', 'DELETE', {});
  assert.equal(response.ok, false);
  assert.equal(requests.length, requestCount, 'Disallowed method must not reach fetch.');
  response = await sendApi('/product-research/jobs/9/ads/ingest', 'POST', { ads: [] });
  assert.equal(response.ok, false, 'Legacy automatic-ingest route must not be callable from the extension.');
  assert.equal(requests.length, requestCount);

  response = await new Promise(resolve => {
    messageListener({ type: 'SELLMASTER_API', path: '/product-research/ads/favorites', method: 'GET' },
      { tab: { url: 'https://admin.shopify.com/store/example' } }, resolve);
  });
  assert.equal(response.ok, false, 'Product Research API must not be callable from Shopify pages.');
  assert.equal(response.status, 403);
  assert.equal(requests.length, requestCount);

  mockNetworkError = new Error('offline');
  response = await sendApi('/product-research/ads/favorites', 'GET', { query: { limit: 30 } });
  assert.equal(response.ok, false);
  assert.equal(response.status, 0);
  assert.equal(response.networkError, true);
  assert.match(response.error, /offline/);

  console.log('background API policy tests passed');
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});