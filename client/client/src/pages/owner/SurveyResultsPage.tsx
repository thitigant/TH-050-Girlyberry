import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import apiClient, { getErrorMessage } from '../../api/client';
import { SurveySummary } from '../../types';
import LoadingSpinner from '../../components/LoadingSpinner';
import ErrorBanner from '../../components/ErrorBanner';

export const SurveyResultsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();

  const [summary, setSummary] = useState<SurveySummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSummary = async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.get(`/surveys/${id}/summary`);
      const data = res.data?.summary || res.data;
      setSummary(data);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, [id]);

  if (loading) {
    return <LoadingSpinner delayMs={300} message="Calculating survey aggregate results..." />;
  }

  if (error || !summary) {
    return (
      <div className="py-2">
        <nav aria-label="breadcrumb">
          <ol className="breadcrumb mb-3">
            <li className="breadcrumb-item">
              <Link to="/surveys">My Surveys</Link>
            </li>
            <li className="breadcrumb-item">
              <Link to={`/surveys/${id}`}>Survey Details</Link>
            </li>
            <li className="breadcrumb-item active" aria-current="page">
              Results
            </li>
          </ol>
        </nav>
        <ErrorBanner message={error || 'Failed to load summary'} onRetry={fetchSummary} />
      </div>
    );
  }

  return (
    <div className="py-2">
      <nav aria-label="breadcrumb">
        <ol className="breadcrumb mb-2">
          <li className="breadcrumb-item">
            <Link to="/surveys">My Surveys</Link>
          </li>
          <li className="breadcrumb-item">
            <Link to={`/surveys/${id}`}>{summary.title}</Link>
          </li>
          <li className="breadcrumb-item active" aria-current="page">
            Aggregate Results
          </li>
        </ol>
      </nav>

      {/* Summary Header */}
      <div className="card shadow-sm border-0 mb-4">
        <div className="card-body p-4">
          <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center gap-3">
            <div>
              <div className="d-flex align-items-center gap-2 mb-1">
                <h1 className="h2 fw-bold mb-0">{summary.title}</h1>
                <span className="badge bg-secondary">{summary.status}</span>
              </div>
              <p className="text-muted small mb-0">
                Aggregate feedback summary (individual response details are protected)
              </p>
            </div>

            <div className="bg-light border rounded px-4 py-2 text-center">
              <div className="display-6 fw-bold text-primary">{summary.totalResponses}</div>
              <div className="small text-muted text-uppercase fw-semibold">Total Responses</div>
            </div>
          </div>
        </div>
      </div>

      {/* Zero Response State */}
      {summary.totalResponses === 0 ? (
        <div className="card text-center p-5 border-0 shadow-sm bg-white my-4">
          <div className="card-body">
            <span className="fs-1 d-block mb-3">📭</span>
            <h4 className="card-title fw-bold">No responses yet.</h4>
            <p className="card-text text-muted mb-4">
              Once respondents submit answers to this published survey, aggregated charts and distributions will appear here.
            </p>
            <Link to={`/surveys/${id}`} className="btn btn-outline-primary">
              Back to Survey Management
            </Link>
          </div>
        </div>
      ) : (
        <div className="vstack gap-4">
          {summary.questions.map((q, qIndex) => (
            <div key={q.questionId || qIndex} className="card shadow-sm border-0">
              <div className="card-header bg-white py-3 d-flex justify-content-between align-items-center">
                <span className="fw-bold">
                  Question {qIndex + 1}: {q.text}
                </span>
                <span className="badge bg-light text-dark border">
                  {q.totalAnswers} response{q.totalAnswers === 1 ? '' : 's'}
                </span>
              </div>
              <div className="card-body p-4">
                {/* SINGLE CHOICE VISUALIZATION */}
                {q.type === 'SINGLE_CHOICE' && (
                  <div>
                    {(!q.options || q.options.length === 0) ? (
                      <p className="text-muted small mb-0">No option data available.</p>
                    ) : (
                      <div className="vstack gap-3">
                        {q.options.map((opt) => {
                          const pct = opt.percentage !== undefined ? Math.round(opt.percentage) : 0;
                          return (
                            <div key={opt.optionId}>
                              <div className="d-flex justify-content-between small fw-semibold mb-1">
                                <span>{opt.label}</span>
                                <span className="text-muted">
                                  {opt.count} vote{opt.count === 1 ? '' : 's'} ({pct}%)
                                </span>
                              </div>
                              <div className="progress" style={{ height: '22px' }}>
                                <div
                                  className="progress-bar bg-primary"
                                  role="progressbar"
                                  style={{ width: `${pct}%` }}
                                  aria-valuenow={pct}
                                  aria-valuemin={0}
                                  aria-valuemax={100}
                                >
                                  {pct > 10 ? `${pct}%` : ''}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* RATING SCALE VISUALIZATION */}
                {q.type === 'RATING' && (
                  <div>
                    <div className="d-flex align-items-center gap-3 mb-4 p-3 bg-light rounded">
                      <div className="display-5 fw-bold text-warning">
                        {q.averageRating !== null && q.averageRating !== undefined
                          ? q.averageRating.toFixed(1)
                          : '0.0'}
                      </div>
                      <div>
                        <div className="fw-semibold">Average Rating</div>
                        <small className="text-muted">Out of 5.0 stars</small>
                      </div>
                    </div>

                    <div className="fw-semibold small text-muted text-uppercase mb-2">Rating Distribution:</div>
                    <div className="vstack gap-2">
                      {[5, 4, 3, 2, 1].map((star) => {
                        const count = q.distribution ? q.distribution[String(star)] || 0 : 0;
                        const pct = q.totalAnswers > 0 ? Math.round((count / q.totalAnswers) * 100) : 0;

                        return (
                          <div key={star} className="d-flex align-items-center gap-2">
                            <span className="small fw-semibold text-nowrap" style={{ width: '60px' }}>
                              {star} ⭐
                            </span>
                            <div className="progress flex-grow-1" style={{ height: '18px' }}>
                              <div
                                className="progress-bar bg-warning text-dark"
                                role="progressbar"
                                style={{ width: `${pct}%` }}
                                aria-valuenow={pct}
                                aria-valuemin={0}
                                aria-valuemax={100}
                              >
                                {pct > 10 ? `${count}` : ''}
                              </div>
                            </div>
                            <span className="small text-muted" style={{ width: '70px', textAlign: 'right' }}>
                              {count} ({pct}%)
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* SHORT TEXT ANSWERS LIST */}
                {q.type === 'SHORT_TEXT' && (
                  <div>
                    {(!q.textAnswers || q.textAnswers.length === 0) ? (
                      <p className="text-muted small mb-0">No text responses submitted.</p>
                    ) : (
                      <div className="list-group list-group-flush border rounded">
                        {q.textAnswers.map((ans, aIdx) => (
                          <div key={aIdx} className="list-group-item py-3">
                            <div className="small text-dark">"{ans}"</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SurveyResultsPage;
