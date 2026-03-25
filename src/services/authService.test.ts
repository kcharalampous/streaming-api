// @ts-nocheck 
import { beforeEach, describe, expect, mock, test } from 'bun:test';
import prisma from '../lib/prisma';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import * as authService from './authService';

mock.module('../lib/prisma', () => ({
  default: {
    user: {
      findUnique: mock(() => Promise.resolve(null)),
      create: mock(() => Promise.resolve(null)),
    },
  },
}));

mock.module('bcryptjs', () => ({
  default: {
    hash: mock(() => Promise.resolve('hashed_password')),
    compare: mock(() => Promise.resolve(true)),
  },
}));

mock.module('jsonwebtoken', () => ({
  default: {
    sign: mock(() => 'mocked-token'),
  },
}));




const mockUser = {
  id: 'user-123',
  email: 'test@example.com',
  passwordHash: 'hashed_password',
  createdAt: new Date('2024-01-01T00:00:00.000Z'),
};

describe('authService', () => {
  beforeEach(() => {
    
    prisma.user.findUnique.mockReset();
    prisma.user.create.mockReset();
    bcrypt.hash.mockReset();
    bcrypt.compare.mockReset();
    jwt.sign.mockReset();

    bcrypt.hash.mockImplementation(() => Promise.resolve('hashed_password'));
    bcrypt.compare.mockImplementation(() => Promise.resolve(true));
    jwt.sign.mockImplementation(() => 'mocked-token');
    process.env.JWT_SECRET = 'test-secret';
  });

  describe('register', () => {
    test('creates user succesfully and returns token', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue({
        id: mockUser.id,
        email: mockUser.email,
        createdAt: mockUser.createdAt,
      });

      const result = await authService.register({
        email: 'test@example.com',
        password: 'password123',
      });

      expect(result.token).toBe('mocked-token');
      expect(result.user.email).toBe('test@example.com');
      expect(result.user.id).toBe('user-123');
      expect(result.user.createdAt).toBeInstanceOf(Date);
    });

    test('throws 409 when email is already in use', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser);

      const err = await authService
        .register({ email: 'test@example.com', password: 'password123' })
        .catch((e: unknown) => e);

      expect(err).toBeInstanceOf(Error);
      expect((err as Error).message).toBe('Email already in use');
      expect((err as { statusCode: number }).statusCode).toBe(409);
    });
  });

  describe('login', () => {
    test('returns token and user successfully', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser);

      const result = await authService.login({
        email: 'test@example.com',
        password: 'password123',
      });

      expect(result.token).toBe('mocked-token');
      expect(result.user.email).toBe('test@example.com');
      expect(result.user.id).toBe('user-123');
    });

    test('throws 401 when user is not found', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      const err = await authService
        .login({ email: 'nobody@example.com', password: 'password123' })
        .catch((e: unknown) => e);

      expect(err).toBeInstanceOf(Error);
      expect((err as Error).message).toBe('Invalid credentials');
      expect((err as { statusCode: number }).statusCode).toBe(401);
    });

    test('throws 401 when password is incorrect', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser);
      bcrypt.compare.mockImplementationOnce(() => Promise.resolve(false));

      const err = await authService
        .login({ email: 'test@example.com', password: 'wrongpassword' })
        .catch((err: unknown) => err);

      expect((err as Error).message).toBe('Invalid credentials');
      expect((err as { statusCode: number }).statusCode).toBe(401);
    });
  });
});
