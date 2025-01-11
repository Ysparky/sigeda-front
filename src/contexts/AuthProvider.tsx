import { useState, useEffect, useCallback } from "react";
import { AuthContext } from "./AuthContext";
import {
  AuthState,
  LoginCredentials,
  LoginResponse,
} from "../types/auth.types";
import { authService } from "../services/auth.service";
import { UserInfoError } from "../components/common/UserInfoError";
import { useData } from "../contexts/DataContext";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { clearData } = useData();
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    username: null,
    token: null,
    userInfo: null,
  });
  const [error, setError] = useState<string | null>(null);

  const loadUserInfo = async () => {
    if (!authState.token || !authState.username) return;

    try {
      const userInfo = await authService.getUserInfo(
        authState.token,
        authState.username
      );
      setAuthState((prev) => ({ ...prev, userInfo }));
    } catch (err) {
      setError("Error al obtener información del usuario");
      throw err;
    }
  };

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
      loadUserInfo().catch(() => {});
    }
  }, []);

  const login = async (
    credentials: LoginCredentials
  ): Promise<LoginResponse> => {
    const response = await authService.login(credentials);
    setAuthState({
      isAuthenticated: true,
      token: response.token,
      username: response.username,
      userInfo: null,
    });
    localStorage.setItem("auth_token", response.token);
    localStorage.setItem("username", response.username);
    await loadUserInfo();
    return response;
  };

  const logout = useCallback(() => {
    localStorage.removeItem("auth_token");
    localStorage.removeItem("username");
    setAuthState({
      isAuthenticated: false,
      token: null,
      username: null,
      userInfo: null,
    });
    clearData();
    setError(null);
  }, [clearData]);

  if (error) {
    return <UserInfoError onRetry={loadUserInfo} onLogout={logout} />;
  }

  return (
    <AuthContext.Provider value={{ ...authState, login, logout, loadUserInfo }}>
      {children}
    </AuthContext.Provider>
  );
}
