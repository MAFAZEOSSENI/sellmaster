const API_BASE = 'https://sellmaster-1.onrender.com/api';
const TOKEN_KEY = 'sellmaster_jwt';
const OAUTH_TABS_KEY = 'sellmaster_oauth_tabs';

function sendApi(path, method, body, sendResponse) {
  const allowed = path === '/shopify/auth/start' || path === '/shopify/register-store-credentials';
  if (!allowed || !['GET', 'POST'].includes(method)) {
    sendResponse({ ok: false, error: 'Requête refusée par la politique de l’extension.' });
    return;
  }

  chrome.storage.local.get(TOKEN_KEY).then(async stored => {
    if (!stored[TOKEN_KEY]) throw new Error('Connectez-vous à Sellmaster depuis le popup de l’extension.');
    const url = new URL(API_BASE + path);
    if (method === 'GET' && body?.shopDomain) url.searchParams.set('shop', body.shopDomain);
    const response = await fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${stored[TOKEN_KEY]}`,
        Accept: 'application/json',
        ...(method === 'POST' ? { 'Content-Type': 'application/json' } : {}),
      },
      ...(method === 'POST' ? { body: JSON.stringify(body || {}) } : {}),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || `Sellmaster a répondu ${response.status}.`);
    sendResponse({ ok: true, data });
  }).catch(error => sendResponse({ ok: false, error: error.message || 'Erreur de connexion à Sellmaster.' }));
}

async function getShopifyProductDetails(productUrl) {
  const pageUrl = new URL(productUrl);
  if (pageUrl.protocol !== 'https:' || !/^[a-z0-9][a-z0-9-]*\.myshopify\.com$/i.test(pageUrl.hostname)) {
    throw new Error('URL de produit Shopify refusée.');
  }

  const segments = pageUrl.pathname.split('/').filter(Boolean);
  const productIndex = segments.findIndex(segment => segment.toLowerCase() === 'products');
  const handle = productIndex >= 0 ? segments[productIndex + 1] : '';
  if (!handle || handle.includes('.')) throw new Error('URL de fiche produit Shopify invalide.');

  const endpoint = new URL(`/products/${encodeURIComponent(decodeURIComponent(handle))}.js`, pageUrl.origin);
  const response = await fetch(endpoint, { headers: { Accept: 'application/json' } });
  if (!response.ok) throw new Error(`Shopify a répondu ${response.status}.`);
  const product = await response.json();
  const firstImage = Array.isArray(product.images) ? product.images[0] : '';
  const imageValue = product.featured_image || (typeof firstImage === 'string' ? firstImage : firstImage?.src) || '';
  let imageUrl = '';

  if (imageValue) {
    const parsedImageUrl = new URL(imageValue, pageUrl.origin);
    if (parsedImageUrl.protocol === 'https:' && (parsedImageUrl.hostname === 'cdn.shopify.com' || parsedImageUrl.hostname.endsWith('.myshopify.com'))) {
      imageUrl = parsedImageUrl.toString();
    }
  }

  return { title: typeof product.title === 'string' ? product.title : '', imageUrl };
}

async function validateSellmasterOwnerSession() {
  const stored = await chrome.storage.local.get([TOKEN_KEY]);
  if (!stored[TOKEN_KEY]) return { authenticated: false };

  const response = await fetch(`${API_BASE}/auth/profile`, {
    headers: { Authorization: `Bearer ${stored[TOKEN_KEY]}`, Accept: 'application/json' },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.user) {
    await chrome.storage.local.remove([TOKEN_KEY, 'sellmaster_user']);
    return { authenticated: false, reason: 'expired' };
  }

  await chrome.storage.local.set({ sellmaster_user: data.user });
  const isOwner = Array.isArray(data.user.roles) && data.user.roles.includes('owner');
  return { authenticated: isOwner, email: isOwner ? data.user.email || '' : '', reason: isOwner ? '' : 'owner-required' };
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === 'SELLMASTER_API') {
    sendApi(message.path, message.method, message.body, sendResponse);
    return true;
  }

  if (message?.type === 'SELLMASTER_GET_SHOPIFY_PRODUCT') {
    getShopifyProductDetails(message.productUrl)
      .then(data => sendResponse({ ok: true, data }))
      .catch(error => sendResponse({ ok: false, error: error.message || 'Impossible de récupérer les données produit Shopify.' }));
    return true;
  }

  if (message?.type === 'SELLMASTER_VALIDATE_ADS_SESSION') {
    if (_sender.tab?.url && !/^https:\/\/www\.facebook\.com\/ads\/library\//i.test(_sender.tab.url)) {
      sendResponse({ ok: false, error: 'Validation autorisée uniquement depuis Meta Ads Library.' });
      return false;
    }
    validateSellmasterOwnerSession()
      .then(session => sendResponse({ ok: true, data: session }))
      .catch(() => sendResponse({ ok: true, data: { authenticated: false, reason: 'unavailable' } }));
    return true;
  }

  if (message?.type === 'SELLMASTER_OPEN_OAUTH') {
    try {
      const url = new URL(message.url);
      if (url.protocol !== 'https:' || !/^[a-z0-9][a-z0-9-]*\.myshopify\.com$/i.test(url.hostname) || url.pathname !== '/admin/oauth/authorize') {
        throw new Error('URL Shopify refusée.');
      }
      chrome.tabs.create({ url: url.toString() }).then(async tab => {
        const stored = await chrome.storage.session.get(OAUTH_TABS_KEY);
        const oauthTabs = stored[OAUTH_TABS_KEY] || {};
        oauthTabs[tab.id] = { sourceTabId: sender.tab?.id, shop: url.hostname };
        await chrome.storage.session.set({ [OAUTH_TABS_KEY]: oauthTabs });
        sendResponse({ ok: true });
      }).catch(error => sendResponse({ ok: false, error: error.message }));
    } catch (error) {
      sendResponse({ ok: false, error: error.message });
    }
    return true;
  }

  if (message?.type === 'SELLMASTER_OPEN_DEV_DASHBOARD') {
    chrome.tabs.create({ url: 'https://dev.shopify.com/dashboard/' })
      .then(() => sendResponse({ ok: true }))
      .catch(error => sendResponse({ ok: false, error: error.message }));
    return true;
  }

  if (message?.type === 'SELLMASTER_OPEN_GRANT') {
    try {
      const url = new URL(message.url);
      if (url.protocol !== 'https:' || url.hostname !== 'admin.shopify.com' || !/^\/store\/[a-z0-9-]+\/app\/grant$/i.test(url.pathname) || !url.searchParams.get('client_id')) {
        throw new Error('URL d’autorisation Shopify refusée.');
      }
      chrome.tabs.create({ url: url.toString() })
        .then(() => sendResponse({ ok: true }))
        .catch(error => sendResponse({ ok: false, error: error.message }));
    } catch (error) {
      sendResponse({ ok: false, error: error.message });
    }
    return true;
  }

  return false;
});

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status !== 'complete') return;
  let destination;
  try {
    destination = new URL(changeInfo.url || tab.url);
  } catch (_) {
    return;
  }
  if (destination.origin !== 'https://www.sellmaster.site') return;

  const stored = await chrome.storage.session.get(OAUTH_TABS_KEY);
  const oauthTabs = stored[OAUTH_TABS_KEY] || {};
  const oauth = oauthTabs[tabId];
  if (!oauth) return;

  const outcome = destination.searchParams.get('shopify');
  if (!['connected', 'cancelled', 'error'].includes(outcome)) return;
  delete oauthTabs[tabId];
  await chrome.storage.session.set({ [OAUTH_TABS_KEY]: oauthTabs });
  if (!oauth.sourceTabId) return;

  chrome.tabs.sendMessage(oauth.sourceTabId, {
    type: 'SELLMASTER_OAUTH_RESULT',
    outcome,
    store: destination.searchParams.get('store') || oauth.shop,
    dashboardUrl: destination.toString(),
  }).catch(() => {});
});
