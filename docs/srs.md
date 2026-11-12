# Software Requirements Specification (SRS)

**Project:** Survey and Feedback System (Theme 10: Review, Feedback, and Survey System)
**Course:** CPE 334, Semester 1/2026
**Team:** Jinjuta Nunnarumit (67070505210) / Thitigant Surayotin (67070505214)
**Document version:** 0.2 (draft, revised 2026-11-11: CP-01 to CP-03) | **Status:** baseline for Sprint 1 contracts

> Items in `<angle brackets>` must be filled in by the team. Items marked **[Proposed]** are the drafter's suggestions and must be confirmed by both students.

---

## 1. Stakeholder problem and chosen context

### 1.1 Problem
An organization needs a controlled way to collect opinions from its members. Today, feedback is gathered ad hoc (chat polls, paper forms, shared spreadsheets). This causes duplicate answers, responses to surveys that should be closed, unclear access to raw answers, and no trustworthy summary. For sensitive topics, members also do not trust that "anonymous" really means anonymous.

### 1.2 Chosen context **[Proposed]**
A university department collects **course and activity feedback** (for example end-of-course feedback, workshop evaluations, facility feedback). Lecturers and staff create surveys; students respond. The context is used only to give concrete names to roles and examples; all rules are domain-generic.

### 1.3 Product goal
A full-stack web application where authenticated Survey Owners define surveys, publish and close them, control who may respond, and view aggregate results (and, where permitted, raw data and exports), and authenticated Respondents submit validated responses exactly once per survey.

---

## 2. Actors and responsibilities

| Actor | Description | Responsibilities |
|---|---|---|
| **Survey Owner** | Lecturer/staff who creates surveys | Create and edit draft surveys; publish; close; view aggregate summary of own surveys; view raw responses of own identified surveys; (later) set eligibility, choose anonymous mode, export results |
| **Respondent** | Student/member answering surveys | Log in; see surveys they may answer; submit one validated response per survey; view confirmation and their own submission |
| **System** | The application | Authenticate users; enforce roles and ownership on the backend; enforce survey state and duplicate rules; persist data; compute summaries |

Each account has exactly one role (multiple roles per account are out of scope). Demo accounts are seeded.

---

## 3. Product scope

### 3.1 In scope (whole product, across three sprints)
- Login, logout, current-user identity, role-based access (Survey Owner, Respondent).
- Survey definition with title, description, response mode (identified / anonymous) and ordered questions.
- Question types: single choice, rating (1 to 5), short text (Sprint 1); multiple choice and others (Sprint 2).
- Survey lifecycle: Draft, Published, Closed.
- Response eligibility control and duplicate-response prevention.
- Identified mode and anonymous mode with a documented privacy design.
- Aggregate summary, raw-response access rules, richer analysis, and CSV export.
- Persistent relational database, reproducible seed data, Docker packaging, CI/CD, GCP deployment (from Lab 5).

### 3.2 Explicit exclusions
- Self-registration, password recovery, email verification, advanced account administration.
- Multiple roles per account.
- Sending invitations or reminders by email or any external messaging service.
- External APIs, payment, or SSO integration.
- Survey branching/skip logic, file-upload questions, multilingual survey content.
- Statistical significance testing and machine-learning text analysis.
- Real personal data; only synthetic data is used.

---

## 4. Functional Requirements (FR)

Sprint: planned sprint in which the requirement is established and verified.

| ID | Requirement (observable behavior) | Actor | Sprint |
|---|---|---|---|
| FR-01 | A user can log in with an email and password. Valid credentials create a session/token; invalid credentials are rejected with a generic error that does not reveal which field was wrong. | Any | 1 |
| FR-02 | A logged-in user can log out; afterwards the session/token is no longer accepted by protected endpoints. | Any | 1 |
| FR-03 | The system returns the current user's identity and role from the session/token; the client cannot choose its own user ID or role. | Any | 1 |
| FR-04 | A Survey Owner can create a survey in Draft status with a title of 1 to 150 characters, a description, and a response mode (Sprint 1: identified only). | Owner | 1 |
| FR-05 | A Survey Owner can add ordered questions to a Draft survey of types single choice (with 2 to 10 distinct options), rating (fixed scale 1 to 5, not configurable), and short text, each marked required or optional. A survey has at most 30 questions. Definitions that break these limits are rejected. | Owner | 1 |
| FR-06 | A Survey Owner can edit or delete questions and edit survey details while the survey is in Draft. | Owner | 2 |
| FR-07 | A Survey Owner can publish a Draft survey that passes publication checks (BR-03); its status becomes Published and it becomes visible to eligible Respondents. | Owner | 1 |
| FR-08 | A Survey Owner can manually close a Published survey; its status becomes Closed and no further responses are accepted. | Owner | 1 |
| FR-09 | A Respondent can list the Published surveys they are eligible to answer and open one to see its questions. | Respondent | 1 |
| FR-10 | A Respondent can submit a response to a Published survey. The server validates every answer against its question definition (BR-07) and stores the response and its answers in one transaction. | Respondent | 1 |
| FR-11 | After a successful submission, the Respondent sees a confirmation, and can retrieve their own submitted answers. | Respondent | 1 |
| FR-12 | A Survey Owner can view an aggregate summary of a survey they own: total responses, per-choice counts and percentages for single choice, count/average/distribution for rating, and the list of text answers for short text. | Owner | 1 |
| FR-13 | A Survey Owner can view the list of individual responses (with respondent identity) for their own identified surveys. | Owner | 2 |
| FR-14 | A Survey Owner can restrict a survey to an allowlist of Respondent accounts; ineligible Respondents cannot see or answer it. | Owner | 2 |
| FR-15 | A Survey Owner can optionally set a closing date/time; the system stops accepting responses after it without manual action. | Owner | 2 |
| FR-16 | The system supports additional question types (multiple choice with min/max selections, and at least one more such as matrix or numeric scale) in definition, response, validation, and summary. | Owner, Respondent | 2 |
| FR-17 | A Survey Owner can create a survey in anonymous mode. Anonymous responses are stored so that they cannot be linked to the respondent's account (see Section 7 and BR-10 to BR-12). | Owner | 2 |
| FR-18 | A Respondent can see the anonymity mode of a survey before answering, and the system states plainly what is and is not recorded. | Respondent | 2 |
| FR-19 | A Survey Owner can export the results of their own survey as CSV (raw responses for identified surveys, aggregate data for anonymous surveys). | Owner | 3 |
| FR-20 | A Survey Owner can view richer analysis: response rate against the allowlist (where one exists), per-question breakdown, and filtering of the summary by date range. | Owner | 3 |
| FR-21 | The system shows clear validation, empty, loading, and error states in the UI and returns structured, safe error responses from the API (no stack traces or private data). | All | 3 (basic from 1) |

---

## 5. Business Rules (BR)

| ID | Rule | Verified by (planned) | Sprint |
|---|---|---|---|
| BR-01 | A Respondent can have at most one response per survey. A second submission is rejected, and no second response is stored. This is enforced by a database unique constraint, not only by application logic, and it holds under concurrent requests. | API/DB integration test, concurrency test | 1 |
| BR-02 | Responses are accepted only when the survey status is Published (and, once FR-15 exists, before its closing time). Submissions to Draft or Closed surveys are rejected. | API test | 1 |
| BR-03 | A survey can be published only if it has a non-empty title, at least one question, and every single-choice question has 2 to 10 distinct options. The same limits are rejected at creation (FR-04, FR-05); the publish check re-verifies them. | Unit + API test (AC-12, AC-14) | 1 |
| BR-04 | Survey status follows Draft, then Published, then Closed only. Closed is terminal. Any other transition (for example Closed to Published, Draft to Closed) is rejected. | Unit test | 1 |
| BR-05 | After publication, the survey's questions, options, and response mode can no longer be changed. Only closing is allowed. | API test | 2 |
| BR-06 | A Survey Owner can read, modify, publish, or close only surveys they own. Access to another owner's survey (including its summary and responses) is rejected. | API test | 1 |
| BR-07 | Answer validation: every required question must be answered; a single-choice answer must be one of that question's options; a rating must be an integer from 1 to 5; short text must be at most 500 characters and non-blank if required; answers to questions not belonging to the survey are rejected. | Unit + API test | 1 |
| BR-08 | A Respondent can read only their own response. A Respondent cannot create, edit, publish, close, or summarize any survey. | API test | 1 |
| BR-09 | **Withdrawn (CP-02, 2026-11-11).** Previously: a Survey Owner cannot submit a response to their own survey. Not needed as a separate rule: an account has one role and only Respondents may submit (BR-08 and the role matrix), so an Owner is rejected with 403. ID kept, not reused. | Covered by the role-matrix test AC-23 | - |
| BR-10 | A survey declares its mode at creation: identified or anonymous. A response to an identified survey is linked to the respondent. The system must never label an identified response or survey as anonymous. | Test + design review | 1 (identified) / 2 |
| BR-11 | In anonymous mode, answer records contain no user ID or any other direct link to the respondent, and no fine-grained timestamp. Duplicate prevention uses a separate participation record (survey ID, user ID) that has no reference to answer records. | DB schema test + design review | 2 |
| BR-12 | **[Proposed]** For anonymous surveys, the aggregate summary and text answers are shown only after at least 5 responses exist; before that the owner sees only the response count. | API test | 2 |
| BR-13 | When an allowlist exists for a survey, only Respondents on it can see or answer it. Without an allowlist, any logged-in Respondent can. | API test | 2 |
| BR-14 | Aggregate figures count each response once; percentages are computed from the number of responses to that question, and optional questions left blank are excluded from that question's denominator. | Unit test | 1 |

---

## 6. Non-Functional Requirements (NFR)

| ID | Requirement and measurable target | Verification method | Sprint |
|---|---|---|---|
| NFR-01 | **Authentication enforcement.** Every protected endpoint rejects unauthenticated requests with HTTP 401 and a body containing no survey, response, or user data. Target: 100% of protected endpoints in the endpoint inventory. | Automated API test iterating over the endpoint inventory | 1 (re-run each sprint) |
| NFR-02 | **Authorization enforcement.** Forbidden role access returns HTTP 403 and cross-user/cross-owner access returns 403 or 404, with no private data in the body. Target: every protected operation in the role/permission matrix has at least one negative test. | Automated API tests mapped to the permission matrix | 1 (re-run each sprint) |
| NFR-03 | **Credential security.** Passwords are stored only as salted hashes (bcrypt or argon2); no plaintext password appears in the database, logs, or repository. Target: 0 plaintext occurrences. | DB inspection test on seed data + repository secret scan | 1 |
| NFR-04 | **Session lifecycle.** Sessions/tokens expire after a documented period (**[Proposed]** 60 minutes) and are rejected after logout. Target: expired and logged-out tokens always return 401. | API test with short test expiry setting | 1 |
| NFR-05 | **Duplicate-safety under concurrency.** When 10 concurrent submissions are sent by the same Respondent to the same survey, exactly 1 response is stored. Target: 1 stored, 9 rejected, in 20 consecutive runs. | Concurrency integration test | 1 |
| NFR-06 | **Persistence.** All surveys, responses, and accounts survive application restart and redeployment. Target: 100% of previously stored records readable after restart. | Restart test locally (Sprint 1); post-deployment check on GCP | 1 (local) / Lab 5 (cloud) |
| NFR-07 | **Anonymity guarantee.** For anonymous surveys, no query on the answers table can recover a user ID. Target: schema contains no user reference in anonymous answer storage; test confirms export and API payloads contain no user identifiers. | Schema test + API/export payload test | 2 (export in 3) |
| NFR-08 | **Performance.** Aggregate summary for a survey with 1,000 seeded responses and 10 questions returns in under 1 second (p95 over 20 requests) on the deployed or local Docker environment. | Scripted timing test with seeded data | 3 |
| NFR-09 | **Reproducibility.** A fresh clone can be set up, migrated, seeded, and tested using only the documented commands in the README, with no undocumented manual steps. Target: setup in 10 commands or fewer and all tests passing. | Fresh-clone run by the teammate, recorded | 1 (re-checked in Lab 5) |
| NFR-10 | **Secret hygiene.** No real secrets in Git or client code; configuration via environment variables with a documented `.env.example`. Target: 0 secrets found by scan. | Repository scan + code review | 1 |
| NFR-11 | **Input safety.** All user-supplied text is stored and rendered without executing markup or script (XSS-safe), and queries are parameterized. Target: a test submitting a script payload as a text answer displays it as inert text. | API/UI test | 2 |
| NFR-12 | **Usability of validation.** Every failed validation shows a message that names the offending question and the rule violated, in the UI. | Selected UI/E2E test | 2 |

---

## 7. Privacy design summary for anonymous mode (to be detailed in the System SDS)

1. **Two separate stores.** `participation(survey_id, user_id)` records only *that* a user has answered, to enforce BR-01. `anonymous_response` and its answers contain **no** user ID and no reference to `participation`.
2. **No linking metadata.** No fine-grained timestamps (date only), no IP address, no user agent, no sequential ID order that matches participation order (use random UUIDs).
3. **Small-group protection.** Aggregates and text answers are hidden until at least 5 responses exist (BR-12).
4. **Honest labeling.** Identified surveys can never display the anonymous label (BR-10). The respondent is shown what is recorded before answering (FR-18).
5. **Owner access.** Owners of anonymous surveys see aggregates only; no raw per-respondent view exists.
6. **Known limitation (to disclose).** Free-text answers can still reveal identity if the respondent writes identifying details; the UI warns the respondent.

---

## 8. Assumptions

| ID | Assumption |
|---|---|
| A-01 | Users are seeded; at least 2 Survey Owners and 5 Respondents exist for demonstration and cross-user tests. |
| A-02 | The application is used over a web browser; a modular monolith (UI, API layer, relational database) is sufficient. |
| A-03 | Survey content is in a single language and plain text. |
| A-04 | One account has one role. |
| A-05 | A survey has at most 30 questions and a title of at most 150 characters. Promoted to testable limits in FR-04 and FR-05, verified by AC-12 (CP-03). |

---

## 9. Design decisions and resolved questions

| ID | Question / ambiguity | Decision **[Proposed]** | Status |
|---|---|---|---|
| D-01 | Which question types in Sprint 1? | Single choice, rating 1 to 5, short text. Multiple choice and others in Sprint 2. | Open: confirm with TA |
| D-02 | Who may respond in Sprint 1? | Any logged-in Respondent. Survey Owners cannot respond because the Owner role cannot call respondent operations (CP-02). Allowlist in Sprint 2. | Open |
| D-03 | What counts as a duplicate response? | Same user and same survey, enforced by a unique constraint (BR-01). | Open |
| D-04 | How does publication and closing work? | Draft, Published, Closed. Manual publish and manual close in Sprint 1 (change CP-01); optional automatic close time in Sprint 2. | Decided by team 2026-11-11; TA confirmation pending |
| D-05 | Who may see raw data? | Owner of an identified survey sees per-respondent answers (Sprint 2). Owner of an anonymous survey sees aggregates only. Respondents see only their own response. | Open |
| D-06 | May published surveys be edited? | No (BR-05), to keep results comparable. | Open |
| D-07 | Can a respondent edit a submitted response? | No; responses are final in this baseline. | Open |
| D-08 | Anonymous threshold | Minimum 5 responses (BR-12). | Open |
| D-09 | Session mechanism | JWT access token (Lab 4 stack, expiry 60 minutes, no refresh token) plus a `RevokedToken` table so that logout invalidates the token; details in System SDS Section 7. | Decided by team 2026-11-11 |
| D-10 | May a Survey Owner answer a survey? | No. An account has one role and only Respondents submit responses. BR-09 withdrawn (CP-02). | Applied 2026-11-11; confirm with both students and TA |

*Record the date and the TA/instructor answer for each decision once confirmed, and keep changes visible rather than overwriting history.*

---

## 10. Requirement allocation summary

| Sprint | Requirements established and verified |
|---|---|
| 1 | FR-01 to FR-05, FR-07 to FR-12, FR-21 (basic); BR-01 to BR-04, BR-06 to BR-08, BR-10 (identified), BR-14 (BR-09 withdrawn); NFR-01 to NFR-06, NFR-09, NFR-10 |
| 2 | FR-06, FR-13 to FR-18; BR-05, BR-10 (anonymous), BR-11, BR-12, BR-13; NFR-07, NFR-11, NFR-12 |
| 3 | FR-19, FR-20, FR-21 (hardening); NFR-07 (export), NFR-08; regression of all NFR |

The full requirement-to-feature-to-sprint-to-test matrix is maintained in `docs/traceability.md`.