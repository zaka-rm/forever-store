/**
 * Today — the decision surface and front door.
 * Implements the screen information hierarchy (CODEX 00 D.7):
 *  1. what needs judgment now (rare by design)
 *  2. what changed worth understanding
 *  3. state of things (context on demand)
 *  4. records live in the Domain views, never ambient here.
 * The wall-of-widgets dashboard is constitutionally banned as a front door.
 */
import { formatMoney, stateOfThings } from "../core/engine";
import type { Insight, WorkspaceState } from "../core/types";
import { InsightCard } from "./InsightCard";

interface Props {
  workspaceName: string;
  state: WorkspaceState;
  insights: Insight[];
  onDecide: (insight: Insight, optionId: string, optionLabel: string, rationale: string) => void;
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

export function Today({ workspaceName, state, insights, onDecide }: Props) {
  const needsJudgment = insights.filter((i) => i.guidance);
  const worthKnowing = insights.filter((i) => !i.guidance);
  const surfaced = needsJudgment.slice(0, MAX_SURFACED);
  const waiting = needsJudgment.slice(MAX_SURFACED);
  const s = stateOfThings(state);
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
            <InsightCard key={i.id} insight={i} onDecide={onDecide} />
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
