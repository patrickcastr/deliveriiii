import React from 'react';
import { Link } from 'react-router-dom';
import { PageHeader } from '../components/PageHeader';
import { StatCard } from '../components/StatCard';
import { useRealtimeRoleRoom } from '../lib/realtime';
import { usePackagesStore, shallow as shallowZ } from '../state/packages';
import NewPackageDialog from '../components/NewPackageDialog';

export default function AdminDashboard() {
  const { connected } = useRealtimeRoleRoom('admin');
  const items = usePackagesStore((s) => s.items);
  const [open, setOpen] = React.useState(false);
  // Example of stable selection (kept for future wiring)
  const counts = usePackagesStore(
    (s) => s.items.reduce<Record<string, number>>((acc, it) => {
      acc[it.status] = (acc[it.status] || 0) + 1;
      return acc;
    }, {}),
  );
  // placeholders for cards and charts
  return (
    <div className="space-y-6">
      <PageHeader title="Dashboard" subtitle="At-a-glance system status and recent activity" action={<button data-cy="new-package" className="hidden rounded-2xl bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm md:inline" onClick={()=> setOpen(true)}>New package</button>} />
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard title="In transit" value={counts['in_transit'] ?? 0} />
        <StatCard title="Out for delivery" value={counts['picked_up'] ?? 0} />
        <StatCard title="Delivered today" value={counts['delivered'] ?? 0} />
        <StatCard title="Failed" value={counts['failed'] ?? 0} />
      </div>
      <div className="rounded-2xl border bg-white p-4 shadow-sm dark:bg-slate-800">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Packages</h2>
          <div className="flex items-center gap-2">
            <span className={`text-xs ${connected? 'text-green-600' : 'text-slate-500'}`}>{connected? 'live' : 'offline'}</span>
            <button data-cy="new-package" className="rounded-2xl bg-blue-600 px-3 py-1.5 text-sm font-medium text-white shadow-sm md:hidden" onClick={()=> setOpen(true)}>New package</button>
          </div>
        </div>
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-10 text-center">
            <div className="h-12 w-12 rounded-full bg-slate-100 text-slate-500 dark:bg-slate-700" aria-hidden>📦</div>
            <div className="text-sm text-slate-600">No packages yet. Create your first one to get started.</div>
            <button data-cy="new-package" className="rounded-2xl bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm" onClick={()=> setOpen(true)}>New package</button>
          </div>
        ) : (
          <ul className="divide-y divide-slate-200 text-sm dark:divide-slate-800">
            {items.slice(0, 8).map((it)=> (
              <li key={it.id} className="flex items-center justify-between py-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-600 dark:bg-slate-700">📦</div>
                  <div>
                    <div className="font-medium">{it.barcode}</div>
                    <div className="text-xs text-slate-500">{it.status.replace('_',' ')}</div>
                  </div>
                </div>
                <Link className="text-blue-600 hover:underline" to={`/admin/packages/${it.id}`}>View</Link>
              </li>
            ))}
          </ul>
        )}
        <NewPackageDialog open={open} onClose={()=> setOpen(false)} />
      </div>
  <div className="rounded-2xl border bg-white p-6 text-slate-500 shadow-sm dark:bg-slate-800">
        <div className="mb-2 font-semibold text-slate-700 dark:text-slate-200">Configuration</div>
        <div className="space-x-4 text-sm">
          <Link to="/admin/items" className="text-blue-600 hover:underline">Item Templates</Link>
          <Link to="/admin-requirements" className="text-blue-600 hover:underline">Requirement Templates</Link>
        </div>
      </div>
    </div>
  );
}
