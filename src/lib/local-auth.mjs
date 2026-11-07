import { createHmac, timingSafeEqual } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

export const SESSION_COOKIE = 'osiris_local';
export const LOGIN_PATH = '/local-login';

/** App-specific file. Created by tools/bootstrap-local-auth.mjs. Not another account's secret. */
export function defaultTokenPath() {
  return process.env.OSIRIS_LOCAL_TOKEN_FILE?.trim()
    || join(homedir(), '.config', 'osiris', 'local-token');
}

let cached;

export function resetLocalTokenCache() {
  cached = undefined;
}

export function loadLocalToken() {
  if (cached !== undefined) return cached;
  const fromEnv = process.env.OSIRIS_LOCAL_TOKEN;
  if (typeof fromEnv === 'string' && fromEnv.trim()) {
    cached = fromEnv.trim();
    return cached;
  }
  try {
    const text = readFileSync(defaultTokenPath(), 'utf8').trim();
    cached = text || null;
  } catch {
    cached = null;
  }
  return cached;
}

export function sessionValue(secret) {
  return createHmac('sha256', secret).update('osiris-local-session-v1').digest('base64url');
}

export function safeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length || left.length === 0) return false;
  return timingSafeEqual(left, right);
}

export function readCookie(header, name) {
  if (!header) return '';
  for (const part of String(header).split(';')) {
    const eq = part.indexOf('=');
    if (eq === -1) continue;
    const key = part.slice(0, eq).trim();
    if (key === name) return part.slice(eq + 1).trim();
  }
  return '';
}

export function isLoopbackHost(hostHeader) {
  if (!hostHeader) return false;
  const host = String(hostHeader).trim().toLowerCase().split(',')[0].trim();
  if (host.startsWith('[')) {
    const end = host.indexOf(']');
    if (end < 0) return false;
    const rest = host.slice(end + 1);
    if (rest && !/^:\d{1,5}$/.test(rest)) return false;
    return host.slice(1, end) === '::1';
  }
  const parts = host.split(':');
  if (parts.length > 2) return false;
  if (parts[1] !== undefined && !/^\d{1,5}$/.test(parts[1])) return false;
  return parts[0] === 'localhost' || parts[0] === '127.0.0.1';
}

export function isLoopbackAddress(addr) {
  if (!addr) return false;
  const bare = String(addr).replace(/^::ffff:/i, '');
  return bare === '127.0.0.1' || bare === '::1';
}

export function sessionOk(cookieHeader, secret) {
  if (!secret) return false;
  return safeEqual(readCookie(cookieHeader, SESSION_COOKIE), sessionValue(secret));
}

export function cookieHeader(secret) {
  const value = sessionValue(secret);
  return `${SESSION_COOKIE}=${value}; HttpOnly; SameSite=Strict; Path=/; Max-Age=43200`;
}
