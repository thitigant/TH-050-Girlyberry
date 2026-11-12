import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import apiClient, { getErrorMessage } from '../../api/client';
import { SurveyResponse, Survey } from '../../types';
import LoadingSpinner from '../../components/LoadingSpinner';
import ErrorBanner from '../../components/ErrorBanner';

export const ConfirmationPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();

  const [response, setResponse] = useState<SurveyResponse | null>(null);
  const [survey, setSurvey] = useState<Survey | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSubmittedResponse = async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      // Try /api/surveys/:id/responses/me, fallback to /api/surveys/:id/my-response
      let res;
      try {
        res = await apiClient.get(`/surveys/${id}/responses/me`);
      } catch (err: any) {
        if (err.response?.status === 404) {
          res = await apiClient.get(`/surveys/${id}/my-response`);
        } else {
          throw err;
        }
      }

      const resData = res.data?.response || res.data;
      setResponse(resData);

      // Also fetch survey metadata if not populated in response
      if (!resData.survey) {
        try {
          const sRes = await apiClient.get(`/available-surveys/${id}`);
          setSurvey(sRes.data?.survey || sRes.data);
        } catch {
          // Survey questions might already be in response
        }
      }
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubmittedResponse();
  }, [id]);

  if (loading) {
    return <LoadingSpinner delayMs={300} message="Loading your submitted response..." />;
  }

  const surveyTitle = response?.survey?.title || survey?.title || 'Survey';

  return (
    <div className="py-2">
      <nav aria-label="breadcrumb">
        <ol className="breadcrumb mb-3">
          <li className="breadcrumb-item">
            <Link to="/available">Available Surveys</Link>
          </li>
          <li className="breadcrumb-item active" aria-current="page">
            Confirmation
          </li>
        </ol>
      </nav>

      {error && <ErrorBanner message={error} onRetry={fetchSubmittedResponse} />}

      {/* Success banner card */}
      <div className="card shadow-sm border-0 mb-4 bg-success-subtle border-success">
        <div className="card-body p-4 text-center">
          <span className="fs-1 d-block mb-2">🎉</span>
          <h2 className="card-title fw-bold text-success mb-2">Thank You!</h2>
          <p className="card-text text-dark fs-5 mb-1">
            Your response to <strong>{surveyTitle}</strong> has been recorded.
          </p>
          {response?.submittedAt && (
            <p className="text-muted small mb-3">
              Submitted on: {new Date(response.submittedAt).toLocaleString()}
            </p>
          )}
          <Link to="/available" className="btn btn-success fw-semibold px-4">
            ← Back to Available Surveys
          </Link>
        </div>
      </div>

      {/* Submitted Answers Summary */}
      {response && response.answers && response.answers.length > 0 && (
        <div className="card shadow-sm border-0 mb-5">
          <div className="card-header bg-white py-3">
            <h5 className="fw-bold mb-0">Your Submitted Answers</h5>
          </div>
          <div className="card-body p-4">
            <div className="vstack gap-3">
              {response.answers.map((ans, idx) => {
                const questionText = ans.question?.text || `Question ${idx + 1}`;
                let answerDisplay = '—';

                if (ans.selectedOption?.label) {
                  answerDisplay = `Selected: ${ans.selectedOption.label}`;
                } else if (ans.selectedOptionId) {
                  // If question options are populated
                  const opt = ans.question?.options?.find((o) => o.id === ans.selectedOptionId);
                  answerDisplay = opt ? `Selected: ${opt.label}` : `Option ID: ${ans.selectedOptionId}`;
                } else if (ans.ratingValue !== null && ans.ratingValue !== undefined) {
                  answerDisplay = `⭐ ${ans.ratingValue} / 5`;
                } else if (ans.textValue) {
                  answerDisplay = `"${ans.textValue}"`;
                }

                return (
                  <div key={ans.id || idx} className="p-3 border rounded bg-light">
                    <div className="fw-bold text-dark mb-1">{questionText}</div>
                    <div className="text-primary fw-semibold ps-2 border-start border-3 border-primary">
                      {answerDisplay}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ConfirmationPage;
