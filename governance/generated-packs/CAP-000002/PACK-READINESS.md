# Draft Pack Set — CAP-000002 Business Memory Core Capability

**Authority:** DRAFT_NOT_AUTHORIZED  
**Promotion gate:** BLOCKED_SOURCE_INCOMPLETE  
**Source fingerprint:** `2542d57ff44ce9fc86717c33cc068f45a79b2c035df42f7ac6082298b8aa3aca`  
**Traceability:** 55%  
**Blockers:** 40

## Blockers

- MET-000007: metric formula is not approved
- MET-000008: metric formula is not approved
- MET-000009: metric formula is not approved
- MET-000010: metric formula is not approved
- MET-000011: metric formula is not approved
- MET-000012: metric formula is not approved
- PROMPT-000006: prompt template and evaluation are not approved
- PROMPT-000007: prompt template and evaluation are not approved
- PROMPT-000008: prompt template and evaluation are not approved
- PROMPT-000009: prompt template and evaluation are not approved
- PROMPT-000010: prompt template and evaluation are not approved
- WF-000008: ordered workflow steps are not approved
- WF-000009: ordered workflow steps are not approved
- WF-000010: ordered workflow steps are not approved
- WF-000011: ordered workflow steps are not approved
- WF-000012: ordered workflow steps are not approved
- WF-000013: ordered workflow steps are not approved
- WF-000014: ordered workflow steps are not approved
- UF-000010: UI transitions and recovery states are not approved
- UF-000011: UI transitions and recovery states are not approved
- UF-000012: UI transitions and recovery states are not approved
- UF-000013: UI transitions and recovery states are not approved
- UF-000014: UI transitions and recovery states are not approved
- UF-000015: UI transitions and recovery states are not approved
- UF-000016: UI transitions and recovery states are not approved
- UF-000017: UI transitions and recovery states are not approved
- UF-000018: UI transitions and recovery states are not approved
- EVT-000007: event domain payload is not approved
- EVT-000008: event domain payload is not approved
- EVT-000009: event domain payload is not approved
- EVT-000010: event domain payload is not approved
- EVT-000011: event domain payload is not approved
- API-000009: API request and response schema is not approved
- API-000010: API request and response schema is not approved
- API-000011: API request and response schema is not approved
- API-000012: API request and response schema is not approved
- API-000013: API request and response schema is not approved
- API-000014: API request and response schema is not approved
- API-000015: API request and response schema is not approved
- API-000016: API request and response schema is not approved

## Build scope

- FEAT-000009 — Decision timeline
- FEAT-000010 — Immutable context snapshots
- FEAT-000011 — Outcome and lesson capture
- FEAT-000012 — Structured and semantic search
- FEAT-000013 — Source and freshness lineage
- FEAT-000014 — Memory collections and tags
- FEAT-000015 — Retention and privacy control
- FEAT-000016 — Citation-ready retrieval

## QA scenarios

- RULE-BR-000009: Verify business rule: Memory never becomes the transactional source of truth for operational entities.
- RULE-BR-000010: Verify business rule: Captured context remains reconstructable after source records change.
- RULE-BR-000011: Verify business rule: Permission filters execute before semantic retrieval.
- RULE-BR-000012: Verify business rule: Corrections create linked superseding versions.
- RULE-BR-000013: Verify business rule: Sources, capture time, actor, and policy are mandatory.
- RULE-BR-000014: Verify business rule: Tenant data never enters a general training corpus without explicit authorization.
- RULE-BR-000015: Verify business rule: Legal holds override scheduled deletion.
- RULE-BR-000016: Verify business rule: A lesson must link to an outcome or be labeled as an observation.
- WF-WF-000008: Verify happy, alternative, failure, and recovery paths for Capture memory
- WF-WF-000009: Verify happy, alternative, failure, and recovery paths for Enrich and index
- WF-WF-000010: Verify happy, alternative, failure, and recovery paths for Search and retrieve
- WF-WF-000011: Verify happy, alternative, failure, and recovery paths for Inspect source lineage
- WF-WF-000012: Verify happy, alternative, failure, and recovery paths for Correct by supersession
- WF-WF-000013: Verify happy, alternative, failure, and recovery paths for Apply retention
- WF-WF-000014: Verify happy, alternative, failure, and recovery paths for Export authorized memory
- API-API-000009: Verify request, response, authorization, idempotency, pagination, validation, and errors for Business Memory Decision timeline API
- API-API-000010: Verify request, response, authorization, idempotency, pagination, validation, and errors for Business Memory Immutable context snapshots API
- API-API-000011: Verify request, response, authorization, idempotency, pagination, validation, and errors for Business Memory Outcome and lesson capture API
- API-API-000012: Verify request, response, authorization, idempotency, pagination, validation, and errors for Business Memory Structured and semantic search API
- API-API-000013: Verify request, response, authorization, idempotency, pagination, validation, and errors for Business Memory Source and freshness lineage API
- API-API-000014: Verify request, response, authorization, idempotency, pagination, validation, and errors for Business Memory Memory collections and tags API
- API-API-000015: Verify request, response, authorization, idempotency, pagination, validation, and errors for Business Memory Retention and privacy control API
- API-API-000016: Verify request, response, authorization, idempotency, pagination, validation, and errors for Business Memory Citation-ready retrieval API
- EVT-EVT-000007: Verify production, schema compatibility, ordering, duplication, retry, and idempotent consumption for MemoryCaptured
- EVT-EVT-000008: Verify production, schema compatibility, ordering, duplication, retry, and idempotent consumption for MemoryIndexed
- EVT-EVT-000009: Verify production, schema compatibility, ordering, duplication, retry, and idempotent consumption for LessonRecorded
- EVT-EVT-000010: Verify production, schema compatibility, ordering, duplication, retry, and idempotent consumption for MemorySuperseded
- EVT-EVT-000011: Verify production, schema compatibility, ordering, duplication, retry, and idempotent consumption for MemoryDispositioned
- PERM-PERM-000017: Verify allow, deny, tenant isolation, escalation prevention, and audit evidence for Read Decision timeline
- PERM-PERM-000018: Verify allow, deny, tenant isolation, escalation prevention, and audit evidence for Manage Decision timeline
- PERM-PERM-000019: Verify allow, deny, tenant isolation, escalation prevention, and audit evidence for Read Immutable context snapshots
- PERM-PERM-000020: Verify allow, deny, tenant isolation, escalation prevention, and audit evidence for Manage Immutable context snapshots
- PERM-PERM-000021: Verify allow, deny, tenant isolation, escalation prevention, and audit evidence for Read Outcome and lesson capture
- PERM-PERM-000022: Verify allow, deny, tenant isolation, escalation prevention, and audit evidence for Manage Outcome and lesson capture
- PERM-PERM-000023: Verify allow, deny, tenant isolation, escalation prevention, and audit evidence for Read Structured and semantic search
- PERM-PERM-000024: Verify allow, deny, tenant isolation, escalation prevention, and audit evidence for Manage Structured and semantic search
- PERM-PERM-000025: Verify allow, deny, tenant isolation, escalation prevention, and audit evidence for Read Source and freshness lineage
- PERM-PERM-000026: Verify allow, deny, tenant isolation, escalation prevention, and audit evidence for Manage Source and freshness lineage
- PERM-PERM-000027: Verify allow, deny, tenant isolation, escalation prevention, and audit evidence for Read Memory collections and tags
- PERM-PERM-000028: Verify allow, deny, tenant isolation, escalation prevention, and audit evidence for Manage Memory collections and tags
- PERM-PERM-000029: Verify allow, deny, tenant isolation, escalation prevention, and audit evidence for Read Retention and privacy control
- PERM-PERM-000030: Verify allow, deny, tenant isolation, escalation prevention, and audit evidence for Manage Retention and privacy control
- PERM-PERM-000031: Verify allow, deny, tenant isolation, escalation prevention, and audit evidence for Read Citation-ready retrieval
- PERM-PERM-000032: Verify allow, deny, tenant isolation, escalation prevention, and audit evidence for Manage Citation-ready retrieval
- SCR-SCR-000010: Verify responsive, keyboard, screen-reader, loading, empty, error, stale, and permission states for Business Memory Decision Dashboard
- SCR-SCR-000011: Verify responsive, keyboard, screen-reader, loading, empty, error, stale, and permission states for Decision timeline Workspace
- SCR-SCR-000012: Verify responsive, keyboard, screen-reader, loading, empty, error, stale, and permission states for Immutable context snapshots Workspace
- SCR-SCR-000013: Verify responsive, keyboard, screen-reader, loading, empty, error, stale, and permission states for Outcome and lesson capture Workspace
- SCR-SCR-000014: Verify responsive, keyboard, screen-reader, loading, empty, error, stale, and permission states for Structured and semantic search Workspace
- SCR-SCR-000015: Verify responsive, keyboard, screen-reader, loading, empty, error, stale, and permission states for Source and freshness lineage Workspace
- SCR-SCR-000016: Verify responsive, keyboard, screen-reader, loading, empty, error, stale, and permission states for Memory collections and tags Workspace
- SCR-SCR-000017: Verify responsive, keyboard, screen-reader, loading, empty, error, stale, and permission states for Retention and privacy control Workspace
- SCR-SCR-000018: Verify responsive, keyboard, screen-reader, loading, empty, error, stale, and permission states for Citation-ready retrieval Workspace
