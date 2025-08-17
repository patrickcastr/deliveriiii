import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { requireAuth } from '../../guards';
import { PrismaClient, PackageStatus, Prisma } from '@prisma/client';
import { indexPackage, deletePackage } from '../../services/elasticsearch';
import { emitPackageEvent } from '../../realtime';
import { config } from '../../config';

const prisma = new PrismaClient();

export default async function routes(app: FastifyInstance) {
  // CSRF check for state-changing methods
  app.addHook('preHandler', async (req, reply) => {
    if (config.csrfEnabled && req.method !== 'GET' && req.method !== 'HEAD' && req.method !== 'OPTIONS') {
      const header = (req.headers['x-csrf-token'] as string | undefined) || '';
      const cookie = (req.cookies?.['csrf_token'] as string | undefined) || '';
      if (!header || !cookie || header !== cookie) {
        return reply.code(403).send({ error: 'csrf_invalid' });
      }
    }
  });
  // List packages
  app.get('/packages', { preHandler: requireAuth('viewer') }, async (req: FastifyRequest, reply: FastifyReply) => {
    const query = z
      .object({
        status: z.nativeEnum(PackageStatus).optional(),
        driverId: z.string().uuid().optional(),
        q: z.string().optional(),
        limit: z.coerce.number().int().min(1).max(100).default(20),
        offset: z.coerce.number().int().min(0).default(0),
      })
      .parse(req.query);

  const where: Prisma.PackageWhereInput = {};
    if (query.status) where.status = query.status;
    if (query.driverId) where.driverId = query.driverId;
    if (query.q) where.OR = [{ barcode: { contains: query.q, mode: 'insensitive' } }];

    const [items, total] = await Promise.all([
      prisma.package.findMany({ where, skip: query.offset, take: query.limit, orderBy: { createdAt: 'desc' } }),
      prisma.package.count({ where }),
    ]);
    return reply.send({ items, total });
  });

  // Create package
  app.post('/packages', {
    preHandler: requireAuth('manager'),
    config: {
      rateLimit: {
        max: 30,
        timeWindow: '1 minute',
        keyGenerator: (req: any) => `${req.ip}:${req.user?.id ?? 'anon'}`,
      },
    },
  }, async (req: FastifyRequest, reply: FastifyReply) => {
    const body = z
      .object({
        barcode: z.string().min(3),
        status: z.nativeEnum(PackageStatus).default(PackageStatus.pending),
        recipient: z.any(),
        driverId: z.string().uuid().optional(),
        location: z.object({ lat: z.number(), lng: z.number() }).optional(),
        metadata: z.any().optional(),
      })
      .parse(req.body);
  const created = await prisma.package.create({
      data: {
        barcode: body.barcode,
        status: body.status,
        recipient: body.recipient,
        driverId: body.driverId,
        locationLat: body.location?.lat,
        locationLng: body.location?.lng,
        metadata: body.metadata,
      },
    });
  await indexPackage(created);
  emitPackageEvent(created.id, 'package.created', { status: created.status, barcode: created.barcode }, created.driverId);
  return reply.code(201).send(created);
  });

  // Read package
  app.get('/packages/:id', { preHandler: requireAuth('viewer') }, async (req: FastifyRequest, reply: FastifyReply) => {
    const params = z.object({ id: z.string() }).parse(req.params);
    const item = await prisma.package.findUnique({ where: { id: params.id } });
    if (!item) return reply.code(404).send({ error: 'not_found' });
    return reply.send(item);
  });

  // Update package
  app.put('/packages/:id', {
    preHandler: requireAuth('manager'),
    config: {
      rateLimit: { max: 60, timeWindow: '1 minute', keyGenerator: (req: any) => `${req.ip}:${req.user?.id ?? 'anon'}` },
    },
  }, async (req: FastifyRequest, reply: FastifyReply) => {
    const params = z.object({ id: z.string() }).parse(req.params);
    const body = z
      .object({
        status: z.nativeEnum(PackageStatus).optional(),
        recipient: z.any().optional(),
        driverId: z.string().uuid().optional().nullable(),
        location: z.object({ lat: z.number(), lng: z.number() }).optional(),
        metadata: z.any().optional(),
      })
      .parse(req.body);
  const updated = await prisma.package.update({
      where: { id: params.id },
      data: {
        status: body.status,
        recipient: body.recipient,
        driverId: body.driverId ?? undefined,
        locationLat: body.location?.lat,
        locationLng: body.location?.lng,
        metadata: body.metadata,
      },
    });
  await indexPackage(updated);
  emitPackageEvent(updated.id, 'package.updated', { status: updated.status }, updated.driverId);
  return reply.send(updated);
  });

  // Delete package
  app.delete('/packages/:id', {
    preHandler: requireAuth('manager'),
    config: { rateLimit: { max: 30, timeWindow: '1 minute', keyGenerator: (req: any) => `${req.ip}:${req.user?.id ?? 'anon'}` } },
  }, async (req: FastifyRequest, reply: FastifyReply) => {
    const params = z.object({ id: z.string() }).parse(req.params);
  const deleted = await prisma.package.delete({ where: { id: params.id } });
  await deletePackage(params.id);
  emitPackageEvent(params.id, 'package.deleted', { barcode: deleted.barcode }, deleted.driverId);
    return reply.code(204).send();
  });
}
