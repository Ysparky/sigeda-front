import { Navigate, Route, Routes } from "react-router-dom";
import ProtectedRoute from "../components/ProtectedRoute";
import { NotFound } from "../components/common/NotFound";
import { useAuth } from "../hooks/useAuth";
import DashboardPage from "../pages/DashboardPage";
import EvaluacionDetallePage from "../pages/EvaluacionDetallePage";
import EvaluacionesPage from "../pages/EvaluacionesPage";
import LoginPage from "../pages/LoginPage";
import TurnosPage from "../pages/TurnosPage";

const AppRoutes = () => {
  const { isAuthenticated } = useAuth();

  return (
    <Routes>
      <Route
        path="/login"
        element={isAuthenticated ? <Navigate to="/" replace /> : <LoginPage />}
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

      <Route
        path="/subfase/:subfaseId/turnos"
        element={
          <ProtectedRoute>
            <TurnosPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/subfase/:subfaseId/turnos/:turnoId/evaluaciones"
        element={
          <ProtectedRoute>
            <EvaluacionesPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/subfase/:subfaseId/turnos/:turnoId/evaluaciones/:evaluacionId"
        element={
          <ProtectedRoute>
            <EvaluacionDetallePage />
          </ProtectedRoute>
        }
      />

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

export default AppRoutes;
