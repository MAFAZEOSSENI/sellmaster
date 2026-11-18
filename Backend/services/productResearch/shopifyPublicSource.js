const axios = require('axios');
const dns = require('node:dns').promises;
const https = require('node:https');
const { parseShopifyProductUrl, normalizeScrapedProduct } = require('../../utils/shopifyProductImport');

function isPublicIpv4(address) {
  const octets = String(address).split('.').map(Number);
  if (octets.length !== 4 || octets.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) return false;
  const [a, b, c] = octets;
  if (a === 0 || a === 10 || a === 127 || a >= 224) return false;
  if (a === 100 && b >= 64 && b <= 127) return false;
  if (a === 169 && b === 254) return false;
  if (a === 172 && b >= 16 && b <= 31) return false;
  if (a === 192 && (b === 168 || (b === 0 && c === 0) || (b === 88 && c === 99))) return false;
  if (a === 198 && ((b === 18 || b === 19) || (b === 51 && c === 100))) return false;
  if (a === 203 && b === 0 && c === 113) return false;
  return true;
}

async function fetchShopifyPublicProduct(url) {
  const parsed = parseShopifyProductUrl(url);
  if (!parsed) {
    const error = new Error('URL Shopify publique invalide.');
    error.statusCode = 422;
    throw error;
  }

  let resolved;
  try {
    resolved = await dns.lookup(parsed.shopDomain, { all: true, family: 4, verbatim: true });
  } catch (_) {
    const error = new Error('Le domaine Shopify public est inaccessible.');
    error.statusCode = 422;
    throw error;
  }
  const publicAddress = resolved.find((entry) => isPublicIpv4(entry.address))?.address;
  if (!publicAddress) {
    const error = new Error('Cette URL ne pointe pas vers une adresse publique autorisée.');
    error.statusCode = 422;
    throw error;
  }

  const agent = new https.Agent({
    keepAlive: false,
    lookup: (_hostname, options, callback) => {
      if (options?.all) callback(null, [{ address: publicAddress, family: 4 }]);
      else callback(null, publicAddress, 4);
    },
  });

  try {
    const response = await axios.get(
      `https://${parsed.shopDomain}/products/${encodeURIComponent(parsed.handle)}.json`,
      { timeout: 12000, maxRedirects: 0, httpsAgent: agent, headers: { Accept: 'application/json' } }
    );
    const product = normalizeScrapedProduct(response.data?.product);
    if (!product) {
      const error = new Error('Cette URL ne correspond pas à un produit Shopify public exploitable.');
      error.statusCode = 422;
      throw error;
    }

    const variants = product.variants || [];
    const firstPrice = variants.find((variant) => /^\d+(?:\.\d+)?$/.test(String(variant.price)))?.price;
    const canonicalUrl = `https://${parsed.shopDomain}/products/${encodeURIComponent(parsed.handle)}`;
    const firstImage = product.images[0] || null;
    return {
      sourceType: 'shopify_public',
      sourceKey: canonicalUrl,
      canonicalUrl,
      originalUrl: canonicalUrl,
      title: product.title,
      description: product.body_html || null,
      imageUrl: firstImage,
      price: firstPrice == null ? null : Number(firstPrice),
      currency: null,
      availability: 'unknown',
      observedAt: new Date(),
      reportedAt: null,
      metadata: {
        vendor: product.vendor || null,
        variants: variants.map((variant) => ({
          title: variant.title,
          price: variant.price,
          sku: variant.sku,
        })),
      },
    };
  } finally {
    agent.destroy();
  }
}

module.exports = { fetchShopifyPublicProduct, isPublicIpv4 };