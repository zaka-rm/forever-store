/**
 * Landing page (marketing entry) — shown to signed-out visitors at the app root.
 * Theme-aware (all tokens), structured like the best commerce-admin homepages:
 * hero copy beside a real product preview, feature grid with icons, a 3-step
 * "how it works", the constitutional promises band, and single-plan pricing.
 * Styles live in styles.css under `.landing`.
 */
import { Icons } from "./icons";

const FEATURES: { icon: keyof typeof Icons; title: string; body: string }[] = [
  { icon: "compass", title: "Daily decision briefing", body: "Every insight comes with a claim, the reasoning, the evidence behind it, and honest confidence — never a mystery number." },
  { icon: "truck", title: "COD-native orders", body: "Pending → confirmed → shipped → delivered or refused. Courier cash tracking, refusal-rate alerts, and WhatsApp confirmations." },
  { icon: "scale", title: "Real profit, not vanity revenue", body: "P&L, per-product and per-order profitability, break-even, goals, and a simulator — one calculation owner per metric." },
  { icon: "boxes", title: "Inventory that thinks ahead", body: "Stockout forecasts, purchase orders, incoming stock — and alerts that go quiet once you've already reordered." },
  { icon: "heart", title: "Customers with memory", body: "Lifetime value, COD reliability score, at-risk detection, follow-ups — and WhatsApp/SMS from the profile." },
  { icon: "chat", title: "Ask ZYVORA", body: "Ask in plain language. Answers come grounded on your real data — and it says \"I don't have that yet\" instead of inventing." },
];

const PROMISES: { icon: keyof typeof Icons; title: string; body: string }[] = [
  { icon: "lock", title: "Your memory is yours", body: "Every fact your business learns is permanent, append-only, and exportable in one click. No lock-in, ever." },
  { icon: "eye", title: "Honesty is non-negotiable", body: "ZYVORA states confidence, shows its evidence, and admits what it doesn't know. It advises — you decide." },
  { icon: "anchor", title: "One source of truth", body: "Every metric has exactly one owner. The chart, the report, and the answer always agree — by architecture." },
];

/** Non-interactive, hand-built preview of the Today briefing — the hero image IS the product. */
function Preview() {
  return (
    <div className="preview" aria-hidden="true">
      <div className="chrome"><i /><i /><i /></div>
      <div className="body">
        <p className="p-eyebrow">Thursday 16 July · Your store</p>
        <p className="p-title">Good morning.</p>
        <div className="p-card">
          <div className="p-meta">
            <span className="badge">tactical</span>
            <span className="badge domain">inventory</span>
          </div>
          <p className="p-claim">"Aloe Vera Gel" will run out 13 days before restock can arrive.</p>
          <p className="p-why">Why am I seeing this? — evidence &amp; confidence</p>
        </div>
        <div className="p-card amber">
          <div className="p-meta">
            <span className="badge strategic">strategic</span>
            <span className="badge domain">finance</span>
          </div>
          <p className="p-claim">Revenue is down 18% versus your own 3-month average.</p>
          <p className="p-why">2–4 options, each with a falsifier — the choice stays yours.</p>
        </div>
        <div className="p-stats">
          <div className="p-stat"><div className="k">Cash</div><div className="v">24,380</div></div>
          <div className="p-stat"><div className="k">Pending COD</div><div className="v">6,150</div></div>
          <div className="p-stat"><div className="k">Rev · 30d</div><div className="v">41,900</div></div>
        </div>
      </div>
    </div>
  );
}

export function Landing({ onGetStarted, onUseLocal }: { onGetStarted: () => void; onUseLocal: () => void }) {
  return (
    <div className="landing">
      <div className="shell">
        <header>
          <div className="wordmark">ZYVORA</div>
          <nav className="land-links">
            <a href="#features">Features</a>
            <a href="#how">How it works</a>
            <a href="#pricing">Pricing</a>
            <button className="btn subtle" onClick={onGetStarted}>Sign in</button>
          </nav>
        </header>

        <div className="hero-grid">
          <div className="hero-copy">
            <h1>Your business has numbers. <em>ZYVORA gives them a voice.</em></h1>
            <p>
              The Decision Operating System for e-commerce and Cash-on-Delivery stores.
              Orders, cash, stock, and customers become one truth — and every morning,
              ZYVORA tells you what deserves a decision, with reasons and evidence.
            </p>
            <div className="cta-row">
              <button className="btn" onClick={onGetStarted}>Start free — 14-day trial</button>
              <button className="btn ghost" onClick={onUseLocal}>Try on this device</button>
            </div>
            <p className="cta-note">No card to start · Your data is exportable at any time · Works in any currency</p>
          </div>
          <Preview />
        </div>

        <section id="features">
          <span className="pill">What it does</span>
          <h2 className="land-h2">From raw numbers to clear decisions</h2>
          <p className="lead">
            Most tools show you dashboards. ZYVORA reads them for you and answers the only
            question that matters: <strong>what should I decide today?</strong>
          </p>
          <div className="feature-grid">
            {FEATURES.map((f) => (
              <div className="feature" key={f.title}>
                <div className="f-icon">{Icons[f.icon]()}</div>
                <h3>{f.title}</h3>
                <p>{f.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="how">
          <span className="pill">How it works</span>
          <h2 className="land-h2">Three steps, every day</h2>
          <p className="lead">No setup project, no consultants. Record what happens; ZYVORA does the reading.</p>
          <div className="steps">
            <div className="step">
              <h3>Record what happens</h3>
              <p>Orders, expenses, stock — enter them in seconds, import a CSV, or connect your store. Every fact is kept forever.</p>
            </div>
            <div className="step">
              <h3>See one truth</h3>
              <p>Cash, profit, customers, and inventory derived from the same memory — figures that never disagree with each other.</p>
            </div>
            <div className="step">
              <h3>Decide with evidence</h3>
              <p>Each morning: the few decisions worth your judgment, with options, trade-offs, and what would prove them wrong.</p>
            </div>
          </div>
        </section>

        <section>
          <div className="promises">
            <span className="pill">Why it's different</span>
            <h2 className="land-h2">Built on promises, not features</h2>
            <div className="feature-grid" style={{ marginTop: 24 }}>
              {PROMISES.map((p) => (
                <div className="feature" key={p.title}>
                  <div className="f-icon">{Icons[p.icon]()}</div>
                  <h3>{p.title}</h3>
                  <p>{p.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="pricing">
          <span className="pill">Pricing</span>
          <h2 className="land-h2" style={{ textAlign: "center" }}>One plan. Everything included.</h2>
          <div className="price-card" style={{ marginTop: 26 }}>
            <div className="plan">ZYVORA Pro</div>
            <p className="plan-note">14-day free trial, then a simple monthly subscription. Cancel anytime from your own billing portal.</p>
            <ul className="checks">
              <li>Unlimited orders, products &amp; customers</li>
              <li>Team accounts with roles &amp; permissions</li>
              <li>AI assistant grounded on your data</li>
              <li>WhatsApp &amp; SMS customer messaging</li>
              <li>Cloud sync + offline protection</li>
              <li>Full Business Memory export, always</li>
            </ul>
            <button className="btn" onClick={onGetStarted}>Start your free trial</button>
          </div>
        </section>

        <footer>
          <div><strong>ZYVORA</strong> — One business. One truth. Clear decisions.</div>
          <div>
            <a href="/terms.html">Terms</a> · <a href="/privacy.html">Privacy</a> · © 2026 ZYFORA
          </div>
        </footer>
      </div>
    </div>
  );
}
