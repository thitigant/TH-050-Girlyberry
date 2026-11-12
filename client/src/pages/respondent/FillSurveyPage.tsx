import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import apiClient, { getErrorMessage } from '../../api/client';
import { Survey, SubmitAnswerInput } from '../../types';
import LoadingSpinner from '../../components/LoadingSpinner';
import ErrorBanner from '../../components/ErrorBanner';

export const FillSurveyPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [survey, setSurvey] = useState<Survey | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({});
  const [ratings, setRatings] = useState<Record<string, number>>({});
  const [textAnswers, setTextAnswers] = useState<Record<string, string>>({});

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [alreadyAnswered, setAlreadyAnswered] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchSurveyForm = async () => {
    if (!id) return;
    setLoading(true);
    setLoadError(null);
    try {
      let res;
      try {
        res = await apiClient.get(`/available-surveys/${id}`);
      } catch (err: any) {
        if (err.response?.status === 404) {
          res = await apiClient.get(`/surveys/${id}/form`);
        } else {
          throw err;
        }
      }

      const data = res.data?.survey || res.data;
      setSurvey(data);
    } catch (err: any) {
      if (err.response?.status === 404) {
        setLoadError('Survey not found or is not currently open for responses.');
      } else {
        setLoadError(getErrorMessage(err));
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSurveyForm();
  }, [id]);

  const validateForm = (): boolean => {
    if (!survey || !survey.questions) return false;

    const errors: Record<string, string> = {};

    survey.questions.forEach((q, idx) => {
      const qNum = idx + 1;

      if (q.type === 'SINGLE_CHOICE') {
        const selected = selectedOptions[q.id];
        if (q.isRequired && !selected) {
          errors[q.id] = `Question ${qNum}: Please select an option.`;
        }
      } else if (q.type === 'RATING') {
        const rating = ratings[q.id];
        if (q.isRequired && (!rating || rating < 1 || rating > 5)) {
          errors[q.id] = `Question ${qNum}: Please provide a rating (1 to 5).`;
        }
      } else if (q.type === 'SHORT_TEXT') {
        const text = textAnswers[q.id]?.trim();
        if (q.isRequired && !text) {
          errors[q.id] = `Question ${qNum}: Please write a response.`;
        } else if (text && text.length > 500) {
          errors[q.id] = `Question ${qNum}: Text response cannot exceed 500 characters.`;
        }
      }
    });

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (!validateForm() || !survey || !survey.questions) {
      return;
    }

    setIsSubmitting(true);

    const answersPayload: SubmitAnswerInput[] = [];

    survey.questions.forEach((q) => {
      if (q.type === 'SINGLE_CHOICE') {
        const optId = selectedOptions[q.id];
        if (optId) {
          answersPayload.push({
            questionId: q.id,
            selectedOptionId: optId,
          });
        }
      } else if (q.type === 'RATING') {
        const rVal = ratings[q.id];
        if (rVal) {
          answersPayload.push({
            questionId: q.id,
            ratingValue: rVal,
          });
        }
      } else if (q.type === 'SHORT_TEXT') {
        const tVal = textAnswers[q.id]?.trim();
        if (tVal) {
          answersPayload.push({
            questionId: q.id,
            textValue: tVal,
          });
        }
      }
    });

    try {
      await apiClient.post(`/surveys/${id}/responses`, {
        answers: answersPayload,
      });

      navigate(`/available/${id}/confirmation`, { replace: true });
    } catch (err: any) {
      const errCode = err.response?.data?.error?.code;

      if (err.response?.status === 409 || errCode === 'DUPLICATE_RESPONSE') {
        setAlreadyAnswered(true);
        setSubmitError('You have already responded to this survey. Each respondent may only submit once.');
      } else if (errCode === 'SURVEY_CLOSED' || errCode === 'SURVEY_NOT_PUBLISHED') {
        setSubmitError('This survey is no longer accepting responses.');
      } else {
        setSubmitError(getErrorMessage(err));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return <LoadingSpinner delayMs={300} message="Loading survey questions..." />;
  }

  if (loadError || !survey) {
    return (
      <div className="py-2">
        <ErrorBanner message={loadError || 'Unable to open survey'} onRetry={fetchSurveyForm} />
        <div className="text-center mt-4">
          <Link to="/available" className="btn btn-outline-primary">
            Back to Available Surveys
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="py-2">
      <nav aria-label="breadcrumb">
        <ol className="breadcrumb mb-2">
          <li className="breadcrumb-item">
            <Link to="/available">Available Surveys</Link>
          </li>
          <li className="breadcrumb-item active" aria-current="page">
            {survey.title}
          </li>
        </ol>
      </nav>

      <div className="card shadow-sm border-0 mb-4">
        <div className="card-body p-4">
          <div className="d-flex justify-content-between align-items-start mb-2">
            <h1 className="h3 fw-bold mb-0">{survey.title}</h1>
            <span className="badge bg-info text-dark">{survey.responseMode}</span>
          </div>
          {survey.description && <p className="text-muted mt-2 mb-0">{survey.description}</p>}
        </div>
      </div>

      {submitError && (
        <div className="alert alert-danger shadow-sm mb-4" role="alert">
          <div className="d-flex justify-content-between align-items-center">
            <span>{submitError}</span>
            {alreadyAnswered && (
              <Link to={`/available/${id}/confirmation`} className="btn btn-sm btn-outline-danger ms-3">
                View My Submitted Response
              </Link>
            )}
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate>
        <div className="vstack gap-4 mb-4">
          {survey.questions?.map((q, idx) => {
            const errorMsg = fieldErrors[q.id];

            return (
              <div
                key={q.id}
                className={`card shadow-sm border-0 ${errorMsg ? 'border-danger' : ''}`}
              >
                <div className="card-body p-4">
                  <div className="d-flex justify-content-between align-items-start mb-3">
                    <h5 className="fw-bold mb-0">
                      {idx + 1}. {q.text}{' '}
                      {q.isRequired && <span className="text-danger">*</span>}
                    </h5>
                    {q.isRequired ? (
                      <span className="badge bg-danger-subtle text-danger border border-danger-subtle">
                        Required
                      </span>
                    ) : (
                      <span className="badge bg-light text-muted border">Optional</span>
                    )}
                  </div>

                  {errorMsg && (
                    <div className="alert alert-danger py-1 px-2 small mb-3">{errorMsg}</div>
                  )}

                  {q.type === 'SINGLE_CHOICE' && (
                    <div className="vstack gap-2">
                      {q.options?.map((opt) => (
                        <div key={opt.id} className="form-check">
                          <input
                            className="form-check-input"
                            type="radio"
                            name={`question_${q.id}`}
                            id={`opt_${opt.id}`}
                            value={opt.id}
                            checked={selectedOptions[q.id] === opt.id}
                            onChange={() => {
                              setSelectedOptions({ ...selectedOptions, [q.id]: opt.id });
                              if (fieldErrors[q.id]) {
                                const newErrors = { ...fieldErrors };
                                delete newErrors[q.id];
                                setFieldErrors(newErrors);
                              }
                            }}
                            disabled={isSubmitting}
                          />
                          <label className="form-check-label" htmlFor={`opt_${opt.id}`}>
                            {opt.label}
                          </label>
                        </div>
                      ))}
                    </div>
                  )}

                  {q.type === 'RATING' && (
                    <div>
                      <div className="btn-group d-flex flex-wrap gap-2" role="group" aria-label="Rating 1 to 5">
                        {[1, 2, 3, 4, 5].map((star) => {
                          const isSelected = ratings[q.id] === star;
                          return (
                            <button
                              key={star}
                              type="button"
                              className={`btn px-3 py-2 flex-grow-1 ${
                                isSelected ? 'btn-warning text-dark fw-bold' : 'btn-outline-secondary'
                              }`}
                              onClick={() => {
                                setRatings({ ...ratings, [q.id]: star });
                                if (fieldErrors[q.id]) {
                                  const newErrors = { ...fieldErrors };
                                  delete newErrors[q.id];
                                  setFieldErrors(newErrors);
                                }
                              }}
                              disabled={isSubmitting}
                            >
                              ⭐ {star}
                            </button>
                          );
                        })}
                      </div>
                      <div className="d-flex justify-content-between text-muted small mt-2">
                        <span>1 = Poor / Strongly Disagree</span>
                        <span>5 = Excellent / Strongly Agree</span>
                      </div>
                    </div>
                  )}

                  {q.type === 'SHORT_TEXT' && (
                    <div>
                      <textarea
                        className="form-control"
                        rows={3}
                        maxLength={500}
                        placeholder="Type your response here (max 500 characters)..."
                        value={textAnswers[q.id] || ''}
                        onChange={(e) => {
                          setTextAnswers({ ...textAnswers, [q.id]: e.target.value });
                          if (fieldErrors[q.id]) {
                            const newErrors = { ...fieldErrors };
                            delete newErrors[q.id];
                            setFieldErrors(newErrors);
                          }
                        }}
                        disabled={isSubmitting}
                      />
                      <div className="text-end small text-muted mt-1">
                        {(textAnswers[q.id] || '').length}/500
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="d-flex justify-content-between align-items-center mb-5">
          <Link to="/available" className="btn btn-outline-secondary">
            Cancel
          </Link>
          <button
            type="submit"
            className="btn btn-primary px-5 py-2 fw-semibold"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <LoadingSpinner inline /> Submitting...
              </>
            ) : (
              'Submit Response'
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default FillSurveyPage;
