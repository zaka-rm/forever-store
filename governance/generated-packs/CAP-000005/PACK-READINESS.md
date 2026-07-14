# Draft Pack Set — CAP-000005 Finance Core Capability

**Authority:** DRAFT_NOT_AUTHORIZED  
**Promotion gate:** BLOCKED_SOURCE_INCOMPLETE  
**Source fingerprint:** `aae63766febf9301ed43fec00570e3014c4f9ec57c0ce90c16abdbd403423460`  
**Traceability:** 55%  
**Blockers:** 46

## Blockers

- MET-000027: metric formula is not approved
- MET-000028: metric formula is not approved
- MET-000029: metric formula is not approved
- MET-000030: metric formula is not approved
- MET-000031: metric formula is not approved
- MET-000032: metric formula is not approved
- MET-000033: metric formula is not approved
- MET-000034: metric formula is not approved
- PROMPT-000015: prompt template and evaluation are not approved
- PROMPT-000016: prompt template and evaluation are not approved
- PROMPT-000017: prompt template and evaluation are not approved
- PROMPT-000018: prompt template and evaluation are not approved
- PROMPT-000019: prompt template and evaluation are not approved
- WF-000031: ordered workflow steps are not approved
- WF-000032: ordered workflow steps are not approved
- WF-000033: ordered workflow steps are not approved
- WF-000034: ordered workflow steps are not approved
- WF-000035: ordered workflow steps are not approved
- WF-000036: ordered workflow steps are not approved
- WF-000037: ordered workflow steps are not approved
- WF-000038: ordered workflow steps are not approved
- UF-000037: UI transitions and recovery states are not approved
- UF-000038: UI transitions and recovery states are not approved
- UF-000039: UI transitions and recovery states are not approved
- UF-000040: UI transitions and recovery states are not approved
- UF-000041: UI transitions and recovery states are not approved
- UF-000042: UI transitions and recovery states are not approved
- UF-000043: UI transitions and recovery states are not approved
- UF-000044: UI transitions and recovery states are not approved
- UF-000045: UI transitions and recovery states are not approved
- EVT-000026: event domain payload is not approved
- EVT-000027: event domain payload is not approved
- EVT-000028: event domain payload is not approved
- EVT-000029: event domain payload is not approved
- EVT-000030: event domain payload is not approved
- EVT-000031: event domain payload is not approved
- EVT-000032: event domain payload is not approved
- EVT-000033: event domain payload is not approved
- API-000033: API request and response schema is not approved
- API-000034: API request and response schema is not approved
- API-000035: API request and response schema is not approved
- API-000036: API request and response schema is not approved
- API-000037: API request and response schema is not approved
- API-000038: API request and response schema is not approved
- API-000039: API request and response schema is not approved
- API-000040: API request and response schema is not approved

## Build scope

- FEAT-000033 — Chart of accounts
- FEAT-000034 — Double-entry journals
- FEAT-000035 — Accounts receivable and invoicing
- FEAT-000036 — Accounts payable and bills
- FEAT-000037 — Payments and reconciliation
- FEAT-000038 — Budgets and variance
- FEAT-000039 — Cash-flow forecasting
- FEAT-000040 — Financial statements and close

## QA scenarios

- RULE-BR-000033: Verify business rule: Every posted journal balances debits and credits in one currency basis.
- RULE-BR-000034: Verify business rule: Posted entries are immutable; corrections use reversal and replacement.
- RULE-BR-000035: Verify business rule: Closed periods reject posting unless reopened by authorized control.
- RULE-BR-000036: Verify business rule: Money uses decimal arithmetic and explicit currency.
- RULE-BR-000037: Verify business rule: Invoice totals equal validated line, tax, discount, and rounding components.
- RULE-BR-000038: Verify business rule: Payments cannot exceed permitted open amount without an explicit credit policy.
- RULE-BR-000039: Verify business rule: Reconciliation records source, match method, actor, and difference.
- RULE-BR-000040: Verify business rule: Forecasts disclose assumptions, horizon, interval, and model version.
- WF-WF-000031: Verify happy, alternative, failure, and recovery paths for Post journal
- WF-WF-000032: Verify happy, alternative, failure, and recovery paths for Issue and collect invoice
- WF-WF-000033: Verify happy, alternative, failure, and recovery paths for Record and pay bill
- WF-WF-000034: Verify happy, alternative, failure, and recovery paths for Import and reconcile bank activity
- WF-WF-000035: Verify happy, alternative, failure, and recovery paths for Close fiscal period
- WF-WF-000036: Verify happy, alternative, failure, and recovery paths for Approve budget
- WF-WF-000037: Verify happy, alternative, failure, and recovery paths for Forecast cash
- WF-WF-000038: Verify happy, alternative, failure, and recovery paths for Reverse incorrect posting
- API-API-000033: Verify request, response, authorization, idempotency, pagination, validation, and errors for Finance Chart of accounts API
- API-API-000034: Verify request, response, authorization, idempotency, pagination, validation, and errors for Finance Double-entry journals API
- API-API-000035: Verify request, response, authorization, idempotency, pagination, validation, and errors for Finance Accounts receivable and invoicing API
- API-API-000036: Verify request, response, authorization, idempotency, pagination, validation, and errors for Finance Accounts payable and bills API
- API-API-000037: Verify request, response, authorization, idempotency, pagination, validation, and errors for Finance Payments and reconciliation API
- API-API-000038: Verify request, response, authorization, idempotency, pagination, validation, and errors for Finance Budgets and variance API
- API-API-000039: Verify request, response, authorization, idempotency, pagination, validation, and errors for Finance Cash-flow forecasting API
- API-API-000040: Verify request, response, authorization, idempotency, pagination, validation, and errors for Finance Financial statements and close API
- EVT-EVT-000026: Verify production, schema compatibility, ordering, duplication, retry, and idempotent consumption for JournalPosted
- EVT-EVT-000027: Verify production, schema compatibility, ordering, duplication, retry, and idempotent consumption for InvoiceIssued
- EVT-EVT-000028: Verify production, schema compatibility, ordering, duplication, retry, and idempotent consumption for InvoiceOverdue
- EVT-EVT-000029: Verify production, schema compatibility, ordering, duplication, retry, and idempotent consumption for PaymentRecorded
- EVT-EVT-000030: Verify production, schema compatibility, ordering, duplication, retry, and idempotent consumption for BillApproved
- EVT-EVT-000031: Verify production, schema compatibility, ordering, duplication, retry, and idempotent consumption for BudgetExceeded
- EVT-EVT-000032: Verify production, schema compatibility, ordering, duplication, retry, and idempotent consumption for PeriodClosed
- EVT-EVT-000033: Verify production, schema compatibility, ordering, duplication, retry, and idempotent consumption for CashForecastUpdated
- PERM-PERM-000065: Verify allow, deny, tenant isolation, escalation prevention, and audit evidence for Read Chart of accounts
- PERM-PERM-000066: Verify allow, deny, tenant isolation, escalation prevention, and audit evidence for Manage Chart of accounts
- PERM-PERM-000067: Verify allow, deny, tenant isolation, escalation prevention, and audit evidence for Read Double-entry journals
- PERM-PERM-000068: Verify allow, deny, tenant isolation, escalation prevention, and audit evidence for Manage Double-entry journals
- PERM-PERM-000069: Verify allow, deny, tenant isolation, escalation prevention, and audit evidence for Read Accounts receivable and invoicing
- PERM-PERM-000070: Verify allow, deny, tenant isolation, escalation prevention, and audit evidence for Manage Accounts receivable and invoicing
- PERM-PERM-000071: Verify allow, deny, tenant isolation, escalation prevention, and audit evidence for Read Accounts payable and bills
- PERM-PERM-000072: Verify allow, deny, tenant isolation, escalation prevention, and audit evidence for Manage Accounts payable and bills
- PERM-PERM-000073: Verify allow, deny, tenant isolation, escalation prevention, and audit evidence for Read Payments and reconciliation
- PERM-PERM-000074: Verify allow, deny, tenant isolation, escalation prevention, and audit evidence for Manage Payments and reconciliation
- PERM-PERM-000075: Verify allow, deny, tenant isolation, escalation prevention, and audit evidence for Read Budgets and variance
- PERM-PERM-000076: Verify allow, deny, tenant isolation, escalation prevention, and audit evidence for Manage Budgets and variance
- PERM-PERM-000077: Verify allow, deny, tenant isolation, escalation prevention, and audit evidence for Read Cash-flow forecasting
- PERM-PERM-000078: Verify allow, deny, tenant isolation, escalation prevention, and audit evidence for Manage Cash-flow forecasting
- PERM-PERM-000079: Verify allow, deny, tenant isolation, escalation prevention, and audit evidence for Read Financial statements and close
- PERM-PERM-000080: Verify allow, deny, tenant isolation, escalation prevention, and audit evidence for Manage Financial statements and close
- SCR-SCR-000037: Verify responsive, keyboard, screen-reader, loading, empty, error, stale, and permission states for Finance Decision Dashboard
- SCR-SCR-000038: Verify responsive, keyboard, screen-reader, loading, empty, error, stale, and permission states for Chart of accounts Workspace
- SCR-SCR-000039: Verify responsive, keyboard, screen-reader, loading, empty, error, stale, and permission states for Double-entry journals Workspace
- SCR-SCR-000040: Verify responsive, keyboard, screen-reader, loading, empty, error, stale, and permission states for Accounts receivable and invoicing Workspace
- SCR-SCR-000041: Verify responsive, keyboard, screen-reader, loading, empty, error, stale, and permission states for Accounts payable and bills Workspace
- SCR-SCR-000042: Verify responsive, keyboard, screen-reader, loading, empty, error, stale, and permission states for Payments and reconciliation Workspace
- SCR-SCR-000043: Verify responsive, keyboard, screen-reader, loading, empty, error, stale, and permission states for Budgets and variance Workspace
- SCR-SCR-000044: Verify responsive, keyboard, screen-reader, loading, empty, error, stale, and permission states for Cash-flow forecasting Workspace
- SCR-SCR-000045: Verify responsive, keyboard, screen-reader, loading, empty, error, stale, and permission states for Financial statements and close Workspace
