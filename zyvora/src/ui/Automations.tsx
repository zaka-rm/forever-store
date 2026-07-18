import { useMemo, useState } from "react";
import { WORKFLOW_RECIPES, workflowCandidates, type WorkflowCandidate } from "../core/automations";
import type { MemoryStore } from "../core/memory";
import type { WorkspaceState } from "../core/types";
import { PageHeader } from "./PageHeader";
import { toast } from "./toast";

export function AutomationsView({ state, memory, editable = true }: { state: WorkspaceState; memory: MemoryStore; editable?: boolean }) {
  const events = memory.all();
  const candidates = useMemo(() => workflowCandidates(state, events), [state, events]);
  const [filter, setFilter] = useState<"all" | WorkflowCandidate["recipeId"]>("all");
  const visible = filter === "all" ? candidates : candidates.filter((c) => c.recipeId === filter);

  const prepare = (candidate: WorkflowCandidate) => {
    if (!editable) return;
    const at = Date.now();
    memory.append("fact", "customer_activity_logged", {
      activityId: crypto.randomUUID(), customer: candidate.customer, kind: "followup",
      note: candidate.taskNote, dueAt: at, at,
    });
    memory.append("fact", "automation_run_recorded", {
      runId: crypto.randomUUID(), candidateKey: candidate.key, recipeId: candidate.recipeId,
      orderId: candidate.orderId, customer: candidate.customer, outcome: "followup_task_created", at,
    });
    toast(`Follow-up prepared for ${candidate.customer}`);
  };

  return (
    <div>
      <PageHeader
        title="Workflows"
        description="Prepare repetitive COD follow-ups without silently messaging customers or changing money and order facts."
      />

      <section className="workflow-principle" aria-label="Workflow guardrail">
        <strong>Human approval stays in the loop.</strong>
        <span>Every run creates an internal follow-up task. Nothing is sent and no order status changes.</span>
      </section>

      <div className="workflow-recipes">
        {WORKFLOW_RECIPES.map((recipe) => {
          const count = candidates.filter((c) => c.recipeId === recipe.id).length;
          return (
            <button key={recipe.id} className={`workflow-recipe ${filter === recipe.id ? "active" : ""}`} onClick={() => setFilter(filter === recipe.id ? "all" : recipe.id)}>
              <span><strong>{recipe.name}</strong><small>{recipe.sentence}</small></span>
              <span className="badge domain">{count} ready</span>
              <small className="muted">{recipe.guardrail}</small>
            </button>
          );
        })}
      </div>

      <section className="card" style={{ marginTop: 18 }} aria-labelledby="workflow-ready-title">
        <div className="badge-row"><span className="badge">Prepared work</span><span className="badge domain">{visible.length}</span></div>
        <h2 id="workflow-ready-title">What needs a follow-up now?</h2>
        {visible.length === 0 ? (
          <p className="quiet">Nothing is waiting for this workflow right now.</p>
        ) : (
          <div className="workflow-queue">
            {visible.map((candidate) => (
              <article key={candidate.key}>
                <div><strong>{candidate.title}</strong><p>{candidate.reason}</p><small>{candidate.taskNote}</small></div>
                <button className="btn mini" disabled={!editable} onClick={() => prepare(candidate)}>Create follow-up</button>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
