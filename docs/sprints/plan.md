# Three-Sprint Plan

**Project:** Review, Feedback, and Survey System (Theme 10)
**Linked documents:** `docs/srs.md`, `docs/features.md`, `docs/traceability.md`, `docs/system-sds.md`
**Document version:** 0.1 (draft, 2026-11-11) | **Team:** Jinjuta Nunnarumit (67070505210) / Thitigant Surayotin (67070505214)

> Dates come from the CPE 334 schedule. **[Proposed]** items are the drafter's suggestions and must be confirmed by both students. Replace the status column with real dates when work is done; do not rewrite history.

---


## 1. Plan at a glance

| Sprint | Goal | Feature IDs | Checkpoint | Completion outcome |
|---|---|---|---|---|
| 1 | Small deployable product: authentication, authorization, persistence and one end-to-end survey journey | F-01 to F-10, F-12 (11 features) | Deliverable 1, 8 Nov | Tagged release on `main`; runs locally from the README; Sprint 1 AC pass with recorded evidence |
| 2 | Core expansion: editing, eligibility, automatic close, more question types, anonymous mode, owner raw view, input safety | F-11, F-13 to F-18 (7 features) | Deliverable 2, 29 Nov | All Sprint 2 AC complete and verified; integrated release deployed on GCP |
| 3 | Completion and hardening: export, richer analysis, failure handling, defects | F-19 to F-21 (3 features) | Progress at 29 Nov; complete 13 Dec | Final release on `main`, deployed, regression suite green, final report and video |

Together the three sprints cover all 21 features and every active requirement in `docs/traceability.md` (46 active; BR-09 withdrawn by CP-02).

---

## 2. Sprint 1: small deployable product

**Goal.** An Owner logs in, creates and publishes an identified survey; a Respondent logs in, submits a validated response and sees confirmation; the Owner views the aggregate summary and can close the survey; duplicates, non-Published submissions, invalid answers, and cross-role or cross-user access are rejected.

**Included features and requirements**

| Feature | Requirements | Depends on |
|---|---|---|
| F-09 Persistence, seed, setup | NFR-06, NFR-09, NFR-10 | none |
| F-01 Authentication and session | FR-01 to FR-03, NFR-03, NFR-04 | F-09 |
| F-10 Basic validation and error handling | FR-21 (basic) | F-01 |
| F-02 Role and ownership authorization | BR-06, BR-08, NFR-01, NFR-02 | F-01 |
| F-03 Create draft survey | FR-04, FR-05, BR-03 (limits) | F-01, F-02 |
| F-04 Publish survey | FR-07, BR-03, BR-04 | F-03 |
| F-12 Close survey (moved in by CP-01) | FR-08, BR-02, BR-04 | F-04 |
| F-05 Browse and open published surveys | FR-09 | F-02, F-04 |
| F-06 Submit response | FR-10, BR-01, BR-02, BR-07, BR-10 (identified), NFR-05 | F-05 |
| F-07 Confirmation and own response | FR-11, BR-08 | F-06 |
| F-08 Aggregate summary | FR-12, BR-14, BR-06 | F-06 |

**Order of work (critical path).** F-09 and F-01, then F-10 and F-02, then F-03, F-04 (with F-12 right after), F-05, F-06, then F-07 and F-08 in parallel. The final step is the critical-journey E2E test (AC-32).

**Out of Sprint 1.** Editing a Draft, allowlists, automatic closing, extra question types, anonymous mode, owner raw-response view, export and richer analysis.

**Feasibility.** Eleven features, but several are small (F-05, F-07, F-10, F-12) and the stack and authentication middleware are reused from Lab 4. Pair work is expected on F-06, which carries the most rules and tests.

**Exit criteria.** Every Sprint 1 AC has an executed test with a recorded commit, the journey demo and the rejection and forbidden-access demos work from the README setup, reviewed PRs are merged through sprint staging into `main`, and a release tag is recorded.

---

## 3. Sprint 2: core expansion

**Goal.** Make the product match the stakeholder brief for eligibility, control and privacy, and complete Sprint 2 by 29 Nov.

| Feature | Requirements | Depends on | Notes |
|---|---|---|---|
| F-11 Edit draft survey | FR-06, BR-05 | F-03, F-04 | Published surveys become immutable |
| F-13 Eligibility allowlist | FR-14, BR-13 | F-04, F-05 | New `SurveyAllowlist` table |
| F-14 Automatic closing time | FR-15, BR-02 | F-12 | Server checks time on every submission; no background job needed |
| F-15 Additional question types | FR-16 | F-03, F-06, F-08 | Multiple choice plus at least one more type |
| F-16 Anonymous mode and privacy design | FR-17, FR-18, BR-10, BR-11, BR-12, NFR-07 | F-06, F-08, F-13 | Heaviest feature; separate participation record, threshold of 5 |
| F-17 Owner view of individual responses | FR-13 | F-02, F-06 | Identified surveys only |
| F-18 Input safety and validation messages | NFR-11, NFR-12 | F-06, F-10 | |

**Order of work [Proposed].** Start F-16 early because it carries the most risk and the schema change. Do F-13 before F-16 (dependency), F-15 after the Sprint 1 response and summary code is stable, and F-18, F-11, F-14, F-17 as smaller items. Write each feature contract (SDS, AC, STS) before implementing it.

**Parallel obligations.** Lab 5 (deployment, due 15 Nov), Lab 6 (UAT, due 22 Nov) and Lab 7 (maintenance change, due 29 Nov) fall inside this sprint. Keep lab work in separate Issues and branches so assessment evidence stays identifiable. Lab 6 findings feed the defect register for Deliverable 2.

**Exit criteria.** All seven features meet their AC with executed tests; Sprint 1 critical journey still passes; the integrated release is deployed on GCP through the pipeline from Lab 5 and the deployed version matches the commit.

**Risk.** Seven features including the anonymous design in about two weeks, alongside three labs. If scope must shrink, do it through a recorded scope change approved by the instructor or TA, never by silently moving required features to Sprint 3.

---

## 4. Sprint 3: completion and hardening

**Goal.** Finish remaining features and harden the product. By 29 Nov, have contracts, working progress and an explicit remaining-work list. Complete and release by 13 Dec.

| Feature | Requirements | Depends on | Notes |
|---|---|---|---|
| F-19 CSV export | FR-19, NFR-07 (export payload) | F-08, F-16, F-17 | Raw rows for identified surveys; aggregates only for anonymous |
| F-20 Richer analysis | FR-20, NFR-08 | F-08, F-13 | Includes the 1,000-response timing test |
| F-21 Failure handling and hardening | FR-21 (hardening), regression of NFR-01 to NFR-12 | all | Login rate limiting, defect fixes, final regression run |

**By 29 Nov [Proposed].** Contracts for F-19, F-20, F-21 are written, and at least F-19 (or a bounded part of F-20) is implemented and tested. The remaining-work list names exact features, AC, owners and dates.

**1 to 11 Dec (final exams).** Keep only bounded work: remaining Sprint 3 AC, UAT re-tests, defect fixes. Reserve 11 to 13 Dec for the full regression run on the final commit, deployment check, report PDF and the demo video. Do not leave any main workflow for the last two days.

**Exit criteria.** All Sprint 3 AC verified; final regression suite passes on the release commit; deployed application matches the tag; demo video and final PDF submitted.

---

## 5. Dependencies and critical path

```
F-09 ─► F-01 ─► F-02 ─► F-03 ─► F-04 ─► F-12 ─► F-14
                │         │       ├─► F-05 ─► F-06 ─┬─► F-07
        F-10 ───┘         │       │                 ├─► F-08 ─► F-20
                          │       ├─► F-11          ├─► F-15
                          │       └─► F-13 ─► F-16 ─┤
                          │                         └─► F-17 ─► F-19
                          └─ F-18 (after F-06, F-10)       F-21 (all)
```

Longest chain: F-09, F-01, F-02, F-03, F-04, F-05, F-06, F-13, F-16, F-19. A slip in F-06 delays Sprint 2's most valuable features, so finish F-06 first among the Sprint 1 domain features.

---

## 6. Coverage of the baseline

| Item | Sprint 1 | Sprint 2 | Sprint 3 |
|---|---|---|---|
| FR | FR-01 to FR-05, FR-07 to FR-12, FR-21 (basic) | FR-06, FR-13 to FR-18 | FR-19, FR-20, FR-21 (hardening) |
| BR | BR-01 to BR-04, BR-06 to BR-08, BR-10 (identified), BR-14 | BR-05, BR-10 (anonymous), BR-11 to BR-13, BR-02 (automatic close) | none new |
| NFR | NFR-01 to NFR-06, NFR-09, NFR-10 | NFR-07, NFR-11, NFR-12 | NFR-07 (export), NFR-08, regression of all |

---

## 7. Change control

Any change to sprint allocation is recorded in `docs/traceability.md` section 6 with date, old value, new value and rationale (for example CP-01 moved F-12 into Sprint 1). Update this plan, the feature inventory and the SRS together.