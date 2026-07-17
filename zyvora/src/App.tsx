/**
 * ZYVORA application shell.
 * One business, one Workspace, one truth (CODEX 00 D.1 layer 1).
 *
 * Two persistence modes (Wave 0):
 *  - Account mode: Supabase Auth + server-side Business Memory (CloudMemory),
 *    Workspace-isolated by RLS, offline outbox for integrity.
 *  - Local device mode: browser-only (BusinessMemory) — always available.
 */
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
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
import { CommandPalette } from "./ui/CommandPalette";
import { Toasts } from "./ui/toast";
import { DialogHost, appConfirm } from "./ui/dialog";
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

type NavItem = { id: View; label: string; icon: IconName };

/**
 * Commerce-admin information architecture: a short home section, the resources
 * people operate every day, then analysis and workspace administration. The
 * groups are visual only; they do not change permissions or business logic.
 */
const NAV_GROUPS: { label: string; items: NavItem[] }[] = [
  {
    label: "Overview",
    items: [
      { id: "today", label: "Today", icon: "today" },
      { id: "notifications", label: "Notifications", icon: "bell" },
    ],
  },
  {
    label: "Commerce",
    items: [
      { id: "orders", label: "Orders", icon: "orders" },
      { id: "customers", label: "Customers", icon: "customers" },
      { id: "inventory", label: "Inventory", icon: "inventory" },
      { id: "promos", label: "Promos", icon: "promos" },
    ],
  },
  {
    label: "Insights",
    items: [
      { id: "finance", label: "Finance", icon: "finance" },
      { id: "analytics", label: "Analytics", icon: "analytics" },
      { id: "ask", label: "Ask ZYVORA", icon: "ask" },
    ],
  },
  {
    label: "Workspace",
    items: [
      { id: "import", label: "Import", icon: "import" },
      { id: "team", label: "Team", icon: "team" },
      { id: "billing", label: "Billing", icon: "billing" },
      { id: "memory", label: "Business Memory", icon: "memory" },
    ],
  },
];

const VIEW_META: Record<View, { title: string; section: string }> = {
  today: { title: "Today", section: "Overview" },
  notifications: { title: "Notifications", section: "Overview" },
  orders: { title: "Orders", section: "Commerce" },
  customers: { title: "Customers", section: "Commerce" },
  inventory: { title: "Inventory", section: "Commerce" },
  promos: { title: "Promos", section: "Commerce" },
  finance: { title: "Finance", section: "Insights" },
  analytics: { title: "Analytics", section: "Insights" },
  ask: { title: "Ask ZYVORA", section: "Insights" },
  import: { title: "Import", section: "Workspace" },
  team: { title: "Team", section: "Workspace" },
  billing: { title: "Billing", section: "Workspace" },
  memory: { title: "Business Memory", section: "Workspace" },
};

const ALL_VIEWS = new Set<View>(Object.keys(VIEW_META) as View[]);
const viewFromLocation = (): View | null => {
  const candidate = window.location.hash.replace(/^#\/?/, "").split("/")[0] as View;
  return ALL_VIEWS.has(candidate) ? candidate : null;
};

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

  if (!ready) return <LoadingShell />;
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
        <label className="auth-label" htmlFor="auth-email">Email</label>
        <input
          id="auth-email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          type="email"
          autoComplete="email"
          autoFocus
        />
        <label className="auth-label" htmlFor="auth-password">Password</label>
        <input
          id="auth-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Your password"
          type="password"
          autoComplete="current-password"
          style={{ marginTop: 0 }}
        />
        {message && <p role="status" style={{ fontSize: 14 }}>{message}</p>}
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

  if (phase === "loading") return <LoadingShell />;
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

/** Skeleton shell — perceived-performance placeholder while cloud data loads. */
function LoadingShell() {
  return (
    <div className="app" aria-busy="true" aria-label="Loading ZYVORA">
      <div className="main skeleton-page">
        <div className="skeleton" style={{ height: 34, width: 220 }} />
        <div className="skeleton" style={{ height: 16, width: 340 }} />
        <div className="skeleton" style={{ height: 130 }} />
        <div className="skeleton" style={{ height: 190 }} />
        <div className="skeleton" style={{ height: 190 }} />
      </div>
    </div>
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
        <label className="auth-label" htmlFor="workspace-name">Business name</label>
        <input
          id="workspace-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your business name"
          onKeyDown={(e) => {
            if (e.key === "Enter" && name.trim()) onCreate(name, currency);
          }}
          autoComplete="organization"
          autoFocus
        />
        <div className="actions">
          <label className="sr-only" htmlFor="workspace-currency">Business currency</label>
          <select
            id="workspace-currency"
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
  const [view, setView] = useState<View>(() => viewFromLocation() ?? "today");
  const [cmdOpen, setCmdOpen] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  const navTriggerRef = useRef<HTMLButtonElement>(null);
  const navRef = useRef<HTMLElement>(null);
  const navCloseRef = useRef<HTMLButtonElement>(null);
  const mainRef = useRef<HTMLElement>(null);
  const didNavigateRef = useRef(false);
  const reduceMotion = useReducedMotion();

  const closeNav = () => {
    setNavOpen(false);
    requestAnimationFrame(() => navTriggerRef.current?.focus());
  };

  // Each resource index has a stable URL. This keeps Back/Forward, refresh,
  // bookmarks, and shared links aligned with what is visible on screen.
  useEffect(() => {
    if (!viewFromLocation()) window.history.replaceState({ view: "today" }, "", "#/today");
    const onHistory = () => {
      const next = viewFromLocation();
      if (next) {
        setView(next);
        setNavOpen(false);
      }
    };
    window.addEventListener("popstate", onHistory);
    return () => window.removeEventListener("popstate", onHistory);
  }, []);

  // Global search / command palette on Ctrl(⌘)+K.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCmdOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Make the mobile navigation behave like a real drawer: Escape closes it
  // and the page behind it does not scroll while the drawer is open.
  useEffect(() => {
    if (!navOpen) return;
    const previousOverflow = document.body.style.overflow;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        closeNav();
      }
      if (e.key === "Tab") {
        const focusable = Array.from(
          navRef.current?.querySelectorAll<HTMLElement>('button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])') ?? []
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    requestAnimationFrame(() => navCloseRef.current?.focus());
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [navOpen]);

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
  const currentView = VIEW_META[view];

  const go = (v: View) => {
    didNavigateRef.current = true;
    setView(v);
    setNavOpen(false);
    const nextHash = `#/${v}`;
    if (window.location.hash !== nextHash) window.history.pushState({ view: v }, "", nextHash);
  };

  useEffect(() => {
    document.title = `${VIEW_META[view].title} · ZYVORA`;
    if (!didNavigateRef.current) return;
    didNavigateRef.current = false;
    window.scrollTo({ top: 0, behavior: "auto" });
    requestAnimationFrame(() => mainRef.current?.focus({ preventScroll: true }));
  }, [view]);

  return (
    <div className="app">
      <a className="skip-link" href="#main">Skip to content</a>
      <div className="mobile-bar">
        <button
          ref={navTriggerRef}
          aria-label="Open navigation"
          aria-expanded={navOpen}
          aria-controls="primary-navigation"
          onClick={() => setNavOpen(true)}
        >
          {Icons.menu()}
        </button>
        <span className="wordmark">ZYVORA</span>
        <button aria-label="Search" onClick={() => setCmdOpen(true)}>{Icons.search()}</button>
      </div>
      {navOpen && <button className="nav-overlay" aria-hidden="true" tabIndex={-1} onClick={closeNav} />}
      <nav ref={navRef} id="primary-navigation" className={`nav${navOpen ? " open" : ""}`} aria-label="Primary">
        <div className="nav-brand-row">
          <div className="wordmark">ZYVORA</div>
          <button ref={navCloseRef} className="nav-close" aria-label="Close navigation" onClick={closeNav}>
            {Icons.close()}
          </button>
        </div>
        <div className="workspace-name">
          {workspace.name}
          {onSignOut && (
            <span style={{ display: "block", fontSize: 11 }}>
              {pendingSync > 0 ? `syncing ${pendingSync} change(s)…` : `synced · ${role}`}
            </span>
          )}
        </div>
        <button className="search-trigger" onClick={() => setCmdOpen(true)} aria-label="Search (Ctrl+K)">
          {Icons.ask()}
          Search…
          <kbd>Ctrl K</kbd>
        </button>
        <div className="nav-groups">
          {NAV_GROUPS.map((group) => {
            const items = group.items.filter((n) => n.id !== "billing" || Boolean(onSignOut));
            if (items.length === 0) return null;
            return (
              <section className="nav-group" key={group.label} aria-labelledby={`nav-${group.label.toLowerCase()}`}>
                <div className="nav-group-label" id={`nav-${group.label.toLowerCase()}`}>{group.label}</div>
                {items.map((n) => (
                  <button
                    key={n.id}
                    className={view === n.id ? "active" : ""}
                    aria-current={view === n.id ? "page" : undefined}
                    onClick={() => go(n.id)}
                  >
                    {Icons[n.icon]()}
                    <span>{n.label}</span>
                    {n.id === "notifications" && unread > 0 && (
                      <span className="nav-count" aria-label={`${unread} unread`}>{unread}</span>
                    )}
                  </button>
                ))}
              </section>
            );
          })}
        </div>
        <div className="nav-footer">
          <ThemeButton />
          {isEmpty && can(role, "import_data") && <button onClick={() => seedDemoData(memory)}>Load demo business</button>}
          {can(role, "export_memory") && (
            <button onClick={() => memory.exportJson(workspace.name)}>Export Business Memory</button>
          )}
          {!onSignOut && (
            <button
              onClick={() => {
                void appConfirm({
                  title: "Start a fresh workspace?",
                  body: "This clears the current business data on this device. Export it first if you want a copy — this can't be undone.",
                  confirmLabel: "Clear and start fresh",
                  danger: true,
                }).then((ok) => {
                  if (ok) {
                    localStorage.removeItem("zyvora.workspace");
                    localStorage.removeItem("zyvora.memory." + workspace.id);
                    location.reload();
                  }
                });
              }}
            >
              Start fresh workspace
            </button>
          )}
          {onSignOut && <button onClick={onSignOut}>Sign out</button>}
        </div>
      </nav>
      <div className="workspace-frame" aria-hidden={navOpen || undefined}>
        <header className="topbar">
          <div className="topbar-context" aria-label="Current location">
            <span>{currentView.section}</span>
            <span className="topbar-separator" aria-hidden="true">/</span>
            <strong>{currentView.title}</strong>
          </div>
          <button className="topbar-search" onClick={() => setCmdOpen(true)} aria-label="Search and open command menu">
            {Icons.search()}
            <span>Search ZYVORA</span>
            <kbd>Ctrl K</kbd>
          </button>
          <div className="topbar-status">
            <span className={`sync-state${pendingSync > 0 ? " pending" : ""}`}>
              <i aria-hidden="true" />
              {onSignOut ? (pendingSync > 0 ? "Syncing" : "Synced") : "On this device"}
            </span>
            <span className="workspace-avatar" aria-label={`${workspace.name} workspace`}>
              {workspace.name.trim().slice(0, 2).toUpperCase() || "ZY"}
            </span>
          </div>
        </header>
      <CommandPalette
        open={cmdOpen}
        onClose={() => setCmdOpen(false)}
        state={state}
        navigate={(v) => go(v as View)}
        actions={[
          { label: "New order", icon: "orders", run: () => go("orders") },
          { label: "Ask ZYVORA a question", icon: "ask", run: () => go("ask") },
          { label: "Toggle theme", icon: "today", run: () => cycleTheme() },
          ...(can(role, "export_memory")
            ? [{ label: "Export Business Memory", icon: "memory" as IconName, run: () => memory.exportJson(workspace.name) }]
            : []),
        ]}
      />
      <Toasts />
      <DialogHost />
      <main ref={mainRef} className="main" id="main" tabIndex={-1}>
        <motion.div
          key={view}
          initial={reduceMotion ? false : { opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.22, ease: "easeOut" }}
        >
         <ErrorBoundary key={view}>
          {ent && (
            <TrialBanner daysLeft={ent.trialDaysLeft} expired={!ent.active} onOpenBilling={() => go("billing")} />
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
              onOpenView={(v) => go(v)}
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
          {view === "import" && <ImportView memory={memory} state={state} />}
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
    </div>
  );
}
