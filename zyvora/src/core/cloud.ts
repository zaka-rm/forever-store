/**
 * Cloud persistence — Wave 0 platform foundation.
 * Accounts (Supabase Auth) + server-side Business Memory (zyvora_events),
 * with Workspace isolation enforced by row-level security (supabase/40_zyvora.sql).
 *
 * Offline-first: appends land in the local event list immediately and are
 * queued in a persisted outbox; the outbox flushes to the server with
 * idempotent upserts (client-generated ids), so a lost connection never
 * loses Business Memory (Article V; F.4 integrity-first).
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { MemoryStore, WorkspaceMeta } from "./memory";
import type { MemoryEvent, Stream } from "./types";

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const cloudConfigured = Boolean(url && anonKey);

export const supabase: SupabaseClient | null = cloudConfigured
  ? createClient(url as string, anonKey as string)
  : null;

// ---------------------------------------------------------------- Workspaces

interface WorkspaceRow {
  id: string;
  name: string;
  currency: string;
  created_at: string;
}

export async function fetchMyWorkspace(client: SupabaseClient): Promise<WorkspaceMeta | null> {
  const { data, error } = await client
    .from("zyvora_workspaces")
    .select("id,name,currency,created_at")
    .order("created_at", { ascending: true })
    .limit(1);
  if (error) throw new Error(`Could not load your Workspace: ${error.message}`);
  const row = (data as WorkspaceRow[] | null)?.[0];
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    currency: row.currency,
    createdAt: new Date(row.created_at).getTime(),
  };
}

export async function createCloudWorkspace(
  client: SupabaseClient,
  ownerId: string,
  name: string,
  currency: string
): Promise<WorkspaceMeta> {
  const { data, error } = await client
    .from("zyvora_workspaces")
    .insert({ owner: ownerId, name: name.trim(), currency: currency.trim().toUpperCase() || "USD" })
    .select("id,name,currency,created_at")
    .single();
  if (error) throw new Error(`Could not create the Workspace: ${error.message}`);
  const row = data as WorkspaceRow;
  return {
    id: row.id,
    name: row.name,
    currency: row.currency,
    createdAt: new Date(row.created_at).getTime(),
  };
}

export async function fetchEvents(
  client: SupabaseClient,
  workspaceId: string
): Promise<MemoryEvent[]> {
  const { data, error } = await client
    .from("zyvora_events")
    .select("id,ts,stream,type,payload")
    .eq("workspace_id", workspaceId)
    .order("ts", { ascending: true })
    .limit(50000);
  if (error) throw new Error(`Could not load Business Memory: ${error.message}`);
  return (data ?? []) as MemoryEvent[];
}

// ------------------------------------------------------------- CloudMemory

export class CloudMemory implements MemoryStore {
  private events: MemoryEvent[];
  private listeners = new Set<() => void>();
  private outboxKey: string;
  private flushing = false;
  /** Unsynced-event count, for the UI sync indicator (Law VIII: show system state). */
  pendingSync = 0;

  constructor(
    private client: SupabaseClient,
    readonly workspaceId: string,
    initialEvents: MemoryEvent[]
  ) {
    this.events = [...initialEvents];
    this.outboxKey = `zyvora.outbox.${workspaceId}`;
    this.pendingSync = this.readOutbox().length;
    void this.flushOutbox();
  }

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
    const outbox = this.readOutbox();
    outbox.push(event);
    this.writeOutbox(outbox);
    this.notify();
    void this.flushOutbox();
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
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `zyvora-business-memory-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  private readOutbox(): MemoryEvent[] {
    try {
      return JSON.parse(localStorage.getItem(this.outboxKey) ?? "[]") as MemoryEvent[];
    } catch {
      return [];
    }
  }

  private writeOutbox(events: MemoryEvent[]): void {
    localStorage.setItem(this.outboxKey, JSON.stringify(events));
    this.pendingSync = events.length;
  }

  private async flushOutbox(): Promise<void> {
    if (this.flushing) return;
    this.flushing = true;
    try {
      const outbox = this.readOutbox();
      if (outbox.length === 0) return;
      const rows = outbox.map((e) => ({
        id: e.id,
        workspace_id: this.workspaceId,
        ts: e.ts,
        stream: e.stream,
        type: e.type,
        payload: e.payload,
      }));
      // Idempotent: retried events collide on primary key and are ignored.
      const { error } = await this.client
        .from("zyvora_events")
        .upsert(rows, { onConflict: "id", ignoreDuplicates: true });
      if (!error) {
        this.writeOutbox([]);
        this.notify();
      }
    } finally {
      this.flushing = false;
    }
  }

  private notify(): void {
    this.listeners.forEach((l) => l());
  }
}
