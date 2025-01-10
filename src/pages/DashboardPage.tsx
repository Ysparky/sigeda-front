import React from 'react';
import { Link } from 'react-router-dom';

interface ModuleCardProps {
  icon: React.ReactNode;
  title: string;
  to: string;
}

const ModuleCard = ({ icon, title, to }: ModuleCardProps) => (
  <Link
    to={to}
    className="bg-white p-8 rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200 flex flex-col items-center justify-center space-y-4"
  >
    <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center text-green-600">
      {icon}
    </div>
    <h3 className="text-lg font-medium text-gray-900 text-center">{title}</h3>
  </Link>
);

function DashboardPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Hola, Tomas</h1>
        <p className="text-gray-600">Que bueno verte por aquí.</p>
      </div>

      <div className="w-full max-w-2xl">
        <div className="relative">
          <input
            type="text"
            placeholder="¿Que necesitas? Ej: Nombre de Módulo o Sub-Módulo"
            className="w-full px-4 py-2 pl-10 pr-4 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>
      </div>

      <div>
        <h2 className="text-2xl font-semibold text-green-600 mb-6">¿Que módulo estás buscando?</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <ModuleCard
            icon={<span className="text-2xl">📋</span>}
            title="Adaptación"
            to="/modulos/adaptacion"
          />
          <ModuleCard
            icon={<span className="text-2xl">🏢</span>}
            title="Operaciones Transportadas"
            to="/modulos/operaciones-transportadas"
          />
          <ModuleCard
            icon={<span className="text-2xl">🎓</span>}
            title="Operaciones Aero-Tácticas"
            to="/modulos/operaciones-aerotacticas"
          />
        </div>
      </div>

      <div>
        <h2 className="text-2xl font-semibold text-green-600 mb-6">¿Que sub-módulo?</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <ModuleCard
            icon={<span className="text-2xl">📞</span>}
            title="Contacto"
            to="/sub-modulos/contacto"
          />
          <ModuleCard
            icon={<span className="text-2xl">🧭</span>}
            title="Navegación"
            to="/sub-modulos/navegacion"
          />
          <ModuleCard
            icon={<span className="text-2xl">🎯</span>}
            title="Instrumentos"
            to="/sub-modulos/instrumentos"
          />
          <ModuleCard
            icon={<span className="text-2xl">📝</span>}
            title="Campos Extraños"
            to="/sub-modulos/campos-extranos"
          />
          <ModuleCard
            icon={<span className="text-2xl">📚</span>}
            title="Formación"
            to="/sub-modulos/formacion"
          />
        </div>
      </div>
    </div>
  );
}

export default DashboardPage; 