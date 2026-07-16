/**
 * ZYVORA application shell.
 * One business, one Workspace, one truth (CODEX 00 D.1 layer 1).
 *
 * Two persistence modes (Wave 0):
 *  - Account mode: Supabase Auth + server-side Business Memory (CloudMemory),
 *    Workspace-isolated by RLS, offline outbox for integrity.
 *  - Local device mode: browser-only (BusinessMemory) — always available.
 */
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import {
  CloudMemory,
  acceptPendingInvitations,
  cloudConfigured,
  createCloudWorkspace,
  fetchEvents,
  fetchMyRole,
  fetchMyWorkspace,
  supabase,
} from "./core/cloud";
import { can, type Role } from "./core/permissions";
import { generateNotifications, loadReadSet } from "./core/notifications";
import { NotificationsView } from "./ui/Notifications";
import { TeamView } from "./ui/Team";
import { BillingView, TrialBanner } from "./ui/Billing";
import { Landing } from "./ui/Landing";
import { cycleTheme, themePref, type ThemePref } from "./core/theme";
import { Icons, type IconName } from "./ui/icons";
import { entitlement, fetchSubscription, type Subscription } from "./core/billing";
import { generateInsights } from "./core/engine";
import { COMMON_CURRENCIES, setActiveCurrency } from "./core/format";
import {
  BusinessMemory,
  createWorkspace,
  loadWorkspace,
  type MemoryStore,
  type WorkspaceMeta,
} from "./core/memory";
import { projectActivities, projectDecisions, projectState } from "./core/projections";
import { seedDemoData } from "./core/seed";
import type { Insight } from "./core/types";
import { motion, useReducedMotion } from "framer-motion";
import { AnalyticsView } from "./ui/Analytics";
import { AskView } from "./ui/Ask";
import { CustomersView, FinanceView, InventoryView } from "./ui/Domains";
import { ImportView } from "./ui/Import";
import { MemoryView } from "./ui/Memory";
import { ErrorBoundary } from "./ui/ErrorBoundary";
import { OrdersView } from "./ui/Orders";
import { PromosView } from "./ui/Promos";
import { Today } from "./ui/Today";

type View =
  | "today" | "notifications" | "orders" | "finance" | "customers"
  | "inventory" | "promos" | "analytics" | "ask" | "import" | "team" | "billing" | "memory";

const NAV: { id: View; label: string; icon: IconName }[] = [
  { id: "today", label: "Today", icon: "today" },
  { id: "notifications", label: "Notifications", icon: "bell" },
  { id: "orders", label: "Orders", icon: "orders" },
  { id: "finance", label: "Finance", icon: "finance" },
  { id: "customers", label: "Customers", icon: "customers" },
  { id: "inventory", label: "Inventory", icon: "inventory" },
  { id: "promos", label: "Promos", icon: "promos" },
  { id: "analytics", label: "Analytics", icon: "analytics" },
  { id: "ask", label: "Ask ZYVORA", icon: "ask" },
  { id: "import", label: "Import", icon: "import" },
  { id: "team", label: "Team", icon: "team" },
  { id: "billing", label: "Billing", icon: "billing" },
  { id: "memory", label: "Business Memory", icon: "memory" },
];

const MODE_KEY = "zyvora.mode";

export default function App() {
  const [mode, setMode] = useState<"cloud" | "local">(() => {
    const saved = localStorage.getItem(MODE_KEY);
    if (saved === "local" || saved === "cloud") return saved;
    return cloudConfigured ? "cloud" : "local";
  });

  if (mode === "cloud" && cloudConfigured && supabase) {
    return (
      <CloudApp
        onUseLocal={() => {
          localStorage.setItem(MODE_KEY, "local");
          setMode("local");
        }}
      />
    );
  }
  return (
    <LocalApp
      onUseCloud={
        cloudConfigured
          ? () => {
              localStorage.setItem(MODE_KEY, "cloud");
              setMode("cloud");
            }
          : undefined
      }
    />
  );
}

// ------------------------------------------------------------------ Local ---

function LocalApp({ onUseCloud }: { onUseCloud?: () => void }) {
  const [workspace, setWorkspace] = useState<WorkspaceMeta | null>(() => loadWorkspace());
  if (!workspace) {
    return (
      <Onboarding
        subtitle="Local device mode: everything stays in this browser."
        onCreate={(name, currency) => setWorkspace(createWorkspace(name, currency))}
        footer={
          onUseCloud && (
            <button className="btn ghost" onClick={onUseCloud}>
              Use an account instead (sync across devices)
            </button>
          )
        }
      />
    );
  }
  return <LocalWorkspace workspace={workspace} />;
}

function LocalWorkspace({ workspace }: { workspace: WorkspaceMeta }) {
  const memory = useMemo(() => new BusinessMemory(workspace.id), [workspace.id]);
  return <Workspace workspace={workspace} memory={memory} />;
}

// ------------------------------------------------------------------ Cloud ---

function CloudApp({ onUseLocal }: { onUseLocal: () => void }) {
  const client = supabase!;
  const [ready, setReady] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    client.auth.getSession().then(({ data }) => {
      setUserId(data.session?.user.id ?? null);
      setReady(true);
    });
    const { data: sub } = client.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user.id ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, [client]);

  if (!ready) return <CenteredNote text="Opening ZYVORA…" />;
  if (!userId) return <SignedOut onUseLocal={onUseLocal} />;
  return <CloudWorkspaceLoader userId={userId} />;
}

/** Signed-out entry: marketing landing first, then the auth screen on "Get started". */
function SignedOut({ onUseLocal }: { onUseLocal: () => void }) {
  const [showAuth, setShowAuth] = useState(false);
  if (showAuth) return <AuthScreen onUseLocal={onUseLocal} onBack={() => setShowAuth(false)} />;
  return <Landing onGetStarted={() => setShowAuth(true)} onUseLocal={onUseLocal} />;
}

function AuthScreen({ onUseLocal, onBack }: { onUseLocal: () => void; onBack?: () => void }) {
  const client = supabase!;
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const signIn = async () => {
    setBusy(true);
    setMessage(null);
    const { error } = await client.auth.signInWithPassword({ email, password });
    if (error) {
      const m = error.message.toLowerCase();
      if (m.includes("email not confirmed"))
        setMessage("This email hasn't been confirmed yet. Click the link in the confirmation email — or ask the owner to turn off email confirmation in Supabase (Authentication → Email) while getting started.");
      else if (m.includes("invalid login"))
        setMessage("Email or password is wrong — or this account was never confirmed. If you just created it, use “Create account” once and check for a confirmation email.");
      else setMessage(error.message);
    }
    setBusy(false);
  };

  const signUp = async () => {
    setBusy(true);
    setMessage(null);
    const { data, error } = await client.auth.signUp({ email, password });
    if (error) setMessage(error.message);
    else if (!data.session)
      setMessage("Account created. Check your email to confirm, then sign in.");
    setBusy(false);
  };

  return (
    <div className="onboarding">
      <div className="panel">
        <div className="wordmark">ZYVORA</div>
        <h1>Your business, from any device.</h1>
        <p>
          Sign in to keep your Business Memory on your account — permanent,
          synced, exportable, and never held hostage.
        </p>
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          type="email"
          autoFocus
        />
        <input
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          type="password"
          style={{ marginTop: 0 }}
        />
        {message && <p style={{ fontSize: 14 }}>{message}</p>}
        <div className="actions">
          <button className="btn" disabled={busy || !email || !password} onClick={signIn}>
            Sign in
          </button>
          <button className="btn ghost" disabled={busy || !email || !password} onClick={signUp}>
            Create account
          </button>
          <button className="btn subtle" onClick={onUseLocal}>
            Continue in local device mode
          </button>
          {onBack && (
            <button className="btn subtle" onClick={onBack}>
              ← Back to overview
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function CloudWorkspaceLoader({ userId }: { userId: string }) {
  const client = supabase!;
  const [phase, setPhase] = useState<"loading" | "onboarding" | "ready" | "error">("loading");
  const [error, setError] = useState("");
  const [workspace, setWorkspace] = useState<WorkspaceMeta | null>(null);
  const [memory, setMemory] = useState<CloudMemory | null>(null);
  const [role, setRole] = useState<Role>("owner");

  const openWorkspace = async (meta: WorkspaceMeta) => {
    const events = await fetchEvents(client, meta.id);
    const myRole = await fetchMyRole(client, meta.id, userId, meta.ownerId);
    setRole(myRole);
    setWorkspace(meta);
    setMemory(new CloudMemory(client, meta.id, events));
    setPhase("ready");
  };

  useEffect(() => {
    (async () => {
      try {
        const { data } = await client.auth.getUser();
        if (data.user?.email) await acceptPendingInvitations(client, data.user.email);
        const meta = await fetchMyWorkspace(client);
        if (meta) await openWorkspace(meta);
        else setPhase("onboarding");
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
        setPhase("error");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  if (phase === "loading") return <CenteredNote text="Loading your Workspace…" />;
  if (phase === "error")
    return (
      <CenteredNote
        text={`${error} — if this is a fresh setup, paste supabase/APPLY_ZYVORA.sql into the project's SQL editor and Run first.`}
      />
    );
  if (phase === "onboarding")
    return (
      <Onboarding
        subtitle="Account mode: your Workspace syncs to your account."
        onCreate={async (name, currency) => {
          try {
            const meta = await createCloudWorkspace(client, userId, name, currency);
            await openWorkspace(meta);
          } catch (e) {
            setError(e instanceof Error ? e.message : String(e));
            setPhase("error");
          }
        }}
      />
    );
  return (
    <Workspace
      workspace={workspace!}
      memory={memory!}
      role={role}
      userId={userId}
      onSignOut={() => void client.auth.signOut()}
    />
  );
}

function CenteredNote({ text }: { text: string }) {
  return (
    <div className="onboarding">
      <div className="panel">
        <div className="wordmark">ZYVORA</div>
        <p>{text}</p>
      </div>
    </div>
  );
}

// ------------------------------------------------------------- Onboarding ---

function Onboarding({
  onCreate,
  subtitle,
  footer,
}: {
  onCreate: (name: string, currency: string) => void;
  subtitle?: string;
  footer?: React.ReactNode;
}) {
  const [name, setName] = useState("");
  const [currency, setCurrency] = useState("USD");
  return (
    <div className="onboarding">
      <div className="panel">
        <div className="wordmark">ZYVORA</div>
        <h1>One business. One truth. Clear decisions.</h1>
        <p>
          Name your business and choose its currency to open its Workspace — ZYVORA
          works wherever your business does. Everything it learns from here on
          belongs to you — permanent, exportable, never held hostage.
          {subtitle && (
            <>
              <br />
              <em>{subtitle}</em>
            </>
          )}
        </p>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your business name"
          onKeyDown={(e) => {
            if (e.key === "Enter" && name.trim()) onCreate(name, currency);
          }}
          autoFocus
        />
        <div className="actions">
          <select
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            aria-label="Business currency"
            style={{
              padding: "10px 12px",
              borderRadius: 8,
              border: "1px solid var(--line)",
              background: "var(--surface)",
            }}
          >
            {COMMON_CURRENCIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.label}
              </option>
            ))}
          </select>
          <button className="btn" disabled={!name.trim()} onClick={() => onCreate(name, currency)}>
            Open my Workspace
          </button>
          {footer}
        </div>
      </div>
    </div>
  );
}

/** Theme cycle button — auto follows the OS; one click walks auto → light → dark. */
function ThemeButton() {
  const [pref, setPref] = useState<ThemePref>(() => themePref());
  const label = pref === "auto" ? "Theme: Auto" : pref === "light" ? "Theme: Light" : "Theme: Dark";
  return <button onClick={() => setPref(cycleTheme())}>{label}</button>;
}

// -------------------------------------------------------------- Workspace ---

function Workspace({
  workspace,
  memory,
  onSignOut,
  role = "owner",
  userId = "",
}: {
  workspace: WorkspaceMeta;
  memory: MemoryStore;
  onSignOut?: () => void;
  role?: Role;
  userId?: string;
}) {
  setActiveCurrency(workspace.currency);
  const [view, setView] = useState<View>("today");
  const reduceMotion = useReducedMotion();

  // Billing entitlement (cloud mode only; local mode is free forever).
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  useEffect(() => {
    if (onSignOut) void fetchSubscription().then(setSubscription);
  }, [onSignOut]);
  const ent = onSignOut && subscription
    ? entitlement(subscription, workspace.createdAt)
    : null;

  // Re-render whenever Business Memory grows (append-only, so version = length + sync state).
  useSyncExternalStore(
    (cb) => memory.subscribe(cb),
    () => memory.all().length + (memory instanceof CloudMemory ? memory.pendingSync * 0.5 : 0)
  );

  const events = memory.all();
  const state = useMemo(() => projectState(events), [events, events.length]);
  const decisions = useMemo(() => projectDecisions(events), [events, events.length]);
  const insights = useMemo(() => generateInsights(state, decisions), [state, decisions]);
  const notifications = useMemo(
    () => generateNotifications(state, insights, projectActivities(events)),
    [state, insights, events]
  );
  const [notifVersion, setNotifVersion] = useState(0);
  const unread = useMemo(() => {
    const read = loadReadSet(workspace.id);
    return notifications.filter((n) => !read.has(n.key) && n.priority !== "low").length;
    // notifVersion bumps when the user dismisses, so the badge updates live.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notifications, view, notifVersion]);

  /** Lifecycle stages 8 & 11: the human decides; interpretation + decision enter Memory. */
  const onDecide = (
    insight: Insight,
    optionId: string,
    optionLabel: string,
    rationale: string
  ) => {
    memory.append("interpretation", "insight_presented", {
      decisionKey: insight.decisionKey,
      claim: insight.claim,
      reasoning: insight.reasoning,
      evidence: insight.evidence,
      confidence: insight.confidence,
      confidenceNote: insight.confidenceNote,
    });
    memory.append("decision", "decision_recorded", {
      decisionKey: insight.decisionKey,
      claim: insight.claim,
      layer: insight.layer,
      optionId,
      optionLabel,
      rationale,
    });
  };

  const isEmpty = events.length === 0;
  const pendingSync = memory instanceof CloudMemory ? memory.pendingSync : 0;

  return (
    <div className="app">
      <nav className="nav">
        <div className="wordmark">ZYVORA</div>
        <div className="workspace-name">
          {workspace.name}
          {onSignOut && (
            <span style={{ display: "block", fontSize: 11 }}>
              {pendingSync > 0 ? `syncing ${pendingSync} change(s)…` : `synced · ${role}`}
            </span>
          )}
        </div>
        {NAV.filter((n) => n.id !== "billing" || Boolean(onSignOut)).map((n) => (
          <button key={n.id} className={view === n.id ? "active" : ""} onClick={() => setView(n.id)}>
            {Icons[n.icon]()}
            {n.label}
            {n.id === "notifications" && unread > 0 && (
              <span style={{
                marginLeft: 8, background: "var(--amber)", color: "#fff", borderRadius: 999,
                fontSize: 11, fontWeight: 700, padding: "1px 7px",
              }}>{unread}</span>
            )}
          </button>
        ))}
        <div className="nav-footer">
          <ThemeButton />
          {isEmpty && can(role, "import_data") && <button onClick={() => seedDemoData(memory)}>Load demo business</button>}
          {can(role, "export_memory") && (
            <button onClick={() => memory.exportJson(workspace.name)}>Export Business Memory</button>
          )}
          {!onSignOut && (
            <button
              onClick={() => {
                if (
                  confirm(
                    "Start a fresh workspace? This clears the current business data on this device. Export it first if you want a copy — this can't be undone."
                  )
                ) {
                  localStorage.removeItem("zyvora.workspace");
                  localStorage.removeItem("zyvora.memory." + workspace.id);
                  location.reload();
                }
              }}
            >
              Start fresh workspace
            </button>
          )}
          {onSignOut && <button onClick={onSignOut}>Sign out</button>}
        </div>
      </nav>
      <main className="main">
        <motion.div
          key={view}
          initial={reduceMotion ? false : { opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.22, ease: "easeOut" }}
        >
         <ErrorBoundary key={view}>
          {ent && (
            <TrialBanner daysLeft={ent.trialDaysLeft} expired={!ent.active} onOpenBilling={() => setView("billing")} />
          )}
          {role === "viewer" && (
            <div className="quiet" style={{ marginBottom: 16, textAlign: "left" }}>
              You have <strong>view-only</strong> access to {workspace.name}. You can see decisions and
              reports; changes are reserved for staff and managers.
            </div>
          )}
          {view === "today" && (
            <Today workspaceName={workspace.name} state={state} insights={insights} onDecide={onDecide} />
          )}
          {view === "notifications" && (
            <NotificationsView
              state={state}
              notifications={notifications}
              workspaceId={workspace.id}
              onOpenView={(v) => setView(v)}
              onChange={() => setNotifVersion((v) => v + 1)}
            />
          )}
          {view === "orders" && <OrdersView state={state} memory={memory} workspaceName={workspace.name} />}
          {view === "finance" && <FinanceView state={state} memory={memory} />}
          {view === "customers" && <CustomersView state={state} memory={memory} />}
          {view === "inventory" && <InventoryView state={state} memory={memory} />}
          {view === "promos" && <PromosView state={state} memory={memory} />}
          {view === "analytics" && <AnalyticsView state={state} />}
          {view === "ask" && <AskView state={state} />}
          {view === "import" && <ImportView memory={memory} />}
          {view === "team" && (
            <TeamView
              client={onSignOut ? supabase : null}
              workspaceId={workspace.id}
              myRole={role}
              myUserId={userId}
              ownerId={workspace.ownerId ?? ""}
            />
          )}
          {view === "billing" && (
            <BillingView workspaceCreatedAt={workspace.createdAt} isOwner={role === "owner"} />
          )}
          {view === "memory" && <MemoryView memory={memory} />}
         </ErrorBoundary>
        </motion.div>
      </main>
    </div>
  );
}
