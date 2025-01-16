import type { Fase } from "../../services/fases.service";
import type { SubFase } from "../../services/subfases.service";

export interface ErrorState {
  message: string;
  type: "fases" | "subfases";
}

export interface DataState {
  data: {
    fases: Fase[];
    fasesDetail: Record<number, Fase>;
    subfases: SubFase[];
    selectedFaseId: number | null;
  };
  ui: {
    isLoadingFases: boolean;
    isLoadingSubFases: boolean;
    error: ErrorState | null;
  };
}

export type DataAction =
  | { type: "SET_FASES"; payload: Fase[] }
  | { type: "SET_FASE_DETAIL"; payload: { id: number; fase: Fase } }
  | { type: "SET_SUBFASES"; payload: SubFase[] }
  | { type: "SET_SELECTED_FASE_ID"; payload: number | null }
  | { type: "SET_LOADING_FASES"; payload: boolean }
  | { type: "SET_LOADING_SUBFASES"; payload: boolean }
  | { type: "SET_ERROR"; payload: ErrorState | null }
  | { type: "CLEAR_DATA" };

export interface DataContextType {
  // Data
  fases: Fase[];
  fasesDetail: Record<number, Fase>;
  subfases: SubFase[];
  selectedFaseId: number | null;
  // UI
  isLoadingFases: boolean;
  isLoadingSubFases: boolean;
  error: ErrorState | null;
  // Actions
  loadFases: () => Promise<void>;
  loadFaseDetail: (faseId: number) => Promise<void>;
  clearData: () => void;
  loadSubFases: () => Promise<void>;
  setSelectedFaseId: (id: number | null) => void;
  handleFaseClick: (fase: Fase) => Promise<void>;
  handleRetryFases: () => Promise<void>;
  handleRetrySubFases: () => Promise<void>;
}
