import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { SHEET_TABLES, SHEETS_API_BASE_FALLBACK, type SheetRow } from "@/lib/sheets-shared";

export type { SheetCell, SheetRow, SheetTable } from "@/lib/sheets-shared";
const WRITE_ACTIONS = ["addSeller", "addProduct", "addCustomer", "addEnquiry", "addReview"] as const;
const UPDATE_ACTIONS = ["updateSeller", "updateProduct", "updateCustomer", "updateEnquiry", "updateReview"] as const;

async function callBackend(body: Record<string, unknown>): Promise<{ ok: boolean; data?: unknown; error?: string }> {
  const base = process.env["SHEETS_API_BASE"] ?? SHEETS_API_BASE_FALLBACK;
  try {
    const res = await fetch(base, { method: "POST", redirect: "follow", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify(body) });
    const text = await res.text();
    if (!res.ok) return { ok: false, error: `HTTP ${res.status}` };
    const parsed = JSON.parse(text) as { success?: boolean; data?: unknown; error?: string };
    return parsed.success ? { ok: true, data: parsed.data } : { ok: false, error: parsed.error ?? "Backend rejected request" };
  } catch (err) { return { ok: false, error: String(err) }; }
}

export const fetchSheetBundle = createServerFn({ method: "GET" })
  .inputValidator((data: unknown) => z.object({ tables: z.array(z.enum(SHEET_TABLES)).min(1).max(6) }).parse(data))
  .handler(async ({ data }): Promise<{ rows: Record<string, SheetRow[]>; error?: string }> => {
    const { readTables } = await import("@/lib/sheets-cache.server");
    return readTables(data.tables);
  });

export const appendSheetRow = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => z.object({ action: z.enum(WRITE_ACTIONS), row: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()])) }).parse(data))
  .handler(async ({ data }) => callBackend({ action: data.action, data: data.row }));

export const updateSheetRow = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => z.object({ action: z.enum(UPDATE_ACTIONS), row: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()])), token: z.string().nullable().optional() }).parse(data))
  .handler(async ({ data }) => callBackend({ action: data.action, data: data.row, token: data.token ?? "" }));

export const authenticateAdmin = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => z.object({ password: z.string().min(1).max(200) }).parse(data))
  .handler(async ({ data }) => callBackend({ action: "adminLogin", data: { password: data.password } }));
