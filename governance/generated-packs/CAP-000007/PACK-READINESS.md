# Draft Pack Set — CAP-000007 CRM Core Capability

**Authority:** DRAFT_NOT_AUTHORIZED  
**Promotion gate:** BLOCKED_SOURCE_INCOMPLETE  
**Source fingerprint:** `f5030a90844f942ea3561164731a21187b3bc67a4446f4acd836f4a0ddc69c9c`  
**Traceability:** 55%  
**Blockers:** 47

## Blockers

- MET-000043: metric formula is not approved
- MET-000044: metric formula is not approved
- MET-000045: metric formula is not approved
- MET-000046: metric formula is not approved
- MET-000047: metric formula is not approved
- MET-000048: metric formula is not approved
- MET-000049: metric formula is not approved
- MET-000050: metric formula is not approved
- PROMPT-000025: prompt template and evaluation are not approved
- PROMPT-000026: prompt template and evaluation are not approved
- PROMPT-000027: prompt template and evaluation are not approved
- PROMPT-000028: prompt template and evaluation are not approved
- PROMPT-000029: prompt template and evaluation are not approved
- PROMPT-000030: prompt template and evaluation are not approved
- WF-000047: ordered workflow steps are not approved
- WF-000048: ordered workflow steps are not approved
- WF-000049: ordered workflow steps are not approved
- WF-000050: ordered workflow steps are not approved
- WF-000051: ordered workflow steps are not approved
- WF-000052: ordered workflow steps are not approved
- WF-000053: ordered workflow steps are not approved
- WF-000054: ordered workflow steps are not approved
- UF-000055: UI transitions and recovery states are not approved
- UF-000056: UI transitions and recovery states are not approved
- UF-000057: UI transitions and recovery states are not approved
- UF-000058: UI transitions and recovery states are not approved
- UF-000059: UI transitions and recovery states are not approved
- UF-000060: UI transitions and recovery states are not approved
- UF-000061: UI transitions and recovery states are not approved
- UF-000062: UI transitions and recovery states are not approved
- UF-000063: UI transitions and recovery states are not approved
- EVT-000042: event domain payload is not approved
- EVT-000043: event domain payload is not approved
- EVT-000044: event domain payload is not approved
- EVT-000045: event domain payload is not approved
- EVT-000046: event domain payload is not approved
- EVT-000047: event domain payload is not approved
- EVT-000048: event domain payload is not approved
- EVT-000049: event domain payload is not approved
- API-000049: API request and response schema is not approved
- API-000050: API request and response schema is not approved
- API-000051: API request and response schema is not approved
- API-000052: API request and response schema is not approved
- API-000053: API request and response schema is not approved
- API-000054: API request and response schema is not approved
- API-000055: API request and response schema is not approved
- API-000056: API request and response schema is not approved

## Build scope

- FEAT-000049 — Contacts and organizations
- FEAT-000050 — Lead capture and qualification
- FEAT-000051 — Opportunity pipelines
- FEAT-000052 — Activities and tasks
- FEAT-000053 — Segmentation
- FEAT-000054 — Customer value and health
- FEAT-000055 — Campaign attribution
- FEAT-000056 — Consent and communication history

## QA scenarios

- RULE-BR-000049: Verify business rule: A person or organization is not duplicated when a verified matching rule identifies the same party.
- RULE-BR-000050: Verify business rule: Pipeline stages have ordered entry and exit criteria.
- RULE-BR-000051: Verify business rule: Opportunity probability is stage-derived unless an authorized override includes reason.
- RULE-BR-000052: Verify business rule: Activities retain actor, channel, time, outcome, and related party.
- RULE-BR-000053: Verify business rule: Marketing communication requires valid consent and suppression checks.
- RULE-BR-000054: Verify business rule: Customer lifetime value uses an approved Finance definition.
- RULE-BR-000055: Verify business rule: Churn recommendations expose factors and confidence.
- RULE-BR-000056: Verify business rule: Merged records preserve source lineage and audit history.
- WF-WF-000047: Verify happy, alternative, failure, and recovery paths for Capture and deduplicate lead
- WF-WF-000048: Verify happy, alternative, failure, and recovery paths for Qualify lead
- WF-WF-000049: Verify happy, alternative, failure, and recovery paths for Progress opportunity
- WF-WF-000050: Verify happy, alternative, failure, and recovery paths for Record activity
- WF-WF-000051: Verify happy, alternative, failure, and recovery paths for Assign next action
- WF-WF-000052: Verify happy, alternative, failure, and recovery paths for Build segment
- WF-WF-000053: Verify happy, alternative, failure, and recovery paths for Detect churn risk
- WF-WF-000054: Verify happy, alternative, failure, and recovery paths for Win/loss review
- API-API-000049: Verify request, response, authorization, idempotency, pagination, validation, and errors for CRM Contacts and organizations API
- API-API-000050: Verify request, response, authorization, idempotency, pagination, validation, and errors for CRM Lead capture and qualification API
- API-API-000051: Verify request, response, authorization, idempotency, pagination, validation, and errors for CRM Opportunity pipelines API
- API-API-000052: Verify request, response, authorization, idempotency, pagination, validation, and errors for CRM Activities and tasks API
- API-API-000053: Verify request, response, authorization, idempotency, pagination, validation, and errors for CRM Segmentation API
- API-API-000054: Verify request, response, authorization, idempotency, pagination, validation, and errors for CRM Customer value and health API
- API-API-000055: Verify request, response, authorization, idempotency, pagination, validation, and errors for CRM Campaign attribution API
- API-API-000056: Verify request, response, authorization, idempotency, pagination, validation, and errors for CRM Consent and communication history API
- EVT-EVT-000042: Verify production, schema compatibility, ordering, duplication, retry, and idempotent consumption for LeadCaptured
- EVT-EVT-000043: Verify production, schema compatibility, ordering, duplication, retry, and idempotent consumption for LeadQualified
- EVT-EVT-000044: Verify production, schema compatibility, ordering, duplication, retry, and idempotent consumption for OpportunityStageChanged
- EVT-EVT-000045: Verify production, schema compatibility, ordering, duplication, retry, and idempotent consumption for OpportunityWon
- EVT-EVT-000046: Verify production, schema compatibility, ordering, duplication, retry, and idempotent consumption for OpportunityLost
- EVT-EVT-000047: Verify production, schema compatibility, ordering, duplication, retry, and idempotent consumption for ActivityCompleted
- EVT-EVT-000048: Verify production, schema compatibility, ordering, duplication, retry, and idempotent consumption for ChurnRiskDetected
- EVT-EVT-000049: Verify production, schema compatibility, ordering, duplication, retry, and idempotent consumption for ConsentChanged
- PERM-PERM-000097: Verify allow, deny, tenant isolation, escalation prevention, and audit evidence for Read Contacts and organizations
- PERM-PERM-000098: Verify allow, deny, tenant isolation, escalation prevention, and audit evidence for Manage Contacts and organizations
- PERM-PERM-000099: Verify allow, deny, tenant isolation, escalation prevention, and audit evidence for Read Lead capture and qualification
- PERM-PERM-000100: Verify allow, deny, tenant isolation, escalation prevention, and audit evidence for Manage Lead capture and qualification
- PERM-PERM-000101: Verify allow, deny, tenant isolation, escalation prevention, and audit evidence for Read Opportunity pipelines
- PERM-PERM-000102: Verify allow, deny, tenant isolation, escalation prevention, and audit evidence for Manage Opportunity pipelines
- PERM-PERM-000103: Verify allow, deny, tenant isolation, escalation prevention, and audit evidence for Read Activities and tasks
- PERM-PERM-000104: Verify allow, deny, tenant isolation, escalation prevention, and audit evidence for Manage Activities and tasks
- PERM-PERM-000105: Verify allow, deny, tenant isolation, escalation prevention, and audit evidence for Read Segmentation
- PERM-PERM-000106: Verify allow, deny, tenant isolation, escalation prevention, and audit evidence for Manage Segmentation
- PERM-PERM-000107: Verify allow, deny, tenant isolation, escalation prevention, and audit evidence for Read Customer value and health
- PERM-PERM-000108: Verify allow, deny, tenant isolation, escalation prevention, and audit evidence for Manage Customer value and health
- PERM-PERM-000109: Verify allow, deny, tenant isolation, escalation prevention, and audit evidence for Read Campaign attribution
- PERM-PERM-000110: Verify allow, deny, tenant isolation, escalation prevention, and audit evidence for Manage Campaign attribution
- PERM-PERM-000111: Verify allow, deny, tenant isolation, escalation prevention, and audit evidence for Read Consent and communication history
- PERM-PERM-000112: Verify allow, deny, tenant isolation, escalation prevention, and audit evidence for Manage Consent and communication history
- SCR-SCR-000055: Verify responsive, keyboard, screen-reader, loading, empty, error, stale, and permission states for CRM Decision Dashboard
- SCR-SCR-000056: Verify responsive, keyboard, screen-reader, loading, empty, error, stale, and permission states for Contacts and organizations Workspace
- SCR-SCR-000057: Verify responsive, keyboard, screen-reader, loading, empty, error, stale, and permission states for Lead capture and qualification Workspace
- SCR-SCR-000058: Verify responsive, keyboard, screen-reader, loading, empty, error, stale, and permission states for Opportunity pipelines Workspace
- SCR-SCR-000059: Verify responsive, keyboard, screen-reader, loading, empty, error, stale, and permission states for Activities and tasks Workspace
- SCR-SCR-000060: Verify responsive, keyboard, screen-reader, loading, empty, error, stale, and permission states for Segmentation Workspace
- SCR-SCR-000061: Verify responsive, keyboard, screen-reader, loading, empty, error, stale, and permission states for Customer value and health Workspace
- SCR-SCR-000062: Verify responsive, keyboard, screen-reader, loading, empty, error, stale, and permission states for Campaign attribution Workspace
- SCR-SCR-000063: Verify responsive, keyboard, screen-reader, loading, empty, error, stale, and permission states for Consent and communication history Workspace
