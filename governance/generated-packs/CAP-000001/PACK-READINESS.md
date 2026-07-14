# Draft Pack Set — CAP-000001 Decision Center Core Capability

**Authority:** DRAFT_NOT_AUTHORIZED  
**Promotion gate:** BLOCKED_SOURCE_INCOMPLETE  
**Source fingerprint:** `f6aa891ed08ea2d08773c17b3269e160b1ad672352790e41bef040ff9475d088`  
**Traceability:** 55%  
**Blockers:** 41

## Blockers

- MET-000001: metric formula is not approved
- MET-000002: metric formula is not approved
- MET-000003: metric formula is not approved
- MET-000004: metric formula is not approved
- MET-000005: metric formula is not approved
- MET-000006: metric formula is not approved
- PROMPT-000001: prompt template and evaluation are not approved
- PROMPT-000002: prompt template and evaluation are not approved
- PROMPT-000003: prompt template and evaluation are not approved
- PROMPT-000004: prompt template and evaluation are not approved
- PROMPT-000005: prompt template and evaluation are not approved
- WF-000001: ordered workflow steps are not approved
- WF-000002: ordered workflow steps are not approved
- WF-000003: ordered workflow steps are not approved
- WF-000004: ordered workflow steps are not approved
- WF-000005: ordered workflow steps are not approved
- WF-000006: ordered workflow steps are not approved
- WF-000007: ordered workflow steps are not approved
- UF-000001: UI transitions and recovery states are not approved
- UF-000002: UI transitions and recovery states are not approved
- UF-000003: UI transitions and recovery states are not approved
- UF-000004: UI transitions and recovery states are not approved
- UF-000005: UI transitions and recovery states are not approved
- UF-000006: UI transitions and recovery states are not approved
- UF-000007: UI transitions and recovery states are not approved
- UF-000008: UI transitions and recovery states are not approved
- UF-000009: UI transitions and recovery states are not approved
- EVT-000001: event domain payload is not approved
- EVT-000002: event domain payload is not approved
- EVT-000003: event domain payload is not approved
- EVT-000004: event domain payload is not approved
- EVT-000005: event domain payload is not approved
- EVT-000006: event domain payload is not approved
- API-000001: API request and response schema is not approved
- API-000002: API request and response schema is not approved
- API-000003: API request and response schema is not approved
- API-000004: API request and response schema is not approved
- API-000005: API request and response schema is not approved
- API-000006: API request and response schema is not approved
- API-000007: API request and response schema is not approved
- API-000008: API request and response schema is not approved

## Build scope

- FEAT-000001 — Decision inbox and saved views
- FEAT-000002 — Priority and urgency explanation
- FEAT-000003 — Decision detail and evidence bundle
- FEAT-000004 — Alternative and trade-off comparison
- FEAT-000005 — Assignment and due-date control
- FEAT-000006 — Approval and escalation
- FEAT-000007 — Action and rationale recording
- FEAT-000008 — Outcome follow-up and learning

## QA scenarios

- RULE-BR-000001: Verify business rule: Every decision identifies a supported Builder decision and source owner.
- RULE-BR-000002: Verify business rule: Priority exposes material factors and never relies on an unexplained score.
- RULE-BR-000003: Verify business rule: High-impact actions require configured human approval.
- RULE-BR-000004: Verify business rule: A recorded decision requires owner, rationale, evidence snapshot, and expected outcome.
- RULE-BR-000005: Verify business rule: Completed approval history and evidence snapshots are append-only.
- RULE-BR-000006: Verify business rule: Overdue decisions escalate only through a declared policy.
- RULE-BR-000007: Verify business rule: Outcome capture never rewrites the original expectation.
- RULE-BR-000008: Verify business rule: AI confidence cannot grant authority.
- WF-WF-000001: Verify happy, alternative, failure, and recovery paths for Signal-to-decision creation
- WF-WF-000002: Verify happy, alternative, failure, and recovery paths for Decision triage
- WF-WF-000003: Verify happy, alternative, failure, and recovery paths for Evidence review
- WF-WF-000004: Verify happy, alternative, failure, and recovery paths for Approval path
- WF-WF-000005: Verify happy, alternative, failure, and recovery paths for Action recording
- WF-WF-000006: Verify happy, alternative, failure, and recovery paths for Outcome review
- WF-WF-000007: Verify happy, alternative, failure, and recovery paths for Reopen and recovery
- API-API-000001: Verify request, response, authorization, idempotency, pagination, validation, and errors for Decision Center Decision inbox and saved views API
- API-API-000002: Verify request, response, authorization, idempotency, pagination, validation, and errors for Decision Center Priority and urgency explanation API
- API-API-000003: Verify request, response, authorization, idempotency, pagination, validation, and errors for Decision Center Decision detail and evidence bundle API
- API-API-000004: Verify request, response, authorization, idempotency, pagination, validation, and errors for Decision Center Alternative and trade-off comparison API
- API-API-000005: Verify request, response, authorization, idempotency, pagination, validation, and errors for Decision Center Assignment and due-date control API
- API-API-000006: Verify request, response, authorization, idempotency, pagination, validation, and errors for Decision Center Approval and escalation API
- API-API-000007: Verify request, response, authorization, idempotency, pagination, validation, and errors for Decision Center Action and rationale recording API
- API-API-000008: Verify request, response, authorization, idempotency, pagination, validation, and errors for Decision Center Outcome follow-up and learning API
- EVT-EVT-000001: Verify production, schema compatibility, ordering, duplication, retry, and idempotent consumption for DecisionQueued
- EVT-EVT-000002: Verify production, schema compatibility, ordering, duplication, retry, and idempotent consumption for DecisionPriorityChanged
- EVT-EVT-000003: Verify production, schema compatibility, ordering, duplication, retry, and idempotent consumption for DecisionAssigned
- EVT-EVT-000004: Verify production, schema compatibility, ordering, duplication, retry, and idempotent consumption for ApprovalRequested
- EVT-EVT-000005: Verify production, schema compatibility, ordering, duplication, retry, and idempotent consumption for DecisionRecorded
- EVT-EVT-000006: Verify production, schema compatibility, ordering, duplication, retry, and idempotent consumption for DecisionOutcomeCaptured
- PERM-PERM-000001: Verify allow, deny, tenant isolation, escalation prevention, and audit evidence for Read Decision inbox and saved views
- PERM-PERM-000002: Verify allow, deny, tenant isolation, escalation prevention, and audit evidence for Manage Decision inbox and saved views
- PERM-PERM-000003: Verify allow, deny, tenant isolation, escalation prevention, and audit evidence for Read Priority and urgency explanation
- PERM-PERM-000004: Verify allow, deny, tenant isolation, escalation prevention, and audit evidence for Manage Priority and urgency explanation
- PERM-PERM-000005: Verify allow, deny, tenant isolation, escalation prevention, and audit evidence for Read Decision detail and evidence bundle
- PERM-PERM-000006: Verify allow, deny, tenant isolation, escalation prevention, and audit evidence for Manage Decision detail and evidence bundle
- PERM-PERM-000007: Verify allow, deny, tenant isolation, escalation prevention, and audit evidence for Read Alternative and trade-off comparison
- PERM-PERM-000008: Verify allow, deny, tenant isolation, escalation prevention, and audit evidence for Manage Alternative and trade-off comparison
- PERM-PERM-000009: Verify allow, deny, tenant isolation, escalation prevention, and audit evidence for Read Assignment and due-date control
- PERM-PERM-000010: Verify allow, deny, tenant isolation, escalation prevention, and audit evidence for Manage Assignment and due-date control
- PERM-PERM-000011: Verify allow, deny, tenant isolation, escalation prevention, and audit evidence for Read Approval and escalation
- PERM-PERM-000012: Verify allow, deny, tenant isolation, escalation prevention, and audit evidence for Manage Approval and escalation
- PERM-PERM-000013: Verify allow, deny, tenant isolation, escalation prevention, and audit evidence for Read Action and rationale recording
- PERM-PERM-000014: Verify allow, deny, tenant isolation, escalation prevention, and audit evidence for Manage Action and rationale recording
- PERM-PERM-000015: Verify allow, deny, tenant isolation, escalation prevention, and audit evidence for Read Outcome follow-up and learning
- PERM-PERM-000016: Verify allow, deny, tenant isolation, escalation prevention, and audit evidence for Manage Outcome follow-up and learning
- SCR-SCR-000001: Verify responsive, keyboard, screen-reader, loading, empty, error, stale, and permission states for Decision Center Decision Dashboard
- SCR-SCR-000002: Verify responsive, keyboard, screen-reader, loading, empty, error, stale, and permission states for Decision inbox and saved views Workspace
- SCR-SCR-000003: Verify responsive, keyboard, screen-reader, loading, empty, error, stale, and permission states for Priority and urgency explanation Workspace
- SCR-SCR-000004: Verify responsive, keyboard, screen-reader, loading, empty, error, stale, and permission states for Decision detail and evidence bundle Workspace
- SCR-SCR-000005: Verify responsive, keyboard, screen-reader, loading, empty, error, stale, and permission states for Alternative and trade-off comparison Workspace
- SCR-SCR-000006: Verify responsive, keyboard, screen-reader, loading, empty, error, stale, and permission states for Assignment and due-date control Workspace
- SCR-SCR-000007: Verify responsive, keyboard, screen-reader, loading, empty, error, stale, and permission states for Approval and escalation Workspace
- SCR-SCR-000008: Verify responsive, keyboard, screen-reader, loading, empty, error, stale, and permission states for Action and rationale recording Workspace
- SCR-SCR-000009: Verify responsive, keyboard, screen-reader, loading, empty, error, stale, and permission states for Outcome follow-up and learning Workspace
