import type { DataAction, DataState } from "./types";

export const initialState: DataState = {
  data: {
    fases: [],
    fasesDetail: {},
    subfases: [],
    selectedFaseId: null,
  },
  ui: {
    isLoadingFases: false,
    isLoadingSubFases: false,
    error: null,
  },
};

export function dataReducer(state: DataState, action: DataAction): DataState {
  switch (action.type) {
    case "SET_FASES":
      return {
        ...state,
        data: { ...state.data, fases: action.payload },
      };
    case "SET_FASE_DETAIL":
      return {
        ...state,
        data: {
          ...state.data,
          fasesDetail: {
            ...state.data.fasesDetail,
            [action.payload.id]: action.payload.fase,
          },
        },
      };
    case "SET_SUBFASES":
      return {
        ...state,
        data: { ...state.data, subfases: action.payload },
      };
    case "SET_SELECTED_FASE_ID":
      return {
        ...state,
        data: { ...state.data, selectedFaseId: action.payload },
      };
    case "SET_LOADING_FASES":
      return {
        ...state,
        ui: { ...state.ui, isLoadingFases: action.payload },
      };
    case "SET_LOADING_SUBFASES":
      return {
        ...state,
        ui: { ...state.ui, isLoadingSubFases: action.payload },
      };
    case "SET_ERROR":
      return {
        ...state,
        ui: { ...state.ui, error: action.payload },
      };
    case "CLEAR_DATA":
      return initialState;
    default:
      return state;
  }
}
