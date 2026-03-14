export interface AuthTokenClaims {
  userId: number;
  email: string;
}

export interface User {
  id: number;
  name: string;
  email: string;
  created_at: string;
}

export interface UserWithPassword extends User {
  password_hash: string;
}
