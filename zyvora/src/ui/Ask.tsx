/**
 * Ask ZYVORA — the AI chat surface (ZPL-041 §12/§20). Answers from the
 * Workspace's own data via the deterministic assistant; every answer shows the
 * figures it used, and it admits when a question is out of scope. Permission-
 * aware by construction (single-owner today; reads only this Workspace).
 */
import { useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { askZyvora, businessContext, SUGGESTED_QUESTIONS, type Answer } from "../core/assistant";
import { askLlm, llmConfigured, llmModel, type ChatMessage } from "../core/llm";
import { restageInLang, stageAction, type DraftLang, type StagedMessage } from "../core/actions";
import { messagingConfigured, recordSentMessage, sendMessage } from "../core/messaging";
import { projectContacts, projectCustomerProfiles } from "../core/projections";
import type { MemoryStore } from "../core/memory";
import type { WorkspaceState } from "../core/types";
import { PageHeader } from "./PageHeader";
import { toast } from "./toast";
import { appConfirm } from "./dialog";
import { measureOperatorRun, prepareOperatorPlan, projectOperatorRuns, type OperatorPlan, type OperatorRun } from "../core/operator";
import { formatMoney } from "../core/engine";

interface Turn {
  id: string;
  question: string;
  answer: Answer;
  source?: "rules" | "ai" | "pending" | "error";
  staged?: StagedMessage;
  operatorPlan?: OperatorPlan;
}

function OperatorPlanCard({ plan, state, memory, workspaceId, editable }: { plan: OperatorPlan; state: WorkspaceState; memory: MemoryStore; workspaceId: string; editable: boolean }) {
  const [busy, setBusy] = useState(false);
  const [run, setRun] = useState<OperatorRun | null>(null);
  const [supplier, setSupplier] = useState("Preferred supplier");
  const reachable = plan.targets.filter((target) => target.phone);
  const execute = async () => {
    if (!editable) { toast("A manager must approve this action."); return; }
    if (plan.purchaseOrder) {
      if (!supplier.trim()) { toast("Name the supplier before approval."); return; }
      const approved = await appConfirm({ title: "Approve and create this purchase order?", body: `${supplier.trim()} · ${plan.purchaseOrder.lines.length} products · ${formatMoney(plan.purchaseOrder.total)} committed. The PO will become incoming stock, not physical stock, until receiving is recorded.`, confirmLabel: "Approve and create PO" });
      if (!approved) return;
      const approvedAt = Date.now();
      memory.append("decision", "operator_plan_approved", { planId: plan.planId, kind: plan.kind, title: plan.title, problem: plan.problem, targetCount: plan.purchaseOrder.lines.length, approvedAt });
      memory.append("fact", "purchase_order_created", { poId: plan.planId, supplier: supplier.trim(), lines: plan.purchaseOrder.lines.map(({ evidence: _evidence, ...line }) => line), expectedAt: plan.purchaseOrder.expectedAt, notes: `Prepared and approved through ZYVORA Operator · budget ${formatMoney(plan.purchaseOrder.total)}`, createdAt: approvedAt });
      const executed: OperatorRun = { planId: plan.planId, kind: plan.kind, title: plan.title, targetIds: plan.purchaseOrder.lines.map((line) => line.productId), customers: [], executedAt: approvedAt, expectedAt: plan.purchaseOrder.expectedAt };
      memory.append("fact", "operator_run_executed", executed as unknown as Record<string, unknown>); setRun(executed);
      toast(`Approved purchase order created · ${formatMoney(plan.purchaseOrder.total)}`); return;
    }
    if (plan.tasks) {
      const approved = await appConfirm({ title: "Approve these courier recovery tasks?", body: `${plan.tasks.length} order-linked follow-up task${plan.tasks.length === 1 ? "" : "s"} will be added. No messages are sent and no order statuses change automatically.`, confirmLabel: "Approve and create tasks" });
      if (!approved) return;
      const approvedAt = Date.now();
      memory.append("decision", "operator_plan_approved", { planId: plan.planId, kind: plan.kind, title: plan.title, problem: plan.problem, targetCount: plan.tasks.length, approvedAt });
      for (const task of plan.tasks) memory.append("fact", "customer_activity_logged", { activityId: task.taskId, customer: task.customer, kind: "followup", note: `${task.title}: ${task.note}`, dueAt: task.dueAt, at: approvedAt });
      const executed: OperatorRun = { planId: plan.planId, kind: plan.kind, title: plan.title, targetIds: [...new Set(plan.tasks.map((task) => task.orderId))], customers: [...new Set(plan.tasks.map((task) => task.customer))], executedAt: approvedAt };
      memory.append("fact", "operator_run_executed", executed as unknown as Record<string, unknown>); setRun(executed);
      toast(`${plan.tasks.length} courier recovery task${plan.tasks.length === 1 ? "" : "s"} created`); return;
    }
    if (!messagingConfigured) { toast("Connect messaging before execution. The review plan remains ready."); return; }
    if (!reachable.length) { toast("Add customer phone numbers before executing this plan."); return; }
    const approved = await appConfirm({ title: `Approve ${plan.title.toLowerCase()}?`, body: `${reachable.length} WhatsApp message${reachable.length === 1 ? "" : "s"} will be sent exactly as shown. ZYVORA will record and measure the operation.`, confirmLabel: "Approve and execute" });
    if (!approved) return;
    memory.append("decision", "operator_plan_approved", { planId: plan.planId, kind: plan.kind, title: plan.title, problem: plan.problem, targetCount: reachable.length, approvedAt: Date.now() });
    setBusy(true);
    const successful: typeof reachable = [];
    for (const target of reachable) {
      const result = await sendMessage(target.phone!, target.body, "whatsapp", { workspaceId, customer: target.customer });
      if (result.ok) { recordSentMessage(memory, result, { customer: target.customer, phone: target.phone!, body: target.body, channel: "whatsapp" }); successful.push(target); }
    }
    const executedAt = Date.now();
    const executed: OperatorRun = { planId: plan.planId, kind: plan.kind, title: plan.title, targetIds: successful.map((target) => target.targetId), customers: successful.map((target) => target.customer), executedAt };
    if (successful.length) {
      memory.append("fact", "operator_run_executed", executed as unknown as Record<string, unknown>);
      if (plan.kind === "winback-campaign") memory.append("fact", "campaign_sent", { campaignId: plan.planId, segment: "ai-operator-safe-winback", customers: executed.customers, channel: "whatsapp", message: "Personalized operator win-back batch", at: executedAt });
      setRun(executed);
    }
    setBusy(false); toast(`${successful.length}/${reachable.length} approved message${reachable.length === 1 ? "" : "s"} sent`);
  };
  const measure = () => {
    if (!run) return;
    const outcome = measureOperatorRun(run, state); const measuredAt = Date.now();
    memory.append("outcome", "operator_outcome_recorded", { planId: run.planId, kind: run.kind, successes: outcome.successes, total: outcome.total, result: outcome.result, detail: outcome.detail, measuredAt });
    setRun({ ...run, outcome: { successes: outcome.successes, total: outcome.total, result: outcome.result, measuredAt } });
    toast(`Outcome remembered: ${outcome.detail}`);
  };
  return <section className="card" style={{ borderLeft: "3px solid var(--accent)", marginTop: 10 }} aria-label="Prepared operator action">
    <div className="badge-row"><span className="badge domain">AI operator · review required</span><span className="badge">{plan.kind.replace(/-/g, " ")}</span></div>
    <h3 style={{ marginBottom: 6 }}>{plan.title}</h3><p className="claim" style={{ fontSize: 15 }}>{plan.problem}</p>
    <table className="evidence-table"><tbody>{plan.evidence.map((item) => <tr key={item.label}><td>{item.label}</td><td>{item.value}</td></tr>)}</tbody></table>
    <div className="reasoning" style={{ marginTop: 12 }}><strong>Proposed action</strong><br />{plan.proposedAction}</div>
    {plan.targets.length > 0 && <details className="layers" style={{ marginTop: 12 }}><summary>Review exact messages and recipients ({plan.targets.length})</summary><div className="table-scroll" style={{ marginTop: 10 }}><table className="records"><thead><tr><th>Customer</th><th>Evidence</th><th>Prepared message</th><th>Ready</th></tr></thead><tbody>{plan.targets.map((target) => <tr key={target.targetId}><td>{target.customer}</td><td className="muted">{target.evidence}</td><td>{target.body}</td><td>{target.phone ? <span className="tone success">Ready</span> : <span className="tone attention">No phone</span>}</td></tr>)}</tbody></table></div></details>}
    {plan.purchaseOrder && <div className="card" style={{ marginTop: 12, padding: 14 }}><div className="form-row"><div style={{ flex: 1 }}><label htmlFor={`operator-supplier-${plan.planId}`}>Supplier</label><input id={`operator-supplier-${plan.planId}`} value={supplier} onChange={(event) => setSupplier(event.target.value)} style={{ width: "100%" }} /></div><div><span className="muted">Expected arrival</span><strong style={{ display: "block" }}>{new Date(plan.purchaseOrder.expectedAt).toLocaleDateString()}</strong></div></div><div className="table-scroll"><table className="records"><thead><tr><th>Product</th><th>Why</th><th>Qty</th><th>Unit cost</th><th>Total</th></tr></thead><tbody>{plan.purchaseOrder.lines.map((line) => <tr key={line.productId}><td>{line.productName}</td><td className="muted">{line.evidence}</td><td>{line.qty}</td><td>{formatMoney(line.unitCost)}</td><td>{formatMoney(line.qty * line.unitCost)}</td></tr>)}</tbody></table></div></div>}
    {plan.tasks && <details className="layers" style={{ marginTop: 12 }} open><summary>Review exact intervention tasks ({plan.tasks.length})</summary><div className="table-scroll" style={{ marginTop: 10 }}><table className="records"><thead><tr><th>Order</th><th>Customer</th><th>Task</th><th>Evidence</th><th>Due</th></tr></thead><tbody>{plan.tasks.map((task) => <tr key={task.taskId}><td>{task.orderId}</td><td>{task.customer}</td><td><strong>{task.title}</strong><br /><span className="muted">{task.note}</span></td><td>{task.evidence}</td><td>{new Date(task.dueAt).toLocaleDateString()}</td></tr>)}</tbody></table></div></details>}
    {plan.excluded.length > 0 && <details className="layers" style={{ marginTop: 8 }}><summary>{plan.excluded.length} excluded by guardrails</summary><ul>{plan.excluded.map((item, index) => <li key={`${item.customer}-${index}`}>{item.customer} — {item.reason}</li>)}</ul></details>}
    <p className="confidence-note"><strong>How success will be measured:</strong> {plan.measurement}</p>
    <div className="row-actions"><button className="btn" disabled={busy || Boolean(run) || !editable} onClick={() => void execute()}>{run ? "Executed ✓" : busy ? "Executing…" : plan.purchaseOrder ? "Review approval & create PO" : plan.tasks ? "Review approval & create tasks" : "Review approval & execute"}</button>{run && !run.outcome && <button className="btn subtle" onClick={measure}>Measure outcome now</button>}</div>
  </section>;
}

function OperatorMemory({ state, memory }: { state: WorkspaceState; memory: MemoryStore }) {
  const runs = projectOperatorRuns(memory.all()).slice(0, 4);
  if (!runs.length) return null;
  return <section className="card" style={{ marginBottom: 16 }}><div className="section-heading"><div><h2>Operator memory</h2><p>What ZYVORA executed, whether it worked, and what it should learn next time.</p></div></div><div className="table-scroll"><table className="records"><thead><tr><th>Action</th><th>Executed</th><th>Measured result</th><th></th></tr></thead><tbody>{runs.map((run) => { const current = measureOperatorRun(run, state); return <tr key={run.planId}><td>{run.title}</td><td>{new Date(run.executedAt).toLocaleDateString()} · {run.targetIds.length} targets</td><td>{run.outcome ? <span className={`tone ${run.outcome.result === "worked" ? "success" : "attention"}`}>{run.outcome.successes}/{run.outcome.total} · {run.outcome.result.replace(/-/g, " ")}</span> : <span className="muted">{current.detail}</span>}</td><td>{!run.outcome && <button className="btn subtle mini" onClick={() => { memory.append("outcome", "operator_outcome_recorded", { planId: run.planId, kind: run.kind, successes: current.successes, total: current.total, result: current.result, detail: current.detail, measuredAt: Date.now() }); toast(`Outcome remembered: ${current.detail}`); }}>Measure & remember</button>}</td></tr>; })}</tbody></table></div></section>;
}

/** Staged action — a drafted, editable, human-approved message (Ask → Act). */
function ActionCard({ staged, state, memory, workspaceId }: { staged: StagedMessage; state: WorkspaceState; memory: MemoryStore; workspaceId: string }) {
  const [draft, setDraft] = useState(staged);
  const [body, setBody] = useState(staged.body);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const profiles = projectCustomerProfiles(state);
  const contacts = projectContacts(memory.all());

  const switchLang = (lang: DraftLang) => {
    const next = restageInLang(draft, state, profiles, contacts, lang);
    setDraft(next);
    setBody(next.body);
  };

  const polish = async () => {
    setBusy(true);
    try {
      const better = await askLlm(
        `Rewrite this ${draft.lang === "fr" ? "French" : draft.lang === "ar" ? "Moroccan Arabic (Darija)" : "English"} customer message to be warm, short, and natural for WhatsApp. Keep every number and fact exactly as written. Return ONLY the message text.\n\nMESSAGE:\n${body}`,
        businessContext(state)
      );
      if (better) setBody(better);
    } catch {
      toast("AI polish unavailable — the draft is still ready to send");
    } finally {
      setBusy(false);
    }
  };

  const send = async () => {
    if (!draft.phone) return;
    setBusy(true);
    const r = await sendMessage(draft.phone, body.trim(), "whatsapp", { workspaceId, customer: draft.customer });
    setBusy(false);
    if (r.ok) {
      recordSentMessage(memory, r, { customer: draft.customer, phone: draft.phone, body: body.trim(), channel: "whatsapp" });
      setSent(true);
      toast(`Sent to ${draft.customer}`);
    } else {
      toast(`Couldn't send: ${r.error}`);
    }
  };

  return (
    <div className="card" style={{ borderLeft: "3px solid var(--accent)", marginTop: 10 }}>
      <div className="badge-row">
        <span className="badge">Staged action</span>
        <span className="badge domain">{draft.intent.replace(/-/g, " ")}</span>
        <span className="confidence-dots"><span>to {draft.customer}{draft.phone ? ` · ${draft.phone}` : ""}</span></span>
      </div>
      <p className="reasoning" style={{ marginBottom: 8 }}>{draft.reason} Nothing is sent until you approve.</p>
      <div className="segmented" style={{ marginBottom: 8 }}>
        {(["en", "fr", "ar"] as DraftLang[]).map((l) => (
          <button key={l} className={draft.lang === l ? "active" : ""} onClick={() => switchLang(l)}>
            {l === "en" ? "English" : l === "fr" ? "Français" : "العربية"}
          </button>
        ))}
      </div>
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        aria-label="Message draft"
        dir={draft.lang === "ar" ? "rtl" : "ltr"}
        style={{ width: "100%", minHeight: 84, border: "1px solid var(--line)", borderRadius: 9, padding: 10, background: "var(--surface)", resize: "vertical" }}
      />
      <div className="row-actions" style={{ marginTop: 10 }}>
        {messagingConfigured && draft.phone && (
          <button className="btn mini" disabled={busy || sent || !body.trim()} onClick={() => void send()}>
            {sent ? "Sent ✓" : busy ? "Working…" : "Send WhatsApp"}
          </button>
        )}
        {!draft.phone && (
          <span className="confidence-note" style={{ margin: 0 }}>No phone saved for {draft.customer} — add one on their profile, or copy the message.</span>
        )}
        <button
          className="btn subtle mini"
          onClick={async () => {
            await navigator.clipboard?.writeText(body.trim()).catch(() => undefined);
            toast("Message copied");
          }}
        >
          Copy
        </button>
        {llmConfigured && (
          <button className="btn subtle mini" disabled={busy} onClick={() => void polish()}>
            {busy ? "Polishing…" : "Polish with AI"}
          </button>
        )}
      </div>
    </div>
  );
}

export function AskView({ state, memory, workspaceId, editable = true }: { state: WorkspaceState; memory: MemoryStore; workspaceId: string; editable?: boolean }) {
  const [input, setInput] = useState("");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [busy, setBusy] = useState(false);
  const reduce = useReducedMotion();
  const endRef = useRef<HTMLDivElement>(null);
  const scroll = () => requestAnimationFrame(() => endRef.current?.scrollIntoView({ behavior: reduce ? "auto" : "smooth" }));

  const ask = async (question: string) => {
    const text = question.trim();
    if (!text || busy) return;

    const operatorPlan = prepareOperatorPlan(state, memory.all(), text);
    if (operatorPlan) {
      setTurns((before) => [...before, {
        id: crypto.randomUUID(), question: text,
        answer: { text: "I found a concrete business problem and prepared the exact operation below. Review the evidence, recipients, exclusions, and messages before approving anything.", evidence: [], handled: true },
        source: "rules", operatorPlan,
      }]);
      setInput(""); scroll(); return;
    }

    // Ask → Act: if the question is really a request to DO something, stage the
    // action (drafted message, human-approved) instead of just talking about it.
    const staged = stageAction(state, projectCustomerProfiles(state), projectContacts(memory.all()), text);
    if (staged) {
      setTurns((t) => [...t, {
        id: crypto.randomUUID(),
        question: text,
        answer: {
          text: `Here's a ready-to-send draft. Edit anything, switch language, then approve — I never send on my own.`,
          evidence: [],
          handled: true,
        },
        source: "rules",
        staged,
      }]);
      setInput("");
      scroll();
      return;
    }

    const det = askZyvora(state, text);

    // Deterministic answers are instant and exact — use them for known questions.
    if (det.handled || !llmConfigured) {
      setTurns((t) => [...t, { id: crypto.randomUUID(), question: text, answer: det, source: det.handled ? "rules" : undefined }]);
      setInput("");
      scroll();
      return;
    }

    // Otherwise let the grounded LLM answer conversationally.
    const id = crypto.randomUUID();
    setTurns((t) => [...t, { id, question: text, answer: { text: "Thinking…", evidence: [], handled: true }, source: "pending" }]);
    setInput("");
    setBusy(true);
    scroll();
    try {
      const history: ChatMessage[] = turns.slice(-4).flatMap((t) => [
        { role: "user" as const, content: t.question },
        { role: "assistant" as const, content: t.answer.text },
      ]);
      const reply = await askLlm(text, businessContext(state), history);
      setTurns((t) => t.map((x) => (x.id === id ? { ...x, answer: { text: reply, evidence: [], handled: true }, source: "ai" } : x)));
    } catch (e) {
      setTurns((t) => t.map((x) => (x.id === id ? { ...x, answer: { text: `I couldn't reach the AI model (${e instanceof Error ? e.message : "error"}). I can still answer specific questions about profit, cash, products, and customers from your data.`, evidence: [], handled: false }, source: "error" } : x)));
    } finally {
      setBusy(false);
      scroll();
    }
  };

  return (
    <div>
      <PageHeader
        title="ZYVORA Operator"
        description={<>An approval-first business operator: find the problem, show the evidence, prepare exact actions, execute only after review, then measure and remember the outcome{llmConfigured ? ` — with ${llmModel.split("-").slice(0, 2).join(" ")} available for grounded conversation.` : "."}</>}
      />

      <OperatorMemory state={state} memory={memory} />

      {turns.length === 0 && (
        <div className="quiet" style={{ textAlign: "left" }}>
          <p style={{ marginTop: 0 }}>Ask the operator to prepare real work:</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {["Prepare today's COD confirmations", "Create a win-back campaign, but exclude previous refusers", "What should I reorder with MAD 5,000?", ...SUGGESTED_QUESTIONS].map((s) => (
              <button key={s} className="btn subtle" onClick={() => void ask(s)}>{s}</button>
            ))}
          </div>
          <p style={{ marginBottom: 6, marginTop: 14 }}>…or ask me to <strong>do</strong> something — I'll draft it, you approve:</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {["Draft a payment reminder", "Write a win-back message in French", "Draft a reorder nudge in Arabic"].map((s) => (
              <button key={s} className="btn ghost" onClick={() => void ask(s)}>{s}</button>
            ))}
          </div>
        </div>
      )}

      <AnimatePresence initial={false}>
        {turns.map((t) => (
          <motion.div
            key={t.id}
            initial={reduce ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
          >
            <div style={{ textAlign: "right", margin: "14px 0 6px" }}>
              <span style={{ display: "inline-block", background: "var(--accent-soft)", color: "var(--accent)", padding: "8px 14px", borderRadius: 14, fontSize: 14.5, maxWidth: "80%" }}>
                {t.question}
              </span>
            </div>
            <div className="card" style={{ marginTop: 0 }}>
              {(t.source === "ai" || t.source === "rules") && (
                <span className="badge domain" style={{ marginBottom: 6 }}>
                  {t.source === "ai" ? "AI · grounded on your data" : "from your data"}
                </span>
              )}
              <p className="claim" style={{ fontSize: 15 }}>{t.answer.text}</p>
              {t.answer.evidence.length > 0 && (
                <table className="evidence-table">
                  <tbody>
                    {t.answer.evidence.map((e, i) => (
                      <tr key={i}><td>{e.label}</td><td>{e.value}</td></tr>
                    ))}
                  </tbody>
                </table>
              )}
              {!t.answer.handled && t.source !== "pending" && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
                  {SUGGESTED_QUESTIONS.slice(0, 4).map((s) => (
                    <button key={s} className="btn subtle" onClick={() => void ask(s)}>{s}</button>
                  ))}
                </div>
              )}
              {t.staged && <ActionCard staged={t.staged} state={state} memory={memory} workspaceId={workspaceId} />}
              {t.operatorPlan && <OperatorPlanCard plan={t.operatorPlan} state={state} memory={memory} workspaceId={workspaceId} editable={editable} />}
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
      <div ref={endRef} />

      <div className="form-row" style={{ marginTop: 18 }}>
        <label className="sr-only" htmlFor="ask-zyvora-question">Ask a question about your business</label>
        <input
          id="ask-zyvora-question"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") void ask(input); }}
          placeholder="Ask about profit, cash, products, customers…"
          style={{ flex: 1, minWidth: 240 }}
          disabled={busy}
          autoFocus
        />
        <button className="btn" onClick={() => void ask(input)} disabled={!input.trim() || busy}>
          {busy ? "Thinking…" : "Ask"}
        </button>
      </div>
    </div>
  );
}
