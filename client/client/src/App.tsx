import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import RoleRoute from './components/RoleRoute';
import Layout from './components/Layout';
import LoadingSpinner from './components/LoadingSpinner';

import LoginPage from './pages/LoginPage';
import ForbiddenPage from './pages/ForbiddenPage';
import NotFoundPage from './pages/NotFoundPage';

// Owner pages
import MySurveysPage from './pages/owner/MySurveysPage';
import CreateSurveyPage from './pages/owner/CreateSurveyPage';
import SurveyDetailPage from './pages/owner/SurveyDetailPage';
import SurveyResultsPage from './pages/owner/SurveyResultsPage';

// Respondent pages
import AvailableSurveysPage from './pages/respondent/AvailableSurveysPage';
import FillSurveyPage from './pages/respondent/FillSurveyPage';
import ConfirmationPage from './pages/respondent/ConfirmationPage';

const HomeRedirect: React.FC = () => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingSpinner message="Loading..." />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <Navigate to={user.role === 'SURVEY_OWNER' ? '/surveys' : '/available'} replace />;
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Login Route */}
          <Route path="/login" element={<LoginPage />} />

          {/* Root redirect */}
          <Route path="/" element={<HomeRedirect />} />

          {/* Protected Routes inside App Shell Layout */}
          <Route
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            {/* Owner Routes */}
            <Route
              path="/surveys"
              element={
                <RoleRoute allowedRoles={['SURVEY_OWNER']}>
                  <MySurveysPage />
                </RoleRoute>
              }
            />
            <Route
              path="/surveys/new"
              element={
                <RoleRoute allowedRoles={['SURVEY_OWNER']}>
                  <CreateSurveyPage />
                </RoleRoute>
              }
            />
            <Route
              path="/surveys/:id"
              element={
                <RoleRoute allowedRoles={['SURVEY_OWNER']}>
                  <SurveyDetailPage />
                </RoleRoute>
              }
            />
            <Route
              path="/surveys/:id/results"
              element={
                <RoleRoute allowedRoles={['SURVEY_OWNER']}>
                  <SurveyResultsPage />
                </RoleRoute>
              }
            />

            {/* Respondent Routes */}
            <Route
              path="/available"
              element={
                <RoleRoute allowedRoles={['RESPONDENT']}>
                  <AvailableSurveysPage />
                </RoleRoute>
              }
            />
            <Route
              path="/available/:id"
              element={
                <RoleRoute allowedRoles={['RESPONDENT']}>
                  <FillSurveyPage />
                </RoleRoute>
              }
            />
            <Route
              path="/available/:id/confirmation"
              element={
                <RoleRoute allowedRoles={['RESPONDENT']}>
                  <ConfirmationPage />
                </RoleRoute>
              }
            />
          </Route>

          {/* Error & Fallback Routes */}
          <Route path="/forbidden" element={<ForbiddenPage />} />
          <Route path="/404" element={<NotFoundPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;
