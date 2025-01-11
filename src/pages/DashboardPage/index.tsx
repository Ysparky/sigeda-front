import { useEffect, useState } from "react";
import { ErrorDisplay } from "../../components/common/ErrorDisplay";
import { LoadingSpinner } from "../../components/common/LoadingSpinner";
import { useData } from "../../contexts/DataContext";
import type { Fase } from "../../services/fases.service";
import { ModulesSection } from "./components/ModulesSection";
import { SubModulesSection } from "./components/SubModulesSection";
import { WelcomeHeader } from "./components/WelcomeHeader";

function DashboardPage() {
  const {
    loadUserInfo,
    loadFases,
    userInfo,
    fases,
    fasesDetail,
    loadFaseDetail,
  } = useData();
  const [selectedFaseId, setSelectedFaseId] = useState<number | null>(null);
  const [isLoadingSubFases, setIsLoadingSubFases] = useState(false);
  const [isLoadingInitial, setIsLoadingInitial] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initializeData = async () => {
      try {
        await Promise.all([loadUserInfo(), loadFases()]);
      } catch (error) {
        setError("Error al cargar los datos iniciales");
      } finally {
        setIsLoadingInitial(false);
      }
    };

    initializeData();
  }, [loadUserInfo, loadFases]);

  const handleFaseClick = async (fase: Fase) => {
    if (selectedFaseId === fase.id) {
      setSelectedFaseId(null);
      return;
    }

    setSelectedFaseId(fase.id);

    try {
      setIsLoadingSubFases(true);
      await loadFaseDetail(fase.id);
    } catch {
      setError("Error al cargar los sub-módulos");
    } finally {
      setIsLoadingSubFases(false);
    }
  };

  if (isLoadingInitial || !userInfo) {
    return <LoadingSpinner />;
  }

  if (error) {
    return (
      <ErrorDisplay
        title="No pudimos cargar los módulos"
        message="Hubo un problema al obtener la información. Por favor, intente nuevamente."
        onRetry={() => window.location.reload()}
        showHeader={true}
      >
        <WelcomeHeader userInfo={userInfo} />
      </ErrorDisplay>
    );
  }

  const selectedFase = selectedFaseId
    ? fasesDetail[selectedFaseId] || fases.find((f) => f.id === selectedFaseId)
    : null;

  return (
    <div className="max-w-6xl mx-auto space-y-8 px-4">
      <WelcomeHeader userInfo={userInfo} />

      <ModulesSection
        fases={fases}
        isLoading={isLoadingInitial}
        selectedFase={selectedFase}
        onFaseClick={handleFaseClick}
      />

      {selectedFase && (
        <SubModulesSection
          fase={selectedFase}
          isLoading={isLoadingSubFases}
          error={error}
        />
      )}
    </div>
  );
}

export default DashboardPage;
