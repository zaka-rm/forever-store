/**
 * Notifications center + daily briefing (CAP-000010).
 * Calm by default (Law X): high-priority first, grouped, one line each, dismissable.
 * Read/dismiss is per-device UI state; acting deep-links to the responsible view.
 */
import { useState } from "react";
import { formatMoney } from "../core/engine";
import {
  dailyBriefing,
  loadReadSet,
  markAllRead,
  markRead,
  type Notification,
  type NotifPriority,
} from "../core/notifications";
import type { WorkspaceState } from "../core/types";

const AGO = (ts: number) => {
  const h = Math.round((Date.now() - ts) / 3600_000);
  return h < 1 ? "just now" : h < 24 ? `${h}h ago` : `${Math.round(h / 24)}d ago`;
};

const PRIORITY_LABEL: Record<NotifPriority, string> = { high: "Needs attention", medium: "Worth a look", low: "For your awareness" };

export function NotificationsView({
  state,
  notifications,
  workspaceId,
  onOpenView,
}: {
  state: WorkspaceState;
  notifications: Notification[];
  workspaceId: string;
  onOpenView: (v: "orders" | "finance" | "inventory" | "customers" | "today") => void;
}) {
  const [, force] = useState(0);
  const read = loadReadSet(workspaceId);
  const active = notifications.filter((n) => !read.has(n.key));
  const briefing = dailyBriefing(state, active);

  const dismiss = (key: string) => { markRead(workspaceId, key); force((x) => x + 1); };
  const dismissAll = () => { markAllRead(workspaceId, active.map((n) => n.key)); force((x) => x + 1); };

  const groups: NotifPriority[] = ["high", "medium", "low"];

  return (
    <div>
      <h1>Notifications</h1>
      <p className="subtitle">
        The few things worth your attention — proactive, ranked, and quiet by default.
        ZYVORA never interrupts you for something that doesn't change a decision.
      </p>

      {/* Daily briefing */}
      <div className="card" style={{ borderColor: "var(--accent)" }}>
        <p className="claim" style={{ fontSize: 16 }}>{briefing.greeting}. {briefing.headline}</p>
        <div className="stats" style={{ marginTop: 10 }}>
          <div className="stat"><div className="k">Revenue yesterday</div><div className="v">{formatMoney(briefing.revenueYesterday)}</div></div>
          <div className="stat"><div className="k">Orders delivered</div><div className="v">{briefing.ordersDeliveredYesterday}</div></div>
          <div className="stat"><div className="k">Cash collected</div><div className="v">{formatMoney(briefing.cashCollectedYesterday)}</div></div>
          <div className="stat"><div className="k">Need attention</div><div className="v">{briefing.needsAttention}</div></div>
        </div>
      </div>

      {active.length === 0 ? (
        <div className="quiet">You're all caught up — nothing needs you right now.</div>
      ) : (
        <>
          <div style={{ textAlign: "right", margin: "6px 0" }}>
            <button className="link-btn" onClick={dismissAll}>Mark all read</button>
          </div>
          {groups.map((p) => {
            const items = active.filter((n) => n.priority === p);
            if (items.length === 0) return null;
            return (
              <div key={p}>
                <h2>{PRIORITY_LABEL[p]} ({items.length})</h2>
                {items.map((n) => (
                  <div className="card" key={n.key}>
                    <div>
                      <span className={`badge ${p === "high" ? "strategic" : ""}`}>{n.category}</span>
                      <span className="badge domain">{AGO(n.at)}</span>
                    </div>
                    <p className="claim" style={{ fontSize: 15, marginTop: 6 }}>{n.title}</p>
                    <p className="reasoning">{n.body}</p>
                    <div style={{ display: "flex", gap: 10 }}>
                      <button className="btn ghost" onClick={() => { onOpenView(n.actionView); }}>
                        Open {n.actionView === "today" ? "Today" : n.actionView}
                      </button>
                      <button className="btn subtle" onClick={() => dismiss(n.key)}>Dismiss</button>
                    </div>
                  </div>
                ))}
              </div>
            );
          })}
        </>
      )}
    </div>
  );
}
