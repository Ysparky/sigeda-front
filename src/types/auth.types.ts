export interface LoginCredentials {
  username: string;
  password: string;
}

export interface LoginResponse {
  refresh_token: string;
  token: string;
  username: string;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface RefreshTokenResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
}

export interface LogoutRequest {
  refreshToken: string;
}

export type RoleName = "Alumno" | "Instructor" | "Jefe de Operaciones";

interface Rol {
  id: number;
  nombre: RoleName;
}

interface Usuario {
  id: number;
  correo: string;
  nombre: string;
  rol: Rol;
}

export interface UserInfo {
  codigo: string;
  idGrupo: number | null;
  nombre: string;
  aPaterno: string;
  aMaterno: string;
  usuario: Usuario;
}

export interface AuthState {
  isAuthenticated: boolean;
  username: string | null;
  token: string | null;
  refreshToken: string | null;
  userInfo: UserInfo | null;
  roles: RoleName[];
}

export interface AuthContextType {
  isAuthenticated: boolean;
  username: string | null;
  token: string | null;
  refreshToken: string | null;
  userInfo: UserInfo | null;
  roles: RoleName[];
  userInfoError: boolean;
  isLoading: boolean;
  login: (credentials: LoginCredentials) => Promise<LoginResponse>;
  logout: () => Promise<void>;
  loadUserInfo: () => Promise<void>;
  retryLoadUserInfo: () => Promise<void>;
}
