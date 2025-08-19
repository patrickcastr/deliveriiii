import React from 'react';
import type { FieldErrors, UseFormRegister } from 'react-hook-form';

type Schema = { version: 1; fields: Array<any> };

type Props = {
  schema: Schema;
  register: UseFormRegister<any>;
  errors: FieldErrors<any>;
};

export function RenderDynamicFields({ schema, register, errors }: Props) {
  if (!schema || schema.version !== 1) return null;
  return (
    <div className="space-y-3">
      {schema.fields.map((f: any) => {
        const name = `metadata.${f.id}` as const;
        const err = (errors as any)?.metadata?.[f.id]?.message as string | undefined;
        const inputId = `mf-${f.id}`;
        switch (f.type) {
          case 'text':
          case 'phone':
          case 'email':
            return (
              <div key={f.id}>
                <label htmlFor={inputId} className="block text-sm">{f.label}{f.required && ' *'}</label>
                <input id={inputId} className="w-full rounded border p-2" placeholder={f.placeholder || ''} aria-invalid={!!err || undefined} aria-describedby={err ? `${inputId}-err` : undefined} {...register(name)} />
                {err && <p id={`${inputId}-err`} className="text-sm text-red-600">{err}</p>}
              </div>
            );
          case 'textarea':
            return (
              <div key={f.id}>
                <label htmlFor={inputId} className="block text-sm">{f.label}{f.required && ' *'}</label>
                <textarea id={inputId} className="w-full rounded border p-2" rows={f.rows || 3} aria-invalid={!!err || undefined} aria-describedby={err ? `${inputId}-err` : undefined} {...register(name)} />
                {err && <p id={`${inputId}-err`} className="text-sm text-red-600">{err}</p>}
              </div>
            );
          case 'number':
          case 'photo-count':
            return (
              <div key={f.id}>
                <label htmlFor={inputId} className="block text-sm">{f.label}{f.required && ' *'}</label>
                <input id={inputId} className="w-full rounded border p-2" type="number" step={f.step || 1} aria-invalid={!!err || undefined} aria-describedby={err ? `${inputId}-err` : undefined} {...register(name, { valueAsNumber: true })} />
                {err && <p id={`${inputId}-err`} className="text-sm text-red-600">{err}</p>}
              </div>
            );
          case 'select':
            return (
              <div key={f.id}>
                <label htmlFor={inputId} className="block text-sm">{f.label}{f.required && ' *'}</label>
                <select id={inputId} className="w-full rounded border p-2" aria-invalid={!!err || undefined} aria-describedby={err ? `${inputId}-err` : undefined} {...register(name)}>
                  <option value="">Select…</option>
                  {(f.options || []).map((o: any) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
                {err && <p id={`${inputId}-err`} className="text-sm text-red-600">{err}</p>}
              </div>
            );
          case 'checkbox':
          case 'signature-toggle':
            return (
              <div key={f.id}>
                <div className="flex items-center gap-2">
                  <input id={inputId} type="checkbox" aria-invalid={!!err || undefined} aria-describedby={err ? `${inputId}-err` : undefined} {...register(name)} />
                  <label htmlFor={inputId} className="text-sm">{f.label}{f.required && ' *'}</label>
                </div>
                {err && <p id={`${inputId}-err`} className="text-sm text-red-600">{err}</p>}
              </div>
            );
          case 'date':
            return (
              <div key={f.id}>
                <label htmlFor={inputId} className="block text-sm">{f.label}{f.required && ' *'}</label>
                <input id={inputId} className="w-full rounded border p-2" type="date" aria-invalid={!!err || undefined} aria-describedby={err ? `${inputId}-err` : undefined} {...register(name)} />
                {err && <p id={`${inputId}-err`} className="text-sm text-red-600">{err}</p>}
              </div>
            );
          default:
            return null;
        }
      })}
    </div>
  );
}
