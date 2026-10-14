function normalizeShopHost(value) {
  const text = String(value || '').trim().toLowerCase();
  if (!text) return '';

  try {
    const url = new URL(/^[a-z][a-z0-9+.-]*:\/\//i.test(text) ? text : `https://${text}`);
    return url.hostname.replace(/^www\./, '').replace(/\.$/, '');
  } catch {
    return text.replace(/^https?:\/\//, '').split(/[/?#]/, 1)[0].replace(/^www\./, '').replace(/\.$/, '');
  }
}

function getShopAliases(values = []) {
  return [...new Set(values.map(normalizeShopHost).filter(Boolean))];
}

function getCanonicalShopDomain(shopInfo = {}, fallback = '') {
  const candidates = [
    shopInfo.myshopify_domain,
    shopInfo.myshopifyDomain,
    shopInfo.domain,
    shopInfo.primary_domain?.host,
    shopInfo.primary_domain,
    fallback,
  ];
  return candidates.map(normalizeShopHost).find((host) => host.endsWith('.myshopify.com')) || '';
}

module.exports = { normalizeShopHost, getShopAliases, getCanonicalShopDomain };
