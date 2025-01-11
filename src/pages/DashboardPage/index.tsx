import { useAuth } from '../../hooks/useAuth';
import { WelcomeHeader } from './components/WelcomeHeader';
import { ModulesSection } from './components/ModulesSection';
import { SubModulesSection } from './components/SubModulesSection';
import { useFases } from './hooks/useFases';

function DashboardPage() {
  const { username } = useAuth();
  const {
    fases,
    selectedFase,
    isLoadingFases,
    isLoadingSubFases,
    error,
    loadFases,
    handleFaseClick
  } = useFases();

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={loadFases}
            className="px-4 py-2 text-sm text-blue-600 hover:text-blue-800 underline"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 px-4">
      <WelcomeHeader username={username} />
      
      <ModulesSection
        fases={fases}
        isLoading={isLoadingFases}
        selectedFase={selectedFase}
        onFaseClick={handleFaseClick}
      />

      {selectedFase && (
        <SubModulesSection
          fase={selectedFase}
          isLoading={isLoadingSubFases}
        />
      )}
    </div>
  );
}

export default DashboardPage; 