import { z } from 'zod';

const questionOptionSchema = z.string().min(1, 'Option label cannot be empty');

const questionSchema = z.object({
  displayOrder: z.number().int().positive(),
  type: z.enum(['SINGLE_CHOICE', 'RATING', 'SHORT_TEXT']),
  text: z.string().min(1, 'Question text is required'),
  isRequired: z.boolean().default(true),
  options: z.array(questionOptionSchema).optional(),
}).superRefine((data, ctx) => {
  if (data.type === 'SINGLE_CHOICE') {
    if (!data.options || data.options.length < 2 || data.options.length > 10) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Single-choice questions must have 2 to 10 options',
        path: ['options'],
      });
    }
    if (data.options) {
      const unique = new Set(data.options);
      if (unique.size !== data.options.length) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Option labels must be unique',
          path: ['options'],
        });
      }
    }
  }
  if (data.type === 'RATING' && data.options && data.options.length > 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Rating questions should not have options',
      path: ['options'],
    });
  }
});

export const createSurveySchema = z.object({
  title: z.string().min(1, 'Title is required').max(150, 'Title must be at most 150 characters'),
  description: z.string().optional(),
  questions: z.array(questionSchema).min(1, 'At least one question is required').max(30, 'At most 30 questions allowed'),
}).superRefine((data, ctx) => {
  // Validate unique display orders
  const orders = data.questions.map(q => q.displayOrder);
  const uniqueOrders = new Set(orders);
  if (uniqueOrders.size !== orders.length) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Question display orders must be unique',
      path: ['questions'],
    });
  }
});

export type CreateSurveyInput = z.infer<typeof createSurveySchema>;
