/**
 * Import — the CSV import center (Wave 6; ZPL-040 §12). Paste or upload a CSV,
 * ZYVORA auto-maps the columns, shows a dry-run preview with row-level errors,
 * and only writes to Business Memory when you confirm. Imported rows become the
 * same fact events the app already uses — no second source of truth.
 */
import { useMemo, useState } from "react";
import {
  autoMap,
  buildRow,
  parseCsv,
  SPECS,
  type ImportType,
} from "../core/csv";
import type { MemoryStore } from "../core/memory";
import type { WorkspaceState } from "../core/types";
import { formatMoney } from "../core/engine";
import { connectNaturaloeStore, type StoreConnectResult } from "../core/storeConnect";
import { PageHeader } from "./PageHeader";
import { toast } from "./toast";

/**
 * Bank reconciliation (QuickBooks' core loop, ZYVORA-style): paste a bank
 * statement CSV; incoming amounts are matched to your open invoices (exact
 * amount → suggest "mark paid"), outgoing lines can be recorded as expenses.
 * Nothing is written until you click a suggestion — the statement itself is
 * never stored.
 */
function BankReconcile({ memory, state }: { memory: MemoryStore; state: WorkspaceState }) {
  const [raw, setRaw] = useState("");
  const [openPanel, setOpenPanel] = useState(false);
  const [handled, setHandled] = useState<Set<number>>(() => new Set());

  const lines = useMemo(() => {
    if (!raw.trim()) return [];
    const p = parseCsv(raw);
    if (!p) return [];
    const lower = p.headers.map((h) => h.toLowerCase());
    const amountCol = lower.findIndex((h) => /amount|montant|value|credit|debit/.test(h));
    const labelCol = lower.findIndex((h) => /label|libell|desc|d[ée]signation|motif|narration/.test(h));
    const dateCol = lower.findIndex((h) => /date/.test(h));
    if (amountCol < 0) return [];
    return p.rows
      .map((cells, i) => ({
        i,
        amount: parseFloat(String(cells[amountCol] ?? "").replace(/[^\d.-]/g, "")),
        label: labelCol >= 0 ? String(cells[labelCol] ?? "") : `Line ${i + 1}`,
        date: dateCol >= 0 ? String(cells[dateCol] ?? "") : "",
      }))
      .filter((l) => isFinite(l.amount) && l.amount !== 0);
  }, [raw]);

  const openInvoices = state.invoices.filter((i) => !i.paidAt);
  const matchInvoice = (amount: number) =>
    amount > 0 ? openInvoices.find((i) => Math.abs(i.amount - amount) < 0.01) : undefined;

  return (
    <div className="card" style={{ marginTop: 14 }}>
      <p className="claim" style={{ fontSize: 16 }}>Reconcile a bank statement</p>
      <p className="reasoning">
        Paste your bank CSV (date, label, amount). Incoming amounts that exactly match an open invoice
        can be marked paid in one click; outgoing lines can be recorded as expenses. The statement itself
        is never stored — only the facts you confirm.
      </p>
      {!openPanel ? (
        <button className="btn subtle" onClick={() => setOpenPanel(true)}>Paste statement…</button>
      ) : (
        <>
          <textarea
            value={raw}
            onChange={(e) => setRaw(e.target.value)}
            placeholder={"date,label,amount\n2026-07-10,VIREMENT ATLAS RETAIL,3100\n2026-07-11,LOYER,-2500"}
            style={{ width: "100%", minHeight: 110, border: "1px solid var(--line)", borderRadius: 9, padding: 10, background: "var(--surface)" }}
            aria-label="Bank statement CSV"
          />
          {lines.length > 0 && (
            <div className="table-scroll" style={{ marginTop: 12 }}>
              <table className="records">
                <thead>
                  <tr><th>Line</th><th>Amount</th><th>Match</th><th>Action</th></tr>
                </thead>
                <tbody>
                  {lines.map((l) => {
                    const inv = matchInvoice(l.amount);
                    const done = handled.has(l.i);
                    return (
                      <tr key={l.i}>
                        <td className="muted">{l.date && `${l.date} · `}{l.label}</td>
                        <td>{formatMoney(l.amount)}</td>
                        <td>
                          {done ? <span className="tone success">Recorded</span>
                            : inv ? <span className="tone info">Invoice — {inv.customer}</span>
                            : l.amount < 0 ? <span className="tone attention">No match</span>
                            : <span className="muted">—</span>}
                        </td>
                        <td>
                          {!done && inv && (
                            <button
                              className="btn mini"
                              onClick={() => {
                                memory.append("fact", "invoice_paid", { invoiceId: inv.invoiceId, paidAt: Date.now() });
                                setHandled((prev) => new Set(prev).add(l.i));
                                toast(`${inv.customer}'s invoice matched & marked paid`);
                              }}
                            >
                              Mark invoice paid
                            </button>
                          )}
                          {!done && !inv && l.amount < 0 && (
                            <button
                              className="btn subtle mini"
                              onClick={() => {
                                memory.append("fact", "expense_recorded", {
                                  expenseId: crypto.randomUUID(),
                                  label: l.label || "Bank statement line",
                                  amount: Math.abs(l.amount),
                                  date: Date.now(),
                                });
                                setHandled((prev) => new Set(prev).add(l.i));
                                toast(`Expense recorded — ${l.label}`);
                              }}
                            >
                              Record as expense
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
    </div>
  );
}

function StoreConnect({ memory }: { memory: MemoryStore }) {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<StoreConnectResult | null>(null);

  const connect = async (preferCatalog: boolean) => {
    setBusy(true);
    setResult(null);
    try {
      const r = await connectNaturaloeStore(memory, { preferCatalog });
      setResult(r);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="card" style={{ borderColor: "var(--accent)" }}>
      <p className="claim" style={{ fontSize: 16 }}>Connect your Naturaloe store</p>
      <p className="reasoning">
        Bring your real Forever product catalog into ZYVORA in one click. If a store
        database is connected, ZYVORA reads your live sell prices <em>and</em> your
        Forever buy prices; otherwise it loads your product names and sell prices from
        the built-in catalog and you add the Forever costs in Inventory.
      </p>
      <div className="form-row">
        <button className="btn" disabled={busy} onClick={() => connect(false)}>
          {busy ? "Connecting…" : "Connect Naturaloe store"}
        </button>
        <button className="btn subtle" disabled={busy} onClick={() => connect(true)}>
          Load catalog only (72 products)
        </button>
      </div>
      {result && (
        <div className="card" style={{ marginTop: 12, marginBottom: 0 }}>
          <p className="claim" style={{ fontSize: 15, margin: 0 }}>
            Imported {result.imported} products{" "}
            {result.source === "store-database" ? "live from your store database" : "from the built-in catalog"}.
          </p>
          <p className="confidence-note" style={{ marginTop: 6 }}>{result.note}</p>
        </div>
      )}
    </div>
  );
}

export function ImportView({ memory, state }: { memory: MemoryStore; state?: WorkspaceState }) {
  const [type, setType] = useState<ImportType>("products");
  const [raw, setRaw] = useState("");
  const [map, setMap] = useState<Record<string, number>>({});
  const [done, setDone] = useState<string | null>(null);

  const parsed = useMemo(() => (raw.trim() ? parseCsv(raw) : null), [raw]);

  // Auto-map whenever a new CSV or type is loaded.
  const applyAuto = (t: ImportType, headers: string[]) => setMap(autoMap(t, headers));

  const onText = (text: string) => {
    setRaw(text);
    setDone(null);
    const p = text.trim() ? parseCsv(text) : null;
    if (p) applyAuto(type, p.headers);
  };

  const onType = (t: ImportType) => {
    setType(t);
    setDone(null);
    if (parsed) applyAuto(t, parsed.headers);
  };

  const built = useMemo(() => {
    if (!parsed) return null;
    const rows = parsed.rows.map((cells) => buildRow(type, map, cells));
    return {
      valid: rows.filter((r) => r.event),
      errors: rows.map((r, i) => ({ i, error: r.error })).filter((r) => r.error),
    };
  }, [parsed, map, type]);

  const doImport = () => {
    if (!built) return;
    let n = 0;
    for (const r of built.valid) {
      if (!r.event) continue;
      memory.append("fact", r.event.type, r.event.payload, r.event.ts);
      if (r.extra) memory.append("fact", r.extra.type, r.extra.payload, r.extra.ts);
      n++;
    }
    setDone(`Imported ${n} ${SPECS[type].label.toLowerCase()} into Business Memory.`);
    setRaw("");
    setMap({});
  };

  const spec = SPECS[type];

  return (
    <div>
      <PageHeader
        title="Import"
        description="Bring your existing data in — from your Naturaloe store in one click, or from a spreadsheet. Nothing is written until you confirm."
      />

      <StoreConnect memory={memory} />
      {state && <BankReconcile memory={memory} state={state} />}

      <h2 style={{ marginTop: 30 }}>Or import a CSV</h2>
      <h2>1 · What are you importing?</h2>
      <div className="form-row">
        {(Object.keys(SPECS) as ImportType[]).map((t) => (
          <button key={t} className={`btn ${type === t ? "" : "subtle"}`} onClick={() => onType(t)} aria-pressed={type === t}>
            {SPECS[t].label}
          </button>
        ))}
      </div>
      <p className="confidence-note" style={{ marginTop: 0 }}>
        Expected columns: {spec.fields.map((f) => f.label + (f.required ? "*" : "")).join(", ")} &nbsp;(* required)
      </p>

      <h2>2 · Paste or upload CSV</h2>
      <div className="form-row">
        <label htmlFor="csv-import-file">Upload a CSV file</label>
        <input
          id="csv-import-file"
          type="file"
          accept=".csv,text/csv"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            file.text().then(onText);
          }}
        />
      </div>
      <label className="sr-only" htmlFor="csv-import-paste">Paste CSV data</label>
      <textarea
        id="csv-import-paste"
        value={raw}
        onChange={(e) => onText(e.target.value)}
        placeholder={`name,price,cost,stock\nAloe Vera Gel,120,70,40\nForever Bee Honey,95,55,25`}
        style={{ width: "100%", minHeight: 120, border: "1px solid var(--line)", borderRadius: 8, padding: 10, fontFamily: "monospace", fontSize: 13 }}
      />

      {parsed && (
        <>
          <h2>3 · Check the column mapping</h2>
          <div className="table-scroll" role="region" aria-label="CSV column mapping" tabIndex={0}>
            <table className="records">
              <thead><tr><th>ZYVORA field</th><th>Your column</th></tr></thead>
              <tbody>
                {spec.fields.map((f) => (
                  <tr key={f.key}>
                    <td>{f.label}{f.required && " *"}</td>
                    <td>
                      <select aria-label={`Your column for ${f.label}`} value={map[f.key] ?? -1} onChange={(e) => setMap({ ...map, [f.key]: parseInt(e.target.value, 10) })}>
                        <option value={-1}>— not mapped —</option>
                        {parsed.headers.map((h, i) => (
                          <option key={i} value={i}>{h}</option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <h2>4 · Preview</h2>
          {built && (
            <>
              <p className="confidence-note" style={{ marginTop: 0 }}>
                {parsed.rows.length} rows read · <strong>{built.valid.length} ready to import</strong>
                {built.errors.length > 0 && ` · ${built.errors.length} skipped (see below)`}
              </p>
              {built.errors.length > 0 && (
                <details className="layers">
                  <summary>{built.errors.length} rows will be skipped</summary>
                  <table className="evidence-table">
                    <tbody>
                      {built.errors.slice(0, 20).map((e) => (
                        <tr key={e.i}><td>Row {e.i + 2}</td><td>{e.error}</td></tr>
                      ))}
                    </tbody>
                  </table>
                </details>
              )}
              <div style={{ marginTop: 12 }}>
                <button className="btn" onClick={doImport} disabled={built.valid.length === 0}>
                  Import {built.valid.length} {spec.label.toLowerCase()}
                </button>
              </div>
            </>
          )}
        </>
      )}

      {done && <div className="card" style={{ marginTop: 16 }}><p className="claim" style={{ fontSize: 15, margin: 0 }}>{done}</p></div>}
    </div>
  );
}
