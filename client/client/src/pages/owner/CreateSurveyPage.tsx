import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import apiClient, { getErrorMessage } from '../../api/client';
import { QuestionType, CreateQuestionInput } from '../../types';
import LoadingSpinner from '../../components/LoadingSpinner';
import ErrorBanner from '../../components/ErrorBanner';

interface QuestionFormState {
  id: string; // local temporary id
  type: QuestionType;
  text: string;
  isRequired: boolean;
  options: string[];
}

export const CreateSurveyPage: React.FC = () => {
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [questions, setQuestions] = useState<QuestionFormState[]>([
    {
      id: crypto.randomUUID(),
      type: 'SINGLE_CHOICE',
      text: '',
      isRequired: true,
      options: ['Option 1', 'Option 2'],
    },
  ]);

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const addQuestion = () => {
    if (questions.length >= 30) {
      alert('A survey can contain at most 30 questions.');
      return;
    }
    setQuestions([
      ...questions,
      {
        id: crypto.randomUUID(),
        type: 'SINGLE_CHOICE',
        text: '',
        isRequired: true,
        options: ['Option 1', 'Option 2'],
      },
    ]);
  };

  const removeQuestion = (index: number) => {
    if (questions.length <= 1) {
      alert('A survey must contain at least 1 question.');
      return;
    }
    setQuestions(questions.filter((_, i) => i !== index));
  };

  const updateQuestion = (index: number, updates: Partial<QuestionFormState>) => {
    const updated = [...questions];
    updated[index] = { ...updated[index], ...updates };
    setQuestions(updated);
  };

  const addOption = (qIndex: number) => {
    const q = questions[qIndex];
    if (q.options.length >= 10) {
      alert('Single choice questions can have at most 10 options.');
      return;
    }
    const newOptions = [...q.options, `Option ${q.options.length + 1}`];
    updateQuestion(qIndex, { options: newOptions });
  };

  const removeOption = (qIndex: number, optIndex: number) => {
    const q = questions[qIndex];
    if (q.options.length <= 2) {
      alert('Single choice questions must have at least 2 options.');
      return;
    }
    const newOptions = q.options.filter((_, i) => i !== optIndex);
    updateQuestion(qIndex, { options: newOptions });
  };

  const updateOptionText = (qIndex: number, optIndex: number, text: string) => {
    const q = questions[qIndex];
    const newOptions = [...q.options];
    newOptions[optIndex] = text;
    updateQuestion(qIndex, { options: newOptions });
  };

  const validate = (): boolean => {
    const errors: Record<string, string> = {};

    if (!title.trim()) {
      errors['title'] = 'Title is required (1 to 150 characters).';
    } else if (title.trim().length > 150) {
      errors['title'] = 'Title cannot exceed 150 characters.';
    }

    if (questions.length === 0) {
      errors['questions'] = 'At least 1 question is required.';
    } else if (questions.length > 30) {
      errors['questions'] = 'A survey cannot have more than 30 questions.';
    }

    questions.forEach((q, idx) => {
      const qNum = idx + 1;
      if (!q.text.trim()) {
        errors[`question_${idx}_text`] = `Question ${qNum}: Question text is required.`;
      }

      if (q.type === 'SINGLE_CHOICE') {
        if (q.options.length < 2) {
          errors[`question_${idx}_options`] = `Question ${qNum}: Must have at least 2 options.`;
        } else if (q.options.length > 10) {
          errors[`question_${idx}_options`] = `Question ${qNum}: Cannot exceed 10 options.`;
        }

        const trimmedOptions = q.options.map((o) => o.trim());
        const hasEmpty = trimmedOptions.some((o) => o.length === 0);
        if (hasEmpty) {
          errors[`question_${idx}_options_empty`] = `Question ${qNum}: Options cannot be empty.`;
        }

        const uniqueOptions = new Set(trimmedOptions);
        if (uniqueOptions.size !== trimmedOptions.length) {
          errors[`question_${idx}_options_unique`] = `Question ${qNum}: Option labels must be unique.`;
        }
      }
    });

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);

    if (!validate()) {
      return;
    }

    setIsSubmitting(true);

    const payloadQuestions: CreateQuestionInput[] = questions.map((q, idx) => {
      const item: CreateQuestionInput = {
        displayOrder: idx + 1,
        type: q.type,
        text: q.text.trim(),
        isRequired: q.isRequired,
      };
      if (q.type === 'SINGLE_CHOICE') {
        item.options = q.options.map((opt) => opt.trim());
      }
      return item;
    });

    try {
      const response = await apiClient.post('/surveys', {
        title: title.trim(),
        description: description.trim() || undefined,
        questions: payloadQuestions,
      });

      const createdSurvey = response.data?.survey || response.data;
      navigate(`/surveys/${createdSurvey.id || ''}`, { replace: true });
    } catch (err: any) {
      if (err.response?.data?.error?.details) {
        // Backend validation errors
        const backendErrors: Record<string, string> = {};
        err.response.data.error.details.forEach((d: any) => {
          if (d.field) {
            backendErrors[d.field] = d.rule ? `${d.field}: ${d.rule}` : d.message || 'Validation failed';
          }
        });
        setFieldErrors(backendErrors);
      }
      setServerError(getErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="py-2">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <nav aria-label="breadcrumb">
            <ol className="breadcrumb mb-1">
              <li className="breadcrumb-item">
                <Link to="/surveys">My Surveys</Link>
              </li>
              <li className="breadcrumb-item active" aria-current="page">
                Create Survey
              </li>
            </ol>
          </nav>
          <h1 className="h2 fw-bold mb-0">Create New Survey</h1>
        </div>
      </div>

      {serverError && <ErrorBanner message={serverError} onDismiss={() => setServerError(null)} />}

      {Object.keys(fieldErrors).length > 0 && (
        <div className="alert alert-warning py-2 small mb-4" role="alert">
          <strong>Please correct the following errors before submitting:</strong>
          <ul className="mb-0 mt-1">
            {Object.values(fieldErrors).map((errMsg, i) => (
              <li key={i}>{errMsg}</li>
            ))}
          </ul>
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate>
        {/* Basic Survey Details Card */}
        <div className="card shadow-sm border-0 mb-4">
          <div className="card-header bg-white py-3 fw-bold">1. Survey Details</div>
          <div className="card-body">
            <div className="mb-3">
              <label htmlFor="surveyTitle" className="form-label fw-semibold">
                Survey Title <span className="text-danger">*</span>
              </label>
              <input
                type="text"
                id="surveyTitle"
                maxLength={150}
                className={`form-control ${fieldErrors['title'] ? 'is-invalid' : ''}`}
                placeholder="e.g. Course Evaluation 2026"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={isSubmitting}
                required
              />
              <div className="d-flex justify-content-between">
                {fieldErrors['title'] ? (
                  <div className="invalid-feedback d-block">{fieldErrors['title']}</div>
                ) : (
                  <small className="text-muted">Maximum 150 characters.</small>
                )}
                <small className="text-muted">{title.length}/150</small>
              </div>
            </div>

            <div className="mb-0">
              <label htmlFor="surveyDesc" className="form-label fw-semibold">
                Description (Optional)
              </label>
              <textarea
                id="surveyDesc"
                rows={3}
                className="form-control"
                placeholder="Provide context or instructions for respondents..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={isSubmitting}
              />
            </div>
          </div>
        </div>

        {/* Questions Builder Card */}
        <div className="card shadow-sm border-0 mb-4">
          <div className="card-header bg-white py-3 d-flex justify-content-between align-items-center">
            <span className="fw-bold">2. Questions ({questions.length}/30)</span>
            <button
              type="button"
              className="btn btn-sm btn-outline-primary"
              onClick={addQuestion}
              disabled={isSubmitting || questions.length >= 30}
            >
              + Add Question
            </button>
          </div>
          <div className="card-body p-3 p-md-4">
            {questions.map((q, qIndex) => {
              const qErrorText = fieldErrors[`question_${qIndex}_text`];
              const qOptionsError =
                fieldErrors[`question_${qIndex}_options`] ||
                fieldErrors[`question_${qIndex}_options_empty`] ||
                fieldErrors[`question_${qIndex}_options_unique`];

              return (
                <div key={q.id} className="border rounded-3 p-3 p-md-4 mb-3 bg-light position-relative">
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <h6 className="fw-bold text-primary mb-0">Question {qIndex + 1}</h6>
                    {questions.length > 1 && (
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-danger"
                        onClick={() => removeQuestion(qIndex)}
                        disabled={isSubmitting}
                        title="Delete Question"
                      >
                        Remove
                      </button>
                    )}
                  </div>

                  <div className="row g-3 mb-3">
                    <div className="col-12 col-md-8">
                      <label className="form-label fw-semibold">
                        Question Prompt <span className="text-danger">*</span>
                      </label>
                      <input
                        type="text"
                        className={`form-control bg-white ${qErrorText ? 'is-invalid' : ''}`}
                        placeholder="What would you like to ask?"
                        value={q.text}
                        onChange={(e) => updateQuestion(qIndex, { text: e.target.value })}
                        disabled={isSubmitting}
                      />
                      {qErrorText && <div className="invalid-feedback">{qErrorText}</div>}
                    </div>

                    <div className="col-12 col-sm-6 col-md-4">
                      <label className="form-label fw-semibold">Question Type</label>
                      <select
                        className="form-select bg-white"
                        value={q.type}
                        onChange={(e) =>
                          updateQuestion(qIndex, {
                            type: e.target.value as QuestionType,
                            options:
                              e.target.value === 'SINGLE_CHOICE' && q.options.length < 2
                                ? ['Option 1', 'Option 2']
                                : q.options,
                          })
                        }
                        disabled={isSubmitting}
                      >
                        <option value="SINGLE_CHOICE">Single Choice (Radio)</option>
                        <option value="RATING">Rating Scale (1 to 5)</option>
                        <option value="SHORT_TEXT">Short Text Answer</option>
                      </select>
                    </div>
                  </div>

                  <div className="form-check form-switch mb-3">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      id={`req_${q.id}`}
                      checked={q.isRequired}
                      onChange={(e) => updateQuestion(qIndex, { isRequired: e.target.checked })}
                      disabled={isSubmitting}
                    />
                    <label className="form-check-label fw-semibold" htmlFor={`req_${q.id}`}>
                      Required question
                    </label>
                  </div>

                  {/* Single Choice Options Editor */}
                  {q.type === 'SINGLE_CHOICE' && (
                    <div className="p-3 bg-white rounded border">
                      <div className="d-flex justify-content-between align-items-center mb-2">
                        <label className="form-label fw-semibold mb-0 small text-uppercase text-muted">
                          Options (2 - 10)
                        </label>
                        <button
                          type="button"
                          className="btn btn-sm btn-link text-decoration-none p-0"
                          onClick={() => addOption(qIndex)}
                          disabled={isSubmitting || q.options.length >= 10}
                        >
                          + Add Option
                        </button>
                      </div>

                      {qOptionsError && (
                        <div className="alert alert-danger py-1 small mb-2">{qOptionsError}</div>
                      )}

                      <div className="vstack gap-2">
                        {q.options.map((opt, optIndex) => (
                          <div key={optIndex} className="input-group input-group-sm">
                            <span className="input-group-text bg-light">{optIndex + 1}</span>
                            <input
                              type="text"
                              className="form-control"
                              placeholder={`Option ${optIndex + 1}`}
                              value={opt}
                              onChange={(e) => updateOptionText(qIndex, optIndex, e.target.value)}
                              disabled={isSubmitting}
                            />
                            {q.options.length > 2 && (
                              <button
                                className="btn btn-outline-secondary"
                                type="button"
                                onClick={() => removeOption(qIndex, optIndex)}
                                disabled={isSubmitting}
                                title="Remove option"
                              >
                                ✕
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Rating Info */}
                  {q.type === 'RATING' && (
                    <div className="p-3 bg-white rounded border text-muted small">
                      ⭐ <strong>Rating Scale:</strong> Respondents will rate from 1 (lowest) to 5 (highest).
                    </div>
                  )}

                  {/* Short Text Info */}
                  {q.type === 'SHORT_TEXT' && (
                    <div className="p-3 bg-white rounded border text-muted small">
                      💬 <strong>Text Input:</strong> Respondents can type up to 500 characters.
                    </div>
                  )}
                </div>
              );
            })}

            <div className="text-center mt-3">
              <button
                type="button"
                className="btn btn-outline-primary"
                onClick={addQuestion}
                disabled={isSubmitting || questions.length >= 30}
              >
                + Add Another Question
              </button>
            </div>
          </div>
        </div>

        {/* Submit Actions */}
        <div className="d-flex justify-content-end gap-3 mb-5">
          <Link to="/surveys" className="btn btn-outline-secondary px-4">
            Cancel
          </Link>
          <button
            type="submit"
            className="btn btn-primary px-5 fw-semibold"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <LoadingSpinner inline />
                Creating Survey...
              </>
            ) : (
              'Save as Draft'
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateSurveyPage;
