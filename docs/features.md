# Feature Inventory

**Project:** Survey and Feedback System (Theme 10)
**Linked documents:** `docs/srs.md` (requirements), `docs/traceability.md` (verification matrix)
**Document version:** 0.2 (draft, revised 2026-11-11: CP-02, CP-03) | **Team:** Jinjuta Nunnarumit (67070505210) / Thitigant Surayotin (67070505214)

Features keep stable IDs (F-xx). A feature marked **[Responsibility]** is a cross-cutting system responsibility rather than a single user-facing screen. Status values: Planned, In progress, Implemented, Verified. At this baseline, every feature is **Planned**.

---

## 1. Sprint 1: Small deployable product (Deliverable 1)

| ID | Feature | Short description | Requirements | Depends on | Status |
|---|---|---|---|---|---|
| F-01 | Authentication and session | Login with seeded accounts, logout, current-user identity, password hashing, token/session expiry | FR-01, FR-02, FR-03, NFR-03, NFR-04 | none | Planned |
| F-02 | Role and ownership authorization **[Responsibility]** | Backend enforcement of role permissions and record ownership on every protected endpoint (matrix in System SDS) | BR-06, BR-08, NFR-01, NFR-02 | F-01 | Planned |
| F-03 | Create draft survey | Owner creates a Draft identified survey with title, description and ordered questions (single choice, rating 1 to 5, short text; required/optional); enforces definition limits: title 1 to 150 characters, at most 30 questions, 2 to 10 distinct options (CP-03) | FR-04, FR-05 | F-01, F-02 | Planned |
| F-04 | Publish survey | Owner publishes a valid Draft; checks BR-03; Draft to Published transition only | FR-07, BR-03, BR-04 (publish transition) | F-03 | Planned |
| F-05 | Browse and open published surveys | Respondent lists Published surveys and opens one to see questions; Draft and Closed surveys are not answerable | FR-09 | F-01, F-02, F-04 | Planned |
| F-06 | Submit response | Respondent submits validated answers in one transaction; rejects duplicate, non-Published survey and invalid answers; response linked to respondent (identified mode). Survey Owners cannot call this endpoint (403, enforced by F-02; BR-09 withdrawn by CP-02) | FR-10, BR-01, BR-02, BR-07, BR-10 (identified), NFR-05 | F-05 | Planned |
| F-07 | Confirmation and own-response retrieval | Respondent sees confirmation after submit and can retrieve only their own submitted answers | FR-11, BR-08 | F-06 | Planned |
| F-08 | Aggregate summary | Owner views total responses, choice counts/percentages, rating count/average/distribution, text answers for own survey | FR-12, BR-14, BR-06 | F-06 | Planned |
| F-09 | Persistence, seed data and setup **[Responsibility]** | Relational schema and migrations, reproducible synthetic seed data, documented local setup, env-var configuration without secrets, data survives restart | NFR-06, NFR-09, NFR-10 | none | Planned |
| F-10 | Basic validation and error handling **[Responsibility]** | Structured API errors without stack traces or private data; UI shows validation, empty and error states | FR-21 (basic) | F-01 | Planned |
| F-12 | Close survey | Owner manually closes a Published survey; Closed is terminal; later submissions rejected | FR-08, BR-04 (close transition), BR-02 | F-04 | Planned (moved from Sprint 2 by CP-01) |

**Sprint 1 scope statement.** Sprint 1 delivers the vertical slice: an Owner logs in, creates and publishes an identified survey; an eligible Respondent logs in, submits a validated response and sees confirmation; the Owner views the aggregate summary; duplicate submissions and submissions to non-Published surveys are rejected; cross-user and cross-role access is rejected. The Owner can also close a Published survey (F-12, moved into Sprint 1 by change CP-01 in `docs/traceability.md`), after which responses are rejected.

---

## 2. Sprint 2: Core expansion (Deliverable 2)

| ID | Feature | Short description | Requirements | Depends on | Status |
|---|---|---|---|---|---|
| F-11 | Edit draft survey | Owner edits survey details, edits/deletes questions while Draft; published surveys become immutable | FR-06, BR-05 | F-03, F-04 | Planned |
| F-13 | Eligibility allowlist | Owner restricts a survey to specific Respondent accounts; ineligible users cannot see or answer it | FR-14, BR-13 | F-04, F-05 | Planned |
| F-14 | Automatic closing time | Owner sets an optional closing date/time; system stops accepting responses after it | FR-15, BR-02 | F-12 | Planned |
| F-15 | Additional question types | Multiple choice (min/max selections) and at least one more type, across definition, validation, response and summary | FR-16 | F-03, F-06, F-08 | Planned |
| F-16 | Anonymous mode and privacy design | Anonymous surveys with separate participation record, no linking metadata, minimum-response threshold for aggregates, respondent-facing disclosure | FR-17, FR-18, BR-10, BR-11, BR-12, NFR-07 | F-06, F-08, F-13 | Planned |
| F-17 | Owner view of individual responses | Owner views per-respondent answers for own identified surveys only | FR-13 | F-06, F-02 | Planned |
| F-18 | Input safety and validation messages | Script/markup in text answers rendered inert; validation messages name the question and rule | NFR-11, NFR-12 | F-06, F-10 | Planned |

---

## 3. Sprint 3: Completion and hardening (progress at 29 Nov, complete by 13 Dec)

| ID | Feature | Short description | Requirements | Depends on | Status |
|---|---|---|---|---|---|
| F-19 | CSV export | Owner exports own survey results; raw rows for identified surveys, aggregate rows only for anonymous surveys | FR-19, NFR-07 (export payload) | F-08, F-16, F-17 | Planned |
| F-20 | Richer analysis | Per-question breakdown, response rate against allowlist, date-range filter on summary | FR-20, NFR-08 | F-08, F-13 | Planned |
| F-21 | Failure handling and hardening **[Responsibility]** | Consistent error handling, usability fixes, regression suite, defect corrections from UAT and maintenance | FR-21 (hardening), regression of NFR-01 to NFR-12 | all | Planned |

---

## 4. Dependency overview

```
F-01 Auth ──► F-02 Authorization ──► F-03 Create ──► F-04 Publish ──► F-05 Browse ──► F-06 Submit ──┬─► F-07 Own response
                                                         │                                          └─► F-08 Summary
                                                         ├─► F-11 Edit draft                              │
                                                         ├─► F-12 Close ──► F-14 Auto-close               ├─► F-15 More types
                                                         └─► F-13 Allowlist ──────────────────────┐       ├─► F-17 Owner raw view
F-09 Persistence/setup (foundation for all)                                                         ▼       ▼
F-10 Errors/validation (foundation)                                                  F-16 Anonymous ──► F-19 Export ──► F-20 Analysis
```

Critical path for Sprint 1: F-09 and F-01, then F-02, F-03, F-04 (F-12 can follow immediately), F-05, F-06, then F-07 and F-08 in parallel.

---

## 5. Feature count summary

| Sprint | Features |
|---|---|
| 1 | F-01 to F-10 and F-12 (11 features) |
| 2 | F-11 and F-13 to F-18 (7 features) |
| 3 | F-19 to F-21 (3 features) |
| Total | 21 features |