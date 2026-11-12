import { Router, Request, Response, NextFunction } from 'express';
import { authenticate, requireRole } from '../middleware/auth.js';
import { createSurveySchema } from '../validators/survey.validator.js';
import { submitResponseSchema } from '../validators/response.validator.js';
import * as surveyService from '../services/survey.service.js';
import * as responseService from '../services/response.service.js';
import { AppError, ErrorCode } from '../lib/errors.js';

const router = Router();

// All survey routes require authentication
router.use(authenticate);

// ==================== RESPONDENT ENDPOINTS ====================

// Alias from features-sds: GET /api/surveys/active
router.get('/active', requireRole('RESPONDENT'), async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const surveys = await responseService.listAvailableSurveys();
    res.status(200).json(surveys);
  } catch (err) {
    next(err);
  }
});

// POST /api/surveys/:id/responses - Submit response
router.post('/:id/responses', requireRole('RESPONDENT'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = submitResponseSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError(400, ErrorCode.VALIDATION_ERROR, 'Validation failed', parsed.error.issues);
    }
    const result = await responseService.submitResponse(req.params.id, req.user!.id, parsed.data);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
});

// GET /api/surveys/:id/responses/me - View own response
router.get('/:id/responses/me', requireRole('RESPONDENT'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await responseService.getMyResponse(req.params.id, req.user!.id);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
});

// Alias: GET /api/surveys/:id/my-response
router.get('/:id/my-response', requireRole('RESPONDENT'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await responseService.getMyResponse(req.params.id, req.user!.id);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
});

// Alias: GET /api/surveys/:id/form
router.get('/:id/form', requireRole('RESPONDENT'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const survey = await responseService.getAvailableSurvey(req.params.id);
    res.status(200).json(survey);
  } catch (err) {
    next(err);
  }
});

// ==================== OWNER ENDPOINTS ====================

// POST /api/surveys - Create draft
router.post('/', requireRole('SURVEY_OWNER'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = createSurveySchema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError(400, ErrorCode.VALIDATION_ERROR, 'Validation failed', parsed.error.issues);
    }
    const survey = await surveyService.createSurvey(req.user!.id, parsed.data);
    res.status(201).json(survey);
  } catch (err) {
    next(err);
  }
});

// GET /api/surveys - List own surveys
router.get('/', requireRole('SURVEY_OWNER'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const surveys = await surveyService.listSurveys(req.user!.id);
    res.status(200).json(surveys);
  } catch (err) {
    next(err);
  }
});

// POST /api/surveys/:id/publish - Publish survey
router.post('/:id/publish', requireRole('SURVEY_OWNER'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const survey = await surveyService.publishSurvey(req.params.id, req.user!.id);
    res.status(200).json(survey);
  } catch (err) {
    next(err);
  }
});

// POST /api/surveys/:id/close - Close survey
router.post('/:id/close', requireRole('SURVEY_OWNER'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const survey = await surveyService.closeSurvey(req.params.id, req.user!.id);
    res.status(200).json(survey);
  } catch (err) {
    next(err);
  }
});

// GET /api/surveys/:id/summary - Aggregate results
router.get('/:id/summary', requireRole('SURVEY_OWNER'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const summary = await surveyService.getSurveySummary(req.params.id, req.user!.id);
    res.status(200).json(summary);
  } catch (err) {
    next(err);
  }
});

// GET /api/surveys/:id - Get survey detail (Owner)
router.get('/:id', requireRole('SURVEY_OWNER'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const survey = await surveyService.getSurvey(req.params.id, req.user!.id);
    res.status(200).json(survey);
  } catch (err) {
    next(err);
  }
});

export default router;
