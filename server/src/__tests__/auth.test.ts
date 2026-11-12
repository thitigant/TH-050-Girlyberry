import { describe, it, expect } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import app from '../index.js';
import prisma from '../lib/prisma.js';
import { loginAs } from './helpers.js';

describe('Authentication (F-01: TEST-01 to TEST-06)', () => {
  // TEST-01: Valid Authentication (AC-01)
  it('TEST-01: Valid credentials return JWT token and user profile/role', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'owner1@example.test', password: 'Pass1234!' });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('token');
    expect(res.body.user).toMatchObject({
      email: 'owner1@example.test',
      role: 'SURVEY_OWNER',
      name: 'Dr. Alice Smith',
    });
    expect(res.body.user).not.toHaveProperty('passwordHash');
  });

  // TEST-02: Invalid Authentication (AC-02)
  it('TEST-02: Invalid email/password returns 401 with generic error', async () => {
    // Wrong password
    const resWrongPass = await request(app)
      .post('/api/auth/login')
      .send({ email: 'owner1@example.test', password: 'WrongPassword99!' });

    expect(resWrongPass.status).toBe(401);
    expect(resWrongPass.body.error).toHaveProperty('code');
    expect(resWrongPass.body.error.message).toBe('Invalid email or password');

    // Non-existent user
    const resNoUser = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nonexistent@example.test', password: 'AnyPassword!' });

    expect(resNoUser.status).toBe(401);
    expect(resNoUser.body.error.message).toBe('Invalid email or password');
  });

  // TEST-03: Logout & Token Invalidation (AC-03)
  it('TEST-03: Token added to RevokedToken table on logout; subsequent use returns 401', async () => {
    const { token } = await loginAs('owner1@example.test');

    // Call logout
    const logoutRes = await request(app)
      .post('/api/auth/logout')
      .set('Authorization', `Bearer ${token}`);

    expect(logoutRes.status).toBe(200);

    // Verify token is in RevokedToken table
    const decoded = jwt.decode(token) as jwt.JwtPayload;
    const revoked = await prisma.revokedToken.findUnique({
      where: { jti: decoded.jti },
    });
    expect(revoked).not.toBeNull();

    // Subsequent call with revoked token returns 401
    const meRes = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);

    expect(meRes.status).toBe(401);
    expect(meRes.body.error.code).toBe('UNAUTHENTICATED');
  });

  // TEST-04: User Profile derived from validated token (AC-04)
  it('TEST-04: GET /api/auth/me returns identity/role derived from validated token', async () => {
    const { token } = await loginAs('respondent1@example.test');

    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      email: 'respondent1@example.test',
      role: 'RESPONDENT',
      name: 'Respondent 1',
    });
    expect(res.body).not.toHaveProperty('passwordHash');
  });

  // TEST-05: Expired JWT token is rejected (AC-05)
  it('TEST-05: Expired JWT token is rejected with 401', async () => {
    const user = await prisma.user.findUnique({ where: { email: 'owner1@example.test' } });
    const expiredToken = jwt.sign(
      { sub: user!.id, jti: uuidv4() },
      process.env.JWT_SECRET!,
      { expiresIn: '-10s' } // Expired 10 seconds ago
    );

    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${expiredToken}`);

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHENTICATED');
  });

  // TEST-06: Passwords stored as bcrypt hashes (AC-06)
  it('TEST-06: Passwords stored in DB as bcrypt hashes; no plaintext stored', async () => {
    const users = await prisma.user.findMany();
    expect(users.length).toBeGreaterThan(0);

    for (const u of users) {
      expect(u.passwordHash).not.toBe('Pass1234!');
      // Bcrypt hash starts with $2a$, $2b$, or $2y$ and is 60 chars long
      expect(u.passwordHash).toMatch(/^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/);
    }
  });
});
