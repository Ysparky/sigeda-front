export interface LoginCredentials {
  username: string;
  password: string;
}

export interface LoginResponse {
  message: string;
  username: string;
  token: string;
}

export interface UserInfo {
  codigo: string;
  idGrupo: number;
  nombre: string;
  aPaterno: string;
  aMaterno: string;
  estado: string;
  rango: string;
}

export interface AuthState {
  isAuthenticated: boolean;
  username: string | null;
  token: string | null;
  userInfo: UserInfo | null;
}

export interface AuthContextType {
  isAuthenticated: boolean;
  username: string | null;
  token: string | null;
  userInfo: UserInfo | null;
  login: (credentials: LoginCredentials) => Promise<LoginResponse>;
  logout: () => void;
  loadUserInfo: () => Promise<void>;
}