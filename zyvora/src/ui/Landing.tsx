/**
 * Landing page (marketing entry) — shown to signed-out visitors at the app root.
 * "Get started" reveals the sign-in / create-account screen; "local mode" skips
 * the account entirely. Self-contained styling so the marketing look stays
 * distinct from the app shell.
 */
const C = {
  ink: "#15221c", muted: "#5b6b63", paper: "#fbfaf7", card: "#fff",
  green: "#0f8a5f", greenDark: "#0b6b4a", line: "#e6e4dd",
};

const card: React.CSSProperties = {
  background: C.card, border: `1px solid ${C.line}`, borderRadius: 14, padding: 22,
};
const pill: React.CSSProperties = {
  display: "inline-block", fontSize: 12, fontWeight: 700, letterSpacing: ".08em",
  textTransform: "uppercase", color: C.green, marginBottom: 10,
};

function FeatureCard({ title, body }: { title: string; body: string }) {
  return (
    <div style={card}>
      <h3 style={{ fontSize: 17, margin: "0 0 6px" }}>{title}</h3>
      <p style={{ fontSize: 14.5, color: C.muted, margin: 0 }}>{body}</p>
    </div>
  );
}

export function Landing({ onGetStarted, onUseLocal }: { onGetStarted: () => void; onUseLocal: () => void }) {
  const btn: React.CSSProperties = {
    display: "inline-block", background: C.green, color: "#fff", padding: "12px 26px",
    borderRadius: 10, fontWeight: 600, border: "none", cursor: "pointer", fontSize: 15,
  };
  const ghost: React.CSSProperties = {
    ...btn, background: "transparent", color: C.ink, border: `1px solid ${C.line}`,
  };
  const grid: React.CSSProperties = {
    display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: 18,
  };

  return (
    <div style={{ background: C.paper, color: C.ink, minHeight: "100vh", lineHeight: 1.6 }}>
      <div style={{ maxWidth: 1040, margin: "0 auto", padding: "0 24px" }}>
        <header style={{ padding: "22px 0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ fontWeight: 800, letterSpacing: ".24em", fontSize: 18 }}>ZYVORA</div>
          <button style={ghost} onClick={onGetStarted}>Sign in</button>
        </header>

        <div style={{ padding: "64px 0 52px", textAlign: "center" }}>
          <h1 style={{ fontSize: "clamp(30px,5vw,50px)", lineHeight: 1.15, fontWeight: 800, maxWidth: 820, margin: "0 auto 18px" }}>
            Your business has numbers.<br />
            <span style={{ color: C.green }}>ZYVORA gives them a voice.</span>
          </h1>
          <p style={{ fontSize: 19, color: C.muted, maxWidth: 640, margin: "0 auto 30px" }}>
            The Decision Operating System for e-commerce and Cash-on-Delivery stores. Orders, cash,
            stock, and customers become one truth — and every morning, ZYVORA tells you what deserves
            a decision, with the reasons and the evidence.
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <button style={btn} onClick={onGetStarted}>Start free — 14-day trial</button>
            <button style={ghost} onClick={onUseLocal}>Try on this device (no account)</button>
          </div>
          <div style={{ fontSize: 14, color: C.muted, marginTop: 12 }}>
            No card to start · Your data is exportable at any time · Works in any currency
          </div>
        </div>

        <section style={{ padding: "48px 0" }}>
          <span style={pill}>What it does</span>
          <h2 style={{ fontSize: 28, marginBottom: 8 }}>From raw numbers to clear decisions</h2>
          <p style={{ color: C.muted, maxWidth: 640, marginBottom: 32 }}>
            Most tools show you dashboards. ZYVORA reads them for you and answers the only question
            that matters: <strong>what should I decide today?</strong>
          </p>
          <div style={grid}>
            <FeatureCard title="Daily decision briefing" body="Every insight comes with a claim, the reasoning, the evidence behind it, and honest confidence — never a mystery number." />
            <FeatureCard title="COD-native orders" body="Pending → confirmed → shipped → delivered or refused. Courier cash tracking, refusal-rate alerts, and WhatsApp confirmations to cut refusals." />
            <FeatureCard title="Real profit, not vanity revenue" body="P&L per month, per-product and per-order profitability, break-even, goals, and a simulator — one calculation owner per metric." />
            <FeatureCard title="Inventory that thinks ahead" body="Stockout forecasts, purchase orders, incoming stock — and alerts that go quiet once you've already reordered." />
            <FeatureCard title="Customers with memory" body="Lifetime value, COD reliability score, at-risk detection, contact log, follow-ups — and WhatsApp/SMS from the profile." />
            <FeatureCard title="Ask ZYVORA" body="Ask in plain language. Answers come grounded on your real data — and it says 'I don't have that yet' instead of inventing." />
          </div>
        </section>

        <section style={{ padding: "48px 0" }}>
          <div style={{ background: "#10231b", color: "#e8efe9", borderRadius: 18, padding: "44px 34px" }}>
            <span style={pill}>Why it's different</span>
            <h2 style={{ fontSize: 28, marginBottom: 22, color: "#fff" }}>Built on promises, not features</h2>
            <div style={grid}>
              {[
                ["Your memory is yours", "Every fact your business learns is permanent, append-only, and exportable in one click. No lock-in, ever."],
                ["Honesty is non-negotiable", "ZYVORA states confidence, shows its evidence, and admits what it doesn't know. It advises — you decide."],
                ["One source of truth", "Every metric has exactly one owner. The chart, the report, and the answer always agree — by architecture."],
              ].map(([t, b]) => (
                <div key={t} style={{ ...card, background: "rgba(255,255,255,.05)", borderColor: "rgba(255,255,255,.12)" }}>
                  <h3 style={{ fontSize: 17, margin: "0 0 6px", color: "#fff" }}>{t}</h3>
                  <p style={{ fontSize: 14.5, color: "#b9c8bf", margin: 0 }}>{b}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section style={{ padding: "48px 0", textAlign: "center" }}>
          <span style={pill}>Pricing</span>
          <h2 style={{ fontSize: 28, marginBottom: 20 }}>One plan. Everything included.</h2>
          <div style={{ ...card, maxWidth: 420, margin: "0 auto", padding: "36px 30px" }}>
            <div style={{ fontSize: 40, fontWeight: 800 }}>ZYVORA Pro</div>
            <p style={{ color: C.muted }}>14-day free trial, then a simple monthly subscription. Cancel anytime from your own billing portal.</p>
            <ul style={{ listStyle: "none", textAlign: "left", margin: "22px 0", padding: 0, fontSize: 15 }}>
              {["Unlimited orders, products & customers", "Team accounts with roles & permissions",
                "AI assistant grounded on your data", "WhatsApp & SMS customer messaging",
                "Cloud sync + offline protection", "Full Business Memory export, always"].map((f) => (
                <li key={f} style={{ padding: "7px 0 7px 26px", position: "relative" }}>
                  <span style={{ position: "absolute", left: 2, color: C.green, fontWeight: 700 }}>✓</span>{f}
                </li>
              ))}
            </ul>
            <button style={btn} onClick={onGetStarted}>Start your free trial</button>
          </div>
        </section>

        <footer style={{ padding: "40px 0", borderTop: `1px solid ${C.line}`, color: C.muted, fontSize: 14, display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
          <div><strong>ZYVORA</strong> — One business. One truth. Clear decisions.</div>
          <div>
            <a href="/terms.html" style={{ color: C.green, textDecoration: "none" }}>Terms</a>{" · "}
            <a href="/privacy.html" style={{ color: C.green, textDecoration: "none" }}>Privacy</a>{" · © 2026 ZYFORA"}
          </div>
        </footer>
      </div>
    </div>
  );
}
