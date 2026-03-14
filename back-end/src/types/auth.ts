export interface AuthTokenClaims {
  userId: string;
  email: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  subscribers: boolean;
  created_at: string;
}

export interface UserWithPassword extends User {
  password_hash: string;
}
