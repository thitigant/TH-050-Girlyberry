import request from 'supertest';
import app from '../index.js';

export async function loginAs(email: string, password = 'Pass1234!') {
  const res = await request(app)
    .post('/api/auth/login')
    .send({ email, password });
  return {
    token: res.body.token as string,
    user: res.body.user,
    status: res.status,
  };
}

export async function getOwnerToken() {
  const res = await loginAs('owner1@example.test');
  return res.token;
}

export async function getOwner2Token() {
  const res = await loginAs('owner2@example.test');
  return res.token;
}

export async function getRespondentToken(index = 1) {
  const res = await loginAs(`respondent${index}@example.test`);
  return res.token;
}
