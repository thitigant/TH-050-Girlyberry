import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import apiClient, { getErrorMessage } from '../../api/client';
import { AvailableSurvey } from '../../types';
import LoadingSpinner from '../../components/LoadingSpinner';
import ErrorBanner from '../../components/ErrorBanner';

export const AvailableSurveysPage: React.FC = () => {
  const [surveys, setSurveys] = useState<AvailableSurvey[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAvailableSurveys = async () => {
    setLoading(true);
    setError(null);
    try {
      // Try /available-surveys first (canonical system-sds.md), fallback to /surveys/active if 404
      let res;
      try {
        res = await apiClient.get('/available-surveys');
      } catch (err: any) {
        if (err.response?.status === 404) {
          res = await apiClient.get('/surveys/active');
        } else {
          throw err;
        }
      }

      const data = Array.isArray(res.data) ? res.data : res.data?.surveys || [];
      setSurveys(data);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAvailableSurveys();
  }, []);

  return (
    <div className="py-2">
      <div className="mb-4">
        <h1 className="h2 fw-bold mb-1">Available Surveys</h1>
        <p className="text-muted mb-0">Browse and participate in surveys open for responses.</p>
      </div>

      {error && <ErrorBanner message={error} onRetry={fetchAvailableSurveys} />}

      {loading ? (
        <LoadingSpinner delayMs={300} message="Checking for available surveys..." />
      ) : surveys.length === 0 ? (
        <div className="card text-center p-5 border-0 shadow-sm bg-white my-4">
          <div className="card-body">
            <span className="fs-1 d-block mb-3">📬</span>
            <h4 className="card-title fw-bold">No Surveys Available</h4>
            <p className="card-text text-muted">
              There are currently no active surveys open for responses. Please check back later!
            </p>
            <button onClick={fetchAvailableSurveys} className="btn btn-outline-primary btn-sm mt-2">
              Refresh List
            </button>
          </div>
        </div>
      ) : (
        <div className="row g-4">
          {surveys.map((survey) => (
            <div key={survey.id} className="col-12 col-md-6 col-lg-4">
              <div className="card h-100 shadow-sm border-0">
                <div className="card-body d-flex flex-column">
                  <div className="d-flex justify-content-between align-items-start mb-2">
                    <span className="badge bg-success">Open</span>
                    {survey.hasResponded && (
                      <span className="badge bg-secondary">Already Answered</span>
                    )}
                  </div>

                  <h5 className="card-title fw-bold">{survey.title}</h5>
                  <p className="card-text text-muted small flex-grow-1">
                    {survey.description || 'No description provided.'}
                  </p>

                  <div className="pt-3 border-top mt-auto">
                    {survey.hasResponded ? (
                      <div className="d-flex gap-2">
                        <Link
                          to={`/available/${survey.id}/confirmation`}
                          className="btn btn-outline-secondary w-100 btn-sm"
                        >
                          View My Response
                        </Link>
                      </div>
                    ) : (
                      <Link
                        to={`/available/${survey.id}`}
                        className="btn btn-primary w-100 fw-semibold"
                      >
                        Start Survey ➔
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

export default AvailableSurveysPage;
