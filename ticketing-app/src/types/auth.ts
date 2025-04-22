export type UserRole = "admin" | "user";

export interface AuthUser {
  id: string;
  username: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
}

export interface UserType {
  id: string;
  label: string;
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface AuthResponse {
  user: AuthUser;
  token: string;
}
