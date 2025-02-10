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

  // Dispatch actions
  const dispatchActions = useMemo(
    () => ({
      setLoading: (isLoading: boolean) =>
        dispatch({ type: "SET_LOADING", payload: isLoading }),
      setUserInfoError: (hasError: boolean) =>
        dispatch({ type: "SET_USER_INFO_ERROR", payload: hasError }),
      setAuthData: (token: string, refreshToken: string, username: string) =>
        dispatch({
          type: "SET_AUTH_DATA",
          payload: { token, refreshToken, username },
        }),
      setUserInfo: (userInfo: UserInfo, roles: RoleName[]) =>
        dispatch({ type: "SET_USER_INFO", payload: { userInfo, roles } }),
      clearAuth: () => dispatch({ type: "CLEAR_AUTH" }),
    }),
    []
  );

  // User info helpers
  const getRolesFromUserInfo = useCallback((userInfo: UserInfo): RoleName[] => {
    return [userInfo.usuario.rol.nombre];
  }, []);

  const fetchUserInfo = useCallback(
    async (username: string) => {
      try {
        const userInfo = await authService.getUserInfo(username);
        const roles = getRolesFromUserInfo(userInfo);
        dispatchActions.setUserInfo(userInfo, roles);
        dispatchActions.setUserInfoError(false);
      } catch (error) {
        dispatchActions.setUserInfoError(true);
        throw error;
      }
    },
    [getRolesFromUserInfo, dispatchActions]
  );

  // Auth state management
  const handleAuthStateChange = useCallback(
    async (token: string, refreshToken: string, username: string) => {
      dispatchActions.setAuthData(token, refreshToken, username);
      try {
        await fetchUserInfo(username);
      } catch {
        // Error already handled in fetchUserInfo
      }
    },
    [fetchUserInfo, dispatchActions]
  );

  const validateAuthState = useCallback(() => {
    const isValid =
      authService.isAuthenticated() && authService.getStoredUsername();
    if (!isValid) {
      dispatchActions.setLoading(false);
    }
    return isValid;
  }, [dispatchActions]);

  const logout = useCallback(async () => {
    dispatchActions.setLoading(true);
    try {
      await authService.logout();
      dispatchActions.clearAuth();
      clearData();
    } catch (error) {
      console.error("Error during logout:", error);
      // Still clear local state even if server logout fails
      dispatchActions.clearAuth();
      clearData();
    } finally {
      dispatchActions.setLoading(false);
    }
  }, [clearData, dispatchActions]);

  // Token refresh
  const handleTokenRefresh = useCallback(async () => {
    try {
      const response = await authService.refreshToken();
      await handleAuthStateChange(
        response.accessToken,
        response.refreshToken,
        authService.getStoredUsername()!
      );
      return true;
    } catch (error) {
      console.error("Error refreshing token:", error);
      await logout();
      return false;
    }
  }, [handleAuthStateChange, logout]);

  // Initialize auth state
  useEffect(() => {
    const initializeAuth = async () => {
      const token = authService.getStoredToken();
      const refreshToken = authService.getStoredRefreshToken();
      const username = authService.getStoredUsername();

      if (token && refreshToken && username) {
        await handleAuthStateChange(token, refreshToken, username);
      }
      dispatchActions.setLoading(false);
    };

    initializeAuth();
  }, [handleAuthStateChange, dispatchActions]);

  // Setup token refresh interval
  useEffect(() => {
    if (!state.data.isAuthenticated) return;

    // Refresh token 5 minutes before expiry
    const refreshInterval = setInterval(() => {
      handleTokenRefresh();
    }, 24 * 60 * 60 * 1000 - 5 * 60 * 1000); // 24 hours - 5 minutes

    return () => clearInterval(refreshInterval);
  }, [state.data.isAuthenticated, handleTokenRefresh]);

  // Public methods
  const loadUserInfo = useCallback(async () => {
    if (!validateAuthState() || state.data.userInfo) {
      dispatchActions.setLoading(false);
      return;
    }

    try {
      await fetchUserInfo(authService.getStoredUsername()!);
    } finally {
      dispatchActions.setLoading(false);
    }
  }, [state.data.userInfo, fetchUserInfo, validateAuthState, dispatchActions]);

  const retryLoadUserInfo = useCallback(async () => {
    if (!validateAuthState()) return;

    dispatchActions.setLoading(true);
    dispatchActions.setUserInfoError(false);

    try {
      await fetchUserInfo(authService.getStoredUsername()!);
    } finally {
      dispatchActions.setLoading(false);
    }
  }, [fetchUserInfo, validateAuthState, dispatchActions]);

  const login = useCallback(
    async (credentials: LoginCredentials): Promise<LoginResponse> => {
      dispatchActions.setLoading(true);
      try {
        const response = await authService.login(credentials);
        await handleAuthStateChange(
          response.token,
          response.refresh_token,
          response.username
        );
        return response;
      } finally {
        dispatchActions.setLoading(false);
      }
    },
    [handleAuthStateChange, dispatchActions]
  );

  // Context value
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
