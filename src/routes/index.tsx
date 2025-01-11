import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import LoginPage from '../pages/LoginPage';
import DashboardPage from '../pages/DashboardPage';
import TurnosPage from '../pages/TurnosPage';
import ProtectedRoute from '../components/ProtectedRoute';
import { NotFound } from '../components/common/NotFound';

const AppRoutes = () => {
  const { isAuthenticated } = useAuth();

  return (
    <Routes>
      <Route
        path="/login"
        element={
          isAuthenticated ? <Navigate to="/" replace /> : <LoginPage />
        }
      />

      {/* Protected Routes */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        }
      />

      {/* Turnos Route */}
      <Route
        path="/turnos/:subFaseId"
        element={
          <ProtectedRoute>
            <TurnosPage />
          </ProtectedRoute>
        }
      />

      {/* Catch all route - 404 */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

export default AppRoutes; 