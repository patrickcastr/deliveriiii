import React from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useRealtimePackage } from '../lib/realtime';
import ScannerOverlay from '../scanner/ScannerOverlay';

export default function PackageDetail() {
  const { id = '' } = useParams();
  const [sp] = useSearchParams();
  const rt = useRealtimePackage(id);
  const scanOpen = sp.get('scan') === '1';

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Package</h1>
      <div className="rounded border bg-white p-4 shadow-sm dark:bg-slate-800">
        <div className="text-sm text-slate-500">Realtime: {rt.connected ? 'live' : 'offline'}</div>
        <div className="mt-2 font-mono text-sm">ID: {id}</div>
        <div className="text-sm">Status: {rt.data?.status || '—'}</div>
      </div>
      {scanOpen && <ScannerOverlay packageId={id} />}
    </div>
  );
}
