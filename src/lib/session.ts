/** Lightweight client sessions. Seller sessions remain local until full seller auth is introduced. */
const KEY = "nammaspot.session";
const ADMIN_KEY = "nammaspot.admin.token";

export function setSession(sellerId: string) {
  if (typeof window !== "undefined") window.localStorage.setItem(KEY, sellerId);
}
export function getSession(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(KEY);
}
export function clearSession() { if (typeof window !== "undefined") window.localStorage.removeItem(KEY); }

export function setAdmin(token: string | null) {
  if (typeof window === "undefined") return;
  if (token) window.sessionStorage.setItem(ADMIN_KEY, token);
  else window.sessionStorage.removeItem(ADMIN_KEY);
}
export function getAdminToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.sessionStorage.getItem(ADMIN_KEY);
}
export function isAdmin(): boolean {
  return Boolean(getAdminToken());
}
