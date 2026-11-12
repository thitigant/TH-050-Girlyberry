import { beforeAll, afterAll } from 'vitest';
import prisma from '../lib/prisma.js';
import { main as seedDatabase } from '../../prisma/seed.js';

export async function resetAndSeed() {
  // Delete in reverse order of foreign keys
  await prisma.answer.deleteMany();
  await prisma.response.deleteMany();
  await prisma.questionOption.deleteMany();
  await prisma.question.deleteMany();
  await prisma.survey.deleteMany();
  await prisma.revokedToken.deleteMany();
  await prisma.user.deleteMany();

  // Re-seed synthetic data
  await seedDatabase();
}

beforeAll(async () => {
  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-key-32-chars-long!!';
  process.env.SEED_DEFAULT_PASSWORD = process.env.SEED_DEFAULT_PASSWORD || 'Pass1234!';
  process.env.BCRYPT_COST = '8'; // Faster for test suite

  await resetAndSeed();
});

afterAll(async () => {
  await prisma.$disconnect();
});
