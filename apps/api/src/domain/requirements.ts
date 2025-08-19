import { z } from 'zod';

export const RequirementRulesSchema = z.object({
  requiredStages: z.array(z.enum(['pending','picked_up','in_transit','delivered','failed'])).default(['picked_up','delivered']),
  requirePhotoAtStages: z.record(z.enum(['picked_up','in_transit','delivered']), z.number().int().min(1)).default({}),
  requireSignatureAtDelivery: z.boolean().default(false),
  disallowStatusBackwards: z.boolean().default(true),
  requiredFields: z.array(z.enum(['recipientName','recipientPhone','recipientEmail','recipientAddress'])).default([]),
  geofence: z.object({ lat: z.number(), lng: z.number(), radiusMeters: z.number().min(5) }).optional(),
  labelFormat: z.enum(['CODE128','QR']).default('CODE128'),
  maxWeightKg: z.number().positive().optional(),
});
export type RequirementRules = z.infer<typeof RequirementRulesSchema>;
