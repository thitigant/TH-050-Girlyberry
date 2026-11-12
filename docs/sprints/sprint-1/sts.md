# Sprint 1 Software Test Specification (STS)

**Project:** Review, Feedback, and Survey System (Theme 10)  
**Deliverable:** Deliverable 1 (Part E)  
**Linked Documents:** `docs/traceability.md`, `docs/srs.md`, `docs/system-sds.md`, `docs/sprints/sprint-1/features-sds.md`  

This document specifies all planned automated tests for Sprint 1, establishing preconditions, inputs, actions, and expected observable results mapped directly to Acceptance Criteria (AC-01 through AC-34).

---

## 1. Test Matrix Summary

| Test ID | AC Link | Level | Target Feature | Description / Observable Outcome |
|---|---|---|---|---|
| **TEST-01** | AC-01 | API Integration | F-01 Auth | Valid credentials return JWT token and user profile/role |
| **TEST-02** | AC-02 | API Integration | F-01 Auth | Invalid email/password returns 401 with generic error |
| **TEST-03** | AC-03 | API Integration | F-01 Auth | Token added to RevokedToken table on logout; subsequent use returns 401 |
| **TEST-04** | AC-04 | API Integration | F-01 Auth | `GET /api/auth/me` returns identity/role derived from validated token |
| **TEST-05** | AC-05 | API Integration | F-01 Auth | Expired JWT token is rejected with 401 |
| **TEST-06** | AC-06 | DB Integration | F-01 Auth | Passwords stored in DB as bcrypt hashes; no plaintext stored |
| **TEST-07** | AC-07 | API Integration | F-02 Security | Requests to protected endpoints without token return 401 |
| **TEST-08** | AC-08 | API Integration | F-02 Security | Respondent calling Owner endpoints returns 403 Forbidden |
| **TEST-09** | AC-09 | API Integration | F-02 Security | Owner B accessing Owner A's surveys/summary returns 404 or 403 |
| **TEST-10** | AC-10 | API Integration | F-02 Security | Respondent B requesting Respondent A's submission returns 404/403 |
| **TEST-11** | AC-11 | API/DB Integration | F-03 Create Draft | Valid survey draft created with questions and persisted in DB |
| **TEST-12** | AC-12 | Unit + API | F-03 Create Draft | Rejection of invalid titles, >30 questions, or invalid single-choice options (<2 or >10 or duplicate labels) |
| **TEST-13** | AC-13 | API/DB Integration | F-04 Publish | Valid draft successfully transitions to `PUBLISHED` status |
| **TEST-14** | AC-14 | Unit + API | F-04 Publish | Publishing survey without questions is rejected; status remains `DRAFT` |
| **TEST-15** | AC-15 | Unit + API | F-04 Publish | Invalid transitions (re-publishing Published or Closed survey) return 400 |
| **TEST-16** | AC-16 | API Integration | F-05 Browse | Respondent list endpoint returns only `PUBLISHED` surveys |
| **TEST-17** | AC-17 | API Integration | F-05 Browse | Respondent fetching a `DRAFT` survey receives 404/403 |
| **TEST-18** | AC-18 | API/DB Integration | F-06 Submit | Valid submission stored atomically in DB with response and answer records |
| **TEST-19** | AC-19 | API/DB Integration | F-06 Submit | Second submission by same respondent to same survey rejected (409 Conflict) |
| **TEST-20** | AC-20 | Concurrency Integration | F-06 Submit | 10 concurrent submission requests by same respondent result in exactly 1 stored record |
| **TEST-21** | AC-21 | API Integration | F-06 Submit | Submissions to `DRAFT` or `CLOSED` surveys rejected (400 Bad Request) |
| **TEST-22** | AC-22 | Unit + API | F-06 Submit | Validation rejection: missing required question, rating out of 1-5, invalid option ID, text > 500 chars |
| **TEST-23** | AC-23 | API Integration | F-02 Security | Survey Owner calling Respondent-only endpoints (submit, browse) returns 403 |
| **TEST-24** | AC-24 | API/DB Integration | F-06 Submit | Identified response is explicitly stored with `respondentId` and responseMode `IDENTIFIED` |
| **TEST-25** | AC-25 | UI/E2E + API | F-07 Confirmation | After submission, confirmation screen displays and submitted answers can be retrieved |
| **TEST-26** | AC-26 | Unit + API | F-08 Summary | Aggregate summary calculations (counts, percentages, average ratings) match expected calculations |
| **TEST-27** | AC-27 | Unit + API | F-08 Summary | Survey with zero responses displays zero counts without errors |
| **TEST-28** | AC-28 | Integration (Restart) | F-09 Persistence | Data persists and is readable after application / container restart |
| **TEST-29** | AC-29 | Setup / Automation | F-09 Setup | Fresh clone to passing test suite in $\le$ 10 documented commands |
| **TEST-30** | AC-30 | Security / Review | F-09 Setup | Secret scan passes; `.env.example` documents all required keys |
| **TEST-31** | AC-31 | API Integration | F-10 Error Handling | Errors return uniform JSON structure `{ "error": { "code", "message", "details" } }` without stack trace |
| **TEST-32** | AC-32 | Full E2E | All Sprint 1 | End-to-end critical journey: Owner creates & publishes $\rightarrow$ Respondent answers $\rightarrow$ Owner reviews summary $\rightarrow$ Owner closes $\rightarrow$ late submission rejected |
| **TEST-33** | AC-33 | API/DB Integration | F-12 Close Survey | Owner closes survey: status becomes `CLOSED`, closedAt set, subsequent responses rejected |
| **TEST-34** | AC-34 | Unit + API | F-12 Close Survey | Closing by non-owner rejected (403/404); closing a Draft or Closed survey rejected (400) |

---

## 2. Detailed Test Specifications

### TEST-01: Valid Authentication (AC-01)
- **Preconditions:** Seeded user exists in database (`email: "owner1@example.test"`, `password: "Pass1234!"`).
- **Action:** `POST /api/auth/login` with body `{ "email": "owner1@example.test", "password": "Pass1234!" }`.
- **Expected Result:** HTTP 200, response body contains `token` (valid JWT) and `user: { id, email, role: "SURVEY_OWNER", name }`.

### TEST-02: Invalid Authentication (AC-02)
- **Preconditions:** None.
- **Action:** `POST /api/auth/login` with wrong password or non-existent email.
- **Expected Result:** HTTP 401 Unauthorized, generic error message `"Invalid email or password"`.

### TEST-03: Logout & Token Invalidation (AC-03)
- **Preconditions:** Authenticated user with valid JWT token `T1`.
- **Action:** 
  1. `POST /api/auth/logout` with Bearer header `T1`.
  2. Call `GET /api/auth/me` with Bearer header `T1`.
- **Expected Result:**
  1. HTTP 200 from logout, JTI recorded in `RevokedToken`.
  2. HTTP 401 Unauthorized from `GET /api/auth/me`.

### TEST-08: Cross-Role Boundary - Respondent accessing Owner Endpoints (AC-08)
- **Preconditions:** User logged in as `RESPONDENT`.
- **Action:** `POST /api/surveys` with valid survey creation payload.
- **Expected Result:** HTTP 403 Forbidden with error code `FORBIDDEN_ROLE`. No survey created.

### TEST-09: Cross-User Record Boundary - Owner Isolation (AC-09)
- **Preconditions:** Owner 1 owns Survey `S1`. Owner 2 logs in.
- **Action:** Owner 2 issues `GET /api/surveys/S1/summary` and `POST /api/surveys/S1/close`.
- **Expected Result:** HTTP 404 Not Found (or 403 Forbidden). No data leaked, survey status unchanged.

### TEST-19: Duplicate Response Prevention (AC-19)
- **Preconditions:** Published Survey `S1`. Respondent `R1` has already submitted a response.
- **Action:** Respondent `R1` submits another response to `S1`.
- **Expected Result:** HTTP 409 Conflict with error code `DUPLICATE_RESPONSE`. Exactly one response record exists in the database.

### TEST-20: Concurrency Race Condition Test (AC-20, NFR-05)
- **Preconditions:** Published Survey `S1`. Respondent `R1` has not submitted yet.
- **Action:** Send 10 simultaneous asynchronous HTTP requests `POST /api/surveys/S1/responses` from Respondent `R1`.
- **Expected Result:** Exactly 1 request succeeds (HTTP 201), 9 requests fail with HTTP 409 Conflict. Exactly 1 response is persisted in the database.

### TEST-32: Full Critical Domain Journey E2E (AC-32)
- **Preconditions:** Clean test database with seeded users.
- **Action Flow:**
  1. Survey Owner logs in via UI.
  2. Owner creates a new draft survey with 3 questions (Single Choice, Rating, Short Text).
  3. Owner publishes the survey. Status transitions to `PUBLISHED`.
  4. Respondent logs in via UI.
  5. Respondent sees published survey, opens it, and fills in valid answers.
  6. Respondent submits form, sees confirmation page, and checks their own submission.
  7. Respondent attempts to submit again; system denies submission.
  8. Owner views survey summary; verifies total response count is 1 and response values match.
  9. Owner clicks Close Survey. Status transitions to `CLOSED`.
  10. Another respondent attempts to submit; system rejects because survey is closed.
- **Expected Result:** All UI steps succeed smoothly; transitions and rejection alerts display appropriately.
