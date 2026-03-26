import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import jwt from 'jsonwebtoken';
import { expressAuthentication } from './authentication';

const makeRequest = (authHeader?: string) => ({ headers: { authorization: authHeader } }) as any;

describe('expressAuthentication', () => {
  beforeEach(() => {
    process.env.JWT_SECRET = 'test-secret';
  });

  afterEach(() => {
    delete process.env.JWT_SECRET;
  });

  describe('missing Authorization header returns 401', () => {
    test('rejects with 401 when Authorization header is absent', async () => {
      const err = await expressAuthentication(makeRequest(), 'jwt').catch((e) => e);

      expect(err).toBeInstanceOf(Error);
      expect(err.message).toBe('No token provided');
      expect(err.statusCode).toBe(401);
    });

    test('rejects with 401 when Authorization header is not Bearer format', async () => {
      const err = await expressAuthentication(makeRequest('Basic dXNlcjpwYXNz'), 'jwt').catch(
        (e) => e
      );

      expect(err).toBeInstanceOf(Error);
      expect(err.message).toBe('No token provided');
      expect(err.statusCode).toBe(401);
    });
  });

  describe('JWT_SECRET from environment is used, not hardcoded value', () => {
    test('resolves when token is signed with JWT_SECRET', async () => {
      process.env.JWT_SECRET = 'test-secret';
      const token = jwt.sign({ sub: 'user-1', email: 'test@example.com' }, process.env.JWT_SECRET);

      const result = await expressAuthentication(makeRequest(`Bearer ${token}`), 'jwt');

      expect(result.sub).toBe('user-1');
      expect(result.email).toBe('test@example.com');
    });

    test('rejects when token is signed with the hardcoded secret123', async () => {
      const token = jwt.sign({ sub: 'user-1' }, 'secret123');

      const err = await expressAuthentication(makeRequest(`Bearer ${token}`), 'jwt').catch(
        (e) => e
      );

      expect(err).toBeInstanceOf(Error);
      expect(err.message).toBe('Invalid token');
      expect(err.statusCode).toBe(401);
    });

    test('rejects when JWT_SECRET is not set', async () => {
      delete process.env.JWT_SECRET;
      const token = jwt.sign({ sub: 'user-1' }, 'test-secret');

      const err = await expressAuthentication(makeRequest(`Bearer ${token}`), 'jwt').catch(
        (e) => e
      );

      expect(err).toBeInstanceOf(Error);
      expect(err.message).toBe('JWT_SECRET is not configured');
    });
  });

  describe('on invalid token, the handler is never reached', () => {
    test('does not resolve when token is invalid', async () => {
      const token = jwt.sign({ sub: 'user-1' }, 'wrong-secret');
      let handlerReached = false;

      await expressAuthentication(makeRequest(`Bearer ${token}`), 'jwt')
        .then(() => {
          handlerReached = true;
        })
        .catch(() => {});

      expect(handlerReached).toBe(false);
    });

    test('does not resolve when Authorization header is missing', async () => {
      let handlerReached = false;

      await expressAuthentication(makeRequest(), 'jwt')
        .then(() => {
          handlerReached = true;
        })
        .catch(() => {});

      expect(handlerReached).toBe(false);
    });
  });

  test('rejects when security scheme is not jwt', async () => {
    const err = await expressAuthentication(makeRequest(), 'apiKey').catch((e) => e);

    expect(err).toBeInstanceOf(Error);
    expect(err.message).toBe('Unknown security scheme');
  });
});
