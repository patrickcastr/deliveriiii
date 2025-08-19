import React from 'react';
import AdminItems from './admin-items';
import AdminRequirements from './admin-requirements';
import { PageHeader } from '../components/PageHeader';

export default function TemplatesCenter() {
  const [tab, setTab] = React.useState<'items'|'rules'>('items');
  return (
    <div className="space-y-6">
      <PageHeader title="Templates" subtitle="Design intake forms and delivery rules" />
      <div className="rounded-2xl border bg-white p-2 shadow-sm dark:bg-slate-800">
        <div role="tablist" aria-label="Templates" className="flex gap-2 p-1">
          <button role="tab" aria-selected={tab==='items'} className={`rounded-xl px-3 py-1.5 text-sm ${tab==='items' ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' : 'text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-700/40'}`} onClick={()=> setTab('items')}>Item Template</button>
          <button role="tab" aria-selected={tab==='rules'} className={`rounded-xl px-3 py-1.5 text-sm ${tab==='rules' ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' : 'text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-700/40'}`} onClick={()=> setTab('rules')}>Delivery Rules</button>
        </div>
      </div>
      <div>
  {tab === 'items' ? <AdminItems /> : <AdminRequirements />}
      </div>
    </div>
  );
}
