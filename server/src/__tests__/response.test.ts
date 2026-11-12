import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../index.js';
import prisma from '../lib/prisma.js';
import { getRespondentToken, getOwnerToken } from './helpers.js';

describe('Respondent Endpoints & Submission (F-05, F-06, F-07: TEST-16 to TEST-22, TEST-24)', () => {
  // TEST-16: Browse Published Surveys Only (AC-16)
  it('TEST-16: Respondent list endpoint returns only PUBLISHED surveys', async () => {
    const respondentToken = await getRespondentToken(1);

    const res = await request(app)
      .get('/api/available-surveys')
      .set('Authorization', `Bearer ${respondentToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);

    for (const survey of res.body) {
      expect(survey).not.toHaveProperty('status'); // Should not leak status if public or should be PUBLISHED
      // Verify in DB that each returned survey is PUBLISHED
      const dbSurvey = await prisma.survey.findUnique({ where: { id: survey.id } });
      expect(dbSurvey!.status).toBe('PUBLISHED');
    }
  });

  // TEST-17: Draft Surveys Not Accessible to Respondent (AC-17)
  it('TEST-17: Respondent fetching a DRAFT survey receives 404', async () => {
    const draftSurvey = await prisma.survey.findFirst({ where: { status: 'DRAFT' } });
    expect(draftSurvey).not.toBeNull();

    const respondentToken = await getRespondentToken(1);

    const res = await request(app)
      .get(`/api/available-surveys/${draftSurvey!.id}`)
      .set('Authorization', `Bearer ${respondentToken}`);

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  // TEST-18: Valid Submission Persistence (AC-18)
  it('TEST-18: Valid submission stored atomically in DB with response and answer records', async () => {
    const ownerToken = await getOwnerToken();

    // Create and publish a new test survey
    const createRes = await request(app)
      .post('/api/surveys')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        title: 'Submission Test Survey 1',
        questions: [
          {
            displayOrder: 1,
            type: 'SINGLE_CHOICE',
            text: 'Preferred language?',
            options: ['TypeScript', 'Python', 'Rust'],
          },
          {
            displayOrder: 2,
            type: 'RATING',
            text: 'Rate your satisfaction',
          },
          {
            displayOrder: 3,
            type: 'SHORT_TEXT',
            text: 'Feedback',
            isRequired: false,
          },
        ],
      });

    const surveyId = createRes.body.id;
    await request(app).post(`/api/surveys/${surveyId}/publish`).set('Authorization', `Bearer ${ownerToken}`);

    // Get survey details to retrieve question and option IDs
    const surveyRes = await prisma.survey.findUnique({
      where: { id: surveyId },
      include: { questions: { include: { options: true } } },
    });
    const q1 = surveyRes!.questions.find((q) => q.displayOrder === 1)!;
    const q2 = surveyRes!.questions.find((q) => q.displayOrder === 2)!;
    const q3 = surveyRes!.questions.find((q) => q.displayOrder === 3)!;

    const respondentToken = await getRespondentToken(1);

    const submitRes = await request(app)
      .post(`/api/surveys/${surveyId}/responses`)
      .set('Authorization', `Bearer ${respondentToken}`)
      .send({
        answers: [
          { questionId: q1.id, selectedOptionId: q1.options[0].id },
          { questionId: q2.id, ratingValue: 5 },
          { questionId: q3.id, textValue: 'Loving the system!' },
        ],
      });

    expect(submitRes.status).toBe(201);
    expect(submitRes.body).toHaveProperty('id');
    expect(submitRes.body.answers).toHaveLength(3);

    // Verify DB records
    const dbResponse = await prisma.response.findUnique({
      where: { id: submitRes.body.id },
      include: { answers: true },
    });
    expect(dbResponse).not.toBeNull();
    expect(dbResponse!.answers).toHaveLength(3);
  });

  // TEST-19: Duplicate Response Rejection (AC-19)
  it('TEST-19: Second submission by same respondent to same survey rejected (409 Conflict)', async () => {
    // We already submitted for respondent1 on "Submission Test Survey 1" in TEST-18, or we can use another
    const survey = await prisma.survey.findFirst({
      where: { title: 'Submission Test Survey 1' },
      include: { questions: { include: { options: true } } },
    });
    const q1 = survey!.questions.find((q) => q.displayOrder === 1)!;

    const respondentToken = await getRespondentToken(1);

    const res = await request(app)
      .post(`/api/surveys/${survey!.id}/responses`)
      .set('Authorization', `Bearer ${respondentToken}`)
      .send({
        answers: [
          { questionId: q1.id, selectedOptionId: q1.options[1].id },
        ],
      });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('DUPLICATE_RESPONSE');
  });

  // TEST-20: Concurrency Race Condition (AC-20, NFR-05)
  it('TEST-20: 10 concurrent submission requests by same respondent result in exactly 1 stored record', async () => {
    const ownerToken = await getOwnerToken();

    // Create fresh survey
    const createRes = await request(app)
      .post('/api/surveys')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        title: 'Concurrent Test Survey',
        questions: [{ displayOrder: 1, type: 'SHORT_TEXT', text: 'Concurrent note' }],
      });
    const surveyId = createRes.body.id;
    await request(app).post(`/api/surveys/${surveyId}/publish`).set('Authorization', `Bearer ${ownerToken}`);

    const q = createRes.body.questions[0];
    const respondentToken = await getRespondentToken(2);

    // Fire 10 simultaneous requests
    const promises = Array.from({ length: 10 }, () =>
      request(app)
        .post(`/api/surveys/${surveyId}/responses`)
        .set('Authorization', `Bearer ${respondentToken}`)
        .send({
          answers: [{ questionId: q.id, textValue: 'Race test' }],
        })
    );

    const results = await Promise.all(promises);

    const successCount = results.filter((r) => r.status === 201).length;
    const conflictCount = results.filter((r) => r.status === 409).length;

    expect(successCount).toBe(1);
    expect(conflictCount).toBe(9);

    // Verify in DB that exactly one record exists
    const respondent = await prisma.user.findUnique({ where: { email: 'respondent2@example.test' } });
    const countInDb = await prisma.response.count({
      where: { surveyId, respondentId: respondent!.id },
    });
    expect(countInDb).toBe(1);
  });

  // TEST-21: Rejection on Non-PUBLISHED Surveys (AC-21)
  it('TEST-21: Submissions to DRAFT or CLOSED surveys rejected (400 Bad Request)', async () => {
    const respondentToken = await getRespondentToken(3);

    // 1. Submit to DRAFT survey
    const draftSurvey = await prisma.survey.findFirst({
      where: { status: 'DRAFT' },
      include: { questions: true },
    });
    const qDraft = draftSurvey!.questions[0];

    const resDraft = await request(app)
      .post(`/api/surveys/${draftSurvey!.id}/responses`)
      .set('Authorization', `Bearer ${respondentToken}`)
      .send({
        answers: [{ questionId: qDraft.id, textValue: 'Test' }],
      });

    expect(resDraft.status).toBe(400);
    expect(resDraft.body.error.code).toBe('SURVEY_NOT_PUBLISHED');

    // 2. Submit to CLOSED survey
    const closedSurvey = await prisma.survey.findFirst({
      where: { status: 'CLOSED' },
      include: { questions: true },
    });
    const qClosed = closedSurvey!.questions[0];

    const resClosed = await request(app)
      .post(`/api/surveys/${closedSurvey!.id}/responses`)
      .set('Authorization', `Bearer ${respondentToken}`)
      .send({
        answers: [{ questionId: qClosed.id, textValue: 'Test' }],
      });

    expect(resClosed.status).toBe(400);
    expect(resClosed.body.error.code).toBe('SURVEY_CLOSED');
  });

  // TEST-22: Answer Validation Rejections (AC-22)
  it('TEST-22: Validation rejection: missing required question, rating out of 1-5, invalid option ID, text > 500 chars', async () => {
    const survey = await prisma.survey.findFirst({
      where: { title: 'Course Evaluation 2026', status: 'PUBLISHED' },
      include: { questions: { include: { options: true } } },
    });
    const qChoice = survey!.questions.find((q) => q.type === 'SINGLE_CHOICE')!;
    const qRating = survey!.questions.find((q) => q.type === 'RATING')!;
    const qText = survey!.questions.find((q) => q.type === 'SHORT_TEXT')!;

    const respondentToken = await getRespondentToken(4);

    // 1. Rating out of range (e.g. 6)
    const resBadRating = await request(app)
      .post(`/api/surveys/${survey!.id}/responses`)
      .set('Authorization', `Bearer ${respondentToken}`)
      .send({
        answers: [
          { questionId: qChoice.id, selectedOptionId: qChoice.options[0].id },
          { questionId: qRating.id, ratingValue: 6 },
        ],
      });
    expect([400, 422]).toContain(resBadRating.status);

    // 2. Invalid option ID (non-existent option)
    const resBadOption = await request(app)
      .post(`/api/surveys/${survey!.id}/responses`)
      .set('Authorization', `Bearer ${respondentToken}`)
      .send({
        answers: [
          { questionId: qChoice.id, selectedOptionId: '00000000-0000-0000-0000-000000000000' },
          { questionId: qRating.id, ratingValue: 4 },
        ],
      });
    expect([400, 422]).toContain(resBadOption.status);

    // 3. Missing required question (e.g. missing qRating)
    const resMissingReq = await request(app)
      .post(`/api/surveys/${survey!.id}/responses`)
      .set('Authorization', `Bearer ${respondentToken}`)
      .send({
        answers: [
          { questionId: qChoice.id, selectedOptionId: qChoice.options[0].id },
        ],
      });
    expect([400, 422]).toContain(resMissingReq.status);

    // 4. Text too long (> 500 chars)
    const resLongText = await request(app)
      .post(`/api/surveys/${survey!.id}/responses`)
      .set('Authorization', `Bearer ${respondentToken}`)
      .send({
        answers: [
          { questionId: qChoice.id, selectedOptionId: qChoice.options[0].id },
          { questionId: qRating.id, ratingValue: 4 },
          { questionId: qText.id, textValue: 'X'.repeat(501) },
        ],
      });
    expect([400, 422]).toContain(resLongText.status);
  });

  // TEST-24: Identified Response Storage (AC-24)
  it('TEST-24: Identified response is explicitly stored with respondentId and responseMode IDENTIFIED', async () => {
    const respondent5 = await prisma.user.findUnique({ where: { email: 'respondent5@example.test' } });
    const survey = await prisma.survey.findFirst({
      where: { title: 'Course Evaluation 2026', status: 'PUBLISHED' },
      include: { questions: { include: { options: true } } },
    });
    const qChoice = survey!.questions.find((q) => q.type === 'SINGLE_CHOICE')!;
    const qRating = survey!.questions.find((q) => q.type === 'RATING')!;

    const respondentToken = await getRespondentToken(5);

    const res = await request(app)
      .post(`/api/surveys/${survey!.id}/responses`)
      .set('Authorization', `Bearer ${respondentToken}`)
      .send({
        answers: [
          { questionId: qChoice.id, selectedOptionId: qChoice.options[0].id },
          { questionId: qRating.id, ratingValue: 5 },
        ],
      });

    expect(res.status).toBe(201);

    const saved = await prisma.response.findUnique({
      where: { id: res.body.id },
      include: { survey: true },
    });
    expect(saved).not.toBeNull();
    expect(saved!.respondentId).toBe(respondent5!.id);
    expect(saved!.survey.responseMode).toBe('IDENTIFIED');
  });
});
