import { PrismaClient, Role, SurveyStatus, ResponseMode, QuestionType } from '@prisma/client';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

export async function main() {
  const defaultPassword = process.env.SEED_DEFAULT_PASSWORD || (process.env.NODE_ENV === 'test' ? 'Pass1234!' : undefined);
  if (!defaultPassword) {
    throw new Error('SEED_DEFAULT_PASSWORD environment variable is required');
  }

  const bcryptCost = parseInt(process.env.BCRYPT_COST || '12', 10);
  const passwordHash = await bcrypt.hash(defaultPassword, bcryptCost);

  // 1. Create or upsert Users
  const owner1 = await prisma.user.upsert({
    where: { email: 'owner1@example.test' },
    update: { passwordHash, role: Role.SURVEY_OWNER, isActive: true },
    create: {
      email: 'owner1@example.test',
      name: 'Dr. Alice Smith',
      passwordHash,
      role: Role.SURVEY_OWNER,
      isActive: true,
    },
  });

  const owner2 = await prisma.user.upsert({
    where: { email: 'owner2@example.test' },
    update: { passwordHash, role: Role.SURVEY_OWNER, isActive: true },
    create: {
      email: 'owner2@example.test',
      name: 'Prof. Bob Jones',
      passwordHash,
      role: Role.SURVEY_OWNER,
      isActive: true,
    },
  });

  const respondents: Array<Awaited<ReturnType<typeof prisma.user.upsert>>> = [];
  for (let i = 1; i <= 5; i++) {
    const respondent = await prisma.user.upsert({
      where: { email: `respondent${i}@example.test` },
      update: { passwordHash, role: Role.RESPONDENT, isActive: true },
      create: {
        email: `respondent${i}@example.test`,
        name: `Respondent ${i}`,
        passwordHash,
        role: Role.RESPONDENT,
        isActive: true,
      },
    });
    respondents.push(respondent);
  }

  // 2. Owner 1: Published Survey with 3 question types
  const existingPublished = await prisma.survey.findFirst({
    where: { ownerId: owner1.id, title: 'Course Evaluation 2026' },
  });

  if (!existingPublished) {
    const s1 = await prisma.survey.create({
      data: {
        ownerId: owner1.id,
        title: 'Course Evaluation 2026',
        description: 'Please provide your feedback on the course',
        status: SurveyStatus.PUBLISHED,
        responseMode: ResponseMode.IDENTIFIED,
        publishedAt: new Date(),
        questions: {
          create: [
            {
              displayOrder: 1,
              type: QuestionType.SINGLE_CHOICE,
              text: 'How was the course pace?',
              isRequired: true,
              options: {
                create: [
                  { displayOrder: 1, label: 'Too slow' },
                  { displayOrder: 2, label: 'Just right' },
                  { displayOrder: 3, label: 'Too fast' },
                ],
              },
            },
            {
              displayOrder: 2,
              type: QuestionType.RATING,
              text: 'Rate overall teaching quality',
              isRequired: true,
            },
            {
              displayOrder: 3,
              type: QuestionType.SHORT_TEXT,
              text: 'Any additional suggestions?',
              isRequired: false,
            },
          ],
        },
      },
    });
  }

  // 3. Owner 1: Draft Survey
  const existingDraft = await prisma.survey.findFirst({
    where: { ownerId: owner1.id, title: 'Draft Campus Facilities Survey' },
  });

  if (!existingDraft) {
    await prisma.survey.create({
      data: {
        ownerId: owner1.id,
        title: 'Draft Campus Facilities Survey',
        description: 'Work in progress draft survey',
        status: SurveyStatus.DRAFT,
        responseMode: ResponseMode.IDENTIFIED,
        questions: {
          create: [
            {
              displayOrder: 1,
              type: QuestionType.SINGLE_CHOICE,
              text: 'How clean is the library?',
              isRequired: true,
              options: {
                create: [
                  { displayOrder: 1, label: 'Needs Improvement' },
                  { displayOrder: 2, label: 'Satisfactory' },
                  { displayOrder: 3, label: 'Excellent' },
                ],
              },
            },
          ],
        },
      },
    });
  }

  // 4. Owner 1: Closed Survey with responses
  const existingClosed = await prisma.survey.findFirst({
    where: { ownerId: owner1.id, title: 'Previous Semester Feedback' },
    include: {
      questions: {
        include: { options: true },
      },
    },
  });

  if (!existingClosed) {
    const sClosed = await prisma.survey.create({
      data: {
        ownerId: owner1.id,
        title: 'Previous Semester Feedback',
        description: 'Archived survey for last semester',
        status: SurveyStatus.CLOSED,
        responseMode: ResponseMode.IDENTIFIED,
        publishedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        closedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        questions: {
          create: [
            {
              displayOrder: 1,
              type: QuestionType.SINGLE_CHOICE,
              text: 'Did you enjoy the semester?',
              isRequired: true,
              options: {
                create: [
                  { displayOrder: 1, label: 'Yes' },
                  { displayOrder: 2, label: 'No' },
                ],
              },
            },
            {
              displayOrder: 2,
              type: QuestionType.RATING,
              text: 'Overall satisfaction rating',
              isRequired: true,
            },
            {
              displayOrder: 3,
              type: QuestionType.SHORT_TEXT,
              text: 'Comments',
              isRequired: false,
            },
          ],
        },
      },
      include: {
        questions: {
          include: { options: true },
        },
      },
    });

    // Seed responses for the closed survey
    const q1 = sClosed.questions.find((q) => q.displayOrder === 1)!;
    const q2 = sClosed.questions.find((q) => q.displayOrder === 2)!;
    const q3 = sClosed.questions.find((q) => q.displayOrder === 3)!;
    const optYes = q1.options.find((o) => o.label === 'Yes')!;
    const optNo = q1.options.find((o) => o.label === 'No')!;

    // Respondent 1 response
    await prisma.response.create({
      data: {
        surveyId: sClosed.id,
        respondentId: respondents[0].id,
        submittedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        answers: {
          create: [
            { questionId: q1.id, selectedOptionId: optYes.id },
            { questionId: q2.id, ratingValue: 5 },
            { questionId: q3.id, textValue: 'Had a wonderful time!' },
          ],
        },
      },
    });

    // Respondent 2 response
    await prisma.response.create({
      data: {
        surveyId: sClosed.id,
        respondentId: respondents[1].id,
        submittedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        answers: {
          create: [
            { questionId: q1.id, selectedOptionId: optNo.id },
            { questionId: q2.id, ratingValue: 3 },
            { questionId: q3.id, textValue: 'Could be better.' },
          ],
        },
      },
    });
  }

  // 5. Owner 2: Published survey (for cross-owner tests)
  const existingOwner2Survey = await prisma.survey.findFirst({
    where: { ownerId: owner2.id, title: 'Department Research Survey' },
  });

  if (!existingOwner2Survey) {
    await prisma.survey.create({
      data: {
        ownerId: owner2.id,
        title: 'Department Research Survey',
        description: 'Feedback on department research programs',
        status: SurveyStatus.PUBLISHED,
        responseMode: ResponseMode.IDENTIFIED,
        publishedAt: new Date(),
        questions: {
          create: [
            {
              displayOrder: 1,
              type: QuestionType.SINGLE_CHOICE,
              text: 'Are you interested in graduate studies?',
              isRequired: true,
              options: {
                create: [
                  { displayOrder: 1, label: 'Definitely' },
                  { displayOrder: 2, label: 'Maybe' },
                  { displayOrder: 3, label: 'Not interested' },
                ],
              },
            },
          ],
        },
      },
    });
  }

  console.log('Database seeded successfully.');
}

if (process.env.NODE_ENV !== 'test') {
  main()
    .catch((e) => {
      console.error(e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
