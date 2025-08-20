import 'dotenv/config';

export const config = {
  env: process.env.NODE_ENV || 'development',
  isProd: (process.env.NODE_ENV || 'development') === 'production',
  port: Number(process.env.PORT || 3000),
  host: process.env.HOST || process.env.API_HOST || '0.0.0.0',
  webOrigin:
    process.env.WEB_ORIGIN ||
    process.env.CORS_ORIGIN ||
    process.env.PUBLIC_WEB_ORIGIN ||
    'http://localhost:5173',
  ipAllowlistCidrs: (process.env.IP_ALLOWLIST_CIDRS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
  csrfEnabled: String(process.env.CSRF_ENABLED || 'true').toLowerCase() !== 'false',
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET || 'dev_access_secret_change',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'dev_refresh_secret_change',
    accessTtl: process.env.ACCESS_TOKEN_TTL || '15m',
    refreshTtl: process.env.REFRESH_TOKEN_TTL || '7d',
  },
  cookies: {
    secure: String(process.env.COOKIE_SECURE || '').toLowerCase() === 'true',
    sameSite: 'strict' as const,
    domain: undefined as string | undefined, // set if needed
  },
  mfaEnabled: String(process.env.ENABLE_MFA || '').toLowerCase() === 'true',
};
