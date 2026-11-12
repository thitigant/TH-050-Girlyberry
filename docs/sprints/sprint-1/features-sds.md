# Sprint 1 Feature Engineering Contracts (Feature SDS)

**Project:** Review, Feedback, and Survey System (Theme 10)  
**Deliverable:** Deliverable 1 (Part E)  
**Status:** Baseline Specification before Implementation  

This document details the functional specifications, API contracts, input validation schemas, database transactions, and error definitions for all Sprint 1 features: **F-01 through F-10 and F-12**.

---

## 1. F-01 & F-02: Authentication, Session & Access Control

### 1.1 Requirements Covered
- `FR-01`, `FR-02`, `FR-03`, `NFR-01`, `NFR-02`, `NFR-03`, `NFR-04`
- `BR-06`, `BR-08`, `BR-09` (withdrawn / handled by role matrix)

### 1.2 Endpoints
- `POST /api/auth/login`: Authenticate email/password.
  - **Request Body:** `{ "email": string, "password": string }`
  - **Success Response (200):**
    ```json
    {
      "token": "eyJhbGciOi...",
      "user": {
        "id": "uuid",
        "email": "owner1@example.test",
        "name": "Prof. Smith",
        "role": "SURVEY_OWNER"
      }
    }
    ```
  - **Error (401):** `{ "error": { "code": "INVALID_CREDENTIALS", "message": "Invalid email or password" } }`
- `POST /api/auth/logout`: Invalidate current token by inserting its `jti` into `RevokedToken`.
- `GET /api/auth/me`: Validate JWT and return current user info.

### 1.3 Authorization Guards
- `requireAuth`: Verifies JWT signature and checks `RevokedToken` table. Returns 401 if missing, invalid, expired, or revoked.
- `requireRole(role)`: Rejects requests with 403 Forbidden (`FORBIDDEN_ROLE`) if `user.role` does not match.

---

## 2. F-03: Create Draft Survey

### 2.1 Requirements Covered
- `FR-04`, `FR-05`, `BR-03` (Definition limits: CP-03), `AC-11`, `AC-12`

### 2.2 Endpoints
- `POST /api/surveys`: Create new draft survey (Role: `SURVEY_OWNER`).
  - **Request Body:**
    ```json
    {
      "title": "Course Evaluation 2026",
      "description": "Please provide your feedback",
      "questions": [
        {
          "displayOrder": 1,
          "type": "SINGLE_CHOICE",
          "text": "How was the course pace?",
          "isRequired": true,
          "options": ["Too slow", "Just right", "Too fast"]
        },
        {
          "displayOrder": 2,
          "type": "RATING",
          "text": "Rate overall teaching quality",
          "isRequired": true
        },
        {
          "displayOrder": 3,
          "type": "SHORT_TEXT",
          "text": "Any additional suggestions?",
          "isRequired": false
        }
      ]
    }
    ```
  - **Validation Rules:**
    - `title`: 1 to 150 characters (trimmed).
    - `questions`: Array length 1 to 30.
    - `displayOrder`: Unique sequence per survey.
    - If `type === "SINGLE_CHOICE"`: `options` must contain 2 to 10 unique, non-empty strings.
    - If `type === "RATING"`: scale is strictly 1 to 5 (no options).
    - `responseMode`: Always `IDENTIFIED` in Sprint 1.
  - **Success Response (201):** Returns complete survey entity with `status: "DRAFT"`.
  - **Error (400):** `{ "error": { "code": "VALIDATION_ERROR", "message": "...", "details": [...] } }`

---

## 3. F-04 & F-12: Survey Lifecycle (Publish & Close)

### 3.1 Requirements Covered
- `FR-07`, `FR-08`, `BR-02`, `BR-03`, `BR-04`, `AC-13`, `AC-14`, `AC-15`, `AC-33`, `AC-34`

### 3.2 State Transitions
- `DRAFT` $\rightarrow$ `PUBLISHED` (via `POST /api/surveys/:id/publish`)
  - Guard: Must be owner of survey. Survey must have at least 1 question (`BR-03`). Current status must be `DRAFT`.
- `PUBLISHED` $\rightarrow$ `CLOSED` (via `POST /api/surveys/:id/close`)
  - Guard: Must be owner of survey. Current status must be `PUBLISHED`.
- Invalid Transitions: Re-publishing a Published or Closed survey, or closing a Draft or Closed survey returns 400 Bad Request (`INVALID_STATE_TRANSITION`).

---

## 4. F-05: Browse & Open Surveys (Respondent)

### 4.1 Requirements Covered
- `FR-09`, `AC-16`, `AC-17`, `AC-23`

### 4.2 Endpoints
- `GET /api/surveys/active`: Lists surveys where `status = 'PUBLISHED'` (Role: `RESPONDENT`).
  - Returns `[{ id, title, description, responseMode, publishedAt }]`.
- `GET /api/surveys/:id/form`: Returns survey and questions for answering.
  - Returns 404 if survey does not exist or `status !== 'PUBLISHED'`.

---

## 5. F-06 & F-07: Submit Response & Confirmation

### 5.1 Requirements Covered
- `FR-10`, `FR-11`, `BR-01`, `BR-02`, `BR-07`, `BR-08`, `BR-10`, `NFR-05`
- `AC-18`, `AC-19`, `AC-20`, `AC-21`, `AC-22`, `AC-24`, `AC-25`

### 5.2 Endpoints
- `POST /api/surveys/:id/responses`: Submit answers (Role: `RESPONDENT`).
  - **Request Body:**
    ```json
    {
      "answers": [
        { "questionId": "uuid-q1", "selectedOptionId": "uuid-opt2" },
        { "questionId": "uuid-q2", "ratingValue": 5 },
        { "questionId": "uuid-q3", "textValue": "Great class!" }
      ]
    }
    ```
  - **Domain Validation & Integrity Rules:**
    1. Survey must be `PUBLISHED` (returns 400 if `DRAFT` or `CLOSED`).
    2. Check duplicate submission: User must not have an existing response for this survey (`BR-01`). Enforced via database constraint `UNIQUE(surveyId, respondentId)`.
    3. Required questions must be answered.
    4. Rating values must be integers between 1 and 5.
    5. Text answers must not exceed 500 characters.
    6. All `questionId`s and `selectedOptionId`s must belong to this specific survey.
  - **Database Transaction:**
    - `Response` record created linked to `respondentId`.
    - `Answer` records created atomically.
  - **Error (409 Conflict):** `{ "error": { "code": "DUPLICATE_RESPONSE", "message": "You have already responded to this survey" } }`
- `GET /api/surveys/:id/my-response`: Respondent retrieves their own submitted response and answers (Role: `RESPONDENT`).
  - Enforces `BR-08`: User can only view their own submission.

---

## 6. F-08: Aggregate Summary

### 6.1 Requirements Covered
- `FR-12`, `BR-06`, `BR-14`, `AC-26`, `AC-27`

### 6.2 Endpoints
- `GET /api/surveys/:id/summary`: Retrieve aggregate survey results (Role: `SURVEY_OWNER`).
  - **Guard:** Requester must be the `ownerId` of the survey.
  - **Response Payload:**
    ```json
    {
      "surveyId": "uuid",
      "title": "Course Evaluation 2026",
      "status": "PUBLISHED",
      "totalResponses": 1,
      "questions": [
        {
          "questionId": "uuid-q1",
          "text": "How was the course pace?",
          "type": "SINGLE_CHOICE",
          "totalAnswers": 1,
          "options": [
            { "optionId": "uuid-opt1", "label": "Too slow", "count": 0, "percentage": 0.0 },
            { "optionId": "uuid-opt2", "label": "Just right", "count": 1, "percentage": 100.0 },
            { "optionId": "uuid-opt3", "label": "Too fast", "count": 0, "percentage": 0.0 }
          ]
        },
        {
          "questionId": "uuid-q2",
          "text": "Rate overall teaching quality",
          "type": "RATING",
          "totalAnswers": 1,
          "averageRating": 5.0,
          "distribution": { "1": 0, "2": 0, "3": 0, "4": 0, "5": 1 }
        },
        {
          "questionId": "uuid-q3",
          "text": "Any additional suggestions?",
          "type": "SHORT_TEXT",
          "totalAnswers": 1,
          "textAnswers": ["Great class!"]
        }
      ]
    }
    ```
  - If `totalResponses === 0`: Returns 0 counts, 0.0 percentages, and null/empty distributions without throwing errors (`AC-27`).

