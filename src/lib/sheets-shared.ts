/** Shared, runtime-safe constants/types for the Google Sheets backend. */

export const SHEET_TABLES = [
  "sellers",
  "products",
  "categories",
  "customers",
  "enquiries",
  "reviews",
] as const;

export type SheetTable = (typeof SHEET_TABLES)[number];

export type SheetCell = string | number | boolean | null;
export type SheetRow = Record<string, SheetCell>;

// Production Apps Script Web App. Prefer SHEETS_API_BASE in the server environment;
// this fallback keeps the application connected when the environment variable is absent.
export const SHEETS_API_BASE_FALLBACK =
  "https://script.google.com/macros/s/AKfycbxru0_IP873A19vYNdsnQmWGAHgbfeD6iV81DFd8YGeBS6bhyJltsx3k1w0n3U-aCeNEA/exec";
