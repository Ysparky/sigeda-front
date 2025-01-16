import type { AuthAction, AuthState } from "./types";

export const initialState: AuthState = {
  data: {
    isAuthenticated: false,
    username: null,
    token: null,
    userInfo: null,
    roles: [],
  },
  ui: {
    isLoading: true,
    userInfoError: false,
  },
};

export function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case "SET_AUTH_DATA":
      return {
        ...state,
        data: {
          ...state.data,
          isAuthenticated: true,
          token: action.payload.token,
          username: action.payload.username,
        },
      };
    case "SET_USER_INFO":
      return {
        ...state,
        data: {
          ...state.data,
          userInfo: action.payload.userInfo,
          roles: action.payload.roles,
        },
      };
    case "SET_LOADING":
      return {
        ...state,
        ui: { ...state.ui, isLoading: action.payload },
      };
    case "SET_USER_INFO_ERROR":
      return {
        ...state,
        ui: { ...state.ui, userInfoError: action.payload },
      };
    case "CLEAR_AUTH":
      return initialState;
    default:
      return state;
  }
}
