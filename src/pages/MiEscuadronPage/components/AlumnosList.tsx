import { useEffect, useState } from "react";
import { LoadingSpinner } from "../../../components/common/LoadingSpinner";
import { useAuth } from "../../../hooks/useAuth";
import { gruposService } from "../../../services/grupos.service";
import { AlumnoCard } from "./AlumnoCard";

interface Alumno {
  aMaterno: string;
  aPaterno: string;
  codigo: string;
  nombre: string;
  idGrupo: number;
  estado: string;
}

interface AlumnosListProps {
  searchTerm: string;
  filter: "all" | "apto" | "orden" | "condicion";
}

export function AlumnosList({ searchTerm, filter }: AlumnosListProps) {
  const { userInfo } = useAuth();
  const [alumnos, setAlumnos] = useState<Alumno[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadAlumnos = async () => {
      if (!userInfo) return;

      try {
        setIsLoading(true);
        setError(null);
        const data = await gruposService.getAlumnosByInstructor(
          userInfo.codigo
        );
        setAlumnos(data);
      } catch (err) {
        setError("Error al cargar los alumnos");
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    loadAlumnos();
  }, [userInfo]);

  const filteredAlumnos = alumnos.filter((alumno) => {
    const matchesSearch =
      `${alumno.nombre} ${alumno.aPaterno} ${alumno.aMaterno}`
        .toLowerCase()
        .includes(searchTerm.toLowerCase());

    if (!matchesSearch) return false;

    switch (filter) {
      case "apto":
        return alumno.estado === "Apto";
      default:
        return true;
    }
  });

  if (isLoading) return <LoadingSpinner />;
  if (error) return <div className="text-red-600">{error}</div>;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {filteredAlumnos.map((alumno) => (
        <AlumnoCard
          key={alumno.codigo}
          alumno={{
            ...alumno,
            orden: "N/A",
            foto: `https://robohash.org/${alumno.codigo}.png?set=set2&size=150x150`,
          }}
          onClick={() => console.log("Clicked:", alumno)}
        />
      ))}
    </div>
  );
}
