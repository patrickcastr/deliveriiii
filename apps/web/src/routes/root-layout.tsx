import React from 'react';
import { Outlet, Link, NavLink } from 'react-router-dom';
import { ThemeToggle } from '../theme/toggle';

export default function RootLayout() {
  return (
    <div className="min-h-dvh bg-slate-50 text-slate-900 dark:bg-slate-900 dark:text-slate-100">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b bg-white/90 p-3 backdrop-blur dark:bg-slate-900/90">
        <Link to="/" className="font-semibold">DeliveryApp</Link>
        <nav className="flex gap-3" aria-label="Primary">
          <NavLink to="/admin" className={({isActive})=> isActive? 'underline' : ''}>Admin</NavLink>
          <NavLink to="/driver" className={({isActive})=> isActive? 'underline' : ''}>Driver</NavLink>
        </nav>
        <ThemeToggle />
      </header>
      <main className="mx-auto max-w-5xl p-4">
        <Outlet />
      </main>
    </div>
  );
}
