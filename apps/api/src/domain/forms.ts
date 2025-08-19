import { z, ZodError, ZodTypeAny } from 'zod';

// Zod for stored form schema JSON
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

const CheckboxField = BaseField.extend({ type: z.literal('checkbox') });

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

export const FormSchemaV1Z = z.object({
  version: z.literal(1),
  fields: z.discriminatedUnion('type', [
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
  ]).array(),
});

export type FormSchemaV1 = z.infer<typeof FormSchemaV1Z>;

function zodForField(f: z.infer<typeof BaseField> & { type: string } & Record<string, any>): ZodTypeAny {
  switch (f.type) {
    case 'text': {
      let s = z.string();
      if (f.maxLength) s = s.max(f.maxLength);
      if (f.pattern) s = s.regex(new RegExp(f.pattern));
      return f.required ? s.min(1) : s.optional();
    }
    case 'textarea': {
      let s = z.string();
      if (f.maxLength) s = s.max(f.maxLength);
      return f.required ? s.min(1) : s.optional();
    }
    case 'number': {
      let s = z.number();
      if (typeof f.min === 'number') s = s.gte(f.min);
      if (typeof f.max === 'number') s = s.lte(f.max);
      return f.required ? s : s.optional();
    }
    case 'select': {
      const values = (f.options ?? []).map((o: any) => o.value);
      let s = z.string().refine((v) => values.includes(v), { message: 'invalid_selection' });
      return f.required ? s : s.optional();
    }
    case 'checkbox': {
      const s = z.boolean();
      return f.required ? s : s.optional();
    }
    case 'date': {
      let s: ZodTypeAny = z.string().refine((v) => !Number.isNaN(Date.parse(v)), { message: 'invalid_date' });
      if (f.minDate) {
        const min = Date.parse(f.minDate);
        s = (s as ZodTypeAny).refine((v: string) => Date.parse(v) >= min, { message: 'date_too_early' });
      }
      if (f.maxDate) {
        const max = Date.parse(f.maxDate);
        s = (s as ZodTypeAny).refine((v: string) => Date.parse(v) <= max, { message: 'date_too_late' });
      }
      return f.required ? s : (s as ZodTypeAny).optional();
    }
    case 'phone': {
      // Basic phone; UI can enforce better formatting
      const s = z.string();
      return f.required ? s.min(7) : s.optional();
    }
    case 'email': {
      const s = z.string().email();
      return f.required ? s : s.optional();
    }
    case 'photo-count': {
      let s = z.number().int();
      if (typeof f.min === 'number') s = s.gte(f.min);
      if (typeof f.max === 'number') s = s.lte(f.max);
      return f.required ? s : s.optional();
    }
    case 'signature-toggle': {
      const s = z.boolean();
      return f.required ? s : s.optional();
    }
    default:
      return z.any();
  }
}

export function buildMetadataSchema(schema: FormSchemaV1) {
  const shape: Record<string, ZodTypeAny> = {};
  for (const f of schema.fields) {
    shape[f.id] = zodForField(f as any);
  }
  return z.object(shape).strict();
}

export function mapZodErrors(err: ZodError) {
  const fieldErrors: Record<string, string[]> = {};
  for (const issue of err.errors) {
    const field = (issue.path?.[0] as string) || '_';
    if (!fieldErrors[field]) fieldErrors[field] = [];
    fieldErrors[field].push(issue.message);
  }
  return fieldErrors;
}
