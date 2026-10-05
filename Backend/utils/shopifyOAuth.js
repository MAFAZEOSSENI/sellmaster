const crypto = require('crypto');

function verifyShopifyOAuthHmac(query, secret) {
  const providedHmac = query?.hmac;
  if (typeof providedHmac !== 'string' || !/^[a-f0-9]{64}$/i.test(providedHmac) || !secret) {
    return false;
  }

  const entries = Object.entries(query)
    .filter(([key]) => key !== 'hmac' && key !== 'signature')
    .sort(([left], [right]) => left.localeCompare(right));
  if (entries.some(([, value]) => typeof value !== 'string')) return false;

  const message = entries.map(([key, value]) => `${key}=${value}`).join('&');
  const expectedHmac = crypto.createHmac('sha256', secret).update(message).digest();
  const actualHmac = Buffer.from(providedHmac, 'hex');
  return actualHmac.length === expectedHmac.length && crypto.timingSafeEqual(actualHmac, expectedHmac);
}

module.exports = { verifyShopifyOAuthHmac };