const { resolvePageVisual } = require('./pageBuilderVisuals');

function escapeShopifyHtml(value) {
  return String(value || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function safeImageUrl(value) {
  return typeof value === 'string' && /^https:\/\//i.test(value) ? value : '';
}

function buildShopifyPageHtml(page) {
  const content = page?.content_json || {};
  const analysis = content.analysis || {};
  const copy = content.copy || {};
  const sections = Array.isArray(copy.sections) ? copy.sections : [];
  const productImages = Array.isArray(page?.project?.product_data?.images)
    ? page.project.product_data.images.map(safeImageUrl).filter(Boolean)
    : [];
  const title = escapeShopifyHtml(page.title || analysis.commercialName || 'Landing page');
  const hero = sections.find((section) => section.id === 'hero' || section.stage === 'attention') || sections[0] || {};
  const heroImage = resolvePageVisual(page, { id: 'hero', imageType: 'hero' }, 0)
    || safeImageUrl(content.images?.[0]) || productImages[0] || '';
  const price = Number(content.offer?.price);
  const stageLabels = { attention: 'ATTENTION', interest: 'INTÉRÊT', desire: 'DÉSIR', action: 'ACTION' };

  const itemsHtml = (items) => Array.isArray(items) && items.length
    ? `<ul style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px;padding:0;list-style:none;">${items.slice(0, 8).map((item) => `<li style="padding:16px;border:1px solid #e1e7e4;border-radius:8px;background:#fff;"><strong>${escapeShopifyHtml(item.title || item.question)}</strong><p>${escapeShopifyHtml(item.text || item.answer)}</p></li>`).join('')}</ul>`
    : '';
  const sectionHtml = sections.filter((section) => section.id !== 'hero' && section.id !== 'action' && section.stage !== 'attention' && section.stage !== 'action').map((section, index) => {
    const image = resolvePageVisual(page, section, index + 1);
    const imageHtml = image
      ? `<img src="${escapeShopifyHtml(image)}" alt="${escapeShopifyHtml(section.title || title)}" style="width:100%;max-width:440px;max-height:440px;object-fit:cover;border-radius:12px;" />`
      : '';
    const direction = index % 2 ? 'row-reverse' : 'row';
    const stage = stageLabels[section.stage] || '';
    return `<section style="max-width:1080px;margin:32px auto;padding:32px 20px;display:flex;flex-direction:${direction};align-items:center;gap:32px;text-align:left;background:${index % 2 ? '#f5f8f6' : '#fff'};border-radius:12px;">${imageHtml ? `<div style="flex:1;min-width:0;">${imageHtml}</div>` : ''}<div style="flex:1;min-width:0;">${stage ? `<p style="color:#087a60;font-size:12px;font-weight:700;">${stage}</p>` : ''}<h2>${escapeShopifyHtml(section.title)}</h2>${section.subtitle ? `<h3>${escapeShopifyHtml(section.subtitle)}</h3>` : ''}${section.body ? `<p style="line-height:1.7;color:#526170;">${escapeShopifyHtml(section.body)}</p>` : ''}${itemsHtml(section.items)}${section.cta ? `<p style="font-weight:700;color:#087a60;">${escapeShopifyHtml(section.cta)}</p>` : ''}</div></section>`;
  }).join('');
  const subtitle = escapeShopifyHtml(hero.subtitle || analysis.shortDescription || '');
  const heroCta = escapeShopifyHtml(hero.cta || 'Découvrir le produit');
  const heroMedia = heroImage ? `<img src="${escapeShopifyHtml(heroImage)}" alt="${title}" style="width:100%;max-width:500px;max-height:560px;object-fit:cover;border-radius:12px;" />` : '';
  const heroHtml = `<section style="max-width:1180px;margin:auto;padding:48px 24px;display:flex;flex-wrap:wrap;align-items:center;gap:36px;"><div style="flex:1;min-width:280px;"><p style="color:#087a60;font-size:12px;font-weight:700;">ATTENTION</p><h1>${escapeShopifyHtml(hero.title || title)}</h1>${subtitle ? `<p style="font-size:18px;line-height:1.7;color:#526170;">${subtitle}</p>` : ''}${hero.body ? `<p>${escapeShopifyHtml(hero.body)}</p>` : ''}<p style="display:inline-block;padding:13px 20px;border-radius:6px;background:#087a60;color:#fff;font-weight:700;">${heroCta}</p></div>${heroMedia ? `<div style="flex:1;min-width:280px;text-align:center;">${heroMedia}</div>` : ''}</section>`;
  const action = sections.find((section) => section.stage === 'action' || section.id === 'action');
  const actionCta = escapeShopifyHtml(action?.cta || hero.cta || 'Commander maintenant');
  const actionImage = action ? resolvePageVisual(page, action, 3) : '';
  const actionImageHtml = actionImage
    ? `<img src="${escapeShopifyHtml(actionImage)}" alt="${escapeShopifyHtml(action?.title || title)}" style="width:100%;max-width:440px;max-height:360px;object-fit:cover;border-radius:12px;" />`
    : '';
  const priceHtml = Number.isFinite(price) && price > 0
    ? `<p style="font-size:28px;font-weight:700;">${new Intl.NumberFormat('fr-FR').format(price)} FCFA</p>`
    : '';
  const actionHtml = action
    ? `<section style="max-width:1080px;margin:36px auto;padding:36px 20px;display:flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:28px;text-align:center;background:#f5f8f6;border-radius:12px;">${actionImageHtml ? `<div style="flex:1;min-width:260px;">${actionImageHtml}</div>` : ''}<div style="flex:1;min-width:260px;"><p style="color:#087a60;font-size:12px;font-weight:700;">ACTION</p><h2>${escapeShopifyHtml(action.title)}</h2>${action.subtitle ? `<h3>${escapeShopifyHtml(action.subtitle)}</h3>` : ''}${action.body ? `<p>${escapeShopifyHtml(action.body)}</p>` : ''}${itemsHtml(action.items)}${priceHtml}<p style="display:inline-block;padding:13px 20px;border-radius:6px;background:#087a60;color:#fff;font-weight:700;">${actionCta}</p></div></section>`
    : '';

  return `<main style="max-width:1240px;margin:auto;padding:16px;font-family:Arial,sans-serif;color:#172238;">${heroHtml}${sectionHtml}${actionHtml}</main>`;
}

module.exports = { buildShopifyPageHtml };