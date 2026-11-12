import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import apiClient, { getErrorMessage } from '../../api/client';
import { Survey } from '../../types';
import LoadingSpinner from '../../components/LoadingSpinner';
import ErrorBanner from '../../components/ErrorBanner';

export const MySurveysPage: React.FC = () => {
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSurveys = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.get('/surveys');
      // res.data could be array or { surveys: [] }
      const data = Array.isArray(res.data) ? res.data : res.data?.surveys || [];
      setSurveys(data);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSurveys();
  }, []);

  const getStatusBadge = (status: Survey['status']) => {
    switch (status) {
      case 'DRAFT':
        return <span className="badge bg-secondary">Draft</span>;
      case 'PUBLISHED':
        return <span className="badge bg-success">Published</span>;
      case 'CLOSED':
        return <span className="badge bg-dark">Closed</span>;
      default:
        return <span className="badge bg-light text-dark">{status}</span>;
    }
  };

  return (
    <div>
      <div className="d-flex flex-column flex-sm-row justify-content-between align-items-start align-items-sm-center gap-3 mb-4">
        <div>
          <h1 className="h2 fw-bold mb-1">My Surveys</h1>
          <p className="text-muted mb-0">Manage your surveys, monitor statuses, and view feedback summaries.</p>
        </div>
        <Link to="/surveys/new" className="btn btn-primary fw-semibold">
          + Create New Survey
        </Link>
      </div>

      {error && <ErrorBanner message={error} onRetry={fetchSurveys} />}

      {loading ? (
        <LoadingSpinner delayMs={300} message="Loading your surveys..." />
      ) : surveys.length === 0 ? (
        <div className="card text-center p-5 border-dashed border-2 bg-white shadow-sm my-4">
          <div className="card-body">
            <span className="fs-1 d-block mb-3">📝</span>
            <h4 className="card-title fw-bold">No Surveys Yet</h4>
            <p className="card-text text-muted mb-4">
              You have no surveys yet. Create your first survey.
            </p>
            <Link to="/surveys/new" className="btn btn-primary px-4">
              Create Your First Survey
            </Link>
          </div>
        </div>
      ) : (
        <div className="row g-4">
          {surveys.map((survey) => (
            <div key={survey.id} className="col-12 col-md-6 col-lg-4">
              <div className="card h-100 shadow-sm border-0 transition-hover">
                <div className="card-body d-flex flex-column">
                  <div className="d-flex justify-content-between align-items-start mb-2">
                    <span className="small text-muted">
                      {new Date(survey.createdAt).toLocaleDateString()}
                    </span>
                    {getStatusBadge(survey.status)}
                  </div>
                  <h5 className="card-title fw-bold text-truncate" title={survey.title}>
                    {survey.title}
                  </h5>
                  <p className="card-text text-muted small flex-grow-1" style={{ minHeight: '2.5rem' }}>
                    {survey.description
                      ? survey.description.length > 100
                        ? `${survey.description.slice(0, 100)}...`
                        : survey.description
                      : 'No description provided.'}
                  </p>

                  <div className="d-flex gap-2 pt-3 border-top mt-auto">
                    <Link
                      to={`/surveys/${survey.id}`}
                      className="btn btn-sm btn-outline-primary flex-grow-1"
                    >
                      Manage / Details
                    </Link>
                    {(survey.status === 'PUBLISHED' || survey.status === 'CLOSED') && (
                      <Link
                        to={`/surveys/${survey.id}/results`}
                        className="btn btn-sm btn-outline-secondary"
                        title="View aggregate results"
                      >
                        📊 Results
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MySurveysPage;
