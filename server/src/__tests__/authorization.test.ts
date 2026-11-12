import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../index.js';
import prisma from '../lib/prisma.js';
import { getOwnerToken, getOwner2Token, getRespondentToken } from './helpers.js';

describe('Authorization & Access Control (F-02: TEST-07 to TEST-10, TEST-23)', () => {
  // TEST-07: Unauthenticated requests return 401 (AC-07, NFR-01)
  it('TEST-07: Requests to protected endpoints without token return 401', async () => {
    const endpoints = [
      { method: 'get', path: '/api/auth/me' },
      { method: 'post', path: '/api/auth/logout' },
      { method: 'get', path: '/api/surveys' },
      { method: 'post', path: '/api/surveys' },
      { method: 'get', path: '/api/available-surveys' },
      { method: 'post', path: '/api/surveys/some-uuid/responses' },
    ];

    for (const ep of endpoints) {
      const req = (request(app) as any)[ep.method](ep.path);
      const res = await req;
      expect(res.status, `Failed for ${ep.method.toUpperCase()} ${ep.path}`).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHENTICATED');
    }
  });

  // TEST-08: Respondent calling Owner endpoints returns 403 (AC-08)
  it('TEST-08: Respondent calling Owner endpoints returns 403 Forbidden', async () => {
    const respondentToken = await getRespondentToken(1);

    // Try creating a survey
    const createRes = await request(app)
      .post('/api/surveys')
      .set('Authorization', `Bearer ${respondentToken}`)
      .send({
        title: 'Unauthorized Survey',
        questions: [{ displayOrder: 1, type: 'SHORT_TEXT', text: 'Q1' }],
      });

    expect(createRes.status).toBe(403);
    expect(createRes.body.error.code).toBe('FORBIDDEN_ROLE');

    // Try listing owner surveys
    const listRes = await request(app)
      .get('/api/surveys')
      .set('Authorization', `Bearer ${respondentToken}`);

    expect(listRes.status).toBe(403);
    expect(listRes.body.error.code).toBe('FORBIDDEN_ROLE');
  });

  // TEST-09: Cross-User Record Boundary - Owner Isolation (AC-09)
  it("TEST-09: Owner B accessing Owner A's surveys/summary returns 404", async () => {
    const owner1 = await prisma.user.findUnique({ where: { email: 'owner1@example.test' } });
    const owner1Survey = await prisma.survey.findFirst({
      where: { ownerId: owner1!.id },
    });
    expect(owner1Survey).not.toBeNull();

    const owner2Token = await getOwner2Token();

    // Owner 2 tries to view Owner 1's survey
    const getRes = await request(app)
      .get(`/api/surveys/${owner1Survey!.id}`)
      .set('Authorization', `Bearer ${owner2Token}`);

    expect(getRes.status).toBe(404);
    expect(getRes.body.error.code).toBe('NOT_FOUND');

    // Owner 2 tries to view Owner 1's summary
    const summaryRes = await request(app)
      .get(`/api/surveys/${owner1Survey!.id}/summary`)
      .set('Authorization', `Bearer ${owner2Token}`);

    expect(summaryRes.status).toBe(404);
    expect(summaryRes.body.error.code).toBe('NOT_FOUND');

    // Owner 2 tries to close Owner 1's survey
    const closeRes = await request(app)
      .post(`/api/surveys/${owner1Survey!.id}/close`)
      .set('Authorization', `Bearer ${owner2Token}`);

    expect(closeRes.status).toBe(404);
    expect(closeRes.body.error.code).toBe('NOT_FOUND');
  });

  // TEST-10: Cross-User Record Boundary - Respondent Isolation (AC-10)
  it("TEST-10: Respondent B requesting Respondent A's submission returns 404", async () => {
    // Find closed survey where respondent 1 answered
    const closedSurvey = await prisma.survey.findFirst({
      where: { status: 'CLOSED' },
    });
    expect(closedSurvey).not.toBeNull();

    // Respondent 2 has answered closed survey in seed, but respondent 3 has not answered it yet
    const respondent3Token = await getRespondentToken(3);

    const res = await request(app)
      .get(`/api/surveys/${closedSurvey!.id}/responses/me`)
      .set('Authorization', `Bearer ${respondent3Token}`);

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  // TEST-23: Owner calling Respondent endpoints returns 403 (AC-23)
  it('TEST-23: Survey Owner calling Respondent-only endpoints returns 403', async () => {
    const ownerToken = await getOwnerToken();

    // Owner tries to browse available surveys
    const browseRes = await request(app)
      .get('/api/available-surveys')
      .set('Authorization', `Bearer ${ownerToken}`);

    expect(browseRes.status).toBe(403);
    expect(browseRes.body.error.code).toBe('FORBIDDEN_ROLE');

    // Owner tries to submit a response
    const survey = await prisma.survey.findFirst({ where: { status: 'PUBLISHED' } });
    const submitRes = await request(app)
      .post(`/api/surveys/${survey!.id}/responses`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ answers: [] });

    expect(submitRes.status).toBe(403);
    expect(submitRes.body.error.code).toBe('FORBIDDEN_ROLE');
  });
});
