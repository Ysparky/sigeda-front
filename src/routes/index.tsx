import { Navigate, Route, Routes } from "react-router-dom";
import ProtectedRoute from "../components/ProtectedRoute";
import { NotFound } from "../components/common/NotFound";
import { useAuth } from "../contexts/auth";
import { useRoles } from "../hooks/useRoles";
import DashboardPage from "../pages/DashboardPage";
import EvaluacionDetallePage from "../pages/EvaluacionDetallePage";
import EvaluacionesPage from "../pages/EvaluacionesPage";
import LoginPage from "../pages/LoginPage";
import MiEscuadronPage from "../pages/MiEscuadronPage";
import TurnosOperacionesPage from "../pages/TurnosOperacionesPage";
import TurnosPage from "../pages/TurnosPage";

// Route path constants to avoid typos
const ROUTES = {
  LOGIN: "/login",
  HOME: "/",
  TURNOS: "/turnos",
  SUBFASE_TURNOS: "/subfase/:subfaseId/turnos",
  SUBFASE_TURNO_EVALUACIONES:
    "/subfase/:subfaseId/turnos/:turnoId/evaluaciones",
  SUBFASE_TURNO_EVALUACION:
    "/subfase/:subfaseId/turnos/:turnoId/evaluaciones/:evaluacionId",
  MI_ESCUADRON: "/mi-escuadron",
} as const;

// Component to handle home route logic
const HomeRoute = () => {
  const { isJefeOperaciones, isInstructor } = useRoles();

  if (isJefeOperaciones) return <Navigate to={ROUTES.TURNOS} replace />;
  if (isInstructor) return <Navigate to={ROUTES.MI_ESCUADRON} replace />;
  return <DashboardPage />;
};

// Component to handle turnos route logic
const TurnosRoute = () => {
  const { isJefeOperaciones } = useRoles();
  return isJefeOperaciones ? <TurnosOperacionesPage /> : <TurnosPage />;
};

const AppRoutes = () => {
  const { isAuthenticated } = useAuth();

  return (
    <Routes>
      {/* Public Routes */}
      <Route
        path={ROUTES.LOGIN}
        element={
          isAuthenticated ? (
            <Navigate to={ROUTES.HOME} replace />
          ) : (
            <LoginPage />
          )
        }
      />

      {/* Protected Routes */}
      <Route
        path={ROUTES.HOME}
        element={
          <ProtectedRoute>
            <HomeRoute />
          </ProtectedRoute>
        }
      />

      <Route
        path={ROUTES.TURNOS}
        element={
          <ProtectedRoute>
            <TurnosRoute />
          </ProtectedRoute>
        }
      />

      <Route
        path={ROUTES.SUBFASE_TURNOS}
        element={
          <ProtectedRoute>
            <TurnosPage />
          </ProtectedRoute>
        }
      />

      <Route
        path={ROUTES.SUBFASE_TURNO_EVALUACIONES}
        element={
          <ProtectedRoute>
            <EvaluacionesPage />
          </ProtectedRoute>
        }
      />

      <Route
        path={ROUTES.SUBFASE_TURNO_EVALUACION}
        element={
          <ProtectedRoute>
            <EvaluacionDetallePage />
          </ProtectedRoute>
        }
      />

      <Route
        path={ROUTES.MI_ESCUADRON}
        element={
          <ProtectedRoute>
            <MiEscuadronPage />
          </ProtectedRoute>
        }
      />

      {/* Catch all route */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

export default AppRoutes;
