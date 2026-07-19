/**
 * Permissions & policy evaluation — multi-user authority (Wave 0 completion).
 * Canonical (governance/): CAP-000004 Identity, Workspace, Permissions & Audit —
 * FEAT-000028 roles & permission grants, FEAT-000029 policy evaluation.
 * Governed by BUILD-DRAFT CAP-000004 (ENT Role/Permission/Membership; WF Evaluate permission).
 *
 * Least-privilege by default: a role grants exactly the actions in its set, and
 * every sensitive action in the app is checked through `can()`. The engine is a
 * pure function so it is unit-tested and identical on client and (future) server.
 */

/** Roles, most to least privileged. A member holds exactly one role per workspace. */
export type Role = "owner" | "manager" | "staff" | "viewer";

export const ROLES: { role: Role; label: string; blurb: string }[] = [
  { role: "owner", label: "Owner", blurb: "Full control, including team and workspace deletion." },
  { role: "manager", label: "Manager", blurb: "Runs the business day-to-day and manages staff; can't delete the workspace." },
  { role: "staff", label: "Staff", blurb: "Handles orders, inventory, and daily operations. No team or export access." },
  { role: "viewer", label: "Viewer", blurb: "Read-only. Sees decisions and reports; changes nothing." },
];

/** Every permission-checked action in the app. */
export type Action =
  | "view"
  | "create_order"
  | "advance_order"
  | "edit_finance"
  | "manage_inventory"
  | "manage_promos"
  | "manage_documents"
  | "manage_store_credit"
  | "record_decision"
  | "import_data"
  | "export_memory"
  | "invite_member"
  | "change_role"
  | "remove_member"
  | "delete_workspace";

const OPERATIONS: Action[] = [
  "create_order", "advance_order", "edit_finance", "manage_inventory",
  "manage_promos", "record_decision", "import_data",
];
const TEAM: Action[] = ["invite_member", "change_role", "remove_member"];

const GRANTS: Record<Role, Set<Action>> = {
  owner: new Set<Action>(["view", ...OPERATIONS, ...TEAM, "manage_documents", "manage_store_credit", "export_memory", "delete_workspace"]),
  manager: new Set<Action>(["view", ...OPERATIONS, ...TEAM, "manage_documents", "manage_store_credit", "export_memory"]),
  staff: new Set<Action>(["view", ...OPERATIONS]),
  viewer: new Set<Action>(["view"]),
};

/** Policy evaluation (WF-000029): may this role perform this action? */
export function can(role: Role, action: Action): boolean {
  return GRANTS[role]?.has(action) ?? false;
}

const RANK: Record<Role, number> = { owner: 3, manager: 2, staff: 1, viewer: 0 };

/**
 * Escalation guard: an actor may only assign/remove roles at or below their own,
 * and may never act on someone more privileged than themselves (BUILD-DRAFT
 * "escalation prevention"). The single owner cannot be demoted or removed here.
 */
export function canManageMember(actor: Role, target: Role, newRole?: Role): boolean {
  if (!can(actor, "change_role")) return false;
  if (target === "owner") return false; // owner is protected
  if (RANK[actor] < RANK[target]) return false; // can't act on someone above you
  if (newRole && RANK[newRole] > RANK[actor]) return false; // can't promote above yourself
  return true;
}

export const roleLabel = (r: Role): string => ROLES.find((x) => x.role === r)?.label ?? r;
