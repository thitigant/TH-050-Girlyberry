import prisma from '../lib/prisma.js';
import { AppError, ErrorCode } from '../lib/errors.js';
import { CreateSurveyInput } from '../validators/survey.validator.js';
import { SurveyStatus } from '@prisma/client';

export async function createSurvey(ownerId: string, input: CreateSurveyInput) {
  const survey = await prisma.survey.create({
    data: {
      ownerId,
      title: input.title.trim(),
      description: input.description || null,
      status: 'DRAFT',
      responseMode: 'IDENTIFIED',
      questions: {
        create: input.questions.map((q) => ({
          displayOrder: q.displayOrder,
          type: q.type,
          text: q.text,
          isRequired: q.isRequired ?? true,
          options: q.type === 'SINGLE_CHOICE' && q.options
            ? {
                create: q.options.map((label, idx) => ({
                  displayOrder: idx + 1,
                  label,
                })),
              }
            : undefined,
        })),
      },
    },
    include: {
      questions: {
        include: { options: true },
        orderBy: { displayOrder: 'asc' },
      },
    },
  });

  return survey;
}

export async function listSurveys(ownerId: string) {
  return prisma.survey.findMany({
    where: { ownerId },
    include: {
      questions: {
        include: { options: true },
        orderBy: { displayOrder: 'asc' },
      },
      _count: { select: { responses: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
}

export async function getSurvey(surveyId: string, ownerId: string) {
  const survey = await prisma.survey.findFirst({
    where: { id: surveyId, ownerId },
    include: {
      questions: {
        include: { options: true },
        orderBy: { displayOrder: 'asc' },
      },
      _count: { select: { responses: true } },
    },
  });

  if (!survey) {
    throw new AppError(404, ErrorCode.NOT_FOUND, 'Survey not found');
  }

  return survey;
}

export async function publishSurvey(surveyId: string, ownerId: string) {
  const survey = await prisma.survey.findFirst({
    where: { id: surveyId, ownerId },
    include: { questions: true },
  });

  if (!survey) {
    throw new AppError(404, ErrorCode.NOT_FOUND, 'Survey not found');
  }

  if (survey.status !== 'DRAFT') {
    throw new AppError(409, ErrorCode.INVALID_STATE_TRANSITION, `Cannot publish a survey with status ${survey.status}`);
  }

  if (survey.questions.length === 0) {
    throw new AppError(400, ErrorCode.VALIDATION_ERROR, 'Cannot publish a survey without questions');
  }

  return prisma.survey.update({
    where: { id: surveyId },
    data: {
      status: 'PUBLISHED',
      publishedAt: new Date(),
    },
    include: {
      questions: {
        include: { options: true },
        orderBy: { displayOrder: 'asc' },
      },
    },
  });
}

export async function closeSurvey(surveyId: string, ownerId: string) {
  const survey = await prisma.survey.findFirst({
    where: { id: surveyId, ownerId },
  });

  if (!survey) {
    throw new AppError(404, ErrorCode.NOT_FOUND, 'Survey not found');
  }

  if (survey.status !== 'PUBLISHED') {
    throw new AppError(409, ErrorCode.INVALID_STATE_TRANSITION, `Cannot close a survey with status ${survey.status}`);
  }

  return prisma.survey.update({
    where: { id: surveyId },
    data: {
      status: 'CLOSED',
      closedAt: new Date(),
    },
    include: {
      questions: {
        include: { options: true },
        orderBy: { displayOrder: 'asc' },
      },
    },
  });
}

export async function getSurveySummary(surveyId: string, ownerId: string) {
  const survey = await prisma.survey.findFirst({
    where: { id: surveyId, ownerId },
    include: {
      questions: {
        include: {
          options: { orderBy: { displayOrder: 'asc' } },
          answers: {
            include: { response: true },
          },
        },
        orderBy: { displayOrder: 'asc' },
      },
      _count: { select: { responses: true } },
    },
  });

  if (!survey) {
    throw new AppError(404, ErrorCode.NOT_FOUND, 'Survey not found');
  }

  const totalResponses = survey._count.responses;

  const questions = survey.questions.map((q) => {
    const totalAnswers = q.answers.length;

    if (q.type === 'SINGLE_CHOICE') {
      const options = q.options.map((opt) => {
        const count = q.answers.filter((a) => a.selectedOptionId === opt.id).length;
        return {
          optionId: opt.id,
          label: opt.label,
          count,
          percentage: totalAnswers > 0 ? Math.round((count / totalAnswers) * 1000) / 10 : 0,
        };
      });
      return {
        questionId: q.id,
        text: q.text,
        type: q.type,
        totalAnswers,
        options,
      };
    }

    if (q.type === 'RATING') {
      const distribution: Record<string, number> = { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 };
      let sum = 0;
      for (const a of q.answers) {
        if (a.ratingValue !== null) {
          distribution[String(a.ratingValue)] = (distribution[String(a.ratingValue)] || 0) + 1;
          sum += a.ratingValue;
        }
      }
      return {
        questionId: q.id,
        text: q.text,
        type: q.type,
        totalAnswers,
        averageRating: totalAnswers > 0 ? Math.round((sum / totalAnswers) * 10) / 10 : 0,
        distribution,
      };
    }

    // SHORT_TEXT
    return {
      questionId: q.id,
      text: q.text,
      type: q.type,
      totalAnswers,
      textAnswers: q.answers
        .filter((a) => a.textValue !== null)
        .map((a) => a.textValue),
    };
  });

  return {
    surveyId: survey.id,
    title: survey.title,
    status: survey.status,
    totalResponses,
    questions,
  };
}
