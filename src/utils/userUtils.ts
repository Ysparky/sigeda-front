import type { UserInfo } from '../types/auth.types';

export const getFullName = (userInfo: UserInfo | null): string => {
  return userInfo ? `${userInfo.nombre} ${userInfo.aPaterno} ${userInfo.aMaterno}` : '';
}; 