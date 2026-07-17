/**
 * Insight & Guidance surface — the four transparency layers, progressively
 * disclosed (CODEX 10 P4.6, Law X), the canonical Options Table (ADR-1004),
 * and human decision recording with rationale (CODEX 00 D.11 stage 8, Law XII).
 * Canonical (governance/): CAP-000001 Decision Center — FEAT-000003 decision
 * detail/evidence bundle, FEAT-000007 action & rationale recording; CAP-000003
 * FEAT-000022 explainability service.
 */
import { useState } from "react";
import type { CoachNote } from "../core/coach";
import type { Insight } from "../core/types";

interface Props {
  insight: Insight;
  onDecide?: (
    insight: Insight,
    optionId: string,
    optionLabel: string,
    rationale: string
  ) => void;
  /** Decision-memory coach: what you did the previous times this came up. */
  coach?: CoachNote | null;
}

const dateShort = (ts: number) =>
  new Date(ts).toLocaleDateString(undefined, { day: "numeric", month: "short" });

export function InsightCard({ insight, onDecide, coach }: Props) {
  const [selected, setSelected] = useState<string | null>(null);
  const [rationale, setRationale] = useState("");
  const g = insight.guidance;

  const conf = insight.confidence === "high" ? 3 : insight.confidence === "medium" ? 2 : 1;

  return (
    <div className={`card insight ${insight.layer === "strategic" ? "strategic" : ""}`}>
      <div className="badge-row">
        <span className={`badge ${insight.layer === "strategic" ? "strategic" : ""}`}>
          {insight.layer}
        </span>
        <span className="badge domain">{insight.domain}</span>
        <span className="confidence-dots" title={`Confidence: ${insight.confidence}`}>
          {[1, 2, 3].map((n) => <i key={n} className={n <= conf ? "on" : ""} />)}
          <span>{insight.confidence}</span>
        </span>
      </div>
      <p className="claim">{insight.claim}</p>
      <p className="reasoning">{insight.reasoning}</p>

      <details className="layers">
        <summary>Why am I seeing this? — evidence &amp; confidence</summary>
        <table className="evidence-table">
          <tbody>
            {insight.evidence.map((e, i) => (
              <tr key={i}>
                <td>{e.label}</td>
                <td>{e.value}</td>
              </tr>
            ))}
            <tr>
              <td>Confidence</td>
              <td>{insight.confidence}</td>
            </tr>
          </tbody>
        </table>
        <p className="confidence-note">{insight.confidenceNote}</p>
      </details>

      {coach && g && onDecide && (
        <div
          style={{
            marginTop: 12, padding: "10px 14px", borderRadius: 9,
            background: "var(--surface-inset)", border: "1px solid var(--line-soft)",
            fontSize: 13.5, color: "var(--ink-soft)",
          }}
        >
          <strong style={{ color: "var(--ink)" }}>You've been here before.</strong>{" "}
          You faced this kind of decision {coach.timesFaced}× — last on {dateShort(coach.last.ts)} you chose{" "}
          <strong>“{coach.last.optionLabel}”</strong>
          {coach.last.rationale && <> (<em>“{coach.last.rationale}”</em>)</>}
          {coach.last.outcome
            ? <>, and recorded the outcome as <strong>{coach.last.outcome.result}</strong>{coach.last.outcome.note && <>: “{coach.last.outcome.note}”</>}.</>
            : <> — its outcome was never recorded.</>}
          {(coach.goodOutcomes > 0 || coach.badOutcomes > 0) && (
            <> Across all: {coach.goodOutcomes} good, {coach.badOutcomes} bad outcome{coach.goodOutcomes + coach.badOutcomes > 1 ? "s" : ""} recorded.</>
          )}
        </div>
      )}

      {g && onDecide && (
        <div className="options">
          {g.options.map((o) => (
            <label
              key={o.id}
              className={`option ${selected === o.id ? "selected" : ""}`}
            >
              <div className="opt-head">
                <input
                  type="radio"
                  name={insight.id}
                  checked={selected === o.id}
                  onChange={() => setSelected(o.id)}
                />
                <span className="opt-label">{o.label}</span>
                {g.recommendedId === o.id && <span className="rec">Recommended</span>}
              </div>
              <dl>
                <div><dt>The path</dt><dd>{o.path}</dd></div>
                <div><dt>The gain</dt><dd>{o.gain}</dd></div>
                <div><dt>The cost</dt><dd>{o.cost}</dd></div>
                <div><dt>Reversibility</dt><dd>{o.reversibility}</dd></div>
                <div><dt>Wrong if…</dt><dd>{o.falsifier}</dd></div>
              </dl>
            </label>
          ))}
          <p className="confidence-note">
            Why the recommendation: {g.recommendationReason} — the choice is yours;
            declining is a valid answer and will be remembered, not re-asked.
          </p>
          <div className="decide-box">
            <p className="hint">
              Your reasoning (recorded in Business Memory, so future-you can review
              the decision without hindsight distortion):
            </p>
            <textarea
              value={rationale}
              onChange={(e) => setRationale(e.target.value)}
              placeholder="Why this option, in your own words…"
            />
            <div style={{ marginTop: 8 }}>
              <button
                className="btn"
                disabled={!selected}
                onClick={() => {
                  const opt = g.options.find((o) => o.id === selected);
                  if (opt) onDecide(insight, opt.id, opt.label, rationale);
                }}
              >
                Record my decision
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
