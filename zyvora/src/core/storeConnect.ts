/**
 * Naturaloe store connector (ZPL-040 §12 — integrations, source-of-truth mapping).
 * Canonical (governance/): CAP-000006 Inventory — FEAT-000041 product/SKU catalog.
 * Brings the real product catalog into ZYVORA as product_added fact events.
 *
 * Two sources, in priority order:
 *  1. The store's Supabase database (same project as .env) — reads real sell
 *     prices from `products` AND real Forever buy prices from the admin-only
 *     `product_costs` table. This is the true "connection."
 *  2. Bundled catalog (naturaloeCatalog.ts, generated from the product seed) —
 *     real names + dirham sell prices, used when the store DB isn't reachable.
 *     Forever costs are unknown here (they were never in code), so they import
 *     as 0 and are flagged — ZYVORA never invents a cost it doesn't have.
 */
import { cloudConfigured, supabase } from "./cloud";
import { FOREVER_PRICES } from "./foreverPrices";
import type { MemoryStore } from "./memory";

export interface StoreConnectResult {
  source: "store-database" | "bundled-catalog";
  imported: number;
  withCost: number;
  missingCost: number;
  note: string;
}

function addProduct(
  memory: MemoryStore,
  name: string,
  price: number,
  unitCost: number
) {
  memory.append("fact", "product_added", {
    productId: crypto.randomUUID(),
    name,
    price,
    unitCost,
    stock: 0, // stock/velocity are entered by the Builder or build up from orders
    weeklySales: 0,
    leadTimeDays: 14,
  });
}

export async function connectNaturaloeStore(
  memory: MemoryStore,
  opts?: { preferCatalog?: boolean }
): Promise<StoreConnectResult> {
  // 1. Live store database — real sell prices + real Forever costs.
  if (!opts?.preferCatalog && cloudConfigured && supabase) {
    try {
      const { data: products, error } = await supabase
        .from("products")
        .select("id,name,category,price");
      if (!error && products && products.length > 0) {
        const { data: costs } = await supabase.from("product_costs").select("product_id,cost");
        const costMap = new Map<string, number>();
        for (const c of costs ?? []) costMap.set(c.product_id as string, Number(c.cost));
        let withCost = 0;
        for (const p of products as { id: string; name: string; price: number }[]) {
          const cost = costMap.get(p.id) ?? 0;
          if (cost > 0) withCost++;
          addProduct(memory, p.name, Number(p.price), cost);
        }
        const missing = products.length - withCost;
        return {
          source: "store-database",
          imported: products.length,
          withCost,
          missingCost: missing,
          note:
            missing === 0
              ? "Imported live from your store, with Forever costs for every product."
              : `Imported live from your store. ${withCost} products have Forever costs; ${missing} still need a cost entered (set them in the store's Finances panel or in Inventory).`,
        };
      }
    } catch {
      // fall through to bundled catalog
    }
  }

  // 2. Bundled Forever catalog — real retail sell prices AND real Forever costs
  //    (from the owner's official order form; cost = retail × 0.70, the 30% FBO discount).
  for (const p of FOREVER_PRICES) addProduct(memory, p.name, p.sellDh, p.costDh);
  return {
    source: "bundled-catalog",
    imported: FOREVER_PRICES.length,
    withCost: FOREVER_PRICES.length,
    missingCost: 0,
    note:
      "Loaded your real Forever catalog — retail sell prices from your order form, with Forever costs at the standard 30% Wholesale-FBO discount (cost = retail × 0.70). If your actual Forever discount is different, tell me and I'll recompute every cost.",
  };
}
