import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import prisma from '../lib/prisma.js';
import { AppError, ErrorCode } from '../lib/errors.js';
import { LoginInput } from '../validators/auth.validator.js';

// Pre-computed dummy hash for timing-safe comparison on unknown emails
const DUMMY_HASH = bcrypt.hashSync('dummy-password-for-timing', 12);

export async function login(input: LoginInput) {
  const user = await prisma.user.findUnique({ where: { email: input.email } });

  if (!user || !user.isActive) {
    // Dummy comparison to prevent timing attacks
    await bcrypt.compare(input.password, DUMMY_HASH);
    throw new AppError(401, ErrorCode.INVALID_CREDENTIALS, 'Invalid email or password');
  }

  const valid = await bcrypt.compare(input.password, user.passwordHash);
  if (!valid) {
    throw new AppError(401, ErrorCode.INVALID_CREDENTIALS, 'Invalid email or password');
  }

  const jti = uuidv4();
  const expiresIn = process.env.JWT_EXPIRES_IN || '60m';
  const token = jwt.sign(
    { sub: user.id, jti },
    process.env.JWT_SECRET!,
    { expiresIn }
  );

  return {
    token,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    },
  };
}

export async function logout(jti: string, userId: string, exp?: number) {
  const expiresAt = exp ? new Date(exp * 1000) : new Date(Date.now() + 60 * 60 * 1000);
  await prisma.revokedToken.create({
    data: {
      jti,
      userId,
      expiresAt,
    },
  });
}
