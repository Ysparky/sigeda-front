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
  const [isLoading, setIsLoading] = useState(false);
  const [userInfoError, setUserInfoError] = useState(false);

  const getRolesFromUserInfo = useCallback((userInfo: UserInfo): RoleName[] => {
    return userInfo.usuario.usuarioRoles.map((ur) => ur.rol.nombre);
  }, []);

  const loadUserInfo = useCallback(async () => {
    if (!authState.token || !authState.username) return;
    if (authState.userInfo) return; // Don't reload if we already have user info

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
  }, [
    authState.token,
    authState.username,
    authState.userInfo,
    getRolesFromUserInfo,
  ]);

  const retryLoadUserInfo = useCallback(async () => {
    if (!authState.token || !authState.username) return;

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
    const token = localStorage.getItem("auth_token");
    const username = localStorage.getItem("username");

    if (token && username) {
      setAuthState((prev) => ({
        ...prev,
        isAuthenticated: true,
        token,
        username,
      }));
    }
  }, []);

  // Load user info when authenticated
  useEffect(() => {
    if (authState.isAuthenticated && !authState.userInfo && !isLoading) {
      loadUserInfo().catch(() => {}); // Silent catch as error state is handled
    }
  }, [authState.isAuthenticated, authState.userInfo, isLoading, loadUserInfo]);

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
