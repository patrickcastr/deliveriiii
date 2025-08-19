import React from 'react';

type Template = { id: string; name: string; description?: string; active: boolean; updatedAt: string };

export default function AdminRequirements() {
  const [items, setItems] = React.useState<Template[]>([]);
  const [open, setOpen] = React.useState(false);
  const [name, setName] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => { void load(); }, []);
  async function load() {
    const res = await fetch('/api/v1/requirements/templates?active=true', { credentials: 'include' });
    if (res.ok) {
      const data = await res.json();
      setItems(data.items || []);
    }
  }

  async function createTemplate(e: React.FormEvent) {
    e.preventDefault(); setError(null);
    if (!name.trim()) { setError('Name required'); return; }
    const csrf = document.cookie.match(/(?:^|; )csrf_token=([^;]+)/)?.[1] || '';
    const payload = { name: name.trim(), description: description.trim() || undefined, rules: {} };
    const res = await fetch('/api/v1/requirements/templates', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf }, credentials: 'include', body: JSON.stringify(payload) });
    if (!res.ok) { setError('Failed to create'); return; }
    setOpen(false); setName(''); setDescription('');
    await load();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Package Requirements</h1>
        <button className="rounded bg-blue-600 px-3 py-1 text-sm text-white" onClick={()=> setOpen(true)}>New Template</button>
      </div>
      <div className="rounded border bg-white p-4 shadow-sm dark:bg-slate-800">
        <table className="w-full text-left text-sm">
          <thead><tr className="text-slate-500"><th className="py-2">Name</th><th>Active</th><th>Updated</th></tr></thead>
          <tbody>
            {items.length === 0 && <tr><td colSpan={3} className="py-6 text-center text-slate-500">No templates</td></tr>}
            {items.map((t)=> (
              <tr key={t.id}><td className="py-2">{t.name}</td><td>{t.active? 'yes' : 'no'}</td><td className="text-slate-500">{new Date(t.updatedAt).toLocaleString()}</td></tr>
            ))}
          </tbody>
        </table>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-md rounded bg-white p-4 shadow-xl dark:bg-neutral-900">
            <h2 className="mb-3 text-lg font-semibold">New Template</h2>
            {error && <div className="mb-2 rounded bg-red-50 p-2 text-sm text-red-700">{error}</div>}
            <form onSubmit={createTemplate} className="space-y-3">
              <div><label className="block text-sm">Name</label><input className="w-full rounded border p-2" value={name} onChange={(e)=> setName(e.target.value)} /></div>
              <div><label className="block text-sm">Description</label><input className="w-full rounded border p-2" value={description} onChange={(e)=> setDescription(e.target.value)} /></div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" className="rounded border px-3 py-2" onClick={()=> setOpen(false)}>Cancel</button>
                <button className="rounded bg-blue-600 px-3 py-2 text-white">Create</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
