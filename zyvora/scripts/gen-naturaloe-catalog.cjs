/**
 * Generates src/core/naturaloeCatalog.ts from the store's product seed.
 * Extracts id, name, category, and euro price → dirham (×10.8, per
 * supabase/99_convert-to-dirham.sql). Run: node scripts/gen-naturaloe-catalog.cjs
 */
const fs = require("fs");
const path = require("path");

const seedPath = path.join(__dirname, "..", "..", "supabase", "03_products-seed.sql");
const sql = fs.readFileSync(seedPath, "utf8");

// Isolate the VALUES block (between "values" and the trailing "on conflict").
const start = sql.indexOf("values");
const end = sql.indexOf("on conflict");
const block = sql.slice(start + "values".length, end === -1 ? undefined : end);

/** Split a parenthesised tuple's top-level fields, respecting '' escapes and ::casts. */
function parseTuple(s) {
  const fields = [];
  let i = 0, cur = "", inStr = false, depth = 0;
  while (i < s.length) {
    const c = s[i];
    if (inStr) {
      if (c === "'" && s[i + 1] === "'") { cur += "'"; i += 2; continue; }
      if (c === "'") { inStr = false; i++; continue; }
      cur += c; i++; continue;
    }
    if (c === "'") { inStr = true; i++; continue; }
    if (c === "(" || c === "[") depth++;
    if (c === ")" || c === "]") depth--;
    if (c === "," && depth === 0) { fields.push(cur.trim()); cur = ""; i++; continue; }
    cur += c; i++;
  }
  if (cur.trim() !== "") fields.push(cur.trim());
  return fields;
}

const products = [];
// Each row begins with "  ('pNN',". Split on the row opener.
const rows = block.split(/\n\s*\(/).map((r) => r.trim()).filter((r) => r.startsWith("'p"));
for (const row of rows) {
  // Trim trailing ")," or ")"
  const inner = row.replace(/\)\s*,?\s*$/, "");
  const f = parseTuple(inner);
  // columns: id, slug, name, name_ar, category, price, ...
  const id = f[0];
  const name = f[2];
  const category = f[4];
  const priceEuro = parseFloat(f[5]);
  if (!id || !name || !isFinite(priceEuro)) continue;
  products.push({ id, name, category, priceDh: Math.round(priceEuro * 10.8) });
}

const out =
  "/**\n" +
  " * Naturaloe product catalog — AUTO-GENERATED from supabase/03_products-seed.sql.\n" +
  " * Real product names and sell prices (converted to dirham). Forever COST prices\n" +
  " * are NOT here — they live in the store's admin-only `product_costs` table and\n" +
  " * are read live by storeConnect.ts when the store database is reachable.\n" +
  " * Regenerate: node scripts/gen-naturaloe-catalog.cjs\n" +
  " */\n" +
  "export interface CatalogProduct { id: string; name: string; category: string; priceDh: number; }\n\n" +
  "export const NATURALOE_CATALOG: CatalogProduct[] = " +
  JSON.stringify(products, null, 2) +
  ";\n";

const outPath = path.join(__dirname, "..", "src", "core", "naturaloeCatalog.ts");
fs.writeFileSync(outPath, out, "utf8");
console.log(`Wrote ${products.length} products to src/core/naturaloeCatalog.ts`);
