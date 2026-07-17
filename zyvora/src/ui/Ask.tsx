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
import type { WorkspaceState } from "../core/types";
import { PageHeader } from "./PageHeader";

interface Turn {
  id: string;
  question: string;
  answer: Answer;
  source?: "rules" | "ai" | "pending" | "error";
}

export function AskView({ state }: { state: WorkspaceState }) {
  const [input, setInput] = useState("");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [busy, setBusy] = useState(false);
  const reduce = useReducedMotion();
  const endRef = useRef<HTMLDivElement>(null);
  const scroll = () => requestAnimationFrame(() => endRef.current?.scrollIntoView({ behavior: reduce ? "auto" : "smooth" }));

  const ask = async (question: string) => {
    const text = question.trim();
    if (!text || busy) return;
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
        title="Ask ZYVORA"
        description={<>Ask about your business in plain words. Answers come from your own recorded data{llmConfigured ? ` — precise figures instantly, and open questions answered conversationally by AI (${llmModel.split("-").slice(0, 2).join(" ")}), grounded on your real numbers.` : ", with the figures shown — and if I can't answer, I'll say so."}</>}
      />

      {turns.length === 0 && (
        <div className="quiet" style={{ textAlign: "left" }}>
          <p style={{ marginTop: 0 }}>Try one of these:</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {SUGGESTED_QUESTIONS.map((s) => (
              <button key={s} className="btn subtle" onClick={() => void ask(s)}>{s}</button>
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
