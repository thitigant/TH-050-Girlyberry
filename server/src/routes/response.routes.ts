import { Router, Request, Response, NextFunction } from 'express';
import { authenticate, requireRole } from '../middleware/auth.js';
import * as responseService from '../services/response.service.js';

const router = Router();

router.use(authenticate);
router.use(requireRole('RESPONDENT'));

// GET /api/available-surveys — list published surveys for respondent
router.get('/', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const surveys = await responseService.listAvailableSurveys();
    res.status(200).json(surveys);
  } catch (err) {
    next(err);
  }
});

// GET /api/available-surveys/:id — get survey form for answering
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const survey = await responseService.getAvailableSurvey(req.params.id);
    res.status(200).json(survey);
  } catch (err) {
    next(err);
  }
});

export default router;
