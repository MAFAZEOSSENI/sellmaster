(() => {
  'use strict';
  if (document.getElementById('sellmaster-ads-library')) return;

  const COUNTRIES = [
    ['DZ', 'Algérie', 'Afrique'], ['AO', 'Angola', 'Afrique'], ['BJ', 'Bénin', 'Afrique'],
    ['BW', 'Botswana', 'Afrique'], ['BF', 'Burkina Faso', 'Afrique'], ['BI', 'Burundi', 'Afrique'],
    ['CV', 'Cap-Vert', 'Afrique'], ['CM', 'Cameroun', 'Afrique'], ['CF', 'République centrafricaine', 'Afrique'],
    ['KM', 'Comores', 'Afrique'], ['CG', 'Congo', 'Afrique'], ['CD', 'République démocratique du Congo', 'Afrique'],
    ['CI', 'Côte d’Ivoire', 'Afrique'], ['DJ', 'Djibouti', 'Afrique'], ['EG', 'Égypte', 'Afrique'],
    ['ER', 'Érythrée', 'Afrique'], ['SZ', 'Eswatini', 'Afrique'], ['ET', 'Éthiopie', 'Afrique'],
    ['GA', 'Gabon', 'Afrique'], ['GM', 'Gambie', 'Afrique'], ['GH', 'Ghana', 'Afrique'],
    ['GN', 'Guinée', 'Afrique'], ['GW', 'Guinée-Bissau', 'Afrique'], ['GQ', 'Guinée équatoriale', 'Afrique'],
    ['KE', 'Kenya', 'Afrique'], ['LS', 'Lesotho', 'Afrique'], ['LR', 'Libéria', 'Afrique'],
    ['LY', 'Libye', 'Afrique'], ['MG', 'Madagascar', 'Afrique'], ['MW', 'Malawi', 'Afrique'],
    ['ML', 'Mali', 'Afrique'], ['MA', 'Maroc', 'Afrique'], ['MU', 'Maurice', 'Afrique'],
    ['MR', 'Mauritanie', 'Afrique'], ['MZ', 'Mozambique', 'Afrique'], ['NA', 'Namibie', 'Afrique'],
    ['NE', 'Niger', 'Afrique'], ['NG', 'Nigeria', 'Afrique'], ['UG', 'Ouganda', 'Afrique'],
    ['RW', 'Rwanda', 'Afrique'], ['ST', 'Sao Tomé-et-Principe', 'Afrique'], ['SN', 'Sénégal', 'Afrique'],
    ['SC', 'Seychelles', 'Afrique'], ['SL', 'Sierra Leone', 'Afrique'], ['SO', 'Somalie', 'Afrique'],
    ['ZA', 'Afrique du Sud', 'Afrique'], ['SS', 'Soudan du Sud', 'Afrique'], ['SD', 'Soudan', 'Afrique'],
    ['TZ', 'Tanzanie', 'Afrique'], ['TD', 'Tchad', 'Afrique'], ['TG', 'Togo', 'Afrique'],
    ['TN', 'Tunisie', 'Afrique'], ['ZM', 'Zambie', 'Afrique'], ['ZW', 'Zimbabwe', 'Afrique'],
    ['FR', 'France', 'Europe'], ['GB', 'Royaume-Uni', 'Europe'], ['DE', 'Allemagne', 'Europe'],
    ['IT', 'Italie', 'Europe'], ['ES', 'Espagne', 'Europe'], ['NL', 'Pays-Bas', 'Europe'],
    ['BE', 'Belgique', 'Europe'], ['CH', 'Suisse', 'Europe'], ['SE', 'Suède', 'Europe'],
    ['NO', 'Norvège', 'Europe'], ['DK', 'Danemark', 'Europe'], ['IE', 'Irlande', 'Europe'],
    ['US', 'États-Unis', 'Amérique'], ['CA', 'Canada', 'Amérique'], ['BR', 'Brésil', 'Amérique'],
    ['MX', 'Mexique', 'Amérique'], ['AU', 'Australie', 'Asie-Pacifique'],
    ['NZ', 'Nouvelle-Zélande', 'Asie-Pacifique'], ['IN', 'Inde', 'Asie-Pacifique'],
    ['AE', 'Émirats arabes unis', 'Moyen-Orient'],
  ];
  const panel = document.createElement('aside');
  panel.id = 'sellmaster-ads-library';
  panel.innerHTML = `
    <style>
      #sellmaster-ads-library{position:fixed;z-index:2147483647;top:14px;right:14px;width:min(620px,calc(100vw - 28px));max-height:calc(100vh - 28px);overflow:auto;background:#fff;color:#193333;border:1px solid #d7e1dc;border-radius:10px;box-shadow:0 12px 42px #101f1d45;font:13px/1.45 system-ui,-apple-system,"Segoe UI",sans-serif}
      #sellmaster-ads-library *{box-sizing:border-box}#sellmaster-ads-library .head{display:flex;justify-content:space-between;align-items:center;padding:13px 15px;background:#173e3b;color:#fff}#sellmaster-ads-library .title{font-weight:800;font-size:15px}#sellmaster-ads-library .close{border:0;background:transparent;color:#fff;font-size:22px;cursor:pointer}
      #sellmaster-ads-library .body{padding:14px}#sellmaster-ads-library .auth-required{padding:14px;background:#fff8e8;border:1px solid #ead7a8;border-radius:6px;color:#594b28;font-size:13px;line-height:1.5}#sellmaster-ads-library .tool-content.hidden,#sellmaster-ads-library .auth-required.hidden{display:none!important}#sellmaster-ads-library .controls{display:grid;grid-template-columns:minmax(90px,.8fr) minmax(135px,1.1fr) minmax(130px,1fr) auto auto;gap:8px;align-items:end}#sellmaster-ads-library .scan-options{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:10px}#sellmaster-ads-library label{display:block;margin:0 0 4px;font-size:11px;font-weight:700;color:#526662}#sellmaster-ads-library select,#sellmaster-ads-library input[type="search"],#sellmaster-ads-library input[type="number"],#sellmaster-ads-library button.action{height:38px;min-width:0;border:1px solid #cbd8d3;border-radius:6px;padding:0 10px;font:600 12px system-ui;cursor:pointer}#sellmaster-ads-library select,#sellmaster-ads-library input[type="search"],#sellmaster-ads-library input[type="number"]{width:100%;background:#fff;color:#193333}#sellmaster-ads-library button.action{background:#087f83;border-color:#087f83;color:white}#sellmaster-ads-library button.action.secondary{background:#f1f5f3;border-color:#cbd8d3;color:#284540}#sellmaster-ads-library button.action:disabled{opacity:.55;cursor:wait}
      #sellmaster-ads-library .status{margin:10px 0;padding:8px 10px;background:#f1f5f3;color:#53645f;border-radius:5px;font-size:12px}#sellmaster-ads-library .status.error{background:#fff0ed;color:#a33220}#sellmaster-ads-library .status.success{background:#eaf7ef;color:#24623f}#sellmaster-ads-library .results{margin-top:10px;overflow:auto;border:1px solid #e0e8e4;border-radius:5px}#sellmaster-ads-library table{width:100%;border-collapse:collapse;font-size:11px;text-align:left}#sellmaster-ads-library th{position:sticky;top:0;background:#eef3f0;color:#39524b;font-weight:750}#sellmaster-ads-library th,#sellmaster-ads-library td{padding:8px;border-bottom:1px solid #e6ece9;vertical-align:top}#sellmaster-ads-library td a{color:#087f83;overflow-wrap:anywhere}#sellmaster-ads-library .product-image{display:block;width:58px;height:58px;object-fit:cover;border-radius:4px;background:#eef3f0}#sellmaster-ads-library .image-empty{display:grid;width:58px;height:58px;place-items:center;background:#f1f5f3;color:#778781;font-size:10px;text-align:center}#sellmaster-ads-library .download-video{display:inline-flex;align-items:center;gap:4px;margin:0 0 5px;padding:5px 7px;border:1px solid #cbd8d3;border-radius:5px;background:#f1f5f3;color:#284540;font:600 10px system-ui;cursor:pointer}#sellmaster-ads-library .download-video:disabled{opacity:.55;cursor:wait}#sellmaster-ads-library .empty{padding:18px;color:#667771;text-align:center}
      @media(max-width:560px){#sellmaster-ads-library .controls{grid-template-columns:1fr 1fr}#sellmaster-ads-library .controls>div{grid-column:1/-1}#sellmaster-ads-library button.action{font-size:11px;padding:0 7px}}
    </style>
    <div class="head"><span class="title">Sellmaster · Recherche de produits</span><button type="button" class="close" aria-label="Fermer">×</button></div>
    <div class="body">
      <div class="auth-required" role="status">Vérification de votre session Sellmaster…</div>
      <div class="tool-content hidden">
      <div class="controls">
        <div><label for="sm-country">Pays ciblé</label><select id="sm-country"></select></div>
        <div><label for="sm-ad-category">Catégorie de publicité</label><select id="sm-ad-category"><option value="all">Toutes les publicités</option><option value="political_and_issue_ads">Enjeux, élections ou politique</option></select></div>
        <div><label for="sm-keyword">Mot-clé produit</label><input id="sm-keyword" type="search" list="sm-keyword-suggestions" maxlength="120" value="myshopify" autocomplete="off"><datalist id="sm-keyword-suggestions"><option value="myshopify"></option><option value="livraison gratuite"></option><option value="myselika"></option></datalist></div>
        <button type="button" class="action" data-search>Rechercher</button>
        <button type="button" class="action secondary" data-scan>Analyser + charger</button>
      </div>
      <div class="scan-options">
        <div><label for="sm-ad-limit">Nombre d’annonces (maximum 200)</label><input id="sm-ad-limit" type="number" min="1" max="200" step="1" value="20"></div>
        <div><label for="sm-active-days">Actives depuis au moins (jours)</label><input id="sm-active-days" type="number" min="0" max="3650" step="1" value="10"></div>
      </div>
      <div class="status" role="status" aria-live="polite">Lancez l’analyse pour parcourir progressivement les annonces chargées. Le nombre récupéré est limité à 200.</div>
      <div class="results"><div class="empty">Aucun résultat analysé.</div></div>
      <div class="controls" style="margin-top:9px;grid-template-columns:1fr 1fr">
        <button type="button" class="action secondary" data-csv disabled>Exporter CSV</button>
        <button type="button" class="action secondary" data-pdf disabled>Exporter PDF</button>
      </div>
      </div>
    </div>`;
  document.documentElement.append(panel);

  const countrySelect = panel.querySelector('#sm-country');
  const status = panel.querySelector('.status');
  const resultsContainer = panel.querySelector('.results');
  const csvButton = panel.querySelector('[data-csv]');
  const pdfButton = panel.querySelector('[data-pdf]');
  const scanButton = panel.querySelector('[data-scan]');
  const searchButton = panel.querySelector('[data-search]');
  const adLimitInput = panel.querySelector('#sm-ad-limit');
  const activeDaysInput = panel.querySelector('#sm-active-days');
  const keywordInput = panel.querySelector('#sm-keyword');
  const authNotice = panel.querySelector('.auth-required');
  const toolContent = panel.querySelector('.tool-content');
  const scanOptionsStorageKey = 'sellmaster_ads_scan_options';
  const extensionStorage = globalThis.chrome?.storage?.local;
  const params = new URLSearchParams(location.search);
  const currentCountry = COUNTRIES.some(([code]) => code === params.get('country')) ? params.get('country') : 'FR';
  const currentAdCategory = params.get('ad_type')?.toLowerCase() === 'political_and_issue_ads'
    ? 'political_and_issue_ads'
    : 'all';
  const currentKeyword = (params.get('q') || '').trim();
  const adCategorySelect = panel.querySelector('#sm-ad-category');
  let results = [];
  let lastScanOptions = { limit: 20, activeDays: 10 };
  const productDetailsCache = new Map();
  let isAuthorized = false;

  adCategorySelect.value = currentAdCategory;
  if (currentKeyword) keywordInput.value = currentKeyword;

  let settingsReady = Promise.resolve();
  if (extensionStorage) {
    searchButton.disabled = true;
    scanButton.disabled = true;
    settingsReady = extensionStorage.get(scanOptionsStorageKey)
      .then(stored => {
        const saved = stored[scanOptionsStorageKey];
        if (Number.isInteger(saved?.limit) && saved.limit >= 1 && saved.limit <= 200) adLimitInput.value = String(saved.limit);
        if (Number.isInteger(saved?.activeDays) && saved.activeDays >= 0 && saved.activeDays <= 3650) activeDaysInput.value = String(saved.activeDays);
        if (!currentKeyword && typeof saved?.keyword === 'string' && saved.keyword.trim()) keywordInput.value = saved.keyword.trim().slice(0, 120);
      })
      .catch(() => {})
      .finally(() => {
        searchButton.disabled = false;
        scanButton.disabled = false;
      });
  }

  const countryGroups = new Map();
  COUNTRIES.forEach(([code, name, region]) => {
    if (!countryGroups.has(region)) {
      const group = document.createElement('optgroup');
      group.label = region;
      countryGroups.set(region, group);
      countrySelect.append(group);
    }
    const option = document.createElement('option');
    option.value = code;
    option.textContent = name;
    option.selected = code === currentCountry;
    countryGroups.get(region).append(option);
  });

  function notify(text, kind = '') {
    status.textContent = text;
    status.className = `status${kind ? ` ${kind}` : ''}`;
  }

  function sendRuntimeMessage(message) {
    return new Promise((resolve, reject) => {
      if (!globalThis.chrome?.runtime?.sendMessage) return reject(new Error('Extension Sellmaster indisponible.'));
      chrome.runtime.sendMessage(message, response => {
        if (chrome.runtime.lastError) return reject(new Error(chrome.runtime.lastError.message));
        resolve(response);
      });
    });
  }

  async function ensureOwnerSession() {
    try {
      const response = await sendRuntimeMessage({ type: 'SELLMASTER_VALIDATE_ADS_SESSION' });
      isAuthorized = Boolean(response?.ok && response.data?.authenticated);
    } catch (_) {
      isAuthorized = false;
    }

    toolContent.classList.toggle('hidden', !isAuthorized);
    authNotice.classList.toggle('hidden', isAuthorized);
    if (!isAuthorized) {
      authNotice.textContent = 'Connectez-vous avec un compte owner Sellmaster depuis le popup de l’extension, puis rechargez cette page. Une session active est nécessaire pour utiliser la recherche et exporter les résultats.';
    }
    return isAuthorized;
  }

  ensureOwnerSession();
  chrome.storage?.onChanged?.addListener((changes, areaName) => {
    if (areaName === 'local' && (changes.sellmaster_jwt || changes.sellmaster_user)) ensureOwnerSession();
  });

  function decodedDestination(rawHref) {
    let current = rawHref;
    for (let attempt = 0; attempt < 6; attempt += 1) {
      try {
        current = String(current || '').trim().replace(/[),.;!?]+$/g, '');
        if (/^www\./i.test(current)) current = `https://${current}`;
        const url = new URL(current, location.href);
        const nested = url.searchParams.get('u')
          || url.searchParams.get('url')
          || url.searchParams.get('target')
          || url.searchParams.get('redirect');
        if (nested) {
          current = nested;
          continue;
        }
        if (url.protocol !== 'https:' && url.protocol !== 'http:') return '';
        if (/facebook\.com$|instagram\.com$|fb\.com$/i.test(url.hostname)) return '';
        return url.href;
      } catch (_) {
        return '';
      }
    }
    return '';
  }

  function adDestinations(card, text) {
    const candidates = [];
    const addCandidate = value => {
      const decoded = decodedDestination(value);
      if (decoded && !candidates.includes(decoded)) candidates.push(decoded);
    };

    card.querySelectorAll('a[href]').forEach(anchor => {
      addCandidate(anchor.href);
      ['data-lynx-uri', 'data-href', 'data-url', 'data-redirect-url'].forEach(attribute => {
        addCandidate(anchor.getAttribute(attribute));
      });
    });

    card.querySelectorAll('[data-lynx-uri], [data-href], [data-url], [data-redirect-url]').forEach(element => {
      ['data-lynx-uri', 'data-href', 'data-url', 'data-redirect-url'].forEach(attribute => {
        addCandidate(element.getAttribute(attribute));
      });
    });

    const rawUrls = String(text || '').match(/(?:https?:\/\/|www\.)[^\s<>"'`]+/gi) || [];
    rawUrls.forEach(addCandidate);
    return candidates;
  }

  function normalizeMetaText(text) {
    return String(text || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  }

  function parseStartDate(text) {
    const normalizedText = normalizeMetaText(text);
    const match = normalizedText.match(/(?:started running(?: on)?|active since|running since|diffuse depuis|debut de diffusion(?: le)?|date de debut de diffusion(?: le)?)\s*:?\s*([a-z.]+\s+\d{1,2},?\s+\d{4}|\d{1,2}\s+[a-z.]+\s+\d{4}|\d{1,2}[/.]\d{1,2}[/.]\d{4})/i);
    if (!match) return null;
    const value = match[1].replace(/,/g, '').replace(/\./g, '').trim().toLowerCase();
    const months = { jan: 0, january: 0, janvier: 0, feb: 1, february: 1, fevrier: 1, fev: 1, fevr: 1, mar: 2, march: 2, mars: 2, apr: 3, april: 3, avril: 3, avr: 3, may: 4, mai: 4, jun: 5, june: 5, juin: 5, jul: 6, july: 6, juillet: 6, juil: 6, aug: 7, august: 7, aout: 7, sep: 8, sept: 8, september: 8, septembre: 8, oct: 9, october: 9, octobre: 9, nov: 10, november: 10, novembre: 10, dec: 11, december: 11, decembre: 11 };
    const numeric = value.match(/^(\d{1,2})[/.](\d{1,2})[/.](\d{4})$/);
    if (numeric) return new Date(Number(numeric[3]), Number(numeric[2]) - 1, Number(numeric[1]));
    const english = value.match(/^([a-z.]+)\s+(\d{1,2})\s+(\d{4})$/);
    const french = value.match(/^(\d{1,2})\s+([a-z.]+)\s+(\d{4})$/);
    const dateParts = english
      ? [english[3], months[english[1]], english[2]]
      : french ? [french[3], months[french[2]], french[1]] : null;
    if (!dateParts || dateParts[1] === undefined) return null;
    const date = new Date(Number(dateParts[0]), Number(dateParts[1]), Number(dateParts[2]));
    return Number.isNaN(date.getTime()) ? null : date;
  }

  function productNameFromDestination(destination) {
    if (!destination) return '';
    try {
      const url = new URL(destination);
      const segments = url.pathname.split('/').filter(Boolean);
      const productIndex = segments.findIndex(segment => segment.toLowerCase() === 'products');
      const collectionIndex = segments.findIndex(segment => segment.toLowerCase() === 'collections');
      const productSlug = productIndex >= 0 ? segments[productIndex + 1] : '';
      const collectionSlug = collectionIndex >= 0 ? segments[collectionIndex + 1] : '';
      const titleFromSlug = slug => decodeURIComponent(slug)
        .replace(/[-_]+/g, ' ')
        .replace(/\b\p{L}/gu, character => character.toUpperCase());
      if (productSlug) return titleFromSlug(productSlug);
      if (collectionSlug) return `Collection : ${titleFromSlug(collectionSlug)}`;
      if (/(^|\.)myshopify\.com$/i.test(url.hostname)) return 'Catalogue de la boutique';
      return '';
    } catch (_) {
      return '';
    }
  }

  function canonicalProductPageUrl(destination) {
    if (!destination) return '';
    try {
      const url = new URL(destination);
      const segments = url.pathname.split('/').filter(Boolean);
      const productIndex = segments.findIndex(segment => segment.toLowerCase() === 'products');
      const handle = segments[productIndex + 1];
      if (productIndex < 0 || !handle) return '';
      return `${url.origin.toLowerCase()}/products/${encodeURIComponent(decodeURIComponent(handle).toLowerCase())}`;
    } catch (_) {
      return '';
    }
  }

  function adImageFromCard(card) {
    const candidates = [...card.querySelectorAll('img')]
      .map(image => {
        const rect = image.getBoundingClientRect();
        return {
          url: image.currentSrc || image.src,
          width: Math.max(rect.width, image.naturalWidth),
          height: Math.max(rect.height, image.naturalHeight),
        };
      })
      .filter(image => image.width >= 120 && image.height >= 90 && /^https:\/\//i.test(image.url))
      .sort((left, right) => (right.width * right.height) - (left.width * left.height));
    if (candidates.length) return candidates[0].url;

    const video = [...card.querySelectorAll('video[poster]')]
      .find(element => /^https:\/\//i.test(element.poster));
    return video?.poster || '';
  }

  function adVideoFromCard(card) {
    const candidates = [...card.querySelectorAll('video')].flatMap(video => [
      video.currentSrc,
      video.src,
      ...[...video.querySelectorAll('source')].map(source => source.src || source.getAttribute('src')),
    ]).filter(Boolean);

    return candidates.find(value => {
      try {
        const url = new URL(value, location.href);
        return url.protocol === 'https:' && /(^|\.)fbcdn\.net$/i.test(url.hostname) && !/\.m3u8(?:$|\?)/i.test(url.href);
      } catch (_) {
        return false;
      }
    }) || '';
  }

  function requestShopifyProductDetails(productUrl) {
    if (!productUrl || !globalThis.chrome?.runtime?.sendMessage) return Promise.resolve(null);
    if (!productDetailsCache.has(productUrl)) {
      const request = new Promise(resolve => {
        chrome.runtime.sendMessage({ type: 'SELLMASTER_GET_SHOPIFY_PRODUCT', productUrl }, response => {
          if (chrome.runtime.lastError || !response?.ok) return resolve(null);
          resolve(response.data || null);
        });
      });
      productDetailsCache.set(productUrl, request);
    }
    return productDetailsCache.get(productUrl);
  }

  async function hydrateProductImages(items) {
    let index = 0;
    const worker = async () => {
      while (index < items.length) {
        const item = items[index++];
        const productPath = (() => {
          try {
            return new URL(item.store).pathname.split('/').some((segment, segmentIndex, segments) =>
              segment.toLowerCase() === 'products' && Boolean(segments[segmentIndex + 1]));
          } catch (_) {
            return false;
          }
        })();
        const details = productPath ? await requestShopifyProductDetails(item.store) : null;
        item.imageUrl = details?.imageUrl || item.adImageUrl || '';
        if (details?.title && item.product === 'Nom non détecté') item.product = details.title;
      }
    };
    await Promise.all(Array.from({ length: Math.min(5, items.length) }, worker));
  }

  function getCardValue(card, minimumActiveDays) {
    const text = card.innerText || '';
    const startedAt = parseStartDate(text);
    if (!startedAt || startedAt.getTime() > Date.now() || (Date.now() - startedAt.getTime()) < minimumActiveDays * 86400000) return null;
    const libraryId = normalizeMetaText(text).match(/(?:library id|id dans la bibliotheque)\s*:?\s*(\d+)/i)?.[1] || '';
    if (!libraryId) return null;

    const anchors = [...card.querySelectorAll('a[href]')];
      const destinations = adDestinations(card, text);
    const productDestination = destinations.find(destination => Boolean(canonicalProductPageUrl(destination)));
    const storeUrl = productDestination || destinations.find(destination => {
      try {
        return /(^|\.)myshopify\.com$/i.test(new URL(destination).hostname);
      } catch (_) {
        return false;
      }
    }) || destinations.find(destination => {
      try {
        const hostname = new URL(destination).hostname;
        return !/(^|\.)(facebook\.com|instagram\.com|fb\.com|adspo\.co)$/i.test(hostname);
      } catch (_) {
        return false;
      }
    }) || '';
    const headings = [...card.querySelectorAll('h1,h2,h3,h4,[role="heading"]')]
      .map(element => element.innerText.trim())
      .filter(value => value && !/^(sponsored|sponsorise|publicite)$/i.test(normalizeMetaText(value)));
    const pageLink = anchors.find(anchor => /facebook\.com\/(?!ads\/library)/i.test(anchor.href) && anchor.innerText.trim());
    const pageName = pageLink?.innerText.trim() || 'Page non détectée';
    const productName = headings.find(value => value !== pageName)
      || productNameFromDestination(storeUrl)
      || 'Nom non détecté';
    return {
      store: storeUrl,
      productPageUrl: canonicalProductPageUrl(storeUrl),
      adLibraryUrl: `https://www.facebook.com/ads/library/?id=${encodeURIComponent(libraryId)}`,
      videoUrl: adVideoFromCard(card),
      adImageUrl: adImageFromCard(card),
      imageUrl: '',
      product: productName,
      page: pageName,
      country: COUNTRIES.find(([code]) => code === countrySelect.value)?.[1] || countrySelect.value,
      startedAt,
    };
  }

  function render() {
    if (!results.length) {
      resultsContainer.innerHTML = '<div class="empty">Aucune annonce correspondant aux critères sur la page.</div>';
      csvButton.disabled = true;
      pdfButton.disabled = true;
      return;
    }
    const rows = results.map(item => `<tr><td>${item.imageUrl ? `<img class="product-image" src="${escapeHtml(item.imageUrl)}" alt="${escapeHtml(item.product)}" loading="lazy">` : '<span class="image-empty">Image<br>indisponible</span>'}</td><td>${item.store ? `<a href="${escapeHtml(item.store)}" target="_blank" rel="noopener noreferrer">${escapeHtml(new URL(item.store).hostname)}</a>` : 'Lien non détecté'}</td><td>${escapeHtml(item.product)}</td><td>${escapeHtml(item.page)}</td><td>${escapeHtml(item.country)}</td><td>${item.startedAt.toLocaleDateString('fr-FR')}</td><td>${activeDaysSince(item.startedAt)}</td><td>${item.videoUrl ? `<button type="button" class="download-video" data-download-video="${escapeHtml(item.videoUrl)}" data-library-id="${escapeHtml(item.adLibraryUrl.split('id=')[1] || '')}" title="Télécharger la vidéo de cette publicité">Télécharger vidéo</button>` : 'Vidéo non détectée'}</td><td><a href="${escapeHtml(item.adLibraryUrl)}" target="_blank" rel="noopener noreferrer">Voir la publicité</a></td></tr>`).join('');
    resultsContainer.innerHTML = `<table><thead><tr><th>Image</th><th>Boutique</th><th>Produit</th><th>Page</th><th>Pays</th><th>Début de diffusion</th><th>Jours actifs</th><th>Vidéo</th><th>Bibliothèque vidéo</th></tr></thead><tbody>${rows}</tbody></table>`;
    resultsContainer.querySelectorAll('.product-image').forEach(image => image.addEventListener('error', () => {
      const placeholder = document.createElement('span');
      placeholder.className = 'image-empty';
      placeholder.textContent = 'Image indisponible';
      image.replaceWith(placeholder);
    }, { once: true }));
    resultsContainer.querySelectorAll('[data-download-video]').forEach(button => button.addEventListener('click', async () => {
      const videoUrl = button.dataset.downloadVideo;
      const libraryId = button.dataset.libraryId;
      button.disabled = true;
      button.textContent = 'Préparation…';
      try {
        const response = await sendRuntimeMessage({ type: 'SELLMASTER_DOWNLOAD_AD_VIDEO', videoUrl, libraryId });
        if (!response?.ok) throw new Error(response?.error || 'Téléchargement impossible.');
        notify('Téléchargement vidéo lancé.', 'success');
        button.textContent = 'Téléchargement lancé';
      } catch (error) {
        notify(error.message || 'Téléchargement vidéo impossible.', 'error');
        button.textContent = 'Réessayer';
        button.disabled = false;
      }
    }));
    csvButton.disabled = false;
    pdfButton.disabled = false;
  }

  function activeDaysSince(startedAt) {
    return Math.max(0, Math.floor((Date.now() - startedAt.getTime()) / 86400000));
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
  }

  function exportFilenameStem() {
    const countryName = COUNTRIES.find(([code]) => code === countrySelect.value)?.[1] || countrySelect.value;
    const countrySlug = countryName
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || countrySelect.value.toLowerCase();
    return `${results.length}produits-winner-${countrySlug}`;
  }

  function readScanOptions() {
    const requestedLimit = Number(adLimitInput.value);
    const activeDays = Number(activeDaysInput.value);
    const keyword = keywordInput.value.trim().replace(/\s+/g, ' ');
    if (!Number.isInteger(requestedLimit) || requestedLimit < 1) throw new Error('Le nombre d’annonces doit être au moins 1.');
    if (!Number.isInteger(activeDays) || activeDays < 0 || activeDays > 3650) throw new Error('Le nombre de jours doit être compris entre 0 et 3650.');
    if (!keyword) throw new Error('Saisissez un mot-clé de recherche.');
    const limit = Math.min(requestedLimit, 200);
    if (requestedLimit > 200) adLimitInput.value = '200';
    keywordInput.value = keyword;
    return { limit, activeDays, keyword };
  }

  async function persistScanOptions(options) {
    if (extensionStorage) await extensionStorage.set({ [scanOptionsStorageKey]: options });
  }

  async function searchAds() {
    if (!await ensureOwnerSession()) return;
    await settingsReady;
    let options;
    try {
      options = readScanOptions();
      await persistScanOptions(options);
    } catch (error) {
      notify(error.message, 'error');
      return;
    }
    const url = new URL('https://www.facebook.com/ads/library/');
    url.searchParams.set('active_status', 'active');
    url.searchParams.set('ad_type', adCategorySelect.value);
    url.searchParams.set('country', countrySelect.value);
    url.searchParams.set('q', options.keyword);
    url.searchParams.set('search_type', 'keyword_unordered');
    url.searchParams.set('media_type', 'all');
    location.assign(url.toString());
  }

  function wait(milliseconds) {
    return new Promise(resolve => setTimeout(resolve, milliseconds));
  }

  function findAdCards() {
    const markers = [...document.querySelectorAll('span, div')]
      .filter(element => element.children.length === 0 && /(?:started running(?: on)?|active since|running since|diffuse depuis|debut de diffusion)/i.test(normalizeMetaText(element.textContent || '')));
    const cards = new Set();

    markers.forEach(marker => {
      let element = marker;
      for (let depth = 0; element && depth < 10; depth += 1, element = element.parentElement) {
        const text = normalizeMetaText(element.innerText || '');
        const hasLibraryId = /(?:library id|id dans la bibliotheque)\s*:?\s*\d+/i.test(text);
        const isSponsored = /\b(?:sponsored|sponsorise|publicite)\b/i.test(text);
        if (hasLibraryId && isSponsored && element.querySelector('a[href]')) {
          cards.add(element);
          break;
        }
      }
    });

    return [...cards];
  }

  async function scanAds() {
    scanButton.disabled = true;
    const unique = new Map();
    let previousCardCount = 0;
    let idleRounds = 0;

    try {
      if (!await ensureOwnerSession()) return;
      await settingsReady;
      const options = readScanOptions();
      lastScanOptions = options;
      await persistScanOptions(options);
      for (let round = 0; round < 30; round += 1) {
        const cards = findAdCards();
        cards.forEach(card => {
          const item = getCardValue(card, options.activeDays);
          if (!item) return;
          const key = item.productPageUrl || item.adLibraryUrl;
          const existing = unique.get(key);
          if (!existing || item.startedAt < existing.startedAt) unique.set(key, item);
        });

        results = [...unique.values()]
          .sort((left, right) => right.startedAt - left.startedAt)
          .slice(0, options.limit);
        render();
        notify(`Parcours en cours : ${cards.length} cartes visibles, ${results.length}/${options.limit} annonces qualifiées.`, '');
        if (results.length === options.limit) break;

        const cardCount = findAdCards().length;
        idleRounds = cardCount > previousCardCount ? 0 : idleRounds + 1;
        previousCardCount = cardCount;
        if (idleRounds >= 5) break;

        window.scrollBy({ top: Math.max(500, Math.floor(window.innerHeight * 0.75)), behavior: 'smooth' });
        await wait(900);
      }

      render();
      notify(`Récupération des images produit pour ${results.length} annonce(s)...`, '');
      await hydrateProductImages(results);
      render();
      const summary = `${results.length}/${options.limit} annonce(s) qualifiée(s), actives depuis au moins ${options.activeDays} jour(s). Les cartes sans date lisible sont exclues.`;
      notify(summary, results.length ? 'success' : '');
    } catch (error) {
      notify(`Analyse interrompue : ${error.message || 'erreur inconnue'}`, 'error');
    } finally {
      scanButton.disabled = false;
    }
  }

  async function exportCsv() {
    if (!await ensureOwnerSession()) return;
    const fields = ['Image du produit', 'Lien de la boutique', 'Nom du produit', 'Nom de la page', 'Pays', 'Début de diffusion', 'Jours actifs', 'Lien vidéo', 'Lien bibliothèque vidéo'];
    const lines = [fields, ...results.map(item => [item.imageUrl, item.store, item.product, item.page, item.country, item.startedAt.toLocaleDateString('fr-FR'), activeDaysSince(item.startedAt), item.videoUrl, item.adLibraryUrl])]
      .map(row => row.map(value => `"${String(value).replace(/"/g, '""')}"`).join(';'));
    const blob = new Blob([`\ufeff${lines.join('\r\n')}`], { type: 'text/csv;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${exportFilenameStem()}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  async function exportPdf() {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      notify('Autorisez les fenêtres pop-up pour générer le PDF.', 'error');
      return;
    }
    if (!await ensureOwnerSession()) {
      printWindow.close();
      return;
    }
    const rows = results.map(item => `<tr><td>${item.imageUrl ? `<img src="${escapeHtml(item.imageUrl)}" alt="${escapeHtml(item.product)}" style="width:58px;height:58px;object-fit:cover">` : 'Image indisponible'}</td><td>${item.store ? `<a class="shop-link" href="${escapeHtml(item.store)}">${escapeHtml(item.store)}</a>` : 'Lien non détecté'}</td><td>${escapeHtml(item.product)}</td><td>${escapeHtml(item.page)}</td><td>${escapeHtml(item.country)}</td><td>${item.startedAt.toLocaleDateString('fr-FR')}</td><td>${activeDaysSince(item.startedAt)}</td><td>${item.videoUrl ? `<a class="video-link" href="${escapeHtml(item.videoUrl)}">Télécharger vidéo</a>` : 'Vidéo non détectée'}</td><td class="library-link-cell"><a class="library-link" href="${escapeHtml(item.adLibraryUrl)}">${escapeHtml(item.adLibraryUrl)}</a></td></tr>`).join('');
    const minimumDays = lastScanOptions.activeDays;
    const searchedKeyword = lastScanOptions.keyword || 'myshopify';
    const pdfFilename = exportFilenameStem();
    printWindow.document.write(`<!doctype html><html lang="fr"><meta charset="utf-8"><title>${escapeHtml(pdfFilename)}</title><style>body{font:12px Arial,sans-serif;color:#193333}h1{font-size:18px}table{width:100%;table-layout:fixed;border-collapse:collapse}th,td{padding:7px 6px;border:1px solid #cbd8d3;text-align:left;vertical-align:middle;overflow-wrap:anywhere}th{background:#eef3f0}th:nth-child(1){width:6%}th:nth-child(2){width:12%}th:nth-child(3){width:14%}th:nth-child(4){width:11%}th:nth-child(5){width:7%}th:nth-child(6){width:8%}th:nth-child(7){width:6%}th:nth-child(8){width:12%}th:nth-child(9){width:24%}a{color:#087f83}.shop-link,.video-link{overflow-wrap:anywhere;word-break:break-word}.library-link-cell{text-align:center}.library-link{display:block;max-width:100%;text-align:center;overflow-wrap:anywhere;word-break:break-all;line-height:1.35}@page{size:landscape;margin:10mm}</style><h1>Résultats Ads Library · ${escapeHtml(searchedKeyword)}</h1><p>Mot-clé : ${escapeHtml(searchedKeyword)} · ${results.length} annonce(s), actives depuis au moins ${minimumDays} jour(s) · ${new Date().toLocaleDateString('fr-FR')}</p><table><thead><tr><th>Image</th><th>Boutique</th><th>Produit</th><th>Page</th><th>Pays</th><th>Début de diffusion</th><th>Jours actifs</th><th>Vidéo</th><th>Bibliothèque vidéo</th></tr></thead><tbody>${rows}</tbody></table></html>`);
    printWindow.document.close();
    printWindow.addEventListener('load', () => printWindow.print(), { once: true });
  }

  panel.querySelector('.close').addEventListener('click', () => panel.remove());
  keywordInput.addEventListener('keydown', event => {
    if (event.key === 'Enter') {
      event.preventDefault();
      searchAds();
    }
  });
  keywordInput.addEventListener('input', () => {
    const keyword = keywordInput.value.trim();
    searchButton.textContent = keyword ? `Rechercher « ${keyword.slice(0, 35)}${keyword.length > 35 ? '…' : ''} »` : 'Rechercher';
  });
  keywordInput.dispatchEvent(new Event('input'));
  searchButton.addEventListener('click', searchAds);
  scanButton.addEventListener('click', scanAds);
  csvButton.addEventListener('click', exportCsv);
  pdfButton.addEventListener('click', exportPdf);
})();