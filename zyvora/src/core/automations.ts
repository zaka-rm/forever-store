/**
 * Guardrailed workflow recipes (CODEX 00 D.6 rung 2).
 * They surface deterministic candidates and may create an internal follow-up
 * only after a human clicks Run. They never message a customer, move an order,
 * recognize revenue, or mark courier cash received on their own.
 */
import type { MemoryEvent, WorkspaceState } from "./types";
import { DAY } from "./projections";

export type RecipeId = "cod-confirmation" | "failed-delivery" | "courier-remittance";

export interface WorkflowRecipe {
  id: RecipeId;
  name: string;
  sentence: string;
  guardrail: string;
}

export interface WorkflowCandidate {
  key: string;
  recipeId: RecipeId;
  orderId: string;
  customer: string;
  title: string;
  reason: string;
  taskNote: string;
  priority: number;
}

export const WORKFLOW_RECIPES: WorkflowRecipe[] = [
  {
    id: "cod-confirmation",
    name: "COD confirmation follow-up",
    sentence: "When a COD order waits two hours for confirmation, prepare a customer follow-up task.",
    guardrail: "Creates a task only. You still review and send the message.",
  },
  {
    id: "failed-delivery",
    name: "Failed-delivery rescue",
    sentence: "When a courier reports a failed delivery, prepare an urgent customer follow-up task.",
    guardrail: "Never retries, cancels, or changes the order automatically.",
  },
  {
    id: "courier-remittance",
    name: "Courier cash chase",
    sentence: "When delivered COD cash remains uncollected for three days, prepare a remittance follow-up task.",
    guardrail: "Never marks money collected; only you can confirm cash received.",
  },
];

export function workflowCandidates(
  state: WorkspaceState,
  events: readonly MemoryEvent[],
  now = Date.now(),
): WorkflowCandidate[] {
  const completed = new Set(
    events
      .filter((e) => e.type === "automation_run_recorded")
      .map((e) => String(e.payload.candidateKey ?? "")),
  );
  const rows: WorkflowCandidate[] = [];

  for (const order of state.orders) {
    if (order.status === "pending" && now - order.createdAt >= 2 * 60 * 60 * 1000) {
      const key = `cod-confirmation:${order.orderId}:${order.createdAt}`;
      if (!completed.has(key)) rows.push({
        key, recipeId: "cod-confirmation", orderId: order.orderId, customer: order.customer,
        title: `Confirm ${order.customer}'s COD order`,
        reason: `The order has waited ${Math.max(2, Math.floor((now - order.createdAt) / 3_600_000))} hours without confirmation.`,
        taskNote: `Follow up to confirm COD order ${order.orderId.slice(0, 8)} before courier handoff.`,
        priority: 70 + Math.min(20, Math.floor((now - order.createdAt) / DAY)),
      });
    }

    if (order.shipmentStatus === "delivery_failed" && order.shipmentUpdatedAt) {
      const key = `failed-delivery:${order.orderId}:${order.shipmentUpdatedAt}`;
      if (!completed.has(key)) rows.push({
        key, recipeId: "failed-delivery", orderId: order.orderId, customer: order.customer,
        title: `Rescue ${order.customer}'s failed delivery`,
        reason: order.lastDeliveryFailure || "The courier reported a failed delivery attempt.",
        taskNote: `Contact ${order.customer} about failed delivery for order ${order.orderId.slice(0, 8)}. Confirm address and availability before retrying.`,
        priority: 100,
      });
    }

    if (order.status === "delivered" && !order.cashReceivedAt && order.deliveredAt && now - order.deliveredAt >= 3 * DAY) {
      const key = `courier-remittance:${order.orderId}:${order.deliveredAt}`;
      if (!completed.has(key)) rows.push({
        key, recipeId: "courier-remittance", orderId: order.orderId, customer: order.customer,
        title: `Chase courier cash for ${order.customer}`,
        reason: `COD cash has remained with the courier for ${Math.floor((now - order.deliveredAt) / DAY)} days.`,
        taskNote: `Follow up with ${order.courier || "the courier"} about COD remittance for order ${order.orderId.slice(0, 8)}.`,
        priority: 80 + Math.min(20, Math.floor((now - order.deliveredAt) / DAY)),
      });
    }
  }

  return rows.sort((a, b) => b.priority - a.priority || a.customer.localeCompare(b.customer));
}

