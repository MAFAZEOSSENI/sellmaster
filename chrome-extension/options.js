const CONFIG_KEY = 'sellmaster_shopify_config';
const appUrlInput = document.getElementById('app-url');
const redirectInput = document.getElementById('redirect-uri');
const status = document.getElementById('status');

chrome.storage.local.get(CONFIG_KEY).then(result => {
  const config = result[CONFIG_KEY] || {};
  appUrlInput.value = config.appUrl || '';
  redirectInput.value = config.redirectUri || '';
});

document.getElementById('save').addEventListener('click', async () => {
  const appUrl = appUrlInput.value.trim();
  const redirectUri = redirectInput.value.trim();
  try {
    const app = new URL(appUrl);
    const redirect = new URL(redirectUri);
    if (app.protocol !== 'https:' || redirect.protocol !== 'https:') throw new Error('Les deux URL doivent utiliser HTTPS.');
    await chrome.storage.local.set({ [CONFIG_KEY]: { appUrl: app.toString().replace(/\/$/, ''), redirectUri: redirect.toString() } });
    status.textContent = 'Configuration enregistrée.';
  } catch (error) {
    status.textContent = error.message || 'URL invalide.';
  }
});
