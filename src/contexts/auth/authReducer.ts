import type { AuthState, RoleName, UserInfo } from "../../types/auth.types";

type AuthAction =
  | {
      type: "SET_LOADING";
      payload: boolean;
    }
  | {
      type: "SET_USER_INFO_ERROR";
      payload: boolean;
    }
  | {
      type: "SET_AUTH_DATA";
      payload: {
        token: string;
        refreshToken: string;
        username: string;
      };
    }
  | {
      type: "SET_USER_INFO";
      payload: {
        userInfo: UserInfo;
        roles: RoleName[];
      };
    }
  | {
      type: "CLEAR_AUTH";
    };

interface AuthStateUI {
  isLoading: boolean;
  userInfoError: boolean;
}

export const initialState: {
  data: AuthState;
  ui: AuthStateUI;
} = {
  data: {
    isAuthenticated: false,
    username: null,
    token: null,
    refreshToken: null,
    userInfo: null,
    roles: [],
  },
  ui: {
    isLoading: true,
    userInfoError: false,
  },
};

export function authReducer(
  state: typeof initialState,
  action: AuthAction
): typeof initialState {
  switch (action.type) {
    case "SET_LOADING":
      return {
        ...state,
        ui: {
          ...state.ui,
          isLoading: action.payload,
        },
      };

    case "SET_USER_INFO_ERROR":
      return {
        ...state,
        ui: {
          ...state.ui,
          userInfoError: action.payload,
        },
      };

    case "SET_AUTH_DATA":
      return {
        ...state,
        data: {
          ...state.data,
          isAuthenticated: true,
          token: action.payload.token,
          refreshToken: action.payload.refreshToken,
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

    case "CLEAR_AUTH":
      return {
        ...state,
        data: {
          isAuthenticated: false,
          username: null,
          token: null,
          refreshToken: null,
          userInfo: null,
          roles: [],
        },
      };

    default:
      return state;
  }
}
