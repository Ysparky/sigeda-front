import { useAuth } from "../../hooks/useAuth";
import { WelcomeHeader } from "./components/WelcomeHeader";
import { ModulesSection } from "./components/ModulesSection";
import { SubModulesSection } from "./components/SubModulesSection";
import { useFases } from "./hooks/useFases";
import { LoadingSpinner } from "../../components/common/LoadingSpinner";
import { useEffect } from "react";
import { ErrorDisplay } from "../../components/common/ErrorDisplay";

function DashboardPage() {
  const { userInfo, loadUserInfo } = useAuth();
  const {
    fases,
    selectedFase,
    isLoadingFases,
    isLoadingSubFases,
    fasesError,
    subFasesError,
    loadFases,
    handleFaseClick,
  } = useFases();

  useEffect(() => {
    if (!userInfo) {
      loadUserInfo().catch(console.error);
    }
  }, [userInfo, loadUserInfo]);

  if (!userInfo) {
    return <LoadingSpinner />;
  }

  if (fasesError) {
    return (
      <ErrorDisplay
        title="No pudimos cargar los módulos"
        message="Hubo un problema al obtener la información. Por favor, intente nuevamente."
        onRetry={loadFases}
        showHeader={true}
      >
        <WelcomeHeader userInfo={userInfo} />
      </ErrorDisplay>
    );
  }

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
          error={subFasesError}
        />
      )}
    </div>
  );
}

export default DashboardPage;
