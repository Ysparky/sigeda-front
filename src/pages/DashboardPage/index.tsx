import { useCallback, useEffect, useMemo, useState } from "react";
import { LoadingSpinner } from "../../components/common/LoadingSpinner";
import { UserInfoError } from "../../components/common/UserInfoError";
import { useData } from "../../contexts/DataContext";
import { useAuth } from "../../hooks/useAuth";
import type { Fase } from "../../services/fases.service";
import { ModulesSection } from "./components/ModulesSection";
import { SubModulesSection } from "./components/SubModulesSection";
import { WelcomeHeader } from "./components/WelcomeHeader";

interface ErrorState {
  message: string;
  type: "fases" | "subfases";
}

function DashboardPage() {
  const {
    userInfo,
    userInfoError,
    retryLoadUserInfo,
    isLoading: isLoadingAuth,
  } = useAuth();
  const {
    loadFases,
    fases,
    fasesDetail,
    loadFaseDetail,
    selectedFaseId,
    setSelectedFaseId,
  } = useData();

  const [isLoadingSubFases, setIsLoadingSubFases] = useState(false);
  const [isLoadingFases, setIsLoadingFases] = useState(true);
  const [error, setError] = useState<ErrorState | null>(null);

  // Load initial data including selected fase
  useEffect(() => {
    const initializeData = async () => {
      if (!userInfo) return;

      try {
        setIsLoadingFases(true);
        setError(null);
        await loadFases();

        // If there's a selected fase, load its details
        if (selectedFaseId) {
          setIsLoadingSubFases(true);
          await loadFaseDetail(selectedFaseId);
          setIsLoadingSubFases(false);
        }
      } catch (err) {
        setError({
          message: "Error al cargar los módulos",
          type: "fases",
        });
      } finally {
        setIsLoadingFases(false);
      }
    };

    initializeData();
  }, [userInfo, loadFases, selectedFaseId, loadFaseDetail]);

  // Handle fase click
  const handleFaseClick = useCallback(
    async (fase: Fase) => {
      if (selectedFaseId === fase.id) {
        setSelectedFaseId(null);
        return;
      }

      setSelectedFaseId(fase.id);

      try {
        setIsLoadingSubFases(true);
        setError(null);
        await loadFaseDetail(fase.id);
      } catch {
        setError({
          message: "Error al cargar los sub-módulos",
          type: "subfases",
        });
      } finally {
        setIsLoadingSubFases(false);
      }
    },
    [selectedFaseId, setSelectedFaseId, loadFaseDetail]
  );

  const handleRetryFases = useCallback(async () => {
    try {
      setIsLoadingFases(true);
      setError(null);
      await loadFases();
    } catch {
      setError({
        message: "Error al cargar los módulos",
        type: "fases",
      });
    } finally {
      setIsLoadingFases(false);
    }
  }, [loadFases]);

  const handleRetrySubFases = useCallback(async () => {
    if (!selectedFaseId) return;

    try {
      setIsLoadingSubFases(true);
      setError(null);
      await loadFaseDetail(selectedFaseId);
    } catch {
      setError({
        message: "Error al cargar los sub-módulos",
        type: "subfases",
      });
    } finally {
      setIsLoadingSubFases(false);
    }
  }, [selectedFaseId, loadFaseDetail]);

  // Computed values
  const selectedFase = useMemo(
    () =>
      selectedFaseId
        ? fasesDetail[selectedFaseId] ||
          fases.find((f) => f.id === selectedFaseId)
        : null,
    [selectedFaseId, fasesDetail, fases]
  );

  // Loading states
  if (isLoadingAuth) {
    return <LoadingSpinner />;
  }

  if (userInfoError) {
    return <UserInfoError onRetry={retryLoadUserInfo} />;
  }

  if (!userInfo) {
    return <LoadingSpinner />;
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 px-4">
      <WelcomeHeader userInfo={userInfo} />

      <ModulesSection
        fases={fases}
        isLoading={isLoadingFases}
        selectedFase={selectedFase}
        onFaseClick={handleFaseClick}
        error={error?.type === "fases" ? error.message : null}
        onRetry={handleRetryFases}
      />

      {selectedFase && (
        <SubModulesSection
          fase={selectedFase}
          isLoading={isLoadingSubFases}
          error={error?.type === "subfases" ? error.message : null}
          onRetry={handleRetrySubFases}
        />
      )}
    </div>
  );
}

export default DashboardPage;
