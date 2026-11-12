import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import apiClient from '../api/client';
import LoadingSpinner from '../components/LoadingSpinner';

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { login, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (user) {
      navigate(user.role === 'SURVEY_OWNER' ? '/surveys' : '/available', { replace: true });
      return;
    }

    const params = new URLSearchParams(location.search);
    if (params.get('expired') === 'true') {
      setNotice('Your session has expired. Please log in again.');
    } else {
      const msg = sessionStorage.getItem('auth_message');
      if (msg) {
        setNotice(msg);
        sessionStorage.removeItem('auth_message');
      }
    }
  }, [user, navigate, location]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setNotice(null);

    if (!email.trim() || !password) {
      setError('Please enter both email and password.');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await apiClient.post('/auth/login', {
        email: email.trim(),
        password,
      });

      const { token, user: loggedInUser } = response.data;
      login(token, loggedInUser);

      const from = (location.state as { from?: { pathname: string } })?.from?.pathname;
      if (from && from !== '/login') {
        navigate(from, { replace: true });
      } else {
        navigate(loggedInUser.role === 'SURVEY_OWNER' ? '/surveys' : '/available', { replace: true });
      }
    } catch (err: any) {
      if (err.response?.status === 401) {
        setError('Invalid email or password.');
      } else {
        setError(err.response?.data?.error?.message || 'Login failed. Please check your network and try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container py-5">
      <div className="row justify-content-center">
        <div className="col-12 col-md-8 col-lg-5">
          <div className="card shadow border-0 rounded-3">
            <div className="card-body p-4 p-sm-5">
              <div className="text-center mb-4">
                <span className="fs-1 d-block mb-2">📋</span>
                <h3 className="card-title fw-bold">Sign In</h3>
                <p className="text-muted small">
                  Survey & Feedback System (CPE 334 Theme 10)
                </p>
              </div>

              {notice && (
                <div className="alert alert-warning py-2 text-center small mb-3" role="alert">
                  {notice}
                </div>
              )}

              {error && (
                <div className="alert alert-danger py-2 text-center small mb-3" role="alert">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} noValidate>
                <div className="mb-3">
                  <label htmlFor="emailInput" className="form-label fw-semibold">
                    Email address
                  </label>
                  <input
                    type="email"
                    id="emailInput"
                    className="form-control"
                    placeholder="name@example.test"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={isSubmitting}
                    autoComplete="email"
                  />
                </div>

                <div className="mb-4">
                  <label htmlFor="passwordInput" className="form-label fw-semibold">
                    Password
                  </label>
                  <input
                    type="password"
                    id="passwordInput"
                    className="form-control"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={isSubmitting}
                    autoComplete="current-password"
                  />
                </div>

                <button
                  type="submit"
                  className="btn btn-primary w-100 py-2 fw-semibold"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <LoadingSpinner inline />
                      Signing in...
                    </>
                  ) : (
                    'Sign In'
                  )}
                </button>
              </form>

              <div className="mt-4 pt-3 border-top text-muted small text-center">
                <div><strong>Demo Accounts (seeded):</strong></div>
                <div>Owner: <code>owner1@example.test</code></div>
                <div>Respondent: <code>respondent1@example.test</code></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
