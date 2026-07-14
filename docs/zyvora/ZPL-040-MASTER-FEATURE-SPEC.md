<!-- LIBRARY REGISTRATION — ZPL-040 · registered 2026-07-11 · Founder directive
     AMENDMENT (Founder, 2026-07-11): ZYVORA is GLOBAL-FIRST. §15's "MAD/DH base
     currency" is amended to: currency, country, locale, and fiscal settings are
     chosen per Workspace at onboarding (§1 already provides this); no currency,
     country, or jurisdiction is hardcoded anywhere in the platform. Localization
     ships en/fr/ar with RTL as the first set and is extensible, not exhaustive.
     Recorded in LIBRARY-INDEX.md; supersedes any Morocco-default reading. -->

# ZYVORA MASTER PRODUCT FEATURE & IMPLEMENTATION PROMPT

Complete Decision Operating System — Features, Connections, Workflows, Data, AI, and Build Instructions

## Purpose

This master prompt commissions the complete ZYVORA product and implementation.

## Binding Product Principles

- ZYVORA is a Decision Operating System, not a loose collection of ERP modules.

- Every business fact has one authoritative source and one calculation owner.

- Every capability must identify the business decision it improves.

- Complexity belongs inside the platform, not inside the client’s mind.

- Every insight and recommendation must expose evidence, freshness, assumptions, and uncertainty.

- AI assists, explains, drafts, and recommends; consequential decisions remain human-controlled.

- Every Domain communicates through approved commands, APIs, and versioned events; no hidden database coupling.

- Permissions, auditability, accessibility, security, and observability are built into every capability.

- Documentation and code must remain traceable from principle to release.

- Build in vertical slices that deliver usable business outcomes, not disconnected technical layers.



## Connected Platform Model

Client Channels & Existing Systems  →  Integration & Import Layer  →  Workspace and Shared Business Graph  →  Business Domains  →  Decision Engine & Business Memory  →  Guidance and Actions  →  Outcomes and Continuous Learning

## How a Client Connects Their Business

1. Create identity and business Workspace.

2. Choose country, currency, language, fiscal settings, and industry template.

3. Connect existing store, payment, shipping, bank, accounting, communication, and advertising systems.

4. Import historical products, customers, orders, inventory, expenses, and balances.

5. Map fields and select the authoritative source for each business fact.

6. Run validation, duplicate detection, reconciliation, and data-quality scoring.

7. Approve opening balances, costs, inventory, goals, users, permissions, and automation rules.

8. Generate the first business snapshot, health score, forecasts, and ranked decision queue.

9. Continuously synchronize changes while exposing freshness, errors, and conflicts.

# 1. Client Acquisition, Signup, and Business Onboarding

## Purpose

Convert a visitor into a configured ZYVORA Workspace that already understands the structure, currency, operating model, sales channels, and priorities of the client’s business.

## Required Features

**Public product website.** Landing pages, pricing, feature tours, industry pages, trust center, security page, documentation preview, demo booking, trial activation, and localized content.

**Account creation.** Email/password, Google/Microsoft sign-in, email verification, terms acceptance, anti-abuse controls, and optional invitation acceptance.

**Business creation wizard.** Business name, legal name, country, timezone, base currency, fiscal year, tax profile, industry, team size, operating model, sales channels, warehouses, and business goals.

**Industry templates.** Preconfigured starting structures for e-commerce, retail, services, agency, manufacturing, distribution, restaurant, and other future verticals.

**Data connection wizard.** Connect existing store, import products/customers/orders, upload CSV/Excel, connect payment providers, shipping carriers, accounting tools, bank feeds, email, and advertising platforms.

**Guided setup checklist.** Products imported, opening inventory recorded, costs added, expenses configured, users invited, channels connected, first goals set, and first daily briefing activated.

**Business health baseline.** Calculate initial data completeness, inventory quality, margin coverage, customer history, cash visibility, and readiness score.

**Onboarding AI guide.** Explain each step, detect missing data, recommend the fastest setup path, and never invent business values.

## How It Connects

- Creates the Workspace used by every module.

- Feeds Organization, Identity, Permissions, Data Import, Integration, and Business Memory services.

- Creates baseline financial and operational snapshots for future comparisons.



## End-to-End Workflow

1. Visitor selects plan or trial.

2. Creates personal identity.

3. Creates or joins a business Workspace.

4. Selects industry template.

5. Connects systems or imports data.

6. Maps fields and resolves duplicates.

7. ZYVORA validates data quality.

8. Founder reviews opening balances, costs, inventory, and goals.

9. Workspace becomes operational and the first briefing is generated.

## Core Data Objects

User, Organization, Workspace, Subscription, BusinessProfile, FiscalSettings, IntegrationConnection, ImportJob, DataMapping, OnboardingTask, BusinessGoal

## Decisions This Domain Must Improve

- Which systems should be connected first?

- Is the imported data trustworthy enough to activate decisions?

- What setup steps will create immediate value?



# 2. Organization, Workspace, Team, Roles, and Permissions

## Purpose

Allow one person or a growing company to operate safely with multiple businesses, stores, warehouses, departments, and team members.

## Required Features

**Multi-organization support.** A user may own or participate in several organizations while data remains completely isolated.

**Multi-workspace support.** Separate businesses, legal entities, brands, or operating units under one account.

**Teams and departments.** Finance, operations, sales, support, marketing, warehouse, management, and custom teams.

**Role-based access control.** Owner, administrator, finance manager, accountant, inventory manager, sales agent, support agent, marketer, analyst, viewer, and custom roles.

**Attribute-based restrictions.** Restrict by warehouse, store, region, customer segment, monetary threshold, or record ownership.

**Approval authority.** Expense approvals, refunds, discounts, stock adjustments, purchase orders, payouts, automation activation, and sensitive exports.

**Invitation lifecycle.** Invite, resend, expire, revoke, accept, transfer ownership, suspend, reactivate.

**Session and device control.** Active sessions, trusted devices, logout-all, suspicious login alerts, and mandatory MFA for privileged users.

**Delegation and temporary access.** Time-bound permissions for accountants, auditors, agencies, and seasonal staff.

## How It Connects

- All modules call the authorization service before reading or modifying data.

- Audit Log records every sensitive user action and permission change.

- Approval workflows use role and monetary authority rules.



## End-to-End Workflow

1. Owner invites member.

2. Assigns role and scope.

3. Member accepts invitation.

4. System provisions least-privilege access.

5. Every request is evaluated against Workspace, role, attributes, and approval limits.

6. Changes are logged and can be reviewed.

## Core Data Objects

Membership, Role, Permission, Policy, ApprovalLimit, Team, Invitation, Session, Device, Delegation

## Decisions This Domain Must Improve

- Who may see or change this information?

- Does this action require approval?

- Is the access appropriate for this user and scope?



# 3. ZYVORA Home — Executive Decision Workspace

## Purpose

Give the client a trustworthy understanding of the entire business and the few decisions requiring attention in less than 30 seconds.

## Required Features

**Morning business briefing.** Yesterday’s revenue, profit, cash, orders, customer changes, inventory risks, unusual events, and three ranked actions.

**Business health score.** Composite score with transparent components: financial health, cash, inventory, customer retention, operations, data quality, and risk.

**Decision queue.** Operational, tactical, and strategic decisions ranked by urgency, impact, confidence, and deadline.

**KPI cards.** Revenue, real profit, cash available, cash pending, inventory value, orders, customers, return rate, retention, and goal progress.

**Explainable insights.** Every insight includes what changed, why, evidence, confidence, and recommended next step.

**Cross-domain timeline.** Orders, payments, expenses, campaigns, stock changes, refunds, and decisions in one chronological stream.

**Goal center.** Company and team goals with progress, forecast, risk of missing target, and suggested interventions.

**Quick actions.** Create order, add expense, restock, contact customer, launch campaign, create invoice, invite teammate, and ask ZYVORA AI.

**Customizable but governed layout.** Users may reorder approved widgets; the primary decision queue and health summary cannot be hidden.

## How It Connects

- Reads summarized data from all Domains through governed metrics.

- Uses Decision Engine for ranking and explanations.

- Actions deep-link into the responsible Domain.

- Decisions and outcomes are stored in Business Memory.



## End-to-End Workflow

1. User opens ZYVORA.

2. System loads latest snapshots and decision candidates.

3. Decision Engine ranks items.

4. User inspects evidence or opens relevant Domain.

5. User decides or delegates.

6. Action executes through approved workflow.

7. Outcome is later measured and added to memory.

## Core Data Objects

BusinessBriefing, HealthScore, DecisionCandidate, Insight, Guidance, Goal, MetricSnapshot, TimelineEvent

## Decisions This Domain Must Improve

- What matters most today?

- What changed and why?

- What action should happen next?



# 4. Commerce, Catalog, Pricing, Orders, Checkout, and Returns

## Purpose

Manage the complete selling lifecycle from product definition to fulfilled, refunded, or returned order while synchronizing inventory, finance, customer history, analytics, and AI.

## Required Features

**Product catalog.** Simple, variant, bundle, service, subscription-ready, and digital product types; SKU, barcode, cost, price, tax, dimensions, images, status, channels, and translations.

**Categories and collections.** Manual and rule-based collections, merchandising order, tags, attributes, and SEO metadata.

**Pricing engine.** Base price, compare-at price, customer-specific price, volume tiers, bundles, promotions, scheduled prices, minimum margin warnings, and channel pricing.

**Order management.** Draft, confirmed, awaiting payment, paid, processing, packed, shipped, delivered, cancelled, returned, refunded, and archived states.

**Cash-on-delivery workflow.** Confirmation calls/messages, refusal risk, courier handoff, collected cash, remittance reconciliation, failed delivery, rescheduling, and return-to-sender.

**Checkout.** Address, shipping method, payment method, discount validation, taxes, inventory reservation, fraud checks, and confirmation.

**Invoices and receipts.** Invoices, receipts, credit notes, refund receipts, numbering sequences, PDF generation, and print/email delivery.

**Returns and refunds.** Return request, reason, eligibility, approval, reverse logistics, inspection, restock, partial/full refund, loss calculation, and customer communication.

**Order profitability.** Revenue, cost of goods, discount, shipping, packaging, payment fee, advertising attribution, expected profit, realized profit, margin, and ROI.

**Order timeline and audit.** Every state change, message, payment, shipment, refund, note, and user action.

## How It Connects

- Creating an order reserves inventory and creates expected financial entries.

- Delivery recognizes revenue according to business rules.

- Returns reverse revenue, inventory, cash, and customer metrics.

- Customer profile receives order history and lifetime value changes.

- Analytics and Business Memory receive events.



## End-to-End Workflow

1. Customer or agent creates cart/order.

2. Pricing and discount rules evaluate.

3. Inventory is reserved.

4. Payment/COD status is created.

5. Order is confirmed and fulfilled.

6. Shipment tracking updates state.

7. Delivery recognizes revenue and realized profit.

8. Return/refund reverses affected records using immutable financial events.

## Core Data Objects

Product, Variant, SKU, Bundle, PriceList, Discount, Cart, Order, OrderLine, Payment, Shipment, Return, Refund, Invoice, CreditNote

## Decisions This Domain Must Improve

- Should this order be accepted?

- Is the price profitable?

- Which fulfillment and payment path should be used?

- Should a return or refund be approved?



# 5. Finance, Cash, Accounting Readiness, Expenses, and Profitability

## Purpose

Become the financial command center of the business while deriving financial truth automatically from commerce, inventory, procurement, payments, payroll, and expenses.

## Required Features

**Executive finance overview.** Daily, weekly, monthly, quarterly, yearly revenue and profit; gross/net profit; expenses; cash; pending COD; inventory value; refunds; returns; AOV; margin.

**Revenue recognition rules.** Delivered-order recognition by default, configurable for prepaid businesses, with cancellations and returns reversed automatically.

**Profit engine.** COGS, shipping, packaging, payment fees, discounts, campaign attribution, labor allocation, overhead allocation, gross profit, contribution profit, and net profit.

**Cash center.** Cash received, pending, available, reserved, locked in inventory, expected collections, withdrawable profit, and cash runway.

**Envelope budgets.** Stock, operating expense, tax, owner profit, marketing, payroll, and custom envelopes with automatic allocation rules.

**Expense management.** Categories, vendors, recurring expenses, receipts, approval state, tax, allocation, payment account, attachments, and notes.

**Bank and payment reconciliation.** Import or connect transactions, match payments, identify differences, and create reconciliation tasks.

**Budgeting and forecasting.** Budgets by account/category/domain, actual vs budget, rolling forecast, scenarios, and variance explanation.

**Break-even and simulations.** Break-even revenue/orders, what-if pricing, shipping, cost, discount, advertising, quantity, and staffing simulations.

**Multi-currency foundation.** Base and transaction currencies, exchange rates, conversion snapshots, gains/losses, and display preferences.

**Financial risk analysis.** Negative margin, rising expense ratio, excessive inventory investment, cash shortfall, customer or product concentration, COD refusal trends.

**Reports and exports.** Profit and loss readiness, cash flow, inventory valuation, expenses, revenue, taxes, management reports, PDF/Excel/CSV.

**Financial audit log and daily snapshots.** Immutable daily balances and all financial-impacting changes with user, timestamp, previous value, and new value.

## How It Connects

- Commerce creates revenue, refund, discount, fee, and expected cash events.

- Inventory and procurement provide cost and stock investment.

- Marketing provides campaign spend and attribution.

- HR may provide payroll and labor allocations.

- All financial metrics are generated once in the finance calculation service and reused everywhere.



## End-to-End Workflow

1. Source Domain emits approved event.

2. Finance translates event into financial entries.

3. Cash, profit, envelopes, budgets, snapshots, and forecasts update.

4. Anomalies generate explainable alerts.

5. User drills from KPI to transaction to source record.

## Core Data Objects

FinancialEvent, LedgerEntry, Account, CashAccount, Expense, Budget, Envelope, ExchangeRate, Reconciliation, FinancialSnapshot, Forecast, Scenario

## Decisions This Domain Must Improve

- Am I truly profitable?

- How much cash is safe to use?

- Can I afford restocking, hiring, or marketing?

- What is reducing profit?



# 6. Inventory, Warehouses, Procurement, and Suppliers

## Purpose

Maintain accurate stock and purchasing decisions across products, locations, suppliers, orders, returns, and financial valuation.

## Required Features

**Multi-location inventory.** Warehouses, stores, bins, virtual locations, available, reserved, incoming, damaged, quarantined, and in-transit quantities.

**Stock movements.** Receipts, transfers, reservations, releases, adjustments, sales, returns, damages, samples, and expirations.

**Costing methods.** Weighted average by default with extensible FIFO/standard cost support; landed cost allocation.

**Replenishment intelligence.** Reorder point, safety stock, lead time, sales velocity, seasonality, minimum order quantities, and cash constraints.

**Purchase requests and orders.** Request, approval, supplier selection, PO, partial receipt, invoice matching, and closure.

**Supplier management.** Contacts, products, prices, lead time, reliability, quality, defects, minimum orders, payment terms, and performance score.

**Inventory financial analysis.** Cost value, selling value, potential revenue/profit, inventory ROI, slow/dead stock, damaged value, and money locked in stock.

**Barcode and QR operations.** Receive, pick, pack, transfer, count, and adjust using scanners or mobile camera.

**Cycle counts and reconciliation.** Scheduled counts, variance, approval, root cause, and audit trail.

**Expiry and batch tracking.** Batch/lot, serial, manufacturing/expiry dates, FEFO recommendations, and recalls.

## How It Connects

- Orders reserve and deduct stock.

- Returns inspect and optionally restock.

- Procurement increases incoming and received quantities and creates financial obligations.

- Finance values stock and recognizes COGS.

- AI forecasts stockouts and cash required.



## End-to-End Workflow

1. Demand or threshold triggers replenishment candidate.

2. System compares supplier options, cash, and lead time.

3. Authorized user approves PO.

4. Goods are received and inspected.

5. Stock and cost update.

6. Supplier performance and Business Memory record the outcome.

## Core Data Objects

Warehouse, Location, InventoryBalance, StockMovement, Reservation, PurchaseRequest, PurchaseOrder, GoodsReceipt, Supplier, SupplierProduct, Lot, StockCount

## Decisions This Domain Must Improve

- What should be reordered, when, how much, and from whom?

- Where is stock located?

- Can demand be fulfilled without harming cash?



# 7. CRM, Customer Intelligence, Support, and Loyalty

## Purpose

Provide one trustworthy customer record and guide retention, service, sales, and relationship decisions.

## Required Features

**Unified customer profile.** Identity, contacts, addresses, orders, payments, refunds, support, campaigns, consent, notes, preferences, and timeline.

**Customer financial intelligence.** Lifetime revenue/profit, AOV, margin, CLV, refund/return cost, payment reliability, and profitability ranking.

**Segmentation.** Rule-based and AI-assisted segments by value, behavior, recency, city, interests, profitability, risk, and lifecycle stage.

**Lead and opportunity management.** Leads, source, qualification, pipeline, probability, next action, owner, quote, and won/lost reasons.

**Support center.** Tickets, channels, priority, SLA, status, assignment, knowledge base, templates, attachments, and satisfaction.

**Customer journey and next best action.** First purchase, repeat, at-risk, churned, VIP, win-back, and recommended outreach.

**Loyalty and referrals.** Points, tiers, rewards, referral codes, balances, expiration, abuse prevention, and financial liability.

**Consent and communication preferences.** Email/SMS/WhatsApp permissions, unsubscribe, legal basis, and communication history.

**Duplicate detection and merge.** Identify duplicate customers and merge safely while preserving audit history.

## How It Connects

- Orders and returns update lifetime metrics.

- Marketing uses segments and consent.

- Support events affect satisfaction and churn risk.

- Finance identifies profitable and costly customer relationships.

- AI recommends next actions with reasons.



## End-to-End Workflow

1. Customer enters through purchase, lead form, import, or support.

2. Identity resolution matches or creates profile.

3. Events build timeline and metrics.

4. System detects lifecycle changes.

5. Guidance suggests outreach or service action.

6. Outcome is recorded for future learning.

## Core Data Objects

Customer, ContactPoint, Address, Segment, Lead, Opportunity, Ticket, Conversation, Consent, LoyaltyAccount, Referral

## Decisions This Domain Must Improve

- Who needs attention?

- Which customers are profitable or at risk?

- What is the next best action?



# 8. Marketing, Promotions, Growth, and Attribution

## Purpose

Plan, execute, measure, and improve growth activities while protecting margin, consent, and customer trust.

## Required Features

**Campaign management.** Objective, audience, channel, budget, dates, creative, offer, owner, status, and results.

**Discount and promotion engine.** Codes, automatic discounts, bundles, thresholds, free shipping, customer/product conditions, usage limits, schedule, and stacking rules.

**Audience builder.** Segments based on customer, order, product, geography, profitability, behavior, and consent.

**Email/SMS/WhatsApp workflows.** Templates, personalization, scheduling, approvals, unsubscribe, delivery tracking, and replies where supported.

**Abandoned checkout recovery.** Sequence rules, margin-aware incentives, suppression, conversion, and financial impact.

**Loyalty, referral, and affiliate programs.** Rules, links/codes, commissions, fraud detection, payouts, and attribution.

**SEO and content operations.** Metadata, sitemaps, structured content, content calendar, landing pages, and performance.

**Attribution.** First/last/multi-touch models, campaign cost, attributed revenue/profit, CAC, ROAS, and confidence level.

**Growth experiments.** Hypothesis, audience, variants, guardrails, results, and decision record; honesty and consent are never experimental variables.

**AI growth advisor.** Identify profitable segments, underperforming campaigns, excessive discounting, and realistic opportunities.

## How It Connects

- Uses CRM segments and consent.

- Uses catalog/pricing for offers.

- Orders provide conversion and revenue.

- Finance provides profit and spend, preventing vanity ROAS.

- Business Memory records campaign decisions and outcomes.



## End-to-End Workflow

1. Define objective and decision.

2. Select consented audience.

3. Design offer and verify margin.

4. Approve budget and content.

5. Launch through connected channel.

6. Events update attribution.

7. Finance calculates real profit.

8. AI compares expected and actual outcome and recommends change.

## Core Data Objects

Campaign, Audience, Promotion, Coupon, MessageTemplate, MessageDelivery, AttributionTouch, Experiment, Affiliate, Commission

## Decisions This Domain Must Improve

- Which audience and offer should be used?

- Is the campaign profitable?

- Should it be scaled, changed, or stopped?



# 9. Analytics, Metrics, Reporting, and Business Intelligence

## Purpose

Provide consistent metrics, trustworthy drill-down analysis, scheduled reports, and explainable comparisons without creating a second source of truth.

## Required Features

**Governed metric catalog.** Official definitions, formula, owner, source, refresh rate, currency, and version.

**Interactive analytics.** Date, product, category, customer, city, channel, shipping company, payment method, status, and custom filters.

**Drill-down.** Year → quarter → month → day → order → transaction/source event.

**Charts and visualizations.** Revenue/profit, cash flow, waterfall, expenses, inventory, cohorts, retention, products, customers, campaigns, heatmaps, funnels.

**Comparisons and benchmarks.** Previous period, target, forecast, same period last year, own historical baseline, and clearly labeled external benchmark.

**Report builder.** Select governed metrics and dimensions; save, share, schedule, export, and control access.

**Scheduled reports.** Daily, weekly, monthly, quarterly, annual email or in-app delivery in PDF/Excel/CSV.

**Snapshots and period closing.** Daily snapshots, locked period snapshots, revisions, and reason for restatement.

**Anomaly detection.** Unusual revenue, margin, expense, refunds, inventory, customer behavior, and data-quality deviations.

**Natural-language analytics.** Ask questions; responses must show definition, filters, sources, freshness, and uncertainty.

## How It Connects

- Reads governed models, not raw duplicated calculations.

- All Domain dashboards use the same metric service.

- Decision Engine uses metrics and Business Memory to create insights.

- Exports respect permissions and audit rules.



## End-to-End Workflow

1. User chooses or asks a question.

2. Metric service resolves official definitions.

3. Query engine applies scope and filters.

4. Result includes source/freshness.

5. User drills to source or saves report.

6. Decision and report usage may inform prioritization without exploiting attention.

## Core Data Objects

MetricDefinition, Dimension, Dataset, Report, DashboardView, Snapshot, Anomaly, ScheduledDelivery, QueryAudit

## Decisions This Domain Must Improve

- What changed?

- Why did it change?

- Is the result trustworthy?

- What should be investigated next?



# 10. ZYVORA AI, Decision Engine, Recommendations, Forecasting, and Chat

## Purpose

Transform connected business data and memory into ranked, explained, safe decision support across every Domain.

## Required Features

**AI chat.** Ask business questions, request summaries, explain changes, locate records, draft actions, and initiate approved workflows.

**Decision engine.** Collect context, detect patterns, create insights, generate options, present trade-offs, rank guidance, and learn from outcomes.

**Domain brains.** Finance, inventory, customer, commerce, marketing, operations, and future specialized reasoning modules.

**Recommendation engine.** Next best action, reorder, pricing, follow-up, campaign, expense control, and risk mitigation recommendations.

**Forecasting.** Revenue, profit, cash, orders, customers, stock, purchasing, campaign outcomes, and scenario ranges.

**Business Memory retrieval.** Use the Workspace’s own history, decisions, rationales, outcomes, preferences, and goals.

**Explainability panel.** Claim, reasoning, evidence, freshness, confidence, assumptions, and what would change the recommendation.

**AI action drafts.** Draft purchase order, customer message, report, campaign, expense categorization, and reconciliation; user confirms consequential actions.

**AI safety and permission boundary.** AI only accesses data allowed to the requesting identity and never bypasses approval workflows.

**Evaluation and feedback.** Track recommendation acceptance, override reasons, outcomes, calibration, hallucination incidents, and user corrections.

**No anthropomorphic manipulation.** Professional, calm, honest language; never pretend certainty, emotion, authority, or friendship.

## How It Connects

- Consumes governed data and Business Memory.

- Returns insights/guidance to every Domain.

- Actions invoke Domain services through permission and approval layers.

- Evaluation writes outcomes and corrections back to memory.



## End-to-End Workflow

1. User asks a question or engine detects a candidate.

2. Context builder gathers permitted facts and relevant memory.

3. Reasoning service produces structured output.

4. Policy layer validates safety, permissions, and confidence.

5. User receives answer with evidence.

6. Any action is previewed and approved.

7. Outcome is evaluated later.

## Core Data Objects

AIConversation, AIMessage, ContextBundle, DecisionCandidate, Recommendation, Forecast, Explanation, AIActionDraft, EvaluationResult, ModelVersion

## Decisions This Domain Must Improve

- What should happen next?

- How confident is the recommendation?

- What evidence supports it?

- Should the user act, wait, or gather more data?



# 11. Automation, Rules, Approvals, Tasks, and Notifications

## Purpose

Remove repetitive mechanics while keeping consequential decisions visible, explainable, permissioned, and reversible.

## Required Features

**Workflow builder.** Trigger, conditions, branches, actions, delay, schedule, approval, error path, and audit.

**Automation ladder enforcement.** Prepare; execute with consent; execute standing orders. No autonomous consequential fourth rung.

**Business triggers.** Order created/delivered/returned, payment received, stock low, expense submitted, customer at risk, goal status, anomaly, schedule, webhook.

**Actions.** Create task, draft/send message, reserve stock, update record, create approval, generate report, call integration, create AI draft.

**Approval workflows.** Single/multi-step, amount thresholds, role/scope, delegation, reminders, rejection reason, and escalation.

**Task management.** Owner, team, due date, priority, related record, checklist, comments, dependencies, and completion evidence.

**Notification center.** In-app, email, SMS, WhatsApp/push integrations, digest, quiet hours, priority, and decision-linked rationale.

**Automation monitoring.** Runs, successes, failures, retries, idempotency keys, dead-letter queue, and manual replay.

**Templates.** Order fulfillment, COD confirmation, low-stock restock, overdue invoice, expense approval, win-back, report delivery.

## How It Connects

- Subscribes to Event Bus.

- Invokes Domain APIs rather than editing databases directly.

- Uses permissions, approvals, and audit logs.

- AI can draft but cannot activate high-impact automation without authorized confirmation.



## End-to-End Workflow

1. Event occurs.

2. Rules engine evaluates scope and conditions.

3. If approval is required, creates approval task.

4. Authorized action executes idempotently.

5. Result is logged and communicated.

6. Failure retries or escalates.

## Core Data Objects

Automation, Trigger, Condition, Action, AutomationRun, ApprovalRequest, Task, Notification, DeliveryPreference

## Decisions This Domain Must Improve

- Can this be automated safely?

- Does it require approval?

- Who should be informed or assigned?



# 12. Integrations, Import/Export, APIs, Webhooks, and App Ecosystem

## Purpose

Connect the client’s existing business systems to ZYVORA without losing ownership, traceability, or data consistency.

## Required Features

**Integration catalog.** E-commerce, payments, banks, accounting, shipping, advertising, communication, productivity, storage, and future apps.

**Connection management.** OAuth/API keys, scopes, health, last sync, errors, reauthorization, and disconnect impact.

**Source-of-truth mapping.** For every synchronized entity, explicitly choose ZYVORA or external system as authoritative.

**Import center.** CSV/Excel templates, preview, mapping, validation, duplicate handling, dry run, rollback, and reconciliation report.

**Export center.** Open formats, permissioned exports, full Business Memory export, scheduled exports, and audit.

**Public API.** Versioned REST/GraphQL as chosen later, scoped tokens, rate limits, idempotency, pagination, and consistent errors.

**Webhooks.** Signed delivery, retries, replay, subscriptions, event versioning, and delivery logs.

**Developer portal and SDKs.** Documentation, sandbox, keys, examples, changelog, and generated SDKs.

**Integration sync engine.** Incremental sync, conflict detection, reconciliation, checkpoints, and dead-letter handling.

**Marketplace foundation.** Verified apps, permissions, installation consent, billing, reviews, and security requirements.

## How It Connects

- Maps external events into governed Domain commands/events.

- All imports and integrations pass validation and audit.

- Decision Engine receives source and freshness metadata.

- No connector may silently create a second source of truth.



## End-to-End Workflow

1. Client selects integration.

2. Reviews requested permissions.

3. Authenticates.

4. Maps business entities and source ownership.

5. Runs initial sync preview.

6. Resolves conflicts.

7. Activates incremental sync.

8. Health and errors remain visible.

## Core Data Objects

IntegrationApp, Connection, CredentialReference, SyncJob, SyncCheckpoint, Mapping, Conflict, WebhookSubscription, APIToken, MarketplaceListing

## Decisions This Domain Must Improve

- Which system owns each fact?

- Can this connection be trusted?

- What happens if synchronization fails?



# 13. Documents, Files, Search, Notes, and Knowledge

## Purpose

Make every operational document and piece of context findable, connected to the correct business record, permissioned, and preserved.

## Required Features

**Document center.** Invoices, receipts, purchase documents, contracts, product files, policies, reports, and custom folders.

**Attachments everywhere.** Attach files to order, customer, supplier, expense, product, task, ticket, campaign, and decision.

**Versioning.** Versions, author, timestamp, change notes, restore, and retention rules.

**OCR and metadata extraction.** Extract invoice/receipt fields with confidence and human review where used.

**Global search.** Orders, customers, products, transactions, expenses, invoices, refunds, tasks, messages, and documents.

**Permission-aware indexing.** Search never reveals records or snippets the user cannot access.

**Saved searches and filters.** Personal/team saved queries and pinned views.

**Knowledge base.** Internal procedures, support articles, onboarding guidance, and AI-retrievable approved knowledge.

**Notes and mentions.** Rich notes, @mentions, record links, and timeline inclusion.

## How It Connects

- Files use object storage and metadata service.

- Search indexes Domain projections and approved document text.

- AI retrieves only permissioned, approved knowledge.

- Audit records access to sensitive documents.



## End-to-End Workflow

1. File is uploaded or generated.

2. Security scan and metadata extraction run.

3. File is attached to business record.

4. Search indexes allowed content.

5. Authorized users and AI can retrieve it.

6. Updates create new version rather than silent overwrite.

## Core Data Objects

Document, FileObject, DocumentVersion, AttachmentLink, SearchIndexRecord, SavedSearch, KnowledgeArticle, Note

## Decisions This Domain Must Improve

- Where is the evidence for this transaction or decision?

- Which version is authoritative?

- Who may access it?



# 14. Security, Privacy, Audit, Compliance, Backup, and Recovery

## Purpose

Protect client businesses, preserve trust, and make every sensitive action accountable and recoverable.

## Required Features

**Authentication security.** Secure password hashing, MFA, passkeys-ready architecture, rate limits, login alerts, recovery, and SSO future support.

**Authorization enforcement.** Workspace isolation, RBAC/ABAC, data-layer checks, service identities, and least privilege.

**Encryption and secrets.** TLS, encryption at rest, managed keys, secret vault, rotation, and no secrets in source code.

**Audit log.** Actor, action, target, previous/new values, IP/device, reason, approval, correlation ID, and export.

**Privacy center.** Consent, data access/export, correction, deletion rules, retention, and policy transparency.

**Data classification.** Public, internal, confidential, restricted, financial, personal, authentication, and AI-sensitive.

**Backup and recovery.** Daily/weekly/monthly policies, point-in-time recovery, restore tests, region strategy, and user-facing status.

**Incident response.** Severity, detection, containment, communication, recovery, post-incident review, and corrective actions.

**Fraud and abuse controls.** Suspicious login, coupon abuse, refund abuse, API abuse, automation misuse, and unusual financial actions.

**Compliance-ready evidence.** Policies, logs, access reviews, vendor register, data map, and control evidence without falsely claiming certifications.

## How It Connects

- Embedded in every service and workflow, not a final layer.

- Audit consumes all sensitive events.

- Backups cover databases, event store, documents, and configuration.

- AI access is governed by the same permissions as users.



## End-to-End Workflow

1. Request authenticates.

2. Authorization evaluates identity and scope.

3. Domain validates business rule.

4. Sensitive action may require approval.

5. Action executes and writes immutable audit event.

6. Monitoring detects anomalies.

7. Backups and recovery are continuously tested.

## Core Data Objects

AuditEvent, SecurityAlert, AccessReview, DataClassification, RetentionPolicy, BackupJob, RestoreTest, Incident, ConsentRecord

## Decisions This Domain Must Improve

- Is this action authorized and safe?

- Can we prove what happened?

- Can we recover without losing Business Memory?



# 15. Settings, Localization, Branding, Taxes, and Business Configuration

## Purpose

Allow each client to configure the platform to their business without fragmenting core rules or creating unmaintainable custom logic.

## Required Features

**Business settings.** Name, logo, contact, legal identifiers, addresses, timezone, locale, fiscal year, and default language.

**Currency and number formats.** MAD/DH base currency plus multi-currency readiness, decimals, rounding, and display rules.

**Tax configuration.** Tax-inclusive/exclusive pricing, rates, exemptions, invoice display, and jurisdiction-ready extensibility.

**Document templates.** Invoice, receipt, credit note, purchase order, email, and report branding.

**Sequences and statuses.** Document numbering and limited governed custom status mappings.

**Business rules configuration.** Margin thresholds, refund limits, stock thresholds, approval limits, and envelope allocations.

**Notification preferences.** Channels, quiet hours, digests, priority thresholds, and per-role defaults.

**Custom fields.** Governed custom fields with type, validation, visibility, permissions, and reporting behavior.

**Localization.** English, French, Arabic readiness, RTL support, translations, local date/time, and culturally appropriate formats.

**Feature configuration.** Plan entitlements, controlled beta flags, and industry-specific capabilities.

## How It Connects

- Configuration service provides versioned settings to every Domain.

- Changes that affect calculations create new effective-dated versions and audit events.

- AI explanations include active rules where relevant.



## End-to-End Workflow

1. Authorized user changes setting.

2. System validates compatibility and impact.

3. High-impact changes show preview and may require approval.

4. New version becomes effective.

5. Affected metrics/processes recalculate or apply prospectively according to policy.

## Core Data Objects

BusinessSetting, TaxRule, NumberSequence, DocumentTemplate, CustomFieldDefinition, FeatureFlag, LocalizationSetting, RuleVersion

## Decisions This Domain Must Improve

- What is configurable safely?

- Does this change affect historical truth or only future behavior?



# 16. Mobile, Point of Sale, Offline, and Field Operations (Planned Extensions)

## Purpose

Extend ZYVORA beyond the desktop while preserving the same business truth, permissions, and decision philosophy.

## Required Features

**Mobile companion.** Briefing, approvals, tasks, customer lookup, order status, inventory scan, expense receipt, and AI chat.

**Point of sale.** Products, cart, discounts, customer, payment, receipt, shift, cash drawer, returns, and offline queue.

**Warehouse mobile.** Receive, transfer, count, pick, pack, barcode/QR, and proof of completion.

**Field sales/service.** Lead/customer visit, quote/order, payment capture integration, notes, photos, signature, and location with explicit consent.

**Offline-first operations.** Local encrypted queue, conflict policy, sync status, and user-visible reconciliation.

**Push notifications.** Only high-value decision and approval alerts, respecting preferences and quiet hours.

## How It Connects

- Uses the same APIs, permissions, event model, and metrics as web.

- Offline actions are commands queued for validated synchronization.

- No separate mobile source of truth.



## End-to-End Workflow

1. User authenticates and receives scoped offline data.

2. Performs allowed action.

3. Action is queued with idempotency and timestamp.

4. On connection, server validates current state and permissions.

5. Conflict is resolved transparently.

## Core Data Objects

DeviceRegistration, OfflineCommand, SyncConflict, POSSession, CashDrawer, FieldVisit

## Decisions This Domain Must Improve

- Which actions may be safely available offline?

- How should conflicts be resolved without hiding changes?



# 17. Administration, Subscription, Billing, Support Operations, and Platform Management

## Purpose

Operate ZYVORA as a reliable SaaS platform without exposing internal platform complexity to client business data.

## Required Features

**Plans and entitlements.** Trials, plans, seats, usage limits, add-ons, billing cycle, and feature entitlements.

**Subscription billing.** Invoices, payments, failed-payment recovery, tax-ready billing, cancellation, downgrade safeguards, and data export.

**Internal support console.** Permissioned customer support access, consent or break-glass process, session notes, and complete audit.

**Workspace diagnostics.** Integration health, job status, event lag, storage, plan usage, and incident impact.

**Feature rollout.** Internal flags, cohorts, canary releases, rollback, and release notes.

**System status and trust center.** Service status, incidents, maintenance, security practices, and subprocessor information.

**Tenant lifecycle.** Trial, active, suspended, cancelled, export period, deletion schedule, legal hold, and restoration policy.

## How It Connects

- Billing controls entitlements, never business truth.

- Support access is separated from normal user access and heavily audited.

- Platform monitoring aggregates technical health without mixing client data.



## End-to-End Workflow

1. Customer selects plan.

2. Entitlements apply.

3. Usage is metered only where contractually defined.

4. Billing event occurs.

5. Payment state updates subscription.

6. Cancellation preserves export and retention promises.

## Core Data Objects

Plan, Entitlement, Subscription, BillingInvoice, UsageRecord, SupportAccessGrant, FeatureRollout, WorkspaceLifecycle

## Decisions This Domain Must Improve

- What is the client entitled to use?

- How can support help without violating privacy?

- What happens to data after cancellation?



# 18. Developer Experience, Quality, Deployment, Monitoring, and Operations

## Purpose

Ensure the software can be built, tested, deployed, observed, and evolved safely by human engineers and AI coding agents.

## Required Features

**Repository architecture.** Clear domain boundaries, shared libraries, architecture tests, code ownership, and documentation location.

**Development environments.** Local setup, seeded demo data, service dependencies, test accounts, and reproducible configuration.

**CI/CD.** Lint, type check, unit, integration, contract, security, migration, accessibility, and end-to-end gates.

**Testing strategy.** Business-rule tests, financial invariants, permission tests, event tests, AI evaluation, visual regression, performance, and recovery tests.

**Observability.** Structured logs, metrics, traces, correlation IDs, business event monitoring, SLOs, alerts, and dashboards.

**Deployment.** Development, preview, staging, production, migrations, canary, feature flags, rollback, and release evidence.

**Incident operations.** On-call, runbooks, severity, communication, mitigation, postmortem, and action tracking.

**Architecture compliance.** Automated checks for forbidden dependencies, direct database access, permission bypass, duplicate metric logic, and unversioned events.

**AI coding agent rules.** Read relevant Codices/specifications, never invent requirements, produce tests, show changed files, and explain traceability.

## How It Connects

- Implements every Domain through common platform contracts.

- Observability correlates technical failures with affected workflows.

- Release management links changes to PRD/TS/SB/ADR identifiers.



## End-to-End Workflow

1. Approved requirement becomes technical task.

2. Developer/agent reads governing documents.

3. Implements vertical slice.

4. Automated gates run.

5. Human reviews architecture, security, UX, and product.

6. Deploy to staging, validate, release gradually, monitor, and record outcome.

## Core Data Objects

Build, Deployment, Release, FeatureFlag, ServiceLevelObjective, Incident, Runbook, TestEvidence, ArchitectureViolation

## Decisions This Domain Must Improve

- Is this change compliant, tested, safe, and reversible?

- Can another contributor understand and maintain it?



# Cross-Domain Business Flows

## Order-to-Cash

Order confirmed → inventory reserved → payment/COD tracked → shipment → delivered → revenue recognized → COGS recognized → cash reconciled → customer metrics updated → decision memory records outcome.

## Return-to-Resolution

Return requested → eligibility and approval → shipment/inspection → inventory disposition → refund/credit note → financial reversal and loss → customer risk and product return analytics updated.

## Demand-to-Replenishment

Sales velocity and forecast → stockout risk → supplier and cash comparison → purchase approval → PO → receipt → inventory/cost update → supplier outcome recorded.

## Lead-to-Loyalty

Lead captured → consent and identity resolution → opportunity/order → fulfillment → customer value update → support/loyalty → churn prediction → next best action.

## Campaign-to-Profit

Campaign and audience → spend approval → messages/ads → attributed visits/orders → real contribution profit → experiment decision → Business Memory.

## Expense-to-Financial-Truth

Expense submitted → receipt extraction → category/allocation → approval → payment/reconciliation → budget/envelope/profit update → audit and snapshot.

## Question-to-Decision

Question/detected anomaly → context assembly → insight → options/trade-offs → human decision → action → outcome → memory → improved future guidance.

## External-System-to-Truth

Connection → scope consent → source ownership mapping → initial sync → validation → conflicts resolved → incremental sync → freshness and health visible.
