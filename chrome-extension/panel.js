(() => {
  'use strict';
  if (document.getElementById('sellmaster-shopify-connector')) return;

  const host = document.createElement('div');
  host.id = 'sellmaster-shopify-connector';
  document.documentElement.appendChild(host);
  const shadow = host.attachShadow({ mode: 'closed' });

  const style = document.createElement('style');
  style.textContent = `
    :host{all:initial;color:#183139;font-family:system-ui,-apple-system,"Segoe UI",sans-serif}
    *{box-sizing:border-box}
    .launcher{position:fixed;z-index:2147483000;right:20px;bottom:20px;border:0;border-radius:999px;background:#087f83;color:#fff;padding:13px 18px;font:700 14px system-ui,sans-serif;box-shadow:0 8px 28px #0003;cursor:pointer}
    .panel{position:fixed;z-index:2147483001;right:20px;bottom:78px;width:min(370px,calc(100vw - 28px));background:#fff;border:1px solid #d8e4e2;border-radius:14px;box-shadow:0 18px 55px #092b2b30;overflow:hidden;color:#183139}
    .hidden{display:none!important}.head{display:flex;justify-content:space-between;align-items:center;padding:15px 17px;background:#f3f8f7;border-bottom:1px solid #e0e9e8}.brand{font-size:14px;font-weight:800}.close{border:0;background:transparent;color:#52686c;font-size:23px;line-height:1;cursor:pointer}.body{padding:16px}.intro{margin:0 0 12px;color:#63777b;font-size:12px;line-height:1.45}
    .switch{display:grid;grid-template-columns:1fr 1fr;padding:3px;background:#edf3f2;border-radius:9px;margin:0 0 14px}.switch button{border:0;border-radius:7px;padding:8px;background:transparent;color:#596e72;font:700 12px system-ui,sans-serif;cursor:pointer}.switch button.active{background:#fff;color:#075e64;box-shadow:0 1px 4px #153c3b1a}
    label{display:block;margin:11px 0 5px;font:700 12px system-ui,sans-serif;color:#34494d}.fieldrow{display:flex;gap:6px}input{width:100%;height:39px;min-width:0;border:1px solid #cbd9d7;border-radius:8px;padding:0 10px;background:#fff;color:#193337;font:13px system-ui,sans-serif;outline:none}input:focus{border-color:#087f83;box-shadow:0 0 0 3px #087f8318}.paste{width:39px;flex:none;border:1px solid #d3e0de;border-radius:8px;background:#f5f8f8;color:#31595a;font-size:16px;cursor:pointer}.connect{width:100%;height:42px;margin-top:15px;border:0;border-radius:8px;background:#087f83;color:#fff;font:750 13px system-ui,sans-serif;cursor:pointer}.connect:disabled{opacity:.6;cursor:wait}.message{min-height:18px;margin:11px 0 0;color:#5e7376;font:12px/1.45 system-ui,sans-serif}.message.error{color:#b42318}.message.success{color:#11724b}.needs-login{padding:12px;border-radius:8px;background:#fff7e6;color:#73510b;font-size:12px;line-height:1.45}.hint{margin:10px 0 0;color:#75878a;font-size:11px;line-height:1.4}
    @media(max-width:480px){.panel{right:12px;bottom:68px}.launcher{right:12px;bottom:12px}}
  `;
  style.textContent += '.setup-app{width:100%;min-height:40px;margin-top:10px;border:1px solid #cbd9d7;border-radius:8px;background:#f3f8f7;color:#075e64;font:700 12px system-ui,sans-serif;cursor:pointer}.setup-app:disabled{opacity:.6;cursor:wait}';

  const panel = document.createElement('section');
  panel.className = 'panel hidden';
  panel.innerHTML = `
    <div class="head"><span class="brand">Connecteur Sellmaster</span><button class="close" type="button" aria-label="Fermer">×</button></div>
    <div class="body">
      <p class="intro">Associez cette boutique Shopify à votre espace Sellmaster.</p>
      <div class="needs-login hidden">Connectez-vous à votre compte owner Sellmaster depuis le popup de l’extension, puis rouvrez ce panneau.</div>
      <div class="connector hidden">
        <div class="switch" role="tablist" aria-label="Mode de connexion">
          <button type="button" data-mode="auto" class="active">Auto</button>
          <button type="button" data-mode="manual">Manuel</button>
        </div>
        <label for="shop-domain">Boutique Shopify</label>
        <input id="shop-domain" type="text" autocomplete="url" placeholder="ma-boutique.myshopify.com">
        <div class="manual hidden">
          <label for="client-id">API Key (Client ID)</label>
          <div class="fieldrow"><input id="client-id" type="text" autocomplete="off" placeholder="Client ID de l’app Shopify"><button class="paste" type="button" data-paste="client-id" title="Coller">▣</button></div>
          <label for="client-secret">Secret</label>
          <div class="fieldrow"><input id="client-secret" type="password" autocomplete="new-password" placeholder="Client Secret de l’app Shopify"><button class="paste" type="button" data-paste="client-secret" title="Coller">▣</button></div>
          <p class="hint">Le secret est transmis directement à Sellmaster, puis effacé de ce panneau. Il n’est pas enregistré dans l’extension.</p>
        </div>
        <button class="setup-app" type="button">Créer une app dédiée automatiquement</button>
        <button class="connect" type="button">Continuer avec Shopify</button>
        <p class="message" role="status" aria-live="polite"></p>
      </div>
    </div>`;
  const launcher = document.createElement('button');
  launcher.className = 'launcher';
  launcher.type = 'button';
  launcher.textContent = 'Connecteur Sellmaster';
  shadow.append(style, launcher, panel);

  const loginNotice = panel.querySelector('.needs-login');
  const connector = panel.querySelector('.connector');
  const manualSection = panel.querySelector('.manual');
  const message = panel.querySelector('.message');
  const connectButton = panel.querySelector('.connect');
  const setupAppButton = panel.querySelector('.setup-app');
  const shopInput = panel.querySelector('#shop-domain');
  let mode = 'auto';

  function detectShop() {
    const hostName = window.location.hostname.toLowerCase();
    if (/^[a-z0-9][a-z0-9-]*\.myshopify\.com$/.test(hostName)) return hostName;
    if (hostName === 'admin.shopify.com') {
      const match = window.location.pathname.match(/^\/store\/([^/]+)/i);
      if (match && /^[a-z0-9][a-z0-9-]*$/i.test(match[1])) return `${match[1]}.myshopify.com`;
    }
    return '';
  }

  function notify(text, type) {
    message.textContent = text || '';
    message.className = `message${type ? ` ${type}` : ''}`;
  }

  function sendToBackground(payload) {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(payload, response => {
        const runtimeError = chrome.runtime.lastError;
        if (runtimeError) return reject(new Error(runtimeError.message));
        if (!response?.ok) return reject(new Error(response?.error || 'Erreur de communication.'));
        resolve(response.data || response);
      });
    });
  }

  async function initialize() {
    const stored = await chrome.storage.local.get(['sellmaster_jwt', 'sellmaster_user']);
    const user = stored.sellmaster_user || {};
    const loggedIn = Boolean(stored.sellmaster_jwt && Array.isArray(user.roles) && user.roles.includes('owner'));
    loginNotice.classList.toggle('hidden', loggedIn);
    connector.classList.toggle('hidden', !loggedIn);
    shopInput.value = detectShop();
  }

  launcher.addEventListener('click', () => panel.classList.toggle('hidden'));
  panel.querySelector('.close').addEventListener('click', () => panel.classList.add('hidden'));

  panel.querySelectorAll('[data-mode]').forEach(button => button.addEventListener('click', () => {
    mode = button.dataset.mode;
    panel.querySelectorAll('[data-mode]').forEach(item => item.classList.toggle('active', item === button));
    manualSection.classList.toggle('hidden', mode !== 'manual');
    setupAppButton.classList.toggle('hidden', mode !== 'auto');
    notify(mode === 'auto' ? 'Utilise les credentials déjà enregistrés pour cette boutique ou l’app partagée en fallback.' : '', '');
  }));

  setupAppButton.addEventListener('click', async () => {
    const shopDomain = shopInput.value.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/$/, '');
    const normalized = shopDomain.endsWith('.myshopify.com') ? shopDomain : `${shopDomain}.myshopify.com`;
    if (!/^[a-z0-9][a-z0-9-]*\.myshopify\.com$/.test(normalized)) {
      notify('Impossible de détecter la boutique. Saisis son domaine .myshopify.com.', 'error');
      return;
    }
    setupAppButton.disabled = true;
    try {
      await chrome.storage.local.set({
        sellmaster_pending_app_setup: {
          shopDomain: normalized,
          storeHandle: normalized.replace(/\.myshopify\.com$/, ''),
          appName: 'Connecteur Sellmaster',
          step: 'create',
          autoRun: false,
          createdAt: Date.now(),
        },
      });
      await sendToBackground({ type: 'SELLMASTER_OPEN_DEV_DASHBOARD' });
      notify('Dashboard développeur ouvert. Sélectionne ton organisation Shopify, puis clique sur Auto-remplir.', 'success');
    } catch (error) {
      notify(error.message || 'Impossible d’ouvrir le dashboard développeur.', 'error');
    } finally {
      setupAppButton.disabled = false;
    }
  });

  panel.querySelectorAll('[data-paste]').forEach(button => button.addEventListener('click', async () => {
    try {
      const value = await navigator.clipboard.readText();
      panel.querySelector(`#${button.dataset.paste}`).value = value;
      notify('Valeur collée.', 'success');
    } catch (_) {
      notify('Collage bloqué par Chrome : utilise Ctrl+V / Cmd+V dans le champ.', 'error');
    }
  }));

  connectButton.addEventListener('click', async () => {
    const shopDomain = shopInput.value.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/$/, '');
    const normalized = shopDomain.endsWith('.myshopify.com') ? shopDomain : `${shopDomain}.myshopify.com`;
    if (!/^[a-z0-9][a-z0-9-]*\.myshopify\.com$/.test(normalized)) {
      notify('Nom de boutique invalide. Utilise le domaine .myshopify.com.', 'error');
      return;
    }

    connectButton.disabled = true;
    notify('Préparation de la connexion...', '');
    try {
      if (mode === 'manual') {
        const clientId = panel.querySelector('#client-id').value.trim();
        const clientSecret = panel.querySelector('#client-secret').value;
        if (!clientId || !clientSecret) throw new Error('Renseigne l’API Key et le Secret de l’app Shopify.');
        await sendToBackground({
          type: 'SELLMASTER_API',
          path: '/shopify/register-store-credentials',
          method: 'POST',
          body: { shopDomain: normalized, clientId, clientSecret },
        });
        panel.querySelector('#client-secret').value = '';
      }

      const result = await sendToBackground({
        type: 'SELLMASTER_API',
        path: '/shopify/auth/start',
        method: 'GET',
        body: { shopDomain: normalized },
      });
      await sendToBackground({ type: 'SELLMASTER_OPEN_OAUTH', url: result.url });
      notify('La page d’autorisation Shopify a été ouverte dans un nouvel onglet.', 'success');
    } catch (error) {
      notify(error.message || 'La connexion Shopify n’a pas pu démarrer.', 'error');
    } finally {
      connectButton.disabled = false;
    }
  });

  initialize().catch(() => {
    loginNotice.classList.remove('hidden');
    connector.classList.add('hidden');
  });
})();
