import type { FastifyReply, FastifyRequest, HookHandlerDoneFunction } from 'fastify';
import { verifyAccess } from './auth';

export type Role = 'admin' | 'manager' | 'driver' | 'viewer';

declare module 'fastify' {
  interface FastifyRequest {
    user?: { id: string; role: Role; email: string };
  }
}

export function requireAuth(requiredRole?: Role) {
  return function (req: FastifyRequest, reply: FastifyReply, done: HookHandlerDoneFunction) {
    try {
      const token = req.cookies?.access_token as string | undefined;
      if (!token) return reply.code(401).send({ error: 'unauthorized' });
      const payload = verifyAccess(token);
      req.user = { id: payload.id, role: payload.role, email: payload.email };
      if (requiredRole) {
        const order: Role[] = ['viewer', 'driver', 'manager', 'admin'];
        if (order.indexOf(req.user.role) < order.indexOf(requiredRole)) {
          return reply.code(403).send({ error: 'forbidden' });
        }
      }
      done();
    } catch {
      return reply.code(401).send({ error: 'unauthorized' });
    }
  };
}

export function requireOwnership(getOwnerId: (req: FastifyRequest) => string) {
  return function (req: FastifyRequest, reply: FastifyReply, done: HookHandlerDoneFunction) {
    const ownerId = getOwnerId(req);
    if (!req.user || req.user.id !== ownerId) {
      return reply.code(403).send({ error: 'forbidden' });
    }
    done();
  };
}
