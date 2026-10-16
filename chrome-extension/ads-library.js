(() => {
  'use strict';
  if (document.getElementById('sellmaster-ads-library')) return;

  const COUNTRIES = [
    ['FR', 'France'], ['US', 'États-Unis'], ['CA', 'Canada'], ['GB', 'Royaume-Uni'],
    ['AU', 'Australie'], ['DE', 'Allemagne'], ['IT', 'Italie'], ['ES', 'Espagne'],
    ['NL', 'Pays-Bas'], ['BE', 'Belgique'], ['CH', 'Suisse'], ['SE', 'Suède'],
    ['NO', 'Norvège'], ['DK', 'Danemark'], ['IE', 'Irlande'], ['NZ', 'Nouvelle-Zélande'],
    ['BR', 'Brésil'], ['MX', 'Mexique'], ['AE', 'Émirats arabes unis'], ['IN', 'Inde'],
  ];
  const panel = document.createElement('aside');
  panel.id = 'sellmaster-ads-library';
  panel.innerHTML = `
    <style>
      #sellmaster-ads-library{position:fixed;z-index:2147483647;top:14px;right:14px;width:min(620px,calc(100vw - 28px));max-height:calc(100vh - 28px);overflow:auto;background:#fff;color:#193333;border:1px solid #d7e1dc;border-radius:10px;box-shadow:0 12px 42px #101f1d45;font:13px/1.45 system-ui,-apple-system,"Segoe UI",sans-serif}
      #sellmaster-ads-library *{box-sizing:border-box}#sellmaster-ads-library .head{display:flex;justify-content:space-between;align-items:center;padding:13px 15px;background:#173e3b;color:#fff}#sellmaster-ads-library .title{font-weight:800;font-size:15px}#sellmaster-ads-library .close{border:0;background:transparent;color:#fff;font-size:22px;cursor:pointer}
      #sellmaster-ads-library .body{padding:14px}#sellmaster-ads-library .controls{display:grid;grid-template-columns:minmax(140px,1fr) auto auto;gap:8px;align-items:end}#sellmaster-ads-library label{display:block;margin:0 0 4px;font-size:11px;font-weight:700;color:#526662}#sellmaster-ads-library select,#sellmaster-ads-library button.action{height:38px;border:1px solid #cbd8d3;border-radius:6px;padding:0 10px;font:600 12px system-ui;cursor:pointer}#sellmaster-ads-library select{width:100%;background:#fff;color:#193333}#sellmaster-ads-library button.action{background:#087f83;border-color:#087f83;color:white}#sellmaster-ads-library button.action.secondary{background:#f1f5f3;border-color:#cbd8d3;color:#284540}#sellmaster-ads-library button.action:disabled{opacity:.55;cursor:wait}
      #sellmaster-ads-library .status{margin:10px 0;padding:8px 10px;background:#f1f5f3;color:#53645f;border-radius:5px;font-size:12px}#sellmaster-ads-library .status.error{background:#fff0ed;color:#a33220}#sellmaster-ads-library .status.success{background:#eaf7ef;color:#24623f}#sellmaster-ads-library .results{margin-top:10px;overflow:auto;border:1px solid #e0e8e4;border-radius:5px}#sellmaster-ads-library table{width:100%;border-collapse:collapse;font-size:11px;text-align:left}#sellmaster-ads-library th{position:sticky;top:0;background:#eef3f0;color:#39524b;font-weight:750}#sellmaster-ads-library th,#sellmaster-ads-library td{padding:8px;border-bottom:1px solid #e6ece9;vertical-align:top}#sellmaster-ads-library td a{color:#087f83;overflow-wrap:anywhere}#sellmaster-ads-library .empty{padding:18px;color:#667771;text-align:center}
      @media(max-width:560px){#sellmaster-ads-library .controls{grid-template-columns:1fr 1fr}#sellmaster-ads-library .controls label{grid-column:1/-1}#sellmaster-ads-library .controls select{grid-column:1/-1}#sellmaster-ads-library button.action{font-size:11px;padding:0 7px}}
    </style>
    <div class="head"><span class="title">Sellmaster · Recherche de produits</span><button type="button" class="close" aria-label="Fermer">×</button></div>
    <div class="body">
      <div class="controls">
        <div><label for="sm-country">Pays ciblé</label><select id="sm-country"></select></div>
        <button type="button" class="action" data-search>Rechercher « myshopify »</button>
        <button type="button" class="action secondary" data-scan>Analyser la page</button>
      </div>
      <div class="status" role="status" aria-live="polite">Chargez les résultats Ads Library, puis lancez l’analyse. Les annonces doivent afficher une date de démarrage.</div>
      <div class="results"><div class="empty">Aucun résultat analysé.</div></div>
      <div class="controls" style="margin-top:9px;grid-template-columns:1fr 1fr">
        <button type="button" class="action secondary" data-csv disabled>Exporter CSV</button>
        <button type="button" class="action secondary" data-pdf disabled>Exporter PDF</button>
      </div>
    </div>`;
  document.documentElement.append(panel);

  const countrySelect = panel.querySelector('#sm-country');
  const status = panel.querySelector('.status');
  const resultsContainer = panel.querySelector('.results');
  const csvButton = panel.querySelector('[data-csv]');
  const pdfButton = panel.querySelector('[data-pdf]');
  const params = new URLSearchParams(location.search);
  const currentCountry = COUNTRIES.some(([code]) => code === params.get('country')) ? params.get('country') : 'FR';
  let results = [];

  COUNTRIES.forEach(([code, name]) => {
    const option = document.createElement('option');
    option.value = code;
    option.textContent = name;
    option.selected = code === currentCountry;
    countrySelect.append(option);
  });

  function notify(text, kind = '') {
    status.textContent = text;
    status.className = `status${kind ? ` ${kind}` : ''}`;
  }

  function decodedDestination(rawHref) {
    let current = rawHref;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        const url = new URL(current, location.href);
        const nested = url.searchParams.get('u') || url.searchParams.get('url');
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

  function parseStartDate(text) {
    const match = text.match(/(?:started running(?: on)?|active since|diffus(?:e|ée) depuis|d[eé]but de diffusion\s*:?)\s*([a-zéû]+\s+\d{1,2},?\s+\d{4}|\d{1,2}\s+[a-zéû]+\s+\d{4}|\d{1,2}[/.]\d{1,2}[/.]\d{4})/i);
    if (!match) return null;
    const value = match[1].replace(/,/g, '').trim().toLowerCase();
    const months = { jan: 0, january: 0, janvier: 0, feb: 1, february: 1, février: 1, fevrier: 1, mar: 2, march: 2, mars: 2, apr: 3, april: 3, avril: 3, may: 4, mai: 4, jun: 5, june: 5, juin: 5, jul: 6, july: 6, juillet: 6, aug: 7, august: 7, août: 7, aout: 7, sep: 8, sept: 8, september: 8, septembre: 8, oct: 9, october: 9, octobre: 9, nov: 10, november: 10, novembre: 10, dec: 11, december: 11, décembre: 11, decembre: 11 };
    const numeric = value.match(/^(\d{1,2})[/.](\d{1,2})[/.](\d{4})$/);
    if (numeric) return new Date(Number(numeric[3]), Number(numeric[2]) - 1, Number(numeric[1]));
    const english = value.match(/^([a-zéû]+)\s+(\d{1,2})\s+(\d{4})$/);
    const french = value.match(/^(\d{1,2})\s+([a-zéû]+)\s+(\d{4})$/);
    const dateParts = english
      ? [english[3], months[english[1]], english[2]]
      : french ? [french[3], months[french[2]], french[1]] : null;
    if (!dateParts || dateParts[1] === undefined) return null;
    const date = new Date(Number(dateParts[0]), Number(dateParts[1]), Number(dateParts[2]));
    return Number.isNaN(date.getTime()) ? null : date;
  }

  function getCardValue(card) {
    const text = card.innerText || '';
    const startedAt = parseStartDate(text);
    if (!startedAt || (Date.now() - startedAt.getTime()) < 10 * 86400000) return null;

    const anchors = [...card.querySelectorAll('a[href]')];
    const storeUrl = anchors.map(anchor => decodedDestination(anchor.href)).find(Boolean) || '';
    const headings = [...card.querySelectorAll('h1,h2,h3,h4,[role="heading"]')]
      .map(element => element.innerText.trim())
      .filter(value => value && !/^(sponsored|sponsoris[eé]|publicit[eé])$/i.test(value));
    const pageLink = anchors.find(anchor => /facebook\.com\/(?!ads\/library)/i.test(anchor.href) && anchor.innerText.trim());
    const pageName = pageLink?.innerText.trim() || 'Page non détectée';
    const productName = headings.find(value => value !== pageName) || 'Nom non détecté';
    return {
      store: storeUrl,
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
    const rows = results.map(item => `<tr><td>${item.store ? `<a href="${escapeHtml(item.store)}" target="_blank" rel="noopener noreferrer">${escapeHtml(new URL(item.store).hostname)}</a>` : 'Lien non détecté'}</td><td>${escapeHtml(item.product)}</td><td>${escapeHtml(item.page)}</td><td>${escapeHtml(item.country)}</td><td>${item.startedAt.toLocaleDateString('fr-FR')}</td></tr>`).join('');
    resultsContainer.innerHTML = `<table><thead><tr><th>Boutique</th><th>Produit</th><th>Page</th><th>Pays</th><th>Actif depuis</th></tr></thead><tbody>${rows}</tbody></table>`;
    csvButton.disabled = false;
    pdfButton.disabled = false;
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
  }

  function searchAds() {
    const url = new URL('https://www.facebook.com/ads/library/');
    url.searchParams.set('active_status', 'active');
    url.searchParams.set('ad_type', 'ALL');
    url.searchParams.set('country', countrySelect.value);
    url.searchParams.set('q', 'myshopify');
    url.searchParams.set('search_type', 'keyword_unordered');
    url.searchParams.set('media_type', 'all');
    location.assign(url.toString());
  }

  function scanAds() {
    const cards = [...document.querySelectorAll('[role="article"]')];
    const unique = new Map();
    cards.forEach(card => {
      const item = getCardValue(card);
      if (!item) return;
      const key = [item.store, item.product, item.page].join('|');
      if (!unique.has(key)) unique.set(key, item);
    });
    results = [...unique.values()]
      .sort((left, right) => left.startedAt - right.startedAt)
      .slice(0, 20);
    render();
    notify(`${results.length} annonce(s) trouvée(s) avec une date de démarrage d’au moins 10 jours. Seules les cartes déjà chargées par Ads Library sont analysées.`, results.length ? 'success' : '');
  }

  function exportCsv() {
    const fields = ['Lien de la boutique', 'Nom du produit', 'Nom de la page', 'Pays', 'Actif depuis'];
    const lines = [fields, ...results.map(item => [item.store, item.product, item.page, item.country, item.startedAt.toLocaleDateString('fr-FR')])]
      .map(row => row.map(value => `"${String(value).replace(/"/g, '""')}"`).join(';'));
    const blob = new Blob([`\ufeff${lines.join('\r\n')}`], { type: 'text/csv;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'sellmaster-ads-library.csv';
    link.click();
    URL.revokeObjectURL(link.href);
  }

  function exportPdf() {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      notify('Autorisez les fenêtres pop-up pour générer le PDF.', 'error');
      return;
    }
    const rows = results.map(item => `<tr><td>${item.store ? `<a href="${escapeHtml(item.store)}">${escapeHtml(item.store)}</a>` : 'Lien non détecté'}</td><td>${escapeHtml(item.product)}</td><td>${escapeHtml(item.page)}</td><td>${escapeHtml(item.country)}</td><td>${item.startedAt.toLocaleDateString('fr-FR')}</td></tr>`).join('');
    printWindow.document.write(`<!doctype html><html lang="fr"><meta charset="utf-8"><title>Sellmaster Ads Library</title><style>body{font:12px Arial,sans-serif;color:#193333}h1{font-size:18px}table{width:100%;border-collapse:collapse}th,td{padding:8px;border:1px solid #cbd8d3;text-align:left;vertical-align:top;overflow-wrap:anywhere}th{background:#eef3f0}a{color:#087f83}@page{size:landscape;margin:12mm}</style><h1>Résultats Ads Library · myshopify</h1><p>${results.length} produit(s), annonces actives depuis au moins 10 jours · ${new Date().toLocaleDateString('fr-FR')}</p><table><thead><tr><th>Boutique</th><th>Produit</th><th>Page</th><th>Pays</th><th>Actif depuis</th></tr></thead><tbody>${rows}</tbody></table></html>`);
    printWindow.document.close();
    printWindow.addEventListener('load', () => printWindow.print(), { once: true });
  }

  panel.querySelector('.close').addEventListener('click', () => panel.remove());
  panel.querySelector('[data-search]').addEventListener('click', searchAds);
  panel.querySelector('[data-scan]').addEventListener('click', scanAds);
  csvButton.addEventListener('click', exportCsv);
  pdfButton.addEventListener('click', exportPdf);
})();