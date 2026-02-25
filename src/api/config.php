<?php
// ─────────────────────────────────────────────────────────────────────────────
// Commonplace Book — API Configuration
//
// IMPORTANT: This file is listed in .gitignore and must NEVER be committed.
// Fill in your values before uploading to DreamHost.
//
// Setup checklist:
//   1. Create a MySQL database in DreamHost panel → Goodies → MySQL Databases
//   2. Create a database user and note the hostname (usually mysql.yourdomain.com)
//   3. Create email address reset@yourdomain.com in DreamHost panel → Mail → Manage Email
//   4. Create subdomain api.yourdomain.com pointing to /home/youruser/api.yourdomain.com/
//   5. Enable HTTPS for that subdomain in DreamHost panel → Websites → Manage → pencil
//   6. Upload this entire /api/ folder to /home/youruser/api.yourdomain.com/
//   7. Run setup.sql in phpMyAdmin
//   8. Open https://api.yourdomain.com/?action=ping — should return {"ok":true}
//   9. Open your app and complete first-run password setup
// ─────────────────────────────────────────────────────────────────────────────

// ── DATABASE ─────────────────────────────────────────────────────────────────
define('DB_HOST', 'mysql.commonplacebook.cloud');   // from DreamHost panel
define('DB_NAME', 'commonplacebook_thebook');
define('DB_USER', 'dotisunderwood');
define('DB_PASS', 'zyb0HKB5dwq8vem_czm');

// ── SMTP (for password reset emails) ─────────────────────────────────────────
// DreamHost SMTP settings — use the address you created in the panel
define('SMTP_HOST', 'smtp.dreamhost.com');
define('SMTP_PORT', 587);
define('SMTP_USER', 'reset@commomplacebook.cloud');  // the From address
define('SMTP_PASS', 'zbq!tgc2kne!UNF6yby');

// The address reset emails are SENT TO (your personal address)
define('RESET_TO',  'viggorlijah@gmail.com');

// ── CORS ─────────────────────────────────────────────────────────────────────
// Only requests from this origin are accepted.
// Use your GitHub Pages URL exactly as it appears in the browser.
define('ALLOWED_ORIGIN', 'https://dorothyisunderwood.github.io/commonplace-book/');

// ── APP URL ──────────────────────────────────────────────────────────────────
// Used to build the reset link in the email body
define('APP_URL', 'https://dorothyisunderwood.github.io/commonplace-book');

// ── PASSWORD EXPIRY ──────────────────────────────────────────────────────────
// How long (in seconds) before the passphrase expires and must be changed.
// Default: 6 months = 60 * 60 * 24 * 30 * 6 = 15,552,000 seconds
define('PASSWORD_EXPIRY_SECONDS', 15552000);

// How many seconds a reset token stays valid (default: 1 hour)
define('RESET_TOKEN_EXPIRY_SECONDS', 3600);

// ── TIMESTAMP TOLERANCE ──────────────────────────────────────────────────────
// Requests with a timestamp older than this many seconds are rejected
// (prevents replay attacks). Should be >= expected clock skew (60s is safe).
define('TIMESTAMP_TOLERANCE_SECONDS', 60);

// ── ERROR LOGGING ─────────────────────────────────────────────────────────────
// LOG_LEVEL:
//   0 = off
//   1 = errors only      ← recommended for production
//   2 = errors + warnings ← useful when diagnosing problems
//   3 = full debug        ← verbose, rotate frequently
//
// LOG_DIR must be OUTSIDE your web root so logs cannot be fetched via HTTP.
// DreamHost home dir is typically /home/yourusername/
// Example: '/home/yourusername/logs/commonplace'
//
// The log directory will be created automatically if it doesn't exist.
define('LOG_LEVEL', 2);
define('LOG_DIR',   '/home/dh_bufhgb/logs/commonplace');
