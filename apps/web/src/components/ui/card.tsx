import React from 'react';

export function Card({ className = '', children }: React.PropsWithChildren<{ className?: string }>) {
  return <div className={`rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-800 ${className}`}>{children}</div>;
}
export function CardHeader({ className = '', children }: React.PropsWithChildren<{ className?: string }>) {
  return <div className={`px-4 pt-4 ${className}`}>{children}</div>;
}
export function CardTitle({ className = '', children }: React.PropsWithChildren<{ className?: string }>) {
  return <h3 className={`text-sm font-medium text-slate-500 ${className}`}>{children}</h3>;
}
export function CardContent({ className = '', children }: React.PropsWithChildren<{ className?: string }>) {
  return <div className={`px-4 pb-4 ${className}`}>{children}</div>;
}
