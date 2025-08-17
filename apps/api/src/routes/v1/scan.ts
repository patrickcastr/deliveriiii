import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { requireAuth } from '../../guards';
import { PrismaClient, DeliveryEventSource, DeliveryEventType, PackageStatus, Prisma } from '@prisma/client';
import { indexAudit, indexPackage } from '../../services/elasticsearch';
import { emitPackageEvent } from '../../realtime';
import { config } from '../../config';

const prisma = new PrismaClient();

export default async function routes(app: FastifyInstance) {
  // CSRF defense-in-depth: require X-CSRF-Token header matching cookie when enabled
  app.addHook('preHandler', async (req, reply) => {
    if (config.csrfEnabled && req.method !== 'GET' && req.method !== 'HEAD' && req.method !== 'OPTIONS') {
      const header = (req.headers['x-csrf-token'] as string | undefined) || '';
      const cookie = (req.cookies?.['csrf_token'] as string | undefined) || '';
      if (!header || !cookie || header !== cookie) {
        return reply.code(403).send({ error: 'csrf_invalid' });
      }
    }
  });
  // Scan: upsert audit+event, update package status/location
  app.post('/scan', { preHandler: requireAuth('driver'), config: { rateLimit: { max: 120, timeWindow: '1 minute', keyGenerator: (req: any) => `${req.ip}:${req.user?.id ?? 'anon'}` } } }, async (req: FastifyRequest, reply: FastifyReply) => {
    const body = z
      .object({
        barcode: z.string().min(1),
        stage: z.nativeEnum(DeliveryEventType),
        gps: z.object({ lat: z.number(), lng: z.number() }).optional(),
        deviceInfo: z.any().optional(),
      })
      .parse(req.body);

    const pkg = await prisma.package.findUnique({ where: { barcode: body.barcode } });
    if (!pkg) return reply.code(404).send({ error: 'package_not_found' });

    const newStatus: PackageStatus | undefined =
      body.stage === DeliveryEventType.status_updated
        ? undefined
        : body.stage === DeliveryEventType.package_scanned
        ? PackageStatus.in_transit
        : body.stage === DeliveryEventType.delivery_completed
        ? PackageStatus.delivered
        : undefined;

    const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const updatedPkg = await tx.package.update({
        where: { id: pkg.id },
        data: {
          status: newStatus ?? pkg.status,
          locationLat: body.gps?.lat ?? pkg.locationLat,
          locationLng: body.gps?.lng ?? pkg.locationLng,
          deliveredAt: newStatus === PackageStatus.delivered ? new Date() : pkg.deliveredAt,
        },
      });

      const audit = await tx.auditEntry.create({
        data: {
          action: body.stage,
          userId: req.user!.id,
          packageId: pkg.id,
          deviceInfo: body.deviceInfo ?? {},
          locationLat: body.gps?.lat,
          locationLng: body.gps?.lng,
          newState: { status: updatedPkg.status },
        },
      });

      await tx.deliveryEvent.create({
        data: {
          type: body.stage,
          source: DeliveryEventSource.scanner,
          packageId: pkg.id,
          payload: { deviceInfo: body.deviceInfo },
        },
      });

      return { updatedPkg, audit };
    });
    await indexPackage(result.updatedPkg);
    await indexAudit(result.audit);
    emitPackageEvent(result.updatedPkg.id, 'scan.applied', { stage: body.stage }, result.updatedPkg.driverId);
    if (body.gps) emitPackageEvent(result.updatedPkg.id, 'location.changed', { gps: body.gps }, result.updatedPkg.driverId);
    if (newStatus) {
      emitPackageEvent(result.updatedPkg.id, 'status.updated', { status: newStatus }, result.updatedPkg.driverId);
      if (newStatus === PackageStatus.delivered) emitPackageEvent(result.updatedPkg.id, 'delivery.completed', {}, result.updatedPkg.driverId);
    }
    return reply.send(result.updatedPkg);
  });

  // Scan history
  app.get('/scan/history', { preHandler: requireAuth('viewer') }, async (req: FastifyRequest, reply: FastifyReply) => {
    const query = z
      .object({
        packageId: z.string().uuid(),
        from: z.string().datetime().optional(),
        to: z.string().datetime().optional(),
      })
      .parse(req.query);

  const where: Prisma.DeliveryEventWhereInput = { packageId: query.packageId } as Prisma.DeliveryEventWhereInput;
    if (query.from || query.to) where.timestamp = { gte: query.from ? new Date(query.from) : undefined, lte: query.to ? new Date(query.to) : undefined };

    const items = await prisma.deliveryEvent.findMany({ where, orderBy: { timestamp: 'desc' } });
    return reply.send({ items });
  });
}
