# ZYVORA ARCHITECTURE LIBRARY

# ZPL-030 — THE IMPLEMENTATION CONSTITUTION

*The Rules Every Engineer, Designer, AI Agent, and Product Manager Must Follow*

---

```
 ═══════════════════════════════════════════════════════════════
                                                                
                          Z Y V O R A                           
                                                                
              ZPL-030 — IMPLEMENTATION CONSTITUTION             
                                                                
        Read before writing the first line of code.             
     The highest-priority instruction for every AI coding       
            agent and every human Contributor.                  
                                                                
              Architecture Office · Version 1.0                 
                                                                
 ═══════════════════════════════════════════════════════════════
```

## Document Information

| Field | Value |
|---|---|
| Document ID | ZPL-030 |
| Title | Implementation Constitution |
| Status | Issued — Version 1.0 (Founder ratification pending) |
| Authority | Binds all implementation work; subordinate only to CODEX 00 (Article II) |
| Inherits | CODEX 00 v2.1, CODEX 10 v1.1, ZPL-020 (Master Roadmap), all ratified ADRs |
| Audience | Every Contributor: engineers, designers, architects, AI coding agents, writers, testers, automation systems |
| Review Cycle | Annual, or upon amendment of CODEX 00 or ZPL-020 |

## Purpose

The objective is not simply to build software. The objective is to **faithfully transform the ZYVORA Architecture Library into a production-quality Decision Operating System.** Every implementation decision must preserve the philosophy defined in the Codices. This document converts that obligation into fifteen binding articles, enforceable at the pull request.

---

## Article 1 — The Architecture Library Is the Single Source of Truth

The Architecture Library is the constitutional foundation of the platform. No implementation may contradict a Codex, a Standard (ZS), a Playbook (ZP), a PRD, a Technical Specification (TS), a Software Blueprint (SB), or a ratified ADR.

**If a conflict exists, implementation stops** until the documentation is updated through the amendment process (CODEX 00, Article III) or a new ADR is approved. **Never invent architecture during implementation.** *(This is One Source of Truth — Law VII, ADR-0003 — applied to the codebase itself.)*

## Article 2 — The Order of Development Is Fixed

```
   Founder Vision
        ↓
   Architecture Library (Codices)
        ↓
   Standards (ZS)
        ↓
   Playbooks (ZP)
        ↓
   PRD
        ↓
   Technical Specification (TS)
        ↓
   Software Blueprint (SB)
        ↓
   Database Design
        ↓
   API Contracts
        ↓
   Backend
        ↓
   Frontend
        ↓
   AI Integration
        ↓
   Testing
        ↓
   Security Review
        ↓
   Deployment
        ↓
   Production
```

No stage may be skipped. *(This is the ZPL-020 Software Build Route, steps 1–10, made mandatory per change.)*

## Article 3 — Never Build Without Understanding

Before implementing any feature, the Contributor must have read: the relevant Codices, the applicable Standards, the associated Playbooks, the PRD, the Technical Specification, the Software Blueprint, and the governing ADRs. Only then does implementation begin. *(G.3, the Contributor Agreement: "read this Codex before building.")*

## Article 4 — Every Feature Must Answer Five Questions

Before any work begins, every Contributor must be able to answer:

1. What business problem does this solve?
2. Which **Builder decision** does it improve? *(Law IV; Gate 2)*
3. Which Codex defines this capability?
4. Which PRD authorizes it?
5. How will success be measured? *(In decisions, not engagement — ADR-1003)*

If any answer is missing, implementation pauses. *(These five questions are the implementation-time form of the Capability Proposal Template, CODEX 10 Appendix G.)*

## Article 5 — No Unapproved Features

No engineer or AI may add extra buttons, additional workflows, hidden settings, database tables, APIs, automations, dashboards, AI behaviors, integrations, or business rules unless explicitly defined in the documentation or approved through a new ADR.

**Creativity is welcome during design — not during implementation.** *(Identity as a filter, CODEX 10 §2.3: "we could" is never evidence for "we should.")*

## Article 6 — Traceability Is Mandatory

Every implemented capability must be traceable through the full chain, using the official ZPL-020 identifiers. Example, for a Finance capability:

```
   CODEX 50 — Finance            (philosophy & domain model)
        ↓
   ZS-010 / ZS-030…              (governing Standards)
        ↓
   PRD-050 — Finance             (authorized outcomes & scope)
        ↓
   TS-DOMAIN / TS-DATA / TS-API… (exact contracts & behavior)
        ↓
   SB-BACKEND / SB-DATABASE /    (sequenced build package)
   SB-FRONTEND / SB-AI…
        ↓
   Database → API → Backend → Frontend → Tests
        ↓
   Release
```

Every line of code ultimately traces back to an approved architectural decision. *(ZPL-020 Mandatory Traceability Matrix; recorded per artifact in LIBRARY-INDEX.md.)*

## Article 7 — Build by Vertical Slices

Do not build all databases first. Do not build all APIs first. Do not build all UI first. Complete one capability at a time:

**Business rules → Database → Backend → API → Frontend → AI → Testing → Documentation.**

Each slice must be usable before moving to the next. *(ZPL-020 Build Route step 9; loop closure is part of the slice — ADR-1002.)*

## Article 8 — AI Is an Assistant, Not the Architect

AI **may**: generate code, propose designs, optimize algorithms, draft tests, explain trade-offs.

AI **may not**: redefine architecture, invent business logic, change terminology, modify philosophy, or alter workflows without approval.

**Architecture belongs to the Codices.** *(Law XII applied internally: the same rule that governs the Decision Engine's relationship to the Builder governs every AI agent's relationship to the library. An AI agent that discovers a genuine conflict or gap must stop and surface it — Article 1 — never silently resolve it.)*

## Article 9 — Every Pull Request Must Pass Seven Reviews

Every contribution is reviewed for:

1. Architectural compliance
2. Product compliance
3. UX compliance
4. Security
5. Performance
6. Test coverage
7. Documentation updates

No exception. *(The reviewer's instruments: CODEX 00 Appendix VIII — Constitutional Compliance Checklist — and CODEX 10 Appendix H — Product Review Checklist.)*

## Article 10 — Documentation Evolves With the Software

Every implementation change updates, where affected: ADRs, Standards, Playbooks, PRDs, Technical Specifications, and Software Blueprints. **Code and documentation must never diverge.** *(F.5: documentation rots like code, so it is maintained like code; ZPL-020 Build Route step 12.)*

## Article 11 — Simplicity Wins

When multiple implementations are possible, choose the one that is easier to understand, easier to maintain, easier to test, easier to explain, and aligned with the philosophy of reducing cognitive load. *(Law V; F.1 "boring by default"; F.10 — the newcomer ships safely in week one.)*

## Article 12 — Builder Experience Comes First

Every implementation decision must improve at least one of: clarity, confidence, speed, trust, understanding, decision quality. If it does not improve the Builder's experience, reconsider it. *(Laws I, III, IV; the North Star, CODEX 00 A.4.)*

## Article 13 — Quality Gates

No feature is complete until it passes: Product Review, UX Review, Engineering Review, Security Review, AI Review (if applicable), Performance Review, Documentation Review, and Founder Approval for major capabilities. *(ZPL-020 Build Route step 10; CODEX 39 will bind these to the master test strategy.)*

## Article 14 — The Definition of Done

A feature is complete only when:

- [ ] The philosophy is respected (Appendix VIII checklist passes).
- [ ] Business rules are implemented.
- [ ] Database schema is finalized.
- [ ] APIs are documented.
- [ ] UI is production-ready.
- [ ] AI behavior is validated *(explainability by construction — F.8)*.
- [ ] Automated tests pass.
- [ ] The feedback loop into Business Memory is wired *(ADR-1002)*.
- [ ] Documentation is updated.
- [ ] ADRs are current.
- [ ] Monitoring is configured.
- [ ] Security review is complete.

Only then is the feature finished.

## Article 15 — Long-Term Thinking

Every Contributor must assume their work will still be maintained ten years from now. Optimize for readability, maintainability, consistency, scalability, traceability, and trust. **Do not optimize for speed at the expense of quality.** *(Law XI; Gate 5 — the Decade Gate.)*

---

## Final Directive

You are not merely writing code. You are implementing the philosophy of ZYVORA.

Every commit, every interface, every API, every database table, every AI model, and every user interaction must be a faithful implementation of the Architecture Library.

**If the software and the Codices ever disagree, the Codices take precedence** until an official architectural decision updates them.

Build with discipline. Build with clarity. Build for the next decade.

---

## Editorial Notes (v1.0)

- The draft's traceability example used identifiers (`ZS-013`, `PRD-FIN-004`, `TS-FIN-004`, `SB-FIN-004`) that do not exist in the ZPL-020 naming scheme; Article 6 now uses the official identifiers (CODEX 50, ZS-010, PRD-050, TS-*, SB-*). If a per-Domain suffix scheme for TS/SB documents is preferred (e.g., `TS-API-050`), it should be ratified in CODEX 04 — Documentation Standards.
- Article 14 gained one item beyond the draft — the Business Memory feedback loop — required by ADR-1002 (loop closure is part of definition-of-done); omitting it would have put this document in conflict with a ratified ADR, violating its own Article 1.
- Terminology normalized per ADR-1001: *Builder* = entrepreneur, *Contributor* = constructor.

## Revision History

| Version | Date | Author | Change |
|---|---|---|---|
| 1.0 | 2026-07-10 | Architecture Office | First issued edition, from Founder directive; identifiers normalized to ZPL-020; Definition of Done reconciled with ADR-1002 |
