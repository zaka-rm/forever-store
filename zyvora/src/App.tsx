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
  cloudConfigured,
  createCloudWorkspace,
  fetchEvents,
  fetchMyWorkspace,
  supabase,
} from "./core/cloud";
import { generateInsights } from "./core/engine";
import { COMMON_CURRENCIES, setActiveCurrency } from "./core/format";
import {
  BusinessMemory,
  createWorkspace,
  loadWorkspace,
  type MemoryStore,
  type WorkspaceMeta,
} from "./core/memory";
import { projectDecisions, projectState } from "./core/projections";
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
  | "today" | "orders" | "finance" | "customers"
  | "inventory" | "promos" | "analytics" | "ask" | "import" | "memory";

const NAV: { id: View; label: string }[] = [
  { id: "today", label: "Today" },
  { id: "orders", label: "Orders" },
  { id: "finance", label: "Finance" },
  { id: "customers", label: "Customers" },
  { id: "inventory", label: "Inventory" },
  { id: "promos", label: "Promos" },
  { id: "analytics", label: "Analytics" },
  { id: "ask", label: "Ask ZYVORA" },
  { id: "import", label: "Import" },
  { id: "memory", label: "Business Memory" },
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
  if (!userId) return <AuthScreen onUseLocal={onUseLocal} />;
  return <CloudWorkspaceLoader userId={userId} />;
}

function AuthScreen({ onUseLocal }: { onUseLocal: () => void }) {
  const client = supabase!;
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const signIn = async () => {
    setBusy(true);
    setMessage(null);
    const { error } = await client.auth.signInWithPassword({ email, password });
    if (error) setMessage(error.message);
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

  const openWorkspace = async (meta: WorkspaceMeta) => {
    const events = await fetchEvents(client, meta.id);
    setWorkspace(meta);
    setMemory(new CloudMemory(client, meta.id, events));
    setPhase("ready");
  };

  useEffect(() => {
    (async () => {
      try {
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
        text={`${error} — if this is a fresh setup, apply supabase/40_zyvora.sql to the project first.`}
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

// -------------------------------------------------------------- Workspace ---

function Workspace({
  workspace,
  memory,
  onSignOut,
}: {
  workspace: WorkspaceMeta;
  memory: MemoryStore;
  onSignOut?: () => void;
}) {
  setActiveCurrency(workspace.currency);
  const [view, setView] = useState<View>("today");
  const reduceMotion = useReducedMotion();

  // Re-render whenever Business Memory grows (append-only, so version = length + sync state).
  useSyncExternalStore(
    (cb) => memory.subscribe(cb),
    () => memory.all().length + (memory instanceof CloudMemory ? memory.pendingSync * 0.5 : 0)
  );

  const events = memory.all();
  const state = useMemo(() => projectState(events), [events, events.length]);
  const decisions = useMemo(() => projectDecisions(events), [events, events.length]);
  const insights = useMemo(() => generateInsights(state, decisions), [state, decisions]);

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
              {pendingSync > 0 ? `syncing ${pendingSync} change(s)…` : "synced to your account"}
            </span>
          )}
        </div>
        {NAV.map((n) => (
          <button key={n.id} className={view === n.id ? "active" : ""} onClick={() => setView(n.id)}>
            {n.label}
          </button>
        ))}
        <div className="nav-footer">
          {isEmpty && <button onClick={() => seedDemoData(memory)}>Load demo business</button>}
          <button onClick={() => memory.exportJson(workspace.name)}>Export Business Memory</button>
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
          {view === "today" && (
            <Today workspaceName={workspace.name} state={state} insights={insights} onDecide={onDecide} />
          )}
          {view === "orders" && <OrdersView state={state} memory={memory} workspaceName={workspace.name} />}
          {view === "finance" && <FinanceView state={state} memory={memory} />}
          {view === "customers" && <CustomersView state={state} />}
          {view === "inventory" && <InventoryView state={state} memory={memory} />}
          {view === "promos" && <PromosView state={state} memory={memory} />}
          {view === "analytics" && <AnalyticsView state={state} />}
          {view === "ask" && <AskView state={state} />}
          {view === "import" && <ImportView memory={memory} />}
          {view === "memory" && <MemoryView memory={memory} />}
         </ErrorBoundary>
        </motion.div>
      </main>
    </div>
  );
}
