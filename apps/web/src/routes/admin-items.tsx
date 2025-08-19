import React from 'react';
import { useForm } from 'react-hook-form';

type Template = { id: string; name: string; description?: string; status: 'draft'|'published'|'archived'; updatedAt: string; schema: any };

type FormInputs = {
  name: string;
  description?: string;
  schemaText: string;
};

type FieldInputs = {
  id: string;
  label: string;
  type: 'text'|'textarea'|'number'|'select'|'checkbox'|'date'|'phone'|'email'|'photo-count'|'signature-toggle';
  required?: boolean;
  // constraints (optional depending on type)
  maxLength?: number;
  pattern?: string;
  min?: number;
  max?: number;
  options?: string; // comma list like: low:Low,high:High
};

function getCsrf() {
  return document.cookie.match(/(?:^|; )csrf_token=([^;]+)/)?.[1] || '';
}

function pretty(obj: any) {
  return JSON.stringify(obj, null, 2);
}

function defaultSchema() {
  return pretty({ version: 1, fields: [] });
}

export default function AdminItems() {
  const [items, setItems] = React.useState<Template[]>([]);
  const [selected, setSelected] = React.useState<Template | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  const { register, handleSubmit, reset, getValues, setValue, formState: { isDirty } } = useForm<FormInputs>({
    defaultValues: { name: '', description: '', schemaText: defaultSchema() },
  });
  const fieldForm = useForm<FieldInputs>({ defaultValues: { type: 'text', required: false } });

  React.useEffect(() => { void load(); }, []);
  async function load() {
    const res = await fetch('/api/v1/items/templates', { credentials: 'include' });
    if (res.ok) {
      const data = await res.json();
      setItems(data.items || []);
    }
  }

  function openNew() {
    setSelected(null);
    reset({ name: '', description: '', schemaText: defaultSchema() });
  }

  function openEdit(t: Template) {
    setSelected(t);
    reset({ name: t.name, description: t.description ?? '', schemaText: pretty(t.schema ?? { version: 1, fields: [] }) });
  }

  function addField(values: FieldInputs) {
    setError(null);
    try {
      const current = JSON.parse(getValues('schemaText') || '{}');
      if (!current || current.version !== 1 || !Array.isArray(current.fields)) {
        throw new Error('Schema must be an object with version:1 and fields:[]');
      }
      const base: any = { id: values.id.trim(), label: values.label.trim(), type: values.type, required: !!values.required };
      if (!base.id || !base.label) throw new Error('Field id and label are required');
      switch (values.type) {
        case 'text':
        case 'textarea':
          if (values.maxLength) base.maxLength = Number(values.maxLength);
          if (values.pattern) base.pattern = values.pattern;
          break;
        case 'number':
        case 'photo-count':
          if (values.min !== undefined) base.min = Number(values.min);
          if (values.max !== undefined) base.max = Number(values.max);
          break;
        case 'select':
          {
            const opts = (values.options || '')
              .split(',')
              .map((s) => s.trim())
              .filter(Boolean)
              .map((pair) => {
                const [v, l] = pair.split(':');
                return { value: (v || '').trim(), label: (l || v || '').trim() };
              })
              .filter((o) => o.value);
            if (!opts.length) throw new Error('At least one select option required');
            base.options = opts;
          }
          break;
        default:
          // checkbox, date, phone, email, signature-toggle have no extra constraints here
          break;
      }
      current.fields.push(base);
      setValue('schemaText', pretty(current), { shouldDirty: true });
      fieldForm.reset({ type: values.type, required: values.required });
    } catch (e: any) {
      setError(e?.message || 'Invalid schema');
    }
  }

  const onSave = handleSubmit(async (data) => {
    setBusy(true); setError(null);
    try {
      const schema = JSON.parse(data.schemaText || '{}');
      if (schema.version !== 1 || !Array.isArray(schema.fields)) throw new Error('Schema must have version:1 and fields:[]');
      const csrf = getCsrf();
      if (selected) {
        const res = await fetch(`/api/v1/items/templates/${selected.id}`, {
          method: 'PUT', headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf }, credentials: 'include',
          body: JSON.stringify({ name: data.name, description: data.description || undefined, schema }),
        });
        if (!res.ok) throw new Error('Failed to save');
      } else {
        const res = await fetch('/api/v1/items/templates', {
          method: 'POST', headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf }, credentials: 'include',
          body: JSON.stringify({ name: data.name, description: data.description || undefined, schema }),
        });
        if (!res.ok) throw new Error('Failed to create');
      }
      await load();
    } catch (e: any) {
      setError(e?.message || 'Save failed');
    } finally {
      setBusy(false);
    }
  });

  async function publish(t: Template) {
    setBusy(true); setError(null);
    const csrf = getCsrf();
    const res = await fetch(`/api/v1/items/templates/${t.id}/publish`, { method: 'POST', headers: { 'X-CSRF-Token': csrf }, credentials: 'include' });
    if (!res.ok) setError('Publish failed');
    await load();
    setBusy(false);
  }

  async function archive(t: Template) {
    setBusy(true); setError(null);
    const csrf = getCsrf();
    const res = await fetch(`/api/v1/items/templates/${t.id}`, { method: 'DELETE', headers: { 'X-CSRF-Token': csrf }, credentials: 'include' });
    if (!res.ok) setError('Archive failed');
    await load();
    setBusy(false);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Item Templates</h1>
        <button className="rounded bg-blue-600 px-3 py-1 text-sm text-white" onClick={openNew}>New Template</button>
      </div>

      {error && <div className="rounded border border-red-200 bg-red-50 p-2 text-sm text-red-700">{error}</div>}

      <div className="rounded border bg-white p-4 shadow-sm dark:bg-slate-800">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="text-slate-500"><th className="py-2">Name</th><th>Status</th><th>Updated</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {items.length === 0 && <tr><td colSpan={4} className="py-6 text-center text-slate-500">No templates</td></tr>}
            {items.map((t)=> (
              <tr key={t.id} className="align-top">
                <td className="py-2">
                  <button className="text-blue-600 hover:underline" onClick={()=> openEdit(t)}>{t.name}</button>
                  <div className="text-xs text-slate-500">{t.description || '—'}</div>
                </td>
                <td>{t.status}</td>
                <td className="text-slate-500">{new Date(t.updatedAt).toLocaleString()}</td>
                <td className="space-x-2">
                  {t.status !== 'published' && <button disabled={busy} className="rounded border px-2 py-1 text-xs" onClick={()=> publish(t)}>Publish</button>}
                  {t.status !== 'archived' && <button disabled={busy} className="rounded border px-2 py-1 text-xs" onClick={()=> archive(t)}>Archive</button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="rounded border bg-white p-4 shadow-sm dark:bg-slate-800">
        <h2 className="mb-3 text-lg font-semibold">{selected ? 'Edit Template' : 'New Template'}</h2>
        <form onSubmit={onSave} className="space-y-3">
          <div>
            <label className="block text-sm">Name</label>
            <input className="w-full rounded border p-2" {...register('name', { required: true })} />
          </div>
          <div>
            <label className="block text-sm">Description</label>
            <input className="w-full rounded border p-2" {...register('description')} />
          </div>
          <div>
            <label className="mb-1 block text-sm">Schema (JSON)</label>
            <textarea className="h-56 w-full rounded border p-2 font-mono text-xs" spellCheck={false} {...register('schemaText', { required: true })} />
          </div>

          <fieldset className="rounded border p-3">
            <legend className="px-1 text-sm font-medium">Add Field</legend>
            <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
              <div><label className="block text-xs">ID</label><input className="w-full rounded border p-1" {...fieldForm.register('id', { required: true })} /></div>
              <div><label className="block text-xs">Label</label><input className="w-full rounded border p-1" {...fieldForm.register('label', { required: true })} /></div>
              <div>
                <label className="block text-xs">Type</label>
                <select className="w-full rounded border p-1" {...fieldForm.register('type')}>{
                  ['text','textarea','number','select','checkbox','date','phone','email','photo-count','signature-toggle'].map((t)=> (
                    <option key={t} value={t}>{t}</option>
                  ))
                }</select>
              </div>
              <div className="flex items-center gap-2"><input type="checkbox" {...fieldForm.register('required')} id="required" /><label htmlFor="required" className="text-xs">Required</label></div>
              <div><label className="block text-xs">maxLength (text)</label><input type="number" className="w-full rounded border p-1" {...fieldForm.register('maxLength', { valueAsNumber: true })} /></div>
              <div><label className="block text-xs">pattern (text)</label><input className="w-full rounded border p-1" {...fieldForm.register('pattern')} /></div>
              <div><label className="block text-xs">min (number)</label><input type="number" className="w-full rounded border p-1" {...fieldForm.register('min', { valueAsNumber: true })} /></div>
              <div><label className="block text-xs">max (number)</label><input type="number" className="w-full rounded border p-1" {...fieldForm.register('max', { valueAsNumber: true })} /></div>
              <div className="md:col-span-3"><label className="block text-xs">options (select) value:Label, ...</label><input className="w-full rounded border p-1" placeholder="low:Low,high:High" {...fieldForm.register('options')} /></div>
            </div>
            <div className="mt-2 flex justify-end">
              <button type="button" className="rounded border px-3 py-1 text-sm" onClick={fieldForm.handleSubmit(addField)}>Add</button>
            </div>
          </fieldset>

          <div className="flex justify-end gap-2 pt-2">
            <button type="submit" disabled={busy} className="rounded bg-blue-600 px-3 py-2 text-white">{selected ? 'Save Draft' : 'Create Draft'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
