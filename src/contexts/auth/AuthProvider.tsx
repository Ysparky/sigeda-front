import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
} from "react";
import { authService } from "../../services/auth.service";
import type {
  LoginCredentials,
  LoginResponse,
  RoleName,
  UserInfo,
} from "../../types/auth.types";
import { useData } from "../data";
import { authReducer, initialState } from "./authReducer";
import type { AuthContextType } from "./types";

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { clearData } = useData();
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Actions
  const setLoading = useCallback((isLoading: boolean) => {
    dispatch({ type: "SET_LOADING", payload: isLoading });
  }, []);

  const setUserInfoError = useCallback((hasError: boolean) => {
    dispatch({ type: "SET_USER_INFO_ERROR", payload: hasError });
  }, []);

  const getRolesFromUserInfo = useCallback((userInfo: UserInfo): RoleName[] => {
    return userInfo.usuario.usuarioRoles.map((ur) => ur.rol.nombre);
  }, []);

  const fetchUserInfo = useCallback(
    async (username: string) => {
      try {
        const userInfo = await authService.getUserInfo(username);
        const roles = getRolesFromUserInfo(userInfo);
        dispatch({
          type: "SET_USER_INFO",
          payload: { userInfo, roles },
        });
        setUserInfoError(false);
      } catch (error) {
        setUserInfoError(true);
        throw error;
      }
    },
    [getRolesFromUserInfo, setUserInfoError]
  );

  const handleAuthStateChange = useCallback(
    async (token: string, username: string) => {
      dispatch({
        type: "SET_AUTH_DATA",
        payload: { token, username },
      });

      try {
        await fetchUserInfo(username);
      } catch {
        // Error already handled in fetchUserInfo
      }
    },
    [fetchUserInfo]
  );

  const loadUserInfo = useCallback(async () => {
    if (!authService.isAuthenticated() || !authService.getStoredUsername()) {
      setLoading(false);
      return;
    }
    if (state.data.userInfo) {
      setLoading(false);
      return;
    }

    try {
      const username = authService.getStoredUsername()!;
      await fetchUserInfo(username);
    } finally {
      setLoading(false);
    }
  }, [state.data.userInfo, fetchUserInfo, setLoading]);

  const retryLoadUserInfo = useCallback(async () => {
    if (!authService.isAuthenticated() || !authService.getStoredUsername()) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setUserInfoError(false);

    try {
      const username = authService.getStoredUsername()!;
      await fetchUserInfo(username);
    } finally {
      setLoading(false);
    }
  }, [fetchUserInfo, setLoading, setUserInfoError]);

  // Initialize auth state from localStorage
  useEffect(() => {
    const initializeAuth = async () => {
      const token = authService.getStoredToken();
      const username = authService.getStoredUsername();

      if (token && username) {
        await handleAuthStateChange(token, username);
      }
      setLoading(false);
    };

    initializeAuth();
  }, [handleAuthStateChange, setLoading]);

  const login = useCallback(
    async (credentials: LoginCredentials): Promise<LoginResponse> => {
      setLoading(true);
      try {
        const response = await authService.login(credentials);
        await handleAuthStateChange(response.token, response.username);
        return response;
      } finally {
        setLoading(false);
      }
    },
    [handleAuthStateChange, setLoading]
  );

  const logout = useCallback(() => {
    setLoading(true);
    try {
      authService.logout();
      dispatch({ type: "CLEAR_AUTH" });
      clearData();
    } finally {
      setLoading(false);
    }
  }, [clearData, setLoading]);

  // Memoized context value
  const value = useMemo(
    () => ({
      ...state.data,
      ...state.ui,
      login,
      logout,
      loadUserInfo,
      retryLoadUserInfo,
    }),
    [state, login, logout, loadUserInfo, retryLoadUserInfo]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// Hook
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
