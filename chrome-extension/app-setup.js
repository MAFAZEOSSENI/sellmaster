(() => {
  'use strict';
  const SELECTORS = globalThis.SellmasterShopifySelectors;
  if (!SELECTORS || document.getElementById('sellmaster-app-setup')) return;

  const PENDING_KEY = 'sellmaster_pending_app_setup';
  const CONFIG_KEY = 'sellmaster_shopify_config';
  const TOKEN_KEY = 'sellmaster_jwt';
  const USER_KEY = 'sellmaster_user';
  const API_SCOPE_KEYS = ['read_orders', 'write_orders', 'read_products', 'read_customers', 'read_inventory'];
  const LABELS = {
    read_orders: ['read orders', 'read all orders'],
    write_orders: ['write orders', 'create and edit orders', 'manage orders'],
    read_products: ['read products', 'read product'],
    read_customers: ['read customers', 'read customer'],
    read_inventory: ['read inventory', 'read stock'],
  };
  const SCOPE_CSV = API_SCOPE_KEYS.join(',');

  let running = false;

  const host = document.createElement('div');
  host.id = 'sellmaster-app-setup';
  document.documentElement.appendChild(host);
  const shadow = host.attachShadow({ mode: 'closed' });
  const style = document.createElement('style');
  style.textContent = ':host{all:initial;font-family:system-ui,-apple-system,"Segoe UI",sans-serif;color:#183139}*{box-sizing:border-box}.launcher{position:fixed;z-index:2147483000;right:20px;bottom:20px;border:0;border-radius:999px;background:#087f83;color:#fff;padding:13px 18px;font:700 14px system-ui,sans-serif;box-shadow:0 8px 28px #0003;cursor:pointer}.panel{position:fixed;z-index:2147483001;right:20px;bottom:78px;width:min(390px,calc(100vw - 28px));background:white;border:1px solid #d8e4e2;border-radius:14px;box-shadow:0 18px 55px #092b2b30;overflow:hidden}.hidden{display:none!important}.head{padding:14px 16px;background:#f3f8f7;border-bottom:1px solid #e0e9e8;font-size:14px;font-weight:800}.body{padding:15px}.copy{margin:0 0 10px;color:#63777b;font:12px/1.45 system-ui,sans-serif}.button{width:100%;height:41px;border:0;border-radius:8px;background:#087f83;color:#fff;font:750 13px system-ui,sans-serif;cursor:pointer}.button:disabled{opacity:.6;cursor:wait}.message{min-height:18px;margin:10px 0 0;color:#63777b;font:12px/1.45 system-ui,sans-serif}.error{color:#b42318}.success{color:#11724b}';
  const launcher = document.createElement('button');
  launcher.className = 'launcher';
  launcher.type = 'button';
  launcher.textContent = 'Connecteur Sellmaster';
  const panel = document.createElement('section');
  panel.className = 'panel hidden';
  panel.innerHTML = '<div class="head">Création automatique d’app Shopify</div><div class="body"><p class="copy">L’assistant crée l’app, configure les accès et les URLs, puis enregistre les identifiants dans Sellmaster.</p><button class="button" type="button">Auto-remplir</button><p class="message" role="status" aria-live="polite"></p></div>';
  shadow.append(style, launcher, panel);
  const button = panel.querySelector('.button');
  const message = panel.querySelector('.message');

  function send(messageObject) {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(messageObject, response => {
        const error = chrome.runtime.lastError;
        if (error) return reject(new Error(error.message));
        if (!response?.ok) return reject(new Error(response?.error || 'Erreur de communication avec Sellmaster.'));
        resolve(response.data || response);
      });
    });
  }

  function status(text, kind) {
    message.textContent = text || '';
    message.className = `message${kind ? ` ${kind}` : ''}`;
  }

  function visible(element) {
    return Boolean(element && element.getClientRects().length && getComputedStyle(element).visibility !== 'hidden');
  }

  function findFirst(selectorList, root = document) {
    for (const selector of selectorList || []) {
      const found = Array.from(root.querySelectorAll(selector)).find(visible);
      if (found) return found;
    }
    return null;
  }

  function findButton(selectorList, includesText) {
    const candidates = [];
    (selectorList || []).forEach(selector => candidates.push(...document.querySelectorAll(selector)));
    const phrase = String(includesText || '').toLowerCase();
    return candidates.find(element => visible(element) && (!phrase || `${element.innerText || ''} ${element.getAttribute('aria-label') || ''}`.toLowerCase().includes(phrase))) || null;
  }

  function findScopePicker() {
    const semanticSelectors = SELECTORS.access.scopePickerButtons.filter(selector => selector !== 'button' && selector !== '[role="button"]');
    return findButton(SELECTORS.access.scopePickerButtons, 'scope') || findFirst(semanticSelectors);
  }

  function waitForScopePicker(timeoutMs = 45000) {
    return new Promise((resolve, reject) => {
      const started = Date.now();
      const timer = setInterval(() => {
        const picker = findScopePicker();
        if (picker) {
          clearInterval(timer);
          resolve(picker);
        } else if (Date.now() - started > timeoutMs) {
          clearInterval(timer);
          reject(new Error('Menu “Select scopes” introuvable. Vérifie les sélecteurs du scope dans selectors.js.'));
        }
      }, 350);
    });
  }

  function waitForHidden(selectorList, timeoutMs = 5000) {
    return new Promise((resolve, reject) => {
      const started = Date.now();
      const timer = setInterval(() => {
        if (!findFirst(selectorList)) {
          clearInterval(timer);
          resolve();
        } else if (Date.now() - started > timeoutMs) {
          clearInterval(timer);
          reject(new Error('Le menu des scopes Shopify ne s’est pas fermé.'));
        }
      }, 100);
    });
  }

  function waitFor(selectorList, timeoutMs = 45000) {
    return new Promise((resolve, reject) => {
      const started = Date.now();
      const timer = setInterval(() => {
        const element = findFirst(selectorList);
        if (element) {
          clearInterval(timer);
          resolve(element);
        } else if (Date.now() - started > timeoutMs) {
          clearInterval(timer);
          reject(new Error('Élément Shopify introuvable. Mets à jour les sélecteurs dans selectors.js.'));
        }
      }, 350);
    });
  }

  function setValue(element, value) {
    const prototype = element instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    const setter = Object.getOwnPropertyDescriptor(prototype, 'value')?.set;
    if (setter) setter.call(element, value); else element.value = value;
    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
  }

  function orgIdFromUrl() {
    const match = window.location.pathname.match(/^\/dashboard\/(?:[^/]+\/)?(\d+)(?:\/|$)/i)
      || window.location.pathname.match(/^\/dashboard\/(\d+)(?:\/|$)/i);
    return match ? match[1] : '';
  }

  function storeHandle(shopDomain) {
    return String(shopDomain || '').toLowerCase().replace(/\.myshopify\.com$/, '').split('.')[0];
  }

  async function updatePending(patch) {
    const stored = await chrome.storage.local.get(PENDING_KEY);
    const current = stored[PENDING_KEY] || {};
    const next = { ...current, ...patch, updatedAt: Date.now() };
    await chrome.storage.local.set({ [PENDING_KEY]: next });
    return next;
  }

  async function requireOwnerSession() {
    const stored = await chrome.storage.local.get([TOKEN_KEY, USER_KEY]);
    if (!stored[TOKEN_KEY] || !Array.isArray(stored[USER_KEY]?.roles) || !stored[USER_KEY].roles.includes('owner')) {
      throw new Error('Connecte-toi comme owner dans le popup Sellmaster avant de continuer.');
    }
  }

  function findScopeOption(scope) {
    const labels = [scope, scope.replace(/_/g, '-'), scope.replace(/_/g, ' '), ...(LABELS[scope] || [])]
      .map(value => value.toLowerCase());
    const options = [];
    SELECTORS.access.scopeOptions.forEach(selector => {
      options.push(...document.querySelectorAll(selector.replaceAll('{scope}', scope)));
    });
    return options.find(option => {
      if (!visible(option)) return false;
      const text = `${option.innerText || ''} ${option.getAttribute('aria-label') || ''}`.trim().toLowerCase();
      return labels.some(label => text === label || text.startsWith(`${label} `) || text.includes(` ${label} `));
    }) || null;
  }

  function scopeMenuOpen() {
    return Boolean(findFirst(SELECTORS.access.scopeDropdowns) || findFirst(SELECTORS.access.scopeOptions));
  }

  function waitForScopeOption(scope, timeoutMs = 12000) {
    return new Promise((resolve, reject) => {
      const started = Date.now();
      const timer = setInterval(() => {
        const option = findScopeOption(scope);
        if (option) {
          clearInterval(timer);
          resolve(option);
        } else if (Date.now() - started > timeoutMs) {
          clearInterval(timer);
          reject(new Error(`Option du scope ${scope} introuvable dans le menu Shopify.`));
        }
      }, 250);
    });
  }

  async function ensureScopes() {
    const picker = await waitForScopePicker();
    picker.click();

    const listInput = SELECTORS.access.scopeListInputs
      .flatMap(selector => Array.from(document.querySelectorAll(selector)))
      .find(element => visible(element) && !/search|query/i.test([
        element.name,
        element.id,
        element.getAttribute('aria-label'),
        element.placeholder
      ].join(' ')));
    if (listInput) {
      const openDialog = findFirst(SELECTORS.access.scopeDropdowns);
      if (openDialog) {
        const closeButton = findFirst(SELECTORS.access.scopeDialogCloseButtons, openDialog);
        if (!closeButton) throw new Error('Bouton de fermeture du menu des scopes introuvable dans selectors.js.');
        closeButton.click();
        await waitForHidden(SELECTORS.access.scopeDropdowns);
      }
      setValue(listInput, SCOPE_CSV);
      return;
    }

    for (const scope of API_SCOPE_KEYS) {
      if (!scopeMenuOpen()) {
        const pickerButton = await waitForScopePicker();
        pickerButton.click();
      }
      const searchInput = findFirst(SELECTORS.access.scopeSearchInputs)
        || (picker.matches('input, textarea') && visible(picker) ? picker : null)
        || await waitFor(SELECTORS.access.scopeSearchInputs);
      setValue(searchInput, scope);
      const option = await waitForScopeOption(scope);
      const optionControl = option.matches('label') ? option.control
        : option.matches('input[type="checkbox"]') ? option
          : option.querySelector('input[type="checkbox"]');
      const alreadySelected = optionControl?.checked === true
        || option.getAttribute('aria-selected') === 'true'
        || option.getAttribute('aria-checked') === 'true'
        || option.getAttribute('data-state') === 'checked';
      if (!alreadySelected) option.click();
    }
  }

  async function navigateToMatchingControl(selectorList, buttonSelectors, text) {
    if (findFirst(selectorList)) return;
    const navigation = findButton(buttonSelectors, text);
    if (navigation) navigation.click();
    await waitFor(selectorList);
  }

  async function runAutomation() {
    if (running) return;
    running = true;
    button.disabled = true;
    try {
      await requireOwnerSession();
      const { [PENDING_KEY]: pending, [CONFIG_KEY]: config } = await chrome.storage.local.get([PENDING_KEY, CONFIG_KEY]);
      if (!pending?.shopDomain || !pending?.storeHandle) throw new Error('Aucune création Shopify en attente. Lance-la depuis la boutique Shopify.');
      if (!config?.appUrl || !config?.redirectUri) throw new Error('Configure App URL et Redirect URI dans les options de l’extension.');
      if (/^https?:\/\/example\.com/i.test(config.appUrl) || /^https?:\/\/example\.com/i.test(config.redirectUri)) {
        throw new Error('Valeur placeholder Shopify détectée: remplace example.com par l’URL réelle de production (App URL + Redirect URI).');
      }
      const orgId = orgIdFromUrl() || pending.orgId;
      if (!orgId) throw new Error('Sélectionne d’abord ton organisation dans le dashboard Shopify Developer, puis clique à nouveau sur Auto-remplir.');
      if (window.location.pathname !== `/dashboard/${orgId}/apps/new` && pending.step === 'create') {
        await updatePending({ orgId, step: 'create', autoRun: true });
        status('Ouverture de la page de création...', '');
        window.location.assign(`https://dev.shopify.com/dashboard/${encodeURIComponent(orgId)}/apps/new`);
        return;
      }

      let state = pending;
      if (state.step === 'create') {
        status('Remplissage du nom et création de l’app...', '');
        const nameInput = await waitFor(SELECTORS.appCreate.nameInputs);
        setValue(nameInput, state.appName || 'Connecteur Sellmaster');
        const createButton = findButton(SELECTORS.appCreate.createButtons, 'create') || findButton(SELECTORS.appCreate.createButtons, 'créer');
        if (!createButton) throw new Error('Bouton de création introuvable dans selectors.js.');
        state = await updatePending({ orgId, step: 'configure' });
        createButton.click();
      }

      if (['access', 'settings', 'configure'].includes(state.step)) {
        status('Configuration des accès et des URLs Shopify...', '');
        state = await updatePending({ step: 'configure' });
        await ensureScopes();
        const appUrlInput = await waitFor(SELECTORS.settings.appUrlInputs);
        const redirectInput = await waitFor(SELECTORS.settings.redirectInputs);
        setValue(appUrlInput, config.appUrl);
        setValue(redirectInput, config.redirectUri);
        state = await updatePending({ step: 'publish' });
        const save = findButton(SELECTORS.settings.saveButtons, 'save') || findButton(SELECTORS.settings.saveButtons, 'enregistrer');
        if (save) save.click();
      }

      if (state.step === 'publish') {
        status('Publication d’une version Shopify...', '');
        const publish = findButton(SELECTORS.settings.publishButtons, 'publish') || findButton(SELECTORS.settings.publishButtons, 'release') || findButton(SELECTORS.settings.publishButtons, 'publier');
        if (!publish) throw new Error('Bouton de publication introuvable. Corrige selectors.js pour l’interface Shopify actuelle.');
        state = await updatePending({ step: 'publish_confirm' });
        publish.click();
      }

      if (state.step === 'publish_confirm') {
        const confirmPublish = await waitFor(SELECTORS.settings.publishConfirmButtons, 8000).catch(() => null);
        state = await updatePending({ step: 'credentials' });
        if (confirmPublish) confirmPublish.click();
      }

      if (state.step === 'credentials') {
        status('Lecture du Client ID et génération du secret...', '');
        const settingsTab = findButton(SELECTORS.settings.settingsTab, 'settings') || findButton(SELECTORS.settings.settingsTab, 'paramètres');
        if (settingsTab) settingsTab.click();
        const clientIdInput = await waitFor(SELECTORS.settings.clientIdInputs);
        const clientId = String(clientIdInput.value || clientIdInput.textContent || '').trim();
        if (!clientId) throw new Error('Client ID vide. Corrige le sélecteur correspondant dans selectors.js.');
        const rotate = findButton(SELECTORS.settings.rotateSecretButtons, 'rotate') || findButton(SELECTORS.settings.rotateSecretButtons, 'generate') || findButton(SELECTORS.settings.rotateSecretButtons, 'générer');
        if (!rotate) throw new Error('Bouton de génération du secret introuvable.');
        rotate.click();
        const confirmRotate = await waitFor(SELECTORS.settings.rotateConfirmButtons, 5000).catch(() => null);
        if (confirmRotate) confirmRotate.click();
        const secretInput = await waitFor(SELECTORS.settings.clientSecretInputs);
        const clientSecret = String(secretInput.value || secretInput.textContent || '').trim();
        if (!clientSecret) throw new Error('Secret non lisible. Shopify peut ne l’afficher qu’une seule fois; vérifie la page avant de recommencer.');
        state = await updatePending({ step: 'registering' });
        await send({
          type: 'SELLMASTER_API',
          path: '/shopify/register-store-credentials',
          method: 'POST',
          body: { shopDomain: state.shopDomain, clientId, clientSecret },
        });
        secretInput.value = '';
        const authorization = await send({
          type: 'SELLMASTER_API',
          path: '/shopify/auth/start',
          method: 'GET',
          body: { shopDomain: state.shopDomain },
        });
        await chrome.storage.local.remove(PENDING_KEY);
        status('Identifiants enregistrés. Ouverture de l’autorisation de la boutique...', 'success');
        await send({ type: 'SELLMASTER_OPEN_OAUTH', url: authorization.url });
        return;
      }
    } catch (error) {
      status(error.message || 'L’automatisation Shopify a échoué.', 'error');
    } finally {
      button.disabled = false;
      running = false;
    }
  }

  launcher.addEventListener('click', () => panel.classList.toggle('hidden'));
  button.addEventListener('click', runAutomation);
  chrome.storage.local.get(PENDING_KEY).then(result => {
    const pending = result[PENDING_KEY];
    if (!pending) return;
    panel.classList.remove('hidden');
    if (pending.autoRun && pending.step && pending.step !== 'waiting_for_dashboard') runAutomation();
    else status('Création en attente pour ' + pending.shopDomain + '.', '');
  });
})();
