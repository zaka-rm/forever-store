# Draft Pack Set — CAP-000011 Human Resources Core Capability

**Authority:** DRAFT_NOT_AUTHORIZED  
**Promotion gate:** BLOCKED_SOURCE_INCOMPLETE  
**Source fingerprint:** `fdcbccb95edeec10cd54174be1aea3b43aebc674f97ad86b3aed13889db32eca`  
**Traceability:** 55%  
**Blockers:** 45

## Blockers

- MET-000071: metric formula is not approved
- MET-000072: metric formula is not approved
- MET-000073: metric formula is not approved
- MET-000074: metric formula is not approved
- MET-000075: metric formula is not approved
- MET-000076: metric formula is not approved
- MET-000077: metric formula is not approved
- MET-000078: metric formula is not approved
- PROMPT-000045: prompt template and evaluation are not approved
- PROMPT-000046: prompt template and evaluation are not approved
- PROMPT-000047: prompt template and evaluation are not approved
- PROMPT-000048: prompt template and evaluation are not approved
- PROMPT-000049: prompt template and evaluation are not approved
- WF-000079: ordered workflow steps are not approved
- WF-000080: ordered workflow steps are not approved
- WF-000081: ordered workflow steps are not approved
- WF-000082: ordered workflow steps are not approved
- WF-000083: ordered workflow steps are not approved
- WF-000084: ordered workflow steps are not approved
- WF-000085: ordered workflow steps are not approved
- WF-000086: ordered workflow steps are not approved
- UF-000091: UI transitions and recovery states are not approved
- UF-000092: UI transitions and recovery states are not approved
- UF-000093: UI transitions and recovery states are not approved
- UF-000094: UI transitions and recovery states are not approved
- UF-000095: UI transitions and recovery states are not approved
- UF-000096: UI transitions and recovery states are not approved
- UF-000097: UI transitions and recovery states are not approved
- UF-000098: UI transitions and recovery states are not approved
- UF-000099: UI transitions and recovery states are not approved
- EVT-000070: event domain payload is not approved
- EVT-000071: event domain payload is not approved
- EVT-000072: event domain payload is not approved
- EVT-000073: event domain payload is not approved
- EVT-000074: event domain payload is not approved
- EVT-000075: event domain payload is not approved
- EVT-000076: event domain payload is not approved
- API-000081: API request and response schema is not approved
- API-000082: API request and response schema is not approved
- API-000083: API request and response schema is not approved
- API-000084: API request and response schema is not approved
- API-000085: API request and response schema is not approved
- API-000086: API request and response schema is not approved
- API-000087: API request and response schema is not approved
- API-000088: API request and response schema is not approved

## Build scope

- FEAT-000081 — Employee records
- FEAT-000082 — Organization and positions
- FEAT-000083 — Recruitment
- FEAT-000084 — Onboarding/offboarding
- FEAT-000085 — Leave and attendance
- FEAT-000086 — Performance and goals
- FEAT-000087 — Compensation records
- FEAT-000088 — Workforce planning and compliance

## QA scenarios

- RULE-BR-000081: Verify business rule: HR sensitive fields use explicit field-level permissions.
- RULE-BR-000082: Verify business rule: Employment and compensation changes require effective dates and approval.
- RULE-BR-000083: Verify business rule: Leave balances cannot become negative unless policy permits.
- RULE-BR-000084: Verify business rule: Offboarding triggers access revocation and asset/document tasks.
- RULE-BR-000085: Verify business rule: Performance records retain author, period, acknowledgements, and versions.
- RULE-BR-000086: Verify business rule: Attendance corrections require reason and audit.
- RULE-BR-000087: Verify business rule: Payroll-impacting outputs reconcile to approved employment terms.
- RULE-BR-000088: Verify business rule: AI employment recommendations require human review and bias evaluation.
- WF-WF-000079: Verify happy, alternative, failure, and recovery paths for Recruit and hire
- WF-WF-000080: Verify happy, alternative, failure, and recovery paths for Onboard employee
- WF-WF-000081: Verify happy, alternative, failure, and recovery paths for Request and approve leave
- WF-WF-000082: Verify happy, alternative, failure, and recovery paths for Record attendance exception
- WF-WF-000083: Verify happy, alternative, failure, and recovery paths for Set and review goals
- WF-WF-000084: Verify happy, alternative, failure, and recovery paths for Change position/compensation
- WF-WF-000085: Verify happy, alternative, failure, and recovery paths for Offboard and revoke access
- WF-WF-000086: Verify happy, alternative, failure, and recovery paths for Plan capacity
- API-API-000081: Verify request, response, authorization, idempotency, pagination, validation, and errors for Human Resources Employee records API
- API-API-000082: Verify request, response, authorization, idempotency, pagination, validation, and errors for Human Resources Organization and positions API
- API-API-000083: Verify request, response, authorization, idempotency, pagination, validation, and errors for Human Resources Recruitment API
- API-API-000084: Verify request, response, authorization, idempotency, pagination, validation, and errors for Human Resources Onboarding/offboarding API
- API-API-000085: Verify request, response, authorization, idempotency, pagination, validation, and errors for Human Resources Leave and attendance API
- API-API-000086: Verify request, response, authorization, idempotency, pagination, validation, and errors for Human Resources Performance and goals API
- API-API-000087: Verify request, response, authorization, idempotency, pagination, validation, and errors for Human Resources Compensation records API
- API-API-000088: Verify request, response, authorization, idempotency, pagination, validation, and errors for Human Resources Workforce planning and compliance API
- EVT-EVT-000070: Verify production, schema compatibility, ordering, duplication, retry, and idempotent consumption for CandidateHired
- EVT-EVT-000071: Verify production, schema compatibility, ordering, duplication, retry, and idempotent consumption for EmployeeOnboarded
- EVT-EVT-000072: Verify production, schema compatibility, ordering, duplication, retry, and idempotent consumption for EmployeeChanged
- EVT-EVT-000073: Verify production, schema compatibility, ordering, duplication, retry, and idempotent consumption for LeaveApproved
- EVT-EVT-000074: Verify production, schema compatibility, ordering, duplication, retry, and idempotent consumption for PerformanceReviewCompleted
- EVT-EVT-000075: Verify production, schema compatibility, ordering, duplication, retry, and idempotent consumption for CompensationApproved
- EVT-EVT-000076: Verify production, schema compatibility, ordering, duplication, retry, and idempotent consumption for EmployeeOffboarded
- PERM-PERM-000161: Verify allow, deny, tenant isolation, escalation prevention, and audit evidence for Read Employee records
- PERM-PERM-000162: Verify allow, deny, tenant isolation, escalation prevention, and audit evidence for Manage Employee records
- PERM-PERM-000163: Verify allow, deny, tenant isolation, escalation prevention, and audit evidence for Read Organization and positions
- PERM-PERM-000164: Verify allow, deny, tenant isolation, escalation prevention, and audit evidence for Manage Organization and positions
- PERM-PERM-000165: Verify allow, deny, tenant isolation, escalation prevention, and audit evidence for Read Recruitment
- PERM-PERM-000166: Verify allow, deny, tenant isolation, escalation prevention, and audit evidence for Manage Recruitment
- PERM-PERM-000167: Verify allow, deny, tenant isolation, escalation prevention, and audit evidence for Read Onboarding/offboarding
- PERM-PERM-000168: Verify allow, deny, tenant isolation, escalation prevention, and audit evidence for Manage Onboarding/offboarding
- PERM-PERM-000169: Verify allow, deny, tenant isolation, escalation prevention, and audit evidence for Read Leave and attendance
- PERM-PERM-000170: Verify allow, deny, tenant isolation, escalation prevention, and audit evidence for Manage Leave and attendance
- PERM-PERM-000171: Verify allow, deny, tenant isolation, escalation prevention, and audit evidence for Read Performance and goals
- PERM-PERM-000172: Verify allow, deny, tenant isolation, escalation prevention, and audit evidence for Manage Performance and goals
- PERM-PERM-000173: Verify allow, deny, tenant isolation, escalation prevention, and audit evidence for Read Compensation records
- PERM-PERM-000174: Verify allow, deny, tenant isolation, escalation prevention, and audit evidence for Manage Compensation records
- PERM-PERM-000175: Verify allow, deny, tenant isolation, escalation prevention, and audit evidence for Read Workforce planning and compliance
- PERM-PERM-000176: Verify allow, deny, tenant isolation, escalation prevention, and audit evidence for Manage Workforce planning and compliance
- SCR-SCR-000091: Verify responsive, keyboard, screen-reader, loading, empty, error, stale, and permission states for Human Resources Decision Dashboard
- SCR-SCR-000092: Verify responsive, keyboard, screen-reader, loading, empty, error, stale, and permission states for Employee records Workspace
- SCR-SCR-000093: Verify responsive, keyboard, screen-reader, loading, empty, error, stale, and permission states for Organization and positions Workspace
- SCR-SCR-000094: Verify responsive, keyboard, screen-reader, loading, empty, error, stale, and permission states for Recruitment Workspace
- SCR-SCR-000095: Verify responsive, keyboard, screen-reader, loading, empty, error, stale, and permission states for Onboarding/offboarding Workspace
- SCR-SCR-000096: Verify responsive, keyboard, screen-reader, loading, empty, error, stale, and permission states for Leave and attendance Workspace
- SCR-SCR-000097: Verify responsive, keyboard, screen-reader, loading, empty, error, stale, and permission states for Performance and goals Workspace
- SCR-SCR-000098: Verify responsive, keyboard, screen-reader, loading, empty, error, stale, and permission states for Compensation records Workspace
- SCR-SCR-000099: Verify responsive, keyboard, screen-reader, loading, empty, error, stale, and permission states for Workforce planning and compliance Workspace
