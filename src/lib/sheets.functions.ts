import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { SHEET_TABLES, SHEETS_API_BASE_FALLBACK, type SheetRow } from "@/lib/sheets-shared";

export type { SheetCell, SheetRow, SheetTable } from "@/lib/sheets-shared";

type WriteAction =
  | "addSeller"
  | "addProduct"
  | "addCustomer"
  | "addEnquiry"
  | "addReview";

type UpdateAction =
  | "updateSeller"
  | "updateProduct"
  | "updateCustomer"
  | "updateEnquiry"
  | "updateReview";

export const fetchSheetBundle = createServerFn({ method: "GET" })
  .inputValidator((data: unknown) =>
    z.object({ tables: z.array(z.enum(SHEET_TABLES)).min(1).max(6) }).parse(data),
  )
  .handler(async ({ data }): Promise<{ rows: Record<string, SheetRow[]>; error?: string | undefined }> => {
    const { readTables } = await import("@/lib/sheets-cache.server");
    return readTables(data.tables);
  });

async function writeSheet(action: WriteAction | UpdateAction, row: SheetRow) {
  const base = process.env["SHEETS_API_BASE"] ?? SHEETS_API_BASE_FALLBACK;
  try {
    const res = await fetch(base, {
      method: "POST",
      redirect: "follow",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ action, data: row }),
    });
    const text = await res.text();
    if (!res.ok) return { ok: false, error: `HTTP ${res.status}` };
    try {
      const parsed = JSON.parse(text) as { success?: boolean; error?: string; data?: unknown };
      return parsed.success
        ? { ok: true, data: parsed.data }
        : { ok: false, error: parsed.error ?? "Write rejected" };
    } catch {
      return { ok: false, error: "Backend returned a non-JSON response" };
    }
  } catch (err) {
    return { ok: false, error: String(err) };
  }
}

const writeInput = z.object({
  action: z.enum(["addSeller", "addProduct", "addCustomer", "addEnquiry", "addReview"]),
  row: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()])),
});

export const appendSheetRow = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => writeInput.parse(data))
  .handler(async ({ data }) => writeSheet(data.action, data.row));

const updateInput = z.object({
  action: z.enum(["updateSeller", "updateProduct", "updateCustomer", "updateEnquiry", "updateReview"]),
  row: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()])),
});

export const updateSheetRow = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => updateInput.parse(data))
  .handler(async ({ data }) => writeSheet(data.action, data.row));
