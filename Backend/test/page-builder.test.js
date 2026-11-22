const test = require('node:test');
const assert = require('node:assert/strict');
const { parseHttpsUrl, isPublicIpv4 } = require('../utils/pageBuilderUrl');
const { extractGeneric } = require('../services/pageBuilder/productExtractor');
const { getAiConfig } = require('../services/pageBuilder/aiConfig');
const { stripAndParseJson, withGeminiRetry } = require('../services/pageBuilder/aiProvider');

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

test('Gemini configuration uses centralized environment defaults', () => {
  const previous = { ...process.env };
  delete process.env.GOOGLE_AI_API_KEY;
  delete process.env.GEMINI_TEXT_MODEL;
  delete process.env.GEMINI_IMAGE_MODEL;
  const config = getAiConfig();
  assert.equal(config.provider, 'gemini');
  assert.equal(config.textModel, 'gemini-3.5-flash-lite');
  assert.equal(config.imageModel, 'gemini-nano-banana-2.1');
  assert.equal(stripAndParseJson('{"commercialName":"Produit"}').commercialName, 'Produit');
  process.env = previous;
});

test('Gemini retries a temporary server error and returns the successful response', async () => {
  let attempts = 0;
  const result = await withGeminiRetry(async () => {
    attempts += 1;
    if (attempts === 1) throw Object.assign(new Error('Temporary upstream error'), { status: 502 });
    return 'success';
  }, { model: 'test-model', delayMs: 0 });

  assert.equal(result, 'success');
  assert.equal(attempts, 2);
});

test('Gemini does not retry client errors', async () => {
  let attempts = 0;
  await assert.rejects(() => withGeminiRetry(async () => {
    attempts += 1;
    throw Object.assign(new Error('Invalid request'), { status: 400 });
  }, { delayMs: 0 }), /Invalid request/);

  assert.equal(attempts, 1);
});

test('Shopify extractor preserves the full gallery and variant data', () => {
  const images = Array.from({ length: 9 }, (_, index) => `https://cdn.shopify.com/image-${index + 1}.jpg`);
  const product = {
    title: 'Gel Réparateur de Cicatrices',
    body_html: '<p>Crème hydratante et assouplissante.</p>',
    vendor: 'Sellmaster Test',
    images: images.map((src) => ({ src })),
    variants: [{ title: 'Default Title', price: '10900', sku: 'GL-001' }],
  };

  const normalizedImages = [...new Set(product.images.map((item) => item.src))].slice(0, 20);
  assert.equal(normalizedImages.length, 9);
  assert.equal(normalizedImages[8], 'https://cdn.shopify.com/image-9.jpg');
  assert.equal(product.body_html, '<p>Crème hydratante et assouplissante.</p>');
  assert.equal(product.variants[0].sku, 'GL-001');
});
