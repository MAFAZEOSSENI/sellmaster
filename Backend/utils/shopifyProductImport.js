const DOMAIN_PATTERN = /^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/;
const HANDLE_PATTERN = /^[a-z0-9][a-z0-9_-]*$/i;

function parseShopifyProductUrl(value) {
  let url;
  try {
    url = new URL(String(value || '').trim());
  } catch {
    return null;
  }

  if (
    url.protocol !== 'https:' ||
    url.username ||
    url.password ||
    url.port ||
    url.hostname.toLowerCase().endsWith('.localhost') ||
    !DOMAIN_PATTERN.test(url.hostname.toLowerCase())
  ) {
    return null;
  }

  const match = url.pathname.match(/^\/products\/([^/]+)\/?$/);
  if (!match || !HANDLE_PATTERN.test(match[1])) return null;

  return {
    shopDomain: url.hostname.toLowerCase(),
    handle: match[1],
  };
}

function normalizeScrapedProduct(product) {
  if (!product || typeof product !== 'object' || !String(product.title || '').trim()) {
    return null;
  }

  return {
    title: String(product.title).trim(),
    body_html: typeof product.body_html === 'string' ? product.body_html : '',
    vendor: typeof product.vendor === 'string' ? product.vendor : '',
    images: (Array.isArray(product.images) ? product.images : [])
      .map((image) => (typeof image === 'string' ? image : image?.src))
      .filter((src) => typeof src === 'string' && /^https:\/\//i.test(src)),
    variants: (Array.isArray(product.variants) ? product.variants : []).map((variant) => ({
      title: String(variant.title || variant.option1 || 'Default Title'),
      price: String(variant.price ?? ''),
      sku: variant.sku == null ? '' : String(variant.sku),
    })),
  };
}

function normalizeImportPayload(body = {}) {
  const title = typeof body.title === 'string' ? body.title.trim() : '';
  const price = Number(body.price);
  const description = typeof body.description === 'string' ? body.description : '';
  const images = body.images === undefined ? [] : body.images;
  const variants = body.variants === undefined ? [] : body.variants;

  if (!title || title.length > 255) {
    return { error: 'Le titre est requis et doit contenir au maximum 255 caractères.' };
  }
  if (!Number.isFinite(price) || price <= 0) {
    return { error: 'Le prix doit être supérieur à zéro.' };
  }
  if (description.length > 100000) {
    return { error: 'La description dépasse la taille autorisée.' };
  }
  if (!Array.isArray(images) || images.length > 20 || images.some((image) => typeof image !== 'string' || !/^https:\/\//i.test(image))) {
    return { error: 'Les images doivent être une liste de 20 URL HTTPS maximum.' };
  }
  if (!Array.isArray(variants) || variants.length > 100) {
    return { error: 'La liste des variantes est invalide (100 maximum).' };
  }

  const normalizedVariants = variants.map((variant) => {
    const variantPrice = Number(variant?.price);
    if (!Number.isFinite(variantPrice) || variantPrice < 0) return null;
    const variantTitle = String(variant?.title || 'Default Title').trim();
    const sku = String(variant?.sku || '').trim();
    if (variantTitle.length > 255 || sku.length > 255) return null;
    return { title: variantTitle || 'Default Title', price: variantPrice.toFixed(2), sku: sku || undefined };
  });

  if (normalizedVariants.some((variant) => variant === null)) {
    return { error: 'Une ou plusieurs variantes ont un titre, prix ou SKU invalide.' };
  }

  return {
    value: {
      title,
      description,
      price: price.toFixed(2),
      images: images.map((src) => src.trim()),
      variants: normalizedVariants.length
        ? normalizedVariants
        : [{ title: 'Default Title', price: price.toFixed(2) }],
    },
  };
}

module.exports = { parseShopifyProductUrl, normalizeScrapedProduct, normalizeImportPayload };
