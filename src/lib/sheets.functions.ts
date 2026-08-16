import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { SHEET_TABLES, SHEETS_API_BASE_FALLBACK, type SheetRow } from "@/lib/sheets-shared";

export type { SheetCell, SheetRow, SheetTable } from "@/lib/sheets-shared";

export const fetchSheetBundle = createServerFn({ method: "GET" })
  .inputValidator((data: unknown) =>
    z.object({ tables: z.array(z.enum(SHEET_TABLES)).min(1).max(6) }).parse(data),
  )
  .handler(async ({ data }): Promise<{ rows: Record<string, SheetRow[]>; error?: string }> => {
    const { readTables } = await import("@/lib/sheets-cache.server");
    return readTables(data.tables);
  });

const rowSchema = z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()]));
const actionSchema = z.enum(["addSeller", "addProduct", "addCustomer", "addEnquiry", "addReview"]);

async function postToSheets(payload: Record<string, unknown>) {
  const base = process.env["SHEETS_API_BASE"] ?? SHEETS_API_BASE_FALLBACK;
  const res = await fetch(base, {
    method: "POST",
    redirect: "follow",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify(payload),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Sheets backend HTTP ${res.status}`);
  let parsed: { success?: boolean; error?: string };
  try { parsed = JSON.parse(text); } catch { throw new Error("Sheets backend returned invalid JSON"); }
  if (!parsed.success) throw new Error(parsed.error ?? "Sheets backend rejected the write");
  return { ok: true as const };
}

export const appendSheetRow = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => z.object({ action: actionSchema, row: rowSchema }).parse(data))
  .handler(async ({ data }) => postToSheets({ action: data.action, data: data.row }));

export const updateSheetRow = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => z.object({ action: actionSchema, id: z.string().min(1), row: rowSchema }).parse(data))
  .handler(async ({ data }) => postToSheets({ action: "updateRow", table: data.action.replace("add", "").toLowerCase() + "s", id: data.id, data: data.row }));

export const deleteSheetRow = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => z.object({ table: z.string().min(1), id: z.string().min(1) }).parse(data))
  .handler(async ({ data }) => postToSheets({ action: "deleteRow", table: data.table, id: data.id }));
