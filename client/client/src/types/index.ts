export type Role = 'SURVEY_OWNER' | 'RESPONDENT';
export type SurveyStatus = 'DRAFT' | 'PUBLISHED' | 'CLOSED';
export type ResponseMode = 'IDENTIFIED' | 'ANONYMOUS';
export type QuestionType = 'SINGLE_CHOICE' | 'RATING' | 'SHORT_TEXT';

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  isActive?: boolean;
}

export interface QuestionOption {
  id: string;
  questionId: string;
  displayOrder: number;
  label: string;
}

export interface Question {
  id: string;
  surveyId: string;
  displayOrder: number;
  type: QuestionType;
  text: string;
  isRequired: boolean;
  options?: QuestionOption[];
}

export interface Survey {
  id: string;
  ownerId: string;
  title: string;
  description: string | null;
  status: SurveyStatus;
  responseMode: ResponseMode;
  publishedAt: string | null;
  closedAt: string | null;
  createdAt: string;
  updatedAt: string;
  questions?: Question[];
  _count?: {
    responses?: number;
    questions?: number;
  };
}

export interface CreateQuestionInput {
  displayOrder: number;
  type: QuestionType;
  text: string;
  isRequired: boolean;
  options?: string[];
}

export interface CreateSurveyInput {
  title: string;
  description?: string;
  questions: CreateQuestionInput[];
}

export interface Answer {
  id?: string;
  responseId?: string;
  questionId: string;
  selectedOptionId?: string | null;
  ratingValue?: number | null;
  textValue?: string | null;
  question?: Question;
  selectedOption?: QuestionOption | null;
}

export interface SurveyResponse {
  id: string;
  surveyId: string;
  respondentId: string;
  submittedAt: string;
  survey?: {
    id: string;
    title: string;
    description: string | null;
  };
  answers: Answer[];
}

export interface SubmitAnswerInput {
  questionId: string;
  selectedOptionId?: string | null;
  ratingValue?: number | null;
  textValue?: string | null;
}

export interface SubmitResponseInput {
  answers: SubmitAnswerInput[];
}

export interface SingleChoiceSummaryOption {
  optionId: string;
  label: string;
  count: number;
  percentage: number;
}

export interface QuestionSummary {
  questionId: string;
  text: string;
  type: QuestionType;
  totalAnswers: number;
  options?: SingleChoiceSummaryOption[];
  averageRating?: number | null;
  distribution?: Record<string, number>;
  textAnswers?: string[];
}

export interface SurveySummary {
  surveyId: string;
  title: string;
  status: SurveyStatus;
  totalResponses: number;
  questions: QuestionSummary[];
}

export interface AvailableSurvey {
  id: string;
  title: string;
  description: string | null;
  responseMode: ResponseMode;
  publishedAt: string | null;
  hasResponded?: boolean;
}

export interface ApiErrorDetail {
  field?: string;
  rule?: string;
  message?: string;
}

export interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
    details?: ApiErrorDetail[];
  };
}
