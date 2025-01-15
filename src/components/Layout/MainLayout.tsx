import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useData } from "../../contexts/DataContext";
import { useAuth } from "../../hooks/useAuth";
import { getFullName } from "../../utils/userUtils";

interface MainLayoutProps {
  children: React.ReactNode;
}

function MainLayout({ children }: MainLayoutProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const { userInfo } = useData();
  const { logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Navbar */}
      <nav className="bg-[#1e3a8a] text-white shadow-lg">
        <div className="mx-auto px-4">
          <div className="flex justify-between items-center h-16">
            {/* Logo and Desktop Navigation */}
            <div className="flex items-center">
              <Link
                to="/"
                className="text-xl font-bold flex items-center space-x-2 transition-transform duration-200 hover:scale-105"
              >
                <span className="text-2xl">✈️</span>
                <span>SIGEDA</span>
              </Link>
            </div>

            {/* User Menu and Mobile Button */}
            <div className="flex items-center space-x-4">
              <div className="hidden md:flex items-center">
                <span className="px-3 py-2 text-gray-100">
                  {getFullName(userInfo)}
                </span>
                <button
                  onClick={handleLogout}
                  className="flex items-center px-3 py-2 rounded-md hover:bg-blue-800/80 transition-colors duration-200"
                >
                  <span>Cerrar sesión</span>
                </button>
              </div>

              {/* Mobile menu button */}
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="md:hidden p-2 rounded-md hover:bg-blue-800/80 focus:outline-none"
              >
                <svg
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  {isMobileMenuOpen ? (
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  ) : (
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 6h16M4 12h16M4 18h16"
                    />
                  )}
                </svg>
              </button>
            </div>
          </div>

          {/* Mobile Navigation */}
          <div
            className={`md:hidden transition-all duration-300 ease-in-out overflow-hidden
                      ${
                        isMobileMenuOpen
                          ? "max-h-96 opacity-100"
                          : "max-h-0 opacity-0"
                      }`}
          >
            <div className="border-t border-blue-800 mt-3 pt-3">
              <div className="px-3 py-2 text-gray-100">
                {getFullName(userInfo)}
              </div>
              <button
                onClick={() => {
                  handleLogout();
                  setIsMobileMenuOpen(false);
                }}
                className="block w-full text-left px-3 py-2 text-gray-100 hover:bg-blue-800/80 rounded-md"
              >
                Cerrar sesión
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-grow bg-gray-100">
        <div className="container mx-auto px-4 py-8 animate-fade-in">
          {children}
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t shadow-md">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-col md:flex-row justify-between items-center text-sm text-gray-600">
            <div className="mb-2 md:mb-0">
              SIGEDA 2025, Fuerza Aérea del Perú - Pisco
            </div>
            <div className="flex space-x-4">
              <Link
                to="/ayuda"
                className="hover:text-blue-600 transition-colors duration-200"
              >
                Ayuda
              </Link>
              <Link
                to="/contacto"
                className="hover:text-blue-600 transition-colors duration-200"
              >
                Contacto
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default MainLayout;
