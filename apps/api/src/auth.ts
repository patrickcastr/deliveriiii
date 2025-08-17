import { sign, verify, type SignOptions } from 'jsonwebtoken';
import type { FastifyReply } from 'fastify';
import { randomUUID } from 'node:crypto';
import { config } from './config';

export type JwtUser = { id: string; role: 'admin' | 'manager' | 'driver' | 'viewer'; email: string };
export type AccessTokenPayload = JwtUser & { type: 'access' };
export type RefreshTokenPayload = JwtUser & { type: 'refresh'; jti: string };

export function signAccess(user: JwtUser) {
  const payload: AccessTokenPayload = { ...user, type: 'access' };
  return sign(payload, config.jwt.accessSecret as string, { expiresIn: config.jwt.accessTtl } as SignOptions);
}
export function signRefresh(user: JwtUser) {
  const payload: RefreshTokenPayload = { ...user, type: 'refresh', jti: randomUUID() };
  return { token: sign(payload, config.jwt.refreshSecret as string, { expiresIn: config.jwt.refreshTtl } as SignOptions), jti: payload.jti };
}

export function verifyAccess(token: string): AccessTokenPayload {
  return verify(token, config.jwt.accessSecret as string) as AccessTokenPayload;
}
export function verifyRefresh(token: string): RefreshTokenPayload {
  return verify(token, config.jwt.refreshSecret as string) as RefreshTokenPayload;
}

export function setAuthCookies(reply: FastifyReply, accessToken: string, refreshToken: string) {
  const base = {
    httpOnly: true,
    sameSite: config.cookies.sameSite,
    secure: config.isProd || config.cookies.secure,
    path: '/',
  } as const;
  reply.setCookie('access_token', accessToken, { ...base, maxAge: 60 * 60 });
  reply.setCookie('refresh_token', refreshToken, { ...base, maxAge: 7 * 24 * 60 * 60 });
}
export function clearAuthCookies(reply: FastifyReply) {
  reply.clearCookie('access_token', { path: '/' });
  reply.clearCookie('refresh_token', { path: '/' });
}
