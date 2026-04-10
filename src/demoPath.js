// Demo base path, gated by VITE_DEMO_TOKEN env var.
// All demo routes branch off this prefix.
const token = (import.meta.env.VITE_DEMO_TOKEN || '').trim();
export const RAW_TOKEN = token;
export const DEMO_BASE = token ? `/demo/${token}` : '/demo';
export const CLINICAL_BASE = token ? `/demo/clinical/${token}` : '/demo/clinical';

// Session cookie name used to propagate the token from the demo entry page
// to /coordinator, /patient, /checkin routes so in-app navigation works
// without manually carrying ?token=... on every URL.
const COOKIE_NAME = 'vardana_demo_token';

// Read the token cookie (returns empty string if absent)
function readCookie() {
  if (typeof document === 'undefined') return '';
  const match = document.cookie.match(new RegExp('(?:^|;\\s*)' + COOKIE_NAME + '=([^;]*)'));
  return match ? decodeURIComponent(match[1]) : '';
}

// Set the token cookie (session scope — cleared when browser closes)
export function setDemoTokenCookie() {
  if (typeof document === 'undefined' || !token) return;
  document.cookie = `${COOKIE_NAME}=${encodeURIComponent(token)}; path=/; SameSite=Lax`;
}

// Check if the current request is authorized: either the URL has ?token={TOKEN}
// or the session cookie matches. If VITE_DEMO_TOKEN is unset (dev), allow all.
export function isTokenValid() {
  if (!token) return true; // no token configured — dev mode, allow
  if (typeof window === 'undefined') return false;
  const queryToken = (new URLSearchParams(window.location.search).get('token') || '').trim();
  if (queryToken === token) return true;
  if (readCookie() === token) return true;
  return false;
}
