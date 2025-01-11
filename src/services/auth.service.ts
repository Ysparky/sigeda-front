import { LoginCredentials, LoginResponse, UserInfo } from '../types/auth.types';

const API_URL = import.meta.env.VITE_API_URL;

if (!API_URL) {
  throw new Error('API URL not defined in environment variables');
}

export const authService = {
  async login(credentials: LoginCredentials): Promise<LoginResponse> {
    const response = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(credentials),
    });

    if (!response.ok) {
      throw new Error('Error en la autenticación');
    }

    return response.json();
  },

  async getUserInfo(token: string, username: string): Promise<UserInfo> {
    const response = await fetch(`${API_URL}/api/personas/${username}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error('Error al obtener información del usuario');
    }

    return response.json();
  },
}; 