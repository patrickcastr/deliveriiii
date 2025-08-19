import React from 'react';
import { useScannerStore } from '../state/scanner';

export default function ScannerOverlay({ packageId }: { packageId: string }) {
  const { config, setLastResult, setActive } = useScannerStore();
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const [manualOpen, setManualOpen] = React.useState(false);
  const [manual, setManual] = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);
  const [lastScan, setLastScan] = React.useState<string | null>(null);
  const [showSuccess, setShowSuccess] = React.useState(false);

  React.useEffect(() => {
    let reader: any = null;
    let stopped = false;

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
        await reader.decodeFromVideoDevice(
          undefined,
          videoRef.current!,
          (res: any) => {
            if (stopped) return;
            if (res) {
              const text = res.getText();
              setLastResult(text);
              setLastScan(text);
              if (!config.scanning.continuous) reader?.reset();
              if (config.scanning.beepOnSuccess) beep();
              if (config.scanning.hapticOnSuccess && navigator.vibrate) navigator.vibrate(50);
              setShowSuccess(true);
              void submitScan(text);
            }
          },
          hints,
        );
      } catch {
        // ignore
      }
    })();

    return () => {
      stopped = true;
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
      const apiBase = (import.meta as any).env?.VITE_API_BASE || '';
      const url = apiBase
        ? apiBase.replace(/\/$/, '') + '/v1/scan'
        : '/api/v1/scan';
      await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf },
        credentials: 'include',
        body: JSON.stringify({ barcode: code, stage: 'package_scanned', gps, deviceInfo: { ua: navigator.userAgent }, packageId }),
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
    <div role="dialog" aria-modal className="fixed inset-0 z-50">
      {/* Camera feed */}
      <div className="absolute inset-0 bg-black">
        <video ref={videoRef} className="h-full w-full object-cover" playsInline muted />
      </div>

      {/* Soft overlay frame */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="relative h-[60vh] w-[85vw] max-w-sm rounded-2xl border-2 border-white/70 shadow-[0_0_0_9999px_rgba(0,0,0,0.55)]">
          <div className="absolute -top-8 left-1/2 -translate-x-1/2 rounded-full bg-black/50 px-3 py-1 text-xs text-white">Align barcode in the frame</div>
          {/* corner accents */}
          <div className="absolute -m-px left-0 top-0 h-6 w-6 rounded-tl-2xl border-t-4 border-l-4 border-white/80" />
          <div className="absolute -m-px right-0 top-0 h-6 w-6 rounded-tr-2xl border-t-4 border-r-4 border-white/80" />
          <div className="absolute -m-px left-0 bottom-0 h-6 w-6 rounded-bl-2xl border-b-4 border-l-4 border-white/80" />
          <div className="absolute -m-px right-0 bottom-0 h-6 w-6 rounded-br-2xl border-b-4 border-r-4 border-white/80" />
        </div>
      </div>

      {/* Top bar */}
      <div className="absolute inset-x-0 top-0 flex items-center justify-between bg-gradient-to-b from-black/60 to-transparent p-3 text-white">
        <div className="text-sm/5">Scanner</div>
        <button className="rounded-full bg-white/20 px-3 py-1 text-xs backdrop-blur" onClick={()=> history.back()}>Close</button>
      </div>

      {/* Bottom controls */}
      <div className="absolute inset-x-0 bottom-0 space-y-3 bg-gradient-to-t from-black/70 to-transparent p-4 text-white">
        <div className="text-center text-xs text-white/90">Tip: Hold steady and fill the frame</div>
        <div className="flex items-center justify-center gap-4 text-xs">
          <label className="flex items-center gap-2"><input type="checkbox" className="accent-sky-500" checked={config.scanning.beepOnSuccess} onChange={()=> useScannerStore.setState((s)=> ({ config: { ...s.config, scanning: { ...s.config.scanning, beepOnSuccess: !s.config.scanning.beepOnSuccess } }}))} /> Beep</label>
          <label className="flex items-center gap-2"><input type="checkbox" className="accent-sky-500" checked={config.scanning.hapticOnSuccess} onChange={()=> useScannerStore.setState((s)=> ({ config: { ...s.config, scanning: { ...s.config.scanning, hapticOnSuccess: !s.config.scanning.hapticOnSuccess } }}))} /> Haptic</label>
        </div>
        <div className="text-center">
          <button className="text-sm underline" onClick={()=> setManualOpen((v)=> !v)}>Enter barcode manually</button>
        </div>
        {manualOpen && (
          <form className="mx-auto flex max-w-sm gap-2" onSubmit={(e)=>{ e.preventDefault(); if (manual) { setLastScan(manual); setShowSuccess(true); void submitScan(manual); } }}>
            <input aria-label="Manual barcode" placeholder="PKG-12345" value={manual} onChange={(e)=> setManual(e.target.value)} className="flex-1 rounded-md border border-white/40 bg-white/20 px-3 py-2 text-white placeholder:text-white/60 outline-none backdrop-blur-md focus:ring-2 focus:ring-sky-400" />
            <button type="submit" className="rounded-md bg-sky-500 px-4 py-2 text-white disabled:opacity-50" disabled={submitting}>Submit</button>
          </form>
        )}
      </div>

      {/* Success sheet */}
      {showSuccess && (
        <div className="absolute inset-0 flex items-end justify-center">
          <div className="mb-20 w-[92%] max-w-sm rounded-2xl bg-white p-4 text-slate-900 shadow-xl ring-1 ring-slate-200 dark:bg-slate-900 dark:text-slate-100 dark:ring-slate-700">
            <div className="mb-2 flex items-center gap-2 text-green-600 dark:text-green-400">
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>
              <div className="text-sm font-semibold">Scanned</div>
            </div>
            <div className="font-mono text-lg">{lastScan}</div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button className="rounded-md bg-sky-600 px-3 py-2 text-white hover:bg-sky-700" onClick={()=> {/* navigate to update status */ location.assign(`/packages/${packageId}?action=update-status`); }}>Update status</button>
              <button className="rounded-md border border-slate-300 px-3 py-2 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800" onClick={()=> { location.assign(`/packages/${packageId}`); }}>View</button>
            </div>
            <div className="mt-3 text-center">
              <button className="text-sm text-slate-500 underline" onClick={()=> setShowSuccess(false)}>Scan another</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
