/**
 * Today — the decision surface and front door.
 * Implements the screen information hierarchy (CODEX 00 D.7):
 *  1. what needs judgment now (rare by design)
 *  2. what changed worth understanding
 *  3. state of things (context on demand)
 *  4. records live in the Domain views, never ambient here.
 * The wall-of-widgets dashboard is constitutionally banned as a front door.
 */
import { useState } from "react";
import { coachFor, pendingOutcomeReviews, type DecisionMemory } from "../core/coach";
import { BAND_TONE, businessHealth, type HealthScore } from "../core/health";
import { formatMoney, stateOfThings } from "../core/engine";
import type { MemoryStore } from "../core/memory";
import type { Insight, WorkspaceState } from "../core/types";
import { InsightCard } from "./InsightCard";
import { toast } from "./toast";

interface Props {
  workspaceName: string;
  state: WorkspaceState;
  insights: Insight[];
  onDecide: (insight: Insight, optionId: string, optionLabel: string, rationale: string) => void;
  memory?: MemoryStore;
}

/** Close the loop: judge a past decision so future-you (and the coach) can learn. */
function OutcomeReview({ d, memory }: { d: DecisionMemory; memory: MemoryStore }) {
  const [note, setNote] = useState("");
  const daysAgo = Math.round((Date.now() - d.ts) / 86_400_000);
  const record = (result: "good" | "mixed" | "bad") => {
    memory.append("outcome", "outcome_recorded", {
      decisionEventId: d.eventId,
      decisionKey: d.decisionKey,
      result,
      note: note.trim(),
    });
    toast("Outcome recorded — the coach just got wiser");
  };
  return (
    <div className="card insight">
      <div className="badge-row">
        <span className="badge domain">close the loop</span>
        <span className="confidence-dots"><span>{daysAgo} days ago</span></span>
      </div>
      <p className="claim" style={{ fontSize: 15 }}>
        You decided “{d.optionLabel}” on: {d.claim}
      </p>
      <p className="reasoning">How did it turn out? Recording this teaches the coach what worked for YOUR business.</p>
      <div className="form-row" style={{ marginBottom: 8 }}>
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Optional note — what happened…"
          style={{ flex: 1, minWidth: 200 }}
          aria-label="Outcome note"
        />
      </div>
      <div className="row-actions">
        <button className="btn mini" onClick={() => record("good")}>Went well</button>
        <button className="btn subtle mini" onClick={() => record("mixed")}>Mixed</button>
        <button className="btn mini danger" onClick={() => record("bad")}>Went badly</button>
      </div>
    </div>
  );
}

const MAX_SURFACED = 3; // few and ranked (Law X)

/** A greeting that knows the hour — the feel of opening a well-kept ledger. */
function greeting(now = new Date()): string {
  const h = now.getHours();
  if (h < 5) return "Working late";
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

const DATE_FMT = new Intl.DateTimeFormat(undefined, {
  weekday: "long", day: "numeric", month: "long",
});

/** Business health — one explainable 0–100 heartbeat; each component clicks open to its reason. */
function HealthStrip({ health }: { health: HealthScore }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="card interactive" style={{ marginBottom: 20 }}>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        style={{ display: "flex", alignItems: "center", gap: 16, width: "100%", background: "none", border: "none", textAlign: "left", padding: 0, cursor: "pointer" }}
      >
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", minWidth: 62 }}>
          <span style={{ fontSize: 30, fontWeight: 720, letterSpacing: "-0.02em", lineHeight: 1 }}>{health.score}</span>
          <span className={`tone ${BAND_TONE[health.band]}`} style={{ marginTop: 4 }}>{health.band}</span>
        </div>
        <div style={{ flex: 1 }}>
          <p className="claim" style={{ fontSize: 15, margin: 0 }}>Business health</p>
          <p className="reasoning" style={{ margin: "2px 0 0" }}>
            Weakest right now: <strong>{health.components[0].label}</strong> ({health.components[0].score}). {open ? "Hide the breakdown." : "See the full breakdown."}
          </p>
        </div>
      </button>
      {open && (
        <table className="evidence-table" style={{ marginTop: 12 }}>
          <tbody>
            {health.components.map((c) => (
              <tr key={c.key}>
                <td style={{ width: "34%" }}>
                  <span className={`tone ${c.score >= 70 ? "success" : c.score >= 45 ? "attention" : "critical"}`}>{c.label} · {c.score}</span>
                </td>
                <td>{c.detail}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export function Today({ workspaceName, state, insights, onDecide, memory }: Props) {
  const needsJudgment = insights.filter((i) => i.guidance);
  const worthKnowing = insights.filter((i) => !i.guidance);
  const surfaced = needsJudgment.slice(0, MAX_SURFACED);
  const waiting = needsJudgment.slice(MAX_SURFACED);
  const s = stateOfThings(state);
  const events = memory?.all() ?? [];
  const reviews = memory ? pendingOutcomeReviews(events) : [];
  const health = businessHealth(state);
  const empty =
    state.invoices.length === 0 &&
    state.products.length === 0 &&
    state.expenses.length === 0 &&
    state.orders.length === 0;

  return (
    <div>
      <div className="hero">
        <p className="eyebrow">{DATE_FMT.format(new Date())} · {workspaceName}</p>
        <h1>{greeting()}.</h1>
        <p className="headline">
          {surfaced.length === 0
            ? "Nothing needs your judgment right now. That is the system working, not failing."
            : <>
                <strong>{surfaced.length}</strong> decision{surfaced.length > 1 ? "s" : ""} worth
                your judgment today. Everything else can wait.
              </>}
        </p>
        <span className={`seal${surfaced.length > 0 ? " attention" : ""}`}>
          {surfaced.length === 0 ? "All clear" : "Judgment requested"}
        </span>
      </div>

      {!empty && health.ready && <HealthStrip health={health} />}

      {empty && (
        <div className="quiet">
          <p style={{ margin: 0 }}>
            Your Workspace is empty. Add invoices, expenses, or products in the
            Domain views on the left — or use “Load demo business” below the
            navigation to explore with realistic data.
          </p>
        </div>
      )}

      {surfaced.length > 0 && (
        <>
          <h2>Needs your judgment</h2>
          {surfaced.map((i) => (
            <InsightCard
              key={i.id}
              insight={i}
              onDecide={onDecide}
              coach={memory ? coachFor(events, i.decisionKey) : null}
            />
          ))}
        </>
      )}

      {reviews.length > 0 && (
        <>
          <h2>Close the loop</h2>
          {reviews.map((d) => (
            <OutcomeReview key={d.eventId} d={d} memory={memory!} />
          ))}
        </>
      )}

      {waiting.length > 0 && (
        <details className="layers" style={{ marginBottom: 18 }}>
          <summary>
            {waiting.length} more item{waiting.length > 1 ? "s" : ""} ranked below —
            shown on request, not by interruption
          </summary>
          {waiting.map((i) => (
            <InsightCard key={i.id} insight={i} onDecide={onDecide} />
          ))}
        </details>
      )}

      {worthKnowing.length > 0 && (
        <>
          <h2>Worth understanding</h2>
          {worthKnowing.map((i) => (
            <InsightCard key={i.id} insight={i} />
          ))}
        </>
      )}

      {!empty && (
        <>
          <h2>State of things</h2>
          <div className="stats">
            <div className="stat">
              <div className="k">Cash available</div>
              <div className="v">{formatMoney(s.cash)}</div>
            </div>
            <div className="stat">
              <div className="k">Cash pending (COD)</div>
              <div className="v">{formatMoney(s.cashPendingCod)}</div>
            </div>
            <div className="stat">
              <div className="k">Revenue, last 30 days</div>
              <div className="v">{formatMoney(s.billedLast30)}</div>
            </div>
            <div className="stat">
              <div className="k">Open orders</div>
              <div className="v">{s.openOrders}</div>
            </div>
            <div className="stat">
              <div className="k">Open invoices</div>
              <div className="v">
                {s.openInvoices} · {formatMoney(s.openInvoiceValue)}
              </div>
            </div>
            <div className="stat">
              <div className="k">Stock value (at cost)</div>
              <div className="v">{formatMoney(s.stockValue)}</div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
