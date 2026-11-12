import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export const ForbiddenPage: React.FC = () => {
  const { user } = useAuth();
  const homePath = user?.role === 'SURVEY_OWNER' ? '/surveys' : '/available';

  return (
    <div className="container py-5 text-center">
      <div className="row justify-content-center">
        <div className="col-md-6">
          <div className="card shadow-sm border-danger">
            <div className="card-body p-5">
              <div className="display-1 text-danger mb-3">403</div>
              <h2 className="card-title fw-bold">Access Denied</h2>
              <p className="card-text text-muted my-3">
                You do not have permission to access this page. This area requires a different user role or authorized ownership.
              </p>
              <Link to={homePath} className="btn btn-primary mt-2">
                Return to Dashboard
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForbiddenPage;
