const { getConnection } = require('../config/database');

function numericId(value) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function safeHttpsUrl(value, hostPattern, pathPattern = /.*/) {
  try {
    const url = new URL(String(value || ''));
    if (url.protocol !== 'https:' || !hostPattern.test(url.hostname) || !pathPattern.test(url.pathname)) return '';
    return url.toString().slice(0, 2000);
  } catch (_) {
    return '';
  }
}

const META_HOST = /(^|\.)facebook\.com$/i;
const META_PAGE_PATH = /^\/(?:[^/]+(?:\/.*)?)?$/;
const META_CDN_HOST = /(^|\.)fbcdn\.net$/i;

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
      return rows[0] || null;
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
        params.push(cursor);
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
    const conn = await getConnection();
    try {
      const [rows] = await conn.query(`
        UPDATE research_jobs
        SET status = 'cancelled', finished_at = NOW()
        WHERE owner_user_id = $1 AND id = $2 AND status IN ('queued', 'running')
        RETURNING *
      `, [numericId(ownerUserId), numericId(jobId)]);
      return rows[0] || null;
    } finally {
      conn.release();
    }
  },

  async updateProgress(ownerUserId, jobId, payload) {
    const conn = await getConnection();
    try {
      const [rows] = await conn.query(`
        UPDATE research_jobs
        SET status = $3,
            progress = $4,
            attempt_count = GREATEST(attempt_count, $5),
            started_at = COALESCE(started_at, NOW()),
            finished_at = CASE WHEN $3 IN ('completed', 'failed', 'cancelled') THEN NOW() ELSE finished_at END,
            error_code = $6,
            error_message = $7,
            result_summary = $8::jsonb,
            lease_until = NULL
        WHERE owner_user_id = $1 AND id = $2
        RETURNING *
      `, [
        numericId(ownerUserId), numericId(jobId), String(payload.status || 'running'),
        Math.min(100, Math.max(0, Number(payload.progress) || 0)),
        Math.max(0, Number(payload.attemptCount) || 0),
        payload.errorCode ? String(payload.errorCode).slice(0, 80) : null,
        payload.errorMessage ? String(payload.errorMessage).slice(0, 1000) : null,
        JSON.stringify(payload.resultSummary || {}),
      ]);
      return rows[0] || null;
    } finally {
      conn.release();
    }
  },

  async ingestAds(ownerUserId, jobId, ads) {
    const ownerId = numericId(ownerUserId);
    const job = numericId(jobId);
    if (!ownerId || !job) throw new Error('Identifiants invalides.');
    if (!Array.isArray(ads) || ads.length === 0) return { inserted: 0 };
    if (ads.length > 200) throw new Error('Limite de lot dépassée.');

    const conn = await getConnection();
    try {
      await conn.beginTransaction();
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

      let inserted = 0;
      for (const ad of ads) {
        const originalUrl = safeHttpsUrl(ad.originalUrl || ad.adLibraryUrl, META_HOST, /^\/ads\/library\//i);
        if (!originalUrl) continue;
        const platform = String(ad.platform || 'meta').slice(0, 30);
        const externalAdId = ad.externalAdId ? String(ad.externalAdId).replace(/\D/g, '').slice(0, 64) : null;
        const firstSeenAt = new Date().toISOString();
        const reportedLaunchAt = ad.reportedLaunchAt && !Number.isNaN(Date.parse(ad.reportedLaunchAt)) ? new Date(ad.reportedLaunchAt).toISOString() : null;
        const advertiserPageUrl = safeHttpsUrl(ad.advertiserPageUrl, META_HOST, META_PAGE_PATH) || null;
        const creativeUrl = safeHttpsUrl(ad.creativeUrl, META_CDN_HOST) || null;
        const metadata = {
          productName: String(ad.metadata?.productName || '').slice(0, 300),
          country: String(ad.metadata?.country || '').slice(0, 100),
          adCount: Math.max(0, Math.min(10000, Number(ad.metadata?.adCount) || 0)),
          pageCount: Math.max(0, Math.min(10000, Number(ad.metadata?.pageCount) || 0)),
        };
        const [result] = await conn.query(`
          INSERT INTO research_ads
            (owner_user_id, research_job_id, research_product_id, platform, external_ad_id, advertiser_name, advertiser_page_url,
             original_url, format, reported_launch_at, first_seen_at, last_seen_at,
             creative_url, creative_type, source_type, metadata)
          VALUES ($1, $2, (SELECT id FROM research_products WHERE owner_user_id = $1 AND canonical_url = $14 LIMIT 1),
                  $3, $4, $5, $6, $7, $8, $9, $10, NOW(), $11, $12, $13, $15::jsonb)
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
            creative_type = COALESCE(EXCLUDED.creative_type, research_ads.creative_type),
            metadata = EXCLUDED.metadata,
            last_seen_at = NOW()
          RETURNING id
        `, [
          ownerId, job, platform, externalAdId,
          ad.advertiserName ? String(ad.advertiserName).slice(0, 300) : null,
          advertiserPageUrl,
          originalUrl,
          ad.format ? String(ad.format).slice(0, 30) : null,
          reportedLaunchAt,
          firstSeenAt,
          creativeUrl,
          ad.creativeType ? String(ad.creativeType).slice(0, 20) : null,
          'meta_extension',
          String(ad.productUrl || '').slice(0, 2000),
          JSON.stringify(metadata),
        ]);
        const researchAdId = result.rows?.[0]?.id || result.insertId;
        if (researchAdId) {
          await conn.query(`
            INSERT INTO research_job_ads (owner_user_id, research_job_id, research_ad_id, observed_at)
            VALUES ($1, $2, $3, NOW())
            ON CONFLICT (research_job_id, research_ad_id) DO NOTHING
          `, [ownerId, job, researchAdId]);
          inserted += 1;
        }
      }
      await conn.commit();
      return { inserted };
    } catch (error) {
      await conn.rollback();
      throw error;
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
      let conditions = 'owner_user_id = $1';
      if (numericId(productId)) {
        params.push(numericId(productId));
        conditions += ` AND research_product_id = $${params.length}`;
      }
      if (platform) {
        params.push(String(platform).slice(0, 30));
        conditions += ` AND platform = $${params.length}`;
      }
      if (cursor) {
        params.push(cursor);
        conditions += ` AND id < $${params.length}`;
      }
      params.push(safeLimit + 1);
      const [rows] = await conn.query(`
        SELECT * FROM research_ads
        WHERE ${conditions}
        ORDER BY first_seen_at DESC, id DESC
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
        params.push(cursor);
        cursorCondition = ` AND id < $${params.length}`;
      }
      params.push(safeLimit + 1);
      const [rows] = await conn.query(`
        SELECT ad.*
        FROM research_job_ads job_ad
        JOIN research_ads ad ON ad.id = job_ad.research_ad_id
        WHERE job_ad.owner_user_id = $1 AND job_ad.research_job_id = $2${cursorCondition.replace(/\bid\b/g, 'ad.id')}
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