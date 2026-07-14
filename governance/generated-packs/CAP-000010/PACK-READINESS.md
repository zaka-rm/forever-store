# Draft Pack Set — CAP-000010 Notifications Core Capability

**Authority:** DRAFT_NOT_AUTHORIZED  
**Promotion gate:** BLOCKED_SOURCE_INCOMPLETE  
**Source fingerprint:** `bc318cba3ed3296e2402fbb5cd2f94e5dc5326989cd26e542eeff9f41df8636e`  
**Traceability:** 55%  
**Blockers:** 43

## Blockers

- MET-000064: metric formula is not approved
- MET-000065: metric formula is not approved
- MET-000066: metric formula is not approved
- MET-000067: metric formula is not approved
- MET-000068: metric formula is not approved
- MET-000069: metric formula is not approved
- MET-000070: metric formula is not approved
- PROMPT-000041: prompt template and evaluation are not approved
- PROMPT-000042: prompt template and evaluation are not approved
- PROMPT-000043: prompt template and evaluation are not approved
- PROMPT-000044: prompt template and evaluation are not approved
- WF-000071: ordered workflow steps are not approved
- WF-000072: ordered workflow steps are not approved
- WF-000073: ordered workflow steps are not approved
- WF-000074: ordered workflow steps are not approved
- WF-000075: ordered workflow steps are not approved
- WF-000076: ordered workflow steps are not approved
- WF-000077: ordered workflow steps are not approved
- WF-000078: ordered workflow steps are not approved
- UF-000082: UI transitions and recovery states are not approved
- UF-000083: UI transitions and recovery states are not approved
- UF-000084: UI transitions and recovery states are not approved
- UF-000085: UI transitions and recovery states are not approved
- UF-000086: UI transitions and recovery states are not approved
- UF-000087: UI transitions and recovery states are not approved
- UF-000088: UI transitions and recovery states are not approved
- UF-000089: UI transitions and recovery states are not approved
- UF-000090: UI transitions and recovery states are not approved
- EVT-000063: event domain payload is not approved
- EVT-000064: event domain payload is not approved
- EVT-000065: event domain payload is not approved
- EVT-000066: event domain payload is not approved
- EVT-000067: event domain payload is not approved
- EVT-000068: event domain payload is not approved
- EVT-000069: event domain payload is not approved
- API-000073: API request and response schema is not approved
- API-000074: API request and response schema is not approved
- API-000075: API request and response schema is not approved
- API-000076: API request and response schema is not approved
- API-000077: API request and response schema is not approved
- API-000078: API request and response schema is not approved
- API-000079: API request and response schema is not approved
- API-000080: API request and response schema is not approved

## Build scope

- FEAT-000073 — Unified notification events
- FEAT-000074 — Templates and versions
- FEAT-000075 — Category and priority
- FEAT-000076 — User preferences and quiet hours
- FEAT-000077 — Channel routing
- FEAT-000078 — Delivery retries
- FEAT-000079 — Digest and grouping
- FEAT-000080 — Escalation and audit

## QA scenarios

- RULE-BR-000073: Verify business rule: Every notification names the triggering event and intended action.
- RULE-BR-000074: Verify business rule: Mandatory security and approval notices cannot be disabled.
- RULE-BR-000075: Verify business rule: Preferences and quiet hours are evaluated before optional delivery.
- RULE-BR-000076: Verify business rule: Duplicate source events create one user-visible effect.
- RULE-BR-000077: Verify business rule: Template versions are immutable after publication.
- RULE-BR-000078: Verify business rule: Retries are bounded and terminal failure has an owner.
- RULE-BR-000079: Verify business rule: Sensitive content is minimized by channel.
- RULE-BR-000080: Verify business rule: Status is derived from per-channel delivery evidence.
- WF-WF-000071: Verify happy, alternative, failure, and recovery paths for Create notification
- WF-WF-000072: Verify happy, alternative, failure, and recovery paths for Evaluate policy
- WF-WF-000073: Verify happy, alternative, failure, and recovery paths for Render template
- WF-WF-000074: Verify happy, alternative, failure, and recovery paths for Route channel
- WF-WF-000075: Verify happy, alternative, failure, and recovery paths for Deliver and retry
- WF-WF-000076: Verify happy, alternative, failure, and recovery paths for Group digest
- WF-WF-000077: Verify happy, alternative, failure, and recovery paths for Escalate failure
- WF-WF-000078: Verify happy, alternative, failure, and recovery paths for Read/dismiss/act
- API-API-000073: Verify request, response, authorization, idempotency, pagination, validation, and errors for Notifications Unified notification events API
- API-API-000074: Verify request, response, authorization, idempotency, pagination, validation, and errors for Notifications Templates and versions API
- API-API-000075: Verify request, response, authorization, idempotency, pagination, validation, and errors for Notifications Category and priority API
- API-API-000076: Verify request, response, authorization, idempotency, pagination, validation, and errors for Notifications User preferences and quiet hours API
- API-API-000077: Verify request, response, authorization, idempotency, pagination, validation, and errors for Notifications Channel routing API
- API-API-000078: Verify request, response, authorization, idempotency, pagination, validation, and errors for Notifications Delivery retries API
- API-API-000079: Verify request, response, authorization, idempotency, pagination, validation, and errors for Notifications Digest and grouping API
- API-API-000080: Verify request, response, authorization, idempotency, pagination, validation, and errors for Notifications Escalation and audit API
- EVT-EVT-000063: Verify production, schema compatibility, ordering, duplication, retry, and idempotent consumption for NotificationQueued
- EVT-EVT-000064: Verify production, schema compatibility, ordering, duplication, retry, and idempotent consumption for NotificationDelivered
- EVT-EVT-000065: Verify production, schema compatibility, ordering, duplication, retry, and idempotent consumption for NotificationRead
- EVT-EVT-000066: Verify production, schema compatibility, ordering, duplication, retry, and idempotent consumption for NotificationActioned
- EVT-EVT-000067: Verify production, schema compatibility, ordering, duplication, retry, and idempotent consumption for NotificationFailed
- EVT-EVT-000068: Verify production, schema compatibility, ordering, duplication, retry, and idempotent consumption for DigestSent
- EVT-EVT-000069: Verify production, schema compatibility, ordering, duplication, retry, and idempotent consumption for EscalationTriggered
- PERM-PERM-000145: Verify allow, deny, tenant isolation, escalation prevention, and audit evidence for Read Unified notification events
- PERM-PERM-000146: Verify allow, deny, tenant isolation, escalation prevention, and audit evidence for Manage Unified notification events
- PERM-PERM-000147: Verify allow, deny, tenant isolation, escalation prevention, and audit evidence for Read Templates and versions
- PERM-PERM-000148: Verify allow, deny, tenant isolation, escalation prevention, and audit evidence for Manage Templates and versions
- PERM-PERM-000149: Verify allow, deny, tenant isolation, escalation prevention, and audit evidence for Read Category and priority
- PERM-PERM-000150: Verify allow, deny, tenant isolation, escalation prevention, and audit evidence for Manage Category and priority
- PERM-PERM-000151: Verify allow, deny, tenant isolation, escalation prevention, and audit evidence for Read User preferences and quiet hours
- PERM-PERM-000152: Verify allow, deny, tenant isolation, escalation prevention, and audit evidence for Manage User preferences and quiet hours
- PERM-PERM-000153: Verify allow, deny, tenant isolation, escalation prevention, and audit evidence for Read Channel routing
- PERM-PERM-000154: Verify allow, deny, tenant isolation, escalation prevention, and audit evidence for Manage Channel routing
- PERM-PERM-000155: Verify allow, deny, tenant isolation, escalation prevention, and audit evidence for Read Delivery retries
- PERM-PERM-000156: Verify allow, deny, tenant isolation, escalation prevention, and audit evidence for Manage Delivery retries
- PERM-PERM-000157: Verify allow, deny, tenant isolation, escalation prevention, and audit evidence for Read Digest and grouping
- PERM-PERM-000158: Verify allow, deny, tenant isolation, escalation prevention, and audit evidence for Manage Digest and grouping
- PERM-PERM-000159: Verify allow, deny, tenant isolation, escalation prevention, and audit evidence for Read Escalation and audit
- PERM-PERM-000160: Verify allow, deny, tenant isolation, escalation prevention, and audit evidence for Manage Escalation and audit
- SCR-SCR-000082: Verify responsive, keyboard, screen-reader, loading, empty, error, stale, and permission states for Notifications Decision Dashboard
- SCR-SCR-000083: Verify responsive, keyboard, screen-reader, loading, empty, error, stale, and permission states for Unified notification events Workspace
- SCR-SCR-000084: Verify responsive, keyboard, screen-reader, loading, empty, error, stale, and permission states for Templates and versions Workspace
- SCR-SCR-000085: Verify responsive, keyboard, screen-reader, loading, empty, error, stale, and permission states for Category and priority Workspace
- SCR-SCR-000086: Verify responsive, keyboard, screen-reader, loading, empty, error, stale, and permission states for User preferences and quiet hours Workspace
- SCR-SCR-000087: Verify responsive, keyboard, screen-reader, loading, empty, error, stale, and permission states for Channel routing Workspace
- SCR-SCR-000088: Verify responsive, keyboard, screen-reader, loading, empty, error, stale, and permission states for Delivery retries Workspace
- SCR-SCR-000089: Verify responsive, keyboard, screen-reader, loading, empty, error, stale, and permission states for Digest and grouping Workspace
- SCR-SCR-000090: Verify responsive, keyboard, screen-reader, loading, empty, error, stale, and permission states for Escalation and audit Workspace
