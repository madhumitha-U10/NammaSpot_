import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { SHEET_TABLES, SHEETS_API_BASE_FALLBACK, type SheetRow } from "@/lib/sheets-shared";

export type { SheetCell, SheetRow, SheetTable } from "@/lib/sheets-shared";

const rowSchema = z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()]));
const tableSchema = z.enum(SHEET_TABLES);
const legacyActionSchema = z.enum(["addSeller", "addProduct", "addCustomer", "addEnquiry", "addReview"]);
const ID_KEYS: Record<(typeof SHEET_TABLES)[number], string> = {
  sellers: "sellerId",
  products: "productId",
  categories: "categoryId",
  customers: "customerId",
  enquiries: "enquiryId",
  reviews: "reviewId",
};

export const fetchSheetBundle = createServerFn({ method: "GET" })
  .inputValidator((data: unknown) => z.object({ tables: z.array(tableSchema).min(1).max(6) }).parse(data))
  .handler(async ({ data }): Promise<{ rows: Record<string, SheetRow[]>; error?: string }> => {
    const { readTables } = await import("@/lib/sheets-cache.server");
    return readTables(data.tables);
  });

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
  return parsed;
}

export const authenticateAdmin = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => z.object({ password: z.string().min(1).max(200) }).parse(data))
  .handler(async ({ data }) => {
    const result = await postToSheets({ action: "authenticateAdmin", password: data.password });
    return result.data as { token: string; expiresAt: number };
  });

export const verifyAdmin = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => z.object({ token: z.string().min(1) }).parse(data))
  .handler(async ({ data }) => {
    const result = await postToSheets({ action: "verifyAdmin", token: data.token });
    return Boolean((result.data as { valid?: boolean } | null)?.valid);
  });

export const appendSheetRow = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => z.object({ action: legacyActionSchema, row: rowSchema }).parse(data))
  .handler(async ({ data }) => postToSheets({ action: data.action, data: data.row }));

export const createSheetRow = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => z.object({ table: tableSchema, row: rowSchema }).parse(data))
  .handler(async ({ data }) => postToSheets({ action: "create", table: data.table, data: data.row }));

export const updateSheetRow = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => z.object({ table: tableSchema, id: z.string().min(1), row: rowSchema }).parse(data))
  .handler(async ({ data }) => {
    const idKey = ID_KEYS[data.table];
    return postToSheets({ action: "update", table: data.table, data: { ...data.row, [idKey]: data.id } });
  });
