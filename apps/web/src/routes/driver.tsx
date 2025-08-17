import React from 'react';
import { Link } from 'react-router-dom';
import { useRealtimeRoleRoom } from '../lib/realtime';

export default function DriverHome() {
  const { connected } = useRealtimeRoleRoom('driver', 'driver-1');
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">My Packages</h1>
      <div className="rounded border bg-white p-4 shadow-sm dark:bg-slate-800">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="font-semibold">Assigned</h2>
          <span className={`text-xs ${connected? 'text-green-600' : 'text-slate-500'}`}>{connected? 'live' : 'offline'}</span>
        </div>
        <ul className="divide-y">
          <li className="py-2">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-mono text-sm">PKG-EXAMPLE</div>
                <div className="text-xs text-slate-500">in_transit</div>
              </div>
              <div className="flex gap-2">
                <Link to="/packages/example" className="rounded border px-3 py-1 text-sm hover:bg-slate-50 dark:hover:bg-slate-800">Open</Link>
                <Link to="/packages/example?scan=1" className="rounded bg-sky-600 px-3 py-1 text-sm text-white hover:bg-sky-700">Scan</Link>
              </div>
            </div>
          </li>
        </ul>
      </div>
    </div>
  );
}
