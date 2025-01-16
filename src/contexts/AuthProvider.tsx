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

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { clearData } = useData();
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    username: null,
    token: null,
    userInfo: null,
    roles: [],
  });
  const [isLoading, setIsLoading] = useState(true);
  const [userInfoError, setUserInfoError] = useState(false);

  const getRolesFromUserInfo = useCallback((userInfo: UserInfo): RoleName[] => {
    return userInfo.usuario.usuarioRoles.map((ur) => ur.rol.nombre);
  }, []);

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
      const userInfo = await authService.getUserInfo(
        authState.token,
        authState.username
      );
      const roles = getRolesFromUserInfo(userInfo);
      setAuthState((prev) => ({ ...prev, userInfo, roles }));
    } catch (_) {
      setUserInfoError(true);
    } finally {
      setIsLoading(false);
    }
  }, [
    authState.token,
    authState.username,
    authState.userInfo,
    getRolesFromUserInfo,
  ]);

  const retryLoadUserInfo = useCallback(async () => {
    if (!authState.token || !authState.username) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setUserInfoError(false);

    try {
      const userInfo = await authService.getUserInfo(
        authState.token,
        authState.username
      );
      const roles = getRolesFromUserInfo(userInfo);
      setAuthState((prev) => ({ ...prev, userInfo, roles }));
    } catch (err) {
      setUserInfoError(true);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [authState.token, authState.username, getRolesFromUserInfo]);

  // Initialize auth state from localStorage
  useEffect(() => {
    const initializeAuth = async () => {
      const token = localStorage.getItem("auth_token");
      const username = localStorage.getItem("username");

      if (token && username) {
        setAuthState((prev) => ({
          ...prev,
          isAuthenticated: true,
          token,
          username,
        }));

        try {
          const userInfo = await authService.getUserInfo(token, username);
          const roles = getRolesFromUserInfo(userInfo);
          setAuthState((prev) => ({ ...prev, userInfo, roles }));
        } catch (_) {
          setUserInfoError(true);
        }
      }
      setIsLoading(false);
    };

    initializeAuth();
  }, [getRolesFromUserInfo]);

  // No need for a separate effect to load user info since we do it in initialization
  useEffect(() => {
    if (
      authState.isAuthenticated &&
      !authState.userInfo &&
      !isLoading &&
      !userInfoError
    ) {
      loadUserInfo().catch(() => {
        setIsLoading(false);
      });
    }
  }, [
    authState.isAuthenticated,
    authState.userInfo,
    isLoading,
    loadUserInfo,
    userInfoError,
  ]);

  const login = useCallback(
    async (credentials: LoginCredentials): Promise<LoginResponse> => {
      setIsLoading(true);
      try {
        const response = await authService.login(credentials);
        setAuthState({
          isAuthenticated: true,
          token: response.token,
          username: response.username,
          userInfo: null,
          roles: [],
        });
        localStorage.setItem("auth_token", response.token);
        localStorage.setItem("username", response.username);
        return response;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const logout = useCallback(() => {
    setIsLoading(true);
    try {
      localStorage.removeItem("auth_token");
      localStorage.removeItem("username");
      setAuthState({
        isAuthenticated: false,
        token: null,
        username: null,
        userInfo: null,
        roles: [],
      });
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
