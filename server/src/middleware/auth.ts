import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import prisma from '../lib/prisma.js';
import { AppError, ErrorCode } from '../lib/errors.js';
import { Role } from '@prisma/client';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: Role;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
      tokenJti?: string;
      tokenExp?: number;
    }
  }
}

export async function authenticate(req: Request, _res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError(401, ErrorCode.UNAUTHENTICATED, 'Authentication required');
    }

    const token = authHeader.slice(7);
    const secret = process.env.JWT_SECRET!;

    let payload: jwt.JwtPayload;
    try {
      payload = jwt.verify(token, secret) as jwt.JwtPayload;
    } catch (err) {
      throw new AppError(401, ErrorCode.UNAUTHENTICATED, 'Invalid or expired token');
    }

    const jti = payload.jti;
    if (!jti) {
      throw new AppError(401, ErrorCode.UNAUTHENTICATED, 'Invalid token');
    }

    // Check revocation
    const revoked = await prisma.revokedToken.findUnique({ where: { jti } });
    if (revoked) {
      throw new AppError(401, ErrorCode.UNAUTHENTICATED, 'Token has been revoked');
    }

    // Load user
    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user || !user.isActive) {
      throw new AppError(401, ErrorCode.UNAUTHENTICATED, 'User not found or inactive');
    }

    req.user = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    };
    req.tokenJti = jti;
    req.tokenExp = payload.exp;

    next();
  } catch (err) {
    next(err);
  }
}

export function requireRole(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AppError(401, ErrorCode.UNAUTHENTICATED, 'Authentication required'));
    }
    if (!roles.includes(req.user.role)) {
      return next(new AppError(403, ErrorCode.FORBIDDEN_ROLE, 'You do not have permission to perform this action'));
    }
    next();
  };
}
