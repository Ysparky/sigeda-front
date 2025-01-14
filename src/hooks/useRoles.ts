import type { RoleName } from "../types/auth.types";
import { useAuth } from "./useAuth";

const ROLE_HIERARCHY: Record<RoleName, number> = {
  "Jefe de Operaciones": 3,
  Instructor: 2,
  Alumno: 1,
};

export const useRoles = () => {
  const { roles } = useAuth();

  console.log("roles", roles);

  const hasRole = (role: RoleName) => roles.includes(role);
  const hasHigherRole = (baseRole: RoleName) =>
    roles.some((role) => ROLE_HIERARCHY[role] >= ROLE_HIERARCHY[baseRole]);

  return {
    roles,
    hasRole,
    hasHigherRole,
    isAlumno: hasRole("Alumno"),
    isInstructor: hasRole("Instructor"),
    isJefeOperaciones: hasHigherRole("Jefe de Operaciones"),
  };
};
