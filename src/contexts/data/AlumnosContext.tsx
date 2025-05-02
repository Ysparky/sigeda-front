import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useAuth } from "../auth";
import { gruposService, Alumno } from "../../services/grupos.service";

interface AlumnosContextType {
  alumnos: Alumno[];
  selectedAlumnoId: string | null;
  setSelectedAlumnoId: (id: string | null) => void;
  getAlumnoById: (id: string) => Alumno | undefined;
  isLoading: boolean;
  error: string | null;
  loadAlumnos: () => Promise<void>;
}

const AlumnosContext = createContext<AlumnosContextType | undefined>(undefined);

export const AlumnosProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { userInfo } = useAuth();
  const [alumnos, setAlumnos] = useState<Alumno[]>([]);
  const [selectedAlumnoId, setSelectedAlumnoId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadAlumnos = useCallback(async () => {
    if (!userInfo) return;

    try {
      setIsLoading(true);
      setError(null);
      const data = await gruposService.getAlumnosByInstructor(userInfo.codigo);
      setAlumnos(data);
    } catch (err) {
      setError("Error al cargar los alumnos");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [userInfo]);

  useEffect(() => {
    loadAlumnos();
  }, [loadAlumnos]);

  const getAlumnoById = useCallback(
    (id: string) => {
      return alumnos.find(alumno => alumno.codigo === id);
    },
    [alumnos]
  );

  return (
    <AlumnosContext.Provider
      value={{
        alumnos,
        selectedAlumnoId,
        setSelectedAlumnoId,
        getAlumnoById,
        isLoading,
        error,
        loadAlumnos
      }}
    >
      {children}
    </AlumnosContext.Provider>
  );
};

export const useAlumnos = (): AlumnosContextType => {
  const context = useContext(AlumnosContext);
  if (context === undefined) {
    return {
      alumnos: [],
      selectedAlumnoId: null,
      setSelectedAlumnoId: () => {},
      getAlumnoById: () => undefined,
      isLoading: false,
      error: null,
      loadAlumnos: async () => {}
    };
  }
  return context;
}; 