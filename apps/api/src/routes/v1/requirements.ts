import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import { requireAuth } from '../../guards';
import { RequirementRulesSchema } from '../../domain/requirements';

const prisma = new PrismaClient();

export default async function routes(app: FastifyInstance) {
  // List templates
  app.get('/requirements/templates', { preHandler: requireAuth('admin') }, async (req: FastifyRequest, reply: FastifyReply) => {
    const { active } = z.object({ active: z.coerce.boolean().optional() }).parse(req.query);
    const items = await prisma.packageRequirementTemplate.findMany({ where: { active: active ?? undefined }, orderBy: { updatedAt: 'desc' } });
    return reply.send({ items });
  });

  // Create template
  app.post('/requirements/templates', { preHandler: requireAuth('admin') }, async (req: FastifyRequest, reply: FastifyReply) => {
    const body = z.object({ name: z.string().min(1), description: z.string().optional(), rules: RequirementRulesSchema }).parse(req.body);
    const created = await prisma.packageRequirementTemplate.create({ data: { name: body.name, description: body.description, rules: body.rules as any, createdById: req.user!.id } });
    await prisma.auditEntry.create({ data: { action: 'requirement_template_created', userId: req.user!.id, packageId: 'n/a', deviceInfo: {}, newState: created as any } });
    return reply.code(201).send(created);
  });

  // Update template
  app.put('/requirements/templates/:id', { preHandler: requireAuth('admin') }, async (req: FastifyRequest, reply: FastifyReply) => {
    const params = z.object({ id: z.string().uuid() }).parse(req.params);
    const body = z.object({ name: z.string().min(1).optional(), description: z.string().optional(), rules: RequirementRulesSchema.optional(), active: z.boolean().optional() }).parse(req.body);
    const existing = await prisma.packageRequirementTemplate.findUnique({ where: { id: params.id } });
    if (!existing) return reply.code(404).send({ error: 'not_found' });
    const updated = await prisma.packageRequirementTemplate.update({ where: { id: params.id }, data: { ...body, rules: (body.rules ?? existing.rules) as any } });
    await prisma.auditEntry.create({ data: { action: 'requirement_template_updated', userId: req.user!.id, packageId: 'n/a', deviceInfo: {}, previousState: existing as any, newState: updated as any } });
    return reply.send(updated);
  });

  // Soft delete (active=false)
  app.delete('/requirements/templates/:id', { preHandler: requireAuth('admin') }, async (req: FastifyRequest, reply: FastifyReply) => {
    const params = z.object({ id: z.string().uuid() }).parse(req.params);
    const existing = await prisma.packageRequirementTemplate.findUnique({ where: { id: params.id } });
    if (!existing) return reply.code(404).send({ error: 'not_found' });
    const updated = await prisma.packageRequirementTemplate.update({ where: { id: params.id }, data: { active: false } });
    await prisma.auditEntry.create({ data: { action: 'requirement_template_deleted', userId: req.user!.id, packageId: 'n/a', deviceInfo: {}, previousState: existing as any, newState: updated as any } });
    return reply.code(204).send();
  });
}
