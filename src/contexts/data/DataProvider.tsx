import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useReducer,
} from "react";
import { fasesService, type Fase } from "../../services/fases.service";
import { subfasesService } from "../../services/subfases.service";
import { dataReducer, initialState } from "./dataReducer";
import type { DataContextType, ErrorState } from "./types";

const DataContext = createContext<DataContextType | undefined>(undefined);

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(dataReducer, initialState);

  // Actions
  const setError = useCallback((error: ErrorState | null) => {
    dispatch({ type: "SET_ERROR", payload: error });
  }, []);

  const setLoadingFases = useCallback((isLoading: boolean) => {
    dispatch({ type: "SET_LOADING_FASES", payload: isLoading });
  }, []);

  const setLoadingSubFases = useCallback((isLoading: boolean) => {
    dispatch({ type: "SET_LOADING_SUBFASES", payload: isLoading });
  }, []);

  // Core functionality
  const loadFases = useCallback(async () => {
    if (state.data.fases.length > 0) return;

    try {
      setLoadingFases(true);
      setError(null);
      const data = await fasesService.getFases();
      dispatch({ type: "SET_FASES", payload: data });
    } catch (err) {
      setError({
        message: "Error al cargar los módulos",
        type: "fases",
      });
      throw err;
    } finally {
      setLoadingFases(false);
    }
  }, [state.data.fases.length, setLoadingFases, setError]);

  const loadFaseDetail = useCallback(
    async (faseId: number) => {
      if (state.data.fasesDetail[faseId]) return;

      try {
        setLoadingSubFases(true);
        setError(null);
        const faseDetail = await fasesService.getFaseById(faseId);
        dispatch({
          type: "SET_FASE_DETAIL",
          payload: { id: faseId, fase: faseDetail },
        });
      } catch (err) {
        setError({
          message: "Error al cargar los sub-módulos",
          type: "subfases",
        });
        throw err;
      } finally {
        setLoadingSubFases(false);
      }
    },
    [state.data.fasesDetail, setLoadingSubFases, setError]
  );

  const loadSubFases = useCallback(async () => {
    if (state.data.subfases.length > 0) return;

    try {
      const data = await subfasesService.getAssignedSubFases();
      dispatch({ type: "SET_SUBFASES", payload: data });
    } catch (err) {
      console.error("Error loading subfases:", err);
      throw err;
    }
  }, [state.data.subfases.length]);

  // UI handlers
  const handleFaseClick = useCallback(
    async (fase: Fase) => {
      if (state.data.selectedFaseId === fase.id) {
        dispatch({ type: "SET_SELECTED_FASE_ID", payload: null });
        return;
      }

      dispatch({ type: "SET_SELECTED_FASE_ID", payload: fase.id });
      if (!state.data.fasesDetail[fase.id]) {
        await loadFaseDetail(fase.id);
      }
    },
    [state.data.selectedFaseId, state.data.fasesDetail, loadFaseDetail]
  );

  const handleRetryFases = useCallback(async () => {
    try {
      setLoadingFases(true);
      setError(null);
      await loadFases();
    } catch {
      setError({
        message: "Error al cargar los módulos",
        type: "fases",
      });
    } finally {
      setLoadingFases(false);
    }
  }, [loadFases, setLoadingFases, setError]);

  const handleRetrySubFases = useCallback(async () => {
    if (!state.data.selectedFaseId) return;

    try {
      setLoadingSubFases(true);
      setError(null);
      await loadFaseDetail(state.data.selectedFaseId);
    } catch {
      setError({
        message: "Error al cargar los sub-módulos",
        type: "subfases",
      });
    } finally {
      setLoadingSubFases(false);
    }
  }, [state.data.selectedFaseId, loadFaseDetail, setLoadingSubFases, setError]);

  const setSelectedFaseId = useCallback((id: number | null) => {
    dispatch({ type: "SET_SELECTED_FASE_ID", payload: id });
  }, []);

  const clearData = useCallback(() => {
    dispatch({ type: "CLEAR_DATA" });
  }, []);

  // Memoized context value
  const value = useMemo(
    () => ({
      ...state.data,
      ...state.ui,
      loadFases,
      loadFaseDetail,
      clearData,
      loadSubFases,
      setSelectedFaseId,
      handleFaseClick,
      handleRetryFases,
      handleRetrySubFases,
    }),
    [
      state,
      loadFases,
      loadFaseDetail,
      clearData,
      loadSubFases,
      setSelectedFaseId,
      handleFaseClick,
      handleRetryFases,
      handleRetrySubFases,
    ]
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

// Hook
export const useData = () => {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error("useData must be used within a DataProvider");
  }
  return context;
};
