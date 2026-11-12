# Requirements Traceability Matrix

**Project:** Survey and Feedback System (Theme 10)
**Linked documents:** `docs/srs.md`, `docs/features.md`
**Document version:** 0.2 (baseline, revised 2026-11-11 by CP-01 to CP-03) | **Team:** Jinjuta Nunnarumit (67070505210) / Thitigant Surayotin (67070505214)

**Chain:** Requirement, then Feature/Responsibility, then Sprint, then AC, then planned Test, then actual test file/name, then result and version.

**Honesty rule.** The columns "Actual test" and "Result" stay `-` until a test has really been executed against a recorded commit. A planned test is never reported as passing. Statuses: `NOT RUN`, `PASS`, `FAIL`, `SKIPPED`, `INCOMPLETE`.

**IDs.** Sprint 1 AC and test IDs below are **provisional**; the final IDs are fixed in the Sprint 1 feature contracts (`docs/sprints/sprint-1/`). Sprint 2 and Sprint 3 requirements show `TBD (Sprint n contract)` because their AC and tests are elaborated before implementation of that sprint.

---

## 1. Sprint 1 acceptance criteria and planned tests (provisional)

| AC | Feature | Observable outcome | Planned test | Level |
|---|---|---|---|---|
| AC-01 | F-01 | Valid credentials return a session/token and the user's role | TEST-01 | API integration |
| AC-02 | F-01 | Wrong email or password returns 401 with a generic message | TEST-02 | API integration |
| AC-03 | F-01 | After logout the same token is rejected with 401 | TEST-03 | API integration |
| AC-04 | F-01 | Current-user endpoint returns identity and role derived from the token only | TEST-04 | API integration |
| AC-05 | F-01 | An expired token is rejected with 401 | TEST-05 | API integration |
| AC-06 | F-01 | Stored passwords are salted hashes; no plaintext in the database | TEST-06 | DB integration |
| AC-07 | F-02 | Every protected endpoint returns 401 without credentials and no private data | TEST-07 | API integration |
| AC-08 | F-02 | A Respondent calling any Owner operation gets 403 | TEST-08 | API integration |
| AC-09 | F-02 | Owner B accessing Owner A's survey, summary or management operations is rejected | TEST-09 | API integration |
| AC-10 | F-02 | A Respondent requesting another Respondent's response is rejected without data | TEST-10 | API integration |
| AC-11 | F-03 | A draft survey with valid questions is persisted and retrievable by its owner | TEST-11 | API/DB integration |
| AC-12 | F-03 | Invalid survey definitions are rejected with a field-specific error and nothing is stored: empty or whitespace-only title, title over 150 characters, more than 30 questions, an unknown question type, a single-choice question with fewer than 2 or more than 10 options, or duplicate option labels within one question. A rating question has no configurable scale (it is fixed at 1 to 5), so there is no scale-definition case; rating answers are verified by AC-22 | TEST-12 | Unit + API |
| AC-13 | F-04 | Publishing a valid Draft changes status to Published and persists | TEST-13 | API/DB integration |
| AC-14 | F-04 | Publishing a survey with no questions is rejected and status stays Draft. The publication check (BR-03) is also unit-tested directly on in-memory surveys with an empty title, a single-choice question with fewer than 2 or more than 10 options, or duplicate option labels, because the API cannot create such Drafts in Sprint 1 (AC-12) | TEST-14 | Unit + API |
| AC-15 | F-04 | Invalid transitions (publish an already Published or Closed survey) are rejected | TEST-15 | Unit |
| AC-16 | F-05 | A Respondent sees only Published surveys in the list | TEST-16 | API integration |
| AC-17 | F-05 | A Respondent cannot open or answer a Draft survey | TEST-17 | API integration |
| AC-18 | F-06 | A valid response and its answers are stored in one transaction and linked to the respondent | TEST-18 | API/DB integration |
| AC-19 | F-06 | A second response by the same Respondent to the same survey is rejected; one stored | TEST-19 | API/DB integration |
| AC-20 | F-06 | 10 concurrent submissions by one Respondent to one survey store exactly 1 response | TEST-20 | Concurrency integration |
| AC-21 | F-06 | Submissions to a Draft survey and to a Closed survey are rejected, and nothing is stored | TEST-21 | API integration |
| AC-22 | F-06 | Missing required answer, rating out of range, option not belonging to the question, text over 500 characters are each rejected with a field-specific error | TEST-22 | Unit + API |
| AC-23 | F-02 | A Survey Owner calling a Respondent-only operation (list or open available surveys, submit a response, read own response) gets 403 and nothing is stored. This is the reverse direction of AC-08 and covers the withdrawn BR-09 case (an owner answering a survey) through the role matrix (CP-02) | TEST-23 | API integration |
| AC-24 | F-06 | An identified response is never labelled anonymous in storage or API output | TEST-24 | API/DB integration |
| AC-25 | F-07 | After submit the Respondent sees a confirmation and retrieves their own answers | TEST-25 | UI/E2E + API |
| AC-26 | F-08 | Summary counts, percentages and averages match a known seeded dataset | TEST-26 | Unit + API |
| AC-27 | F-08 | Summary of a survey with zero responses shows zero counts without error | TEST-27 | Unit + API |
| AC-28 | F-09 | Records created before an application restart are readable after restart | TEST-28 | Integration (restart) |
| AC-29 | F-09 | A fresh clone is set up, migrated, seeded and tested with only the README commands | TEST-29 | Manual, teammate-run, recorded |
| AC-30 | F-09 | No secrets in the repository; `.env.example` lists all variables | TEST-30 | Scan + review |
| AC-31 | F-10 | Validation and server errors return structured responses with no stack trace or private data | TEST-31 | API integration |
| AC-32 | all | Critical journey: Owner creates and publishes, Respondent submits, Owner sees summary, Owner closes and a later submission is rejected | TEST-32 | UI/E2E |
| AC-33 | F-12 | Closing a Published survey changes status to Closed, persists, and a later response is rejected | TEST-33 | API/DB integration |
| AC-34 | F-12 | Closing by a non-owner or Respondent is rejected; closing a Draft or already Closed survey is rejected as an invalid transition | TEST-34 | Unit + API |

---

## 2. Functional requirements

| Requirement | Feature | Sprint | AC / verification target | Planned test | Actual test | Result and version |
|---|---|---|---|---|---|---|
| FR-01 | F-01 | 1 | AC-01, AC-02 | TEST-01, TEST-02 | - | NOT RUN |
| FR-02 | F-01 | 1 | AC-03 | TEST-03 | - | NOT RUN |
| FR-03 | F-01 | 1 | AC-04 | TEST-04 | - | NOT RUN |
| FR-04 | F-03 | 1 | AC-11, AC-12 | TEST-11, TEST-12 | - | NOT RUN |
| FR-05 | F-03 | 1 | AC-11, AC-12 | TEST-11, TEST-12 | - | NOT RUN |
| FR-06 | F-11 | 2 | TBD (Sprint 2 contract) | TBD | - | NOT RUN |
| FR-07 | F-04 | 1 | AC-13, AC-14 | TEST-13, TEST-14 | - | NOT RUN |
| FR-08 | F-12 | 1 | AC-33, AC-34 | TEST-33, TEST-34 | - | NOT RUN |
| FR-09 | F-05 | 1 | AC-16, AC-17 | TEST-16, TEST-17 | - | NOT RUN |
| FR-10 | F-06 | 1 | AC-18, AC-22 | TEST-18, TEST-22 | - | NOT RUN |
| FR-11 | F-07 | 1 | AC-25 | TEST-25 | - | NOT RUN |
| FR-12 | F-08 | 1 | AC-26, AC-27 | TEST-26, TEST-27 | - | NOT RUN |
| FR-13 | F-17 | 2 | TBD (Sprint 2 contract) | TBD | - | NOT RUN |
| FR-14 | F-13 | 2 | TBD (Sprint 2 contract) | TBD | - | NOT RUN |
| FR-15 | F-14 | 2 | TBD (Sprint 2 contract) | TBD | - | NOT RUN |
| FR-16 | F-15 | 2 | TBD (Sprint 2 contract) | TBD | - | NOT RUN |
| FR-17 | F-16 | 2 | TBD (Sprint 2 contract) | TBD | - | NOT RUN |
| FR-18 | F-16 | 2 | TBD (Sprint 2 contract) | TBD | - | NOT RUN |
| FR-19 | F-19 | 3 | TBD (Sprint 3 contract) | TBD | - | NOT RUN |
| FR-20 | F-20 | 3 | TBD (Sprint 3 contract) | TBD | - | NOT RUN |
| FR-21 | F-10 (basic, Sprint 1), F-18 and F-21 (Sprint 2 and 3) | 1, 3 | AC-31 (Sprint 1); TBD (Sprint 3) | TEST-31; TBD | - | NOT RUN |

---

## 3. Business rules

| Requirement | Feature | Sprint | AC / verification target | Planned test | Actual test | Result and version |
|---|---|---|---|---|---|---|
| BR-01 | F-06 | 1 | AC-19, AC-20 | TEST-19, TEST-20 | - | NOT RUN |
| BR-02 | F-06, F-12 (Sprint 1), F-14 (Sprint 2) | 1, 2 | AC-21, AC-33; TBD for automatic close | TEST-21, TEST-33; TBD | - | NOT RUN |
| BR-03 | F-04 (publish check), F-03 (definition limits, CP-03) | 1 | AC-12, AC-14 | TEST-12, TEST-14 | - | NOT RUN |
| BR-04 | F-04 (publish), F-12 (close) | 1 | AC-15, AC-34 | TEST-15, TEST-34 | - | NOT RUN |
| BR-05 | F-11 | 2 | TBD (Sprint 2 contract) | TBD | - | NOT RUN |
| BR-06 | F-02 | 1 | AC-09 | TEST-09 | - | NOT RUN |
| BR-07 | F-06 | 1 | AC-22 | TEST-22 | - | NOT RUN |
| BR-08 | F-02, F-07 | 1 | AC-08, AC-10 | TEST-08, TEST-10 | - | NOT RUN |
| BR-09 | Withdrawn (CP-02); covered by the F-02 role matrix | 1 | WITHDRAWN. Owner access to Respondent-only operations is verified by AC-23 under NFR-02 | TEST-23 (counted under NFR-02) | - | WITHDRAWN (ID kept, not reused) |
| BR-10 | F-06 (identified, Sprint 1), F-16 (anonymous) | 1, 2 | AC-24; TBD for anonymous mode | TEST-24; TBD | - | NOT RUN |
| BR-11 | F-16 | 2 | TBD (Sprint 2 contract) | TBD | - | NOT RUN |
| BR-12 | F-16 | 2 | TBD (Sprint 2 contract) | TBD | - | NOT RUN |
| BR-13 | F-13 | 2 | TBD (Sprint 2 contract) | TBD | - | NOT RUN |
| BR-14 | F-08 | 1 | AC-26, AC-27 | TEST-26, TEST-27 | - | NOT RUN |

---

## 4. Non-functional requirements

| Requirement | Feature / responsibility | Sprint that establishes and verifies | Measurable target and method | Planned test | Actual test or measurement | Result and version |
|---|---|---|---|---|---|---|
| NFR-01 | F-02 | 1 (re-run each sprint) | 401 and no data on 100% of protected endpoints; AC-07 | TEST-07 | - | NOT RUN |
| NFR-02 | F-02 | 1 (re-run each sprint) | Each operation in the permission matrix has a negative test; AC-08, AC-09, AC-10, AC-23 | TEST-08, TEST-09, TEST-10, TEST-23 | - | NOT RUN |
| NFR-03 | F-01 | 1 | 0 plaintext passwords; AC-06 | TEST-06 | - | NOT RUN |
| NFR-04 | F-01 | 1 | Expired and logged-out tokens return 401; AC-03, AC-05 | TEST-03, TEST-05 | - | NOT RUN |
| NFR-05 | F-06 | 1 | 10 concurrent requests store 1 response, 20 consecutive runs; AC-20 | TEST-20 | - | NOT RUN |
| NFR-06 | F-09 | 1 (local), Lab 5 (cloud) | 100% of records readable after restart; AC-28 | TEST-28 | - | NOT RUN |
| NFR-07 | F-16, F-19 | 2 (schema/API), 3 (export) | No user identifier recoverable from anonymous answer storage or export payloads | TBD | - | NOT RUN |
| NFR-08 | F-20 | 3 | Summary of 1,000 responses and 10 questions under 1 second (p95, 20 requests) | TBD | - | NOT RUN |
| NFR-09 | F-09 | 1 | Fresh clone to passing tests in 10 commands or fewer; AC-29 | TEST-29 | - | NOT RUN |
| NFR-10 | F-09 | 1 | 0 secrets found by scan; AC-30 | TEST-30 | - | NOT RUN |
| NFR-11 | F-18 | 2 | Script payload in a text answer displays as inert text | TBD | - | NOT RUN |
| NFR-12 | F-18 | 2 | Every validation failure names the question and rule in the UI | TBD | - | NOT RUN |

---

## 5. Coverage check

| Check | Result |
|---|---|
| Requirements in SRS | 21 FR, 14 BR IDs (13 active; BR-09 withdrawn by CP-02), 12 NFR = 47 IDs, 46 active |
| Requirements mapped to a feature or responsibility and a sprint | 46 of 46 active (BR-09 withdrawn, see CP-02) |
| Requirements with elaborated AC and planned tests now (Sprint 1) | FR-01 to FR-05, FR-07 to FR-12, FR-21 (basic); BR-01 to BR-04, BR-06 to BR-08, BR-10 (identified), BR-14; NFR-01 to NFR-06, NFR-09, NFR-10 |
| Requirements with AC and tests deferred to the Sprint 2 or Sprint 3 contract | FR-06, FR-13 to FR-20, FR-21 (hardening); BR-02 (automatic close), BR-05, BR-10 (anonymous), BR-11 to BR-13; NFR-07, NFR-08, NFR-11, NFR-12 |
| Requirements with executed and passing verification | 0 of 46 active (no Sprint 1 test has been executed against a recorded commit yet) |
| Uncovered requirements (no feature or sprint) | None |

---

## 6. Approved changes and change proposals

| ID | Date | Change | Affected | Status | Rationale |
|---|---|---|---|---|---|
| CP-01 | 2026-11-11 | **Approved:** move FR-08 and F-12 (manual close) from Sprint 2 into Sprint 1 (option b). Superseded plan (option a): keep manual close in Sprint 2 and test Closed rejection with a seeded Closed survey. AC-33, AC-34, TEST-33 and TEST-34 were added; AC-21 and AC-32 now exercise Close through the real UI/API | FR-08, F-12, BR-02, BR-04, AC-21, AC-32, AC-33, AC-34 | Approved by team 2026-11-11; TA confirmation pending | The Sprint 1 theme example requires rejecting responses to unpublished and closed surveys; without F-12 the Closed rule could not be exercised through the real UI |
| CP-02 | 2026-11-11 | **Applied, confirm with both students:** withdraw BR-09. Previous text: "A Survey Owner cannot submit a response to their own survey, to keep results free of owner bias." ID BR-09 is kept and not reused; error code `OWN_SURVEY` removed from the System SDS; AC-23 re-scoped from F-06 to F-02 (Owner calling Respondent-only operations returns 403) | BR-09, F-02, F-06, AC-23, System SDS 2.3, 2.4, 5, 6, 12 | Applied 2026-11-11; confirmation by both students and TA pending | Each account has exactly one role and submit uses `requireRole(RESPONDENT)`, so an Owner gets 403 before any own-survey check; the rule was unreachable and duplicated the role matrix. Alternative not chosen: let Owners answer other owners' surveys (needs a matrix, AC and endpoint redesign) |
| CP-03 | 2026-11-11 | **Applied, confirm with both students:** assumption A-05 promoted to testable limits in FR-04 and FR-05 (title 1 to 150 characters, at most 30 questions); BR-03 "distinct options" now has explicit verification; AC-12 reworded because the rating scale is a fixed 1 to 5 and has no definition field; AC-14 extended. Previous AC-12 text: "Invalid question definitions are rejected (single choice with fewer than 2 or more than 10 options, rating outside 1 to 5 scale definition, empty title)" | FR-04, FR-05, BR-03, A-05, AC-12, AC-14 | Applied 2026-11-11; confirmation pending | Remove an AC that did not match the data model and give every stated limit an observable test |

When a change is approved, add a row here with its date and rationale, update the SRS, feature inventory and this matrix, and keep the old values visible by recording them in the change entry instead of overwriting them silently.