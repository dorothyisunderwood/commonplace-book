// ─────────────────────────────────────────────────────────────────────────────
// api.jsx — Authenticated API client
//
// All requests are signed with HMAC-SHA256 using the session-derived key.
// On 401 the session key is cleared so the app shows the lock screen.
//
// Usage:
//   import { api } from './api.jsx';
//   const poems = await api.list('poetry', { sort: 'author' });
//   const poem  = await api.get('poem:abc123');
//   const saved = await api.create({ sectionId: 'poetry', data: { ... } });
//   await api.update('poem:abc123', { data: { ... } });
//   await api.delete('poem:abc123');
//   const tags  = await api.tags('poetry');
//   const rand  = await api.random('poetry');
// ─────────────────────────────────────────────────────────────────────────────

import { getSessionKey, clearSessionKey, signRequest, storeDaysLeft } from './auth.jsx';

// Fill in your subdomain before deploying.
// In production this will be something like: https://api.yourdomain.com
const API_BASE = import.meta.env.VITE_API_URL ?? 'https://api.yourdomain.com';

// ── Core signed fetch ─────────────────────────────────────────────────────────

async function signedFetch(method, path, queryParams = {}, body = null) {
  const keyHex = getSessionKey();
  if (!keyHex) throw new AuthError('Not authenticated');

  const url       = new URL(API_BASE);
  url.pathname    = '/';
  Object.entries(queryParams).forEach(([k, v]) => url.searchParams.set(k, v));

  const timestamp = Date.now().toString();
  const bodyStr   = body ? JSON.stringify(body) : '';

  // The path we sign is just the pathname + search (not the full origin)
  const signedPath = url.pathname + url.search;
  const signature  = await signRequest(keyHex, method, signedPath, timestamp, bodyStr);

  const headers = {
    'Content-Type':  'application/json',
    'X-Timestamp':   timestamp,
    'X-Signature':   signature,
    'X-Auth-Key':    keyHex,
  };

  const res = await fetch(url.toString(), {
    method,
    headers,
    body: body ? bodyStr : undefined,
  });

  // Session expired or invalid key — force re-auth
  if (res.status === 401) {
    clearSessionKey();
    throw new AuthError('Session expired');
  }

  const data = await res.json();

  // Track password expiry days from every response
  if (data.daysLeft !== undefined) {
    storeDaysLeft(data.daysLeft);
  }

  if (!res.ok) throw new ApiError(data.error ?? 'Request failed', res.status);
  return data;
}

// ── Public (unsigned) fetch ───────────────────────────────────────────────────
// Used for ping, setup-status, salt, reset flows

async function publicFetch(method, queryParams = {}, body = null) {
  const url = new URL(API_BASE);
  url.pathname = '/';
  Object.entries(queryParams).forEach(([k, v]) => url.searchParams.set(k, v));

  const res = await fetch(url.toString(), {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json();
  if (!res.ok) throw new ApiError(data.error ?? 'Request failed', res.status);
  return data;
}

// ── Error types ───────────────────────────────────────────────────────────────

export class AuthError extends Error {
  constructor(msg) { super(msg); this.name = 'AuthError'; }
}

export class ApiError extends Error {
  constructor(msg, status) {
    super(msg);
    this.name   = 'ApiError';
    this.status = status;
  }
}

// ── API surface ───────────────────────────────────────────────────────────────

export const api = {

  // ── Auth / setup ───────────────────────────────────────────────────────────

  ping: () =>
    publicFetch('GET', { action: 'ping' }),

  setupStatus: () =>
    publicFetch('GET', { action: 'setup-status' }),

  // Fetch the PBKDF2 salt stored server-side (needed to derive key on login)
  getSalt: () =>
    publicFetch('GET', { action: 'salt' }),

  // First-run: store derived key verifier + salt + notification email
  setup: ({ verifier, salt, email }) =>
    publicFetch('POST', { action: 'setup' }, { verifier, salt, email }),

  // Request a reset email
  requestReset: () =>
    publicFetch('POST', { action: 'reset-request' }, {}),

  // Complete reset with new credentials
  verifyReset: ({ token, verifier, salt }) =>
    publicFetch('POST', { action: 'reset-verify' }, { token, verifier, salt }),

  // Change password (authenticated)
  changePassword: ({ verifier, salt }) =>
    signedFetch('POST', '/', { action: 'change-password' }, { verifier, salt }),

  // ── Content CRUD ───────────────────────────────────────────────────────────

  // List items in a section with optional sort/filter
  // opts: { sort, tag, author, q }
  list: (sectionId, opts = {}) =>
    signedFetch('GET', '/', { section: sectionId, ...opts }),

  // Fetch a single item by id
  get: (id) =>
    signedFetch('GET', '/', { id }),

  // Create a new content item
  // record: { sectionId, contentType?, data, tags?, linkedIds? }
  create: (record) =>
    signedFetch('POST', '/', {}, record),

  // Update fields on an existing item
  // updates: { data?, tags?, linkedIds? }
  update: (id, updates) =>
    signedFetch('PUT', '/', { id }, updates),

  // Delete an item permanently
  delete: (id) =>
    signedFetch('DELETE', '/', { id }),

  // ── Discovery ──────────────────────────────────────────────────────────────

  // Tags weighted by section frequency (for autocomplete)
  tags: (sectionId) =>
    signedFetch('GET', '/', { action: 'tags', section: sectionId }),

  // All unique authors in a section
  authors: (sectionId) =>
    signedFetch('GET', '/', { action: 'authors', section: sectionId }),

  // A single random item from a section
  random: (sectionId) =>
    signedFetch('GET', '/', { action: 'random', section: sectionId }),
};
