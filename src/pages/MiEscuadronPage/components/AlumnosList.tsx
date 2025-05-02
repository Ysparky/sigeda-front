import { useNavigate } from "react-router-dom";
import { LoadingSpinner } from "../../../components/common/LoadingSpinner";
import { useAlumnos } from "../../../contexts/data/AlumnosContext";
import { AlumnoCard } from "./AlumnoCard";

interface AlumnosListProps {
  searchTerm: string;
  filter: "all" | "apto" | "orden" | "condicion";
}

export function AlumnosList({ searchTerm, filter }: AlumnosListProps) {
  const navigate = useNavigate();
  const { alumnos, isLoading, error, setSelectedAlumnoId } = useAlumnos();


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

  const handleAlumnoClick = (alumno: typeof alumnos[0]) => {
    if (alumno.idGrupo) {
      // Store the selected alumno ID in the context
      setSelectedAlumnoId(alumno.codigo);
      // Navigate to the turnos page
      navigate(`/turnos/instructor?idGrupo=${alumno.idGrupo}&alumno=${alumno.codigo}`);
    } else {
      console.error("No grupo ID available for this alumno:", alumno);
    }
  };

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
          onClick={() => handleAlumnoClick(alumno)}
        />
      ))}
    </div>
  );
}
