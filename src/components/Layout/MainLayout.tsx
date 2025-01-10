import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

interface MainLayoutProps {
  children: React.ReactNode;
}

function MainLayout({ children }: MainLayoutProps) {
  const navigate = useNavigate();
  const { logout, username } = useAuth();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Navbar */}
      <nav className="bg-[#1e3a8a] text-white">
        <div className="mx-auto px-4">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Link to="/" className="text-xl font-bold">
                SIGEDA
              </Link>
              <div className="ml-10 flex space-x-4">
                <Link to="/modulos" className="px-3 py-2 rounded-md hover:bg-blue-800">
                  Módulos
                </Link>
                <Link to="/estandares" className="px-3 py-2 rounded-md hover:bg-blue-800">
                  Estándares
                </Link>
                <Link to="/reportes" className="px-3 py-2 rounded-md hover:bg-blue-800">
                  Gestionar Reportes
                </Link>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center">
                <span className="px-3 py-2">{username}</span>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center px-3 py-2 hover:bg-blue-800 rounded-md"
              >
                <span>Cerrar sesión</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-grow bg-gray-100">
        <div className="container mx-auto px-4 py-8">
          {children}
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t">
        <div className="container mx-auto px-4 py-4 text-center text-sm text-gray-600">
          SIGEDA 2025, Fuerza Aérea del Perú - Pisco
        </div>
      </footer>
    </div>
  );
}

export default MainLayout; 