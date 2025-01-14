export interface LoginCredentials {
  username: string;
  password: string;
}

export interface LoginResponse {
  message: string;
  username: string;
  token: string;
}

export type RoleName = 'Alumno' | 'Instructor' | 'Jefe de Operaciones';

interface Rol {
  id: number;
  nombre: RoleName;
}

interface UsuarioRol {
  rol: Rol;
}

interface Usuario {
  id: number;
  usuarioRoles: UsuarioRol[];
  nombre: string;
  correo: string;
}

export interface UserInfo {
  codigo: string;
  idGrupo: number;
  nombre: string;
  aPaterno: string;
  aMaterno: string;
  usuario: Usuario;
}

export interface AuthState {
  isAuthenticated: boolean;
  username: string | null;
  token: string | null;
  userInfo: UserInfo | null;
  role: RoleName | null;
}

export interface AuthContextType {
  isAuthenticated: boolean;
  username: string | null;
  token: string | null;
  userInfo: UserInfo | null;
  role: RoleName | null;
  login: (credentials: LoginCredentials) => Promise<LoginResponse>;
  logout: () => void;
  loadUserInfo: () => Promise<void>;
}