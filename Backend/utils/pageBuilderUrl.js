const dns = require('node:dns').promises;

function isPublicIpv4(address) {
  const octets = String(address).split('.').map(Number);
  if (octets.length !== 4 || octets.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) return false;
  const [a, b, c] = octets;
  if (a === 0 || a === 10 || a === 127 || a >= 224) return false;
  if (a === 100 && b >= 64 && b <= 127) return false;
  if (a === 169 && b === 254) return false;
  if (a === 172 && b >= 16 && b <= 31) return false;
  if (a === 192 && b === 168) return false;
  if (a === 192 && b === 0 && c === 2) return false;
  if (a === 198 && (b === 18 || b === 19)) return false;
  if (a === 198 && b === 51 && c === 100) return false;
  if (a === 203 && b === 0 && c === 113) return false;
  return true;
}

function parseHttpsUrl(value) {
  try {
    const url = new URL(String(value || '').trim());
    if (url.protocol !== 'https:' || url.username || url.password || url.port) return null;
    if (!/^([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/i.test(url.hostname)) return null;
    return url;
  } catch (_) {
    return null;
  }
}

async function assertSafePublicUrl(value) {
  const url = parseHttpsUrl(value);
  if (!url) throw new Error('URL HTTPS publique invalide');
  const addresses = await dns.lookup(url.hostname, { all: true, verbatim: true });
  if (!addresses.length || !addresses.some(({ address }) => {
    if (address.includes(':')) {
      const normalized = address.toLowerCase();
      return !(normalized === '::1' || normalized.startsWith('fc') || normalized.startsWith('fd') || normalized.startsWith('fe80'));
    }
    return isPublicIpv4(address);
  })) throw new Error('Cette URL ne pointe pas vers une ressource publique sécurisée');
  return url;
}

module.exports = { parseHttpsUrl, assertSafePublicUrl, isPublicIpv4 };