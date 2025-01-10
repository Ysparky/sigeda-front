import { useState, useEffect } from 'react';
import { AuthContext } from './AuthContext';
import { AuthState, LoginCredentials, LoginResponse } from '../types/auth.types';
import { authService } from '../services/auth.service';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    username: null,
    token: null,
  });

  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    const username = localStorage.getItem('username');
    
    if (token && username) {
      setAuthState({
        isAuthenticated: true,
        token,
        username,
      });
    }
  }, []);

  const login = async (credentials: LoginCredentials): Promise<LoginResponse> => {
    const response = await authService.login(credentials);
    setAuthState({
      isAuthenticated: true,
      token: response.token,
      username: response.Username,
    });
    localStorage.setItem('auth_token', response.token);
    localStorage.setItem('username', response.Username);
    return response;
  };

  const logout = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('username');
    setAuthState({
      isAuthenticated: false,
      token: null,
      username: null,
    });
  };

  return (
    <AuthContext.Provider value={{ ...authState, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
} 