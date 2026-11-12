import { z } from 'zod';

const answerSchema = z.object({
  questionId: z.string().uuid(),
  selectedOptionId: z.string().uuid().optional().nullable(),
  ratingValue: z.number().int().min(1).max(5).optional().nullable(),
  textValue: z.string().max(500, 'Text must be at most 500 characters').optional().nullable(),
});

export const submitResponseSchema = z.object({
  answers: z.array(answerSchema).min(1, 'At least one answer is required'),
});

export type SubmitResponseInput = z.infer<typeof submitResponseSchema>;
