/**
 * Decision-memory coach (AI-partner stage 4: remembers and learns).
 * Before you decide, ZYVORA recalls YOUR OWN past decisions in the same family
 * and what actually happened — the anti-hindsight tool no generic AI has,
 * because it reads your append-only decision + outcome streams, never a model.
 *
 * Also owns the "close the loop" list: past decisions old enough to judge,
 * still missing an outcome (Law: loop closure is part of definition-of-done).
 */
import { DAY } from "./projections";
import type { MemoryEvent } from "./types";

export interface DecisionMemory {
  eventId: string;
  ts: number;
  decisionKey: string;
  claim: string;
  optionLabel: string;
  rationale: string;
  outcome?: { result: string; note: string; ts: number };
}

/** "inventory.stockout.P-001" → "inventory.stockout" — decisions rhyme by family. */
export function decisionFamily(key: string): string {
  return key.split(".").slice(0, 2).join(".");
}

export function projectDecisionMemories(events: readonly MemoryEvent[]): DecisionMemory[] {
  const outcomes = new Map<string, { result: string; note: string; ts: number }>();
  for (const e of events) {
    if (e.stream === "outcome") {
      outcomes.set(String(e.payload.decisionEventId), {
        result: String(e.payload.result ?? ""),
        note: String(e.payload.note ?? ""),
        ts: e.ts,
      });
    }
  }
  return events
    .filter((e) => e.stream === "decision" && e.type === "decision_recorded")
    .map((e) => ({
      eventId: e.id,
      ts: e.ts,
      decisionKey: String(e.payload.decisionKey),
      claim: String(e.payload.claim),
      optionLabel: String(e.payload.optionLabel),
      rationale: String(e.payload.rationale ?? ""),
      outcome: outcomes.get(e.id),
    }))
    .sort((a, b) => b.ts - a.ts);
}

export interface CoachNote {
  timesFaced: number;
  last: DecisionMemory;
  goodOutcomes: number;
  badOutcomes: number;
}

/** What you did the previous times this kind of decision came up. */
export function coachFor(events: readonly MemoryEvent[], decisionKey: string): CoachNote | null {
  const family = decisionFamily(decisionKey);
  const past = projectDecisionMemories(events).filter((d) => decisionFamily(d.decisionKey) === family);
  if (past.length === 0) return null;
  return {
    timesFaced: past.length,
    last: past[0],
    goodOutcomes: past.filter((d) => d.outcome && /good|well|positive/i.test(d.outcome.result)).length,
    badOutcomes: past.filter((d) => d.outcome && /bad|poor|negative/i.test(d.outcome.result)).length,
  };
}

/**
 * Decisions old enough to judge (default 7 days) with no recorded outcome.
 * Recording outcomes is what lets the coach — and future-you — learn.
 */
export function pendingOutcomeReviews(
  events: readonly MemoryEvent[],
  now: number = Date.now(),
  minAgeDays = 7,
  max = 2
): DecisionMemory[] {
  return projectDecisionMemories(events)
    .filter((d) => !d.outcome && now - d.ts >= minAgeDays * DAY)
    .slice(0, max);
}
