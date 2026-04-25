// Auth helpers — no localStorage (blocked in sandbox). Use React state.
// Token is stored in module-level variable and passed via context.

let _token: string | null = null;

export function setToken(t: string | null) { _token = t; }
export function getToken(): string | null { return _token; }

export function authHeaders(): HeadersInit {
  return _token ? { Authorization: `Bearer ${_token}` } : {};
}
