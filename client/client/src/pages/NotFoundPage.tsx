import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export const NotFoundPage: React.FC = () => {
  const { user } = useAuth();
  const homePath = user ? (user.role === 'SURVEY_OWNER' ? '/surveys' : '/available') : '/login';

  return (
    <div className="container py-5 text-center">
      <div className="row justify-content-center">
        <div className="col-md-6">
          <div className="card shadow-sm border-0">
            <div className="card-body p-5">
              <div className="display-1 text-secondary mb-3">404</div>
              <h2 className="card-title fw-bold">Page Not Found</h2>
              <p className="card-text text-muted my-3">
                The page or survey resource you are looking for does not exist or has been moved.
              </p>
              <Link to={homePath} className="btn btn-primary mt-2">
                {user ? 'Return to Dashboard' : 'Go to Login'}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotFoundPage;
