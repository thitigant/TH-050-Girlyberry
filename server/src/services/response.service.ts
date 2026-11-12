import prisma from '../lib/prisma.js';
import { AppError, ErrorCode } from '../lib/errors.js';
import { SubmitResponseInput } from '../validators/response.validator.js';
import { Prisma } from '@prisma/client';

export async function listAvailableSurveys() {
  return prisma.survey.findMany({
    where: { status: 'PUBLISHED' },
    select: {
      id: true,
      title: true,
      description: true,
      responseMode: true,
      publishedAt: true,
    },
    orderBy: { publishedAt: 'desc' },
  });
}

export async function getAvailableSurvey(surveyId: string) {
  const survey = await prisma.survey.findFirst({
    where: { id: surveyId, status: 'PUBLISHED' },
    include: {
      questions: {
        include: { options: { orderBy: { displayOrder: 'asc' } } },
        orderBy: { displayOrder: 'asc' },
      },
    },
  });

  if (!survey) {
    throw new AppError(404, ErrorCode.NOT_FOUND, 'Survey not found');
  }

  return survey;
}

export async function submitResponse(surveyId: string, respondentId: string, input: SubmitResponseInput) {
  // Pre-check for duplicate response (BR-01) for early 409 rejection
  const existingResponse = await prisma.response.findUnique({
    where: {
      surveyId_respondentId: {
        surveyId,
        respondentId,
      },
    },
  });

  if (existingResponse) {
    throw new AppError(409, ErrorCode.DUPLICATE_RESPONSE, 'You have already submitted a response to this survey');
  }

  return prisma.$transaction(async (tx) => {
    // Load survey with questions and options
    const survey = await tx.survey.findUnique({
      where: { id: surveyId },
      include: {
        questions: {
          include: { options: true },
        },
      },
    });

    if (!survey) {
      throw new AppError(404, ErrorCode.NOT_FOUND, 'Survey not found');
    }

    if (survey.status !== 'PUBLISHED') {
      if (survey.status === 'CLOSED') {
        throw new AppError(400, ErrorCode.SURVEY_CLOSED, 'This survey is closed');
      }
      throw new AppError(400, ErrorCode.SURVEY_NOT_PUBLISHED, 'This survey is not accepting responses');
    }

    // Build question maps
    const questionMap = new Map(survey.questions.map(q => [q.id, q]));
    const answeredQuestionIds = new Set<string>();
    const validationErrors: Array<{ field: string; rule: string }> = [];

    for (let i = 0; i < input.answers.length; i++) {
      const answer = input.answers[i];
      const question = questionMap.get(answer.questionId);

      if (!question) {
        validationErrors.push({
          field: `answers[${i}].questionId`,
          rule: 'QUESTION_NOT_FOUND',
        });
        continue;
      }

      answeredQuestionIds.add(answer.questionId);

      // Validate answer type matches question type
      switch (question.type) {
        case 'SINGLE_CHOICE': {
          if (!answer.selectedOptionId) {
            if (question.isRequired) {
              validationErrors.push({
                field: `answers[${i}].selectedOptionId`,
                rule: 'REQUIRED_ANSWER',
              });
            }
          } else {
            const validOption = question.options.some(o => o.id === answer.selectedOptionId);
            if (!validOption) {
              validationErrors.push({
                field: `answers[${i}].selectedOptionId`,
                rule: 'INVALID_OPTION',
              });
            }
          }
          break;
        }
        case 'RATING': {
          if (answer.ratingValue === null || answer.ratingValue === undefined) {
            if (question.isRequired) {
              validationErrors.push({
                field: `answers[${i}].ratingValue`,
                rule: 'REQUIRED_ANSWER',
              });
            }
          } else if (answer.ratingValue < 1 || answer.ratingValue > 5) {
            validationErrors.push({
              field: `answers[${i}].ratingValue`,
              rule: 'RATING_OUT_OF_RANGE',
            });
          }
          break;
        }
        case 'SHORT_TEXT': {
          if (!answer.textValue && question.isRequired) {
            validationErrors.push({
              field: `answers[${i}].textValue`,
              rule: 'REQUIRED_ANSWER',
            });
          } else if (answer.textValue && answer.textValue.length > 500) {
            validationErrors.push({
              field: `answers[${i}].textValue`,
              rule: 'TEXT_TOO_LONG',
            });
          }
          break;
        }
      }
    }

    // Check required questions are answered
    for (const [qId, question] of questionMap) {
      if (question.isRequired && !answeredQuestionIds.has(qId)) {
        validationErrors.push({
          field: `answers`,
          rule: 'MISSING_REQUIRED_QUESTION',
        });
      }
    }

    if (validationErrors.length > 0) {
      throw new AppError(422, ErrorCode.VALIDATION_ERROR, 'One or more answers are invalid', validationErrors);
    }

    // Create response with answers
    try {
      const response = await tx.response.create({
        data: {
          surveyId,
          respondentId,
          answers: {
            create: input.answers.map((a) => {
              const question = questionMap.get(a.questionId)!;
              return {
                questionId: a.questionId,
                selectedOptionId: question.type === 'SINGLE_CHOICE' ? (a.selectedOptionId || null) : null,
                ratingValue: question.type === 'RATING' ? (a.ratingValue ?? null) : null,
                textValue: question.type === 'SHORT_TEXT' ? (a.textValue || null) : null,
              };
            }),
          },
        },
        include: {
          answers: {
            include: {
              question: true,
              selectedOption: true,
            },
          },
        },
      });

      return response;
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new AppError(409, ErrorCode.DUPLICATE_RESPONSE, 'You have already responded to this survey');
      }
      throw err;
    }
  });
}

export async function getMyResponse(surveyId: string, respondentId: string) {
  const response = await prisma.response.findFirst({
    where: { surveyId, respondentId },
    include: {
      answers: {
        include: {
          question: true,
          selectedOption: true,
        },
      },
    },
  });

  if (!response) {
    throw new AppError(404, ErrorCode.NOT_FOUND, 'Response not found');
  }

  return response;
}
