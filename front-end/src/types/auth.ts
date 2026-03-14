export interface User {
  id: number;
  name: string;
  email: string;
  created_at: string;
}

export interface AuthSuccess {
  ok: true;
  user: User;
}

export interface AuthFailure {
  ok: false;
  message: string;
}

export type AuthResult = AuthSuccess | AuthFailure;

export interface AuthContextValue {
  user: User | null;
  isBootstrapping: boolean;
  profileName: string;
  apiUrl: string;
  login: (email: string, password: string) => Promise<AuthResult>;
  register: (name: string, email: string, password: string) => Promise<AuthResult>;
  logout: () => Promise<void>;
}

export interface AuthResponseBody {
  user?: User;
  message?: string;
}
