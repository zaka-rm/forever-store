/**
 * Team — membership & role management (CAP-000004 Identity/Permissions).
 * FEAT-000027 invitation & membership, FEAT-000028 roles, WF-000024 invite &
 * onboard, WF-000025 change role, WF-000026 suspend/revoke.
 * Every control is gated by the current user's role through can()/canManageMember.
 */
import { useEffect, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  fetchMembers,
  inviteMember,
  pendingInvites,
  removeMember,
  setMemberRole,
  type Member,
} from "../core/cloud";
import { ROLES, can, canManageMember, roleLabel, type Role } from "../core/permissions";
import { appConfirm } from "./dialog";
import { toast } from "./toast";

interface Props {
  client: SupabaseClient | null;
  workspaceId: string;
  myRole: Role;
  myUserId: string;
  ownerId: string;
}

export function TeamView({ client, workspaceId, myRole, myUserId, ownerId }: Props) {
  const [members, setMembers] = useState<Member[]>([]);
  const [invites, setInvites] = useState<{ id: string; email: string; role: Role; status: string }[]>([]);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("staff");
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    if (!client) return;
    setLoading(true);
    try {
      setMembers(await fetchMembers(client, workspaceId));
      setInvites(await pendingInvites(client, workspaceId));
    } catch (e) {
      setMsg(e instanceof Error ? e.message : String(e));
    }
    setLoading(false);
  };

  useEffect(() => { void refresh(); /* eslint-disable-next-line */ }, [workspaceId]);

  if (!client) {
    return (
      <div>
        <h1>Team</h1>
        <p className="subtitle">
          Team members and roles are available in account mode. In local device
          mode you are the sole owner of this Workspace.
        </p>
        <div className="card">
          <p className="claim" style={{ fontSize: 15 }}>Roles at a glance</p>
          <table className="evidence-table"><tbody>
            {ROLES.map((r) => (
              <tr key={r.role}><td>{r.label}</td><td>{r.blurb}</td></tr>
            ))}
          </tbody></table>
        </div>
      </div>
    );
  }

  const invite = async () => {
    setMsg(null);
    if (!email.trim()) return;
    try {
      await inviteMember(client, workspaceId, email, role, myUserId);
      setEmail("");
      setMsg(`Invited ${email.trim()} as ${roleLabel(role)}. They gain access when they sign in with that email.`);
      void refresh();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : String(e));
    }
  };

  const canInvite = can(myRole, "invite_member");

  return (
    <div>
      <h1>Team</h1>
      <p className="subtitle">
        Who may access this Workspace, and what they can do. Access is enforced by
        the database, not just the screen — least privilege by default.
      </p>

      {canInvite && (
        <>
          <h2>Invite a member</h2>
          <div className="form-row">
            <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="their@email.com" type="email" style={{ minWidth: 220 }} />
            <select value={role} onChange={(e) => setRole(e.target.value as Role)}>
              {ROLES.filter((r) => r.role !== "owner").map((r) => (
                <option key={r.role} value={r.role}>{r.label}</option>
              ))}
            </select>
            <button className="btn" onClick={invite} disabled={!email.trim()}>Send invite</button>
          </div>
          {msg && <p className="confidence-note">{msg}</p>}
        </>
      )}

      <h2>Members</h2>
      {loading ? (
        <div className="quiet">Loading…</div>
      ) : (
        <table className="records">
          <thead><tr><th>Member</th><th>Role</th><th></th></tr></thead>
          <tbody>
            <tr>
              <td>You{ownerId === myUserId ? " (owner)" : ""}</td>
              <td>{roleLabel(myRole)}</td>
              <td></td>
            </tr>
            {members.filter((m) => m.userId !== myUserId).map((m) => {
              const editable = canManageMember(myRole, m.role);
              return (
                <tr key={m.userId}>
                  <td className="muted">{m.email.slice(0, 8)}…</td>
                  <td>
                    {editable ? (
                      <select
                        value={m.role}
                        onChange={async (e) => { await setMemberRole(client, workspaceId, m.userId, e.target.value as Role); void refresh(); }}
                      >
                        {ROLES.filter((r) => r.role !== "owner" && canManageMember(myRole, m.role, r.role)).map((r) => (
                          <option key={r.role} value={r.role}>{r.label}</option>
                        ))}
                      </select>
                    ) : roleLabel(m.role)}
                  </td>
                  <td>
                    {editable && (
                      <button className="btn mini danger" onClick={async () => {
                        const ok = await appConfirm({
                          title: "Remove this member's access?",
                          body: "They lose access to this Workspace immediately. Their past events stay in Business Memory (append-only).",
                          confirmLabel: "Remove access",
                          danger: true,
                        });
                        if (ok) { await removeMember(client, workspaceId, m.userId); void refresh(); toast("Member removed"); }
                      }}>Remove</button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      {invites.length > 0 && (
        <>
          <h2>Pending invitations</h2>
          <table className="records">
            <thead><tr><th>Email</th><th>Role</th></tr></thead>
            <tbody>
              {invites.map((i) => (
                <tr key={i.id}><td>{i.email}</td><td className="muted">{roleLabel(i.role)}</td></tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}
