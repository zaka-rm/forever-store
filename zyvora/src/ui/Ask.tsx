/**
 * Ask ZYVORA — the AI chat surface (ZPL-041 §12/§20). Answers from the
 * Workspace's own data via the deterministic assistant; every answer shows the
 * figures it used, and it admits when a question is out of scope. Permission-
 * aware by construction (single-owner today; reads only this Workspace).
 */
import { useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { askZyvora, SUGGESTED_QUESTIONS, type Answer } from "../core/assistant";
import type { WorkspaceState } from "../core/types";

interface Turn {
  id: string;
  question: string;
  answer: Answer;
}

export function AskView({ state }: { state: WorkspaceState }) {
  const [input, setInput] = useState("");
  const [turns, setTurns] = useState<Turn[]>([]);
  const reduce = useReducedMotion();
  const endRef = useRef<HTMLDivElement>(null);

  const ask = (question: string) => {
    const text = question.trim();
    if (!text) return;
    const answer = askZyvora(state, text);
    setTurns((t) => [...t, { id: crypto.randomUUID(), question: text, answer }]);
    setInput("");
    requestAnimationFrame(() => endRef.current?.scrollIntoView({ behavior: reduce ? "auto" : "smooth" }));
  };

  return (
    <div>
      <h1>Ask ZYVORA</h1>
      <p className="subtitle">
        Ask about your business in plain words. Every answer comes from your own
        recorded data, with the figures shown — and if I can't answer, I'll say so.
      </p>

      {turns.length === 0 && (
        <div className="quiet" style={{ textAlign: "left" }}>
          <p style={{ marginTop: 0 }}>Try one of these:</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {SUGGESTED_QUESTIONS.map((s) => (
              <button key={s} className="btn subtle" onClick={() => ask(s)}>{s}</button>
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
              {!t.answer.handled && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
                  {SUGGESTED_QUESTIONS.slice(0, 4).map((s) => (
                    <button key={s} className="btn subtle" onClick={() => ask(s)}>{s}</button>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
      <div ref={endRef} />

      <div className="form-row" style={{ marginTop: 18 }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") ask(input); }}
          placeholder="Ask about profit, cash, products, customers…"
          style={{ flex: 1, minWidth: 240 }}
          autoFocus
        />
        <button className="btn" onClick={() => ask(input)} disabled={!input.trim()}>Ask</button>
      </div>
    </div>
  );
}
