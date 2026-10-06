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
    '.sticky-launcher{position:fixed;left:50%;bottom:14px;transform:translateX(-50%);z-index:2147483000;width:min(calc(100vw - 28px),480px);border:0;border-radius:8px;padding:14px 20px;background:#00a6b2;color:#fff;font:700 15px system-ui,sans-serif;box-shadow:0 8px 28px #0003;cursor:pointer}',
    '.overlay{position:fixed;inset:0;z-index:2147483001;display:none;align-items:center;justify-content:center;padding:16px;background:#10182099}',
    '.overlay.open{display:flex}',
    '.panel{position:relative;width:min(100%,480px);max-height:90vh;overflow:auto;background:#fff;border-radius:14px;padding:24px;box-shadow:0 20px 70px #0004}',
    '.panel.embedded{max-height:none;margin:0 auto;box-shadow:none}',
    'h2{margin:0 36px 18px 0;font:700 22px system-ui,sans-serif;color:#17202a}',
    '.close{position:absolute;top:12px;right:12px;border:0;background:transparent;color:#52606d;font-size:26px;line-height:1;cursor:pointer}',
    'label{display:block;margin:12px 0 5px;font:600 13px system-ui,sans-serif;color:#344054}',
    'input,select,textarea{display:block;width:100%;min-height:44px;padding:10px 12px;border:1px solid #cfd8df;border-radius:8px;background:#fff;color:#17202a;font:15px system-ui,sans-serif}',
    'textarea{min-height:88px;resize:vertical}',
    '.shipping-option{display:flex;align-items:center;gap:10px;margin:8px 0;padding:10px;border:1px solid #cfd8df;border-radius:8px;font:14px system-ui,sans-serif;color:#17202a}',
    '.shipping-option input{width:18px;min-height:18px;margin:0}',
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
  var stickyButton = document.createElement('button');
  stickyButton.className = 'sticky-launcher';
  stickyButton.type = 'button';
  stickyButton.hidden = true;

  var form = document.createElement('form');
  var message = document.createElement('p');
  message.className = 'message';
  message.setAttribute('aria-live', 'polite');
  form.appendChild(makeInput('customer_name', 'Nom complet', 'text', true));

  var fields = null;
  var products = [];
  var productSelect = null;
  var quantityInput = null;
  var shippingOptions = [];
  var submitButton = null;

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

  function makeTextarea(name, labelText, required) {
    var wrapper = document.createElement('div');
    var label = document.createElement('label');
    label.htmlFor = 'sm-' + name;
    label.textContent = labelText;
    var textarea = document.createElement('textarea');
    textarea.id = 'sm-' + name;
    textarea.name = name;
    textarea.required = Boolean(required);
    wrapper.appendChild(label);
    wrapper.appendChild(textarea);
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

    productSelect.addEventListener('change', updateSubmitTotal);
    if (quantityInput) quantityInput.addEventListener('input', updateSubmitTotal);
  }

  function addCountryControl() {
    if (!Array.isArray(fields.country) || !fields.country.length) return;
    var wrapper = document.createElement('div');
    var label = document.createElement('label');
    label.htmlFor = 'sm-country';
    label.textContent = 'Pays';
    var select = document.createElement('select');
    select.id = 'sm-country';
    select.name = 'country';
    select.required = true;
    var placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = 'Choisir un pays';
    placeholder.disabled = true;
    placeholder.selected = true;
    select.appendChild(placeholder);
    fields.country.forEach(function (country) {
      var option = document.createElement('option');
      option.value = String(country.value || country.label);
      option.textContent = String(country.label || country.value);
      select.appendChild(option);
    });
    wrapper.appendChild(label);
    wrapper.appendChild(select);
    form.appendChild(wrapper);
  }

  function addShippingOptions() {
    shippingOptions = Array.isArray(fields.shipping_options) ? fields.shipping_options : [];
    if (!shippingOptions.length) return;
    var wrapper = document.createElement('fieldset');
    wrapper.style.border = '0';
    wrapper.style.padding = '0';
    wrapper.style.margin = '12px 0 0';
    var legend = document.createElement('legend');
    legend.textContent = 'Mode de livraison';
    legend.style.font = '600 13px system-ui,sans-serif';
    wrapper.appendChild(legend);
    shippingOptions.forEach(function (shipping, index) {
      var label = document.createElement('label');
      label.className = 'shipping-option';
      var radio = document.createElement('input');
      radio.type = 'radio';
      radio.name = 'shipping_option';
      radio.value = String(index);
      radio.required = true;
      radio.checked = index === 0;
      radio.addEventListener('change', updateSubmitTotal);
      label.appendChild(radio);
      var text = document.createElement('span');
      text.textContent = String(shipping.label) + ' - ' + formatPrice(shipping.price);
      label.appendChild(text);
      wrapper.appendChild(label);
    });
    form.appendChild(wrapper);
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

  function selectedShippingOption() {
    var selected = form.querySelector('input[name="shipping_option"]:checked');
    return selected ? Number(selected.value) : null;
  }

  function updateSubmitTotal() {
    if (!submitButton) return;
    var product = products.find(function (item) {
      return productSelect && Number(item.product_id) === Number(productSelect.value);
    });
    var quantity = quantityInput ? Math.max(1, Number(quantityInput.value) || 1) : 1;
    var selectedIndex = selectedShippingOption();
    var deliveryPrice = selectedIndex !== null && shippingOptions[selectedIndex]
      ? Number(shippingOptions[selectedIndex].price) || 0
      : 0;
    var total = product ? (Number(product.price) || 0) * quantity + deliveryPrice : 0;
    submitButton.textContent = 'Commander - ' + formatPrice(total);
    stickyButton.textContent = submitButton.textContent;
  }

  function renderConfiguredFields() {
    addConfiguredInput('phone', fields.phone_label || 'Numéro WhatsApp', 'tel');
    addConfiguredInput('city', 'Ville', 'text');
    addConfiguredInput('address', 'Adresse de livraison', 'text');
    if (fields.delivery_note === true) form.appendChild(makeTextarea('delivery_note', 'Heure de livraison souhaitée', true));
    addCountryControl();
    addProductControls();
    addShippingOptions();

    var submit = document.createElement('button');
    submit.type = 'submit';
    submit.className = 'submit';
    submitButton = submit;
    form.appendChild(submit);
    form.appendChild(message);
    updateSubmitTotal();
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
    var cartForm = document.querySelector('form[action="/cart/add"]');
    if (!cartForm) {
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', mountEmbedded, { once: true });
        return;
      }
      mountPopup(fields);
      return;
    }

    panel.classList.add('embedded');
    panel.appendChild(title);
    panel.appendChild(form);
    shadow.appendChild(panel);
    host.style.display = 'block';
    host.style.width = '100%';
    cartForm.insertAdjacentElement('afterend', host);
    shadow.appendChild(stickyButton);
    stickyButton.addEventListener('click', function () {
      panel.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
    if ('IntersectionObserver' in window) {
      var observer = new IntersectionObserver(function (entries) {
        var visible = entries.some(function (entry) { return entry.isIntersecting; });
        stickyButton.hidden = visible;
      }, { threshold: 0.01 });
      observer.observe(panel);
    }
  }

  form.addEventListener('submit', function (event) {
    event.preventDefault();
    setMessage('', '');
    if (!productSelect || !productSelect.value) {
      setMessage('Choisissez un produit avant de continuer.', 'error');
      return;
    }

    var submit = submitButton;
    submit.disabled = true;
    submit.textContent = 'Envoi en cours...';

    var payload = {
      customer_name: readValue('customer_name'),
      items: [{
        product_id: Number(productSelect.value),
        quantity: fields.quantity === true ? Number(quantityInput.value) : 1
      }]
    };
    var shippingIndex = selectedShippingOption();
    if (shippingIndex !== null) payload.shipping_option = shippingIndex;
    if (fields.phone === true) payload.phone = readValue('phone');
    if (fields.city === true) payload.city = readValue('city');
    if (fields.address === true) payload.address = readValue('address');
    if (fields.delivery_note === true) payload.delivery_note = readValue('delivery_note');
    if (Array.isArray(fields.country) && fields.country.length) payload.country = readValue('country');

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
      updateSubmitTotal();
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
