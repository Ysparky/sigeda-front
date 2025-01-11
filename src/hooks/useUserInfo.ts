import { useState, useCallback } from 'react';
import { authService } from '../services/auth.service';
import type { UserInfo } from '../types/auth.types';

export function useUserInfo() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);

  const loadUserInfo = useCallback(async (token: string, username: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await authService.getUserInfo(token, username);
      setUserInfo(data);
      return data;
    } catch (err) {
      setError('Error al obtener información del usuario');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleRetry = useCallback(async (token: string, username: string) => {
    try {
      await loadUserInfo(token, username);
    } catch (err) {
      setError('Error al obtener información del usuario');
    }
  }, [loadUserInfo]);

  return {
    isLoading,
    error,
    userInfo,
    loadUserInfo,
    handleRetry
  };
} 