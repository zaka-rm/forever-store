/**
 * Business Memory view — the four streams, readable; decisions reviewable
 * with outcomes recorded against them (CODEX 00 D.8; CODEX 10 §5.1: process
 * and result presented separately, luck acknowledged).
 */
import { useState } from "react";
import { money } from "../core/format";
import type { MemoryStore } from "../core/memory";
import { projectDecisions } from "../core/projections";
import type { MemoryEvent } from "../core/types";

const when = (ts: number) =>
  new Date(ts).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });

function describe(e: MemoryEvent): string {
  const p = e.payload as Record<string, unknown>;
  switch (e.type) {
    case "invoice_issued":
      return `Invoice issued — ${p.customer}, ${money(Number(p.amount))}`;
    case "invoice_paid":
      return "Invoice paid";
    case "expense_recorded":
      return `Expense — ${p.label}, ${money(Number(p.amount))}`;
    case "product_added":
      return `Product added — ${p.name}`;
    case "stock_adjusted":
      return `Stock adjusted — ${Number(p.delta) > 0 ? "+" : ""}${p.delta}`;
    case "order_created": {
      const lines = p.lines as { qty: number; productName: string }[];
      return `Order created — ${p.customer}: ${lines.map((l) => `${l.qty}× ${l.productName}`).join(", ")}`;
    }
    case "order_status_changed":
      return `Order ${p.status}`;
    case "order_cash_received":
      return "COD cash received from courier";
    case "promo_created":
      return `Promo created — ${p.code}`;
    case "promo_deactivated":
      return "Promo deactivated";
    case "goal_set":
      return `Goal set — ${p.metric}: ${p.target}`;
    case "period_closed":
      return `Period closed — ${p.period} (books locked)`;
    case "customer_contact_updated":
      return `Contact updated — ${p.customer}`;
    case "customer_activity_logged":
      return `${p.dueAt ? "Follow-up scheduled" : "Activity logged"} — ${p.customer}: ${p.note}`;
    case "customer_activity_completed":
      return "Follow-up completed";
    case "purchase_order_created": {
      const lines = p.lines as { qty: number; productName: string }[];
      return `Purchase order — ${p.supplier}: ${lines.map((l) => `${l.qty}× ${l.productName}`).join(", ")}`;
    }
    case "goods_received":
      return "Goods received — stock raised";
    case "insight_presented":
      return `Insight — ${p.claim}`;
    case "decision_recorded":
      return `Decision — chose “${p.optionLabel}” on: ${p.claim}`;
    case "outcome_recorded":
      return `Outcome (${p.result}) — ${p.note || "no note"}`;
    default:
      return e.type;
  }
}

export function MemoryView({ memory }: { memory: MemoryStore }) {
  const [outcomeFor, setOutcomeFor] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [result, setResult] = useState<"good" | "mixed" | "bad">("good");

  const events = [...memory.all()].sort((a, b) => b.ts - a.ts);
  const decisions = projectDecisions(memory.all());

  return (
    <div>
      <h1>Business Memory</h1>
      <p className="subtitle">
        Permanent, append-only, and yours: facts, interpretations, decisions, and
        outcomes. Export it any time — it is your asset, never held hostage.
      </p>

      <h2>Decisions under review</h2>
      {decisions.length === 0 ? (
        <div className="quiet">
          Decisions you record from Today will appear here, with their reasoning —
          so future-you can judge the process, not just the result.
        </div>
      ) : (
        decisions.map((d) => (
          <div className="card" key={d.eventId}>
            <span className={`badge ${d.layer === "strategic" ? "strategic" : ""}`}>{d.layer}</span>
            <p className="claim" style={{ marginTop: 6 }}>{d.claim}</p>
            <p className="reasoning">
              <strong>You chose:</strong> {d.optionLabel}
              {d.rationale ? <> — <em>“{d.rationale}”</em></> : null}
              <span className="muted"> · {when(d.ts)}</span>
            </p>
            {!d.hasOutcome && outcomeFor !== d.eventId && (
              <button className="btn ghost" onClick={() => { setOutcomeFor(d.eventId); setNote(""); }}>
                Record what actually happened
              </button>
            )}
            {outcomeFor === d.eventId && (
              <div className="decide-box">
                <p className="hint">
                  A good decision can end badly and a bad one can get lucky — record the
                  result honestly; the reasoning above stays as it was.
                </p>
                <div className="form-row">
                  <select value={result} onChange={(e) => setResult(e.target.value as typeof result)}>
                    <option value="good">Worked out well</option>
                    <option value="mixed">Mixed</option>
                    <option value="bad">Didn't work out</option>
                  </select>
                </div>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="What happened, in a sentence or two…"
                />
                <div style={{ marginTop: 8, display: "flex", gap: 8 }}>
                  <button
                    className="btn"
                    onClick={() => {
                      memory.append("outcome", "outcome_recorded", {
                        decisionEventId: d.eventId,
                        decisionKey: d.decisionKey,
                        result,
                        note,
                      });
                      setOutcomeFor(null);
                    }}
                  >
                    Save outcome
                  </button>
                  <button className="btn subtle" onClick={() => setOutcomeFor(null)}>Cancel</button>
                </div>
              </div>
            )}
          </div>
        ))
      )}

      <h2>Timeline</h2>
      {events.length === 0 ? (
        <div className="quiet">Everything your business learns will accumulate here.</div>
      ) : (
        <ul className="timeline">
          {events.slice(0, 60).map((e) => (
            <li key={e.id}>
              <div className="when">{when(e.ts)}</div>
              <div className="what">
                <span className="stream-tag">{e.stream}</span>
                {describe(e)}
              </div>
            </li>
          ))}
        </ul>
      )}
      {events.length > 60 && (
        <p className="confidence-note">
          Showing the 60 most recent of {events.length} events — the full record is in the export.
        </p>
      )}
    </div>
  );
}

