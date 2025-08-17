import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { requireAuth } from '../../guards';
import { PrismaClient, Prisma } from '@prisma/client';
import { config } from '../../config';

const prisma = new PrismaClient();

export default async function routes(app: FastifyInstance) {
  app.addHook('preHandler', async (req, reply) => {
    if (config.csrfEnabled && req.method !== 'GET' && req.method !== 'HEAD' && req.method !== 'OPTIONS') {
      const header = (req.headers['x-csrf-token'] as string | undefined) || '';
      const cookie = (req.cookies?.['csrf_token'] as string | undefined) || '';
      if (!header || !cookie || header !== cookie) {
        return reply.code(403).send({ error: 'csrf_invalid' });
      }
    }
  });
  // Audit list
  app.get('/audit', { preHandler: requireAuth('viewer') }, async (req: FastifyRequest, reply: FastifyReply) => {
    const query = z
      .object({
        package_id: z.string().uuid().optional(),
        from: z.string().datetime().optional(),
        to: z.string().datetime().optional(),
      })
      .parse(req.query);

  const where: Prisma.AuditEntryWhereInput = {};
    if (query.package_id) where.packageId = query.package_id;
    if (query.from || query.to) where.timestamp = { gte: query.from ? new Date(query.from) : undefined, lte: query.to ? new Date(query.to) : undefined };
    const items = await prisma.auditEntry.findMany({ where, orderBy: { timestamp: 'desc' } });
    return reply.send({ items });
  });

  // Export (stub)
  app.post('/audit/export', { preHandler: requireAuth('manager') }, async (_req: FastifyRequest, reply: FastifyReply) => {
    return reply.send({ ok: true });
  });
}
