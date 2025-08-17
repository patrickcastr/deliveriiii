import React from 'react';
import { useScannerStore } from '../state/scanner';

export default function ScannerOverlay({ packageId }: { packageId: string }) {
  const { config, setLastResult, setActive } = useScannerStore();
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const [manual, setManual] = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);

  React.useEffect(() => {
    let reader: any = null;

    (async () => {
      try {
        setActive(true);
        const [{ BrowserMultiFormatReader }, lib] = await Promise.all([
          import('@zxing/browser'),
          import('@zxing/library'),
        ]);
        const { DecodeHintType, BarcodeFormat } = lib as any;
        reader = new BrowserMultiFormatReader();
        const hints = new Map();
        const formats = config.supportedFormats.map((f: string) => BarcodeFormat[f]);
        hints.set(DecodeHintType.POSSIBLE_FORMATS, formats);
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: config.camera.facingMode,
          },
          audio: false,
        });
        if (videoRef.current) videoRef.current.srcObject = stream;
        await videoRef.current?.play();
        const result = await reader.decodeFromVideoDevice(
          undefined,
          videoRef.current!,
          (res: any) => {
            if (res) {
              setLastResult(res.getText());
              if (!config.scanning.continuous) reader?.reset();
              if (config.scanning.beepOnSuccess) beep();
              if (navigator.vibrate) navigator.vibrate(50);
              void submitScan(res.getText());
            }
          },
          hints,
        );
        return result;
      } catch (e) {
        // no-op
      }
    })();

    return () => {
      setActive(false);
      try { reader?.reset(); } catch {}
      const tracks = (videoRef.current?.srcObject as MediaStream | null)?.getTracks();
      tracks?.forEach((t) => t.stop());
    };
  }, [config, setActive, setLastResult]);

  async function submitScan(code: string) {
    setSubmitting(true);
    try {
      let gps: { lat?: number; lng?: number } = {};
      if (navigator.geolocation) {
        try {
          const pos = await new Promise<GeolocationPosition>((res, rej) => navigator.geolocation.getCurrentPosition(res, rej, { enableHighAccuracy: true, maximumAge: 10000, timeout: 2000 }));
          gps = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        } catch {}
      }
      const csrf = (document.cookie.match(/(?:^|; )csrf_token=([^;]+)/)?.[1]) || '';
      await fetch('/api/v1/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf },
        credentials: 'include',
        body: JSON.stringify({ barcode: code, stage: 'package_scanned', gps, deviceInfo: { ua: navigator.userAgent } }),
      });
    } finally {
      setSubmitting(false);
    }
  }

  function beep() {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.connect(g); g.connect(ctx.destination);
      o.type = 'sine'; o.frequency.value = 880; g.gain.value = 0.05;
      o.start(); setTimeout(()=>{ o.stop(); ctx.close(); }, 120);
    } catch {}
  }

  return (
    <div role="dialog" aria-modal className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
      <div className="absolute inset-0">
        <video ref={videoRef} className="h-full w-full object-cover" playsInline muted />
      </div>
      <div className="relative m-4 w-full max-w-md space-y-2 rounded bg-white/90 p-3 text-sm text-slate-800 shadow-lg backdrop-blur dark:bg-slate-900/90 dark:text-slate-100">
        <div className="text-xs">Scanner active — point at barcode</div>
        <form className="flex gap-2" onSubmit={(e)=>{ e.preventDefault(); if (manual) void submitScan(manual); }}>
          <input aria-label="Manual barcode" placeholder="Enter barcode" value={manual} onChange={(e)=> setManual(e.target.value)} className="flex-1 rounded border bg-white/80 px-2 py-1 outline-none focus:ring-2 focus:ring-sky-400 dark:bg-slate-800" />
          <button type="submit" className="rounded bg-sky-600 px-3 py-1 text-white hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-sky-400" disabled={submitting}>Submit</button>
        </form>
        <div className="flex items-center justify-between text-xs">
          <label className="flex items-center gap-2"><input type="checkbox" onChange={()=> useScannerStore.getState().toggleBatch()} /> Batch mode</label>
          <span>Last: {useScannerStore.getState().lastResult || '—'}</span>
        </div>
      </div>
    </div>
  );
}
