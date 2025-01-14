import type { RoleName } from '../types/auth.types';
import { useAuth } from './useAuth';

export const useRoles = () => {
  const { role } = useAuth();

  const hasRole = (checkRole: RoleName) => role === checkRole;

  return {
    role,
    hasRole,
    isAlumno: role === 'Alumno',
    isInstructor: role === 'Instructor',
    isJefeOperaciones: role === 'Jefe de Operaciones',
  };
}; 