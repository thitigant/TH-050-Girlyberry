import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../index.js';
import { getOwnerToken } from './helpers.js';

describe('Uniform Error Handling (F-10: TEST-31)', () => {
  // TEST-31: Structured Error Shape & No Stack Trace (AC-31)
  it('TEST-31: Errors return uniform JSON structure { error: { code, message, details } } without stack trace', async () => {
    // 1. Unauthenticated (401)
    const res401 = await request(app).get('/api/auth/me');
    expect(res401.status).toBe(401);
    expect(res401.body).toHaveProperty('error');
    expect(res401.body.error).toHaveProperty('code');
    expect(res401.body.error).toHaveProperty('message');
    expect(res401.body.error).not.toHaveProperty('stack');
    expect(JSON.stringify(res401.body)).not.toContain('node_modules');

    // 2. Validation error (400)
    const ownerToken = await getOwnerToken();
    const res400 = await request(app)
      .post('/api/surveys')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ title: '' }); // Invalid survey
    expect(res400.status).toBe(400);
    expect(res400.body).toHaveProperty('error');
    expect(res400.body.error.code).toBe('VALIDATION_ERROR');
    expect(res400.body.error).toHaveProperty('details');
    expect(res400.body.error).not.toHaveProperty('stack');

    // 3. Not Found (404)
    const res404 = await request(app)
      .get('/api/surveys/00000000-0000-0000-0000-000000000000')
      .set('Authorization', `Bearer ${ownerToken}`);
    expect(res404.status).toBe(404);
    expect(res404.body.error.code).toBe('NOT_FOUND');
    expect(res404.body.error).not.toHaveProperty('stack');
  });
});
