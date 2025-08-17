import 'dotenv/config';
import Fastify from 'fastify';
import type { FastifyReply, FastifyRequest } from 'fastify';
import helmet from '@fastify/helmet';
import cookie from '@fastify/cookie';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import { Server, type Socket } from 'socket.io';
import { ZodError, z } from 'zod';
import { PrismaClient, UserRole } from '@prisma/client';
import Redis from 'ioredis';
import { Client as ElasticClient } from '@elastic/elasticsearch';
import type { Health } from '@deliveryapp/shared';
import { config } from './config';
import bcrypt from 'bcrypt';
import { clearAuthCookies, setAuthCookies, signAccess, signRefresh, verifyRefresh } from './auth';
import { requireAuth } from './guards';
import crypto from 'node:crypto';
import swagger from '@fastify/swagger';
import swaggerUI from '@fastify/swagger-ui';
import v1Packages from './routes/v1/packages';
import v1Scan from './routes/v1/scan';
import v1Audit from './routes/v1/audit';
import v1Attachments from './routes/v1/attachments';
import { initRealtime } from './realtime';
import { metricsHandler, onRequestHook, onResponseHook } from './metrics';
import { dbQueryDuration } from './metrics';
import { wsConnections, wsConnectionsTotal } from './metrics';
import { config as appConfig } from './config';
import CIDR from 'ip-cidr';
import net from 'node:net';
import { createHash } from 'node:crypto';

const prisma = new PrismaClient();
// Prisma query timing middleware
prisma.$use(async (params, next) => {
  const start = process.hrtime.bigint();
  try {
    const result = await next(params);
    return result;
  } finally {
    const end = process.hrtime.bigint();
    const seconds = Number(end - start) / 1e9;
    dbQueryDuration.labels(params.model || 'raw', params.action).observe(seconds);
    if (seconds > 0.5) {
      app.log.warn({ model: params.model, action: params.action, seconds }, 'slow_query');
    }
  }
});
const redis = new Redis(process.env.REDIS_URL ?? 'redis://localhost:6379');
const es = new ElasticClient({ node: process.env.ELASTICSEARCH_NODE || 'http://localhost:9200' });

const app = Fastify({
  genReqId: (req) => (req?.headers?.['x-request-id'] as string | undefined) || crypto.randomUUID(),
  logger: {
    level: 'info',
    redact: ['req.headers.authorization', 'req.headers.cookie', 'headers.authorization', 'headers.cookie', 'res.headers.set-cookie', 'response.headers.set-cookie'],
  },
});
// Metrics hooks
app.addHook('onRequest', onRequestHook);
app.addHook('onResponse', onResponseHook);

// Basic request log summary with correlation id
app.addHook('onResponse', async (req, reply) => {
  const id = (req.id ?? '') as string;
  app.log.info({ id, method: req.method, url: req.url, status: reply.statusCode, durationMs: (Number((req as any)._startHrTime ? (process.hrtime.bigint() - (req as any)._startHrTime) : 0n) / 1e6).toFixed(2) }, 'req_summary');
});
await app.register(cookie, { hook: 'onRequest' });
await app.register(cors, { origin: config.webOrigin, credentials: true });
const CSP_NONCE = crypto.randomBytes(16).toString('base64');
await app.register(helmet, {
  contentSecurityPolicy: {
    useDefaults: true,
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", `'nonce-${CSP_NONCE}'`],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
    },
  },
});
await app.register(rateLimit, { max: 100, timeWindow: '1 minute' });

// Swagger static docs
await app.register(swagger, {
  mode: 'static',
  specification: {
    path: new URL('../openapi.yaml', import.meta.url).pathname,
    baseDir: new URL('.', import.meta.url).pathname,
  },
});
await app.register(swaggerUI, { routePrefix: '/docs' });

// Optional IP allowlist (CIDRs)
if (appConfig.ipAllowlistCidrs.length) {
  const ranges = appConfig.ipAllowlistCidrs.map((c) => new CIDR(c));
  app.addHook('onRequest', async (req, reply) => {
    const ip = req.ip ?? '';
    const allowed = ranges.some((r: any) => r.contains(ip));
    if (!allowed) return reply.code(403).send({ error: 'forbidden' });
  });
}

// v1 routes
await app.register(v1Packages, { prefix: '/api/v1' });
await app.register(v1Scan, { prefix: '/api/v1' });
await app.register(v1Audit, { prefix: '/api/v1' });
await app.register(v1Attachments, { prefix: '/api/v1' });

app.get('/healthz', async (): Promise<Health> => {
  // Lightweight pings (best-effort)
  try { await redis.ping(); } catch {}
  try { await prisma.$queryRaw`SELECT 1`; } catch {}
  try { await es.ping(); } catch {}
  return { status: 'ok', ts: new Date().toISOString() };
});

// Metrics
app.get('/metrics', metricsHandler);

app.get('/', async () => ({ hello: 'world' }));

app.post<{ Body: { message: string } }>(
  '/echo',
  async (
    req: FastifyRequest<{ Body: { message: string } }>,
    reply: FastifyReply,
  ) => {
  try {
    const schema = z.object({ message: z.string().min(1) });
    const body = schema.parse(req.body);
    return { echo: body.message };
  } catch (e: unknown) {
    if (e instanceof ZodError) {
      const err = e as ZodError;
      reply.code(400);
      return { error: err.errors };
    }
    reply.code(500);
    return { error: 'unknown' };
  }
  },
);

// Central error handler
app.setErrorHandler((err: unknown, _req: FastifyRequest, reply: FastifyReply) => {
  if (err instanceof ZodError) {
    const details = (err as ZodError).errors;
    return reply.status(400).send({ error: 'validation_error', details });
  }
  app.log.error(err);
  return reply.status(500).send({ error: 'internal_server_error' });
});

// --- Auth routes ---
const emailSchema = z.string().email();
const passwordSchema = z
  .string()
  .min(12)
  .regex(/[a-z]/)
  .regex(/[A-Z]/)
  .regex(/[0-9]/)
  .regex(/[^a-zA-Z0-9]/);

const refreshKey = (userId: string, jti: string) => `refresh:${userId}:${jti}`;
const mfaKey = (userId: string) => `mfa:${userId}:secret`;

// Register (disabled in prod)
app.post<{ Body: { email: string; name?: string; password: string; role?: 'admin'|'manager'|'driver'|'viewer' } }>(
  '/auth/register',
  {
    config: { rateLimit: { max: 10, timeWindow: '1 minute' } },
    preValidation: (req: FastifyRequest, reply: FastifyReply, done: () => void) => {
      if (config.isProd) return reply.code(404).send();
      done();
    },
  },
  async (req: FastifyRequest, reply: FastifyReply) => {
    const body = z.object({
      email: emailSchema,
      name: z.string().min(1).optional(),
      password: passwordSchema,
      role: z.enum(['admin','manager','driver','viewer']).optional(),
    }).parse(req.body);
    const hash = await bcrypt.hash(body.password, 12);
    const user = await prisma.user.create({
      data: {
        email: body.email,
        name: body.name,
        passwordHash: hash,
        role: (body.role ?? 'viewer') as UserRole,
      },
      select: { id: true, email: true, role: true, name: true },
    });
    const access = signAccess(user);
    const { token: refresh, jti } = signRefresh(user);
    await redis.set(refreshKey(user.id, jti), '1', 'EX', 7 * 24 * 60 * 60);
    setAuthCookies(reply, access, refresh);
    if (appConfig.csrfEnabled) {
      const csrf = crypto.randomUUID();
      reply.setCookie('csrf_token', csrf, { httpOnly: false, sameSite: appConfig.cookies.sameSite, secure: appConfig.isProd || appConfig.cookies.secure, path: '/' });
    }
    return reply.send({ user });
  },
);

// Login
app.post<{ Body: { email: string; password: string; mfaCode?: string } }>(
  '/auth/login',
  { config: { rateLimit: { max: 10, timeWindow: '1 minute' } } },
  async (req: FastifyRequest, reply: FastifyReply) => {
    // Brute force basic protection: track failures per-IP and email
    const key = (email: string) => `bf:${req.ip}:${email}`;
    const MAX_ATTEMPTS = 10;
    const WINDOW_SEC = 15 * 60;
    const { email, password, mfaCode } = z.object({
      email: emailSchema,
      password: z.string().min(1),
      mfaCode: z.string().optional(),
    }).parse(req.body);

    const user = await prisma.user.findUnique({ where: { email }, select: { id: true, email: true, role: true, passwordHash: true } });
    if (!user) return reply.code(401).send({ error: 'invalid_credentials' });
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      try {
        const attempts = Number(await redis.incr(key(email)));
        if (attempts === 1) await redis.expire(key(email), WINDOW_SEC);
      } catch {}
      return reply.code(401).send({ error: 'invalid_credentials' });
    }
    try { await redis.del(key(email)); } catch {}

  if (config.mfaEnabled) {
      const secret = await redis.get(mfaKey(user.id));
      if (secret) {
        if (!mfaCode || mfaCode !== '000000') {
          return reply.code(401).send({ error: 'mfa_required' });
        }
      }
    }

    const safe = { id: user.id, email: user.email, role: user.role } as const;
    const access = signAccess(safe);
    const { token: refresh, jti } = signRefresh(safe);
    await redis.set(refreshKey(safe.id, jti), '1', 'EX', 7 * 24 * 60 * 60);
    setAuthCookies(reply, access, refresh);
    if (appConfig.csrfEnabled) {
      const csrf = crypto.randomUUID();
      reply.setCookie('csrf_token', csrf, { httpOnly: false, sameSite: appConfig.cookies.sameSite, secure: appConfig.isProd || appConfig.cookies.secure, path: '/' });
    }
    return reply.send({ user: safe });
  },
);

// Refresh
app.post('/auth/refresh', { config: { rateLimit: { max: 20, timeWindow: '1 minute' } } }, async (req: FastifyRequest, reply: FastifyReply) => {
  const token = (req.cookies?.refresh_token as string | undefined) || '';
  if (!token) return reply.code(401).send({ error: 'unauthorized' });
  try {
    const payload = verifyRefresh(token);
    const exists = await redis.get(refreshKey(payload.id, payload.jti));
    if (!exists) return reply.code(401).send({ error: 'unauthorized' });
    await redis.del(refreshKey(payload.id, payload.jti));
    const user = { id: payload.id, email: payload.email, role: payload.role } as const;
    const access = signAccess(user);
    const { token: newRefresh, jti } = signRefresh(user);
    await redis.set(refreshKey(user.id, jti), '1', 'EX', 7 * 24 * 60 * 60);
    setAuthCookies(reply, access, newRefresh);
    return reply.send({ ok: true });
  } catch {
    return reply.code(401).send({ error: 'unauthorized' });
  }
});

// Logout
app.post('/auth/logout', { preHandler: requireAuth() }, async (req: FastifyRequest, reply: FastifyReply) => {
  const token = (req.cookies?.refresh_token as string | undefined) || '';
  if (token) {
    try {
      const payload = verifyRefresh(token);
      await redis.del(refreshKey(payload.id, payload.jti));
    } catch {}
  }
  clearAuthCookies(reply);
  reply.clearCookie('csrf_token', { path: '/' });
  return reply.send({ ok: true });
});

// Me
app.get('/auth/me', { preHandler: requireAuth() }, async (req: FastifyRequest) => {
  return { user: req.user };
});

const io = new Server(app.server, {
  cors: { origin: config.webOrigin, credentials: true },
  pingInterval: 20000,
  pingTimeout: 20000,
  maxHttpBufferSize: 1_000_000,
});

// Init realtime namespace /rt with Redis adapter
initRealtime(io, process.env.REDIS_URL ?? 'redis://localhost:6379');

io.on('connection', (socket: Socket) => {
  wsConnectionsTotal.labels('/').inc();
  wsConnections.labels('/').inc();
  socket.emit('hello', 'Hello from DeliveryApp API');
  socket.on('ping', () => socket.emit('hello', 'pong'));
  socket.on('disconnect', () => {
    wsConnections.labels('/').dec();
  });
});

app.listen({ port: config.port, host: '0.0.0.0' }).then(() => {
  app.log.info(`API listening on http://localhost:${config.port}`);
});
