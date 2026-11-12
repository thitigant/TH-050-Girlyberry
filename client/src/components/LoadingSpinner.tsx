import React, { useState, useEffect } from 'react';

interface LoadingSpinnerProps {
  message?: string;
  delayMs?: number;
  inline?: boolean;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  message = 'Loading...',
  delayMs = 0,
  inline = false,
}) => {
  const [visible, setVisible] = useState(delayMs === 0);

  useEffect(() => {
    if (delayMs <= 0) {
      setVisible(true);
      return;
    }
    const timer = setTimeout(() => {
      setVisible(true);
    }, delayMs);
    return () => clearTimeout(timer);
  }, [delayMs]);

  if (!visible) return null;

  if (inline) {
    return (
      <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true">
        <span className="visually-hidden">Loading...</span>
      </span>
    );
  }

  return (
    <div className="d-flex flex-column align-items-center justify-content-center p-5">
      <div className="spinner-border text-primary mb-3" style={{ width: '3rem', height: '3rem' }} role="status">
        <span className="visually-hidden">Loading...</span>
      </div>
      <p className="text-muted fs-6">{message}</p>
    </div>
  );
};

export default LoadingSpinner;
