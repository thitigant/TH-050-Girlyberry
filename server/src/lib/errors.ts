export enum ErrorCode {
  UNAUTHENTICATED = 'UNAUTHENTICATED',
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  FORBIDDEN_ROLE = 'FORBIDDEN_ROLE',
  NOT_FOUND = 'NOT_FOUND',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  DUPLICATE_RESPONSE = 'DUPLICATE_RESPONSE',
  SURVEY_NOT_PUBLISHED = 'SURVEY_NOT_PUBLISHED',
  SURVEY_CLOSED = 'SURVEY_CLOSED',
  INVALID_STATE_TRANSITION = 'INVALID_STATE_TRANSITION',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
}

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: ErrorCode;
  public readonly details?: unknown;

  constructor(statusCode: number, code: ErrorCode, message: string, details?: unknown) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

import { Request, Response, NextFunction } from 'express';

export function globalErrorHandler(err: Error, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof AppError) {
    const body: Record<string, unknown> = {
      error: {
        code: err.code,
        message: err.message,
        ...(err.details !== undefined ? { details: err.details } : {}),
      },
    };
    res.status(err.statusCode).json(body);
    return;
  }

  // Handle JSON parse errors
  if (err.type === 'entity.parse.failed' || (err as any).status === 400) {
    res.status(400).json({
      error: {
        code: ErrorCode.VALIDATION_ERROR,
        message: 'Invalid JSON in request body',
      },
    });
    return;
  }

  // Never leak stack traces
  console.error('Unexpected error:', err.message);
  res.status(500).json({
    error: {
      code: ErrorCode.INTERNAL_ERROR,
      message: 'An unexpected error occurred',
    },
  });
}
