# Draft Pack Set — CAP-000012 Manufacturing Core Capability

**Authority:** DRAFT_NOT_AUTHORIZED  
**Promotion gate:** BLOCKED_SOURCE_INCOMPLETE  
**Source fingerprint:** `4148231f397f9650313cdb509be26ea1f8858713095b949904de26d7f91cc908`  
**Traceability:** 55%  
**Blockers:** 46

## Blockers

- MET-000079: metric formula is not approved
- MET-000080: metric formula is not approved
- MET-000081: metric formula is not approved
- MET-000082: metric formula is not approved
- MET-000083: metric formula is not approved
- MET-000084: metric formula is not approved
- MET-000085: metric formula is not approved
- MET-000086: metric formula is not approved
- PROMPT-000050: prompt template and evaluation are not approved
- PROMPT-000051: prompt template and evaluation are not approved
- PROMPT-000052: prompt template and evaluation are not approved
- PROMPT-000053: prompt template and evaluation are not approved
- PROMPT-000054: prompt template and evaluation are not approved
- WF-000087: ordered workflow steps are not approved
- WF-000088: ordered workflow steps are not approved
- WF-000089: ordered workflow steps are not approved
- WF-000090: ordered workflow steps are not approved
- WF-000091: ordered workflow steps are not approved
- WF-000092: ordered workflow steps are not approved
- WF-000093: ordered workflow steps are not approved
- WF-000094: ordered workflow steps are not approved
- UF-000100: UI transitions and recovery states are not approved
- UF-000101: UI transitions and recovery states are not approved
- UF-000102: UI transitions and recovery states are not approved
- UF-000103: UI transitions and recovery states are not approved
- UF-000104: UI transitions and recovery states are not approved
- UF-000105: UI transitions and recovery states are not approved
- UF-000106: UI transitions and recovery states are not approved
- UF-000107: UI transitions and recovery states are not approved
- UF-000108: UI transitions and recovery states are not approved
- EVT-000077: event domain payload is not approved
- EVT-000078: event domain payload is not approved
- EVT-000079: event domain payload is not approved
- EVT-000080: event domain payload is not approved
- EVT-000081: event domain payload is not approved
- EVT-000082: event domain payload is not approved
- EVT-000083: event domain payload is not approved
- EVT-000084: event domain payload is not approved
- API-000089: API request and response schema is not approved
- API-000090: API request and response schema is not approved
- API-000091: API request and response schema is not approved
- API-000092: API request and response schema is not approved
- API-000093: API request and response schema is not approved
- API-000094: API request and response schema is not approved
- API-000095: API request and response schema is not approved
- API-000096: API request and response schema is not approved

## Build scope

- FEAT-000089 — Bills of materials
- FEAT-000090 — Routings and work centers
- FEAT-000091 — Production orders
- FEAT-000092 — Material requirements
- FEAT-000093 — Scheduling and capacity
- FEAT-000094 — Issue/consume/produce
- FEAT-000095 — Quality control
- FEAT-000096 — Yield, scrap, downtime, and cost

## QA scenarios

- RULE-BR-000089: Verify business rule: Released orders reference approved BOM and routing versions.
- RULE-BR-000090: Verify business rule: Material consumption and output create inventory movements.
- RULE-BR-000091: Verify business rule: Produced quantity, scrap, rework, and yield reconcile.
- RULE-BR-000092: Verify business rule: Quality holds prevent unauthorized use or shipment.
- RULE-BR-000093: Verify business rule: Capacity scheduling respects calendar, efficiency, and committed load.
- RULE-BR-000094: Verify business rule: Closed production orders are corrected through controlled adjustments.
- RULE-BR-000095: Verify business rule: Actual cost reconciles material, labor, overhead, scrap, and variance.
- RULE-BR-000096: Verify business rule: AI schedules and forecasts require human approval before release.
- WF-WF-000087: Verify happy, alternative, failure, and recovery paths for Release production order
- WF-WF-000088: Verify happy, alternative, failure, and recovery paths for Plan material
- WF-WF-000089: Verify happy, alternative, failure, and recovery paths for Schedule operation
- WF-WF-000090: Verify happy, alternative, failure, and recovery paths for Issue material
- WF-WF-000091: Verify happy, alternative, failure, and recovery paths for Record production
- WF-WF-000092: Verify happy, alternative, failure, and recovery paths for Inspect quality
- WF-WF-000093: Verify happy, alternative, failure, and recovery paths for Handle nonconformance
- WF-WF-000094: Verify happy, alternative, failure, and recovery paths for Close and cost order
- API-API-000089: Verify request, response, authorization, idempotency, pagination, validation, and errors for Manufacturing Bills of materials API
- API-API-000090: Verify request, response, authorization, idempotency, pagination, validation, and errors for Manufacturing Routings and work centers API
- API-API-000091: Verify request, response, authorization, idempotency, pagination, validation, and errors for Manufacturing Production orders API
- API-API-000092: Verify request, response, authorization, idempotency, pagination, validation, and errors for Manufacturing Material requirements API
- API-API-000093: Verify request, response, authorization, idempotency, pagination, validation, and errors for Manufacturing Scheduling and capacity API
- API-API-000094: Verify request, response, authorization, idempotency, pagination, validation, and errors for Manufacturing Issue/consume/produce API
- API-API-000095: Verify request, response, authorization, idempotency, pagination, validation, and errors for Manufacturing Quality control API
- API-API-000096: Verify request, response, authorization, idempotency, pagination, validation, and errors for Manufacturing Yield, scrap, downtime, and cost API
- EVT-EVT-000077: Verify production, schema compatibility, ordering, duplication, retry, and idempotent consumption for ProductionOrderReleased
- EVT-EVT-000078: Verify production, schema compatibility, ordering, duplication, retry, and idempotent consumption for MaterialIssued
- EVT-EVT-000079: Verify production, schema compatibility, ordering, duplication, retry, and idempotent consumption for OperationCompleted
- EVT-EVT-000080: Verify production, schema compatibility, ordering, duplication, retry, and idempotent consumption for ProductionReceived
- EVT-EVT-000081: Verify production, schema compatibility, ordering, duplication, retry, and idempotent consumption for QualityHoldPlaced
- EVT-EVT-000082: Verify production, schema compatibility, ordering, duplication, retry, and idempotent consumption for NonconformanceOpened
- EVT-EVT-000083: Verify production, schema compatibility, ordering, duplication, retry, and idempotent consumption for ProductionOrderClosed
- EVT-EVT-000084: Verify production, schema compatibility, ordering, duplication, retry, and idempotent consumption for CapacityRiskDetected
- PERM-PERM-000177: Verify allow, deny, tenant isolation, escalation prevention, and audit evidence for Read Bills of materials
- PERM-PERM-000178: Verify allow, deny, tenant isolation, escalation prevention, and audit evidence for Manage Bills of materials
- PERM-PERM-000179: Verify allow, deny, tenant isolation, escalation prevention, and audit evidence for Read Routings and work centers
- PERM-PERM-000180: Verify allow, deny, tenant isolation, escalation prevention, and audit evidence for Manage Routings and work centers
- PERM-PERM-000181: Verify allow, deny, tenant isolation, escalation prevention, and audit evidence for Read Production orders
- PERM-PERM-000182: Verify allow, deny, tenant isolation, escalation prevention, and audit evidence for Manage Production orders
- PERM-PERM-000183: Verify allow, deny, tenant isolation, escalation prevention, and audit evidence for Read Material requirements
- PERM-PERM-000184: Verify allow, deny, tenant isolation, escalation prevention, and audit evidence for Manage Material requirements
- PERM-PERM-000185: Verify allow, deny, tenant isolation, escalation prevention, and audit evidence for Read Scheduling and capacity
- PERM-PERM-000186: Verify allow, deny, tenant isolation, escalation prevention, and audit evidence for Manage Scheduling and capacity
- PERM-PERM-000187: Verify allow, deny, tenant isolation, escalation prevention, and audit evidence for Read Issue/consume/produce
- PERM-PERM-000188: Verify allow, deny, tenant isolation, escalation prevention, and audit evidence for Manage Issue/consume/produce
- PERM-PERM-000189: Verify allow, deny, tenant isolation, escalation prevention, and audit evidence for Read Quality control
- PERM-PERM-000190: Verify allow, deny, tenant isolation, escalation prevention, and audit evidence for Manage Quality control
- PERM-PERM-000191: Verify allow, deny, tenant isolation, escalation prevention, and audit evidence for Read Yield, scrap, downtime, and cost
- PERM-PERM-000192: Verify allow, deny, tenant isolation, escalation prevention, and audit evidence for Manage Yield, scrap, downtime, and cost
- SCR-SCR-000100: Verify responsive, keyboard, screen-reader, loading, empty, error, stale, and permission states for Manufacturing Decision Dashboard
- SCR-SCR-000101: Verify responsive, keyboard, screen-reader, loading, empty, error, stale, and permission states for Bills of materials Workspace
- SCR-SCR-000102: Verify responsive, keyboard, screen-reader, loading, empty, error, stale, and permission states for Routings and work centers Workspace
- SCR-SCR-000103: Verify responsive, keyboard, screen-reader, loading, empty, error, stale, and permission states for Production orders Workspace
- SCR-SCR-000104: Verify responsive, keyboard, screen-reader, loading, empty, error, stale, and permission states for Material requirements Workspace
- SCR-SCR-000105: Verify responsive, keyboard, screen-reader, loading, empty, error, stale, and permission states for Scheduling and capacity Workspace
- SCR-SCR-000106: Verify responsive, keyboard, screen-reader, loading, empty, error, stale, and permission states for Issue/consume/produce Workspace
- SCR-SCR-000107: Verify responsive, keyboard, screen-reader, loading, empty, error, stale, and permission states for Quality control Workspace
- SCR-SCR-000108: Verify responsive, keyboard, screen-reader, loading, empty, error, stale, and permission states for Yield, scrap, downtime, and cost Workspace
