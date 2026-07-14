# Draft Pack Set — CAP-000008 Analytics Core Capability

**Authority:** DRAFT_NOT_AUTHORIZED  
**Promotion gate:** BLOCKED_SOURCE_INCOMPLETE  
**Source fingerprint:** `b805e977a300194ebdf58e6dee48a851b87c2b4fd6272d49d95f9d4879aea063`  
**Traceability:** 55%  
**Blockers:** 42

## Blockers

- MET-000051: metric formula is not approved
- MET-000052: metric formula is not approved
- MET-000053: metric formula is not approved
- MET-000054: metric formula is not approved
- MET-000055: metric formula is not approved
- MET-000056: metric formula is not approved
- PROMPT-000031: prompt template and evaluation are not approved
- PROMPT-000032: prompt template and evaluation are not approved
- PROMPT-000033: prompt template and evaluation are not approved
- PROMPT-000034: prompt template and evaluation are not approved
- PROMPT-000035: prompt template and evaluation are not approved
- WF-000055: ordered workflow steps are not approved
- WF-000056: ordered workflow steps are not approved
- WF-000057: ordered workflow steps are not approved
- WF-000058: ordered workflow steps are not approved
- WF-000059: ordered workflow steps are not approved
- WF-000060: ordered workflow steps are not approved
- WF-000061: ordered workflow steps are not approved
- WF-000062: ordered workflow steps are not approved
- UF-000064: UI transitions and recovery states are not approved
- UF-000065: UI transitions and recovery states are not approved
- UF-000066: UI transitions and recovery states are not approved
- UF-000067: UI transitions and recovery states are not approved
- UF-000068: UI transitions and recovery states are not approved
- UF-000069: UI transitions and recovery states are not approved
- UF-000070: UI transitions and recovery states are not approved
- UF-000071: UI transitions and recovery states are not approved
- UF-000072: UI transitions and recovery states are not approved
- EVT-000050: event domain payload is not approved
- EVT-000051: event domain payload is not approved
- EVT-000052: event domain payload is not approved
- EVT-000053: event domain payload is not approved
- EVT-000054: event domain payload is not approved
- EVT-000055: event domain payload is not approved
- API-000057: API request and response schema is not approved
- API-000058: API request and response schema is not approved
- API-000059: API request and response schema is not approved
- API-000060: API request and response schema is not approved
- API-000061: API request and response schema is not approved
- API-000062: API request and response schema is not approved
- API-000063: API request and response schema is not approved
- API-000064: API request and response schema is not approved

## Build scope

- FEAT-000057 — Metric registry
- FEAT-000058 — Semantic definitions
- FEAT-000059 — Dashboard composition
- FEAT-000060 — Filters and saved views
- FEAT-000061 — Drill-down and lineage
- FEAT-000062 — Scheduled reports
- FEAT-000063 — Exports
- FEAT-000064 — Annotations and forecast overlays

## QA scenarios

- RULE-BR-000057: Verify business rule: Every metric has one owner, formula, unit, sources, filters, refresh policy, and version.
- RULE-BR-000058: Verify business rule: Dashboards answer a declared decision question.
- RULE-BR-000059: Verify business rule: Drill-down reconciles to the displayed value within documented rounding.
- RULE-BR-000060: Verify business rule: Stale or failed data is visible and never silently presented as current.
- RULE-BR-000061: Verify business rule: Exports enforce the same permissions as interactive views.
- RULE-BR-000062: Verify business rule: Metric changes create a new version and effective date.
- RULE-BR-000063: Verify business rule: Charts include accessible text or tabular alternatives.
- RULE-BR-000064: Verify business rule: Scheduled reports record parameters and source freshness.
- WF-WF-000055: Verify happy, alternative, failure, and recovery paths for Define and approve metric
- WF-WF-000056: Verify happy, alternative, failure, and recovery paths for Compute metric
- WF-WF-000057: Verify happy, alternative, failure, and recovery paths for Compose dashboard
- WF-WF-000058: Verify happy, alternative, failure, and recovery paths for Filter and drill down
- WF-WF-000059: Verify happy, alternative, failure, and recovery paths for Annotate change
- WF-WF-000060: Verify happy, alternative, failure, and recovery paths for Schedule report
- WF-WF-000061: Verify happy, alternative, failure, and recovery paths for Export data
- WF-WF-000062: Verify happy, alternative, failure, and recovery paths for Handle data-quality failure
- API-API-000057: Verify request, response, authorization, idempotency, pagination, validation, and errors for Analytics Metric registry API
- API-API-000058: Verify request, response, authorization, idempotency, pagination, validation, and errors for Analytics Semantic definitions API
- API-API-000059: Verify request, response, authorization, idempotency, pagination, validation, and errors for Analytics Dashboard composition API
- API-API-000060: Verify request, response, authorization, idempotency, pagination, validation, and errors for Analytics Filters and saved views API
- API-API-000061: Verify request, response, authorization, idempotency, pagination, validation, and errors for Analytics Drill-down and lineage API
- API-API-000062: Verify request, response, authorization, idempotency, pagination, validation, and errors for Analytics Scheduled reports API
- API-API-000063: Verify request, response, authorization, idempotency, pagination, validation, and errors for Analytics Exports API
- API-API-000064: Verify request, response, authorization, idempotency, pagination, validation, and errors for Analytics Annotations and forecast overlays API
- EVT-EVT-000050: Verify production, schema compatibility, ordering, duplication, retry, and idempotent consumption for MetricUpdated
- EVT-EVT-000051: Verify production, schema compatibility, ordering, duplication, retry, and idempotent consumption for MetricThresholdBreached
- EVT-EVT-000052: Verify production, schema compatibility, ordering, duplication, retry, and idempotent consumption for DashboardPublished
- EVT-EVT-000053: Verify production, schema compatibility, ordering, duplication, retry, and idempotent consumption for ReportCompleted
- EVT-EVT-000054: Verify production, schema compatibility, ordering, duplication, retry, and idempotent consumption for ReportFailed
- EVT-EVT-000055: Verify production, schema compatibility, ordering, duplication, retry, and idempotent consumption for DataQualityFailed
- PERM-PERM-000113: Verify allow, deny, tenant isolation, escalation prevention, and audit evidence for Read Metric registry
- PERM-PERM-000114: Verify allow, deny, tenant isolation, escalation prevention, and audit evidence for Manage Metric registry
- PERM-PERM-000115: Verify allow, deny, tenant isolation, escalation prevention, and audit evidence for Read Semantic definitions
- PERM-PERM-000116: Verify allow, deny, tenant isolation, escalation prevention, and audit evidence for Manage Semantic definitions
- PERM-PERM-000117: Verify allow, deny, tenant isolation, escalation prevention, and audit evidence for Read Dashboard composition
- PERM-PERM-000118: Verify allow, deny, tenant isolation, escalation prevention, and audit evidence for Manage Dashboard composition
- PERM-PERM-000119: Verify allow, deny, tenant isolation, escalation prevention, and audit evidence for Read Filters and saved views
- PERM-PERM-000120: Verify allow, deny, tenant isolation, escalation prevention, and audit evidence for Manage Filters and saved views
- PERM-PERM-000121: Verify allow, deny, tenant isolation, escalation prevention, and audit evidence for Read Drill-down and lineage
- PERM-PERM-000122: Verify allow, deny, tenant isolation, escalation prevention, and audit evidence for Manage Drill-down and lineage
- PERM-PERM-000123: Verify allow, deny, tenant isolation, escalation prevention, and audit evidence for Read Scheduled reports
- PERM-PERM-000124: Verify allow, deny, tenant isolation, escalation prevention, and audit evidence for Manage Scheduled reports
- PERM-PERM-000125: Verify allow, deny, tenant isolation, escalation prevention, and audit evidence for Read Exports
- PERM-PERM-000126: Verify allow, deny, tenant isolation, escalation prevention, and audit evidence for Manage Exports
- PERM-PERM-000127: Verify allow, deny, tenant isolation, escalation prevention, and audit evidence for Read Annotations and forecast overlays
- PERM-PERM-000128: Verify allow, deny, tenant isolation, escalation prevention, and audit evidence for Manage Annotations and forecast overlays
- SCR-SCR-000064: Verify responsive, keyboard, screen-reader, loading, empty, error, stale, and permission states for Analytics Decision Dashboard
- SCR-SCR-000065: Verify responsive, keyboard, screen-reader, loading, empty, error, stale, and permission states for Metric registry Workspace
- SCR-SCR-000066: Verify responsive, keyboard, screen-reader, loading, empty, error, stale, and permission states for Semantic definitions Workspace
- SCR-SCR-000067: Verify responsive, keyboard, screen-reader, loading, empty, error, stale, and permission states for Dashboard composition Workspace
- SCR-SCR-000068: Verify responsive, keyboard, screen-reader, loading, empty, error, stale, and permission states for Filters and saved views Workspace
- SCR-SCR-000069: Verify responsive, keyboard, screen-reader, loading, empty, error, stale, and permission states for Drill-down and lineage Workspace
- SCR-SCR-000070: Verify responsive, keyboard, screen-reader, loading, empty, error, stale, and permission states for Scheduled reports Workspace
- SCR-SCR-000071: Verify responsive, keyboard, screen-reader, loading, empty, error, stale, and permission states for Exports Workspace
- SCR-SCR-000072: Verify responsive, keyboard, screen-reader, loading, empty, error, stale, and permission states for Annotations and forecast overlays Workspace
