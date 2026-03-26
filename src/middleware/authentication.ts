import type { Request } from 'express';
import jwt from 'jsonwebtoken';

export const expressAuthentication = (
  request: Request,
  securityName: string
): Promise<jwt.JwtPayload> => {
  return new Promise((resolve, reject) => {
    if (securityName !== 'jwt') return reject(new Error('Unknown security scheme'));
    const authHeader = request.headers['authorization'];

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return reject(Object.assign(new Error('No token provided'), { statusCode: 401 }));
    }

    const token = authHeader.split(' ')[1];
    const secret = process.env.JWT_SECRET;

    if (!secret) {
      return reject(new Error('JWT_SECRET is not configured'));
    }
    jwt.verify(token, secret, (err, decoded) => {
      if (err) {
        return reject(Object.assign(new Error('Invalid token'), { statusCode: 401 }));
      }
      return resolve(decoded as jwt.JwtPayload);
    });
  });
};
