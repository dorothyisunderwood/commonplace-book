<?php
// ─────────────────────────────────────────────────────────────────────────────
// Commonplace Book — REST API v2
// Single entry point, routed by .htaccess.
//
// Changes from v1:
//   • Structured logging via Logger.php (error codes, context, rotation)
//   • CORS fix: X-Auth-Key added to Access-Control-Allow-Headers (was missing)
//   • err() logs before responding — every client error is now recorded
//   • db() logs E_DB_CONNECT with sanitised PDO message
//   • Mailer exceptions captured → specific E_MAIL_* codes
//   • Global exception handler → E_SYS_EXCEPTION (no PHP traces to client)
//   • ?action=logs returns recent log lines to authenticated user (no SSH needed)
// ─────────────────────────────────────────────────────────────────────────────

declare(strict_types=1);
error_reporting(0); // never leak PHP errors to client — Logger handles them

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/Logger.php';
require_once __DIR__ . '/Mailer.php';

// ── Boot ──────────────────────────────────────────────────────────────────────
Logger::init(
  defined('LOG_LEVEL') ? LOG_LEVEL : Logger::ERROR,
  defined('LOG_DIR')   ? LOG_DIR   : sys_get_temp_dir() . '/commonplace'
);

// Catch anything not handled below — clean JSON, no stack trace exposed
set_exception_handler(function(Throwable $e) {
  Logger::error('E_SYS_EXCEPTION', [
    'class'   => get_class($e),
    'message' => substr($e->getMessage(), 0, 200),
    'file'    => basename($e->getFile()),
    'line'    => $e->getLine(),
  ]);
  http_response_code(500);
  header('Content-Type: application/json; charset=utf-8');
  echo json_encode(['ok' => false, 'error' => 'Internal server error', 'code' => 'E_SYS_EXCEPTION']);
  exit;
});

// ── CORS ──────────────────────────────────────────────────────────────────────
// FIX: X-Auth-Key was missing from Allow-Headers in v1.
// Without it, every authenticated preflight fails silently in the browser,
// and all subsequent requests return a CORS error — not a 401.
// This is almost certainly why "Cannot reach the API" appears on the lock screen.

$origin = $_SERVER['HTTP_ORIGIN'] ?? '';

if ($origin !== '' && $origin !== ALLOWED_ORIGIN) {
  Logger::warn('E_AUTH_CORS', [
    'got'      => $origin,
    'expected' => ALLOWED_ORIGIN,
    'hint'     => 'Check ALLOWED_ORIGIN in config.php matches GitHub Pages URL exactly (no trailing slash)',
  ]);
}

if ($origin === ALLOWED_ORIGIN) {
  header('Access-Control-Allow-Origin: '   . ALLOWED_ORIGIN);
  header('Access-Control-Allow-Methods: '  . 'GET, POST, PUT, DELETE, OPTIONS');
  // X-Auth-Key is now included — this was the v1 bug
  header('Access-Control-Allow-Headers: '  . 'Content-Type, X-Timestamp, X-Signature, X-Auth-Key');
  header('Access-Control-Expose-Headers: ' . 'X-CB-Days-Left');
  header('Access-Control-Max-Age: 86400');
}

// Browsers send OPTIONS before every cross-origin request (preflight)
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
  http_response_code(204);
  exit;
}

header('Content-Type: application/json; charset=utf-8');

// ── HELPERS ───────────────────────────────────────────────────────────────────

function json_out(mixed $data, int $code = 200): never {
  http_response_code($code);
  echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
  exit;
}

// Every error path goes through err() — logs before responding.
// The error code is included in the response so the React error display
// can show it alongside the human message.
function err(string $msg, int $httpCode = 400, string $logCode = 'E_REQ_INVALID', array $ctx = []): never {
  Logger::log($logCode, array_merge($ctx, ['http' => $httpCode, 'msg' => substr($msg, 0, 200)]));
  json_out(['ok' => false, 'error' => $msg, 'code' => $logCode], $httpCode);
}

// PDO singleton with logged connection failure
function db(): PDO {
  static $pdo = null;
  if ($pdo) return $pdo;
  try {
    $pdo = new PDO(
      'mysql:host=' . DB_HOST . ';dbname=' . DB_NAME . ';charset=utf8mb4',
      DB_USER, DB_PASS,
      [PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
       PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
       PDO::ATTR_TIMEOUT            => 5]
    );
  } catch (PDOException $e) {
    // Strip credentials from error message before logging
    $safe = preg_replace("/Access denied for user '[^']*'/", "Access denied for user [REDACTED]", $e->getMessage());
    Logger::error('E_DB_CONNECT', [
      'error' => substr($safe, 0, 300),
      'host'  => DB_HOST,
      'db'    => DB_NAME,
    ]);
    err('Database connection failed — check server logs (E_DB_CONNECT)', 503, 'E_DB_CONNECT');
  }
  return $pdo;
}

function setting(string $key): string {
  try {
    $st = db()->prepare('SELECT value FROM app_settings WHERE key_name = ?');
    $st->execute([$key]);
    return $st->fetchColumn() ?: '';
  } catch (PDOException $e) {
    Logger::error('E_DB_QUERY', ['op' => 'setting_get', 'key' => $key, 'error' => $e->getMessage()]);
    return '';
  }
}

function set_setting(string $key, string $value): void {
  try {
    db()->prepare(
      'INSERT INTO app_settings (key_name, value, updated_at) VALUES (?,?,?)
       ON DUPLICATE KEY UPDATE value=VALUES(value), updated_at=VALUES(updated_at)'
    )->execute([$key, $value, (int)(microtime(true) * 1000)]);
  } catch (PDOException $e) {
    Logger::error('E_DB_QUERY', ['op' => 'setting_set', 'key' => $key, 'error' => $e->getMessage()]);
  }
}

function generate_id(string $prefix): string {
  $chars = '0123456789abcdefghijklmnopqrstuvwxyz';
  $id = '';
  $bytes = random_bytes(10);
  for ($i = 0; $i < 10; $i++) $id .= $chars[ord($bytes[$i]) % 36];
  return $prefix . ':' . $id;
}

// ── AUTH ──────────────────────────────────────────────────────────────────────

function verify_auth(): void {
  $ts  = (int)($_SERVER['HTTP_X_TIMESTAMP'] ?? 0);
  $sig = $_SERVER['HTTP_X_SIGNATURE'] ?? '';
  $key = $_SERVER['HTTP_X_AUTH_KEY']  ?? '';

  if (!$ts || !$sig || !$key) {
    // Log which headers arrived — helps diagnose whether CORS allow-headers is working
    err('Missing auth headers', 401, 'E_AUTH_HEADERS', [
      'has_timestamp' => (bool)$ts,
      'has_signature' => (bool)$sig,
      'has_auth_key'  => (bool)$key,
      'hint'          => 'If all three are false, the Allow-Headers CORS fix may not be deployed yet',
    ]);
  }

  $now = (int)(microtime(true) * 1000);
  $age = abs($now - $ts);
  if ($age > TIMESTAMP_TOLERANCE_SECONDS * 1000) {
    err('Request timestamp expired', 401, 'E_AUTH_TIMESTAMP', [
      'age_ms'       => $age,
      'tolerance_ms' => TIMESTAMP_TOLERANCE_SECONDS * 1000,
    ]);
  }

  $setAt     = (int)setting('auth_set_at');
  $expiresAt = $setAt + (PASSWORD_EXPIRY_SECONDS * 1000);
  if ($setAt > 0 && $now > $expiresAt) {
    err('Passphrase expired — please reset', 401, 'E_AUTH_EXPIRED');
  }

  $verifier = setting('auth_verifier');
  if (!$verifier) err('Not configured — complete first-run setup', 401, 'E_AUTH_NOT_SETUP');
  if (!password_verify($key, $verifier)) err('Invalid credentials', 401, 'E_AUTH_BAD_KEY');

  $method   = $_SERVER['REQUEST_METHOD'];
  $path     = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
  $body     = file_get_contents('php://input');
  $expected = hash_hmac('sha256', $method . '|' . $path . '|' . $ts . '|' . $body, hex2bin($key));
  if (!hash_equals($expected, $sig)) {
    err('Invalid request signature', 401, 'E_AUTH_BAD_SIG', ['method' => $method, 'path' => $path]);
  }
}

function days_until_expiry(): int {
  $setAt = (int)setting('auth_set_at');
  if (!$setAt) return 999;
  $now   = (int)(microtime(true) * 1000);
  return max(0, (int)(($setAt + (PASSWORD_EXPIRY_SECONDS * 1000) - $now) / 86400000));
}

// ── ROUTING ───────────────────────────────────────────────────────────────────

$method  = $_SERVER['REQUEST_METHOD'];
$action  = $_GET['action'] ?? '';
$rawBody = file_get_contents('php://input');
$body    = json_decode($rawBody, true) ?? [];

// ── Public endpoints (no auth required) ──────────────────────────────────────

if ($action === 'ping') {
  json_out(['ok' => true, 'ts' => (int)(microtime(true) * 1000), 'version' => 2]);
}

if ($action === 'setup-status') {
  json_out(['setupComplete' => setting('setup_complete') === 'yes']);
}

if ($action === 'setup' && $method === 'POST') {
  if (setting('setup_complete') === 'yes') err('Already configured', 403, 'E_AUTH_ALREADY_SETUP');

  $verifier = $body['verifier'] ?? '';
  $salt     = $body['salt']     ?? '';
  $email    = $body['email']    ?? '';

  if (!$verifier || !$salt || !$email) {
    err('Missing fields: verifier, salt, email', 400, 'E_REQ_MISSING', [
      'has_verifier' => (bool)$verifier,
      'has_salt'     => (bool)$salt,
      'has_email'    => (bool)$email,
    ]);
  }
  if (!filter_var($email, FILTER_VALIDATE_EMAIL)) err('Invalid email', 400, 'E_REQ_INVALID', ['field' => 'email']);

  set_setting('auth_verifier',  password_hash($verifier, PASSWORD_BCRYPT, ['cost' => 12]));
  set_setting('auth_salt',      $salt);
  set_setting('auth_set_at',    (string)(int)(microtime(true) * 1000));
  set_setting('notify_email',   $email);
  set_setting('setup_complete', 'yes');

  Logger::info('E_AUTH_NOT_SETUP', ['status' => 'setup_complete']);
  json_out(['ok' => true]);
}

if ($action === 'salt') {
  $salt = setting('auth_salt');
  if (!$salt) err('Not configured', 404, 'E_AUTH_NOT_SETUP');
  json_out(['salt' => $salt]);
}

if ($action === 'reset-request' && $method === 'POST') {
  try {
    $token     = bin2hex(random_bytes(32));
    $tokenHash = password_hash($token, PASSWORD_BCRYPT, ['cost' => 12]);
    $expires   = (int)(microtime(true) * 1000) + (RESET_TOKEN_EXPIRY_SECONDS * 1000);
    set_setting('reset_token',      $tokenHash);
    set_setting('reset_expires_at', (string)$expires);

    $link    = APP_URL . '?reset=' . urlencode($token);
    $msgBody = "Your Commonplace Book passphrase reset link:\n\n{$link}\n\n"
             . "This link expires in 1 hour.\n"
             . "If you did not request this, ignore this email.\n";

    (new Mailer(SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS))
      ->send(RESET_TO, 'Commonplace Book — Reset your passphrase', $msgBody);

    Logger::info('E_MAIL_SEND', ['status' => 'sent', 'to_domain' => substr(strstr(RESET_TO, '@'), 1)]);

  } catch (RuntimeException $e) {
    $msg  = $e->getMessage();
    $code = str_contains($msg, 'connect') ? 'E_MAIL_CONNECT'
          : (str_contains($msg, 'AUTH')   ? 'E_MAIL_AUTH'
          : (str_contains($msg, 'TLS')    ? 'E_MAIL_TLS'
          :                                 'E_MAIL_SEND'));
    Logger::error($code, [
      'smtp_host' => SMTP_HOST,
      'smtp_port' => SMTP_PORT,
      'smtp_user' => SMTP_USER,
      'error'     => substr($msg, 0, 300),
    ]);
  }
  // Always respond ok — prevent email enumeration
  json_out(['ok' => true]);
}

if ($action === 'reset-verify' && $method === 'POST') {
  $token    = $body['token']    ?? '';
  $verifier = $body['verifier'] ?? '';
  $salt     = $body['salt']     ?? '';

  if (!$token || !$verifier || !$salt) err('Missing fields', 400, 'E_REQ_MISSING');

  $stored  = setting('reset_token');
  $expires = (int)setting('reset_expires_at');
  $now     = (int)(microtime(true) * 1000);

  if (!$stored || !password_verify($token, $stored)) err('Invalid token', 401, 'E_AUTH_BAD_RESET', ['reason' => 'hash_mismatch']);
  if ($now > $expires) err('Token expired', 401, 'E_AUTH_BAD_RESET', ['reason' => 'expired', 'ago_s' => (int)(($now - $expires)/1000)]);

  set_setting('auth_verifier',    password_hash($verifier, PASSWORD_BCRYPT, ['cost' => 12]));
  set_setting('auth_salt',        $salt);
  set_setting('auth_set_at',      (string)$now);
  set_setting('reset_token',      '');
  set_setting('reset_expires_at', '0');

  Logger::info('E_AUTH_BAD_RESET', ['status' => 'reset_complete']);
  json_out(['ok' => true]);
}

// ── Authenticated endpoints ───────────────────────────────────────────────────

verify_auth();
$daysLeft = days_until_expiry();

// View recent log lines (authenticated — no SSH needed to debug)
if ($action === 'logs') {
  $n     = min(500, max(10, (int)($_GET['n'] ?? 100)));
  $lines = Logger::tail($n, defined('LOG_DIR') ? LOG_DIR : '');
  json_out(['ok' => true, 'lines' => $lines, 'count' => count($lines), 'daysLeft' => $daysLeft]);
}

// List content
if ($method === 'GET' && !isset($_GET['id']) && !$action) {
  $section = $_GET['section'] ?? '';
  if (!$section) err('section required', 400, 'E_REQ_MISSING', ['param' => 'section']);

  $sort   = $_GET['sort']   ?? 'created_at';
  $tag    = $_GET['tag']    ?? '';
  $q      = $_GET['q']      ?? '';
  $author = $_GET['author'] ?? '';

  $allowed = ['created_at','updated_at','title','author','firstLine','publishedDate'];
  if (!in_array($sort, $allowed, true)) $sort = 'created_at';

  $sql = 'SELECT * FROM content WHERE section_id = ?';
  $params = [$section];

  if ($tag)    { $sql .= ' AND JSON_CONTAINS(tags, ?)';                   $params[] = json_encode($tag); }
  if ($author) { $sql .= ' AND JSON_EXTRACT(data, "$.author") = ?';       $params[] = $author; }
  if ($q) {
    $sql    .= ' AND (JSON_EXTRACT(data,"$.title") LIKE ? OR JSON_EXTRACT(data,"$.text") LIKE ? OR JSON_EXTRACT(data,"$.author") LIKE ?)';
    $like    = '%' . $q . '%';
    $params  = array_merge($params, [$like, $like, $like]);
  }

  $sortCol = match($sort) {
    'title'         => "JSON_EXTRACT(data,'$.title')",
    'author'        => "JSON_EXTRACT(data,'$.author')",
    'firstLine'     => "JSON_EXTRACT(data,'$.firstLine')",
    'publishedDate' => "JSON_EXTRACT(data,'$.publishedDate')",
    default         => $sort,
  };
  $sql .= ' ORDER BY ' . $sortCol . ' ASC';

  try {
    $st = db()->prepare($sql);
    $st->execute($params);
    $rows = $st->fetchAll();
    foreach ($rows as &$row) {
      $row['data']       = json_decode($row['data'],       true);
      $row['tags']       = json_decode($row['tags'],       true);
      $row['linked_ids'] = json_decode($row['linked_ids'], true);
    }
    json_out(['ok' => true, 'items' => $rows, 'daysLeft' => $daysLeft]);
  } catch (PDOException $e) {
    Logger::error('E_DB_QUERY', ['op' => 'list', 'section' => $section, 'error' => $e->getMessage()]);
    err('Query failed', 500, 'E_DB_QUERY');
  }
}

if ($action === 'random') {
  $section = $_GET['section'] ?? '';
  if (!$section) err('section required', 400, 'E_REQ_MISSING');
  try {
    $st = db()->prepare('SELECT * FROM content WHERE section_id = ? ORDER BY RAND() LIMIT 1');
    $st->execute([$section]);
    $row = $st->fetch();
    if (!$row) json_out(['ok' => true, 'item' => null, 'daysLeft' => $daysLeft]);
    $row['data']       = json_decode($row['data'],       true);
    $row['tags']       = json_decode($row['tags'],       true);
    $row['linked_ids'] = json_decode($row['linked_ids'], true);
    json_out(['ok' => true, 'item' => $row, 'daysLeft' => $daysLeft]);
  } catch (PDOException $e) {
    Logger::error('E_DB_QUERY', ['op' => 'random', 'error' => $e->getMessage()]);
    err('Query failed', 500, 'E_DB_QUERY');
  }
}

if ($action === 'tags') {
  $section = $_GET['section'] ?? '';
  try {
    if ($section) {
      $st = db()->prepare(
        'SELECT t.tag, COALESCE(s.count,0) AS section_count, SUM(t.count) AS total_count,
                (COALESCE(s.count,0)*3 + SUM(t.count)) AS score
         FROM tag_frequency t
         LEFT JOIN tag_frequency s ON s.tag=t.tag AND s.section_id=?
         GROUP BY t.tag, s.count ORDER BY score DESC, t.tag ASC LIMIT 200'
      );
      $st->execute([$section]);
    } else {
      $st = db()->query('SELECT tag, SUM(count) AS total_count FROM tag_frequency GROUP BY tag ORDER BY total_count DESC LIMIT 200');
    }
    json_out(['ok' => true, 'tags' => $st->fetchAll(), 'daysLeft' => $daysLeft]);
  } catch (PDOException $e) {
    Logger::error('E_DB_QUERY', ['op' => 'tags', 'error' => $e->getMessage()]);
    err('Query failed', 500, 'E_DB_QUERY');
  }
}

if ($action === 'authors') {
  $section = $_GET['section'] ?? '';
  if (!$section) err('section required', 400, 'E_REQ_MISSING');
  try {
    $st = db()->prepare(
      'SELECT DISTINCT JSON_UNQUOTE(JSON_EXTRACT(data,"$.author")) AS author
       FROM content WHERE section_id=? AND JSON_EXTRACT(data,"$.author") IS NOT NULL
       ORDER BY author ASC'
    );
    $st->execute([$section]);
    json_out(['ok' => true, 'authors' => array_column($st->fetchAll(), 'author'), 'daysLeft' => $daysLeft]);
  } catch (PDOException $e) {
    Logger::error('E_DB_QUERY', ['op' => 'authors', 'error' => $e->getMessage()]);
    err('Query failed', 500, 'E_DB_QUERY');
  }
}

if ($method === 'GET' && isset($_GET['id'])) {
  $id = $_GET['id'];
  try {
    $st = db()->prepare('SELECT * FROM content WHERE id = ?');
    $st->execute([$id]);
    $row = $st->fetch();
    if (!$row) err('Not found', 404, 'E_REQ_NOT_FOUND', ['id' => $id]);
    $row['data']       = json_decode($row['data'],       true);
    $row['tags']       = json_decode($row['tags'],       true);
    $row['linked_ids'] = json_decode($row['linked_ids'], true);
    json_out(['ok' => true, 'item' => $row, 'daysLeft' => $daysLeft]);
  } catch (PDOException $e) {
    Logger::error('E_DB_QUERY', ['op' => 'get', 'id' => $id, 'error' => $e->getMessage()]);
    err('Query failed', 500, 'E_DB_QUERY');
  }
}

if ($method === 'POST' && !$action) {
  $sectionId   = $body['sectionId']   ?? '';
  $contentType = $body['contentType'] ?? $sectionId;
  $data        = $body['data']        ?? [];
  $tags        = $body['tags']        ?? [];
  $linkedIds   = $body['linkedIds']   ?? [];

  if (!$sectionId || !$data) err('sectionId and data required', 400, 'E_REQ_MISSING');

  $id  = generate_id(explode('_', $contentType)[0]);
  $now = (int)(microtime(true) * 1000);

  try {
    db()->prepare(
      'INSERT INTO content (id,section_id,content_type,data,tags,linked_ids,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?)'
    )->execute([$id, $sectionId, $contentType, json_encode($data, JSON_UNESCAPED_UNICODE), json_encode($tags), json_encode($linkedIds), $now, $now]);
  } catch (PDOException $e) {
    Logger::error('E_DATA_CREATE', ['section' => $sectionId, 'error' => $e->getMessage()]);
    err('Failed to save', 500, 'E_DATA_CREATE');
  }

  update_tag_frequencies($tags, $sectionId, 1);
  $st = db()->prepare('SELECT * FROM content WHERE id = ?');
  $st->execute([$id]);
  $row = $st->fetch();
  $row['data']       = json_decode($row['data'],       true);
  $row['tags']       = json_decode($row['tags'],       true);
  $row['linked_ids'] = json_decode($row['linked_ids'], true);
  json_out(['ok' => true, 'item' => $row, 'daysLeft' => $daysLeft], 201);
}

if ($method === 'PUT' && isset($_GET['id'])) {
  $id = $_GET['id'];
  try {
    $st = db()->prepare('SELECT tags, section_id FROM content WHERE id = ?');
    $st->execute([$id]);
    $current = $st->fetch();
  } catch (PDOException $e) {
    Logger::error('E_DB_QUERY', ['op' => 'update_fetch', 'id' => $id, 'error' => $e->getMessage()]);
    err('Query failed', 500, 'E_DB_QUERY');
  }
  if (!$current) err('Not found', 404, 'E_REQ_NOT_FOUND', ['id' => $id]);

  $oldTags   = json_decode($current['tags'], true);
  $sectionId = $current['section_id'];
  $newData      = $body['data']      ?? null;
  $newTags      = $body['tags']      ?? null;
  $newLinkedIds = $body['linkedIds'] ?? null;
  $now          = (int)(microtime(true) * 1000);

  $sets = ['updated_at = ?']; $params = [$now];
  if ($newData      !== null) { $sets[] = 'data = ?';       $params[] = json_encode($newData, JSON_UNESCAPED_UNICODE); }
  if ($newTags      !== null) { $sets[] = 'tags = ?';       $params[] = json_encode($newTags); }
  if ($newLinkedIds !== null) { $sets[] = 'linked_ids = ?'; $params[] = json_encode($newLinkedIds); }
  $params[] = $id;

  try {
    db()->prepare('UPDATE content SET ' . implode(', ', $sets) . ' WHERE id = ?')->execute($params);
  } catch (PDOException $e) {
    Logger::error('E_DATA_UPDATE', ['id' => $id, 'error' => $e->getMessage()]);
    err('Failed to update', 500, 'E_DATA_UPDATE');
  }

  if ($newTags !== null) {
    update_tag_frequencies(array_diff($newTags, $oldTags), $sectionId,  1);
    update_tag_frequencies(array_diff($oldTags, $newTags), $sectionId, -1);
  }
  json_out(['ok' => true, 'daysLeft' => $daysLeft]);
}

if ($method === 'DELETE' && isset($_GET['id'])) {
  $id = $_GET['id'];
  try {
    $st = db()->prepare('SELECT tags, section_id FROM content WHERE id = ?');
    $st->execute([$id]);
    $row = $st->fetch();
    if (!$row) err('Not found', 404, 'E_REQ_NOT_FOUND', ['id' => $id]);
    db()->prepare('DELETE FROM content WHERE id = ?')->execute([$id]);
    update_tag_frequencies(json_decode($row['tags'], true), $row['section_id'], -1);
    json_out(['ok' => true, 'daysLeft' => $daysLeft]);
  } catch (PDOException $e) {
    Logger::error('E_DATA_DELETE', ['id' => $id, 'error' => $e->getMessage()]);
    err('Failed to delete', 500, 'E_DATA_DELETE');
  }
}

if ($action === 'change-password' && $method === 'POST') {
  $verifier = $body['verifier'] ?? '';
  $salt     = $body['salt']     ?? '';
  if (!$verifier || !$salt) err('verifier and salt required', 400, 'E_REQ_MISSING');
  set_setting('auth_verifier', password_hash($verifier, PASSWORD_BCRYPT, ['cost' => 12]));
  set_setting('auth_salt',     $salt);
  set_setting('auth_set_at',   (string)(int)(microtime(true) * 1000));
  json_out(['ok' => true]);
}

err('No route matched', 400, 'E_REQ_UNKNOWN', ['method' => $method, 'action' => $action ?: 'none']);

// ─────────────────────────────────────────────────────────────────────────────

function update_tag_frequencies(array $tags, string $sectionId, int $delta): void {
  if (!$tags) return;
  $db = db();
  foreach ($tags as $tag) {
    $tag = trim((string)$tag);
    if (!$tag) continue;
    try {
      if ($delta > 0) {
        $db->prepare('INSERT INTO tag_frequency (tag,section_id,count) VALUES (?,?,1)
                      ON DUPLICATE KEY UPDATE count=GREATEST(0,count+1)')->execute([$tag, $sectionId]);
      } else {
        $db->prepare('UPDATE tag_frequency SET count=GREATEST(0,count-1) WHERE tag=? AND section_id=?')
           ->execute([$tag, $sectionId]);
      }
    } catch (PDOException $e) {
      Logger::warn('E_SYS_TAG_FREQ', ['tag' => $tag, 'error' => $e->getMessage()]);
    }
  }
}
