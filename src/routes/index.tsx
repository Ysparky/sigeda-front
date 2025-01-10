import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import LoginPage from '../pages/LoginPage';
import DashboardPage from '../pages/DashboardPage';
import ProtectedRoute from '../components/ProtectedRoute';

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
      <Route
        path="*"
        element={
          <div className="min-h-screen flex items-center justify-center">
            <div className="text-center">
              <h1 className="text-4xl font-bold text-gray-900 mb-4">404</h1>
              <p className="text-gray-600 mb-4">Página no encontrada</p>
              <button
                onClick={() => window.history.back()}
                className="text-blue-600 hover:text-blue-500"
              >
                Volver atrás
              </button>
            </div>
          </div>
        }
      />
    </Routes>
  );
};

export default AppRoutes; 