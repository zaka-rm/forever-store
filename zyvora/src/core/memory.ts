/**
 * Business Memory — append-only, permanent, user-owned, exportable.
 * Traceability: CODEX 00 B.6/D.8, Article V, ADR-0002; export honors the Legacy Promise (H.2).
 * Canonical (governance/): CAP-000002 Business Memory —
 * FEAT-000009 decision timeline, FEAT-000010 immutable context snapshots, FEAT-000032 audit trail/export.
 */
import type { MemoryEvent, Stream } from "./types";

const KEY_PREFIX = "zyvora.memory.";
const WORKSPACE_KEY = "zyvora.workspace";

export interface WorkspaceMeta {
  id: string;
  name: string;
  /** ISO 4217 — chosen at onboarding; global-first, never hardcoded (ZPL-040 amendment). */
  currency: string;
  createdAt: number;
}

/**
 * The Business Memory contract every persistence backend implements
 * (local device store or cloud store). Append-only by construction:
 * there is no update and no delete anywhere in this interface (ADR-0002).
 */
export interface MemoryStore {
  append(
    stream: Stream,
    type: string,
    payload: Record<string, unknown>,
    ts?: number
  ): MemoryEvent;
  all(): readonly MemoryEvent[];
  byStream(stream: Stream): MemoryEvent[];
  subscribe(listener: () => void): () => void;
  exportJson(workspaceName: string): void;
}

export function loadWorkspace(): WorkspaceMeta | null {
  const raw = localStorage.getItem(WORKSPACE_KEY);
  if (!raw) return null;
  const meta = JSON.parse(raw) as WorkspaceMeta;
  if (!meta.currency) meta.currency = "USD"; // pre-amendment Workspaces
  return meta;
}

export function createWorkspace(name: string, currency: string): WorkspaceMeta {
  const meta: WorkspaceMeta = {
    id: crypto.randomUUID(),
    name: name.trim(),
    currency: currency.trim().toUpperCase() || "USD",
    createdAt: Date.now(),
  };
  localStorage.setItem(WORKSPACE_KEY, JSON.stringify(meta));
  return meta;
}

export class BusinessMemory implements MemoryStore {
  private events: MemoryEvent[] = [];
  private storageKey: string;
  private listeners = new Set<() => void>();

  constructor(workspaceId: string) {
    this.storageKey = KEY_PREFIX + workspaceId;
    const raw = localStorage.getItem(this.storageKey);
    this.events = raw ? (JSON.parse(raw) as MemoryEvent[]) : [];
  }

  /** Append-only. There is no update and no delete (ADR-0002). */
  append(
    stream: Stream,
    type: string,
    payload: Record<string, unknown>,
    ts?: number
  ): MemoryEvent {
    const event: MemoryEvent = {
      id: crypto.randomUUID(),
      ts: ts ?? Date.now(),
      stream,
      type,
      payload,
    };
    this.events.push(event);
    this.persist();
    this.listeners.forEach((l) => l());
    return event;
  }

  all(): readonly MemoryEvent[] {
    return this.events;
  }

  byStream(stream: Stream): MemoryEvent[] {
    return this.events.filter((e) => e.stream === stream);
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /** Article V: Business Memory is exportable in an open format at any time. */
  exportJson(workspaceName: string): void {
    const blob = new Blob(
      [
        JSON.stringify(
          { workspace: workspaceName, exportedAt: new Date().toISOString(), events: this.events },
          null,
          2
        ),
      ],
      { type: "application/json" }
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `zyvora-business-memory-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  private persist(): void {
    localStorage.setItem(this.storageKey, JSON.stringify(this.events));
  }
}
