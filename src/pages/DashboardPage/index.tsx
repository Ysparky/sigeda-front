import { useEffect, useState } from "react";
import { ErrorDisplay } from "../../components/common/ErrorDisplay";
import { LoadingSpinner } from "../../components/common/LoadingSpinner";
import { UserInfoError } from "../../components/common/UserInfoError";
import { useData } from "../../contexts/DataContext";
import { useAuth } from "../../hooks/useAuth";
import type { Fase } from "../../services/fases.service";
import { ModulesSection } from "./components/ModulesSection";
import { SubModulesSection } from "./components/SubModulesSection";
import { WelcomeHeader } from "./components/WelcomeHeader";

function DashboardPage() {
  const {
    userInfo,
    userInfoError,
    retryLoadUserInfo,
    isLoading: isLoadingAuth,
  } = useAuth();
  const { loadFases, fases, fasesDetail, loadFaseDetail } = useData();
  const [selectedFaseId, setSelectedFaseId] = useState<number | null>(null);
  const [isLoadingSubFases, setIsLoadingSubFases] = useState(false);
  const [isLoadingFases, setIsLoadingFases] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initializeData = async () => {
      if (!userInfo) return; // Wait for user info before loading fases

      try {
        await loadFases();
      } catch {
        setError("Error al cargar los módulos");
      } finally {
        setIsLoadingFases(false);
      }
    };

    initializeData();
  }, [userInfo, loadFases]);

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

  const handleRetry = async () => {
    setError(null);
    setIsLoadingFases(true);
    try {
      await loadFases();
    } catch {
      setError("Error al cargar los módulos");
    } finally {
      setIsLoadingFases(false);
    }
  };

  if (isLoadingAuth) {
    return <LoadingSpinner />;
  }

  if (userInfoError) {
    return <UserInfoError onRetry={retryLoadUserInfo} />;
  }

  if (!userInfo) {
    return <LoadingSpinner />;
  }

  if (error) {
    return (
      <ErrorDisplay
        title="No pudimos cargar los módulos"
        message="Hubo un problema al obtener la información. Por favor, intente nuevamente."
        onRetry={handleRetry}
        showHeader={false}
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
        isLoading={isLoadingFases}
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
