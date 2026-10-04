const API_BASE = 'https://sellmaster-1.onrender.com/api';
const TOKEN_KEY = 'sellmaster_jwt';

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

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === 'SELLMASTER_API') {
    sendApi(message.path, message.method, message.body, sendResponse);
    return true;
  }

  if (message?.type === 'SELLMASTER_OPEN_OAUTH') {
    try {
      const url = new URL(message.url);
      if (url.protocol !== 'https:' || !/^[a-z0-9][a-z0-9-]*\.myshopify\.com$/i.test(url.hostname) || url.pathname !== '/admin/oauth/authorize') {
        throw new Error('URL Shopify refusée.');
      }
      chrome.tabs.create({ url: url.toString() }).then(() => sendResponse({ ok: true })).catch(error => sendResponse({ ok: false, error: error.message }));
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
