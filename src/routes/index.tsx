import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import LoginPage from '../pages/LoginPage';
import DashboardPage from '../pages/DashboardPage';
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

      {/* Módulos Routes */}
      <Route
        path="/modulos/adaptacion"
        element={
          <ProtectedRoute>
            {/* TODO: Add AdaptacionPage component */}
            <div>Módulo de Adaptación</div>
          </ProtectedRoute>
        }
      />
      <Route
        path="/modulos/operaciones-transportadas"
        element={
          <ProtectedRoute>
            {/* TODO: Add OperacionesTransportadasPage component */}
            <div>Módulo de Operaciones Transportadas</div>
          </ProtectedRoute>
        }
      />
      <Route
        path="/modulos/operaciones-aerotacticas"
        element={
          <ProtectedRoute>
            {/* TODO: Add OperacionesAeroTacticasPage component */}
            <div>Módulo de Operaciones Aero-Tácticas</div>
          </ProtectedRoute>
        }
      />

      {/* Sub-módulos Routes */}
      <Route
        path="/sub-modulos/:subModulo"
        element={
          <ProtectedRoute>
            {/* TODO: Add SubModuloPage component */}
            <div>Sub-módulo</div>
          </ProtectedRoute>
        }
      />

      {/* Catch all route - 404 */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

export default AppRoutes; 