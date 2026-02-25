-- ─────────────────────────────────────────────────────────────────────────────
-- Commonplace Book — Database Setup
-- Run this ONCE in phpMyAdmin on your DreamHost database.
-- Replace `commonplace` with your actual database name if different. (commonplacebook_thebook)
-- ─────────────────────────────────────────────────────────────────────────────

-- ── CONTENT ──────────────────────────────────────────────────────────────────
-- One row per content item across ALL sections.
-- The `data` column is a JSON blob owned by each section — schema-free.
-- Adding a new section never requires a schema migration.

CREATE TABLE IF NOT EXISTS content (
  id            VARCHAR(40)   NOT NULL PRIMARY KEY,
  section_id    VARCHAR(30)   NOT NULL,
  content_type  VARCHAR(30)   NOT NULL,
  data          JSON          NOT NULL,
  tags          JSON          NOT NULL DEFAULT (JSON_ARRAY()),
  linked_ids    JSON          NOT NULL DEFAULT (JSON_ARRAY()),
  created_at    BIGINT        NOT NULL,
  updated_at    BIGINT        NOT NULL,

  INDEX idx_section    (section_id),
  INDEX idx_type       (content_type),
  INDEX idx_created    (created_at),
  INDEX idx_updated    (updated_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── TAG FREQUENCY ─────────────────────────────────────────────────────────────
-- Tracks how many times each tag has been used per section.
-- Used for weighted autocomplete: section-local tags bubble to the top.

CREATE TABLE IF NOT EXISTS tag_frequency (
  tag           VARCHAR(100)  NOT NULL,
  section_id    VARCHAR(30)   NOT NULL,
  count         INT           NOT NULL DEFAULT 0,
  PRIMARY KEY   (tag, section_id),
  INDEX idx_tag (tag)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── APP SETTINGS ──────────────────────────────────────────────────────────────
-- Key-value store for auth credentials, reset tokens, and app-level config.
-- Kept separate from content so a content table dump never includes auth data.

CREATE TABLE IF NOT EXISTS app_settings (
  key_name      VARCHAR(50)   NOT NULL PRIMARY KEY,
  value         TEXT          NOT NULL,
  updated_at    BIGINT        NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── INITIAL SETTINGS ROWS ────────────────────────────────────────────────────
-- Placeholders — real values are written by the first-run setup flow.

INSERT IGNORE INTO app_settings (key_name, value, updated_at) VALUES
  ('auth_verifier',    '',    0),
  ('auth_salt',        '',    0),
  ('auth_set_at',      '0',   0),
  ('reset_token',      '',    0),
  ('reset_expires_at', '0',   0),
  ('notify_email',     '',    0),
  ('setup_complete',   'no',  0);

-- ─────────────────────────────────────────────────────────────────────────────
-- Verify:
-- SELECT * FROM app_settings;
-- SHOW TABLES;
-- ─────────────────────────────────────────────────────────────────────────────
