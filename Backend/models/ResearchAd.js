const { getConnection } = require('../config/database');

function numericId(value) {
  if (typeof value === 'number' && (!Number.isSafeInteger(value) || value <= 0)) return null;
  if (typeof value !== 'string' && typeof value !== 'number' && typeof value !== 'bigint') return null;
  const rawId = String(value).trim();
  if (!/^\d+$/.test(rawId)) return null;
  try {
    const id = BigInt(rawId);
    return id > 0n && id <= 9223372036854775807n ? id.toString() : null;
  } catch (_) {
    return null;
  }
}

function safeHttpsUrl(value, hostPattern, pathPattern = /.*/) {
  try {
    const url = new URL(String(value || ''));
    if (url.protocol !== 'https:' || url.username || url.password || !hostPattern.test(url.hostname) || !pathPattern.test(url.pathname)) return '';
    return url.toString().slice(0, 2000);
  } catch (_) {
    return '';
  }
}

const META_HOST = /(^|\.)facebook\.com$/i;
const META_PAGE_PATH = /^\/(?:[^/]+(?:\/.*)?)?$/;
const META_CDN_HOST = /(^|\.)fbcdn\.net$/i;
const PRODUCT_IMAGE_HOST = /^(?:cdn\.shopify\.com|(?:[a-z0-9-]+\.)*myshopify\.com)$/i;

function clientReportedCount(value) {
  if (value == null || value === '') return null;
  if (typeof value !== 'number' && !(typeof value === 'string' && /^\d+$/.test(value.trim()))) return undefined;
  const count = Number(value);
  return Number.isSafeInteger(count) && count >= 0 && count <= 10000 ? count : undefined;
}

function normalizeAd(ad) {
  if (!ad || typeof ad !== 'object' || Array.isArray(ad)) return { error: 'Annonce mal formée.' };

  const platform = String(ad.platform || 'meta').trim().toLowerCase();
  if (platform !== 'meta') return { error: 'Plateforme non prise en charge.' };
  const rawExternalAdId = typeof ad.externalAdId === 'string'
    ? ad.externalAdId.trim()
    : Number.isSafeInteger(ad.externalAdId) && ad.externalAdId > 0 ? String(ad.externalAdId) : '';
  if (!/^\d{1,64}$/.test(rawExternalAdId)) return { error: 'Identifiant externe invalide.' };
  const externalAdId = rawExternalAdId;

  const rawOriginalUrl = ad.originalUrl || ad.adLibraryUrl;
  const originalUrl = safeHttpsUrl(rawOriginalUrl, META_HOST, /^\/ads\/library\//i);
  if (!originalUrl) return { error: 'Lien original Meta Ads Library invalide.' };
  const originalUrlId = (() => {
    try {
      const parsed = new URL(originalUrl);
      const ids = parsed.searchParams.getAll('id');
      return ids.length === 1 ? ids[0] : '';
    } catch (_) {
      return '';
    }
  })();
  if (originalUrlId !== externalAdId) return { error: 'L’identifiant du lien original ne correspond pas à externalAdId.' };

  const advertiserPageUrl = ad.advertiserPageUrl
    ? safeHttpsUrl(ad.advertiserPageUrl, META_HOST, META_PAGE_PATH)
    : '';
  if (ad.advertiserPageUrl && !advertiserPageUrl) return { error: 'Lien de page annonceur invalide.' };

  const creativeUrl = ad.creativeUrl
    ? safeHttpsUrl(ad.creativeUrl, META_CDN_HOST)
    : '';
  if (ad.creativeUrl && !creativeUrl) return { error: 'URL de création publicitaire invalide.' };

  const videoUrl = ad.videoUrl
    ? safeHttpsUrl(ad.videoUrl, META_CDN_HOST)
    : '';
  if (ad.videoUrl && !videoUrl) return { error: 'URL de vidéo publicitaire invalide.' };

  const productImageUrl = ad.productImageUrl
    ? safeHttpsUrl(ad.productImageUrl, PRODUCT_IMAGE_HOST)
    : '';
  if (ad.productImageUrl && !productImageUrl) return { error: 'URL d’image produit invalide.' };

  const productUrl = ad.productUrl ? String(ad.productUrl).trim().slice(0, 2000) : '';
  if (productUrl) {
    try {
      const parsed = new URL(productUrl);
      if (parsed.protocol !== 'https:' || /(^|\.)(facebook\.com|instagram\.com|fb\.com)$/i.test(parsed.hostname)) {
        return { error: 'URL produit invalide.' };
      }
    } catch (_) {
      return { error: 'URL produit invalide.' };
    }
  }

  const reportedLaunchAt = ad.reportedLaunchAt == null || ad.reportedLaunchAt === ''
    ? null
    : Number.isNaN(Date.parse(ad.reportedLaunchAt)) ? undefined : new Date(ad.reportedLaunchAt).toISOString();
  if (reportedLaunchAt === undefined) return { error: 'Date de diffusion invalide.' };

  const requestedFormat = String(ad.format || '').trim().toLowerCase();
  if (requestedFormat && !['image', 'video', 'carousel'].includes(requestedFormat)) {
    return { error: 'Format publicitaire non pris en charge.' };
  }
  const format = requestedFormat || (videoUrl ? 'video' : creativeUrl ? 'image' : null);

  const metadataInput = ad.metadata && typeof ad.metadata === 'object' && !Array.isArray(ad.metadata) ? ad.metadata : {};
  const reportedAdCount = clientReportedCount(metadataInput.adCount);
  const reportedPageCount = clientReportedCount(metadataInput.pageCount);
  if (reportedAdCount === undefined || reportedPageCount === undefined) {
    return { error: 'Les compteurs rapportés par le client doivent être des entiers entre 0 et 10000.' };
  }
  const metadata = {
    productName: String(metadataInput.productName || '').trim().slice(0, 300),
    country: String(metadataInput.country || '').trim().slice(0, 100),
    reportedByClient: {
      adCount: reportedAdCount,
      pageCount: reportedPageCount,
    },
  };

  return {
    value: {
      platform,
      externalAdId,
      originalUrl,
      advertiserName: String(ad.advertiserName || '').trim().slice(0, 300) || null,
      advertiserPageUrl: advertiserPageUrl || null,
      format,
      reportedLaunchAt,
      creativeUrl: creativeUrl || null,
      videoUrl: videoUrl || null,
      productImageUrl: productImageUrl || null,
      creativeType: String(ad.creativeType || (videoUrl ? 'video' : creativeUrl ? 'image' : '')).trim().slice(0, 20) || null,
      productUrl,
      metadata,
    },
  };
}

async function saveAd(conn, ownerId, jobId, ad) {
  const [result] = await conn.query(`
    INSERT INTO research_ads
      (owner_user_id, research_job_id, research_product_id, platform, external_ad_id, advertiser_name, advertiser_page_url,
       original_url, format, reported_launch_at, first_seen_at, last_seen_at,
       creative_url, video_url, product_image_url, creative_type, source_type, metadata)
    VALUES ($1, $2, (SELECT id FROM research_products WHERE owner_user_id = $1 AND canonical_url = $14 LIMIT 1),
            $3, $4, $5, $6, $7, $8, $9, NOW(), NOW(), $10, $11, $12, $13, 'meta_extension', $15::jsonb)
    ON CONFLICT (owner_user_id, platform, external_ad_id)
    WHERE external_ad_id IS NOT NULL
    DO UPDATE SET
      research_job_id = COALESCE(research_ads.research_job_id, EXCLUDED.research_job_id),
      research_product_id = COALESCE(EXCLUDED.research_product_id, research_ads.research_product_id),
      advertiser_name = COALESCE(EXCLUDED.advertiser_name, research_ads.advertiser_name),
      advertiser_page_url = COALESCE(EXCLUDED.advertiser_page_url, research_ads.advertiser_page_url),
      original_url = EXCLUDED.original_url,
      format = COALESCE(EXCLUDED.format, research_ads.format),
      creative_url = COALESCE(EXCLUDED.creative_url, research_ads.creative_url),
      video_url = COALESCE(EXCLUDED.video_url, research_ads.video_url),
      product_image_url = COALESCE(EXCLUDED.product_image_url, research_ads.product_image_url),
      creative_type = COALESCE(EXCLUDED.creative_type, research_ads.creative_type),
      metadata = EXCLUDED.metadata,
      last_seen_at = NOW()
    RETURNING id, (xmax = 0) AS created
  `, [
    ownerId, jobId, ad.platform, ad.externalAdId, ad.advertiserName, ad.advertiserPageUrl,
    ad.originalUrl, ad.format, ad.reportedLaunchAt, ad.creativeUrl, ad.videoUrl,
    ad.productImageUrl, ad.creativeType, ad.productUrl, JSON.stringify(ad.metadata),
  ]);

  const row = result.rows?.[0];
  if (!row?.id) throw new Error('Publicité non enregistrée.');
  return { id: row.id, created: row.created === true || row.created === 't' };
}

async function associateAdWithJob(conn, ownerId, jobId, adId) {
  if (!jobId) return;
  await conn.query(`
    INSERT INTO research_job_ads (owner_user_id, research_job_id, research_ad_id, observed_at)
    VALUES ($1, $2, $3, NOW())
    ON CONFLICT (research_job_id, research_ad_id) DO NOTHING
  `, [ownerId, jobId, adId]);
}

const ResearchAd = {
  async createJob(ownerUserId, payload) {
    const ownerId = numericId(ownerUserId);
    if (!ownerId) throw new Error('Utilisateur propriétaire invalide.');
    const conn = await getConnection();
    try {
      const [rows] = await conn.query(`
        INSERT INTO research_jobs
          (owner_user_id, source_type, query_text, target_url, market_code, status, progress, attempt_count,
           max_attempts, available_at, result_summary, created_at)
        VALUES ($1, $2, $3, $4, $5, 'queued', 0, 0, 3, NOW(), '{}'::jsonb, NOW())
        RETURNING *
      `, [
        ownerId,
        String(payload.sourceType || 'meta_extension').slice(0, 30),
        payload.queryText ? String(payload.queryText).trim().slice(0, 200) : null,
        payload.targetUrl ? String(payload.targetUrl).trim().slice(0, 2000) : null,
        payload.marketCode ? String(payload.marketCode).trim().slice(0, 8) : null,
      ]);
      return rows.rows?.[0] || null;
    } finally {
      conn.release();
    }
  },

  async listJobs(ownerUserId, { limit = 30, cursor = null } = {}) {
    const ownerId = numericId(ownerUserId);
    if (!ownerId) return { items: [], nextCursor: null };
    const conn = await getConnection();
    try {
      const safeLimit = Math.min(100, Math.max(1, Number(limit) || 30));
      const params = [ownerId];
      let cursorCondition = '';
      if (cursor) {
        const cursorId = numericId(cursor);
        if (!cursorId) throw new Error('Curseur de pagination invalide.');
        params.push(cursorId);
        cursorCondition = ` AND id < $${params.length}`;
      }
      params.push(safeLimit + 1);
      const [rows] = await conn.query(`
        SELECT * FROM research_jobs
        WHERE owner_user_id = $1${cursorCondition}
        ORDER BY created_at DESC, id DESC
        LIMIT $${params.length}
      `, params);
      const hasMore = rows.length > safeLimit;
      const items = hasMore ? rows.slice(0, safeLimit) : rows;
      return { items, nextCursor: hasMore ? String(items[items.length - 1].id) : null };
    } finally {
      conn.release();
    }
  },

  async getJob(ownerUserId, jobId) {
    const conn = await getConnection();
    try {
      const [rows] = await conn.query(`
        SELECT * FROM research_jobs
        WHERE owner_user_id = $1 AND id = $2
        LIMIT 1
      `, [numericId(ownerUserId), numericId(jobId)]);
      return rows[0] || null;
    } finally {
      conn.release();
    }
  },

  async cancelJob(ownerUserId, jobId) {
    const ownerId = numericId(ownerUserId);
    const numericJobId = numericId(jobId);
    if (!ownerId || !numericJobId) return { outcome: 'invalid', job: null };
    const conn = await getConnection();
    try {
      const [rows] = await conn.query(`
        UPDATE research_jobs
        SET status = 'cancelled', finished_at = NOW(), lease_until = NULL
        WHERE owner_user_id = $1 AND id = $2 AND status IN ('queued', 'running')
        RETURNING *
      `, [ownerId, numericJobId]);
      if (rows.rows?.length) return { outcome: 'updated', job: rows.rows[0] };

      const [existing] = await conn.query(`
        SELECT * FROM research_jobs
        WHERE owner_user_id = $1 AND id = $2
        LIMIT 1
      `, [ownerId, numericJobId]);
      if (!existing.length) return { outcome: 'not_found', job: null };
      return { outcome: 'terminal', job: existing[0] };
    } finally {
      conn.release();
    }
  },

  async updateProgress(ownerUserId, jobId, payload) {
    const ownerId = numericId(ownerUserId);
    const numericJobId = numericId(jobId);
    if (!ownerId || !numericJobId) return { outcome: 'invalid', job: null };

    const requestedStatus = String(payload.status || 'running');
    if (!['running', 'completed', 'failed', 'cancelled'].includes(requestedStatus)) {
      return { outcome: 'invalid_status', job: null };
    }

    const conn = await getConnection();
    try {
      const [rows] = await conn.query(`
        UPDATE research_jobs
        SET status = $3,
            progress = $4,
            attempt_count = GREATEST(attempt_count, $5),
            started_at = COALESCE(started_at, CASE WHEN $3 = 'running' THEN NOW() ELSE started_at END),
            finished_at = CASE WHEN $3 IN ('completed', 'failed', 'cancelled') THEN NOW() ELSE finished_at END,
            error_code = $6,
            error_message = $7,
            result_summary = $8::jsonb,
            lease_until = NULL
        WHERE owner_user_id = $1 AND id = $2 AND status IN ('queued', 'running')
        RETURNING *
      `, [
        ownerId,
        numericJobId,
        requestedStatus,
        Math.min(100, Math.max(0, Number(payload.progress) || 0)),
        Math.max(0, Number(payload.attemptCount) || 0),
        payload.errorCode ? String(payload.errorCode).slice(0, 80) : null,
        payload.errorMessage ? String(payload.errorMessage).slice(0, 1000) : null,
        JSON.stringify(payload.resultSummary || {}),
      ]);
      if (rows.rows?.length) return { outcome: 'updated', job: rows.rows[0] };

      const [existing] = await conn.query(`
        SELECT * FROM research_jobs
        WHERE owner_user_id = $1 AND id = $2
        LIMIT 1
      `, [ownerId, numericJobId]);
      if (!existing.length) return { outcome: 'not_found', job: null };
      if (['completed', 'failed', 'cancelled'].includes(existing[0].status)) {
        return { outcome: 'terminal', job: existing[0] };
      }
      return { outcome: 'not_updated', job: existing[0] };
    } finally {
      conn.release();
    }
  },

  async ingestAds(ownerUserId, jobId = null, ads) {
    const ownerId = numericId(ownerUserId);
    const job = jobId == null || jobId === '' ? null : numericId(jobId);
    if (!ownerId || (jobId != null && jobId !== '' && !job)) throw new Error('Identifiants invalides.');
    if (!Array.isArray(ads) || ads.length === 0) {
      const error = new Error('Le lot doit contenir au moins une annonce sélectionnée.');
      error.statusCode = 400;
      throw error;
    }
    if (ads.length > 200) throw new Error('Limite de lot dépassée.');

    const conn = await getConnection();
    try {
      await conn.beginTransaction();
      if (job) {
        const [jobRows] = await conn.query(`
          SELECT id, status FROM research_jobs WHERE owner_user_id = $1 AND id = $2 LIMIT 1
        `, [ownerId, job]);
        if (!jobRows.length) {
          const error = new Error('Recherche introuvable.');
          error.statusCode = 404;
          throw error;
        }
        if (['completed', 'failed', 'cancelled'].includes(jobRows[0].status)) {
          const error = new Error('Cette recherche est déjà terminée.');
          error.statusCode = 409;
          throw error;
        }
      }

      const results = [];
      for (const [index, rawAd] of ads.entries()) {
        const normalized = normalizeAd(rawAd);
        if (normalized.error) {
          results.push({ index, externalAdId: rawAd?.externalAdId || null, status: 'rejected', reason: normalized.error });
          continue;
        }

        try {
          await conn.query('SAVEPOINT selected_ad');
          const saved = await saveAd(conn, ownerId, job, normalized.value);
          await associateAdWithJob(conn, ownerId, job, saved.id);
          await conn.query('RELEASE SAVEPOINT selected_ad');
          results.push({
            index,
            externalAdId: normalized.value.externalAdId,
            researchAdId: saved.id,
            status: saved.created ? 'created' : 'existing',
          });
        } catch (error) {
          await conn.query('ROLLBACK TO SAVEPOINT selected_ad');
          await conn.query('RELEASE SAVEPOINT selected_ad');
          results.push({
            index,
            externalAdId: normalized.value.externalAdId,
            status: 'error',
            reason: 'Échec technique lors de l’enregistrement de cette annonce.',
          });
        }
      }
      await conn.commit();
      return {
        results,
        created: results.filter(result => result.status === 'created').length,
        existing: results.filter(result => result.status === 'existing').length,
        rejected: results.filter(result => result.status === 'rejected').length,
        failed: results.filter(result => result.status === 'error').length,
      };
    } catch (error) {
      await conn.rollback();
      throw error;
    } finally {
      conn.release();
    }
  },

  async addFavorite(ownerUserId, rawAd) {
    const ownerId = numericId(ownerUserId);
    if (!ownerId) throw new Error('Utilisateur propriétaire invalide.');
    const normalized = normalizeAd(rawAd);
    if (normalized.error) {
      const error = new Error(normalized.error);
      error.statusCode = 400;
      throw error;
    }

    const conn = await getConnection();
    try {
      await conn.beginTransaction();
      const saved = await saveAd(conn, ownerId, null, normalized.value);
      const [favoriteResult] = await conn.query(`
        INSERT INTO saved_research_ads (owner_user_id, research_ad_id)
        VALUES ($1, $2)
        ON CONFLICT (owner_user_id, research_ad_id) DO NOTHING
        RETURNING id
      `, [ownerId, saved.id]);
      await conn.commit();
      return {
        researchAdId: saved.id,
        saved: true,
        alreadySaved: !favoriteResult.rows?.length,
      };
    } catch (error) {
      await conn.rollback();
      throw error;
    } finally {
      conn.release();
    }
  },

  async listFavorites(ownerUserId, { limit = 30, cursor = null } = {}) {
    const ownerId = numericId(ownerUserId);
    if (!ownerId) return { items: [], nextCursor: null };
    const safeLimit = Math.min(100, Math.max(1, Number(limit) || 30));
    const params = [ownerId];
    let cursorCondition = '';
    if (cursor) {
      const cursorId = numericId(cursor);
      if (!cursorId) throw new Error('Curseur de pagination invalide.');
      params.push(cursorId);
      cursorCondition = ` AND (s.created_at, s.id) < (
        SELECT cursor_row.created_at, cursor_row.id
        FROM saved_research_ads cursor_row
        WHERE cursor_row.owner_user_id = $1 AND cursor_row.id = $${params.length}
      )`;
    }
    params.push(safeLimit + 1);

    const conn = await getConnection();
    try {
      const [rows] = await conn.query(`
        SELECT ad.*, s.id AS favorite_id, s.created_at AS created_at, TRUE AS is_favorite
        FROM saved_research_ads s
        JOIN research_ads ad
          ON ad.owner_user_id = s.owner_user_id AND ad.id = s.research_ad_id
        WHERE s.owner_user_id = $1${cursorCondition}
        ORDER BY s.created_at DESC, s.id DESC
        LIMIT $${params.length}
      `, params);
      const hasMore = rows.length > safeLimit;
      const items = hasMore ? rows.slice(0, safeLimit) : rows;
      return { items, nextCursor: hasMore ? String(items[items.length - 1].favorite_id) : null };
    } finally {
      conn.release();
    }
  },

  async removeFavorite(ownerUserId, researchAdId) {
    const ownerId = numericId(ownerUserId);
    const adId = numericId(researchAdId);
    if (!ownerId || !adId) return false;
    const conn = await getConnection();
    try {
      const [rows] = await conn.query(`
        DELETE FROM saved_research_ads
        WHERE owner_user_id = $1 AND research_ad_id = $2
        RETURNING id
      `, [ownerId, adId]);
      return Boolean(rows.rows?.length);
    } finally {
      conn.release();
    }
  },

  async listAds(ownerUserId, { productId = null, platform = '', limit = 30, cursor = null } = {}) {
    const conn = await getConnection();
    try {
      const ownerId = numericId(ownerUserId);
      const safeLimit = Math.min(100, Math.max(1, Number(limit) || 30));
      const params = [ownerId];
      let conditions = 'ad.owner_user_id = $1';
      if (numericId(productId)) {
        params.push(numericId(productId));
        conditions += ` AND ad.research_product_id = $${params.length}`;
      }
      if (platform) {
        params.push(String(platform).slice(0, 30));
        conditions += ` AND ad.platform = $${params.length}`;
      }
      if (cursor) {
        const cursorId = numericId(cursor);
        if (!cursorId) throw new Error('Curseur de pagination invalide.');
        params.push(cursorId);
        conditions += ` AND ad.id < $${params.length}`;
      }
      params.push(safeLimit + 1);
      const [rows] = await conn.query(`
        SELECT ad.*,
          EXISTS (
            SELECT 1 FROM saved_research_ads favorite
            WHERE favorite.owner_user_id = $1 AND favorite.research_ad_id = ad.id
          ) AS is_favorite
        FROM research_ads ad
        WHERE ${conditions}
        ORDER BY ad.first_seen_at DESC, ad.id DESC
        LIMIT $${params.length}
      `, params);
      const hasMore = rows.length > safeLimit;
      const items = hasMore ? rows.slice(0, safeLimit) : rows;
      return { items, nextCursor: hasMore ? String(items[items.length - 1].id) : null };
    } finally {
      conn.release();
    }
  },

  async listJobAds(ownerUserId, jobId, { limit = 50, cursor = null } = {}) {
    const conn = await getConnection();
    try {
      const ownerId = numericId(ownerUserId);
      const safeLimit = Math.min(200, Math.max(1, Number(limit) || 50));
      const params = [ownerId, numericId(jobId)];
      let cursorCondition = '';
      if (cursor) {
        const cursorId = numericId(cursor);
        if (!cursorId) throw new Error('Curseur de pagination invalide.');
        params.push(cursorId);
        cursorCondition = ` AND id < $${params.length}`;
      }
      params.push(safeLimit + 1);
      const [rows] = await conn.query(`
        SELECT ad.*,
          EXISTS (
            SELECT 1 FROM saved_research_ads favorite
            WHERE favorite.owner_user_id = $1 AND favorite.research_ad_id = ad.id
          ) AS is_favorite
        FROM research_job_ads job_ad
        JOIN research_ads ad ON ad.id = job_ad.research_ad_id
        WHERE job_ad.owner_user_id = $1 AND job_ad.research_job_id = $2 AND ad.owner_user_id = $1${cursorCondition.replace(/\bid\b/g, 'ad.id')}
        ORDER BY job_ad.observed_at DESC, ad.id DESC
        LIMIT $${params.length}
      `, params);
      const hasMore = rows.length > safeLimit;
      const items = hasMore ? rows.slice(0, safeLimit) : rows;
      return { items, nextCursor: hasMore ? String(items[items.length - 1].id) : null };
    } finally {
      conn.release();
    }
  },
};

module.exports = ResearchAd;
module.exports.normalizeAd = normalizeAd;
module.exports.numericId = numericId;