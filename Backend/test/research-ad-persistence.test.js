const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');

const testDatabaseUrl = process.env.TEST_DATABASE_URL || '';
let parsedTestDatabaseUrl = null;
try {
  parsedTestDatabaseUrl = new URL(testDatabaseUrl);
} catch (_) {
  parsedTestDatabaseUrl = null;
}
const databaseName = parsedTestDatabaseUrl?.pathname.replace(/^\//, '') || '';
const databaseHost = parsedTestDatabaseUrl?.hostname.toLowerCase() || '';
const databaseProtocol = parsedTestDatabaseUrl?.protocol || '';
const safeTestDatabase = Boolean(
  parsedTestDatabaseUrl
  && ['postgres:', 'postgresql:'].includes(databaseProtocol)
  && /(^|[_-])test$/i.test(databaseName)
  && ['localhost', '127.0.0.1', '::1'].includes(databaseHost)
);

test('research ad persistence, selected import and favorite isolation', {
  skip: safeTestDatabase ? false : 'Set TEST_DATABASE_URL to a local dedicated PostgreSQL database whose name ends in "test".',
}, async () => {
  process.env.DATABASE_URL = testDatabaseUrl;
  const { pool } = require('../config/database');
  const runMigrations = require('../database/migrations/runner');
  const ResearchAd = require('../models/ResearchAd');
  let connection;
  const marker = `research-ad-test-${Date.now()}-${crypto.randomBytes(6).toString('hex')}`;
  const emailA = `${marker}-a@example.test`;
  const emailB = `${marker}-b@example.test`;
  let ownerA;
  let ownerB;
  const triggerName = `test_research_ad_failure_${crypto.randomBytes(6).toString('hex')}`;
  const functionName = `test_research_ad_failure_fn_${crypto.randomBytes(6).toString('hex')}`;
  let triggerCreated = false;
  let functionCreated = false;

  try {
    connection = await pool.connect();
    const databaseResult = await connection.query('SELECT current_database() AS database_name, inet_server_addr()::text AS server_address');
    assert.equal(databaseResult.rows[0]?.database_name, databaseName, 'Connected to an unexpected PostgreSQL database.');
    assert.ok(['127.0.0.1', '::1'].includes(databaseResult.rows[0]?.server_address), 'PostgreSQL must be local to the test environment.');
    const baseSchemaResult = await connection.query(`
      SELECT to_regclass('public.research_ads') AS research_ads,
             to_regclass('public.research_jobs') AS research_jobs,
             to_regclass('public.app_users') AS app_users
    `);
    assert.ok(baseSchemaResult.rows[0]?.research_ads && baseSchemaResult.rows[0]?.research_jobs && baseSchemaResult.rows[0]?.app_users,
      'Dedicated test database must already contain the Product Research base schema.');
    await runMigrations(pool);
    const firstMigrationCheck = await connection.query(
      "SELECT applied_at FROM schema_migrations WHERE version = '001_saved_research_ads'"
    );
    assert.equal(firstMigrationCheck.rows.length, 1);
    await runMigrations(pool);
    const secondMigrationCheck = await connection.query(
      "SELECT applied_at FROM schema_migrations WHERE version = '001_saved_research_ads'"
    );
    assert.equal(secondMigrationCheck.rows.length, 1);
    assert.equal(secondMigrationCheck.rows[0].applied_at.toISOString(), firstMigrationCheck.rows[0].applied_at.toISOString());
    const favoritesTableCheck = await connection.query("SELECT to_regclass('public.saved_research_ads') AS saved_research_ads");
    assert.ok(favoritesTableCheck.rows[0]?.saved_research_ads);

    const userAResult = await connection.query(
      'INSERT INTO app_users (email, password_hash) VALUES ($1, $2) RETURNING id',
      [emailA, 'test-only']
    );
    ownerA = userAResult.rows[0].id;
    const userBResult = await connection.query(
      'INSERT INTO app_users (email, password_hash) VALUES ($1, $2) RETURNING id',
      [emailB, 'test-only']
    );
    ownerB = userBResult.rows[0].id;

    const job = await ResearchAd.createJob(ownerA, { queryText: marker, sourceType: 'manual' });
    const ad = (externalAdId, extra = {}) => ({
      platform: 'meta',
      externalAdId,
      originalUrl: `https://www.facebook.com/ads/library/?id=${externalAdId}`,
      creativeUrl: 'https://video.xx.fbcdn.net/creative.jpg',
      videoUrl: 'https://video.xx.fbcdn.net/video.mp4',
      productImageUrl: 'https://cdn.shopify.com/s/files/1/product.jpg',
      ...extra,
    });

    const singleImport = await ResearchAd.ingestAds(ownerA, job.id, [ad(`${Date.now()}1`)]);
    assert.equal(singleImport.results.length, 1);
    assert.equal(singleImport.results[0].status, 'created');

    const selectedOnlyId = `${Date.now()}2`;
    const multiImport = await ResearchAd.ingestAds(ownerA, job.id, [
      ad(selectedOnlyId),
      ad(`${Date.now()}3`),
    ]);
    assert.equal(multiImport.created, 2);
    const retry = await ResearchAd.ingestAds(ownerA, job.id, [ad(selectedOnlyId)]);
    assert.equal(retry.existing, 1);

    await assert.rejects(ResearchAd.ingestAds(ownerA, job.id, []), /au moins une annonce/);
    await assert.rejects(ResearchAd.ingestAds(ownerA, job.id, Array.from({ length: 201 }, (_, index) => ad(String(index + 1)))), /Limite/);

    const partialValidId = `${Date.now()}4`;
    await connection.query(`CREATE FUNCTION public."${functionName}"() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RETURN NEW; END $$`);
    functionCreated = true;
    await connection.query(`CREATE TRIGGER "${triggerName}" BEFORE INSERT ON public.research_ads FOR EACH ROW EXECUTE FUNCTION public."${functionName}"()`);
    triggerCreated = true;
    const technicalFailureId = `${Date.now()}5`;
    await connection.query(`CREATE OR REPLACE FUNCTION public."${functionName}"() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.external_ad_id = '${technicalFailureId}' THEN RAISE EXCEPTION 'test injected failure'; END IF; RETURN NEW; END $$`);
    const partial = await ResearchAd.ingestAds(ownerA, job.id, [
      ad(partialValidId),
      ad(technicalFailureId),
      { ...ad(`${Date.now()}6`), originalUrl: 'https://not-meta.example/ad' },
    ]);
    assert.deepEqual(partial.results.map(result => result.status), ['created', 'error', 'rejected']);

    const favoriteId = `${Date.now()}7`;
    const favoriteAd = ad(favoriteId);
    const firstFavorite = await ResearchAd.addFavorite(ownerA, favoriteAd);
    assert.equal(firstFavorite.saved, true);
    assert.equal(firstFavorite.alreadySaved, false);
    const repeatedFavorite = await ResearchAd.addFavorite(ownerA, favoriteAd);
    assert.equal(repeatedFavorite.alreadySaved, true);
    await assert.rejects(connection.query(
      'INSERT INTO saved_research_ads (owner_user_id, research_ad_id) VALUES ($1, $2) RETURNING id',
      [ownerA, firstFavorite.researchAdId]
    ), error => {
      assert.equal(error.code, '23505');
      return true;
    });

    const favorites = await ResearchAd.listFavorites(ownerA, { limit: 100 });
    const favorite = favorites.items.find(item => String(item.external_ad_id) === favoriteId);
    assert.ok(favorite);
    assert.equal(favorite.is_favorite, true);
    assert.ok(favorite.created_at);
    assert.match(favorite.creative_url, /fbcdn\.net/);
    assert.match(favorite.video_url, /fbcdn\.net/);
    assert.match(favorite.product_image_url, /cdn\.shopify\.com/);

    assert.equal(await ResearchAd.removeFavorite(ownerB, firstFavorite.researchAdId), false);
    await assert.rejects(connection.query(
      'INSERT INTO saved_research_ads (owner_user_id, research_ad_id) VALUES ($1, $2) RETURNING id',
      [ownerB, firstFavorite.researchAdId]
    ), error => {
      assert.equal(error.code, '23503');
    });

    const foreignJob = await ResearchAd.createJob(ownerB, { queryText: `${marker}-foreign`, sourceType: 'manual' });
    await assert.rejects(ResearchAd.ingestAds(ownerA, foreignJob.id, [ad(`${Date.now()}8`)]), error => error.statusCode === 404);

    const jobAds = await ResearchAd.listJobAds(ownerA, job.id, { limit: 100 });
    assert.ok(jobAds.items.some(item => String(item.external_ad_id) === selectedOnlyId));
    assert.equal(await ResearchAd.removeFavorite(ownerA, firstFavorite.researchAdId), true);
    assert.equal(await ResearchAd.removeFavorite(ownerA, firstFavorite.researchAdId), false);
  } finally {
    const cleanupErrors = [];
    const cleanup = async operation => {
      try {
        await operation();
      } catch (error) {
        cleanupErrors.push(error);
      }
    };
    if (connection) {
      if (triggerCreated) await cleanup(() => connection.query(`DROP TRIGGER IF EXISTS "${triggerName}" ON public.research_ads`));
      if (functionCreated) await cleanup(() => connection.query(`DROP FUNCTION IF EXISTS public."${functionName}"()`));
      if (ownerA) await cleanup(() => connection.query('DELETE FROM app_users WHERE id = $1', [ownerA]));
      if (ownerB) await cleanup(() => connection.query('DELETE FROM app_users WHERE id = $1', [ownerB]));
    }
    connection?.release();
    await pool.end();
    if (cleanupErrors.length) throw new AggregateError(cleanupErrors, 'Failed to clean up isolated Product Research test data.');
  }
});