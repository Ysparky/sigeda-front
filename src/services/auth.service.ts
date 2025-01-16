import axios from "axios";
import { LoginCredentials, LoginResponse, UserInfo } from "../types/auth.types";
import { api } from "./api";

const API_URL = import.meta.env.VITE_API_URL;

if (!API_URL) {
  throw new Error("API URL not defined in environment variables");
}

// Create a separate instance for auth endpoints to avoid interceptors
const authApi = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

export const authService = {
  async login(credentials: LoginCredentials): Promise<LoginResponse> {
    try {
      const response = await authApi.post<LoginResponse>(
        "/auth/login",
        credentials
      );

      // Store token in localStorage
      if (response.data.token) {
        localStorage.setItem("auth_token", response.data.token);
        localStorage.setItem("username", response.data.username);
      }

      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        throw new Error(
          error.response.data.message || "Error en la autenticación"
        );
      }
      throw new Error("Error al intentar iniciar sesión");
    }
  },

  async getUserInfo(username: string): Promise<UserInfo> {
    try {
      const response = await api.get<UserInfo>(`/personas/${username}`);
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        throw new Error(
          error.response.data.message ||
            "Error al obtener información del usuario"
        );
      }
      throw new Error("Error al obtener información del usuario");
    }
  },

  logout(): void {
    localStorage.removeItem("auth_token");
    localStorage.removeItem("username");
  },

  getStoredToken(): string | null {
    return localStorage.getItem("auth_token");
  },

  getStoredUsername(): string | null {
    return localStorage.getItem("username");
  },

  isAuthenticated(): boolean {
    return !!this.getStoredToken();
  },
};
