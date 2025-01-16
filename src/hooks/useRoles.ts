import { useMemo } from "react";
import { useAuth } from "../contexts/auth";
import type { RoleName } from "../types/auth.types";

const ROLE_PRIORITY: RoleName[] = [
  "Jefe de Operaciones",
  "Instructor",
  "Alumno",
] as const;

export function useRoles() {
  const { roles } = useAuth();

  const primaryRole = useMemo((): RoleName => {
    return ROLE_PRIORITY.find((role) => roles.includes(role)) || roles[0] || "";
  }, [roles]);

  const hasRole = useMemo(
    () =>
      (role: RoleName): boolean =>
        roles.includes(role),
    [roles]
  );

  const hasAnyRole = useMemo(
    () =>
      (requiredRoles: RoleName[]): boolean =>
        requiredRoles.some((role) => roles.includes(role)),
    [roles]
  );

  return {
    roles,
    hasRole,
    hasAnyRole,
    isJefeOperaciones: primaryRole === "Jefe de Operaciones",
    isInstructor: primaryRole === "Instructor",
    isAlumno: primaryRole === "Alumno",
    primaryRole,
  } as const;
}
