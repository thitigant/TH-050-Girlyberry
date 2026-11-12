# System-Level Software Design Specification (System SDS)

**Project:** Review, Feedback, and Survey System (Theme 10)
**Linked documents:** `docs/srs.md`, `docs/features.md`, `docs/traceability.md`, `docs/sprints/plan.md`
**Document version:** 0.3 (revised 2026-11-11: CP-02, CP-03) | **Team:** Jinjuta Nunnarumit (67070505210) / Thitigant Surayotin (67070505214)

> **[Proposed]** marks a design decision made by the drafter that both students must confirm against the actual implementation before release. Package versions below were taken from the Lab 4 manifests; re-check them against `package.json` before submission. When the implementation differs from this document, update the document and record the change.

---

## 1. Design overview

The product is a new full-stack survey system. It reuses the engineering stack and practices of the team's TokTickIT Lab 4 project, but not its Ticket domain model. The Lab 4 Prisma schema models tickets; the survey schema in Section 3 replaces it through a new migration baseline. **[Proposed]** The project uses a new repository; only reusable infrastructure (authentication middleware, layout, test setup, Docker pattern) is copied from Lab 4, and that reuse is listed in the AI/tool declaration so both students can explain it.

### 1.1 Technology baseline

| Layer / concern | Technology |
|---|---|
| Web UI | React 18.3.1, React DOM 18.3.1, TypeScript 5.7.2 |
| Frontend build/dev | Vite 6.0.5 |
| UI styling | Bootstrap 5.3.3 |
| API server | Node.js 20+, Express 4.21.2 |
| ORM and migrations | Prisma 5.22.0 (Prisma Client, Prisma Migrate) |
| Database | PostgreSQL |
| Authentication | jsonwebtoken 9.0.3 (JWT), bcryptjs 3.0.3 (password hashing) |
| Request validation | Zod **[Proposed]** (one schema per request body) |
| Server tests | Vitest 2.1.8, Supertest 7.0.0, against a real PostgreSQL test database |
| Client tests | Vitest 2.1.8, React Testing Library 16.1.0, jsdom 25.0.1 |
| Browser E2E | Playwright Test 1.63.0 |
| Packaging | Docker multi-stage build, `docker compose` for local development (Lab 5) |

### 1.2 Style
A **modular monolith** with three logical layers: UI (single-page application), API/application layer (one Express service), and PostgreSQL. In deployment the built UI is served by the same container as the API; the database is separate. Three layers do not require three servers.

---

## 2. Architecture

### 2.1 Logical architecture

```mermaid
flowchart LR
  subgraph Browser
    UI[React + TypeScript UI<br/>role-based screens]
  end
  subgraph App[Application container - Node.js / Express]
    R[Routes + Zod validation]
    A[Authentication middleware<br/>verify JWT, check revocation, load user]
    G[Authorization guards<br/>role + ownership]
    S[Domain services<br/>business rules + transactions]
    P[Prisma Client]
    ST[Static files<br/>built React app]
  end
  DB[(PostgreSQL<br/>constraints + durable storage)]
  UI -- "HTTPS JSON + Bearer token" --> R
  ST -. serves .-> UI
  R --> A --> G --> S --> P --> DB
```

### 2.2 Responsibilities and trust boundaries

| Component | Responsibilities | Does not do |
|---|---|---|
| **React client** | Render role-appropriate screens; immediate form validation for usability; call the API; show loading, empty, validation, forbidden, conflict and error states | Decide permissions or business rules; supply user ID or role as proof of identity |
| **Routes** | Parse request, validate shape (Zod), call a service, map results/errors to HTTP | Contain business rules |
| **Authentication middleware** | Verify JWT signature and expiry; reject revoked tokens; load the current user and reject inactive users (401) | |
| **Authorization guards** | `requireRole` (403) and ownership-scoped lookups (404) before handlers touch data | |
| **Domain services** | **All business rules** (BR-01 to BR-14): lifecycle transitions, answer validation, duplicate rule, summary calculation, transactions | HTTP concerns |
| **Prisma / PostgreSQL** | Typed queries; durable storage; **last line of enforcement**: foreign keys, unique `(surveyId, respondentId)`, CHECK constraints | |

**Trust boundary.** The browser is untrusted. The API never accepts a client-supplied user ID or role. Identity comes from the verified token; the role is read from the user record in the database on every request, so a changed role or a deactivated account takes effect immediately.

### 2.3 Where each important rule is enforced

| Rule | Primary enforcement | Backup enforcement |
|---|---|---|
| BR-01 one response per respondent per survey | Database unique constraint (decisive under concurrency) | Service pre-check for a friendly message |
| BR-02 only Published accepts responses | Service (reads status inside the transaction) | |
| BR-03 publish checks | Service | |
| BR-04 status transitions | Service transition table | DB CHECK on allowed status values |
| BR-06 / BR-08 role and ownership | Guards, and queries scoped by `ownerId` / `respondentId` | |
| BR-07 answer validation | Service, per question type | DB CHECK: exactly one answer value; rating 1 to 5; text length |
| BR-09 (withdrawn, CP-02): owners cannot answer surveys | Role guard `requireRole(RESPONDENT)` returns 403; no separate own-survey check | |
| BR-10 / BR-11 identified versus anonymous | Schema design (Section 3.6) | Service |

### 2.4 Example request flow: submit response
`POST /api/surveys/:surveyId/responses`

1. Route validates the body shape (list of answers with question ID and one value).
2. Authentication middleware resolves the user (401 otherwise); guard `requireRole(RESPONDENT)` (403 otherwise).
3. Service opens a `prisma.$transaction`; loads the survey; rejects if its status is not PUBLISHED (BR-02); validates every answer (BR-07): question belongs to the survey, option belongs to the question, rating in range, required questions answered.
4. Service inserts the response and its answers. If the unique constraint `(surveyId, respondentId)` fails, Prisma raises `P2002`, the transaction rolls back, and the API returns 409 `DUPLICATE_RESPONSE` (BR-01).
5. Commit; return 201 with the confirmation payload.

---

## 3. Data model

This is the survey-domain model; it does not describe the Lab 4 ticket schema.

### 3.1 Entity relationship diagram

```mermaid
erDiagram
  USER ||--o{ SURVEY : owns
  USER ||--o{ RESPONSE : submits
  USER ||--o{ REVOKED_TOKEN : "logged out with"
  SURVEY ||--|{ QUESTION : contains
  QUESTION ||--o{ QUESTION_OPTION : offers
  SURVEY ||--o{ RESPONSE : receives
  RESPONSE ||--|{ ANSWER : contains
  QUESTION ||--o{ ANSWER : answered_by
  QUESTION_OPTION o|--o{ ANSWER : selected_for
  SURVEY ||--o{ SURVEY_ALLOWLIST : "restricts (Sprint 2)"
  SURVEY ||--o{ ANON_PARTICIPATION : "tracks who answered (Sprint 2)"
  SURVEY ||--o{ ANON_RESPONSE : "receives (Sprint 2)"
  ANON_RESPONSE ||--|{ ANON_ANSWER : "contains (Sprint 2)"
```

`ANON_PARTICIPATION` and `ANON_RESPONSE` intentionally have **no relationship** to each other (Section 3.6).

### 3.2 Enumerations
`Role`: `RESPONDENT`, `SURVEY_OWNER`. `SurveyStatus`: `DRAFT`, `PUBLISHED`, `CLOSED`. `ResponseMode`: `IDENTIFIED`, `ANONYMOUS` (Sprint 1 creates only `IDENTIFIED`). `QuestionType`: `SINGLE_CHOICE`, `RATING`, `SHORT_TEXT` (extended in Sprint 2).

### 3.3 Sprint 1 entities

| Entity | Fields | Constraints and ownership |
|---|---|---|
| **User** | `id` (UUID), `email`, `name`, `passwordHash`, `role`, `isActive` (default true), `createdAt` | PK `id`; UNIQUE `email`; `passwordHash` is a bcrypt hash only |
| **RevokedToken** | `jti` (text), `userId`, `expiresAt`, `revokedAt` | PK `jti`; FK `userId` to User; rows older than `expiresAt` can be purged |
| **Survey** | `id`, `ownerId`, `title`, `description`, `status` (default DRAFT), `responseMode`, `publishedAt`, `closedAt`, `closesAt` (Sprint 2), `createdAt`, `updatedAt` | FK `ownerId` to User (**ownership link**); CHECK title length 1 to 150; index on `ownerId` and `status` |
| **Question** | `id`, `surveyId`, `displayOrder`, `type`, `text`, `isRequired` (default true) | FK `surveyId` to Survey (cascade on delete of a Draft); UNIQUE `(surveyId, displayOrder)`; index on `surveyId` |
| **QuestionOption** | `id`, `questionId`, `displayOrder`, `label` | FK `questionId` to Question; UNIQUE `(questionId, displayOrder)` and `(questionId, label)`; used only by `SINGLE_CHOICE` |
| **Response** | `id`, `surveyId`, `respondentId`, `submittedAt` | FKs to Survey and User (**ownership link**); **UNIQUE `(surveyId, respondentId)`** implements BR-01; indexes on `surveyId` and `respondentId` |
| **Answer** | `id`, `responseId`, `questionId`, `selectedOptionId` (nullable), `ratingValue` (nullable), `textValue` (nullable) | FKs to Response (cascade), Question, QuestionOption; UNIQUE `(responseId, questionId)`; CHECK exactly one of the three value fields is set; CHECK rating between 1 and 5; CHECK text length at most 500 |

Prisma declares models, enums, unique constraints, foreign keys and indexes. Constraints Prisma cannot declare (all CHECK constraints above) are added as raw SQL in the same migration that creates the table. The service layer additionally validates what a database constraint cannot express across rows: the answer's question belongs to the response's survey, the selected option belongs to that question, the answer value matches the question type, required questions are answered, a survey has at most 30 questions and at most 10 distinct options per single-choice question, and a published survey has valid questions (BR-03). Title length (1 to 150) is also a database CHECK and option-label uniqueness is also a database UNIQUE constraint (AC-12). Rating questions have no scale fields: the 1 to 5 scale is a fixed constant (CP-03).

### 3.4 Planned Sprint 2 and Sprint 3 entities (outline)
- `SurveyAllowlist(surveyId, respondentId)`, composite PK (FR-14, BR-13).
- Additional question types extend `QuestionType` and add settings and a selection table for multiple choice (FR-16).
- Sprint 3 export and analysis are queries over existing tables; no new tables are expected.

### 3.5 Database setup, migrations and seed data
- **Setup:** PostgreSQL runs locally in Docker (`docker compose up -d db`); the connection string comes from `DATABASE_URL`.
- **Migrations:** Prisma Migrate files in `prisma/migrations/`, committed to Git. Developers use `npx prisma migrate dev`; the test environment, CI and production use `npx prisma migrate deploy`. Prisma has no automatic down migration, so recovery is documented as: locally `npx prisma migrate reset`; in a shared environment, a corrective forward migration after a database backup.
- **Seed:** `npx prisma db seed` runs `prisma/seed.ts`, which upserts on unique keys, so it is safe to run repeatedly. It creates only **synthetic** data:
  - 2 Survey Owners (`owner1@example.test`, `owner2@example.test`) and 5 Respondents (`respondent1@example.test` to `respondent5@example.test`).
  - For `owner1`: one Published survey with one question of each type (main demo), one Draft survey, and one Closed survey with a few responses (summary and Closed-rejection tests).
  - For `owner2`: one Published survey (cross-owner tests).
  - The password for every seeded account comes from the `SEED_DEFAULT_PASSWORD` environment variable; the seed script fails if it is unset. No real password is committed. Local test accounts are shared through the private course handoff or by the documented local seed procedure.
- **Test database:** a separate database (`DATABASE_URL` in the test environment) is reset with `npx prisma migrate reset --force` before each integration test run and re-seeded.

### 3.6 Anonymous-mode privacy design (FR-17, FR-18, BR-10 to BR-12, NFR-07; implemented in Sprint 2)

**Threat model.** Protected against: the survey owner, other users, API consumers, and CSV exports. Out of scope (disclosed as a limitation): a database administrator with raw storage access and low-level metadata such as transaction IDs or write-ahead logs.

**Design.**
1. `AnonParticipation(surveyId, userId)`, composite primary key, records *that* a user has answered; it enforces BR-01 for anonymous surveys.
2. `AnonResponse(id UUID, surveyId, submittedOn DATE)` and `AnonAnswer(...)` hold the answers. They contain **no `userId`**, no foreign key to `AnonParticipation`, no fine-grained timestamp, no IP address and no user agent.
3. IDs are random UUIDs, never sequential, so row order cannot be matched to participation order.
4. Both inserts run in one transaction (a duplicate or failure leaves neither), but nothing stored links them.
5. Aggregates and text answers for an anonymous survey are returned only after at least 5 responses exist (BR-12); below that, only the response count is returned.
6. Owners of anonymous surveys have no endpoint returning individual responses, and the export contains aggregates only (FR-19).
7. Before answering, the respondent sees a plain statement of what is and is not recorded (FR-18). An identified survey never displays the anonymous label (BR-10).
8. Disclosed limitation: free-text answers can reveal identity if the respondent writes identifying details; the UI warns about this.

**Planned verification (Sprint 2):** a schema test asserting that no column of `AnonResponse` or `AnonAnswer` references a user; an API test asserting that anonymous payloads contain no user identifiers; a threshold test for BR-12.

---

## 4. UI structure and conventions

### 4.1 Screens and navigation by role

| Screen | Role | Purpose | Feature |
|---|---|---|---|
| Login | Unauthenticated | Sign in; generic error on failure | F-01 |
| My Surveys | Survey Owner | List own surveys with status; create new | F-03, F-04 |
| Survey Builder | Survey Owner | Title, description, questions; save Draft; Publish | F-03, F-04 |
| Survey Detail | Survey Owner | Status, Publish and Close actions, link to results | F-04, F-12 |
| Aggregate Results | Survey Owner | Total responses and per-question aggregates only | F-08 |
| Available Surveys | Respondent | Published surveys they may answer; "already answered" state | F-05 |
| Fill Survey | Respondent | Form for one survey; Submit | F-06 |
| Confirmation / My Response | Respondent | Success message and own submitted answers | F-07 |
| Error pages | All | Redirect to Login on 401; "Not allowed" (403); "Not found" (404); generic error | F-10 |

The application shell shows the user's name and role (from `GET /api/auth/me`) and a Logout button; menu items depend on role. **Hiding a menu item or button is a usability measure only; the backend enforces every operation (Section 6).**

### 4.2 Shared interaction conventions

| State | Behavior |
|---|---|
| Loading | Spinner or skeleton for requests longer than 300 ms; submit buttons show progress and are disabled during the request (the server and database still enforce duplicates) |
| Empty | Friendly message with the next action, for example "You have no surveys yet. Create your first survey." |
| Validation | Inline message next to the field naming the question and the rule broken, plus a form-level summary; the user's input is preserved after validation or network failures |
| Error | Non-technical banner with a retry action; no stack traces or raw server messages |
| Token expired | On any 401 the client clears the stored token and redirects to Login with a "session expired" notice |
| Confirmation | A successful submit navigates to the Confirmation screen and replaces the history entry so refresh does not resubmit |
| Layout | Bootstrap responsive layout, checked at 360 px, 768 px and 1366 px |
| Results | Aggregate results never show individual response rows or respondent identities (Sprint 1) |

---

## 5. API conventions

- **Base path:** `/api` (configurable). JSON bodies, UTF-8. Resource-oriented REST with plural nouns; state transitions are sub-resource actions (for example `POST /surveys/:surveyId/publish`).
- **Authentication:** bearer token in the `Authorization` header. The client never sends a user ID or role.
- **Status codes:** 200 OK; 201 Created; 204 No Content (logout); 400 malformed request; 401 not authenticated or token invalid/expired/revoked; 403 authenticated but role not allowed; **404 resource missing or not owned by the caller**; 409 conflict (duplicate response, invalid state transition); 422 field validation failure; 500 unexpected error with a generic message.
- **Ownership versus role decision:** a wrong **role** returns 403; access to another owner's survey or another respondent's response returns **404**, which does not reveal that the record exists. Both are covered by negative tests (NFR-02).
- **Error shape (all errors):**
  ```json
  {
    "error": {
      "code": "VALIDATION_FAILED",
      "message": "One or more answers are invalid.",
      "details": [{ "field": "answers[1].value", "rule": "RATING_OUT_OF_RANGE" }]
    }
  }
  ```
  Stable codes include `UNAUTHENTICATED`, `FORBIDDEN`, `NOT_FOUND`, `VALIDATION_FAILED`, `DUPLICATE_RESPONSE`, `SURVEY_NOT_PUBLISHED`, `SURVEY_CLOSED`, `INVALID_TRANSITION`.
- **Safe errors:** unexpected errors return a generic 500 body with a correlation ID; details stay in server logs. Responses for 401, 403 and 404 never contain survey, response or user data, and never expose stack traces, SQL, tokens or password hashes.
- **Validation:** every body, path and query parameter is validated before reaching a service; services re-check domain rules.
- **Pagination:** list endpoints accept `limit` (default 20, maximum 100) and `offset`.
- **Retry safety:** a repeated `POST .../responses` is made safe by the unique constraint, not by client behavior.

### 5.1 Endpoint inventory (detailed contracts are in the feature contracts)

| Method and path | Access | Purpose | Feature | Sprint |
|---|---|---|---|---|
| POST `/api/auth/login` | Public | Authenticate; return token | F-01 | 1 |
| POST `/api/auth/logout` | Authenticated | Revoke the token | F-01 | 1 |
| GET `/api/auth/me` | Authenticated | Current user, safe fields only | F-01 | 1 |
| POST `/api/surveys` | Survey Owner | Create own Draft with questions | F-03 | 1 |
| GET `/api/surveys` | Survey Owner | List own surveys | F-03 | 1 |
| GET `/api/surveys/:surveyId` | Owning Survey Owner | Own survey detail | F-03 | 1 |
| POST `/api/surveys/:surveyId/publish` | Owning Survey Owner | Publish valid Draft | F-04 | 1 |
| POST `/api/surveys/:surveyId/close` | Owning Survey Owner | Close own Published survey | F-12 | 1 |
| GET `/api/surveys/:surveyId/summary` | Owning Survey Owner | Aggregate summary only | F-08 | 1 |
| GET `/api/available-surveys` | Respondent | Published surveys the caller may answer | F-05 | 1 |
| GET `/api/available-surveys/:surveyId` | Respondent | Questions of one answerable survey | F-05 | 1 |
| POST `/api/surveys/:surveyId/responses` | Respondent | Submit identified response | F-06 | 1 |
| GET `/api/surveys/:surveyId/responses/me` | Respondent | Own response and confirmation | F-07 | 1 |
| PATCH `/api/surveys/:surveyId` and question edit endpoints | Owning Survey Owner | Edit Draft | F-11 | 2 |
| PUT `/api/surveys/:surveyId/allowlist` | Owning Survey Owner | Eligibility | F-13 | 2 |
| GET `/api/surveys/:surveyId/responses` | Owning Survey Owner | Individual responses, identified surveys only | F-17 | 2 |
| GET `/api/surveys/:surveyId/export.csv` | Owning Survey Owner | Export | F-19 | 3 |

This list is also the input to the NFR-01 test: every protected endpoint must return 401 without credentials.

---

## 6. Roles, permissions and ownership

Exactly one role per account: `SURVEY_OWNER` or `RESPONDENT`. Unauthenticated callers are "Anonymous". Legend: Yes = allowed; Own = only records the caller owns; Self = only the caller's own record; No = rejected (status in parentheses).

| Operation | Anonymous | Respondent | Survey Owner |
|---|---|---|---|
| Login | Yes | Yes | Yes |
| Logout, current user | No (401) | Yes | Yes |
| Create survey | No (401) | No (403) | Yes |
| List / view survey detail (management) | No (401) | No (403) | Own (another owner's survey: 404) |
| Edit Draft (Sprint 2) | No (401) | No (403) | Own |
| Publish survey | No (401) | No (403) | Own |
| Close survey | No (401) | No (403) | Own |
| Manage allowlist (Sprint 2) | No (401) | No (403) | Own |
| View aggregate summary | No (401) | No (403) | Own |
| View individual responses (Sprint 2, identified surveys) | No (401) | No (403) | Own, identified surveys only |
| Export results (Sprint 3) | No (401) | No (403) | Own |
| List / open answerable surveys | No (401) | Yes (Published; on the allowlist if one exists) | No (403) |
| Submit response | No (401) | Yes, once per survey, only when Published | No (403): the Owner role cannot submit (BR-09 withdrawn, CP-02) |
| View a response | No (401) | Self (another respondent's response: 404) | See "individual responses" row |

**Enforcement.** `authenticate` runs on every route except login (401). `requireRole(...)` runs before data access (403). Ownership is enforced inside queries (`where: { id, ownerId }`, `where: { surveyId, respondentId }`) so records of other users cannot be returned even by a handler bug; no row means 404. Every "No" cell has at least one automated negative test (AC-07 to AC-10 and AC-23).

---

## 7. Authentication and credential handling

| Aspect | Design |
|---|---|
| Accounts | Seeded accounts only in the baseline; login by email and password |
| Password storage | `passwordHash` only, bcryptjs with cost 12 (`BCRYPT_COST`); no plaintext in the database, logs or repository (NFR-03) |
| Login | Find the active user by email and compare with bcrypt. For an unknown email a dummy hash comparison runs to keep timing similar. Any failure returns 401 `UNAUTHENTICATED` with a generic message that does not reveal which field was wrong |
| Token | Signed JWT (HS256) with `sub` (user ID), `jti` (random unique ID), `iat` and `exp`. **Expiry: 60 minutes** (`JWT_EXPIRES_IN`), no refresh token **[Proposed]** |
| Token storage | The client keeps the token in `sessionStorage` (cleared when the tab closes) and sends it as `Authorization: Bearer`. Disclosed risk: script injection could read it. Mitigations: React escaping, no `dangerouslySetInnerHTML`, short expiry, revocation on logout, and a restrictive Content-Security-Policy header **[Proposed]**. Cross-site request forgery does not apply because the token is not sent automatically by the browser |
| Request authentication | Middleware verifies signature and expiry, rejects a `jti` found in `RevokedToken`, loads the user and rejects inactive users. The role comes from the database record, not from the token |
| Current user | `GET /api/auth/me` returns `id`, `email`, `name` and `role`; never `passwordHash` |
| Logout | `POST /api/auth/logout` inserts the token's `jti` and expiry into `RevokedToken`; the same token is rejected afterwards (AC-03). The client also deletes its copy |
| Expiry | An expired token is rejected (AC-05). Revoked rows past their `expiresAt` are purged at startup or by a scheduled task |
| Brute force | Planned hardening in Sprint 3: limit login attempts per IP and per email (5 failures per minute) |

Logout therefore matches the chosen token strategy: it is server-side revocation, not only clearing the client copy.

---

## 8. Configuration and delivery design

### 8.1 Environment variables

| Variable | Purpose | Example (no real secrets) |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://survey:CHANGE_ME@localhost:5432/survey` |
| `JWT_SECRET` | JWT signing secret; never committed | `CHANGE_ME_LONG_RANDOM_VALUE` |
| `JWT_EXPIRES_IN` | Access-token lifetime | `60m` |
| `BCRYPT_COST` | Hash cost | `12` |
| `PORT` | API port | `8080` |
| `CLIENT_ORIGIN` | Allowed frontend origin (CORS) | `http://localhost:5173` |
| `NODE_ENV` | Runtime mode | `development` |
| `SEED_DEFAULT_PASSWORD` | Password for seeded demo accounts | set locally, not committed |
| `VITE_API_BASE_URL` (client) | API base URL; contains no secrets | `http://localhost:8080/api` |

`.env` files are in `.gitignore`; a committed `.env.example` lists every variable with placeholders only. The server validates required variables at startup and fails with a clear message if `JWT_SECRET` or `DATABASE_URL` is missing.

### 8.2 Secret handling
No real secrets in Git, Docker images, the PDF or client code; the browser bundle contains only public configuration. Locally, secrets come from `.env`; in the cloud, from Google Secret Manager injected as environment variables. A secret scan (for example `gitleaks`) is run on the repository and later in CI (NFR-10). A committed secret is rotated, not only deleted.

### 8.3 Local setup summary (target: 10 commands or fewer, NFR-09)
```
git clone <repo-url> && cd <repo>
cp .env.example .env            # then set JWT_SECRET and SEED_DEFAULT_PASSWORD
docker compose up -d db
npm ci                          # in the server and client projects
npx prisma migrate deploy       # npx prisma migrate dev while developing
npx prisma db seed              # idempotent synthetic seed
npm test
npm run dev
```

### 8.4 Planned GCP deployment (finalized and verified in Lab 5) **[Proposed]**

| Component | Choice | Notes |
|---|---|---|
| Image registry | Artifact Registry | Stores the application image |
| Compute | Cloud Run, one service serving API and UI | Stateless; HTTPS URL |
| Database | Cloud SQL for PostgreSQL | Durable storage; data survives restarts and redeployments (NFR-06) |
| Secrets | Secret Manager | `DATABASE_URL`, `JWT_SECRET` |
| Pipeline | GitHub Actions: PR runs build and tests as a required check; merge to `main` builds the image, runs `npx prisma migrate deploy`, then deploys | Gate and release procedure are Lab 5 deliverables |

No cloud deployment is claimed by this design baseline; exact services and access steps follow the Lab 5 instructions, and changes will be recorded.

### 8.5 Docker design (built in Lab 5)
Multi-stage `Dockerfile`: build the React app; install production server dependencies and generate Prisma Client; copy the build into the final image, which runs as a non-root user and exposes `PORT`. `docker-compose.yml` runs the application and PostgreSQL locally with a named volume for database data.

---

## 9. Security, privacy and failure handling

- All authorization decisions happen on the server; queries are scoped by the authenticated user's ID.
- Owner summary endpoints return aggregates only, never individual response rows (Sprint 1).
- Validate question ownership and option membership to prevent cross-survey answer injection.
- Create a response and its answers in one transaction so partial submissions are never stored.
- Map Prisma `P2002` on `(surveyId, respondentId)` to a stable 409.
- Prisma Client queries are parameterized; any `$queryRaw` uses tagged-template parameters. React escapes output (NFR-11).
- Logs never contain passwords, tokens or answer contents; each request carries a correlation ID.
- Use synthetic data in development and in assessment demonstrations.
- Anonymous mode follows Section 3.6 and is verified before release.

---

## 10. System verification strategy

| Test layer | Responsibility | Tools |
|---|---|---|
| Unit | Lifecycle transitions, answer validation, aggregation | Vitest |
| API / database integration | Authentication, authorization, ownership, persistence, unique constraint, transactions, concurrent duplicates | Vitest + Supertest on a real PostgreSQL test database |
| UI component | Form validation, role-based navigation, loading/empty/error states | Vitest + React Testing Library + jsdom |
| Browser E2E | Owner creates, publishes and closes; Respondent submits; Owner views summary; rejected cases | Playwright Test |
| Manual (supplementary) | Responsive and keyboard checks, fresh-clone setup | Recorded, never a substitute for automated coverage |

Critical tests include negative and boundary cases. Results identify the tested commit and distinguish automated tests from manual checks. Requirement-to-test mapping is in `docs/traceability.md`.

---

## 11. Design decisions

| ID | Decision | Status |
|---|---|---|
| SD-01 | New repository; infrastructure copied from Lab 4, survey schema is new | Proposed; confirm with both students |
| SD-02 | JWT access token (60 min) with a `RevokedToken` table so logout invalidates it | Decided by team 2026-11-11; confirm implementation |
| SD-03 | Token stored in `sessionStorage`, sent as bearer header; risk and mitigations documented | Proposed; confirm it matches the Lab 4 client |
| SD-04 | Cross-owner and cross-respondent access returns 404; wrong role returns 403 | Proposed |
| SD-05 | Respondents use separate `available-surveys` endpoints; owner management uses `surveys` | Proposed |
| SD-06 | Rating questions (1 to 5) are included in Sprint 1 with single choice and short text | Decided by team 2026-11-11 |
| SD-07 | Manual close (F-12) is in Sprint 1 (CP-01) | Decided by team 2026-11-11; TA confirmation pending |
| SD-08 | Owners see aggregates only; individual identified answers arrive in Sprint 2 (F-17) | Proposed |
| SD-09 | Published surveys cannot be reopened or edited (BR-05, BR-04) | Proposed |
| SD-10 | BR-09 withdrawn: Owners cannot answer any survey because roles are exclusive and submit is Respondent-only (CP-02) | Applied 2026-11-11; confirm with both students |
| SD-11 | Survey definition limits: title 1 to 150 characters, at most 30 questions, 2 to 10 distinct options; rating scale fixed at 1 to 5 (CP-03) | Applied 2026-11-11; confirm with both students |

---

## 12. Traceability to requirements and features

| SDS section | Requirements / features |
|---|---|
| 2, 3.3 | BR-01, BR-02, BR-03, BR-04, BR-07; F-03, F-04, F-06, F-12 |
| 3.5 | NFR-06, NFR-09, NFR-10; F-09 |
| 3.6 | FR-17, FR-18, BR-10 to BR-12, NFR-07; F-16 |
| 4 | FR-21, NFR-12; F-10, F-18 |
| 5 | FR-21, NFR-01, NFR-02; F-10 |
| 6 | BR-06, BR-08, NFR-01, NFR-02; F-02 (BR-09 withdrawn, CP-02) |
| 7 | FR-01 to FR-03, NFR-03, NFR-04; F-01 |
| 8 | NFR-09, NFR-10; F-09, Lab 5 |