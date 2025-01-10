import { LoginCredentials, LoginResponse } from '../types/auth.types';

const API_URL = 'https://sigeda-back-production.up.railway.app';

export const authService = {
  async login(credentials: LoginCredentials): Promise<LoginResponse> {
    const response = await fetch(`${API_URL}/login`, {
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
}; 