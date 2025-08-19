import type { FastifyReply, FastifyRequest } from 'fastify';
import { PrismaClient, PackageStatus } from '@prisma/client';
import { RequirementRulesSchema } from '../domain/requirements';

const prisma = new PrismaClient();

export async function enforceRequirements(req: FastifyRequest, reply: FastifyReply, next: () => void) {
  try {
    const pkgId = (req.params as any)?.id || (req.body as any)?.packageId;
    if (!pkgId) return next();
    const pkg = await prisma.package.findUnique({ where: { id: pkgId }, include: { checklist: { include: { template: true } } } });
    if (!pkg || !pkg.checklist) return next();
    const rules = RequirementRulesSchema.parse((pkg.checklist as any).template.rules);
    const progress = (pkg.checklist as any).progress || {};

    // Integrate with specific route context to update progress and validate transitions.
    // This is a placeholder; actual wiring should provide action context (stage/status/photo/signature/gps).
    // If invalid, return reply.code(422).send({ error: 'requirements_unmet', reasons: [...] })
    return next();
  } catch (e) {
    return next();
  }
}
