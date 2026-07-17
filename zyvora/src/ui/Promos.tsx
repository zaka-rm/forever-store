/**
 * Promos — the discount engine surface (Wave 1 completion; ZPL-040 §8, ZPL-041 §4).
 * Codes are created and deactivated as append-only events; usage is server-counted
 * from orders. The minimum-margin guard lives where the discount meets cost.
 */
import { useState } from "react";
import { formatMoney } from "../core/engine";
import { getActiveCurrency } from "../core/format";
import type { MemoryStore } from "../core/memory";
import type { PromoType, WorkspaceState } from "../core/types";
import { appConfirm } from "./dialog";
import { PageHeader } from "./PageHeader";
import { toast } from "./toast";

const DAY = 24 * 60 * 60 * 1000;

type PromoStatus = "active" | "expired" | "limit" | "deactivated";
type PromoFilter = "all" | PromoStatus;

const PROMO_FILTERS: Array<{ id: PromoFilter; label: string }> = [
  { id: "all", label: "All" },
  { id: "active", label: "Active" },
  { id: "expired", label: "Expired" },
  { id: "limit", label: "Limit reached" },
  { id: "deactivated", label: "Deactivated" },
];

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
  const [creating, setCreating] = useState(false);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<PromoFilter>("all");

  const create = () => {
    const c = code.trim().toUpperCase();
    const v = parseFloat(value);
    if (!c) return setError("Enter a code.");
    if (!isFinite(v) || v <= 0) return setError("Enter a discount value greater than zero.");
    if (type === "percentage" && v > 100) return setError("A percentage discount cannot exceed 100%.");
    if (state.promos.some((promo) => promo.active && promo.code === c))
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
    setCode("");
    setValue("");
    setMinBasket("0");
    setMaxDiscount("");
    setUsageLimit("");
    setExpiresInDays("");
    setError(null);
    setCreating(false);
  };

  const deactivate = async (promoId: string, promoCode: string) => {
    const ok = await appConfirm({
      title: `Deactivate promo "${promoCode}"?`,
      body: "It stops applying to new orders. Past orders keep it — nothing is rewritten.",
      confirmLabel: "Deactivate",
      danger: true,
    });
    if (!ok) return;
    memory.append("fact", "promo_deactivated", { promoId, at: Date.now() });
    toast(`Promo "${promoCode}" deactivated`);
  };

  const now = Date.now();
  const discountGiven = (promoCode: string) =>
    state.orders
      .filter((order) => order.promoCode === promoCode && order.status !== "cancelled")
      .reduce((sum, order) => sum + order.discount, 0);

  const promoStatus = (promo: WorkspaceState["promos"][number]): PromoStatus => {
    if (!promo.active) return "deactivated";
    if (promo.expiresAt !== undefined && now > promo.expiresAt) return "expired";
    if (promo.usageLimit !== undefined && promo.timesUsed >= promo.usageLimit) return "limit";
    return "active";
  };

  const statusLabel: Record<PromoStatus, string> = {
    active: "Active",
    expired: "Expired",
    limit: "Limit reached",
    deactivated: "Deactivated",
  };

  const statusTone: Record<PromoStatus, "success" | "info" | "attention"> = {
    active: "success",
    expired: "attention",
    limit: "attention",
    deactivated: "info",
  };

  const normalizedQuery = query.trim().toLowerCase();
  const visiblePromos = state.promos.filter((promo) => {
    const status = promoStatus(promo);
    const matchesFilter = filter === "all" || status === filter;
    const matchesQuery =
      !normalizedQuery ||
      promo.code.toLowerCase().includes(normalizedQuery) ||
      promo.type.toLowerCase().includes(normalizedQuery);
    return matchesFilter && matchesQuery;
  });

  return (
    <div>
      <PageHeader
        title="Promos"
        description="Create focused offers, see how much each one has given, and keep every discount within its limits."
        actions={(
          <button
            className="btn"
            type="button"
            aria-expanded={creating}
            aria-controls="new-promo-form"
            onClick={() => {
              setCreating((open) => !open);
              setError(null);
            }}
          >
            {creating ? "Close" : "Create promo"}
          </button>
        )}
      />

      {creating && (
        <section id="new-promo-form" className="card form-card" aria-labelledby="new-promo-title">
          <div className="section-heading">
            <div>
              <h2 id="new-promo-title">Create promo</h2>
              <p>Set the offer and its guardrails. The order form still protects your minimum margin.</p>
            </div>
          </div>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              create();
            }}
          >
            <div className="form-row">
              <div>
                <label htmlFor="promo-code">Code</label>
                <input
                  id="promo-code"
                  value={code}
                  onChange={(event) => setCode(event.target.value.toUpperCase())}
                  placeholder="WELCOME10"
                  autoComplete="off"
                  style={{ width: 140 }}
                />
              </div>
              <div>
                <label htmlFor="promo-type">Type</label>
                <select id="promo-type" value={type} onChange={(event) => setType(event.target.value as PromoType)}>
                  <option value="percentage">Percentage</option>
                  <option value="fixed">Fixed amount</option>
                </select>
              </div>
              <div>
                <label htmlFor="promo-value">{type === "percentage" ? "Percent (%)" : `Amount (${ccy})`}</label>
                <input
                  id="promo-value"
                  value={value}
                  onChange={(event) => setValue(event.target.value)}
                  inputMode="decimal"
                  style={{ width: 100 }}
                />
              </div>
              <div>
                <label htmlFor="promo-min-basket">Minimum basket ({ccy})</label>
                <input
                  id="promo-min-basket"
                  value={minBasket}
                  onChange={(event) => setMinBasket(event.target.value)}
                  inputMode="decimal"
                  style={{ width: 120 }}
                />
              </div>
              {type === "percentage" && (
                <div>
                  <label htmlFor="promo-max-discount">Maximum discount ({ccy})</label>
                  <input
                    id="promo-max-discount"
                    value={maxDiscount}
                    onChange={(event) => setMaxDiscount(event.target.value)}
                    inputMode="decimal"
                    placeholder="No maximum"
                    style={{ width: 130 }}
                  />
                </div>
              )}
              <div>
                <label htmlFor="promo-usage-limit">Usage limit</label>
                <input
                  id="promo-usage-limit"
                  value={usageLimit}
                  onChange={(event) => setUsageLimit(event.target.value)}
                  inputMode="numeric"
                  placeholder="Unlimited"
                  style={{ width: 110 }}
                />
              </div>
              <div>
                <label htmlFor="promo-expiry">Expires after</label>
                <input
                  id="promo-expiry"
                  value={expiresInDays}
                  onChange={(event) => setExpiresInDays(event.target.value)}
                  inputMode="numeric"
                  placeholder="Never"
                  aria-describedby="promo-expiry-hint"
                  style={{ width: 100 }}
                />
                <span id="promo-expiry-hint" className="muted">Days</span>
              </div>
              <button className="btn" type="submit">Create promo</button>
            </div>
            {error && (
              <p className="confidence-note" role="alert" style={{ color: "var(--amber)" }}>
                {error}
              </p>
            )}
          </form>
        </section>
      )}

      <section aria-labelledby="promo-list-title">
        <div className="section-heading">
          <div>
            <h2 id="promo-list-title">Discount codes</h2>
            <p>Review availability, redemptions, and the total discount given.</p>
          </div>
        </div>

        {state.promos.length === 0 ? (
          <div className="quiet">No promos yet. Create one, then apply its code in the order form.</div>
        ) : (
          <>
            <div className="index-toolbar">
              <div className="segmented" role="group" aria-label="Filter promos by status">
                {PROMO_FILTERS.map((option) => {
                  const count = option.id === "all"
                    ? state.promos.length
                    : state.promos.filter((promo) => promoStatus(promo) === option.id).length;
                  return (
                    <button
                      key={option.id}
                      type="button"
                      className={filter === option.id ? "active" : ""}
                      aria-pressed={filter === option.id}
                      onClick={() => setFilter(option.id)}
                    >
                      {option.label}{count > 0 && ` ${count}`}
                    </button>
                  );
                })}
              </div>
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search promo codes…"
                aria-label="Search promo codes"
              />
            </div>

            {visiblePromos.length === 0 ? (
              <div className="quiet">
                No promos match{normalizedQuery ? ` “${query.trim()}”` : ""} in this view.
              </div>
            ) : (
              <div className="table-scroll" role="region" aria-label="Promo codes table" tabIndex={0}>
                <table className="records">
                  <thead>
                    <tr><th>Code</th><th>Offer</th><th>Conditions</th><th>Used</th><th>Given</th><th>Status</th><th>Actions</th></tr>
                  </thead>
                  <tbody>
                    {visiblePromos.map((promo) => {
                      const status = promoStatus(promo);
                      return (
                        <tr key={promo.promoId}>
                          <td><strong>{promo.code}</strong></td>
                          <td>
                            {promo.type === "percentage"
                              ? `${promo.value}% off${promo.maxDiscount ? ` (max ${formatMoney(promo.maxDiscount)})` : ""}`
                              : `${formatMoney(promo.value)} off`}
                          </td>
                          <td className="muted">
                            {promo.minBasket > 0 ? `Minimum ${formatMoney(promo.minBasket)}` : "No minimum"}
                            {promo.expiresAt
                              ? ` · ${status === "expired" ? "Expired" : `Expires ${new Date(promo.expiresAt).toLocaleDateString()}`}`
                              : ""}
                          </td>
                          <td className="muted">
                            {promo.usageLimit ? `${promo.timesUsed} / ${promo.usageLimit}` : promo.timesUsed}
                          </td>
                          <td>{formatMoney(discountGiven(promo.code))}</td>
                          <td><span className={`tone ${statusTone[status]}`}>{statusLabel[status]}</span></td>
                          <td>
                            {promo.active && (
                              <button className="link-btn" type="button" onClick={() => deactivate(promo.promoId, promo.code)}>
                                Deactivate
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}
