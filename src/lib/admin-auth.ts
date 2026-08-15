/**
 * NammaSpot admin authentication.
 *
 * The admin console is gated by a real Lovable Cloud auth account (email +
 * password, hashed server-side — never stored or hardcoded in the app).
 * Only the account below is treated as admin.
 */

import { supabase } from "@/integrations/supabase/client";

export const ADMIN_EMAIL = "madhumithau10@gmail.com";

const isAdminEmail = (email?: string | null) =>
  (email ?? "").trim().toLowerCase() === ADMIN_EMAIL;

/** True when the current session belongs to the admin account. */
export async function isAdminSession(): Promise<boolean> {
  const { data } = await supabase.auth.getUser();
  return isAdminEmail(data.user?.email);
}

export async function signInAdmin(
  email: string,
  password: string,
): Promise<{ ok: boolean; error?: string }> {
  if (!email.trim()) return { ok: false, error: "Enter your admin email" };
  if (!password) return { ok: false, error: "Enter your password" };

  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim().toLowerCase(),
    password,
  });

  if (error || !data.session) return { ok: false, error: "Incorrect email or password." };

  if (!isAdminEmail(data.user?.email)) {
    await supabase.auth.signOut();
    return { ok: false, error: "This account does not have admin access." };
  }

  return { ok: true };
}

export async function signOutAdmin() {
  await supabase.auth.signOut();
}

/** Sends the password-reset email back to the admin console. */
export async function sendAdminReset(email: string): Promise<{ ok: boolean; error?: string }> {
  const target = email.trim().toLowerCase();
  if (!target) return { ok: false, error: "Enter your admin email" };
  const { error } = await supabase.auth.resetPasswordForEmail(target, {
    redirectTo: `${window.location.origin}/admin`,
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function updateAdminPassword(password: string): Promise<{ ok: boolean; error?: string }> {
  if (password.length < 8) return { ok: false, error: "Password must be at least 8 characters" };
  if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password))
    return { ok: false, error: "Password must include a letter and a number" };
  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    const msg = error.message.toLowerCase();
    if (msg.includes("pwned") || msg.includes("weak"))
      return { ok: false, error: "That password is too common. Please choose a stronger one." };
    return { ok: false, error: error.message };
  }
  return { ok: true };
}

/** True when the page was opened from a password-recovery email link. */
export function isRecoveryLink(): boolean {
  if (typeof window === "undefined") return false;
  const hash = window.location.hash;
  return hash.includes("type=recovery") || window.location.search.includes("type=recovery");
}
