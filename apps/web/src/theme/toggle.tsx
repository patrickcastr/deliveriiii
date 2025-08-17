import React from 'react';

export function ThemeToggle() {
  const [dark, setDark] = React.useState<boolean>(() => document.documentElement.classList.contains('dark'));
  React.useEffect(() => {
    if (dark) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [dark]);
  return (
    <button
      aria-label="Toggle theme"
      className="rounded border px-3 py-1 text-sm hover:bg-slate-100 dark:hover:bg-slate-800"
      onClick={() => setDark((v) => !v)}
    >
      {dark ? 'Dark' : 'Light'}
    </button>
  );
}
