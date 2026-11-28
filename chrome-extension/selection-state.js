(() => {
  'use strict';

  function normalizeLibraryId(value) {
    const id = String(value ?? '').trim();
    return /^\d{1,64}$/.test(id) ? id : '';
  }

  function createSelectionState() {
    const selected = new Set();

    return {
      has(value) {
        const id = normalizeLibraryId(value);
        return Boolean(id && selected.has(id));
      },
      set(value, isSelected) {
        const id = normalizeLibraryId(value);
        if (!id) return false;
        if (isSelected) selected.add(id);
        else selected.delete(id);
        return true;
      },
      selectAll(values) {
        for (const value of values || []) {
          const id = normalizeLibraryId(value);
          if (id) selected.add(id);
        }
        return selected.size;
      },
      clear() {
        selected.clear();
      },
      remove(values) {
        for (const value of values || []) {
          const id = normalizeLibraryId(value);
          if (id) selected.delete(id);
        }
      },
      ids() {
        return [...selected];
      },
      get size() {
        return selected.size;
      },
    };
  }

  function chunkItems(items, maximumSize = 200) {
    if (!Array.isArray(items) || !Number.isInteger(maximumSize) || maximumSize < 1) return [];
    const chunks = [];
    for (let offset = 0; offset < items.length; offset += maximumSize) {
      chunks.push(items.slice(offset, offset + maximumSize));
    }
    return chunks;
  }

  function isImportSettled(status) {
    return status === 'created' || status === 'existing';
  }

  function mergeDetectedAd(existing, next) {
    return {
      ...existing,
      ...next,
      adImageUrl: next?.adImageUrl || existing?.adImageUrl || '',
      videoUrl: next?.videoUrl || existing?.videoUrl || '',
      imageUrl: existing?.imageUrl || '',
      productImageUrl: existing?.productImageUrl || '',
    };
  }

  function buildAdPayload(item) {
    const externalAdId = normalizeLibraryId(item?.libraryId);
    if (!externalAdId) return null;

    let originalUrl;
    try {
      const parsed = new URL(item.adLibraryUrl);
      const ids = parsed.searchParams.getAll('id');
      if (parsed.protocol !== 'https:' || parsed.username || parsed.password
        || !/(^|\.)facebook\.com$/i.test(parsed.hostname)
        || !/^\/ads\/library\//i.test(parsed.pathname)
        || ids.length !== 1 || ids[0] !== externalAdId) return null;
      originalUrl = parsed.toString();
    } catch (_) {
      return null;
    }

    const isHttpsHost = (value, hostPattern) => {
      if (!value) return '';
      try {
        const url = new URL(value);
        return url.protocol === 'https:' && !url.username && !url.password && hostPattern.test(url.hostname)
          ? url.toString().slice(0, 2000)
          : '';
      } catch (_) {
        return '';
      }
    };
    const creativeUrl = isHttpsHost(item.adImageUrl, /(^|\.)fbcdn\.net$/i);
    const videoUrl = isHttpsHost(item.videoUrl, /(^|\.)fbcdn\.net$/i);
    const productImageUrl = isHttpsHost(item.productImageUrl, /^(?:cdn\.shopify\.com|(?:[a-z0-9-]+\.)*myshopify\.com)$/i);
    let productUrl = '';
    if (item.productPageUrl) {
      try {
        const url = new URL(item.productPageUrl);
        if (url.protocol === 'https:' && !/(^|\.)(facebook\.com|instagram\.com|fb\.com)$/i.test(url.hostname)) {
          productUrl = url.toString().slice(0, 2000);
        }
      } catch (_) {
        productUrl = '';
      }
    }
    const format = videoUrl ? 'video' : creativeUrl ? 'image' : '';
    const launchDate = item.startedAt instanceof Date && !Number.isNaN(item.startedAt.getTime())
      ? item.startedAt.toISOString()
      : '';

    return {
      platform: 'meta',
      externalAdId,
      originalUrl,
      advertiserName: String(item.page || '').slice(0, 300),
      advertiserPageUrl: isHttpsHost(item.pageLinkUrl, /(^|\.)facebook\.com$/i),
      ...(creativeUrl ? { creativeUrl } : {}),
      ...(videoUrl ? { videoUrl } : {}),
      ...(productImageUrl ? { productImageUrl } : {}),
      ...(productUrl ? { productUrl } : {}),
      ...(format ? { format, creativeType: format } : {}),
      ...(launchDate ? { reportedLaunchAt: launchDate } : {}),
      metadata: {
        productName: String(item.product || '').slice(0, 300),
        country: String(item.country || '').slice(0, 100),
      },
    };
  }

  globalThis.SellmasterAdSelection = {
    createSelectionState,
    normalizeLibraryId,
    buildAdPayload,
    chunkItems,
    isImportSettled,
    mergeDetectedAd,
  };
})();