import { useState } from "react";
import { RegistrarTurnoModal } from "./RegistrarTurnoModal";

export function TurnosActions() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleSubmit = (turnoData: any) => {
    // TODO: Implement turno creation
    console.log("Creating turno:", turnoData);
    setIsModalOpen(false);
  };

  return (
    <>
      <button
        onClick={() => setIsModalOpen(true)}
        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium 
                 rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 
                 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500
                 transition-colors duration-200"
      >
        <svg
          className="mr-2 h-4 w-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 4v16m8-8H4"
          />
        </svg>
        Nuevo Turno
      </button>

      <RegistrarTurnoModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleSubmit}
      />
    </>
  );
}
