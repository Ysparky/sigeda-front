import { useCallback, useEffect, useState } from "react";
import { UserInfoError } from "../components/common/UserInfoError";
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
  const [userInfoError, setUserInfoError] = useState(false);

  const getRolesFromUserInfo = (userInfo: UserInfo): RoleName[] => {
    return userInfo.usuario.usuarioRoles.map((ur) => ur.rol.nombre);
  };

  const loadUserInfo = async () => {
    if (!authState.token || !authState.username) return;

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
    }
  }, []);

  useEffect(() => {
    if (authState.isAuthenticated && !authState.userInfo) {
      loadUserInfo().catch(() => {});
    }
  }, [authState.isAuthenticated]);

  const login = async (
    credentials: LoginCredentials
  ): Promise<LoginResponse> => {
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
      roles: [],
    });
    clearData();
    setUserInfoError(false);
  }, [clearData]);

  if (userInfoError) {
    return <UserInfoError onRetry={loadUserInfo} />;
  }

  return (
    <AuthContext.Provider value={{ ...authState, login, logout, loadUserInfo }}>
      {children}
    </AuthContext.Provider>
  );
}
