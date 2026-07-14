# Draft Pack Set — CAP-000009 Documents Core Capability

**Authority:** DRAFT_NOT_AUTHORIZED  
**Promotion gate:** BLOCKED_SOURCE_INCOMPLETE  
**Source fingerprint:** `2884de495224b51e5594cf846cf985c4cb463124f53d0b52fc4c4112fee855da`  
**Traceability:** 55%  
**Blockers:** 44

## Blockers

- MET-000057: metric formula is not approved
- MET-000058: metric formula is not approved
- MET-000059: metric formula is not approved
- MET-000060: metric formula is not approved
- MET-000061: metric formula is not approved
- MET-000062: metric formula is not approved
- MET-000063: metric formula is not approved
- PROMPT-000036: prompt template and evaluation are not approved
- PROMPT-000037: prompt template and evaluation are not approved
- PROMPT-000038: prompt template and evaluation are not approved
- PROMPT-000039: prompt template and evaluation are not approved
- PROMPT-000040: prompt template and evaluation are not approved
- WF-000063: ordered workflow steps are not approved
- WF-000064: ordered workflow steps are not approved
- WF-000065: ordered workflow steps are not approved
- WF-000066: ordered workflow steps are not approved
- WF-000067: ordered workflow steps are not approved
- WF-000068: ordered workflow steps are not approved
- WF-000069: ordered workflow steps are not approved
- WF-000070: ordered workflow steps are not approved
- UF-000073: UI transitions and recovery states are not approved
- UF-000074: UI transitions and recovery states are not approved
- UF-000075: UI transitions and recovery states are not approved
- UF-000076: UI transitions and recovery states are not approved
- UF-000077: UI transitions and recovery states are not approved
- UF-000078: UI transitions and recovery states are not approved
- UF-000079: UI transitions and recovery states are not approved
- UF-000080: UI transitions and recovery states are not approved
- UF-000081: UI transitions and recovery states are not approved
- EVT-000056: event domain payload is not approved
- EVT-000057: event domain payload is not approved
- EVT-000058: event domain payload is not approved
- EVT-000059: event domain payload is not approved
- EVT-000060: event domain payload is not approved
- EVT-000061: event domain payload is not approved
- EVT-000062: event domain payload is not approved
- API-000065: API request and response schema is not approved
- API-000066: API request and response schema is not approved
- API-000067: API request and response schema is not approved
- API-000068: API request and response schema is not approved
- API-000069: API request and response schema is not approved
- API-000070: API request and response schema is not approved
- API-000071: API request and response schema is not approved
- API-000072: API request and response schema is not approved

## Build scope

- FEAT-000065 — Document metadata and storage
- FEAT-000066 — Templates
- FEAT-000067 — Generation
- FEAT-000068 — Versioning
- FEAT-000069 — Review and approval
- FEAT-000070 — Electronic signature adapters
- FEAT-000071 — OCR/import
- FEAT-000072 — Retention and legal hold

## QA scenarios

- RULE-BR-000065: Verify business rule: A document has one authoritative current version and immutable prior versions.
- RULE-BR-000066: Verify business rule: Generated documents record template version and input snapshot.
- RULE-BR-000067: Verify business rule: Signed versions are immutable.
- RULE-BR-000068: Verify business rule: Access follows workspace and linked-resource policy.
- RULE-BR-000069: Verify business rule: File hashes detect corruption and duplicate content.
- RULE-BR-000070: Verify business rule: Retention and legal hold are evaluated before deletion.
- RULE-BR-000071: Verify business rule: OCR text is labeled as extracted and retains confidence.
- RULE-BR-000072: Verify business rule: External signatures are verified through provider evidence.
- WF-WF-000063: Verify happy, alternative, failure, and recovery paths for Upload and classify
- WF-WF-000064: Verify happy, alternative, failure, and recovery paths for Generate from template
- WF-WF-000065: Verify happy, alternative, failure, and recovery paths for Create new version
- WF-WF-000066: Verify happy, alternative, failure, and recovery paths for Review and approve
- WF-WF-000067: Verify happy, alternative, failure, and recovery paths for Send for signature
- WF-WF-000068: Verify happy, alternative, failure, and recovery paths for Extract and index
- WF-WF-000069: Verify happy, alternative, failure, and recovery paths for Place legal hold
- WF-WF-000070: Verify happy, alternative, failure, and recovery paths for Archive or dispose
- API-API-000065: Verify request, response, authorization, idempotency, pagination, validation, and errors for Documents Document metadata and storage API
- API-API-000066: Verify request, response, authorization, idempotency, pagination, validation, and errors for Documents Templates API
- API-API-000067: Verify request, response, authorization, idempotency, pagination, validation, and errors for Documents Generation API
- API-API-000068: Verify request, response, authorization, idempotency, pagination, validation, and errors for Documents Versioning API
- API-API-000069: Verify request, response, authorization, idempotency, pagination, validation, and errors for Documents Review and approval API
- API-API-000070: Verify request, response, authorization, idempotency, pagination, validation, and errors for Documents Electronic signature adapters API
- API-API-000071: Verify request, response, authorization, idempotency, pagination, validation, and errors for Documents OCR/import API
- API-API-000072: Verify request, response, authorization, idempotency, pagination, validation, and errors for Documents Retention and legal hold API
- EVT-EVT-000056: Verify production, schema compatibility, ordering, duplication, retry, and idempotent consumption for DocumentUploaded
- EVT-EVT-000057: Verify production, schema compatibility, ordering, duplication, retry, and idempotent consumption for DocumentGenerated
- EVT-EVT-000058: Verify production, schema compatibility, ordering, duplication, retry, and idempotent consumption for DocumentVersionCreated
- EVT-EVT-000059: Verify production, schema compatibility, ordering, duplication, retry, and idempotent consumption for DocumentApproved
- EVT-EVT-000060: Verify production, schema compatibility, ordering, duplication, retry, and idempotent consumption for SignatureCompleted
- EVT-EVT-000061: Verify production, schema compatibility, ordering, duplication, retry, and idempotent consumption for DocumentArchived
- EVT-EVT-000062: Verify production, schema compatibility, ordering, duplication, retry, and idempotent consumption for RetentionDispositioned
- PERM-PERM-000129: Verify allow, deny, tenant isolation, escalation prevention, and audit evidence for Read Document metadata and storage
- PERM-PERM-000130: Verify allow, deny, tenant isolation, escalation prevention, and audit evidence for Manage Document metadata and storage
- PERM-PERM-000131: Verify allow, deny, tenant isolation, escalation prevention, and audit evidence for Read Templates
- PERM-PERM-000132: Verify allow, deny, tenant isolation, escalation prevention, and audit evidence for Manage Templates
- PERM-PERM-000133: Verify allow, deny, tenant isolation, escalation prevention, and audit evidence for Read Generation
- PERM-PERM-000134: Verify allow, deny, tenant isolation, escalation prevention, and audit evidence for Manage Generation
- PERM-PERM-000135: Verify allow, deny, tenant isolation, escalation prevention, and audit evidence for Read Versioning
- PERM-PERM-000136: Verify allow, deny, tenant isolation, escalation prevention, and audit evidence for Manage Versioning
- PERM-PERM-000137: Verify allow, deny, tenant isolation, escalation prevention, and audit evidence for Read Review and approval
- PERM-PERM-000138: Verify allow, deny, tenant isolation, escalation prevention, and audit evidence for Manage Review and approval
- PERM-PERM-000139: Verify allow, deny, tenant isolation, escalation prevention, and audit evidence for Read Electronic signature adapters
- PERM-PERM-000140: Verify allow, deny, tenant isolation, escalation prevention, and audit evidence for Manage Electronic signature adapters
- PERM-PERM-000141: Verify allow, deny, tenant isolation, escalation prevention, and audit evidence for Read OCR/import
- PERM-PERM-000142: Verify allow, deny, tenant isolation, escalation prevention, and audit evidence for Manage OCR/import
- PERM-PERM-000143: Verify allow, deny, tenant isolation, escalation prevention, and audit evidence for Read Retention and legal hold
- PERM-PERM-000144: Verify allow, deny, tenant isolation, escalation prevention, and audit evidence for Manage Retention and legal hold
- SCR-SCR-000073: Verify responsive, keyboard, screen-reader, loading, empty, error, stale, and permission states for Documents Decision Dashboard
- SCR-SCR-000074: Verify responsive, keyboard, screen-reader, loading, empty, error, stale, and permission states for Document metadata and storage Workspace
- SCR-SCR-000075: Verify responsive, keyboard, screen-reader, loading, empty, error, stale, and permission states for Templates Workspace
- SCR-SCR-000076: Verify responsive, keyboard, screen-reader, loading, empty, error, stale, and permission states for Generation Workspace
- SCR-SCR-000077: Verify responsive, keyboard, screen-reader, loading, empty, error, stale, and permission states for Versioning Workspace
- SCR-SCR-000078: Verify responsive, keyboard, screen-reader, loading, empty, error, stale, and permission states for Review and approval Workspace
- SCR-SCR-000079: Verify responsive, keyboard, screen-reader, loading, empty, error, stale, and permission states for Electronic signature adapters Workspace
- SCR-SCR-000080: Verify responsive, keyboard, screen-reader, loading, empty, error, stale, and permission states for OCR/import Workspace
- SCR-SCR-000081: Verify responsive, keyboard, screen-reader, loading, empty, error, stale, and permission states for Retention and legal hold Workspace
