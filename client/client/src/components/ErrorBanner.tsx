import React from 'react';

interface ErrorBannerProps {
  message?: string;
  onRetry?: () => void;
  onDismiss?: () => void;
}

export const ErrorBanner: React.FC<ErrorBannerProps> = ({
  message = 'An error occurred while communicating with the server. Please try again.',
  onRetry,
  onDismiss,
}) => {
  return (
    <div className="alert alert-danger d-flex align-items-center justify-content-between my-3 shadow-sm" role="alert">
      <div className="d-flex align-items-center">
        <span className="me-2 fs-5" aria-hidden="true">⚠️</span>
        <div>{message}</div>
      </div>
      <div className="d-flex gap-2">
        {onRetry && (
          <button onClick={onRetry} className="btn btn-sm btn-outline-danger" type="button">
            Retry
          </button>
        )}
        {onDismiss && (
          <button
            type="button"
            className="btn-close"
            aria-label="Close"
            onClick={onDismiss}
          />
        )}
      </div>
    </div>
  );
};

export default ErrorBanner;
