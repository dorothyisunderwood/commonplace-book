<?php
// ─────────────────────────────────────────────────────────────────────────────
// Logger.php — Structured application error log
//
// Design goals:
//   • Every error has a short, unique code (e.g. E_DB_CONNECT, E_AUTH_CORS)
//     so you can grep a single code across all log lines without parsing prose.
//   • Log lines are machine-readable (tab-separated) and human-readable.
//   • Verbosity is controlled by LOG_LEVEL in config.php:
//       0 = off, 1 = errors only, 2 = warnings, 3 = info (debug)
//   • The log file lives OUTSIDE the web root so it can never be fetched.
//   • Sensitive values (keys, hashes, passwords) are never logged — only
//     their presence/absence and structural properties.
//
// Log format (one line per event):
//   [2026-02-25 14:32:01 UTC] E_AUTH_CORS  ERROR   Origin mismatch | got=http://evil.com expected=https://user.github.io | req=GET /?action=ping
//
// Error code registry:
//   E_BOOT_*    — startup / config errors
//   E_DB_*      — database errors
//   E_AUTH_*    — authentication and CORS errors
//   E_MAIL_*    — email / SMTP errors
//   E_REQ_*     — request validation errors
//   E_DATA_*    — data read/write errors
//   E_SYS_*     — unexpected PHP exceptions
// ─────────────────────────────────────────────────────────────────────────────

class Logger {
  // ── Log levels ──────────────────────────────────────────────────────────────
  const OFF   = 0;
  const ERROR = 1;
  const WARN  = 2;
  const INFO  = 3;

  // ── Error code registry ───────────────────────────────────────────────────
  // Each code maps to: [default_level, human description]
  // This is the single source of truth for all error codes.
  const CODES = [
    // Boot / config
    'E_BOOT_NO_CONFIG'    => [self::ERROR, 'config.php missing or unreadable'],
    'E_BOOT_PLACEHOLDER'  => [self::WARN,  'config.php still contains placeholder values'],
    'E_BOOT_LOG_DIR'      => [self::WARN,  'Cannot create log directory — logging disabled'],

    // Database
    'E_DB_CONNECT'        => [self::ERROR, 'MySQL connection failed'],
    'E_DB_QUERY'          => [self::ERROR, 'Query execution failed'],
    'E_DB_SETUP'          => [self::ERROR, 'Required table missing — run setup.sql'],

    // Auth / CORS
    'E_AUTH_CORS'         => [self::WARN,  'CORS origin mismatch — request blocked'],
    'E_AUTH_HEADERS'      => [self::WARN,  'Missing required auth headers'],
    'E_AUTH_TIMESTAMP'    => [self::WARN,  'Request timestamp out of tolerance (possible replay)'],
    'E_AUTH_EXPIRED'      => [self::WARN,  'Passphrase expired — user must reset'],
    'E_AUTH_BAD_KEY'      => [self::WARN,  'bcrypt verify failed — wrong passphrase or key'],
    'E_AUTH_BAD_SIG'      => [self::WARN,  'HMAC signature mismatch — request tampered?'],
    'E_AUTH_NOT_SETUP'    => [self::INFO,  'Auth verifier not set — first-run not complete'],
    'E_AUTH_ALREADY_SETUP'=> [self::WARN,  'Setup attempted but already complete'],
    'E_AUTH_BAD_RESET'    => [self::WARN,  'Reset token invalid or expired'],

    // Mail
    'E_MAIL_CONNECT'      => [self::ERROR, 'SMTP connection failed'],
    'E_MAIL_AUTH'         => [self::ERROR, 'SMTP authentication failed'],
    'E_MAIL_SEND'         => [self::ERROR, 'SMTP DATA failed — message not delivered'],
    'E_MAIL_TLS'          => [self::ERROR, 'STARTTLS failed — cannot upgrade connection'],

    // Request validation
    'E_REQ_MISSING'       => [self::WARN,  'Required field missing from request body'],
    'E_REQ_INVALID'       => [self::WARN,  'Field failed validation'],
    'E_REQ_NOT_FOUND'     => [self::INFO,  'Requested resource ID not found'],
    'E_REQ_UNKNOWN'       => [self::WARN,  'No route matched the request'],

    // Data
    'E_DATA_CREATE'       => [self::ERROR, 'Failed to create content record'],
    'E_DATA_UPDATE'       => [self::ERROR, 'Failed to update content record'],
    'E_DATA_DELETE'       => [self::ERROR, 'Failed to delete content record'],

    // System
    'E_SYS_EXCEPTION'     => [self::ERROR, 'Uncaught exception'],
    'E_SYS_TAG_FREQ'      => [self::WARN,  'Tag frequency update failed (non-fatal)'],
  ];

  private static int    $level   = self::ERROR;
  private static string $logFile = '';
  private static bool   $ready   = false;

  // ── Initialise ─────────────────────────────────────────────────────────────
  // Call once at boot. logDir should be OUTSIDE the web root.
  // e.g. /home/youruser/logs/commonplace/
  public static function init(int $level, string $logDir): void {
    self::$level = $level;
    if ($level === self::OFF) return;

    // Create log directory if it doesn't exist
    if (!is_dir($logDir)) {
      if (!@mkdir($logDir, 0750, true)) {
        // Can't create dir — log to PHP's default error log as a last resort
        error_log('CB E_BOOT_LOG_DIR: Cannot create log directory: ' . $logDir);
        return;
      }
    }

    // Rotate: one file per day, max 30 days retained
    self::$logFile = rtrim($logDir, '/') . '/app-' . gmdate('Y-m-d') . '.log';
    self::$ready   = true;

    // Rotate old files (keep 30 days)
    self::rotate($logDir, 30);
  }

  // ── Primary logging method ─────────────────────────────────────────────────
  // code:    one of the CODES keys above
  // context: key=>value pairs — never include passwords or key material
  public static function log(string $code, array $context = [], ?int $overrideLevel = null): void {
    if (!self::$ready) return;

    $def   = self::CODES[$code] ?? [self::ERROR, 'Unknown error code: ' . $code];
    $level = $overrideLevel ?? $def[0];

    if ($level > self::$level) return; // below configured verbosity

    $levelName = match($level) {
      self::ERROR => 'ERROR',
      self::WARN  => 'WARN ',
      self::INFO  => 'INFO ',
      default     => 'DEBUG',
    };

    // Build context string — key=value pairs, pipe-separated
    $ctx = '';
    if ($context) {
      $parts = [];
      foreach ($context as $k => $v) {
        // Safety: never log anything that looks like a key/hash/secret
        if (preg_match('/key|hash|pass|secret|token|verif|salt/i', $k)) {
          $v = '[REDACTED]';
        }
        $parts[] = $k . '=' . str_replace(['|', "\n", "\r"], [' ', ' ', ''], (string)$v);
      }
      $ctx = ' | ' . implode(' | ', $parts);
    }

    // Request context — always appended
    $method = $_SERVER['REQUEST_METHOD'] ?? '-';
    $uri    = $_SERVER['REQUEST_URI']    ?? '-';
    // Strip query string values for security (keep keys only)
    $uri    = preg_replace('/=([^&]*)/', '=[...]', $uri);
    $req    = 'req=' . $method . ' ' . $uri;

    $line = sprintf(
      "[%s UTC] %-22s %s %s%s\n",
      gmdate('Y-m-d H:i:s'),
      $code,
      $levelName,
      $def[1] . $ctx,
      ' | ' . $req
    );

    // Append to log file — suppress errors (logging must never crash the app)
    @file_put_contents(self::$logFile, $line, FILE_APPEND | LOCK_EX);
  }

  // ── Convenience shorthands ─────────────────────────────────────────────────
  public static function error(string $code, array $ctx = []): void {
    self::log($code, $ctx, self::ERROR);
  }

  public static function warn(string $code, array $ctx = []): void {
    self::log($code, $ctx, self::WARN);
  }

  public static function info(string $code, array $ctx = []): void {
    self::log($code, $ctx, self::INFO);
  }

  // ── Log rotation ───────────────────────────────────────────────────────────
  private static function rotate(string $dir, int $keepDays): void {
    $files = glob($dir . '/app-*.log');
    if (!$files) return;
    $cutoff = time() - ($keepDays * 86400);
    foreach ($files as $file) {
      if (@filemtime($file) < $cutoff) @unlink($file);
    }
  }

  // ── Read log for admin endpoint ────────────────────────────────────────────
  // Returns last $lines lines from today's log (and optionally yesterday's).
  public static function tail(int $lines = 100, string $logDir = ''): array {
    if (!$logDir) return [];
    $today     = $logDir . '/app-' . gmdate('Y-m-d') . '.log';
    $yesterday = $logDir . '/app-' . gmdate('Y-m-d', strtotime('-1 day')) . '.log';

    $all = [];
    foreach ([$yesterday, $today] as $f) {
      if (file_exists($f)) {
        $all = array_merge($all, file($f, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES));
      }
    }
    return array_slice($all, -$lines);
  }
}
