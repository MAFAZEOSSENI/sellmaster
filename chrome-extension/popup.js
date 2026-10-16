const API_BASE = 'https://sellmaster-1.onrender.com/api';
const TOKEN_KEY = 'sellmaster_jwt';
const USER_KEY = 'sellmaster_user';
const CONFIG_KEY = 'sellmaster_shopify_config';
const loginView = document.getElementById('login-view');
const accountView = document.getElementById('account-view');
const productImportView = document.getElementById('product-import-view');
const message = document.getElementById('message');
let activeProductUrl = '';

function getProductPageUrl(value) {
  try {
    const url = new URL(value);
    if (!['http:', 'https:'].includes(url.protocol)) return '';
    return /^\/products\/[^/]+\/?$/.test(url.pathname) ? url.toString() : '';
  } catch (_) {
    return '';
  }
}

async function detectActiveProductTab() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
    activeProductUrl = getProductPageUrl(tab?.url || '');
    productImportView.hidden = !activeProductUrl;
  } catch (_) {
    activeProductUrl = '';
    productImportView.hidden = true;
  }
}

function showMessage(text, kind) {
  message.textContent = text || '';
  message.className = `message${kind ? ` ${kind}` : ''}`;
}

function showAccount(user) {
  loginView.hidden = true;
  accountView.hidden = false;
  document.getElementById('account-email').textContent = user.email || 'Compte Sellmaster';
}

async function restoreSession() {
  const stored = await chrome.storage.local.get([TOKEN_KEY, USER_KEY]);
  if (!stored[TOKEN_KEY]) return;
  try {
    const response = await fetch(`${API_BASE}/auth/profile`, {
      headers: { Authorization: `Bearer ${stored[TOKEN_KEY]}`, Accept: 'application/json' },
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error('Session expirée. Reconnectez-vous.');
    const user = data.user || stored[USER_KEY] || {};
    await chrome.storage.local.set({ [USER_KEY]: user });
    showAccount(user);
  } catch (_) {
    await chrome.storage.local.remove([TOKEN_KEY, USER_KEY]);
    loginView.hidden = false;
    accountView.hidden = true;
  }
}

document.getElementById('login-form').addEventListener('submit', async event => {
  event.preventDefault();
  const button = document.getElementById('login-button');
  button.disabled = true;
  showMessage('Connexion...', '');
  try {
    const response = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        email: document.getElementById('email').value.trim(),
        password: document.getElementById('password').value,
      }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.token) throw new Error(data.error || 'Connexion Sellmaster impossible.');
    if (!Array.isArray(data.user?.roles) || !data.user.roles.includes('owner')) {
      throw new Error('Cette extension est réservée aux comptes owner.');
    }
    await chrome.storage.local.set({ [TOKEN_KEY]: data.token, [USER_KEY]: data.user });
    document.getElementById('password').value = '';
    showAccount(data.user);
    showMessage('Connexion réussie.', 'success');
  } catch (error) {
    showMessage(error.message || 'Erreur de connexion.', 'error');
  } finally {
    button.disabled = false;
  }
});

document.getElementById('logout').addEventListener('click', async () => {
  await chrome.storage.local.remove([TOKEN_KEY, USER_KEY]);
  accountView.hidden = true;
  loginView.hidden = false;
  showMessage('Session supprimée de cette extension.', 'success');
});

document.getElementById('open-dashboard').addEventListener('click', async () => {
  const stored = await chrome.storage.local.get(CONFIG_KEY);
  const appUrl = stored[CONFIG_KEY]?.appUrl || globalThis.DEFAULT_APP_URL;
  await chrome.tabs.create({ url: new URL(appUrl).toString() });
});

document.getElementById('open-ads-library').addEventListener('click', async () => {
  const url = new URL('https://www.facebook.com/ads/library/');
  url.searchParams.set('active_status', 'active');
  url.searchParams.set('ad_type', 'ALL');
  url.searchParams.set('country', 'FR');
  url.searchParams.set('q', 'myshopify');
  url.searchParams.set('search_type', 'keyword_unordered');
  url.searchParams.set('media_type', 'all');
  await chrome.tabs.create({ url: url.toString() });
  window.close();
});

document.getElementById('import-product').addEventListener('click', async () => {
  const productUrl = activeProductUrl || getProductPageUrl((await chrome.tabs.query({ active: true, lastFocusedWindow: true }))[0]?.url || '');
  if (!productUrl) {
    productImportView.hidden = true;
    showMessage('L’onglet actif ne correspond plus à une page produit.', 'error');
    return;
  }

  try {
    const stored = await chrome.storage.local.get(CONFIG_KEY);
    const appUrl = new URL(stored[CONFIG_KEY]?.appUrl || globalThis.DEFAULT_APP_URL);
    appUrl.searchParams.set('import', productUrl);
    await chrome.tabs.create({ url: appUrl.toString() });
    window.close();
  } catch (error) {
    showMessage(error.message || 'Impossible d’ouvrir Sellmaster.', 'error');
  }
});

detectActiveProductTab();
restoreSession();
