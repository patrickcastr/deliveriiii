import React from 'react';

type ToastVariant = 'default' | 'success' | 'error' | 'info';
export type Toast = {
  id: string;
  title?: string;
  description?: string;
  variant?: ToastVariant;
  duration?: number; // ms
};

type ToastContextValue = {
  toasts: Toast[];
  add(toast: Omit<Toast, 'id'>): string;
  dismiss(id: string): void;
  clear(): void;
};

const ToastContext = React.createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = React.useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within <ToastProvider />');
  return {
    toast: (opts: Omit<Toast, 'id'>) => ctx.add(opts),
    dismiss: ctx.dismiss,
    clear: ctx.clear,
  } as const;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<Toast[]>([]);

  const add = React.useCallback((t: Omit<Toast, 'id'>) => {
    const id = crypto.randomUUID();
    const duration = t.duration ?? 3000;
    const toast: Toast = { id, ...t };
    setToasts((list) => [...list, toast]);
    if (duration > 0) {
      window.setTimeout(() => {
        setToasts((list) => list.filter((x) => x.id !== id));
      }, duration);
    }
    return id;
  }, []);
  const dismiss = React.useCallback((id: string) => setToasts((l) => l.filter((x) => x.id !== id)), []);
  const clear = React.useCallback(() => setToasts([]), []);

  const value = React.useMemo(() => ({ toasts, add, dismiss, clear }), [toasts, add, dismiss, clear]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastViewport toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

function iconFor(variant?: ToastVariant) {
  const cls = 'h-4 w-4';
  switch (variant) {
    case 'success':
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>
      );
    case 'error':
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86l-7.4 12.8A2 2 0 004.6 20h14.8a2 2 0 001.71-3.34l-7.4-12.8a2 2 0 00-3.42 0z"/></svg>
      );
    case 'info':
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M12 2a10 10 0 100 20 10 10 0 000-20z"/></svg>
      );
    default:
      return null;
  }
}

export function ToastViewport({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: string) => void }) {
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex flex-col items-end gap-2 p-4">
      {toasts.map((t) => {
        const color =
          t.variant === 'success' ? 'border-green-200 bg-white text-green-800 dark:border-green-900/50 dark:bg-slate-800 dark:text-green-300' :
          t.variant === 'error' ? 'border-red-200 bg-white text-red-800 dark:border-red-900/50 dark:bg-slate-800 dark:text-red-300' :
          t.variant === 'info' ? 'border-blue-200 bg-white text-blue-800 dark:border-blue-900/50 dark:bg-slate-800 dark:text-blue-300' :
          'border-slate-200 bg-white text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100';
        return (
          <div key={t.id} role="status" aria-live="polite" className={`pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl border p-3 shadow-lg ${color}`}>
            <div className="mt-0.5">{iconFor(t.variant)}</div>
            <div className="min-w-0 flex-1">
              {t.title && <div className="text-sm font-medium">{t.title}</div>}
              {t.description && <div className="text-xs opacity-80">{t.description}</div>}
            </div>
            <button aria-label="Dismiss" onClick={() => onDismiss(t.id)} className="rounded p-1 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700">✕</button>
          </div>
        );
      })}
    </div>
  );
}
