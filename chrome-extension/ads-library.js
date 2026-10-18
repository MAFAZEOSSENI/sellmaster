(() => {
  'use strict';
  if (document.getElementById('sellmaster-ads-library')) return;

  const COUNTRIES = [
    ['ALL', 'Tous les pays', 'Tous'],
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
      <div class="mode-tabs" role="tablist" aria-label="Mode de recherche">
        <button type="button" class="action secondary" data-research-mode="text" aria-pressed="true">Recherche par texte</button>
        <button type="button" class="action secondary" data-research-mode="visual" aria-pressed="false">Recherche visuelle</button>
      </div>
      <div class="text-research">
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
      </div>
      <section class="visual-research" hidden>
        <label for="sm-visual-image">Image de référence</label>
        <input id="sm-visual-image" type="file" accept="image/png,image/jpeg,image/webp,image/avif">
        <img class="visual-preview" alt="Aperçu de l’image de référence" hidden>
        <p class="visual-note">Recherche parmi les créations déjà collectées par vos scans Sellmaster. La bibliothèque se remplit au fil des analyses Ads Library.</p>
        <button type="button" class="action" data-visual-search disabled>Comparer à la bibliothèque visuelle</button>
      </section>
      <div class="status" role="status" aria-live="polite">Lancez l’analyse pour parcourir progressivement les annonces chargées. Le nombre récupéré est limité à 200.</div>
      <div class="results"><div class="empty">Aucun résultat analysé.</div></div>
      <div class="controls" style="margin-top:9px;grid-template-columns:1fr 1fr">
        <button type="button" class="action secondary" data-csv disabled>Exporter CSV</button>
        <button type="button" class="action secondary" data-pdf disabled>Exporter PDF</button>
      </div>
      </div>
    </div>`;
  panel.querySelector('style').textContent += '#sellmaster-ads-library .mode-tabs{display:flex;gap:6px;margin-bottom:12px}#sellmaster-ads-library .mode-tabs button[aria-pressed="true"]{background:#087f83;border-color:#087f83;color:#fff}#sellmaster-ads-library .visual-research{padding:12px;border:1px solid #dce6e1;border-radius:6px;background:#f7faf8}#sellmaster-ads-library .visual-research[hidden]{display:none}#sellmaster-ads-library #sm-visual-image{display:block;width:100%;margin:6px 0 8px;font-size:12px}#sellmaster-ads-library .visual-preview{max-width:100%;max-height:150px;object-fit:contain;margin:4px 0 8px}#sellmaster-ads-library .visual-note{margin:4px 0 10px;color:#53645f;font-size:11px}#sellmaster-ads-library .text-research[hidden]{display:none}#sellmaster-ads-library .creative-search-start,#sellmaster-ads-library .visual-source-start{display:inline-flex;align-items:center;margin:5px 4px 0 0;padding:5px 7px;border:1px solid #b5d9d4;border-radius:5px;background:#eaf7f4;color:#075e64;font:700 10px system-ui;cursor:pointer}#sellmaster-ads-library .match-confidence{display:inline-block;padding:3px 6px;border-radius:4px;background:#eaf7ef;color:#24623f;font-weight:700}#sellmaster-ads-library .match-confidence.medium{background:#fff6df;color:#755b15}#sellmaster-ads-library .match-confidence.low{background:#f1f3f4;color:#5c686b}';
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
  const visualImageInput = panel.querySelector('#sm-visual-image');
  const visualPreview = panel.querySelector('.visual-preview');
  const visualSearchButton = panel.querySelector('[data-visual-search]');
  const visualResearchPanel = panel.querySelector('.visual-research');
  const textResearchPanel = panel.querySelector('.text-research');
  const visualTab = panel.querySelector('[data-research-mode="visual"]');
  const textTab = panel.querySelector('[data-research-mode="text"]');
  const authNotice = panel.querySelector('.auth-required');
  const toolContent = panel.querySelector('.tool-content');
  const scanOptionsStorageKey = 'sellmaster_ads_scan_options';
  const creativeJobStorageKey = 'sellmaster_creative_search_job';
  const extensionStorage = globalThis.chrome?.storage?.local;
  const params = new URLSearchParams(location.search);
  const currentCountry = COUNTRIES.some(([code]) => code === params.get('country')) ? params.get('country') : 'FR';
  const currentAdCategory = params.get('ad_type')?.toLowerCase() === 'political_and_issue_ads'
    ? 'political_and_issue_ads'
    : 'all';
  const currentKeyword = (params.get('q') || '').trim();
  const adCategorySelect = panel.querySelector('#sm-ad-category');
  let results = [];
  let resultsMode = 'standard';
  let visualReferenceBlob = null;
  let visualReferenceUrl = '';
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

  function creativeMatchEvidence(product, store, page, adText, query, targetProduct) {
    const normalizeWords = value => normalizeMetaText(value).match(/[a-z0-9]+/g) || [];
    const ignored = new Set(['avec', 'dans', 'pour', 'sur', 'the', 'and', 'for', 'with', 'from', 'les', 'des', 'une', 'un', 'aux', 'par', 'est', 'qui', 'vous', 'votre', 'produit', 'product', 'gelule', 'gelules', 'capsule', 'capsules', 'creme', 'huile', 'serum', 'pack', 'lot']);
    const targetTerms = [...new Set(normalizeWords(targetProduct).filter(word => word.length > 2 && !ignored.has(word)))];
    const queryTerms = [...new Set(normalizeWords(query).filter(word => word.length > 2 && !ignored.has(word)))];
    const directEvidence = normalizeMetaText(`${product} ${store}`);
    const fullEvidence = normalizeMetaText(`${product} ${store} ${page} ${adText}`);
    const directMatches = targetTerms.filter(term => directEvidence.includes(term)).length;
    const queryMatches = queryTerms.filter(term => fullEvidence.includes(term)).length;
    const directRatio = targetTerms.length ? directMatches / targetTerms.length : 0;
    const queryRatio = queryTerms.length ? queryMatches / queryTerms.length : 0;

    if (canonicalProductPageUrl(store) && directRatio >= 0.75) return { label: 'Élevée', score: 3 };
    if (directRatio >= 0.5 || (queryTerms.length > 0 && queryRatio >= 0.75)) return { label: 'Moyenne', score: 2 };
    return { label: 'Faible', score: 1 };
  }

  function getCardValue(card, minimumActiveDays, creativeQuery = '', targetProduct = '') {
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
    const match = creativeQuery
      ? creativeMatchEvidence(productName, storeUrl, pageName, text, creativeQuery, targetProduct)
      : null;
    return {
      store: storeUrl,
      productPageUrl: canonicalProductPageUrl(storeUrl),
      adLibraryUrl: `https://www.facebook.com/ads/library/?id=${encodeURIComponent(libraryId)}`,
      videoUrl: adVideoFromCard(card),
      adImageUrl: adImageFromCard(card),
      imageUrl: '',
      product: productName,
      page: pageName,
      matchedQueries: creativeQuery ? [creativeQuery] : [],
      matchConfidence: match?.label || '',
      matchScore: match?.score || 0,
      country: COUNTRIES.find(([code]) => code === countrySelect.value)?.[1] || countrySelect.value,
      startedAt,
    };
  }

  function render() {
    if (!results.length) {
      resultsContainer.innerHTML = `<div class="empty">${resultsMode === 'visual' ? 'Aucune création visuellement proche trouvée dans la bibliothèque Sellmaster.' : 'Aucune annonce correspondant aux critères sur la page.'}</div>`;
      csvButton.disabled = true;
      pdfButton.disabled = true;
      return;
    }
    const rows = results.map((item, index) => {
      const provenance = resultsMode === 'creative'
        ? `<td>${(item.matchedQueries || []).map(escapeHtml).join('<br>') || 'Recherche produit'}</td><td><span class="match-confidence${item.matchConfidence === 'Faible' ? ' low' : item.matchConfidence === 'Moyenne' ? ' medium' : ''}">${escapeHtml(item.matchConfidence || 'Moyenne')}</span></td>`
        : resultsMode === 'visual'
          ? `<td><span class="match-confidence${item.visualSimilarity < 75 ? ' low' : item.visualSimilarity < 88 ? ' medium' : ''}">${escapeHtml(item.visualSimilarity)} %</span></td>`
          : '';
      const libraryActions = `<a href="${escapeHtml(item.adLibraryUrl)}" target="_blank" rel="noopener noreferrer">Voir la publicité</a><br><button type="button" class="creative-search-start" data-creative-index="${index}" title="Chercher d’autres annonces pour ${escapeHtml(item.product)}">Recherche Créa</button><button type="button" class="visual-source-start" data-visual-source-index="${index}" title="Comparer les créations à cette image produit">Recherche visuelle</button>`;
      return `<tr><td>${item.imageUrl ? `<img class="product-image" src="${escapeHtml(item.imageUrl)}" alt="${escapeHtml(item.product)}" loading="lazy">` : '<span class="image-empty">Image<br>indisponible</span>'}</td><td>${item.store ? `<a href="${escapeHtml(item.store)}" target="_blank" rel="noopener noreferrer">${escapeHtml(new URL(item.store).hostname)}</a>` : 'Lien non détecté'}</td><td>${escapeHtml(item.product)}</td><td>${escapeHtml(item.page)}</td><td>${escapeHtml(item.country)}</td><td>${item.startedAt.toLocaleDateString('fr-FR')}</td><td>${activeDaysSince(item.startedAt)}</td><td>${item.videoUrl ? `<button type="button" class="download-video" data-download-video="${escapeHtml(item.videoUrl)}" data-library-id="${escapeHtml(item.adLibraryUrl.split('id=')[1] || '')}" data-product-name="${escapeHtml(item.product)}" data-creative-search="${resultsMode === 'creative'}" title="Télécharger la vidéo de cette publicité">Télécharger vidéo</button>` : 'Vidéo non détectée'}</td>${provenance}<td>${libraryActions}</td></tr>`;
    }).join('');
    const creativeHeaders = resultsMode === 'creative' ? '<th>Requêtes trouvées</th><th>Pertinence</th>' : resultsMode === 'visual' ? '<th>Similarité visuelle</th>' : '';
    resultsContainer.innerHTML = `<table><thead><tr><th>Image</th><th>Boutique</th><th>Produit</th><th>Page</th><th>Pays</th><th>Début de diffusion</th><th>Jours actifs</th><th>Vidéo</th>${creativeHeaders}<th>Bibliothèque vidéo / Recherche Créa</th></tr></thead><tbody>${rows}</tbody></table>`;
    resultsContainer.querySelectorAll('.product-image').forEach(image => image.addEventListener('error', () => {
      const placeholder = document.createElement('span');
      placeholder.className = 'image-empty';
      placeholder.textContent = 'Image indisponible';
      image.replaceWith(placeholder);
    }, { once: true }));
    resultsContainer.querySelectorAll('[data-download-video]').forEach(button => button.addEventListener('click', async () => {
      const videoUrl = button.dataset.downloadVideo;
      const libraryId = button.dataset.libraryId;
      const productName = button.dataset.productName;
      const creativeSearch = button.dataset.creativeSearch === 'true';
      button.disabled = true;
      button.textContent = 'Préparation…';
      try {
        const response = await sendRuntimeMessage({ type: 'SELLMASTER_DOWNLOAD_AD_VIDEO', videoUrl, libraryId, productName, creativeSearch });
        if (!response?.ok) throw new Error(response?.error || 'Téléchargement impossible.');
        notify('Téléchargement vidéo lancé.', 'success');
        button.textContent = 'Téléchargement lancé';
      } catch (error) {
        notify(error.message || 'Téléchargement vidéo impossible.', 'error');
        button.textContent = 'Réessayer';
        button.disabled = false;
      }
    }));
    resultsContainer.querySelectorAll('[data-creative-index]').forEach(button => button.addEventListener('click', () => {
      const item = results[Number(button.dataset.creativeIndex)];
      if (item) startCreativeResearch(item);
    }));
    resultsContainer.querySelectorAll('[data-visual-source-index]').forEach(button => button.addEventListener('click', () => {
      const item = results[Number(button.dataset.visualSourceIndex)];
      const imageUrl = item?.imageUrl || item?.adImageUrl;
      if (!imageUrl) return notify('Aucune image disponible pour ce résultat.', 'error');
      visualReferenceBlob = null;
      visualReferenceUrl = imageUrl;
      visualPreview.src = imageUrl;
      visualPreview.hidden = false;
      visualSearchButton.disabled = false;
      setResearchMode('visual');
      notify(`Image de référence sélectionnée : ${item.product}.`, 'success');
    }));
    csvButton.disabled = false;
    pdfButton.disabled = false;
  }

  function activeDaysSince(startedAt) {
    return Math.max(0, Math.floor((Date.now() - startedAt.getTime()) / 86400000));
  }

  function creativeQueryCandidates(item) {
    const sourceTitle = String(item.product || '').replace(/^collection\s*:\s*/i, '').trim();
    const title = /^(nom non d[eé]tect[eé]|catalogue de la boutique)$/i.test(sourceTitle)
      ? productNameFromDestination(item.store).replace(/^collection\s*:\s*/i, '').trim()
      : sourceTitle;
    if (!title || /^(nom non d[eé]tect[eé]|catalogue de la boutique)$/i.test(title)) return [];

    const candidates = [];
    const add = value => {
      const phrase = String(value || '').trim().replace(/\s+/g, ' ').slice(0, 120);
      const normalized = phrase.toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
      if (phrase && normalized && !candidates.some(existing => existing.toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim() === normalized)) {
        candidates.push(phrase);
      }
    };

    add(title);
    const stopWords = new Set(['avec', 'dans', 'pour', 'sur', 'the', 'and', 'for', 'with', 'from', 'les', 'des', 'une', 'un', 'aux', 'par', 'est', 'qui', 'vous', 'votre']);
    const genericWords = new Set(['produit', 'product', 'gélule', 'gelule', 'gélules', 'gelules', 'capsule', 'capsules', 'creme', 'crème', 'huile', 'serum', 'sérum', 'pack', 'lot']);
    const titleTerms = normalizeMetaText(title).match(/[a-z0-9]+/g) || [];
    const coreTerms = titleTerms.filter(term => term.length > 2 && !stopWords.has(term) && !genericWords.has(term));
    if (coreTerms.length >= 2) add(coreTerms.join(' '));
    const unaccentedTitle = title.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    if (unaccentedTitle !== title) add(unaccentedTitle);
    if (item.store) {
      try {
        const url = new URL(item.store);
        const segments = url.pathname.split('/').filter(Boolean);
        const productIndex = segments.findIndex(segment => segment.toLowerCase() === 'products');
        const collectionIndex = segments.findIndex(segment => segment.toLowerCase() === 'collections');
        const slug = segments[productIndex >= 0 ? productIndex + 1 : collectionIndex + 1];
        if (slug) add(decodeURIComponent(slug).replace(/[-_]+/g, ' '));
      } catch (_) {
        return candidates.slice(0, 4);
      }
    }

    if (coreTerms.length >= 3) add(coreTerms.slice(-2).join(' '));
    if (coreTerms.length >= 4) add(coreTerms.slice(0, 2).join(' '));
    return candidates.slice(0, 4);
  }

  function creativeSearchUrl(query) {
    const url = new URL('https://www.facebook.com/ads/library/');
    url.searchParams.set('active_status', 'all');
    url.searchParams.set('ad_type', 'all');
    url.searchParams.set('country', 'ALL');
    url.searchParams.set('is_targeted_country', 'false');
    url.searchParams.set('media_type', 'all');
    url.searchParams.set('q', query);
    url.searchParams.set('search_type', 'keyword_unordered');
    return url.toString();
  }

  function deserializeCreativeItems(items) {
    return (Array.isArray(items) ? items : []).map(item => ({
      ...item,
      startedAt: item.startedAt instanceof Date ? item.startedAt : new Date(item.startedAt),
      matchedQueries: Array.isArray(item.matchedQueries) ? item.matchedQueries : [],
    })).filter(item => item.startedAt instanceof Date && !Number.isNaN(item.startedAt.getTime()));
  }

  function creativeResultKey(item) {
    if (item.videoUrl) {
      try {
        const video = new URL(item.videoUrl);
        return `video:${video.origin}${video.pathname}`;
      } catch (_) {
        return `video:${item.videoUrl}`;
      }
    }
    return `ad:${item.adLibraryUrl}`;
  }

  function mergeCreativeItem(map, item) {
    const key = creativeResultKey(item);
    const existing = map.get(key);
    if (!existing) {
      map.set(key, item);
      return;
    }

    existing.matchedQueries = [...new Set([...(existing.matchedQueries || []), ...(item.matchedQueries || [])])];
    if ((item.matchScore || 0) > (existing.matchScore || 0)) {
      existing.matchScore = item.matchScore;
      existing.matchConfidence = item.matchConfidence;
    }
    if (item.startedAt < existing.startedAt) {
      const matchedQueries = existing.matchedQueries;
      const matchScore = existing.matchScore;
      const matchConfidence = existing.matchConfidence;
      Object.assign(existing, item, { matchedQueries, matchScore, matchConfidence });
    }
  }

  async function scanCreativeQuery(job) {
    const query = job.queries[job.queryIndex];
    const unique = new Map();
    let previousCardCount = 0;
    let idleRounds = 0;

    for (let round = 0; round < 30; round += 1) {
      const cards = findAdCards();
      cards.forEach(card => {
        const item = getCardValue(card, job.activeDays, query, job.productName);
        if (item) mergeCreativeItem(unique, item);
      });

      const collected = [...unique.values()]
        .sort((left, right) => right.startedAt - left.startedAt)
        .slice(0, job.limit);
      notify(`Recherche Créa ${job.queryIndex + 1}/${job.queries.length} « ${query} » · ${collected.length}/${job.limit} annonces uniques`, '');
      if (collected.length >= job.limit) return collected;

      const cardCount = findAdCards().length;
      idleRounds = cardCount > previousCardCount ? 0 : idleRounds + 1;
      previousCardCount = cardCount;
      if (idleRounds >= 5) return collected;

      window.scrollBy({ top: Math.max(500, Math.floor(window.innerHeight * 0.75)), behavior: 'smooth' });
      await wait(900);
    }

    return [...unique.values()]
      .sort((left, right) => right.startedAt - left.startedAt)
      .slice(0, job.limit);
  }

  async function startCreativeResearch(item) {
    if (!await ensureOwnerSession()) return;
    await settingsReady;
    let options;
    try {
      options = readScanOptions();
    } catch (error) {
      notify(error.message, 'error');
      return;
    }

    const queries = creativeQueryCandidates(item);
    if (!queries.length) {
      notify('Aucun mot-clé exploitable pour ce produit.', 'error');
      return;
    }

    try {
      await persistScanOptions(options);
      const response = await sendRuntimeMessage({
        type: 'SELLMASTER_BEGIN_CREATIVE_SEARCH',
        queries,
        productName: item.product,
        limit: options.limit,
        activeDays: options.activeDays,
      });
      if (!response?.ok) throw new Error(response?.error || 'Impossible de démarrer Recherche Créa.');
      notify(`Recherche Créa démarrée : ${queries.length} variantes du nom produit.`, 'success');
    } catch (error) {
      notify(error.message || 'Impossible de démarrer Recherche Créa.', 'error');
    }
  }

  async function resumeCreativeResearch() {
    if (!await ensureOwnerSession()) return;
    const response = await sendRuntimeMessage({ type: 'SELLMASTER_GET_CREATIVE_SEARCH_JOB' });
    if (!response?.ok || !response.data) return;

    const job = response.data;
    if (!Array.isArray(job.queries) || !job.queries[job.queryIndex]) return;
    const expectedQuery = job.queries[job.queryIndex];
    const currentQuery = (new URLSearchParams(location.search).get('q') || '').trim();
    if (normalizeMetaText(currentQuery) !== normalizeMetaText(expectedQuery)) {
      location.assign(creativeSearchUrl(expectedQuery));
      return;
    }

    resultsMode = 'creative';
    searchButton.disabled = true;
    scanButton.disabled = true;
    try {
      await settingsReady;
      const collected = await scanCreativeQuery(job);
      const nextIndex = job.queryIndex + 1;
      const merged = new Map(deserializeCreativeItems(job.results).map(item => [creativeResultKey(item), item]));
      collected.forEach(item => mergeCreativeItem(merged, item));
      const mergedResults = [...merged.values()].sort((left, right) => right.startedAt - left.startedAt);
      if (nextIndex < job.queries.length) {
        job.results = mergedResults.map(item => ({ ...item, startedAt: item.startedAt.toISOString() }));
        job.queryIndex = nextIndex;
        await chrome.storage.local.set({ [creativeJobStorageKey]: job });
        location.assign(creativeSearchUrl(job.queries[nextIndex]));
        return;
      }

      results = mergedResults.slice(0, job.limit);
      const queriesSearched = job.queryIndex + 1;
      lastScanOptions = { limit: job.limit, activeDays: job.activeDays, keyword: `Recherche Créa · ${job.productName}` };
      keywordInput.value = job.queries.join(' · ');
      await chrome.storage.local.remove(creativeJobStorageKey);
      notify(`Recherche Créa terminée : ${results.length} annonce(s) uniques depuis ${queriesSearched} requête(s). Les résultats sont fusionnés par lien produit.`, results.length ? 'success' : '');
      render();
      notify(`Récupération des images produit pour ${results.length} annonce(s)...`, '');
      await hydrateProductImages(results);
      render();
      try {
        notify('Ajout des visuels à votre bibliothèque Sellmaster...', '');
        const indexed = await indexVisualItems(results);
        if (indexed) notify(`${indexed} visuel(s) ajouté(s) à votre bibliothèque de recherche visuelle.`, 'success');
      } catch (error) {
        notify(`Recherche Créa terminée; indexation visuelle indisponible : ${error.message}`, 'error');
      }
      notify(`Recherche Créa terminée : ${results.length} annonce(s) uniques depuis ${queriesSearched} requête(s).`, results.length ? 'success' : '');
    } catch (error) {
      notify(`Recherche Créa interrompue : ${error.message || 'erreur inconnue'}`, 'error');
    } finally {
      searchButton.disabled = false;
      scanButton.disabled = false;
    }
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
      if (extensionStorage) await extensionStorage.remove(creativeJobStorageKey);
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

  function setResearchMode(mode) {
    const isVisual = mode === 'visual';
    textResearchPanel.hidden = isVisual;
    visualResearchPanel.hidden = !isVisual;
    textTab.setAttribute('aria-pressed', String(!isVisual));
    visualTab.setAttribute('aria-pressed', String(isVisual));
    if (isVisual && results.length && resultsMode !== 'visual') render();
  }

  async function hashRemoteImage(imageUrl) {
    const response = await sendRuntimeMessage({ type: 'SELLMASTER_HASH_IMAGE', imageUrl });
    if (!response?.ok || !response.imageHash) throw new Error(response?.error || 'Impossible de lire une image de création.');
    return response.imageHash;
  }

  async function indexVisualItems(items) {
    const queue = items.filter(item => item.adLibraryUrl && (item.adImageUrl || item.imageUrl));
    let index = 0;
    const indexedItems = [];
    const worker = async () => {
      while (index < queue.length) {
        const item = queue[index++];
        const libraryId = new URL(item.adLibraryUrl).searchParams.get('id') || '';
        const imageUrl = item.adImageUrl || item.imageUrl;
        try {
          const imageHash = await hashRemoteImage(imageUrl);
          indexedItems.push({
            libraryId,
            imageHash,
            imageUrl,
            storeUrl: item.store,
            videoUrl: item.videoUrl,
            productName: item.product,
            pageName: item.page,
            country: item.country,
            startedAt: item.startedAt instanceof Date ? item.startedAt.toISOString() : item.startedAt,
          });
        } catch (_) {
          // Some ad thumbnails expire or are not accessible as image files.
        }
      }
    };
    await Promise.all(Array.from({ length: Math.min(3, queue.length) }, worker));
    let indexed = 0;
    for (let offset = 0; offset < indexedItems.length; offset += 50) {
      const response = await sendRuntimeMessage({
        type: 'SELLMASTER_API',
        path: '/creative-visual/index',
        method: 'POST',
        body: { items: indexedItems.slice(offset, offset + 50) },
      });
      if (!response?.ok) throw new Error(response?.error || 'Indexation visuelle indisponible.');
      indexed += Number(response.data?.indexed || 0);
    }
    return indexed;
  }

  async function searchVisualLibrary() {
    if (!await ensureOwnerSession()) return;
    if (!visualReferenceBlob && !visualReferenceUrl) {
      notify('Importez une image ou sélectionnez l’image d’un produit dans les résultats.', 'error');
      return;
    }
    visualSearchButton.disabled = true;
    try {
      const imageHash = visualReferenceBlob
        ? await SellmasterVisualHash.hashBlob(visualReferenceBlob)
        : await hashRemoteImage(visualReferenceUrl);
      const response = await sendRuntimeMessage({
        type: 'SELLMASTER_API',
        path: '/creative-visual/search',
        method: 'POST',
        body: { imageHash, limit: 50, maxDistance: 20 },
      });
      if (!response?.ok) throw new Error(response?.error || 'Recherche visuelle impossible.');
      const data = response.data || {};
      resultsMode = 'visual';
      results = (Array.isArray(data.matches) ? data.matches : []).map(item => ({
        store: item.storeUrl || '',
        productPageUrl: canonicalProductPageUrl(item.storeUrl || ''),
        adLibraryUrl: `https://www.facebook.com/ads/library/?id=${encodeURIComponent(item.libraryId)}`,
        videoUrl: item.videoUrl || '',
        adImageUrl: item.imageUrl || '',
        imageUrl: item.imageUrl || '',
        product: item.productName || 'Nom non détecté',
        page: item.pageName || 'Page non détectée',
        country: item.country || '',
        startedAt: new Date(item.startedAt || Date.now()),
        visualSimilarity: item.similarity,
      }));
      lastScanOptions = { ...lastScanOptions, keyword: 'Recherche visuelle' };
      render();
      if (!data.indexedCount) {
        notify('La bibliothèque visuelle est vide. Lancez d’abord un scan Ads Library pour la remplir.', '');
      } else {
        notify(`${results.length} création(s) proche(s) trouvée(s) dans ${data.indexedCount} visuel(s) indexé(s).`, results.length ? 'success' : '');
      }
    } catch (error) {
      notify(error.message || 'Recherche visuelle impossible.', 'error');
    } finally {
      visualSearchButton.disabled = false;
    }
  }

  async function scanAds() {
    scanButton.disabled = true;
    resultsMode = 'standard';
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
      try {
        notify('Ajout des visuels à votre bibliothèque Sellmaster...', '');
        const indexed = await indexVisualItems(results);
        if (indexed) notify(`${indexed} visuel(s) ajouté(s) à votre bibliothèque de recherche visuelle.`, 'success');
      } catch (error) {
        notify(`Scan terminé; indexation visuelle indisponible : ${error.message}`, 'error');
      }
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
    const creativeFields = resultsMode === 'creative' ? ['Requêtes trouvées', 'Pertinence'] : [];
    const visualFields = resultsMode === 'visual' ? ['Similarité visuelle'] : [];
    const fields = ['Image du produit', 'Lien de la boutique', 'Nom du produit', 'Nom de la page', 'Pays', 'Début de diffusion', 'Jours actifs', 'Lien vidéo', ...creativeFields, ...visualFields, 'Lien bibliothèque vidéo'];
    const lines = [fields, ...results.map(item => [item.imageUrl, item.store, item.product, item.page, item.country, item.startedAt.toLocaleDateString('fr-FR'), activeDaysSince(item.startedAt), item.videoUrl, ...(resultsMode === 'creative' ? [(item.matchedQueries || []).join(' | '), item.matchConfidence || ''] : []), ...(resultsMode === 'visual' ? [`${item.visualSimilarity}%`] : []), item.adLibraryUrl])]
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
    const rows = results.map(item => `<tr><td>${item.imageUrl ? `<img src="${escapeHtml(item.imageUrl)}" alt="${escapeHtml(item.product)}" style="width:58px;height:58px;object-fit:cover">` : 'Image indisponible'}</td><td>${item.store ? `<a class="shop-link" href="${escapeHtml(item.store)}">${escapeHtml(item.store)}</a>` : 'Lien non détecté'}</td><td>${escapeHtml(item.product)}</td><td>${escapeHtml(item.page)}</td><td>${escapeHtml(item.country)}</td><td>${item.startedAt.toLocaleDateString('fr-FR')}</td><td>${activeDaysSince(item.startedAt)}</td><td>${item.videoUrl ? `<a class="video-link" href="${escapeHtml(item.videoUrl)}">Télécharger vidéo</a>` : 'Vidéo non détectée'}</td>${resultsMode === 'creative' ? `<td>${escapeHtml((item.matchedQueries || []).join(' | '))}</td><td>${escapeHtml(item.matchConfidence || '')}</td>` : resultsMode === 'visual' ? `<td>${escapeHtml(item.visualSimilarity)} %</td>` : ''}<td class="library-link-cell"><a class="library-link" href="${escapeHtml(item.adLibraryUrl)}">${escapeHtml(item.adLibraryUrl)}</a></td></tr>`).join('');
    const minimumDays = lastScanOptions.activeDays;
    const searchedKeyword = lastScanOptions.keyword || 'myshopify';
    const pdfFilename = exportFilenameStem();
    const creativeHeaders = resultsMode === 'creative' ? '<th>Requêtes trouvées</th><th>Pertinence</th>' : '';
    const visualHeaders = resultsMode === 'visual' ? '<th>Similarité visuelle</th>' : '';
    printWindow.document.write(`<!doctype html><html lang="fr"><meta charset="utf-8"><title>${escapeHtml(pdfFilename)}</title><style>body{font:12px Arial,sans-serif;color:#193333}h1{font-size:18px}table{width:100%;table-layout:fixed;border-collapse:collapse}th,td{padding:7px 6px;border:1px solid #cbd8d3;text-align:left;vertical-align:middle;overflow-wrap:anywhere}th{background:#eef3f0}th:nth-child(1){width:6%}th:nth-child(2){width:12%}th:nth-child(3){width:14%}th:nth-child(4){width:11%}th:nth-child(5){width:7%}th:nth-child(6){width:8%}th:nth-child(7){width:6%}th:nth-child(8){width:12%}th:nth-child(9){width:24%}a{color:#087f83}.shop-link,.video-link{overflow-wrap:anywhere;word-break:break-word}.library-link-cell{text-align:center}.library-link{display:block;max-width:100%;text-align:center;overflow-wrap:anywhere;word-break:break-all;line-height:1.35}@page{size:landscape;margin:10mm}</style><h1>Résultats Ads Library · ${escapeHtml(searchedKeyword)}</h1><p>Mot-clé : ${escapeHtml(searchedKeyword)} · ${results.length} annonce(s), actives depuis au moins ${minimumDays} jour(s) · ${new Date().toLocaleDateString('fr-FR')}</p><table><thead><tr><th>Image</th><th>Boutique</th><th>Produit</th><th>Page</th><th>Pays</th><th>Début de diffusion</th><th>Jours actifs</th><th>Vidéo</th>${creativeHeaders}${visualHeaders}<th>Bibliothèque vidéo</th></tr></thead><tbody>${rows}</tbody></table></html>`);
    printWindow.document.close();
    printWindow.addEventListener('load', () => printWindow.print(), { once: true });
  }

  panel.querySelector('.close').addEventListener('click', () => panel.remove());
  textTab.addEventListener('click', () => setResearchMode('text'));
  visualTab.addEventListener('click', () => setResearchMode('visual'));
  visualImageInput.addEventListener('change', () => {
    const file = visualImageInput.files?.[0];
    if (visualPreview.src.startsWith('blob:')) URL.revokeObjectURL(visualPreview.src);
    visualReferenceBlob = null;
    visualReferenceUrl = '';
    visualSearchButton.disabled = true;
    if (!file) {
      visualPreview.hidden = true;
      visualPreview.removeAttribute('src');
      return;
    }
    if (!file.type.startsWith('image/') || file.size > 8 * 1024 * 1024) {
      visualImageInput.value = '';
      notify('Choisissez une image de 8 Mo maximum (JPG, PNG, WebP ou AVIF).', 'error');
      return;
    }
    visualReferenceBlob = file;
    visualPreview.src = URL.createObjectURL(file);
    visualPreview.hidden = false;
    visualSearchButton.disabled = false;
    notify('Image de référence prête pour la recherche visuelle.', '');
  });
  visualSearchButton.addEventListener('click', searchVisualLibrary);
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
  resumeCreativeResearch().catch(error => notify(error.message || 'Impossible de reprendre Recherche Créa.', 'error'));
})();