(function () {
  'use strict';

  var script = document.currentScript;
  if (!script) return;

  var scriptUrl;
  try {
    scriptUrl = new URL(script.src, window.location.href);
  } catch (_) {
    return;
  }

  var token = scriptUrl.searchParams.get('token');
  if (!token) {
    console.error('[Sellmaster] Missing form token in widget script URL.');
    return;
  }

  var apiBase = scriptUrl.origin + '/api/public/forms/' + encodeURIComponent(token);
  var host = document.createElement('div');
  host.setAttribute('data-sellmaster-form-widget', '');
  var shadow = host.attachShadow({ mode: 'open' });

  var style = document.createElement('style');
  style.textContent = [
    ':host{all:initial;font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#17202a}',
    '*,*::before,*::after{box-sizing:border-box}',
    '.launcher{position:fixed;right:20px;bottom:20px;z-index:2147483000;border:0;border-radius:999px;padding:14px 20px;background:#00a6b2;color:#fff;font:600 15px system-ui,sans-serif;box-shadow:0 8px 28px #0003;cursor:pointer}',
    '.overlay{position:fixed;inset:0;z-index:2147483001;display:none;align-items:center;justify-content:center;padding:16px;background:#10182099}',
    '.overlay.open{display:flex}',
    '.panel{position:relative;width:min(100%,480px);max-height:90vh;overflow:auto;background:#fff;border-radius:14px;padding:24px;box-shadow:0 20px 70px #0004}',
    '.panel.embedded{max-height:none;margin:0 auto;box-shadow:none}',
    'h2{margin:0 36px 18px 0;font:700 22px system-ui,sans-serif;color:#17202a}',
    '.close{position:absolute;top:12px;right:12px;border:0;background:transparent;color:#52606d;font-size:26px;line-height:1;cursor:pointer}',
    'label{display:block;margin:12px 0 5px;font:600 13px system-ui,sans-serif;color:#344054}',
    'input,select{display:block;width:100%;min-height:44px;padding:10px 12px;border:1px solid #cfd8df;border-radius:8px;background:#fff;color:#17202a;font:15px system-ui,sans-serif}',
    '.submit{width:100%;margin-top:18px;min-height:46px;border:0;border-radius:8px;background:#00a6b2;color:#fff;font:700 15px system-ui,sans-serif;cursor:pointer}',
    '.submit:disabled{opacity:.6;cursor:wait}',
    '.message{margin:12px 0 0;font:14px/1.45 system-ui,sans-serif}',
    '.error{color:#b42318}.success{color:#067647}.loading{color:#52606d}',
    '.quantity{max-width:130px}',
    '@media(max-width:480px){.launcher{right:14px;bottom:14px}.panel{padding:20px}}'
  ].join('');
  shadow.appendChild(style);

  var launcher = document.createElement('button');
  launcher.className = 'launcher';
  launcher.type = 'button';
  launcher.textContent = 'Commander';
  launcher.setAttribute('aria-label', 'Ouvrir le formulaire de commande');

  var overlay = document.createElement('div');
  overlay.className = 'overlay';
  overlay.setAttribute('role', 'presentation');

  var panel = document.createElement('section');
  panel.className = 'panel';
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-modal', 'true');
  panel.setAttribute('aria-label', 'Formulaire de commande');

  var close = document.createElement('button');
  close.className = 'close';
  close.type = 'button';
  close.textContent = '\u00d7';
  close.setAttribute('aria-label', 'Fermer');

  var title = document.createElement('h2');
  title.textContent = 'Passer une commande';

  var form = document.createElement('form');
  var message = document.createElement('p');
  message.className = 'message';
  message.setAttribute('aria-live', 'polite');
  form.appendChild(makeInput('customer_name', 'Nom complet', 'text', true));

  var fields = null;
  var products = [];
  var productSelect = null;
  var quantityInput = null;

  function makeInput(name, labelText, type, required) {
    var wrapper = document.createElement('div');
    var label = document.createElement('label');
    label.htmlFor = 'sm-' + name;
    label.textContent = labelText;
    var input = document.createElement('input');
    input.id = 'sm-' + name;
    input.name = name;
    input.type = type;
    input.required = Boolean(required);
    wrapper.appendChild(label);
    wrapper.appendChild(input);
    return wrapper;
  }

  function addConfiguredInput(name, labelText, type) {
    if (!fields || fields[name] !== true) return;
    form.appendChild(makeInput(name, labelText, type || 'text', true));
  }

  function addProductControls() {
    if (!fields || fields.product_variant !== true) return;
    var productWrapper = document.createElement('div');
    var productLabel = document.createElement('label');
    productLabel.htmlFor = 'sm-product';
    productLabel.textContent = 'Produit / variante';
    productSelect = document.createElement('select');
    productSelect.id = 'sm-product';
    productSelect.required = true;

    var placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = products.length ? 'Choisir un produit' : 'Aucun produit disponible';
    placeholder.disabled = true;
    placeholder.selected = true;
    productSelect.appendChild(placeholder);

    products.forEach(function (product) {
      var option = document.createElement('option');
      option.value = String(product.product_id);
      option.textContent = product.name + ' - ' + formatPrice(product.price);
      productSelect.appendChild(option);
    });
    productWrapper.appendChild(productLabel);
    productWrapper.appendChild(productSelect);
    form.appendChild(productWrapper);

    if (fields.quantity === true) {
      var quantityWrapper = document.createElement('div');
      var quantityLabel = document.createElement('label');
      quantityLabel.htmlFor = 'sm-quantity';
      quantityLabel.textContent = 'Quantit\u00e9';
      quantityInput = document.createElement('input');
      quantityInput.id = 'sm-quantity';
      quantityInput.name = 'quantity';
      quantityInput.type = 'number';
      quantityInput.className = 'quantity';
      quantityInput.min = '1';
      quantityInput.max = '100';
      quantityInput.step = '1';
      quantityInput.value = '1';
      quantityInput.required = true;
      quantityWrapper.appendChild(quantityLabel);
      quantityWrapper.appendChild(quantityInput);
      form.appendChild(quantityWrapper);
    }
  }

  function formatPrice(value) {
    var amount = Number(value);
    if (!Number.isFinite(amount)) amount = 0;
    return new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(amount) + ' FCFA';
  }

  function setMessage(text, state) {
    message.textContent = text || '';
    message.className = 'message' + (state ? ' ' + state : '');
  }

  function readValue(name) {
    var input = form.elements.namedItem(name);
    return input ? String(input.value || '').trim() : '';
  }

  function renderConfiguredFields() {
    addConfiguredInput('phone', 'T\u00e9l\u00e9phone', 'tel');
    addConfiguredInput('city', 'Ville', 'text');
    addConfiguredInput('address', 'Adresse de livraison', 'text');
    addProductControls();

    var submit = document.createElement('button');
    submit.type = 'submit';
    submit.className = 'submit';
    submit.textContent = 'Valider ma commande';
    form.appendChild(submit);
    form.appendChild(message);
  }

  function openModal() {
    overlay.classList.add('open');
    var first = form.querySelector('input');
    if (first) first.focus();
  }

  function closeModal() {
    overlay.classList.remove('open');
  }

  function mountPopup(config) {
    var buttonText = String(config.button_text || 'Commander').trim().slice(0, 60) || 'Commander';
    var buttonColor = /^#[0-9a-fA-F]{6}$/.test(config.button_color || '') ? config.button_color : '#00a6b2';
    launcher.textContent = buttonText;
    launcher.style.backgroundColor = buttonColor;
    panel.appendChild(close);
    panel.appendChild(title);
    panel.appendChild(form);
    overlay.appendChild(panel);
    shadow.appendChild(launcher);
    shadow.appendChild(overlay);
    (document.body || document.documentElement).appendChild(host);
    launcher.addEventListener('click', openModal);
    close.addEventListener('click', closeModal);
    overlay.addEventListener('click', function (event) {
      if (event.target === overlay) closeModal();
    });
    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && overlay.classList.contains('open')) closeModal();
    });
    launcher.hidden = false;
  }

  function mountEmbedded() {
    panel.classList.add('embedded');
    panel.appendChild(title);
    panel.appendChild(form);
    shadow.appendChild(panel);
    host.style.display = 'block';
    host.style.width = '100%';
    if (script.parentNode) {
      script.insertAdjacentElement('afterend', host);
    } else {
      (document.body || document.documentElement).appendChild(host);
    }
  }

  form.addEventListener('submit', function (event) {
    event.preventDefault();
    setMessage('', '');
    if (!productSelect || !productSelect.value) {
      setMessage('Choisissez un produit avant de continuer.', 'error');
      return;
    }

    var submit = form.querySelector('.submit');
    submit.disabled = true;
    submit.textContent = 'Envoi en cours...';

    var payload = {
      customer_name: readValue('customer_name'),
      items: [{
        product_id: Number(productSelect.value),
        quantity: fields.quantity === true ? Number(quantityInput.value) : 1
      }]
    };
    if (fields.phone === true) payload.phone = readValue('phone');
    if (fields.city === true) payload.city = readValue('city');
    if (fields.address === true) payload.address = readValue('address');

    fetch(apiBase + '/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(payload)
    }).then(function (response) {
      return response.json().catch(function () { return {}; }).then(function (body) {
        if (!response.ok) throw new Error(body.error || 'Impossible d\u2019envoyer la commande.');
        return body;
      });
    }).then(function () {
      form.reset();
      if (quantityInput) quantityInput.value = '1';
      setMessage('Merci, votre commande a bien \u00e9t\u00e9 envoy\u00e9e.', 'success');
    }).catch(function (error) {
      setMessage(error.message || 'Une erreur est survenue. R\u00e9essayez.', 'error');
    }).finally(function () {
      submit.disabled = false;
      submit.textContent = 'Valider ma commande';
    });
  });

  panel.appendChild(form);
  setMessage('Chargement du formulaire...', 'loading');

  fetch(apiBase, { headers: { 'Accept': 'application/json' } })
    .then(function (response) {
      return response.json().catch(function () { return {}; }).then(function (body) {
        if (!response.ok) throw new Error(body.error || 'Formulaire indisponible.');
        return body;
      });
    })
    .then(function (config) {
      fields = config.fields_config || {};
      products = Array.isArray(config.products) ? config.products : [];
      renderConfiguredFields();
      setMessage('', '');
      if (config.display_mode === 'embedded') {
        mountEmbedded();
      } else {
        mountPopup(fields);
      }
    })
    .catch(function (error) {
      setMessage(error.message || 'Formulaire indisponible.', 'error');
      panel.appendChild(title);
      panel.appendChild(message);
      panel.appendChild(close);
      overlay.classList.add('open');
      overlay.appendChild(panel);
      close.addEventListener('click', closeModal);
      overlay.addEventListener('click', function (event) {
        if (event.target === overlay) closeModal();
      });
      document.addEventListener('keydown', function (event) {
        if (event.key === 'Escape' && overlay.classList.contains('open')) closeModal();
      });
      shadow.appendChild(overlay);
      (document.body || document.documentElement).appendChild(host);
    });
})();
