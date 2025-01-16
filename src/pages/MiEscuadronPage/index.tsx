import { useState } from "react";
import { Breadcrumb } from "../../components/common/Breadcrumb";
import { AlumnosList } from "./components/AlumnosList";
import { FilterBar } from "./components/FilterBar";
import { SearchBar } from "./components/SearchBar";

function MiEscuadronPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedFilter, setSelectedFilter] = useState<
    "all" | "apto" | "orden" | "condicion"
  >("all");

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
      <Breadcrumb
        items={[{ label: "Módulos", path: "/" }, { label: "Mi Escuadrón" }]}
      />

      <div className="flex flex-col space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Mi Escuadrón</h1>
          <p className="mt-1 text-sm text-gray-500">
            Gestiona y visualiza el estado de tus alumnos
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex justify-between items-center mb-6">
            <SearchBar value={searchTerm} onChange={setSearchTerm} />
            <FilterBar selected={selectedFilter} onChange={setSelectedFilter} />
          </div>

          <AlumnosList searchTerm={searchTerm} filter={selectedFilter} />
        </div>
      </div>
    </div>
  );
}

export default MiEscuadronPage;
