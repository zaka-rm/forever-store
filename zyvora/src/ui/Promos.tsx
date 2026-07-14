/**
 * Promos — the discount engine surface (Wave 1 completion; ZPL-040 §8, ZPL-041 §4).
 * The question this Domain answers: "Which offer should I run, and is it still
 * profitable and within its limits?" Codes are created and deactivated as events
 * (append-only — no deletes, ADR-0002); usage is server-counted from orders.
 * The minimum-margin guard lives in the order form, where the discount meets cost.
 */
import { useState } from "react";
import { formatMoney } from "../core/engine";
import { getActiveCurrency } from "../core/format";
import type { MemoryStore } from "../core/memory";
import type { PromoType, WorkspaceState } from "../core/types";

const DAY = 24 * 60 * 60 * 1000;

export function PromosView({ state, memory }: { state: WorkspaceState; memory: MemoryStore }) {
  const ccy = getActiveCurrency();
  const [code, setCode] = useState("");
  const [type, setType] = useState<PromoType>("percentage");
  const [value, setValue] = useState("");
  const [minBasket, setMinBasket] = useState("0");
  const [maxDiscount, setMaxDiscount] = useState("");
  const [usageLimit, setUsageLimit] = useState("");
  const [expiresInDays, setExpiresInDays] = useState("");
  const [error, setError] = useState<string | null>(null);

  const create = () => {
    const c = code.trim().toUpperCase();
    const v = parseFloat(value);
    if (!c) return setError("Enter a code.");
    if (!isFinite(v) || v <= 0) return setError("Enter a discount value greater than zero.");
    if (type === "percentage" && v > 100) return setError("A percentage discount cannot exceed 100%.");
    if (state.promos.some((p) => p.active && p.code === c))
      return setError(`An active promo "${c}" already exists.`);

    const max = parseFloat(maxDiscount);
    const limit = parseInt(usageLimit, 10);
    const days = parseInt(expiresInDays, 10);
    memory.append("fact", "promo_created", {
      promoId: crypto.randomUUID(),
      code: c,
      type,
      value: v,
      minBasket: parseFloat(minBasket) || 0,
      ...(isFinite(max) && max > 0 ? { maxDiscount: max } : {}),
      ...(isFinite(limit) && limit > 0 ? { usageLimit: limit } : {}),
      ...(isFinite(days) && days > 0 ? { expiresAt: Date.now() + days * DAY } : {}),
      createdAt: Date.now(),
    });
    setCode(""); setValue(""); setMinBasket("0"); setMaxDiscount(""); setUsageLimit(""); setExpiresInDays("");
    setError(null);
  };

  const deactivate = (promoId: string, promoCode: string) => {
    if (!confirm(`Deactivate promo "${promoCode}"? It will stop applying to new orders. Past orders keep it.`)) return;
    memory.append("fact", "promo_deactivated", { promoId, at: Date.now() });
  };

  const now = Date.now();
  const discountGiven = (promoCode: string) =>
    state.orders
      .filter((o) => o.promoCode === promoCode && o.status !== "cancelled")
      .reduce((s, o) => s + o.discount, 0);

  return (
    <div>
      <h1>Promos</h1>
      <p className="subtitle">
        The question this Domain answers: “Which offer should I run, and is it still
        profitable and within its limits?” The order form blocks any discount that
        would push an order below your minimum margin.
      </p>

      <h2>New promo</h2>
      <div className="form-row">
        <div>
          <label>Code</label>
          <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="WELCOME10" style={{ width: 130 }} />
        </div>
        <div>
          <label>Type</label>
          <select value={type} onChange={(e) => setType(e.target.value as PromoType)}>
            <option value="percentage">Percentage</option>
            <option value="fixed">Fixed amount</option>
          </select>
        </div>
        <div>
          <label>{type === "percentage" ? "Percent (%)" : `Amount (${ccy})`}</label>
          <input value={value} onChange={(e) => setValue(e.target.value)} inputMode="decimal" style={{ width: 90 }} />
        </div>
        <div>
          <label>Min basket ({ccy})</label>
          <input value={minBasket} onChange={(e) => setMinBasket(e.target.value)} inputMode="decimal" style={{ width: 100 }} />
        </div>
        {type === "percentage" && (
          <div>
            <label>Max discount ({ccy})</label>
            <input value={maxDiscount} onChange={(e) => setMaxDiscount(e.target.value)} inputMode="decimal" placeholder="none" style={{ width: 100 }} />
          </div>
        )}
        <div>
          <label>Usage limit</label>
          <input value={usageLimit} onChange={(e) => setUsageLimit(e.target.value)} inputMode="numeric" placeholder="∞" style={{ width: 80 }} />
        </div>
        <div>
          <label>Expires (days)</label>
          <input value={expiresInDays} onChange={(e) => setExpiresInDays(e.target.value)} inputMode="numeric" placeholder="never" style={{ width: 90 }} />
        </div>
        <button className="btn" onClick={create}>Create promo</button>
      </div>
      {error && <p className="confidence-note" style={{ color: "var(--amber)" }}>{error}</p>}

      <h2>Promos</h2>
      {state.promos.length === 0 ? (
        <div className="quiet">No promos yet. Create one above, then apply its code in the order form.</div>
      ) : (
        <table className="records">
          <thead>
            <tr><th>Code</th><th>Offer</th><th>Conditions</th><th>Used</th><th>Given</th><th>Status</th><th></th></tr>
          </thead>
          <tbody>
            {state.promos.map((p) => {
              const expired = p.expiresAt !== undefined && now > p.expiresAt;
              const maxed = p.usageLimit !== undefined && p.timesUsed >= p.usageLimit;
              return (
                <tr key={p.promoId}>
                  <td><strong>{p.code}</strong></td>
                  <td>
                    {p.type === "percentage"
                      ? `${p.value}% off${p.maxDiscount ? ` (max ${formatMoney(p.maxDiscount)})` : ""}`
                      : `${formatMoney(p.value)} off`}
                  </td>
                  <td className="muted">
                    {p.minBasket > 0 ? `min ${formatMoney(p.minBasket)}` : "no minimum"}
                    {p.expiresAt ? ` · ${expired ? "expired" : `expires ${new Date(p.expiresAt).toLocaleDateString()}`}` : ""}
                  </td>
                  <td className="muted">{p.usageLimit ? `${p.timesUsed} / ${p.usageLimit}` : p.timesUsed}</td>
                  <td>{formatMoney(discountGiven(p.code))}</td>
                  <td>
                    {!p.active ? <span className="muted">Deactivated</span>
                      : expired ? <span className="muted">Expired</span>
                      : maxed ? <span className="muted">Limit reached</span>
                      : "Active"}
                  </td>
                  <td>
                    {p.active && (
                      <button className="link-btn" onClick={() => deactivate(p.promoId, p.code)}>Deactivate</button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
