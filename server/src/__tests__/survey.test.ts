import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../index.js';
import prisma from '../lib/prisma.js';
import { getOwnerToken } from './helpers.js';

describe('Survey Creation & Lifecycle (F-03, F-04: TEST-11 to TEST-15)', () => {
  // TEST-11: Valid Survey Draft Creation (AC-11)
  it('TEST-11: Valid survey draft created with questions and persisted in DB', async () => {
    const ownerToken = await getOwnerToken();

    const payload = {
      title: 'New Student Orientation 2026',
      description: 'Orientation feedback survey',
      questions: [
        {
          displayOrder: 1,
          type: 'SINGLE_CHOICE',
          text: 'How helpful was the campus tour?',
          isRequired: true,
          options: ['Not helpful', 'Moderately helpful', 'Extremely helpful'],
        },
        {
          displayOrder: 2,
          type: 'RATING',
          text: 'Rate the registration process',
          isRequired: true,
        },
        {
          displayOrder: 3,
          type: 'SHORT_TEXT',
          text: 'Any suggestions for next year?',
          isRequired: false,
        },
      ],
    };

    const res = await request(app)
      .post('/api/surveys')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send(payload);

    expect(res.status).toBe(201);
    expect(res.body.title).toBe(payload.title);
    expect(res.body.status).toBe('DRAFT');
    expect(res.body.responseMode).toBe('IDENTIFIED');
    expect(res.body.questions).toHaveLength(3);

    // Verify DB persistence
    const saved = await prisma.survey.findUnique({
      where: { id: res.body.id },
      include: { questions: { include: { options: true } } },
    });
    expect(saved).not.toBeNull();
    expect(saved!.questions).toHaveLength(3);
    const scQuestion = saved!.questions.find((q) => q.type === 'SINGLE_CHOICE');
    expect(scQuestion!.options).toHaveLength(3);
  });

  // TEST-12: Validation Rejection on Survey Creation (AC-12)
  it('TEST-12: Rejection of invalid titles, >30 questions, or invalid single-choice options', async () => {
    const ownerToken = await getOwnerToken();

    // 1. Empty title
    const resEmptyTitle = await request(app)
      .post('/api/surveys')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        title: '',
        questions: [{ displayOrder: 1, type: 'SHORT_TEXT', text: 'Q1' }],
      });
    expect(resEmptyTitle.status).toBe(400);

    // 2. Title > 150 chars
    const resLongTitle = await request(app)
      .post('/api/surveys')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        title: 'A'.repeat(151),
        questions: [{ displayOrder: 1, type: 'SHORT_TEXT', text: 'Q1' }],
      });
    expect(resLongTitle.status).toBe(400);

    // 3. > 30 questions
    const manyQuestions = Array.from({ length: 31 }, (_, i) => ({
      displayOrder: i + 1,
      type: 'SHORT_TEXT',
      text: `Question ${i + 1}`,
    }));
    const resManyQuestions = await request(app)
      .post('/api/surveys')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        title: 'Too many questions survey',
        questions: manyQuestions,
      });
    expect(resManyQuestions.status).toBe(400);

    // 4. Single choice with < 2 options
    const resOneOption = await request(app)
      .post('/api/surveys')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        title: 'Bad single choice',
        questions: [
          {
            displayOrder: 1,
            type: 'SINGLE_CHOICE',
            text: 'Choose one',
            options: ['Only one'],
          },
        ],
      });
    expect(resOneOption.status).toBe(400);

    // 5. Single choice with > 10 options
    const resElevenOptions = await request(app)
      .post('/api/surveys')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        title: 'Too many options',
        questions: [
          {
            displayOrder: 1,
            type: 'SINGLE_CHOICE',
            text: 'Choose one',
            options: Array.from({ length: 11 }, (_, i) => `Opt ${i + 1}`),
          },
        ],
      });
    expect(resElevenOptions.status).toBe(400);

    // 6. Duplicate option labels
    const resDuplicateOptions = await request(app)
      .post('/api/surveys')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        title: 'Duplicate options',
        questions: [
          {
            displayOrder: 1,
            type: 'SINGLE_CHOICE',
            text: 'Choose one',
            options: ['Option A', 'Option A'],
          },
        ],
      });
    expect(resDuplicateOptions.status).toBe(400);
  });

  // TEST-13: Valid Draft Publishing (AC-13)
  it('TEST-13: Valid draft successfully transitions to PUBLISHED status', async () => {
    const ownerToken = await getOwnerToken();

    // Create a draft
    const createRes = await request(app)
      .post('/api/surveys')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        title: 'Publishable Survey',
        questions: [{ displayOrder: 1, type: 'SHORT_TEXT', text: 'Comments?' }],
      });

    const surveyId = createRes.body.id;

    // Publish it
    const publishRes = await request(app)
      .post(`/api/surveys/${surveyId}/publish`)
      .set('Authorization', `Bearer ${ownerToken}`);

    expect(publishRes.status).toBe(200);
    expect(publishRes.body.status).toBe('PUBLISHED');
    expect(publishRes.body.publishedAt).not.toBeNull();

    // Check DB
    const survey = await prisma.survey.findUnique({ where: { id: surveyId } });
    expect(survey!.status).toBe('PUBLISHED');
  });

  // TEST-14: Publish without Questions Rejected (AC-14)
  it('TEST-14: Publishing survey without questions is rejected; status remains DRAFT', async () => {
    const owner = await prisma.user.findUnique({ where: { email: 'owner1@example.test' } });
    // Manually create an empty survey in DB bypassing validation to test service-level BR-03 check
    const emptySurvey = await prisma.survey.create({
      data: {
        ownerId: owner!.id,
        title: 'Empty Survey Without Questions',
        status: 'DRAFT',
        responseMode: 'IDENTIFIED',
      },
    });

    const ownerToken = await getOwnerToken();

    const publishRes = await request(app)
      .post(`/api/surveys/${emptySurvey.id}/publish`)
      .set('Authorization', `Bearer ${ownerToken}`);

    expect(publishRes.status).toBe(400);
    expect(publishRes.body.error.code).toBe('VALIDATION_ERROR');

    // Verify status remains DRAFT
    const reloaded = await prisma.survey.findUnique({ where: { id: emptySurvey.id } });
    expect(reloaded!.status).toBe('DRAFT');
  });

  // TEST-15: Invalid Transitions Rejected (AC-15)
  it('TEST-15: Invalid transitions (re-publishing Published or Closed survey) return 409 or 400', async () => {
    const ownerToken = await getOwnerToken();
    const owner = await prisma.user.findUnique({ where: { email: 'owner1@example.test' } });

    // 1. Try re-publishing already published survey
    const publishedSurvey = await prisma.survey.findFirst({
      where: { ownerId: owner!.id, status: 'PUBLISHED' },
    });
    expect(publishedSurvey).not.toBeNull();

    const resRePublish = await request(app)
      .post(`/api/surveys/${publishedSurvey!.id}/publish`)
      .set('Authorization', `Bearer ${ownerToken}`);

    expect([400, 409]).toContain(resRePublish.status);
    expect(resRePublish.body.error.code).toBe('INVALID_STATE_TRANSITION');

    // 2. Try re-publishing closed survey
    const closedSurvey = await prisma.survey.findFirst({
      where: { ownerId: owner!.id, status: 'CLOSED' },
    });
    expect(closedSurvey).not.toBeNull();

    const resPublishClosed = await request(app)
      .post(`/api/surveys/${closedSurvey!.id}/publish`)
      .set('Authorization', `Bearer ${ownerToken}`);

    expect([400, 409]).toContain(resPublishClosed.status);
    expect(resPublishClosed.body.error.code).toBe('INVALID_STATE_TRANSITION');
  });
});
