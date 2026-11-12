import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../index.js';
import prisma from '../lib/prisma.js';
import { getOwnerToken, getRespondentToken } from './helpers.js';

describe('Aggregate Summary (F-08: TEST-26, TEST-27)', () => {
  // TEST-26: Aggregate Summary Calculations (AC-26)
  it('TEST-26: Aggregate summary calculations match expected calculations', async () => {
    const ownerToken = await getOwnerToken();

    // Create a new survey to have fully controlled inputs
    const createRes = await request(app)
      .post('/api/surveys')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        title: 'Math Course Feedback Summary Test',
        questions: [
          {
            displayOrder: 1,
            type: 'SINGLE_CHOICE',
            text: 'Difficulty level?',
            options: ['Easy', 'Medium', 'Hard'],
          },
          {
            displayOrder: 2,
            type: 'RATING',
            text: 'Instructor rating',
          },
          {
            displayOrder: 3,
            type: 'SHORT_TEXT',
            text: 'Review comments',
            isRequired: false,
          },
        ],
      });

    const surveyId = createRes.body.id;
    await request(app).post(`/api/surveys/${surveyId}/publish`).set('Authorization', `Bearer ${ownerToken}`);

    const q1 = createRes.body.questions.find((q: any) => q.displayOrder === 1);
    const q2 = createRes.body.questions.find((q: any) => q.displayOrder === 2);
    const q3 = createRes.body.questions.find((q: any) => q.displayOrder === 3);

    const optEasy = q1.options.find((o: any) => o.label === 'Easy');
    const optHard = q1.options.find((o: any) => o.label === 'Hard');

    // Respondent 1 submits: Easy, Rating 4, Text "Good"
    const r1Token = await getRespondentToken(1);
    await request(app)
      .post(`/api/surveys/${surveyId}/responses`)
      .set('Authorization', `Bearer ${r1Token}`)
      .send({
        answers: [
          { questionId: q1.id, selectedOptionId: optEasy.id },
          { questionId: q2.id, ratingValue: 4 },
          { questionId: q3.id, textValue: 'Good' },
        ],
      });

    // Respondent 2 submits: Hard, Rating 2, Text "Tough"
    const r2Token = await getRespondentToken(2);
    await request(app)
      .post(`/api/surveys/${surveyId}/responses`)
      .set('Authorization', `Bearer ${r2Token}`)
      .send({
        answers: [
          { questionId: q1.id, selectedOptionId: optHard.id },
          { questionId: q2.id, ratingValue: 2 },
          { questionId: q3.id, textValue: 'Tough' },
        ],
      });

    // Fetch summary as owner
    const summaryRes = await request(app)
      .get(`/api/surveys/${surveyId}/summary`)
      .set('Authorization', `Bearer ${ownerToken}`);

    expect(summaryRes.status).toBe(200);
    expect(summaryRes.body.totalResponses).toBe(2);

    const sq1 = summaryRes.body.questions.find((q: any) => q.questionId === q1.id);
    expect(sq1.totalAnswers).toBe(2);
    const sOptEasy = sq1.options.find((o: any) => o.label === 'Easy');
    expect(sOptEasy.count).toBe(1);
    expect(sOptEasy.percentage).toBe(50.0);
    const sOptMedium = sq1.options.find((o: any) => o.label === 'Medium');
    expect(sOptMedium.count).toBe(0);
    expect(sOptMedium.percentage).toBe(0.0);

    const sq2 = summaryRes.body.questions.find((q: any) => q.questionId === q2.id);
    expect(sq2.totalAnswers).toBe(2);
    expect(sq2.averageRating).toBe(3.0); // (4 + 2) / 2 = 3.0
    expect(sq2.distribution['4']).toBe(1);
    expect(sq2.distribution['2']).toBe(1);
    expect(sq2.distribution['5']).toBe(0);

    const sq3 = summaryRes.body.questions.find((q: any) => q.questionId === q3.id);
    expect(sq3.textAnswers).toContain('Good');
    expect(sq3.textAnswers).toContain('Tough');
  });

  // TEST-27: Zero-Response Summary (AC-27)
  it('TEST-27: Survey with zero responses displays zero counts without errors', async () => {
    const ownerToken = await getOwnerToken();

    // Create a new survey with 0 responses
    const createRes = await request(app)
      .post('/api/surveys')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        title: 'Empty Zero Response Survey',
        questions: [
          {
            displayOrder: 1,
            type: 'SINGLE_CHOICE',
            text: 'Pick one',
            options: ['A', 'B'],
          },
          {
            displayOrder: 2,
            type: 'RATING',
            text: 'Rate something',
          },
          {
            displayOrder: 3,
            type: 'SHORT_TEXT',
            text: 'Comment',
            isRequired: false,
          },
        ],
      });

    const surveyId = createRes.body.id;

    const summaryRes = await request(app)
      .get(`/api/surveys/${surveyId}/summary`)
      .set('Authorization', `Bearer ${ownerToken}`);

    expect(summaryRes.status).toBe(200);
    expect(summaryRes.body.totalResponses).toBe(0);

    const sq1 = summaryRes.body.questions[0];
    expect(sq1.totalAnswers).toBe(0);
    expect(sq1.options[0].count).toBe(0);
    expect(sq1.options[0].percentage).toBe(0);

    const sq2 = summaryRes.body.questions[1];
    expect(sq2.totalAnswers).toBe(0);
    expect(sq2.averageRating).toBe(0);
    expect(sq2.distribution['1']).toBe(0);

    const sq3 = summaryRes.body.questions[2];
    expect(sq3.totalAnswers).toBe(0);
    expect(sq3.textAnswers).toEqual([]);
  });
});
