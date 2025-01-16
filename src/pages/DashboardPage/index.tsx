import { useEffect, useMemo } from "react";
import { LoadingSpinner } from "../../components/common/LoadingSpinner";
import { UserInfoError } from "../../components/common/UserInfoError";
import { useData } from "../../contexts/data";
import { useAuth } from "../../hooks/useAuth";
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
  const {
    loadFases,
    fases,
    fasesDetail,
    selectedFaseId,
    isLoadingFases,
    isLoadingSubFases,
    error,
    handleFaseClick,
    handleRetryFases,
    handleRetrySubFases,
  } = useData();

  // Load initial data including selected fase
  useEffect(() => {
    if (!userInfo) return;
    loadFases();
  }, [userInfo, loadFases]);

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
