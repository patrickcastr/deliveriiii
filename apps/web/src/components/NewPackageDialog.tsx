import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { usePackagesStore } from '../state/packages';
import { RenderDynamicFields } from './RenderDynamicFields';
import { useToast } from './ui/toast';

// --- base schema (always defined) ---
const baseSchema = z.object({
  barcode: z.string().min(3),
  recipientName: z.string().min(1),
  recipientAddress: z.string().min(3),
  recipientEmail: z.string().email().optional().or(z.literal('').transform(() => undefined)),
  recipientPhone: z.string().optional(),
  driverId: z.string().uuid().optional().or(z.literal('').transform(() => undefined)),
  templateId: z.string().uuid().optional().or(z.literal('').transform(() => undefined)),
  itemTemplateId: z.string().uuid().optional().or(z.literal('').transform(() => undefined)),
  metadata: z.string().optional(), // freeform JSON string
});

type BaseForm = z.infer<typeof baseSchema>;

type Props = { open: boolean; onClose: () => void };

export default function NewPackageDialog({ open, onClose }: Props) {
  // external state and local UI state — hooks always called
  const addPackage = usePackagesStore((s) => s.addPackage);
  const { toast } = useToast();
  const [templates, setTemplates] = useState<Array<{ id: string; name: string; rules?: any; active?: boolean }>>([]);
  const [itemTemplates, setItemTemplates] = useState<Array<{ id: string; name: string; status: string; schema: any }>>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | undefined>(undefined);
  const [selectedItemTemplateId, setSelectedItemTemplateId] = useState<string | undefined>(undefined);
  const selectedItemTemplate = useMemo(() => itemTemplates.find((t) => t.id === selectedItemTemplateId), [itemTemplates, selectedItemTemplateId]);
  const [formKey, setFormKey] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const firstFieldRef = useRef<HTMLInputElement | null>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  // fetch templates once (guard inside, not conditional hook)
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/v1/requirements/templates?active=true', { credentials: 'include' });
        if (res.ok) {
          const data = await res.json();
          setTemplates((data.items || []).map((t: any) => ({ id: t.id, name: t.name, rules: t.rules, active: t.active })));
        }
      } catch {}
      try {
        const res2 = await fetch('/api/v1/items/templates?status=published', { credentials: 'include' });
        if (res2.ok) {
          const data2 = await res2.json();
          setItemTemplates((data2.items || []).map((t: any) => ({ id: t.id, name: t.name, status: t.status, schema: t.schema })));
        }
      } catch {}
    })();
  }, []);

  const selectedTemplate = useMemo(() => templates.find((t) => t.id === selectedTemplateId), [templates, selectedTemplateId]);

  // build a dynamic schema based on selected template; memoize it
  const schema = useMemo(() => {
    if (!selectedTemplate) return baseSchema;
    const rules = selectedTemplate.rules as any | undefined;
    let s = baseSchema;
    if (rules?.maxWeightKg) {
      s = s.extend({
        weightKg: z
          .number({ invalid_type_error: 'Weight must be a number' })
          .positive('Weight must be > 0')
          .max(rules.maxWeightKg, `Must be ≤ ${rules.maxWeightKg}kg`),
      });
    }
    return s;
  }, [selectedTemplate]);

  const resolver = useMemo(() => zodResolver(schema) as any, [schema]);

  // Remount the form when schema changes to avoid conditional hook usage
  useEffect(() => {
    setFormKey((k) => k + 1);
  }, [schema]);

  // Important: call useForm once per render
  const { register, handleSubmit, formState, reset, setValue, setError: setFormError } = useForm<BaseForm>({
    resolver,
    mode: 'onChange',
    defaultValues: {
      barcode: '',
      recipientName: '',
      recipientAddress: '',
      recipientEmail: '',
      recipientPhone: '',
      driverId: undefined,
      templateId: selectedTemplateId,
  itemTemplateId: selectedItemTemplateId,
      metadata: '',
    } as any,
  });

  // Effects are declared unconditionally; guard inside
  useEffect(() => {
    if (!open) return;
    previouslyFocused.current = (document.activeElement as HTMLElement) || null;
    // focus first field soon after mount
    const t = window.setTimeout(() => firstFieldRef.current?.focus(), 0);
    return () => window.clearTimeout(t);
  }, [open]);

  // ESC to close and simple focus trap within the dialog
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
      if (e.key === 'Tab' && dialogRef.current) {
        const focusables = dialogRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'
        );
        const list = Array.from(focusables);
        if (list.length === 0) return;
        const first = list[0];
        const last = list[list.length - 1];
        const active = document.activeElement as HTMLElement;
        if (!e.shiftKey && active === last) {
          e.preventDefault();
          first.focus();
        } else if (e.shiftKey && active === first) {
          e.preventDefault();
          last.focus();
        }
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      previouslyFocused.current?.focus?.();
    };
  }, [open, onClose]);

  useEffect(() => {
    setValue('templateId', selectedTemplateId as any);
  }, [selectedTemplateId, setValue]);
  useEffect(() => {
    setValue('itemTemplateId', selectedItemTemplateId as any);
  }, [selectedItemTemplateId, setValue]);

  const onSubmit = useCallback(
    async (vals: BaseForm) => {
      setErrorMsg(null);
      let meta: any = undefined;
      try {
        meta = vals.metadata ? JSON.parse(vals.metadata) : undefined;
      } catch {
        setErrorMsg('Metadata must be valid JSON');
        return;
      }

      const payload: any = {
        barcode: vals.barcode,
        recipient: {
          name: vals.recipientName,
          phone: vals.recipientPhone,
          email: vals.recipientEmail,
          address: vals.recipientAddress,
        },
        driverId: vals.driverId,
        metadata: meta,
        status: 'pending',
        requirementTemplateId: vals.templateId,
  itemTemplateId: vals.itemTemplateId,
      };

      // optimistic insert
      const tempId = `temp_${Date.now()}`;
      addPackage({ id: tempId, barcode: payload.barcode, status: 'pending', driverId: payload.driverId, recipient: payload.recipient, createdAt: new Date().toISOString() } as any);
      try {
        const csrf = document.cookie.match(/(?:^|; )csrf_token=([^;]+)/)?.[1] || '';
        const res = await fetch('/api/v1/packages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf },
          credentials: 'include',
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          // Try to map 422 invalid_metadata into field errors
          try {
            const text = await res.text();
            const data = JSON.parse(text);
            if (res.status === 422 && data?.error === 'invalid_metadata' && data?.fields) {
              setErrorMsg('Please fix the highlighted fields.');
              // Map server errors to RHF errors by setting messages on metadata.<id> via render-time lookup
              Object.entries<Record<string, string[]>>(data.fields as any).forEach(([fieldId, messages]) => {
                if (!fieldId) return;
                const msg = messages?.[0] || 'Invalid value';
                (setFormError as any)(`metadata.${fieldId}`, { type: 'server', message: msg });
              });
            } else {
              throw new Error(text);
            }
          } catch (e) {
            throw e;
          }
          return;
        }
        const created = await res.json();
        usePackagesStore.getState().replacePackage(tempId, created);
        reset();
        onClose();
    toast({ title: 'Package created', description: `${created.barcode} queued`, variant: 'success' });
      } catch (e: any) {
        usePackagesStore.getState().removePackage(tempId);
        setErrorMsg(e?.message || 'Failed to create package');
    toast({ title: 'Failed to create package', description: String(e?.message || 'Unknown error'), variant: 'error' });
      }
    },
  [addPackage, onClose, reset, toast],
  );

  // Conditional JSX is fine; hooks already ran above
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="newpkg-title"
        className="w-full max-w-md rounded-2xl bg-white p-4 shadow-xl outline-none dark:bg-neutral-900"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="newpkg-title" className="mb-3 text-lg font-semibold">New package</h2>
  {errorMsg && <div className="mb-2 rounded bg-red-50 p-2 text-sm text-red-700">{errorMsg}</div>}
        <form key={formKey} onSubmit={handleSubmit(onSubmit)} className="space-y-3">
          <div>
            <label htmlFor="np-template" className="block text-sm">Requirement template</label>
            <select
              id="np-template"
              className="w-full rounded border p-2"
              value={selectedTemplateId ?? ''}
              onChange={(e) => setSelectedTemplateId(e.target.value || undefined)}
            >
              <option value="">None</option>
              {templates.filter((t) => t.active !== false).map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
            {!!selectedTemplate && (
              <div className="mt-1 text-xs text-slate-600">Req: {summarizeRules(selectedTemplate.rules)}</div>
            )}
          </div>

          <div>
            <label htmlFor="np-item-template" className="block text-sm">Item template</label>
            <select id="np-item-template" data-cy="item-template" className="w-full rounded border p-2" value={selectedItemTemplateId ?? ''} onChange={(e)=> setSelectedItemTemplateId(e.target.value || undefined)}>
              <option value="">None</option>
              {itemTemplates.filter((t)=> t.status === 'published').map((t)=> (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="np-barcode" className="block text-sm">Barcode</label>
            {(() => {
              const { ref: rhfRef, ...rest } = register('barcode');
              return (
                <input
                  id="np-barcode"
                  ref={(el) => {
                    rhfRef(el);
                    (firstFieldRef as any).current = el;
                  }}
                  data-cy="barcode"
                  className="w-full rounded border p-2"
                  placeholder="Scan or type barcode"
                  aria-invalid={!!formState.errors.barcode || undefined}
                  aria-describedby={formState.errors.barcode ? 'np-barcode-err' : undefined}
                  {...rest}
                />
              );
            })()}
            {formState.errors.barcode && (
              <p id="np-barcode-err" className="text-sm text-red-600">{String(formState.errors.barcode.message)}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label htmlFor="np-recipient-name" className="block text-sm">Recipient name</label>
              <input id="np-recipient-name" data-cy="recipient-name" className="w-full rounded border p-2" aria-invalid={!!formState.errors.recipientName || undefined} aria-describedby={formState.errors.recipientName ? 'np-recipient-name-err' : undefined} {...register('recipientName')} />
              {formState.errors.recipientName && (
                <p id="np-recipient-name-err" className="text-sm text-red-600">{String(formState.errors.recipientName.message)}</p>
              )}
            </div>
            <div>
              <label htmlFor="np-recipient-phone" className="block text-sm">Phone</label>
              <input id="np-recipient-phone" className="w-full rounded border p-2" inputMode="tel" {...register('recipientPhone')} />
            </div>
            <div>
              <label htmlFor="np-recipient-email" className="block text-sm">Email</label>
              <input id="np-recipient-email" className="w-full rounded border p-2" inputMode="email" aria-invalid={!!formState.errors.recipientEmail || undefined} aria-describedby={formState.errors.recipientEmail ? 'np-recipient-email-err' : undefined} {...register('recipientEmail')} />
              {formState.errors.recipientEmail && (
                <p id="np-recipient-email-err" className="text-sm text-red-600">{String(formState.errors.recipientEmail.message)}</p>
              )}
            </div>
            <div>
              <label htmlFor="np-driver-id" className="block text-sm">Driver ID (optional)</label>
              <input id="np-driver-id" className="w-full rounded border p-2" placeholder="Enter driver ID" {...register('driverId' as const)} />
            </div>
          </div>

          <div>
            <label htmlFor="np-recipient-address" className="block text-sm">Delivery address</label>
            <textarea id="np-recipient-address" data-cy="recipient-address" className="w-full rounded border p-2" rows={3} aria-invalid={!!formState.errors.recipientAddress || undefined} aria-describedby={formState.errors.recipientAddress ? 'np-recipient-address-err' : undefined} {...register('recipientAddress')} />
            {formState.errors.recipientAddress && (
              <p id="np-recipient-address-err" className="text-sm text-red-600">{String(formState.errors.recipientAddress.message)}</p>
            )}
          </div>

      {selectedItemTemplate && (
            <div>
        <RenderDynamicFields schema={selectedItemTemplate.schema} register={register as any} errors={formState.errors} />
            </div>
          )}

          {'maxWeightKg' in ((selectedTemplate?.rules as any) || {}) && (
            <div>
              <label htmlFor="np-weight-kg" className="block text-sm">Weight (kg)</label>
              <input id="np-weight-kg" className="w-full rounded border p-2" aria-invalid={!!(formState.errors as any)['weightKg'] || undefined} aria-describedby={(formState.errors as any)['weightKg'] ? 'np-weight-kg-err' : undefined} {...register('weightKg' as any)} />
              {(formState.errors as any)['weightKg'] && (
                <p id="np-weight-kg-err" className="text-sm text-red-600">{String((formState.errors as any)['weightKg']?.message)}</p>
              )}
            </div>
          )}

          <div className="sticky bottom-0 -mx-4 flex justify-end gap-2 border-t bg-white px-4 pt-3 dark:bg-neutral-900">
            <button type="button" className="rounded-2xl border px-4 py-2 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2" onClick={onClose}>
              Cancel
            </button>
            <button
              data-cy="create-package"
              disabled={formState.isSubmitting}
              className="rounded-2xl bg-blue-600 px-4 py-2 text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 disabled:opacity-50"
            >
              {formState.isSubmitting ? 'Saving…' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function summarizeRules(rules?: any): string {
  if (!rules) return '';
  const parts: string[] = [];
  if (rules.requireSignatureAtDelivery) parts.push('Signature');
  const photos = rules.requirePhotoAtStages || {};
  Object.keys(photos).forEach((stage) => parts.push(`Photo@${stage}=${photos[stage]}`));
  if (rules.geofence?.radiusMeters) parts.push(`Geofence ${rules.geofence.radiusMeters}m`);
  return parts.join(', ');
}
