import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { requireAuth } from '../../guards';
import { PrismaClient } from '@prisma/client';
import { indexPackage, deletePackage } from '../../services/elasticsearch';
import { emitPackageEvent } from '../../realtime';
import { config } from '../../config';
import { RequirementRulesSchema } from '../../domain/requirements';
import { createHash } from 'node:crypto';
import { buildMetadataSchema, FormSchemaV1Z, mapZodErrors } from '../../domain/forms';

const prisma = new PrismaClient();

export default async function routes(app: FastifyInstance) {
  // Shared enums/schemas
  const StatusEnum = z.enum(['pending', 'picked_up', 'in_transit', 'delivered', 'failed']);
  const LocationSchema = z.object({ lat: z.number(), lng: z.number() });

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
  status: StatusEnum.optional(),
        driverId: z.string().uuid().optional(),
        q: z.string().optional(),
        limit: z.coerce.number().int().min(1).max(100).default(20),
        offset: z.coerce.number().int().min(0).default(0),
      })
      .parse(req.query);

  const where: any = {};
    if (query.status) where.status = query.status;
    if (query.driverId) where.driverId = query.driverId;
    if (query.q) where.OR = [{ barcode: { contains: query.q, mode: 'insensitive' } }];

    const [items, total] = await Promise.all([
      prisma.package.findMany({ where, skip: query.offset, take: query.limit, orderBy: { createdAt: 'desc' } }),
      prisma.package.count({ where }),
    ]);
    return reply.send({ items, total });
  });

  // List drivers (for assignment)
  app.get('/drivers', { preHandler: requireAuth('manager') }, async (_req: FastifyRequest, reply: FastifyReply) => {
    const items = await prisma.user.findMany({ where: { role: 'driver' }, select: { id: true, name: true, email: true } });
    return reply.send({ items });
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
        status: StatusEnum.default('pending'),
        recipient: z.object({
          name: z.string().min(1),
          phone: z.string().optional(),
          email: z.string().email().optional(),
          address: z.string().min(3),
        }),
        driverId: z.string().uuid().optional(),
        location: LocationSchema.optional(),
  metadata: z.record(z.any()).optional(),
  requirementTemplateId: z.string().uuid().optional(),
  itemTemplateId: z.string().uuid().optional(),
      })
      .parse(req.body);
    // Unique barcode guard (fast path)
    const exists = await prisma.package.findUnique({ where: { barcode: body.barcode } });
    if (exists) return reply.code(409).send({ error: 'conflict', field: 'barcode' });

    try {
  // Optional requirement template linkage and checklist creation
  let template: any = null;
  // Optional item template and metadata validation
  let itemTemplate: any = null;
  let validatedMetadata: any = body.metadata ?? undefined;
      if (body.requirementTemplateId) {
        template = await prisma.packageRequirementTemplate.findUnique({ where: { id: body.requirementTemplateId } });
        if (!template || template.active === false) {
          return reply.code(400).send({ error: 'invalid_template' });
        }
        // Validate rules structure
        RequirementRulesSchema.parse(template.rules);
      }
      if (body.itemTemplateId) {
        const db: any = prisma as any;
        itemTemplate = await db.packageItemTemplate.findUnique({ where: { id: body.itemTemplateId } });
        if (!itemTemplate || itemTemplate.status !== 'published') {
          return reply.code(400).send({ error: 'invalid_item_template' });
        }
        // Validate schema JSON first
        const schema = FormSchemaV1Z.parse(itemTemplate.schema);
        try {
          const zod = buildMetadataSchema(schema);
          validatedMetadata = zod.parse(body.metadata ?? {});
        } catch (e) {
          if ((e as any).name === 'ZodError') {
            return reply.code(422).send({ error: 'invalid_metadata', fields: mapZodErrors(e as any) });
          }
          throw e;
        }
      }

      const created = await prisma.$transaction(async (txAny) => {
        const tx: any = txAny as any;
        const createdPkg = await tx.package.create({
          data: {
            barcode: body.barcode,
            status: body.status,
            // flatten recipient
            recipientName: body.recipient.name,
            recipientPhone: body.recipient.phone,
            recipientEmail: body.recipient.email,
            recipientAddress: body.recipient.address,
            driverId: body.driverId,
            locationLat: body.location?.lat,
            locationLng: body.location?.lng,
            metadata: validatedMetadata as any,
            requirementTemplateId: body.requirementTemplateId,
            itemTemplateId: body.itemTemplateId,
          },
        });

        if (template) {
          const rulesJson = JSON.stringify(template.rules);
          const rulesHash = createHash('sha256').update(rulesJson).digest('hex');
          await tx.packageChecklist.create({ data: { packageId: createdPkg.id, templateId: template.id, rulesHash, progress: {} } });
        }
        return createdPkg;
      });

      // Audit entry
  await prisma.auditEntry.create({
        data: {
          action: 'package_created',
          userId: req.user!.id,
          packageId: created.id,
          deviceInfo: { ua: (req.headers['user-agent'] as string) || '' },
          newState: { id: created.id, barcode: created.barcode, status: created.status },
          locationLat: body.location?.lat,
          locationLng: body.location?.lng,
        },
      });

      await indexPackage(created);
      emitPackageEvent(created.id, 'package.created', { status: created.status, barcode: created.barcode }, created.driverId);
      return reply.code(201).send(created);
    } catch (e: any) {
      // Prisma unique constraint
      if (e?.code === 'P2002') {
        return reply.code(409).send({ error: 'conflict', field: 'barcode' });
      }
      throw e;
    }
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
    status: StatusEnum.optional(),
        driverId: z.string().uuid().optional().nullable(),
    location: LocationSchema.optional(),
        metadata: z.any().optional(),
      })
      .parse(req.body);
  const updated = await prisma.package.update({
      where: { id: params.id },
      data: {
        status: body.status,
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
