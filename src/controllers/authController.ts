import { Body, Controller, Post, Response, Route, Tags } from 'tsoa';
import * as authService from '../services/authService';
import type { AuthResponse, ErrorResponse, LoginInput, RegisterInput } from '../types/auth';

@Route('auth')
@Tags('Auth')
export class AuthController extends Controller {
  /**
   * Register a new user. Returns a JWT on success.
   */
  @Post('register')
  @Response<ErrorResponse>(409, 'Email already in use')
  async register(@Body() body: RegisterInput): Promise<AuthResponse> {
    const result = await authService.register(body);
    this.setStatus(201);
    return {
      token: result.token,
      user: { ...result.user, createdAt: result.user.createdAt.toISOString() },
    };
  }

  /**
   * Login with email and password. Returns a JWT on success.
   */
  @Post('login')
  @Response<ErrorResponse>(401, 'Invalid credentials')
  async login(@Body() body: LoginInput): Promise<AuthResponse> {
    const result = await authService.login(body);
    return {
      token: result.token,
      user: { ...result.user, createdAt: result.user.createdAt.toISOString() },
    };
  }
}
