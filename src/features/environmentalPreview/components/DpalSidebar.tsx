import React from 'react';

type SidebarLink = {
  label: string;
  path: string;
};

interface DpalSidebarProps {
  title?: string;
  links: SidebarLink[];
  activePath: string;
  onNavigate: (path: string) => void;
}

const DpalSidebar: React.FC<DpalSidebarProps> = ({ title = 'DPAL Preview', links, activePath, onNavigate }) => {
  return (
    <aside className="w-full md:w-72 md:min-h-screen bg-slate-900 text-slate-100 p-5 md:p-6 md:sticky md:top-0">
      <div className="mb-6 pb-4 border-b border-slate-700/70">
        <p className="text-[11px] uppercase tracking-[0.22em] text-slate-400">Sandbox Preview</p>
        <h2 className="text-xl font-bold mt-1 leading-tight">{title}</h2>
        <p className="text-xs text-slate-400 mt-2">Isolated UI-only workspace</p>
      </div>
      <nav className="space-y-2.5">
        {links.map((link) => {
          const active = activePath === link.path;
          return (
            <button
              key={link.path}
              type="button"
              onClick={() => onNavigate(link.path)}
              className={`w-full text-left rounded-xl px-3.5 py-2.5 text-sm transition border ${
                active
                  ? 'bg-blue-600/95 text-white border-blue-500 shadow-[0_4px_14px_rgba(37,99,235,0.32)]'
                  : 'bg-slate-800/70 text-slate-200 border-slate-700 hover:bg-slate-800'
              }`}
            >
              {link.label}
            </button>
          );
        })}
      </nav>
    </aside>
  );
};

export default DpalSidebar;
