export interface RegisterInput {
  /** @pattern ^(.+)@(.+)$ please provide a valid email */
  email: string;
  /** @minLength 8 */
  password: string;
}

export interface LoginInput {
  /** @pattern ^(.+)@(.+)$ please provide a valid email */
  email: string;
  password: string;
}

export interface AuthUser {
  id: string;
  email: string;
  createdAt: string;
}

export interface AuthResponse {
  token: string;
  user: AuthUser;
}

export interface ErrorResponse {
  error: string;
}
