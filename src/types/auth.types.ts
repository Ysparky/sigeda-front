export interface LoginCredentials {
  username: string;
  password: string;
}

export interface LoginResponse {
  Message: string;
  Username: string;
  token: string;
}

export interface AuthState {
  isAuthenticated: boolean;
  username: string | null;
  token: string | null;
} 

export interface AuthContextType {
  isAuthenticated: boolean;
  username: string | null;
  token: string | null;
  login: (credentials: LoginCredentials) => Promise<LoginResponse>;
  logout: () => void;
}