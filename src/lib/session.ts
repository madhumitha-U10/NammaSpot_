import { authenticateAdmin, verifyAdmin } from "@/lib/sheets.functions";

const SELLER_KEY = "nammaspot.session";
const ADMIN_TOKEN_KEY = "nammaspot.admin.token";
const ADMIN_EXPIRY_KEY = "nammaspot.admin.expiresAt";

export function setSession(sellerId: string) {
  if (typeof window !== "undefined") window.localStorage.setItem(SELLER_KEY, sellerId);
}

export function getSession(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(SELLER_KEY);
}

export function clearSession() {
  if (typeof window !== "undefined") window.localStorage.removeItem(SELLER_KEY);
}

export async function loginAdmin(password: string): Promise<boolean> {
  const result = await authenticateAdmin({ data: { password } });
  if (typeof window !== "undefined") {
    window.localStorage.setItem(ADMIN_TOKEN_KEY, result.token);
    window.localStorage.setItem(ADMIN_EXPIRY_KEY, String(result.expiresAt));
  }
  return true;
}

export async function isAdmin(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  const token = window.localStorage.getItem(ADMIN_TOKEN_KEY);
  const expiresAt = Number(window.localStorage.getItem(ADMIN_EXPIRY_KEY) || 0);
  if (!token || !expiresAt || Date.now() >= expiresAt) {
    setAdmin(false);
    return false;
  }
  try {
    const valid = await verifyAdmin({ data: { token } });
    if (!valid) setAdmin(false);
    return valid;
  } catch {
    setAdmin(false);
    return false;
  }
}

export function setAdmin(on: boolean) {
  if (typeof window === "undefined") return;
  if (!on) {
    window.localStorage.removeItem(ADMIN_TOKEN_KEY);
    window.localStorage.removeItem(ADMIN_EXPIRY_KEY);
  }
}
