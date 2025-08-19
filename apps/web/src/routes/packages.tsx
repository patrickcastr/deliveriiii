import React from 'react';
import { Link } from 'react-router-dom';
import { usePackagesStore } from '../state/packages';
import { PageHeader } from '../components/PageHeader';
import { StatusBadge } from '../components/StatusBadge';

function Drawer({ open, onClose, children }: React.PropsWithChildren<{ open: boolean; onClose: () => void }>) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="h-full w-full flex-1 bg-black/40" onClick={onClose} />
      <div className="h-full w-full max-w-md overflow-auto border-l border-slate-200 bg-white p-4 shadow-xl dark:border-slate-800 dark:bg-slate-900">
        {children}
      </div>
    </div>
  );
}

export default function PackagesPage() {
  const items = usePackagesStore((s) => s.items);
  const [openId, setOpenId] = React.useState<string | null>(null);
  const openItem = items.find((i) => i.id === openId);

  return (
    <div className="space-y-6">
      <PageHeader title="Packages" subtitle="Track and manage packages" action={<Link to="/admin" className="rounded-2xl border px-4 py-2 text-sm">Back to dashboard</Link>} />
      <div className="overflow-x-auto rounded-2xl border bg-white shadow-sm dark:bg-slate-800">
        <table className="min-w-full text-left text-sm">
          <thead className="text-slate-500">
            <tr>
              <th className="px-4 py-2">Barcode</th>
              <th>Status</th>
              <th>Recipient</th>
              <th>Driver</th>
              <th>Updated</th>
              <th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-slate-500">No packages yet.</td>
              </tr>
            )}
            {items.map((it) => (
              <tr key={it.id} className="border-t border-slate-100 dark:border-slate-700">
                <td className="px-4 py-2 font-mono">{it.barcode}</td>
                <td className="px-4 py-2"><StatusBadge status={it.status} /></td>
                <td className="px-4 py-2 text-slate-600">—</td>
                <td className="px-4 py-2 text-slate-600">{it.driverId || '—'}</td>
                <td className="px-4 py-2 text-slate-600">just now</td>
                <td className="px-4 py-2 text-right">
                  <div className="inline-flex gap-2">
                    <button className="rounded-2xl border px-3 py-1.5 text-xs" onClick={()=> setOpenId(it.id)}>View</button>
                    <button className="rounded-2xl border px-3 py-1.5 text-xs">Update status</button>
                    <button className="rounded-2xl border px-3 py-1.5 text-xs">More</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Drawer open={!!openId} onClose={()=> setOpenId(null)}>
        {!openItem ? null : (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Package {openItem.barcode}</h2>
            <div className="space-y-2">
              <div className="text-sm">Status</div>
              <div className="flex items-center gap-2 text-sm">
                <StatusBadge status={openItem.status} />
                <span className="text-slate-500">stepper coming soon</span>
              </div>
            </div>
            <div className="space-y-2">
              <div className="text-sm">Checklist</div>
              <div className="flex flex-wrap gap-2 text-xs">
                <span className="rounded-full bg-slate-100 px-2 py-1 text-slate-700 dark:bg-slate-700 dark:text-slate-200">Fragile</span>
                <span className="rounded-full bg-slate-100 px-2 py-1 text-slate-700 dark:bg-slate-700 dark:text-slate-200">Express</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-2xl border p-3">
                <div className="text-slate-500">Recipient</div>
                <div>—</div>
                <div className="text-slate-500">Contact</div>
                <div>—</div>
              </div>
              <div className="rounded-2xl border p-3">
                <div className="text-slate-500">Notes</div>
                <div className="text-slate-700 dark:text-slate-200">—</div>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button className="rounded-2xl border px-3 py-2 text-sm" onClick={()=> setOpenId(null)}>Close</button>
              <button className="rounded-2xl bg-blue-600 px-3 py-2 text-sm text-white">Update status</button>
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
}
