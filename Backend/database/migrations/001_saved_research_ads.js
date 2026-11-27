async function up(client) {
  await client.query('CREATE UNIQUE INDEX IF NOT EXISTS research_ads_owner_id_unique_idx ON research_ads (owner_user_id, id)');
  await client.query('ALTER TABLE research_ads ADD COLUMN IF NOT EXISTS video_url TEXT NULL');
  await client.query('ALTER TABLE research_ads ADD COLUMN IF NOT EXISTS product_image_url TEXT NULL');
  await client.query(`
    CREATE TABLE IF NOT EXISTS saved_research_ads (
      id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      owner_user_id INT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
      research_ad_id BIGINT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CONSTRAINT saved_research_ads_owner_ad_unique UNIQUE (owner_user_id, research_ad_id),
      CONSTRAINT saved_research_ads_owner_ad_fk
        FOREIGN KEY (owner_user_id, research_ad_id)
        REFERENCES research_ads (owner_user_id, id)
        ON DELETE CASCADE
    )
  `);
  await client.query(`
    CREATE INDEX IF NOT EXISTS saved_research_ads_owner_created_idx
    ON saved_research_ads (owner_user_id, created_at DESC, id DESC)
  `);
}

module.exports = { up };