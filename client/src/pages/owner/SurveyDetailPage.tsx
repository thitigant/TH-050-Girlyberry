import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import apiClient, { getErrorMessage } from '../../api/client';
import { Survey } from '../../types';
import LoadingSpinner from '../../components/LoadingSpinner';
import ErrorBanner from '../../components/ErrorBanner';

export const SurveyDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [survey, setSurvey] = useState<Survey | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const [showPublishModal, setShowPublishModal] = useState(false);
  const [showCloseModal, setShowCloseModal] = useState(false);

  const fetchSurvey = async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.get(`/surveys/${id}`);
      const data = res.data?.survey || res.data;
      setSurvey(data);
    } catch (err: any) {
      if (err.response?.status === 404) {
        navigate('/404', { replace: true });
        return;
      }
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSurvey();
  }, [id]);

  const handlePublish = async () => {
    if (!id) return;
    setActionLoading(true);
    setError(null);
    try {
      await apiClient.post(`/surveys/${id}/publish`);
      setShowPublishModal(false);
      setActionMessage('Survey has been successfully published!');
      await fetchSurvey();
    } catch (err) {
      setError(getErrorMessage(err));
      setShowPublishModal(false);
    } finally {
      setActionLoading(false);
    }
  };

  const handleClose = async () => {
    if (!id) return;
    setActionLoading(true);
    setError(null);
    try {
      await apiClient.post(`/surveys/${id}/close`);
      setShowCloseModal(false);
      setActionMessage('Survey has been closed. It will no longer accept new responses.');
      await fetchSurvey();
    } catch (err) {
      setError(getErrorMessage(err));
      setShowCloseModal(false);
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusBadge = (status: Survey['status']) => {
    switch (status) {
      case 'DRAFT':
        return <span className="badge bg-secondary fs-6">Draft</span>;
      case 'PUBLISHED':
        return <span className="badge bg-success fs-6">Published</span>;
      case 'CLOSED':
        return <span className="badge bg-dark fs-6">Closed</span>;
      default:
        return <span className="badge bg-light text-dark fs-6">{status}</span>;
    }
  };

  if (loading) {
    return <LoadingSpinner delayMs={300} message="Loading survey details..." />;
  }

  if (!survey) {
    return (
      <div>
        {error && <ErrorBanner message={error} onRetry={fetchSurvey} />}
        <div className="text-center py-5">
          <h5>Survey not found</h5>
          <Link to="/surveys" className="btn btn-primary mt-3">
            Back to My Surveys
          </Link>
        </div>
      </div>
    );
  }

  const questionsCount = survey.questions?.length || 0;

  return (
    <div className="py-2">
      <nav aria-label="breadcrumb">
        <ol className="breadcrumb mb-2">
          <li className="breadcrumb-item">
            <Link to="/surveys">My Surveys</Link>
          </li>
          <li className="breadcrumb-item active" aria-current="page">
            {survey.title}
          </li>
        </ol>
      </nav>

      {error && <ErrorBanner message={error} onDismiss={() => setError(null)} />}
      {actionMessage && (
        <div className="alert alert-success alert-dismissible fade show my-3" role="alert">
          {actionMessage}
          <button
            type="button"
            className="btn-close"
            onClick={() => setActionMessage(null)}
            aria-label="Close"
          ></button>
        </div>
      )}

      <div className="card shadow-sm border-0 mb-4">
        <div className="card-body p-4">
          <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center gap-3">
            <div>
              <div className="d-flex align-items-center gap-2 mb-2">
                <h1 className="h2 fw-bold mb-0">{survey.title}</h1>
                {getStatusBadge(survey.status)}
              </div>
              <p className="text-muted mb-0">{survey.description || 'No description provided.'}</p>
            </div>

            <div className="d-flex flex-wrap gap-2">
              {survey.status === 'DRAFT' && (
                <button
                  type="button"
                  className="btn btn-success fw-semibold"
                  onClick={() => setShowPublishModal(true)}
                  disabled={actionLoading || questionsCount === 0}
                  title={questionsCount === 0 ? 'Add questions before publishing' : 'Publish survey'}
                >
                  🚀 Publish Survey
                </button>
              )}

              {survey.status === 'PUBLISHED' && (
                <button
                  type="button"
                  className="btn btn-danger fw-semibold"
                  onClick={() => setShowCloseModal(true)}
                  disabled={actionLoading}
                >
                  🛑 Close Survey
                </button>
              )}

              {(survey.status === 'PUBLISHED' || survey.status === 'CLOSED') && (
                <Link to={`/surveys/${survey.id}/results`} className="btn btn-outline-primary fw-semibold">
                  📊 View Results
                </Link>
              )}
            </div>
          </div>

          <hr className="my-3" />

          <div className="row g-3 text-muted small">
            <div className="col-6 col-md-3">
              <span className="d-block fw-semibold text-dark">Mode:</span>
              <span className="badge bg-info text-dark">{survey.responseMode}</span>
            </div>
            <div className="col-6 col-md-3">
              <span className="d-block fw-semibold text-dark">Created:</span>
              {new Date(survey.createdAt).toLocaleString()}
            </div>
            <div className="col-6 col-md-3">
              <span className="d-block fw-semibold text-dark">Published:</span>
              {survey.publishedAt ? new Date(survey.publishedAt).toLocaleString() : '—'}
            </div>
            <div className="col-6 col-md-3">
              <span className="d-block fw-semibold text-dark">Closed:</span>
              {survey.closedAt ? new Date(survey.closedAt).toLocaleString() : '—'}
            </div>
          </div>
        </div>
      </div>

      <div className="card shadow-sm border-0 mb-4">
        <div className="card-header bg-white py-3">
          <h5 className="fw-bold mb-0">Survey Questions ({questionsCount})</h5>
        </div>
        <div className="card-body p-4">
          {questionsCount === 0 ? (
            <p className="text-muted mb-0">No questions found in this survey.</p>
          ) : (
            <div className="vstack gap-3">
              {survey.questions?.map((q, idx) => (
                <div key={q.id || idx} className="p-3 border rounded bg-light">
                  <div className="d-flex justify-content-between align-items-start mb-2">
                    <span className="fw-bold">
                      {idx + 1}. {q.text}
                    </span>
                    <div className="d-flex gap-2">
                      {q.isRequired ? (
                        <span className="badge bg-danger">Required</span>
                      ) : (
                        <span className="badge bg-secondary">Optional</span>
                      )}
                      <span className="badge bg-primary">{q.type}</span>
                    </div>
                  </div>

                  {q.type === 'SINGLE_CHOICE' && q.options && (
                    <div className="mt-2 ps-3">
                      <div className="text-muted small mb-1">Options:</div>
                      <ul className="list-unstyled mb-0 ps-1">
                        {q.options.map((opt, oIdx) => (
                          <li key={opt.id || oIdx} className="small text-secondary mb-1">
                            🔘 {opt.label}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {q.type === 'RATING' && (
                    <div className="text-muted small mt-2 ps-3">
                      ⭐ Rating 1 to 5
                    </div>
                  )}

                  {q.type === 'SHORT_TEXT' && (
                    <div className="text-muted small mt-2 ps-3">
                      💬 Text input (max 500 characters)
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {showPublishModal && (
        <div className="modal show d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title fw-bold">Publish Survey</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowPublishModal(false)}
                  disabled={actionLoading}
                ></button>
              </div>
              <div className="modal-body">
                <p>
                  Are you sure you want to publish <strong>{survey.title}</strong>?
                </p>
                <div className="alert alert-info small mb-0">
                  Once published, respondents will be able to see and answer this survey.
                  The survey cannot be edited once published.
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  onClick={() => setShowPublishModal(false)}
                  disabled={actionLoading}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-success"
                  onClick={handlePublish}
                  disabled={actionLoading}
                >
                  {actionLoading ? (
                    <>
                      <LoadingSpinner inline /> Publishing...
                    </>
                  ) : (
                    'Confirm Publish'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showCloseModal && (
        <div className="modal show d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title fw-bold text-danger">Close Survey</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowCloseModal(false)}
                  disabled={actionLoading}
                ></button>
              </div>
              <div className="modal-body">
                <p>
                  Are you sure you want to close <strong>{survey.title}</strong>?
                </p>
                <div className="alert alert-warning small mb-0">
                  Closing this survey is permanent. Respondents will no longer be able to submit responses.
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  onClick={() => setShowCloseModal(false)}
                  disabled={actionLoading}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-danger"
                  onClick={handleClose}
                  disabled={actionLoading}
                >
                  {actionLoading ? (
                    <>
                      <LoadingSpinner inline /> Closing...
                    </>
                  ) : (
                    'Confirm Close'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SurveyDetailPage;
