import { useCallback, useEffect, useState } from "react";
import { useData } from "../contexts/DataContext";
import { authService } from "../services/auth.service";
import {
  AuthState,
  LoginCredentials,
  LoginResponse,
  RoleName,
  UserInfo,
} from "../types/auth.types";
import { AuthContext } from "./AuthContext";

const initialAuthState: AuthState = {
  isAuthenticated: false,
  username: null,
  token: null,
  userInfo: null,
  roles: [],
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { clearData } = useData();
  const [authState, setAuthState] = useState<AuthState>(initialAuthState);
  const [isLoading, setIsLoading] = useState(true);
  const [userInfoError, setUserInfoError] = useState(false);

  const getRolesFromUserInfo = useCallback((userInfo: UserInfo): RoleName[] => {
    return userInfo.usuario.usuarioRoles.map((ur) => ur.rol.nombre);
  }, []);

  const fetchUserInfo = useCallback(
    async (token: string, username: string) => {
      try {
        const userInfo = await authService.getUserInfo(token, username);
        const roles = getRolesFromUserInfo(userInfo);
        setAuthState((prev) => ({ ...prev, userInfo, roles }));
        setUserInfoError(false);
      } catch (error) {
        setUserInfoError(true);
        throw error;
      }
    },
    [getRolesFromUserInfo]
  );

  const handleAuthStateChange = useCallback(
    async (token: string, username: string) => {
      setAuthState((prev) => ({
        ...prev,
        isAuthenticated: true,
        token,
        username,
      }));

      try {
        await fetchUserInfo(token, username);
      } catch {
        // Error already handled in fetchUserInfo
      }
    },
    [fetchUserInfo]
  );

  const loadUserInfo = useCallback(async () => {
    if (!authState.token || !authState.username) {
      setIsLoading(false);
      return;
    }
    if (authState.userInfo) {
      setIsLoading(false);
      return;
    }

    try {
      await fetchUserInfo(authState.token, authState.username);
    } finally {
      setIsLoading(false);
    }
  }, [authState.token, authState.username, authState.userInfo, fetchUserInfo]);

  const retryLoadUserInfo = useCallback(async () => {
    if (!authState.token || !authState.username) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setUserInfoError(false);

    try {
      await fetchUserInfo(authState.token, authState.username);
    } finally {
      setIsLoading(false);
    }
  }, [authState.token, authState.username, fetchUserInfo]);

  // Initialize auth state from localStorage
  useEffect(() => {
    const initializeAuth = async () => {
      const token = localStorage.getItem("auth_token");
      const username = localStorage.getItem("username");

      if (token && username) {
        await handleAuthStateChange(token, username);
      }
      setIsLoading(false);
    };

    initializeAuth();
  }, [handleAuthStateChange]);

  const login = useCallback(
    async (credentials: LoginCredentials): Promise<LoginResponse> => {
      setIsLoading(true);
      try {
        const response = await authService.login(credentials);
        localStorage.setItem("auth_token", response.token);
        localStorage.setItem("username", response.username);
        await handleAuthStateChange(response.token, response.username);
        return response;
      } finally {
        setIsLoading(false);
      }
    },
    [handleAuthStateChange]
  );

  const logout = useCallback(() => {
    setIsLoading(true);
    try {
      localStorage.removeItem("auth_token");
      localStorage.removeItem("username");
      setAuthState(initialAuthState);
      clearData();
      setUserInfoError(false);
    } finally {
      setIsLoading(false);
    }
  }, [clearData]);

  return (
    <AuthContext.Provider
      value={{
        ...authState,
        isLoading,
        login,
        logout,
        loadUserInfo,
        retryLoadUserInfo,
        userInfoError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
