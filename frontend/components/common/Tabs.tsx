import React from 'react';

export interface TabItem {
  key: string;
  label: string;
  icon?: React.ReactNode;
}

export interface TabsProps {
  tabs: TabItem[];
  active: string;
  onChange: (key: string) => void;
  className?: string;
}

/**
 * Controlled tab bar. Styled to match the OPEX workspace tab conventions
 * (manage.tsx / planning.tsx pill style).
 */
const Tabs: React.FC<TabsProps> = ({ tabs, active, onChange, className = '' }) => {
  return (
    <div className={`flex bg-slate-900/60 p-1 rounded-xl border border-slate-800 backdrop-blur-xl ${className}`}>
      {tabs.map(tab => (
        <button
          key={tab.key}
          type="button"
          onClick={() => onChange(tab.key)}
          aria-pressed={active === tab.key}
          className={`px-5 py-2.5 rounded-lg text-xs font-black flex items-center gap-2 transition-all ${active === tab.key ? 'bg-brand-primary text-black shadow-[0_0_15px_rgba(var(--brand-primary-rgb),0.3)]' : 'text-slate-500 hover:text-white'}`}
        >
          {tab.icon}
          {tab.label}
        </button>
      ))}
    </div>
  );
};

export default Tabs;