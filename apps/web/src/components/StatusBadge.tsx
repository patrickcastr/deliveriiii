import React from 'react';
import { cn } from '../lib/utils';

export function StatusBadge({ status }: { status: string }) {
  const s = status.replace('-', '_');
  const cls = cn(
    'inline-flex items-center rounded-full px-2 py-1 text-xs font-medium',
    s === 'delivered' ? 'bg-green-50 text-green-700' :
    s === 'in_transit' ? 'bg-blue-50 text-blue-700' :
    s === 'failed' ? 'bg-red-50 text-red-700' :
    s === 'picked_up' ? 'bg-amber-50 text-amber-700' :
    'bg-gray-100 text-gray-700',
  );
  return <span className={cls}>{status.replace('_',' ')}</span>;
}
