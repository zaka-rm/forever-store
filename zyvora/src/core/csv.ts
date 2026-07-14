/**
 * CSV import (Wave 6 — ZPL-040 §12). Parse → map columns → validate → preview →
 * append as Business Memory events. Nothing is written until the user confirms
 * after seeing the dry-run preview (no silent second source of truth: imported
 * rows become the same fact events the app already uses).
 */

/** Minimal RFC-4180-ish parser: handles quoted fields, escaped quotes, CRLF. */
export function parseCsv(text: string): { headers: string[]; rows: string[][] } {
  const rows: string[][] = [];
  let field = "";
  let row: string[] = [];
  let inQuotes = false;
  const s = text.replace(/^﻿/, ""); // strip BOM
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (inQuotes) {
      if (c === '"') {
        if (s[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += c;
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      row.push(field); field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && s[i + 1] === "\n") i++;
      row.push(field); field = "";
      if (row.some((f) => f.trim() !== "")) rows.push(row);
      row = [];
    } else field += c;
  }
  if (field !== "" || row.length) { row.push(field); if (row.some((f) => f.trim() !== "")) rows.push(row); }
  const headers = rows.shift() ?? [];
  return { headers: headers.map((h) => h.trim()), rows };
}

export type ImportType = "products" | "expenses" | "invoices";

export interface FieldSpec {
  key: string;
  label: string;
  required: boolean;
  kind: "text" | "number" | "date";
  aliases: string[]; // header names we auto-match (lowercased, substring)
}

export const SPECS: Record<ImportType, { label: string; fields: FieldSpec[] }> = {
  products: {
    label: "Products",
    fields: [
      { key: "name", label: "Name", required: true, kind: "text", aliases: ["name", "product", "title", "designation"] },
      { key: "price", label: "Selling price", required: true, kind: "number", aliases: ["price", "selling", "prix", "pv"] },
      { key: "unitCost", label: "Unit cost", required: true, kind: "number", aliases: ["cost", "buying", "cout", "achat", "pa"] },
      { key: "stock", label: "Stock", required: true, kind: "number", aliases: ["stock", "qty", "quantity", "quantite"] },
      { key: "weeklySales", label: "Sales / week", required: false, kind: "number", aliases: ["week", "velocity", "sales", "ventes"] },
      { key: "leadTimeDays", label: "Lead time (days)", required: false, kind: "number", aliases: ["lead", "delai", "resupply"] },
    ],
  },
  expenses: {
    label: "Expenses",
    fields: [
      { key: "label", label: "Label", required: true, kind: "text", aliases: ["label", "description", "name", "libelle", "categorie", "category"] },
      { key: "amount", label: "Amount", required: true, kind: "number", aliases: ["amount", "montant", "total", "cost"] },
      { key: "date", label: "Date", required: false, kind: "date", aliases: ["date", "day", "when"] },
    ],
  },
  invoices: {
    label: "Invoices",
    fields: [
      { key: "customer", label: "Customer", required: true, kind: "text", aliases: ["customer", "client", "name", "nom"] },
      { key: "amount", label: "Amount", required: true, kind: "number", aliases: ["amount", "montant", "total", "revenue"] },
      { key: "issuedAt", label: "Issued date", required: false, kind: "date", aliases: ["date", "issued", "created", "invoice date"] },
      { key: "dueDays", label: "Due (days)", required: false, kind: "number", aliases: ["due", "terms", "echeance"] },
      { key: "paidDate", label: "Paid date (optional)", required: false, kind: "date", aliases: ["paid", "payment", "regle", "paye"] },
    ],
  },
};

/** Auto-map each field to the best-matching header index (or -1). */
export function autoMap(type: ImportType, headers: string[]): Record<string, number> {
  const map: Record<string, number> = {};
  const lower = headers.map((h) => h.toLowerCase());
  for (const f of SPECS[type].fields) {
    let idx = -1;
    for (const alias of f.aliases) {
      idx = lower.findIndex((h) => h === alias);
      if (idx === -1) idx = lower.findIndex((h) => h.includes(alias));
      if (idx !== -1) break;
    }
    map[f.key] = idx;
  }
  return map;
}

const parseNum = (v: string): number | null => {
  const n = parseFloat(String(v).replace(/[^\d.,-]/g, "").replace(/,/g, "."));
  return isFinite(n) ? n : null;
};
const parseDate = (v: string): number | null => {
  const t = Date.parse(v);
  return isNaN(t) ? null : t;
};

export interface BuiltRow {
  event: { type: string; payload: Record<string, unknown>; ts: number } | null;
  extra?: { type: string; payload: Record<string, unknown>; ts: number }; // e.g. invoice_paid
  error: string | null;
}

/** Validate + convert one row into event(s). Never throws; returns an error string instead. */
export function buildRow(
  type: ImportType,
  map: Record<string, number>,
  cells: string[]
): BuiltRow {
  const get = (key: string) => {
    const idx = map[key];
    return idx >= 0 && idx < cells.length ? cells[idx].trim() : "";
  };
  const now = Date.now();

  if (type === "products") {
    const name = get("name");
    const price = parseNum(get("price"));
    const cost = parseNum(get("unitCost"));
    const stock = parseNum(get("stock"));
    if (!name) return { event: null, error: "missing name" };
    if (price === null) return { event: null, error: "invalid price" };
    if (cost === null) return { event: null, error: "invalid unit cost" };
    if (stock === null) return { event: null, error: "invalid stock" };
    return {
      error: null,
      event: {
        type: "product_added",
        ts: now,
        payload: {
          productId: crypto.randomUUID(),
          name,
          price,
          unitCost: cost,
          stock: Math.round(stock),
          weeklySales: parseNum(get("weeklySales")) ?? 0,
          leadTimeDays: Math.round(parseNum(get("leadTimeDays")) ?? 14),
        },
      },
    };
  }

  if (type === "expenses") {
    const label = get("label");
    const amount = parseNum(get("amount"));
    if (!label) return { event: null, error: "missing label" };
    if (amount === null) return { event: null, error: "invalid amount" };
    const date = get("date") ? parseDate(get("date")) : now;
    return {
      error: null,
      event: {
        type: "expense_recorded",
        ts: date ?? now,
        payload: { expenseId: crypto.randomUUID(), label, amount, date: date ?? now },
      },
    };
  }

  // invoices
  const customer = get("customer");
  const amount = parseNum(get("amount"));
  if (!customer) return { event: null, error: "missing customer" };
  if (amount === null) return { event: null, error: "invalid amount" };
  const issued = get("issuedAt") ? parseDate(get("issuedAt")) : now;
  const invoiceId = crypto.randomUUID();
  const built: BuiltRow = {
    error: null,
    event: {
      type: "invoice_issued",
      ts: issued ?? now,
      payload: {
        invoiceId,
        customer,
        amount,
        issuedAt: issued ?? now,
        dueDays: Math.round(parseNum(get("dueDays")) ?? 14),
      },
    },
  };
  const paid = get("paidDate") ? parseDate(get("paidDate")) : null;
  if (paid) built.extra = { type: "invoice_paid", ts: paid, payload: { invoiceId, paidAt: paid } };
  return built;
}
