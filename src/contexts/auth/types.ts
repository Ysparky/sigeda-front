import type {
  LoginCredentials,
  LoginResponse,
  RoleName,
  UserInfo,
} from "../../types/auth.types";

export interface AuthState {
  data: {
    isAuthenticated: boolean;
    username: string | null;
    token: string | null;
    userInfo: UserInfo | null;
    roles: RoleName[];
  };
  ui: {
    isLoading: boolean;
    userInfoError: boolean;
  };
}

export type AuthAction =
  | { type: "SET_AUTH_DATA"; payload: { token: string; username: string } }
  | {
      type: "SET_USER_INFO";
      payload: { userInfo: UserInfo; roles: RoleName[] };
    }
  | { type: "SET_LOADING"; payload: boolean }
  | { type: "SET_USER_INFO_ERROR"; payload: boolean }
  | { type: "CLEAR_AUTH" };

export interface AuthContextType {
  // Data
  isAuthenticated: boolean;
  username: string | null;
  token: string | null;
  userInfo: UserInfo | null;
  roles: RoleName[];
  // UI
  isLoading: boolean;
  userInfoError: boolean;
  // Actions
  login: (credentials: LoginCredentials) => Promise<LoginResponse>;
  logout: () => void;
  loadUserInfo: () => Promise<void>;
  retryLoadUserInfo: () => Promise<void>;
}
