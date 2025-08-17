import React from 'react';
import { Link } from 'react-router-dom';
import { useRealtimeRoleRoom } from '../lib/realtime';

export default function AdminDashboard() {
  const { connected } = useRealtimeRoleRoom('admin');
  // placeholders for cards and charts
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Admin Dashboard</h1>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {['pending','picked_up','in_transit','delivered','failed'].map((s)=> (
          <div key={s} className="rounded border bg-white p-4 shadow-sm dark:bg-slate-800">
            <div className="text-xs uppercase text-slate-500">{s.replace('_',' ')}</div>
            <div className="text-2xl font-semibold">—</div>
          </div>
        ))}
      </div>
      <div className="rounded border bg-white p-4 shadow-sm dark:bg-slate-800">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="font-semibold">Packages</h2>
          <span className={`text-xs ${connected? 'text-green-600' : 'text-slate-500'}`}>{connected? 'live' : 'offline'}</span>
        </div>
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="text-slate-500">
              <th className="py-2">Barcode</th>
              <th>Status</th>
              <th>Driver</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {[].map(() => null)}
          </tbody>
        </table>
        <div className="mt-3 text-sm text-slate-500">No data yet</div>
      </div>
      <div className="rounded border bg-white p-6 text-slate-500 shadow-sm dark:bg-slate-800">Charts placeholder</div>
    </div>
  );
}
