import { afterEach, beforeEach, describe, expect, mock, spyOn, test } from 'bun:test';
import * as authService from '../services/authService';
import { AuthController } from './authController';

const res = {
  token: 'mocked-token',
  user: {
    id: 'user-123',
    email: 'test@example.com',
    createdAt: new Date('2024-01-01T00:00:00.000Z'),
  },
};

describe('AuthController', () => {
  let controller: AuthController;
  let mockedRegister: ReturnType<typeof spyOn<typeof authService, 'register'>>;
  let mockedLogin: ReturnType<typeof spyOn<typeof authService, 'login'>>;

  beforeEach(() => {
    controller = new AuthController();
    mockedRegister = spyOn(authService, 'register');
    mockedLogin = spyOn(authService, 'login');
  });

  afterEach(() => {
    mockedRegister.mockRestore();
    mockedLogin.mockRestore();
  });

  describe('register', () => {
    test('returns user and token and sets status 201 on success', async () => {
      mockedRegister.mockResolvedValue(res);
      const setStatusSpy = mock(() => {});
      controller.setStatus = setStatusSpy;

      const result = await controller.register({
        email: 'test@example.com',
        password: 'password123',
      });

      expect(setStatusSpy).toHaveBeenCalledWith(201);
      expect(result).toEqual({
        token: 'mocked-token',
        user: {
          id: 'user-123',
          email: 'test@example.com',
          createdAt: '2024-01-01T00:00:00.000Z',
        },
      });
    });

    test('propagates 409 error from service', async () => {
      const error = Object.assign(new Error('Email already in use'), { statusCode: 409 });
      mockedRegister.mockRejectedValue(error);

      const err = await controller
        .register({ email: 'taken@example.com', password: 'password123' })
        .catch((err: unknown) => err);

      expect((err as Error).message).toBe('Email already in use');
      expect((err as { statusCode: number }).statusCode).toBe(409);
    });
  });

  describe('login', () => {
    test('returns user and token on valid credentials', async () => {
      mockedLogin.mockResolvedValue(res);

      const result = await controller.login({
        email: 'test@example.com',
        password: 'password123',
      });

      expect(result.token).toBe('mocked-token');
      expect(result.user.id).toBe('user-123');
      expect(result.user.email).toBe('test@example.com');
      expect(result.user.createdAt).toBe('2024-01-01T00:00:00.000Z');
    });

    test('propagates 401 error from service', async () => {
      const error = Object.assign(new Error('Invalid credentials'), { statusCode: 401 });
      mockedLogin.mockRejectedValue(error);

      const err = await controller
        .login({ email: 'test@example.com', password: 'wrongpassword' })
        .catch((e: unknown) => e);

      expect((err as Error).message).toBe('Invalid credentials');
      expect((err as { statusCode: number }).statusCode).toBe(401);
    });
  });
});
