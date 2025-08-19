import React from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { ThemeToggle } from '../theme/toggle';

function Icon({ name, className = 'h-5 w-5' }: { name: 'dashboard'|'packages'|'scanner'|'templates'|'settings'; className?: string }) {
  const common = {
    className: `${className} shrink-0`,
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    viewBox: '0 0 24 24',
  } as any;
  switch (name) {
    case 'dashboard':
      return (
        <svg {...common}><path strokeLinecap="round" strokeLinejoin="round" d="M3 13h8V3H3v10zm10 8h8V3h-8v18zM3 21h8v-6H3v6z"/></svg>
      );
    case 'packages':
      return (
        <svg {...common}><path strokeLinecap="round" strokeLinejoin="round" d="M21 16V8a2 2 0 0 0-1.106-1.789l-7-3.5a2 2 0 0 0-1.788 0l-7 3.5A2 2 0 0 0 3 8v8a2 2 0 0 0 1.106 1.789l7 3.5a2 2 0 0 0 1.788 0l7-3.5A2 2 0 0 0 21 16zM12 22V8"/></svg>
      );
    case 'scanner':
      return (
        <svg {...common}><path strokeLinecap="round" strokeLinejoin="round" d="M4 7V5a1 1 0 0 1 1-1h2M20 7V5a1 1 0 0 0-1-1h-2M4 17v2a1 1 0 0 0 1 1h2M20 17v2a1 1 0 0 1-1 1h-2M3 12h18"/></svg>
      );
    case 'templates':
      return (
        <svg {...common}><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h10"/></svg>
      );
    case 'settings':
      return (
        <svg {...common}><path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317a1 1 0 0 1 1.35-.436l.866.433a8.003 8.003 0 0 1 3.9 3.9l.433.866a1 1 0 0 1-.436 1.35l-.7.35a6.002 6.002 0 0 1-.36 1.247l.497.497a1 1 0 0 1 0 1.415l-1.414 1.414a1 1 0 0 1-1.415 0l-.497-.497A6.002 6.002 0 0 1 12 17.35l-.35.7a1 1 0 0 1-1.35.436l-.866-.433a8.003 8.003 0 0 1-3.9-3.9l-.433-.866a1 1 0 0 1 .436-1.35l.7-.35A6.002 6.002 0 0 1 6.65 10l-.497-.497a1 1 0 0 1 0-1.415L7.567 6.674a1 1 0 0 1 1.415 0l.497.497c.4-.13.816-.233 1.247-.31l.35-.7zM12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z"/></svg>
      );
  }
}

function UserMenu() {
  const [open, setOpen] = React.useState(false);
  return (
    <div className="relative">
      <button aria-haspopup="menu" aria-expanded={open} onClick={()=> setOpen((v)=>!v)} className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-200 text-slate-700 ring-2 ring-transparent transition focus:outline-none focus:ring-blue-500 dark:bg-slate-700 dark:text-slate-100" aria-label="User menu">
        <span className="text-sm font-semibold">A</span>
      </button>
      {open && (
        <div role="menu" className="absolute right-0 mt-2 w-48 rounded-xl bg-white p-2 text-sm shadow-lg ring-1 ring-slate-200 dark:bg-slate-800 dark:ring-slate-700">
          <Link to="#" className="block rounded px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-700" role="menuitem">Profile</Link>
          <button className="block w-full rounded px-3 py-2 text-left hover:bg-slate-50 dark:hover:bg-slate-700" role="menuitem">Sign out</button>
        </div>
      )}
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const nav = [
    { to: '/admin', label: 'Dashboard', icon: 'dashboard' as const },
    { to: '/packages', label: 'Packages', icon: 'packages' as const },
    { to: '/driver', label: 'Scanner', icon: 'scanner' as const },
    { to: '/templates', label: 'Templates', icon: 'templates' as const },
    { to: '/settings', label: 'Settings', icon: 'settings' as const },
  ];
  return (
    <div className="min-h-dvh bg-gray-50 text-gray-900 dark:bg-slate-900 dark:text-gray-100">
      {/* Top app bar */}
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-slate-200 bg-white/80 px-4 py-3 backdrop-blur dark:border-slate-800 dark:bg-slate-900/80">
        <div className="flex items-center gap-3">
          <Link to="/" className="rounded-xl bg-blue-600 px-2 py-1 text-sm font-semibold text-white shadow-sm">Agent5</Link>
          <span className="hidden text-sm text-slate-500 md:inline">Real‑time delivery</span>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <UserMenu />
        </div>
      </header>

      {/* Layout */}
      <div className="mx-auto flex w-full max-w-7xl gap-6 px-4 py-6">
        {/* Left nav (desktop) */}
        <aside className="sticky top-[68px] hidden h[calc(100dvh-88px)] w-56 shrink-0 rounded-2xl border border-slate-200 bg-white p-3 shadow-md dark:border-slate-800 dark:bg-slate-900 md:block">
          <nav aria-label="Main" className="space-y-1">
            {nav.map((n) => (
              <NavLink key={n.to} to={n.to} className={({ isActive }) => `flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition ${isActive ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' : 'text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800'}`}>
                <Icon name={n.icon} />
                <span>{n.label}</span>
              </NavLink>
            ))}
          </nav>
        </aside>

        {/* Main content */}
        <main className="min-w-0 flex-1">
          {children}
        </main>
      </div>

      {/* Bottom nav (mobile) */}
      <nav aria-label="Bottom" className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-5 border-t border-slate-200 bg-white/90 px-2 py-1 shadow-2xl backdrop-blur dark:border-slate-800 dark:bg-slate-900/80 md:hidden">
        {nav.map((n) => {
          const active = location.pathname.startsWith(n.to);
          return (
            <Link key={n.to} to={n.to} className={`flex flex-col items-center gap-1 rounded-xl p-2 text-[11px] ${active ? 'text-blue-700 dark:text-blue-300' : 'text-slate-600 dark:text-slate-300'}`}>
              <Icon name={n.icon} />
              <span>{n.label}</span>
            </Link>
          );
        })}
      </nav>
      <div className="h-16 md:hidden" />
    </div>
  );
}
