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
import type { Role } from "./permissions";
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
  owner: string;
}

const toMeta = (row: WorkspaceRow): WorkspaceMeta => ({
  id: row.id,
  name: row.name,
  currency: row.currency,
  createdAt: new Date(row.created_at).getTime(),
  ownerId: row.owner,
});

export async function fetchMyWorkspace(client: SupabaseClient): Promise<WorkspaceMeta | null> {
  const { data, error } = await client
    .from("zyvora_workspaces")
    .select("id,name,currency,created_at,owner")
    .order("created_at", { ascending: true })
    .limit(1);
  if (error) throw new Error(`Could not load your Workspace: ${error.message}`);
  const row = (data as WorkspaceRow[] | null)?.[0];
  return row ? toMeta(row) : null;
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
    .select("id,name,currency,created_at,owner")
    .single();
  if (error) throw new Error(`Could not create the Workspace: ${error.message}`);
  return toMeta(data as WorkspaceRow);
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

// ---------------------------------------------------- Teams & memberships
// Canonical (governance/): CAP-000004 — FEAT-000027 invitation & membership,
// FEAT-000028 roles. Server RLS (supabase/41_zyvora_teams.sql) is the real gate;
// these helpers drive the Team UI.

export interface Member {
  userId: string;
  email: string;
  role: Role;
}

/** The current user's role in a workspace (owner if they own it). */
export async function fetchMyRole(
  client: SupabaseClient,
  workspaceId: string,
  userId: string,
  ownerId?: string
): Promise<Role> {
  if (ownerId && ownerId === userId) return "owner";
  const { data } = await client
    .from("zyvora_memberships")
    .select("role")
    .eq("workspace_id", workspaceId)
    .eq("user_id", userId)
    .maybeSingle();
  return ((data?.role as Role) ?? "owner"); // pre-teams workspaces: sole user is owner
}

/** Accept any pending invitations addressed to this user's email → creates memberships. */
export async function acceptPendingInvitations(client: SupabaseClient, email: string): Promise<number> {
  const { data: invites } = await client
    .from("zyvora_invitations")
    .select("id,workspace_id,role")
    .eq("status", "pending");
  if (!invites || invites.length === 0) return 0;
  const { data: user } = await client.auth.getUser();
  const uid = user.user?.id;
  if (!uid) return 0;
  let n = 0;
  for (const inv of invites as { id: string; workspace_id: string; role: Role }[]) {
    const { error } = await client
      .from("zyvora_memberships")
      .upsert(
        { workspace_id: inv.workspace_id, user_id: uid, role: inv.role },
        { onConflict: "workspace_id,user_id", ignoreDuplicates: true }
      );
    if (!error) {
      await client.from("zyvora_invitations").update({ status: "accepted" }).eq("id", inv.id);
      n++;
    }
  }
  return n;
}

export async function fetchMembers(client: SupabaseClient, workspaceId: string): Promise<Member[]> {
  const { data, error } = await client
    .from("zyvora_memberships")
    .select("user_id,role")
    .eq("workspace_id", workspaceId);
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => ({ userId: r.user_id as string, email: r.user_id as string, role: r.role as Role }));
}

export async function inviteMember(
  client: SupabaseClient,
  workspaceId: string,
  email: string,
  role: Role,
  invitedBy: string
): Promise<void> {
  const { error } = await client.from("zyvora_invitations").insert({
    workspace_id: workspaceId,
    email: email.trim().toLowerCase(),
    role,
    invited_by: invitedBy,
  });
  if (error) throw new Error(error.message);
}

export async function pendingInvites(client: SupabaseClient, workspaceId: string) {
  const { data } = await client
    .from("zyvora_invitations")
    .select("id,email,role,status")
    .eq("workspace_id", workspaceId)
    .eq("status", "pending");
  return (data ?? []) as { id: string; email: string; role: Role; status: string }[];
}

export async function setMemberRole(client: SupabaseClient, workspaceId: string, userId: string, role: Role) {
  const { error } = await client
    .from("zyvora_memberships")
    .update({ role })
    .eq("workspace_id", workspaceId)
    .eq("user_id", userId);
  if (error) throw new Error(error.message);
}

export async function removeMember(client: SupabaseClient, workspaceId: string, userId: string) {
  const { error } = await client
    .from("zyvora_memberships")
    .delete()
    .eq("workspace_id", workspaceId)
    .eq("user_id", userId);
  if (error) throw new Error(error.message);
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
