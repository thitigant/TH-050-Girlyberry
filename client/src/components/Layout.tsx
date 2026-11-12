import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export const Layout: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [navCollapsed, setNavCollapsed] = useState(true);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const toggleNav = () => {
    setNavCollapsed(!navCollapsed);
  };

  return (
    <div className="min-vh-100 d-flex flex-column bg-light">
      <header>
        <nav className="navbar navbar-expand-lg navbar-dark bg-dark shadow-sm">
          <div className="container">
            <span className="navbar-brand fw-bold">
              📋 Survey & Feedback System
            </span>
            <button
              className="navbar-toggler"
              type="button"
              onClick={toggleNav}
              aria-controls="navbarNav"
              aria-expanded={!navCollapsed}
              aria-label="Toggle navigation"
            >
              <span className="navbar-toggler-icon"></span>
            </button>

            <div className={`collapse navbar-collapse ${navCollapsed ? '' : 'show'}`} id="navbarNav">
              <ul className="navbar-nav me-auto mb-2 mb-lg-0">
                {user?.role === 'SURVEY_OWNER' && (
                  <>
                    <li className="nav-item">
                      <NavLink
                        to="/surveys"
                        end
                        className={({ isActive }) => `nav-link ${isActive ? 'active fw-semibold' : ''}`}
                        onClick={() => setNavCollapsed(true)}
                      >
                        My Surveys
                      </NavLink>
                    </li>
                    <li className="nav-item">
                      <NavLink
                        to="/surveys/new"
                        className={({ isActive }) => `nav-link ${isActive ? 'active fw-semibold' : ''}`}
                        onClick={() => setNavCollapsed(true)}
                      >
                        + Create Survey
                      </NavLink>
                    </li>
                  </>
                )}

                {user?.role === 'RESPONDENT' && (
                  <li className="nav-item">
                    <NavLink
                      to="/available"
                      className={({ isActive }) => `nav-link ${isActive ? 'active fw-semibold' : ''}`}
                      onClick={() => setNavCollapsed(true)}
                    >
                      Available Surveys
                    </NavLink>
                  </li>
                )}
              </ul>

              {user && (
                <div className="d-flex align-items-center gap-3 py-2 py-lg-0">
                  <div className="text-light text-end">
                    <div className="fw-semibold">{user.name}</div>
                    <small className="badge bg-secondary">
                      {user.role === 'SURVEY_OWNER' ? 'Survey Owner' : 'Respondent'}
                    </small>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="btn btn-outline-light btn-sm"
                    type="button"
                  >
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </nav>
      </header>

      <main className="container my-4 flex-grow-1">
        <Outlet />
      </main>

      <footer className="bg-white border-top py-3 text-center text-muted small mt-auto">
        <div className="container">
          Survey & Feedback System &copy; {new Date().getFullYear()} — CPE 334 Theme 10
        </div>
      </footer>
    </div>
  );
};

export default Layout;
