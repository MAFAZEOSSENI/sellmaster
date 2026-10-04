const CONFIG_KEY = 'sellmaster_shopify_config';
const appUrlInput = document.getElementById('app-url');
const redirectInput = document.getElementById('redirect-uri');
const status = document.getElementById('status');

const DEFAULT_APP_URL = 'https://sellmaster-1ca2f.web.app';
const DEFAULT_REDIRECT_URI = 'https://sellmaster-1.onrender.com/api/shopify/auth/callback';

chrome.storage.local.get(CONFIG_KEY).then(result => {
  const config = result[CONFIG_KEY] || {};
  appUrlInput.value = config.appUrl || DEFAULT_APP_URL;
  redirectInput.value = config.redirectUri || DEFAULT_REDIRECT_URI;
});

document.getElementById('save').addEventListener('click', async () => {
  const appUrl = appUrlInput.value.trim();
  const redirectUri = redirectInput.value.trim();
  try {
    const app = new URL(appUrl);
    const redirect = new URL(redirectUri);
    if (app.protocol !== 'https:' || redirect.protocol !== 'https:') throw new Error('Les deux URL doivent utiliser HTTPS.');
    if (/^https?:\/\/example\.com$/i.test(app.toString()) || /^https?:\/\/example\.com\/?$/i.test(app.toString())) {
      throw new Error('L’App URL placeholder example.com est invalide pour Shopify. Utilise la vraie URL de production.');
    }
    if (/^https?:\/\/example\.com$/i.test(redirect.toString()) || /^https?:\/\/example\.com\/?$/i.test(redirect.toString())) {
      throw new Error('Le Redirect URI placeholder example.com est invalide. Utilise le callback Shopify réel.');
    }
    await chrome.storage.local.set({ [CONFIG_KEY]: { appUrl: app.toString().replace(/\/$/, ''), redirectUri: redirect.toString() } });
    status.textContent = 'Configuration enregistrée.';
  } catch (error) {
    status.textContent = error.message || 'URL invalide.';
  }
});
