import { useAuth } from "../contexts/auth";
import type { RoleName } from "../types/auth.types";

export function useRoles() {
  const { roles } = useAuth();

  const getPrimaryRole = (): RoleName => {
    if (roles.includes("Jefe de Operaciones")) {
      return "Jefe de Operaciones";
    }
    if (roles.includes("Instructor")) {
      return "Instructor";
    }
    if (roles.includes("Alumno")) {
      return "Alumno";
    }

    return roles[0] || "";
  };

  const hasRole = (role: RoleName): boolean => {
    return roles.includes(role);
  };

  const hasAnyRole = (requiredRoles: RoleName[]): boolean =>
    requiredRoles.some((role) => hasRole(role));

  return {
    roles,
    hasRole,
    hasAnyRole,
    isJefeOperaciones: getPrimaryRole() === "Jefe de Operaciones",
    isInstructor: getPrimaryRole() === "Instructor",
    isAlumno: getPrimaryRole() === "Alumno",
    primaryRole: getPrimaryRole(),
  };
}
