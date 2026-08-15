/**
 * Demo seller session. Stored client-side only — replace with a real
 * auth check (Apps Script token, Firebase Auth, Lovable Cloud) later.
 */
const KEY = "nammaspot.session";

export function setSession(sellerId: string) {
  if (typeof window !== "undefined") window.localStorage.setItem(KEY, sellerId);
}

export function getSession(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(KEY);
}

export function clearSession() {
  if (typeof window !== "undefined") window.localStorage.removeItem(KEY);
}

const ADMIN_KEY = "nammaspot.admin";

export function setAdmin(on: boolean) {
  if (typeof window === "undefined") return;
  if (on) window.localStorage.setItem(ADMIN_KEY, "1");
  else window.localStorage.removeItem(ADMIN_KEY);
}

export function isAdmin(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(ADMIN_KEY) === "1";
}
