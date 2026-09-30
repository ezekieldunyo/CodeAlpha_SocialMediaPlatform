-- Adds posts.client_token to a database created before it existed in schema.sql
-- (CREATE TABLE IF NOT EXISTS never changes an existing table). Run once:
--   mysql -u root -p codealpha_social < backend/database/migrations/001_posts_client_token.sql
-- Adds a column and a unique key; existing posts keep client_token NULL.
ALTER TABLE posts
    ADD COLUMN client_token VARCHAR(64) NULL AFTER image_url,
    ADD UNIQUE KEY unique_post_client_token (user_id, client_token);
