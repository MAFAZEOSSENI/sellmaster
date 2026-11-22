const test = require('node:test');
const assert = require('node:assert/strict');
const { parseHttpsUrl, isPublicIpv4 } = require('../utils/pageBuilderUrl');
const { extractGeneric } = require('../services/pageBuilder/productExtractor');
const { getAiConfig } = require('../services/pageBuilder/aiConfig');
const { stripAndParseJson, withGeminiRetry } = require('../services/pageBuilder/aiProvider');
const { buildShopifyPageHtml } = require('../utils/pageBuilderHtml');
const { normalizeAidaCopy } = require('../utils/pageBuilderAida');
const { resolvePageVisual } = require('../utils/pageBuilderVisuals');

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

test('Alibaba extraction keeps product gallery images and ignores checkout/payment assets', () => {
  const url = new URL('https://www.alibaba.com/product-detail/test_123.html');
  const html = `
    <meta property="og:title" content="Product test">
    <meta property="og:image" content="https://sc04.alicdn.com/kf/product-cover.jpg">
    <div class="product-gallery">
      <img data-src="https://sc04.alicdn.com/kf/product-side.jpg" alt="Product test">
      <img src="https://img.alicdn.com/imgextra/i1/product-detail.png" alt="Product detail">
    </div>
    <footer>
      <img src="https://img.alicdn.com/tfs/paypal-logo.png" alt="PayPal">
      <img src="https://img.alicdn.com/tfs/mastercard-logo.png" alt="Mastercard">
      <img src="https://static.example.test/card-security.jpg" alt="Secure checkout">
    </footer>`;

  const product = extractGeneric(html, url);

  assert.deepEqual(product.images, [
    'https://sc04.alicdn.com/kf/product-cover.jpg',
    'https://sc04.alicdn.com/kf/product-side.jpg',
    'https://img.alicdn.com/imgextra/i1/product-detail.png',
  ]);

  const paymentImageOnly = extractGeneric(`
    <meta property="og:title" content="Product test">
    <meta property="og:image" content="https://img.alicdn.com/tfs/paypal-logo.png">`, url);
  assert.deepEqual(paymentImageOnly.images, []);
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

test('Shopify page HTML renders AIDA sections in order with their matching images', () => {
  const html = buildShopifyPageHtml({
    title: 'Produit test',
    content_json: {
      copy: { sections: [
        { id: 'hero', stage: 'attention', title: 'Attirer', imageType: 'hero' },
        { id: 'interest', stage: 'interest', title: 'Intéresser', imageType: 'lifestyle' },
        { id: 'desire', stage: 'desire', title: 'Donner envie', imageType: 'benefit' },
        { id: 'action', stage: 'action', title: 'Agir', imageType: 'offer', cta: 'Commander' },
      ] },
      generatedAssets: {
        hero: 'https://cdn.example/hero.jpg',
        lifestyle: 'https://cdn.example/lifestyle.jpg',
        benefit: 'https://cdn.example/benefit.jpg',
        offer: 'https://cdn.example/offer.jpg',
      },
      offer: { price: 8500 },
    },
  });

  assert.ok(html.indexOf('ATTENTION') < html.indexOf('INTÉRÊT'));
  assert.ok(html.indexOf('INTÉRÊT') < html.indexOf('DÉSIR'));
  assert.ok(html.indexOf('DÉSIR') < html.indexOf('ACTION'));
  assert.match(html, /src="https:\/\/cdn\.example\/lifestyle\.jpg"/);
  assert.match(html, /src="https:\/\/cdn\.example\/benefit\.jpg"/);
  assert.match(html, /src="https:\/\/cdn\.example\/offer\.jpg"/);
});

test('page visual selection supports original images and Gemini images per section', () => {
  const page = { content_json: {
    sourceImages: ['https://source.example/one.jpg', 'https://source.example/two.jpg'],
    generatedAssets: { hero: '/uploads/page-builder/hero.png' },
    visualSources: {
      hero: { source: 'generated' },
      lifestyle: { source: 'original', imageIndex: 1 },
    },
  } };

  assert.equal(resolvePageVisual(page, { imageType: 'hero' }), 'https://sellmaster-1.onrender.com/uploads/page-builder/hero.png');
  assert.equal(resolvePageVisual(page, { imageType: 'lifestyle' }), 'https://source.example/two.jpg');
});

test('AIDA normalization restores canonical stage order and image types', () => {
  const result = normalizeAidaCopy({ sections: [
    { id: 'action', stage: 'wrong', imageType: 'hero', title: 'Commander' },
    { id: 'hero', title: 'Découvrir' },
  ] });

  assert.equal(result.framework, 'AIDA');
  assert.deepEqual(result.sections.map(({ id, stage, imageType }) => [id, stage, imageType]), [
    ['hero', 'attention', 'hero'],
    ['interest', 'interest', 'lifestyle'],
    ['desire', 'desire', 'benefit'],
    ['action', 'action', 'offer'],
  ]);
  assert.equal(result.sections[3].title, 'Commander');
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
