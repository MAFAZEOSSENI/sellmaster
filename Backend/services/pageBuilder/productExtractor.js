const axios = require('axios');
const https = require('node:https');
const dns = require('node:dns').promises;
const { assertSafePublicUrl } = require('../../utils/pageBuilderUrl');

function htmlEntities(value) {
  return String(value || '')
    .replace(/&nbsp;/gi, ' ').replace(/&amp;/gi, '&').replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'").replace(/&lt;/gi, '<').replace(/&gt;/gi, '>');
}

function metaContent(html, patterns) {
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match) return htmlEntities(match[1]).trim();
  }
  return '';
}

function detectSource(url) {
  const host = url.hostname.toLowerCase();
  if (host === 'www.alibaba.com' || host.endsWith('.alibaba.com')) return 'alibaba';
  if (/\.myshopify\.com$/i.test(host) || /\/products\//.test(url.pathname)) return 'shopify';
  return 'competitor';
}

async function fetchPinned(url) {
  const addresses = await dns.lookup(url.hostname, { all: true, verbatim: true });
  const publicIpv4 = addresses.find(({ address }) => !address.includes(':'))?.address;
  const agent = publicIpv4 ? new https.Agent({ keepAlive: false, lookup: (_hostname, options, callback) => {
    if (options?.all) callback(null, [{ address: publicIpv4, family: 4 }]);
    else callback(null, publicIpv4, 4);
  }}) : undefined;
  try {
    return await axios.get(url.toString(), {
      timeout: 15000,
      maxRedirects: 3,
      ...(agent ? { httpsAgent: agent } : {}),
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; SellMasterPageBuilder/1.0)', Accept: 'text/html,application/xhtml+xml' },
      validateStatus: (status) => status >= 200 && status < 400,
    });
  } finally {
    agent?.destroy();
  }
}

function extractJsonLd(html) {
  const objects = [];
  for (const match of html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>(.*?)<\/script>/gis)) {
    try {
      const parsed = JSON.parse(match[1].replace(/<!--|-->/g, ''));
      if (Array.isArray(parsed)) objects.push(...parsed);
      else if (parsed?.['@graph']) objects.push(...parsed['@graph']);
      else objects.push(parsed);
    } catch (_) {}
  }
  return objects.find((item) => /Product|Offer/i.test(String(item?.['@type'] || item?.type || ''))) || {};
}

function extractGeneric(html, url) {
  const ld = extractJsonLd(html);
  const title = ld.name || metaContent(html, [/property=["']og:title["'][^>]*content=["']([^"']+)/i, /<title[^>]*>([^<]+)/i]) || '';
  const description = ld.description || metaContent(html, [/property=["']og:description["'][^>]*content=["']([^"']+)/i, /name=["']description["'][^>]*content=["']([^"']+)/i]) || '';
  const imageUrl = Array.isArray(ld.image)
    ? ld.image[0]?.url || ld.image[0]
    : ld.image?.url || ld.image || metaContent(html, [/property=["']og:image["'][^>]*content=["']([^"']+)/i]);
  const offers = Array.isArray(ld.offers) ? ld.offers[0] : ld.offers;
  const price = offers?.price ?? ld.price ?? null;

  const images = [];
  const addImage = (value) => {
    if (typeof value !== 'string') return;
    const candidate = htmlEntities(value).trim();
    if (/^https:\/\//i.test(candidate) && !images.includes(candidate)) images.push(candidate);
  };

  if (Array.isArray(ld.image)) ld.image.forEach((item) => addImage(typeof item === 'string' ? item : item?.url));
  else addImage(typeof ld.image === 'string' ? ld.image : ld.image?.url);
  addImage(imageUrl);

  for (const match of html.matchAll(/(?:property=["']og:image(?::secure_url)?["']|name=["']twitter:image["'])[^>]*content=["']([^"']+)/gi)) addImage(match[1]);
  for (const match of html.matchAll(/(?:data-src|data-original|data-image|src)=["']([^"']+\.(?:jpg|jpeg|png|webp)(?:[?&#][^"']*)?)["']/gi)) addImage(match[1]);

  return {
    title: htmlEntities(title).trim().slice(0, 300),
    description: htmlEntities(description).trim().slice(0, 10000),
    images: [...new Set(images)].slice(0, 20),
    features: [],
    variants: [],
    price: price == null ? null : Number(price),
    supplier: ld.brand?.name || ld.brand || '',
    source_url: url.toString(),
  };
}

async function extractProduct(value) {
  const url = await assertSafePublicUrl(value);
  const sourceType = detectSource(url);

  if (sourceType === 'shopify') {
    const match = url.pathname.match(/^\/products\/([^/]+)\/?$/i);
    if (!match) throw new Error('Lien produit Shopify invalide');
    const response = await fetchPinned(new URL(`${url.origin}/products/${encodeURIComponent(match[1])}.json`));
    const product = response.data?.product;
    if (!product) throw new Error('Produit Shopify introuvable');

    const images = [...new Set((Array.isArray(product.images) ? product.images : [])
      .map((item) => typeof item === 'string' ? item : item?.src)
      .filter((item) => typeof item === 'string' && /^https:\/\//i.test(item)))]
      .slice(0, 20);
    const variants = (Array.isArray(product.variants) ? product.variants : []).map((item) => ({
      title: String(item.title || item.option1 || 'Default Title').trim() || 'Default Title',
      price: item.price == null ? null : Number(item.price),
      sku: item.sku == null ? '' : String(item.sku),
    })).slice(0, 100);

    return {
      title: String(product.title || '').trim(),
      description: typeof product.body_html === 'string' ? product.body_html : '',
      images,
      features: [],
      variants,
      price: variants[0]?.price == null ? null : variants[0].price,
      supplier: product.vendor || url.hostname,
      source_url: url.toString(),
      source_type: sourceType,
    };
  }

  const response = await fetchPinned(url);
  const html = typeof response.data === 'string' ? response.data : '';
  const product = extractGeneric(html, url);
  product.source_type = sourceType;
  if (!product.title && !product.description && !product.images.length) {
    throw new Error('Aucune donnée produit détectée. Utilisez l’import manuel.');
  }
  return product;
}

module.exports = { extractProduct, detectSource, extractGeneric };