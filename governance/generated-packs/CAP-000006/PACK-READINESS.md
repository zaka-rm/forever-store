# Draft Pack Set — CAP-000006 Inventory Core Capability

**Authority:** DRAFT_NOT_AUTHORIZED  
**Promotion gate:** BLOCKED_SOURCE_INCOMPLETE  
**Source fingerprint:** `f27c224fda8c13340a2b49ab5ca2d5b91a18bd6c623c0feabb40298352f1c560`  
**Traceability:** 55%  
**Blockers:** 46

## Blockers

- MET-000035: metric formula is not approved
- MET-000036: metric formula is not approved
- MET-000037: metric formula is not approved
- MET-000038: metric formula is not approved
- MET-000039: metric formula is not approved
- MET-000040: metric formula is not approved
- MET-000041: metric formula is not approved
- MET-000042: metric formula is not approved
- PROMPT-000020: prompt template and evaluation are not approved
- PROMPT-000021: prompt template and evaluation are not approved
- PROMPT-000022: prompt template and evaluation are not approved
- PROMPT-000023: prompt template and evaluation are not approved
- PROMPT-000024: prompt template and evaluation are not approved
- WF-000039: ordered workflow steps are not approved
- WF-000040: ordered workflow steps are not approved
- WF-000041: ordered workflow steps are not approved
- WF-000042: ordered workflow steps are not approved
- WF-000043: ordered workflow steps are not approved
- WF-000044: ordered workflow steps are not approved
- WF-000045: ordered workflow steps are not approved
- WF-000046: ordered workflow steps are not approved
- UF-000046: UI transitions and recovery states are not approved
- UF-000047: UI transitions and recovery states are not approved
- UF-000048: UI transitions and recovery states are not approved
- UF-000049: UI transitions and recovery states are not approved
- UF-000050: UI transitions and recovery states are not approved
- UF-000051: UI transitions and recovery states are not approved
- UF-000052: UI transitions and recovery states are not approved
- UF-000053: UI transitions and recovery states are not approved
- UF-000054: UI transitions and recovery states are not approved
- EVT-000034: event domain payload is not approved
- EVT-000035: event domain payload is not approved
- EVT-000036: event domain payload is not approved
- EVT-000037: event domain payload is not approved
- EVT-000038: event domain payload is not approved
- EVT-000039: event domain payload is not approved
- EVT-000040: event domain payload is not approved
- EVT-000041: event domain payload is not approved
- API-000041: API request and response schema is not approved
- API-000042: API request and response schema is not approved
- API-000043: API request and response schema is not approved
- API-000044: API request and response schema is not approved
- API-000045: API request and response schema is not approved
- API-000046: API request and response schema is not approved
- API-000047: API request and response schema is not approved
- API-000048: API request and response schema is not approved

## Build scope

- FEAT-000041 — Product and SKU catalog
- FEAT-000042 — Warehouse and location model
- FEAT-000043 — Stock ledger and availability
- FEAT-000044 — Reservations and allocations
- FEAT-000045 — Purchase orders and receipts
- FEAT-000046 — Transfers and adjustments
- FEAT-000047 — Lot/serial/batch traceability
- FEAT-000048 — Reorder and demand planning

## QA scenarios

- RULE-BR-000041: Verify business rule: Available quantity equals on-hand minus valid reservations and control holds.
- RULE-BR-000042: Verify business rule: Every quantity change creates an immutable stock movement.
- RULE-BR-000043: Verify business rule: Completed movements are reversed, not edited.
- RULE-BR-000044: Verify business rule: Negative stock is prohibited unless workspace policy explicitly permits it.
- RULE-BR-000045: Verify business rule: Transfers require balanced source and destination movements.
- RULE-BR-000046: Verify business rule: Receipt quantity beyond tolerance requires approval.
- RULE-BR-000047: Verify business rule: Lot/serial-controlled products require identifiers at configured transitions.
- RULE-BR-000048: Verify business rule: Reorder recommendations disclose forecast, lead time, safety stock, constraints, and confidence.
- WF-WF-000039: Verify happy, alternative, failure, and recovery paths for Create product
- WF-WF-000040: Verify happy, alternative, failure, and recovery paths for Receive stock
- WF-WF-000041: Verify happy, alternative, failure, and recovery paths for Reserve and release
- WF-WF-000042: Verify happy, alternative, failure, and recovery paths for Transfer stock
- WF-WF-000043: Verify happy, alternative, failure, and recovery paths for Adjust with reason
- WF-WF-000044: Verify happy, alternative, failure, and recovery paths for Cycle count
- WF-WF-000045: Verify happy, alternative, failure, and recovery paths for Purchase and receive
- WF-WF-000046: Verify happy, alternative, failure, and recovery paths for Reorder decision
- API-API-000041: Verify request, response, authorization, idempotency, pagination, validation, and errors for Inventory Product and SKU catalog API
- API-API-000042: Verify request, response, authorization, idempotency, pagination, validation, and errors for Inventory Warehouse and location model API
- API-API-000043: Verify request, response, authorization, idempotency, pagination, validation, and errors for Inventory Stock ledger and availability API
- API-API-000044: Verify request, response, authorization, idempotency, pagination, validation, and errors for Inventory Reservations and allocations API
- API-API-000045: Verify request, response, authorization, idempotency, pagination, validation, and errors for Inventory Purchase orders and receipts API
- API-API-000046: Verify request, response, authorization, idempotency, pagination, validation, and errors for Inventory Transfers and adjustments API
- API-API-000047: Verify request, response, authorization, idempotency, pagination, validation, and errors for Inventory Lot/serial/batch traceability API
- API-API-000048: Verify request, response, authorization, idempotency, pagination, validation, and errors for Inventory Reorder and demand planning API
- EVT-EVT-000034: Verify production, schema compatibility, ordering, duplication, retry, and idempotent consumption for ProductCreated
- EVT-EVT-000035: Verify production, schema compatibility, ordering, duplication, retry, and idempotent consumption for StockLevelChanged
- EVT-EVT-000036: Verify production, schema compatibility, ordering, duplication, retry, and idempotent consumption for StockReserved
- EVT-EVT-000037: Verify production, schema compatibility, ordering, duplication, retry, and idempotent consumption for StockReceived
- EVT-EVT-000038: Verify production, schema compatibility, ordering, duplication, retry, and idempotent consumption for StockTransferred
- EVT-EVT-000039: Verify production, schema compatibility, ordering, duplication, retry, and idempotent consumption for InventoryAdjusted
- EVT-EVT-000040: Verify production, schema compatibility, ordering, duplication, retry, and idempotent consumption for CountVarianceDetected
- EVT-EVT-000041: Verify production, schema compatibility, ordering, duplication, retry, and idempotent consumption for ReorderRecommended
- PERM-PERM-000081: Verify allow, deny, tenant isolation, escalation prevention, and audit evidence for Read Product and SKU catalog
- PERM-PERM-000082: Verify allow, deny, tenant isolation, escalation prevention, and audit evidence for Manage Product and SKU catalog
- PERM-PERM-000083: Verify allow, deny, tenant isolation, escalation prevention, and audit evidence for Read Warehouse and location model
- PERM-PERM-000084: Verify allow, deny, tenant isolation, escalation prevention, and audit evidence for Manage Warehouse and location model
- PERM-PERM-000085: Verify allow, deny, tenant isolation, escalation prevention, and audit evidence for Read Stock ledger and availability
- PERM-PERM-000086: Verify allow, deny, tenant isolation, escalation prevention, and audit evidence for Manage Stock ledger and availability
- PERM-PERM-000087: Verify allow, deny, tenant isolation, escalation prevention, and audit evidence for Read Reservations and allocations
- PERM-PERM-000088: Verify allow, deny, tenant isolation, escalation prevention, and audit evidence for Manage Reservations and allocations
- PERM-PERM-000089: Verify allow, deny, tenant isolation, escalation prevention, and audit evidence for Read Purchase orders and receipts
- PERM-PERM-000090: Verify allow, deny, tenant isolation, escalation prevention, and audit evidence for Manage Purchase orders and receipts
- PERM-PERM-000091: Verify allow, deny, tenant isolation, escalation prevention, and audit evidence for Read Transfers and adjustments
- PERM-PERM-000092: Verify allow, deny, tenant isolation, escalation prevention, and audit evidence for Manage Transfers and adjustments
- PERM-PERM-000093: Verify allow, deny, tenant isolation, escalation prevention, and audit evidence for Read Lot/serial/batch traceability
- PERM-PERM-000094: Verify allow, deny, tenant isolation, escalation prevention, and audit evidence for Manage Lot/serial/batch traceability
- PERM-PERM-000095: Verify allow, deny, tenant isolation, escalation prevention, and audit evidence for Read Reorder and demand planning
- PERM-PERM-000096: Verify allow, deny, tenant isolation, escalation prevention, and audit evidence for Manage Reorder and demand planning
- SCR-SCR-000046: Verify responsive, keyboard, screen-reader, loading, empty, error, stale, and permission states for Inventory Decision Dashboard
- SCR-SCR-000047: Verify responsive, keyboard, screen-reader, loading, empty, error, stale, and permission states for Product and SKU catalog Workspace
- SCR-SCR-000048: Verify responsive, keyboard, screen-reader, loading, empty, error, stale, and permission states for Warehouse and location model Workspace
- SCR-SCR-000049: Verify responsive, keyboard, screen-reader, loading, empty, error, stale, and permission states for Stock ledger and availability Workspace
- SCR-SCR-000050: Verify responsive, keyboard, screen-reader, loading, empty, error, stale, and permission states for Reservations and allocations Workspace
- SCR-SCR-000051: Verify responsive, keyboard, screen-reader, loading, empty, error, stale, and permission states for Purchase orders and receipts Workspace
- SCR-SCR-000052: Verify responsive, keyboard, screen-reader, loading, empty, error, stale, and permission states for Transfers and adjustments Workspace
- SCR-SCR-000053: Verify responsive, keyboard, screen-reader, loading, empty, error, stale, and permission states for Lot/serial/batch traceability Workspace
- SCR-SCR-000054: Verify responsive, keyboard, screen-reader, loading, empty, error, stale, and permission states for Reorder and demand planning Workspace
