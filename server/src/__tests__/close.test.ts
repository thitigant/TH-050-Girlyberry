import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../index.js';
import prisma from '../lib/prisma.js';
import { getOwnerToken, getOwner2Token, getRespondentToken } from './helpers.js';

describe('Close Survey Lifecycle (F-12: TEST-33, TEST-34)', () => {
  // TEST-33: Close Survey (AC-33)
  it('TEST-33: Owner closes survey: status becomes CLOSED, closedAt set, subsequent responses rejected', async () => {
    const ownerToken = await getOwnerToken();

    // Create & publish survey
    const createRes = await request(app)
      .post('/api/surveys')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        title: 'Survey to be closed',
        questions: [{ displayOrder: 1, type: 'SHORT_TEXT', text: 'Any thoughts?' }],
      });

    const surveyId = createRes.body.id;
    await request(app).post(`/api/surveys/${surveyId}/publish`).set('Authorization', `Bearer ${ownerToken}`);

    // Close the survey
    const closeRes = await request(app)
      .post(`/api/surveys/${surveyId}/close`)
      .set('Authorization', `Bearer ${ownerToken}`);

    expect(closeRes.status).toBe(200);
    expect(closeRes.body.status).toBe('CLOSED');
    expect(closeRes.body.closedAt).not.toBeNull();

    // Verify DB
    const dbSurvey = await prisma.survey.findUnique({ where: { id: surveyId } });
    expect(dbSurvey!.status).toBe('CLOSED');
    expect(dbSurvey!.closedAt).not.toBeNull();

    // Subsequent response submission is rejected
    const respondentToken = await getRespondentToken(1);
    const q1 = createRes.body.questions[0];

    const submitRes = await request(app)
      .post(`/api/surveys/${surveyId}/responses`)
      .set('Authorization', `Bearer ${respondentToken}`)
      .send({
        answers: [{ questionId: q1.id, textValue: 'Late response' }],
      });

    expect(submitRes.status).toBe(400);
    expect(submitRes.body.error.code).toBe('SURVEY_CLOSED');
  });

  // TEST-34: Unauthorized & Invalid Close Transitions (AC-34)
  it('TEST-34: Closing by non-owner rejected (404/403); closing a Draft or Closed survey rejected (409/400)', async () => {
    const ownerToken = await getOwnerToken();
    const owner2Token = await getOwner2Token();
    const respondentToken = await getRespondentToken(1);

    // 1. Create a published survey by Owner 1
    const createRes = await request(app)
      .post('/api/surveys')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        title: 'Survey for Unauthorized Close Test',
        questions: [{ displayOrder: 1, type: 'SHORT_TEXT', text: 'Text' }],
      });
    const surveyId = createRes.body.id;
    await request(app).post(`/api/surveys/${surveyId}/publish`).set('Authorization', `Bearer ${ownerToken}`);

    // Respondent attempts to close -> 403 Forbidden
    const resRespondentClose = await request(app)
      .post(`/api/surveys/${surveyId}/close`)
      .set('Authorization', `Bearer ${respondentToken}`);

    expect(resRespondentClose.status).toBe(403);
    expect(resRespondentClose.body.error.code).toBe('FORBIDDEN_ROLE');

    // Owner 2 attempts to close Owner 1 survey -> 404 Not Found
    const resOwner2Close = await request(app)
      .post(`/api/surveys/${surveyId}/close`)
      .set('Authorization', `Bearer ${owner2Token}`);

    expect(resOwner2Close.status).toBe(404);
    expect(resOwner2Close.body.error.code).toBe('NOT_FOUND');

    // Closing a DRAFT survey is rejected
    const draftSurvey = await prisma.survey.findFirst({ where: { status: 'DRAFT' } });
    const resCloseDraft = await request(app)
      .post(`/api/surveys/${draftSurvey!.id}/close`)
      .set('Authorization', `Bearer ${ownerToken}`);

    expect([400, 409]).toContain(resCloseDraft.status);
    expect(resCloseDraft.body.error.code).toBe('INVALID_STATE_TRANSITION');

    // Closing an already CLOSED survey is rejected
    const closedSurvey = await prisma.survey.findFirst({ where: { status: 'CLOSED' } });
    const resCloseClosed = await request(app)
      .post(`/api/surveys/${closedSurvey!.id}/close`)
      .set('Authorization', `Bearer ${ownerToken}`);

    expect([400, 409]).toContain(resCloseClosed.status);
    expect(resCloseClosed.body.error.code).toBe('INVALID_STATE_TRANSITION');
  });
});
