function publicImageUrl(value, baseUrl = process.env.BACKEND_PUBLIC_URL || 'https://sellmaster-1.onrender.com') {
  if (typeof value !== 'string' || !value.trim()) return '';
  if (/^https:\/\//i.test(value)) return value;
  if (!value.startsWith('/')) return '';
  try {
    return new URL(value, baseUrl).toString();
  } catch (_) {
    return '';
  }
}

function resolvePageVisual(page, section, fallbackIndex = 0) {
  const content = page?.content_json || {};
  const key = section?.imageType || section?.id || '';
  const choice = content.visualSources?.[key];
  const sourceImages = Array.isArray(content.sourceImages)
    ? content.sourceImages
    : Array.isArray(page?.project?.product_data?.images) ? page.project.product_data.images : [];
  const originalIndex = Number.isInteger(Number(choice?.imageIndex)) ? Number(choice.imageIndex) : fallbackIndex;
  const original = publicImageUrl(sourceImages[originalIndex]);
  const generated = publicImageUrl(content.generatedAssets?.[key]);

  if (choice?.source === 'original') return original || generated;
  if (choice?.source === 'generated') return generated || original;
  return generated || original;
}

module.exports = { publicImageUrl, resolvePageVisual };