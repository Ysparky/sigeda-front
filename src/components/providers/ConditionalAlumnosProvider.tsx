import React from 'react';
import { useAuth } from '../../contexts/auth';
import { AlumnosProvider } from '../../contexts/data/AlumnosContext';
import type { RoleName } from '../../types/auth.types';

interface ConditionalAlumnosProviderProps {
  children: React.ReactNode;
}

export const ConditionalAlumnosProvider: React.FC<ConditionalAlumnosProviderProps> = ({ children }) => {
  const { roles } = useAuth();
  
  // Check if user is an instructor based on their roles
  const isInstructor = roles.includes("Instructor" as RoleName);

  // Only wrap with AlumnosProvider if user is an instructor
  if (isInstructor) {
    return <AlumnosProvider>{children}</AlumnosProvider>;
  }
  
  // Otherwise, just render the children without the provider
  return <>{children}</>;
}; 