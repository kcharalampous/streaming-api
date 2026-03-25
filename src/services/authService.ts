import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../lib/prisma';
import type { LoginInput, RegisterInput } from '../types/auth';

const SALT_ROUNDS = 12;

export interface AuthResult {
  token: string;
  user: {
    id: string;
    email: string;
    createdAt: Date;
  };
}

export const register = async (input: RegisterInput): Promise<AuthResult> => {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) {
    throw Object.assign(new Error('Email already in use'), { statusCode: 409 });
  }

  const passwordHash = await bcrypt.hash(input.password, SALT_ROUNDS);

  const user = await prisma.user.create({
    data: { email: input.email, passwordHash },
    select: { id: true, email: true, createdAt: true },
  });

  const token = issueToken(user.id, user.email);
  return { token, user };
};

export const login = async (input: LoginInput): Promise<AuthResult> => {
  const user = await prisma.user.findUnique({ where: { email: input.email } });
  if (!user) {
    throw Object.assign(new Error('Invalid credentials'), { statusCode: 401 });
  }

  const valid = await bcrypt.compare(input.password, user.passwordHash);
  if (!valid) {
    throw Object.assign(new Error('Invalid credentials'), { statusCode: 401 });
  }

  const token = issueToken(user.id, user.email);
  return { token, user: { id: user.id, email: user.email, createdAt: user.createdAt } };
};

const issueToken = (userId: string, email: string): string => {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET is not configured');

  const expiresIn = (process.env.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn']) ?? '7d';

  return jwt.sign({ sub: userId, email }, secret, { expiresIn });
};
