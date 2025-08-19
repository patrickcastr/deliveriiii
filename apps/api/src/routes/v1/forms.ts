import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import { requireAuth } from '../../guards';

const prisma = new PrismaClient();

// Zod schemas for dynamic form JSON
const BaseField = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  required: z.boolean().optional(),
  helpText: z.string().optional(),
});

const TextField = BaseField.extend({
  type: z.literal('text'),
  placeholder: z.string().optional(),
  maxLength: z.number().int().positive().optional(),
  pattern: z.string().optional(),
});

const TextareaField = BaseField.extend({
  type: z.literal('textarea'),
  rows: z.number().int().positive().optional(),
  maxLength: z.number().int().positive().optional(),
});

const NumberField = BaseField.extend({
  type: z.literal('number'),
  min: z.number().optional(),
  max: z.number().optional(),
  step: z.number().positive().optional(),
  unit: z.string().optional(),
});

const SelectField = BaseField.extend({
  type: z.literal('select'),
  options: z.array(z.object({ value: z.string().min(1), label: z.string().min(1) })).min(1),
});

const CheckboxField = BaseField.extend({
  type: z.literal('checkbox'),
});

const DateField = BaseField.extend({
  type: z.literal('date'),
  minDate: z.string().optional(),
  maxDate: z.string().optional(),
});

const PhoneField = BaseField.extend({ type: z.literal('phone') });
const EmailField = BaseField.extend({ type: z.literal('email') });

const PhotoCountField = BaseField.extend({
  type: z.literal('photo-count'),
  min: z.number().int().nonnegative().optional(),
  max: z.number().int().positive().optional(),
});

const SignatureToggleField = BaseField.extend({ type: z.literal('signature-toggle') });

const FieldSchema = z.discriminatedUnion('type', [
  TextField,
  TextareaField,
  NumberField,
  SelectField,
  CheckboxField,
  DateField,
  PhoneField,
  EmailField,
  PhotoCountField,
  SignatureToggleField,
]);

const FormSchemaV1 = z.object({
  version: z.literal(1),
  fields: z.array(FieldSchema),
});

export default async function routes(app: FastifyInstance) {
  const db = prisma as any;
  // GET /forms/templates?status=draft|published|archived
  app.get('/forms/templates', { preHandler: requireAuth('admin') }, async (req: FastifyRequest, reply: FastifyReply) => {
    const { status } = z.object({ status: z.enum(['draft', 'published', 'archived']).optional() }).parse(req.query);
    const where = status ? ({ status } as any) : ({} as any);
    const items = await db.packageFormTemplate.findMany({ where, orderBy: { updatedAt: 'desc' } });
    return reply.send({ items });
  });

  // POST /forms/templates — create draft
  app.post('/forms/templates', { preHandler: requireAuth('admin') }, async (req: FastifyRequest, reply: FastifyReply) => {
    const body = z.object({
      name: z.string().min(1),
      description: z.string().optional(),
      schema: FormSchemaV1,
    }).parse(req.body);

  const created = await db.packageFormTemplate.create({
      data: {
        name: body.name,
        description: body.description,
        status: 'draft',
        schema: body.schema as any,
        createdById: req.user!.id,
      },
    });
  await db.auditEntry.create({ data: { action: 'form_template_created', userId: req.user!.id, packageId: 'n/a', deviceInfo: {}, newState: created as any } });
    return reply.code(201).send(created);
  });

  // PUT /forms/templates/:id — update
  app.put('/forms/templates/:id', { preHandler: requireAuth('admin') }, async (req: FastifyRequest, reply: FastifyReply) => {
    const params = z.object({ id: z.string().uuid() }).parse(req.params);
    const body = z.object({
      name: z.string().min(1).optional(),
      description: z.string().optional(),
      schema: FormSchemaV1.optional(),
    }).parse(req.body);

  const existing = await db.packageFormTemplate.findUnique({ where: { id: params.id } });
    if (!existing) return reply.code(404).send({ error: 'not_found' });

  const updated = await db.packageFormTemplate.update({
      where: { id: params.id },
      data: {
        name: body.name ?? existing.name,
        description: body.description ?? existing.description,
        schema: (body.schema ?? existing.schema) as any,
      },
    });
  await db.auditEntry.create({ data: { action: 'form_template_updated', userId: req.user!.id, packageId: 'n/a', deviceInfo: {}, previousState: existing as any, newState: updated as any } });
    return reply.send(updated);
  });

  // POST /forms/templates/:id/publish — publish
  app.post('/forms/templates/:id/publish', { preHandler: requireAuth('admin') }, async (req: FastifyRequest, reply: FastifyReply) => {
    const params = z.object({ id: z.string().uuid() }).parse(req.params);
  const existing = await db.packageFormTemplate.findUnique({ where: { id: params.id } });
    if (!existing) return reply.code(404).send({ error: 'not_found' });

  const updated = await db.packageFormTemplate.update({ where: { id: params.id }, data: { status: 'published' } });
  await db.auditEntry.create({ data: { action: 'form_template_published', userId: req.user!.id, packageId: 'n/a', deviceInfo: {}, previousState: existing as any, newState: updated as any } });
    return reply.send(updated);
  });

  // DELETE /forms/templates/:id — archive
  app.delete('/forms/templates/:id', { preHandler: requireAuth('admin') }, async (req: FastifyRequest, reply: FastifyReply) => {
    const params = z.object({ id: z.string().uuid() }).parse(req.params);
  const existing = await db.packageFormTemplate.findUnique({ where: { id: params.id } });
    if (!existing) return reply.code(404).send({ error: 'not_found' });

  const updated = await db.packageFormTemplate.update({ where: { id: params.id }, data: { status: 'archived' } });
  await db.auditEntry.create({ data: { action: 'form_template_archived', userId: req.user!.id, packageId: 'n/a', deviceInfo: {}, previousState: existing as any, newState: updated as any } });
    return reply.code(204).send();
  });
}
