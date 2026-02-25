// ─────────────────────────────────────────────────────────────────────────────
// auth.jsx — Passphrase-based request signing using Web Crypto API
//
// Key derivation chain:
//   passphrase (string)
//     → PBKDF2(passphrase, base64Salt, 100000 iterations, SHA-256, 256 bits)
//     → derivedKey (CryptoKey, extractable=true)
//     → keyHex (string) — sent as X-Auth-Key header (over TLS only)
//     → HMAC-SHA256(method|path|timestamp|body, derivedKey) → X-Signature
//
// The server stores bcrypt(keyHex) and verifies incoming X-Auth-Key against it.
// The passphrase itself never leaves the browser.
//
// Session storage:
//   sessionStorage['cb_key_hex'] — cleared when tab closes
//   sessionStorage['cb_days_left'] — set from server responses
//   sessionStorage['cb_key_expires'] — unix ms from server's daysLeft
//
// ─────────────────────────────────────────────────────────────────────────────

const PBKDF2_ITERATIONS = 100_000;
const KEY_STORAGE_KEY   = 'cb_key_hex';
const DAYS_LEFT_KEY     = 'cb_days_left';

// ── Password validation rules ─────────────────────────────────────────────────
// Returns an array of rule objects, each with { label, ok } for live display.

export function validatePassword(pw) {
  return [
    { label: 'At least 8 characters',                      ok: pw.length >= 8 },
    { label: 'Contains a number',                          ok: /[0-9]/.test(pw) },
    { label: 'Contains a special character (!@#$%^&*-_+=?)', ok: /[!@#$%^&*\-_+=?]/.test(pw) },
  ];
}

export function isPasswordValid(pw) {
  return validatePassword(pw).every(r => r.ok);
}

// ── PBKDF2 key derivation ─────────────────────────────────────────────────────
// Returns the derived key as a hex string.
// saltBase64: the server-provided salt (base64 encoded, 16 bytes)

export async function deriveKeyHex(passphrase, saltBase64) {
  const enc      = new TextEncoder();
  const saltBuf  = Uint8Array.from(atob(saltBase64), c => c.charCodeAt(0));

  // Import passphrase as raw key material for PBKDF2
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(passphrase),
    'PBKDF2',
    false,
    ['deriveKey']
  );

  // Derive a 256-bit AES-GCM key (we'll use it as HMAC key material too)
  const derived = await crypto.subtle.deriveKey(
    {
      name:       'PBKDF2',
      salt:       saltBuf,
      iterations: PBKDF2_ITERATIONS,
      hash:       'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    true,           // extractable — we need the raw bytes for the server verifier
    ['encrypt']     // usage doesn't matter, we're extracting the raw bytes
  );

  const rawBytes = await crypto.subtle.exportKey('raw', derived);
  return Array.from(new Uint8Array(rawBytes))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

// ── HMAC signing ──────────────────────────────────────────────────────────────
// Signs the canonical request string with the derived key.
// canonical = method + "|" + path + "|" + timestamp + "|" + body

export async function signRequest(keyHex, method, path, timestamp, body = '') {
  const keyBytes = Uint8Array.from(
    keyHex.match(/.{2}/g).map(b => parseInt(b, 16))
  );

  const hmacKey = await crypto.subtle.importKey(
    'raw',
    keyBytes,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const canonical = `${method}|${path}|${timestamp}|${body}`;
  const enc       = new TextEncoder();
  const sigBuf    = await crypto.subtle.sign('HMAC', hmacKey, enc.encode(canonical));

  return Array.from(new Uint8Array(sigBuf))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

// ── Generate a random salt ────────────────────────────────────────────────────
// Returns base64-encoded 16 random bytes.

export function generateSalt() {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return btoa(String.fromCharCode(...bytes));
}

// ── Session key management ────────────────────────────────────────────────────

export function storeSessionKey(keyHex) {
  sessionStorage.setItem(KEY_STORAGE_KEY, keyHex);
}

export function getSessionKey() {
  return sessionStorage.getItem(KEY_STORAGE_KEY);
}

export function clearSessionKey() {
  sessionStorage.removeItem(KEY_STORAGE_KEY);
  sessionStorage.removeItem(DAYS_LEFT_KEY);
}

export function isAuthenticated() {
  return !!getSessionKey();
}

export function storeDaysLeft(days) {
  sessionStorage.setItem(DAYS_LEFT_KEY, String(days));
}

export function getDaysLeft() {
  const v = sessionStorage.getItem(DAYS_LEFT_KEY);
  return v === null ? null : parseInt(v);
}
