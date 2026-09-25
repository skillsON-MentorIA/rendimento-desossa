import React from 'react';
import {
  LayoutDashboard,
  Beef,
  UploadCloud,
  FileSpreadsheet,
  Settings,
  Building2,
  PanelLeftClose,
  PanelLeftOpen,
  X
} from 'lucide-react';
import { useApp } from '../context/AppContext';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onOpenLogin?: () => void;
  isMobileOpen: boolean;
  setIsMobileOpen: (open: boolean) => void;
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  isMobileOpen,
  setIsMobileOpen,
  isCollapsed,
  setIsCollapsed,
}) => {
  const { canUpload, isAdmin } = useApp();

  const menuItems = [
    {
      id: 'dashboard',
      label: 'Dashboard Geral',
      icon: LayoutDashboard,
      badge: 'Geral',
      desc: 'KPIs Executivos e Gráficos',
    },
    {
      id: 'dianteiro',
      label: 'Desossa Dianteiro (DT)',
      icon: Beef,
      badge: 'DT',
      desc: 'Acém, Paleta, Peito, Músculo',
    },
    {
      id: 'traseiro',
      label: 'Desossa Traseiro (TR)',
      icon: Beef,
      badge: 'TR',
      desc: 'Picanha, Contra-filé, Alcatra',
    },
    {
      id: 'upload',
      label: 'Upload SisAtak & Base',
      icon: UploadCloud,
      badge: canUpload ? 'Ativo' : 'Bloq.',
      restricted: !canUpload,
      desc: 'Diário, Correções e Drive Excel',
    },
    {
      id: 'report',
      label: 'One Page Report (OPR)',
      icon: FileSpreadsheet,
      badge: 'Diretoria',
      desc: 'Relatório Executivo A4 e Envio',
    },
    {
      id: 'settings',
      label: 'Parâmetros & Custos',
      icon: Settings,
      badge: isAdmin ? 'Admin' : 'Restrito',
      restricted: !isAdmin,
      desc: 'Custo carcaça e metas',
    },
  ];

  return (
    <>
      {/* Mobile backdrop */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-slate-900/60 z-40 lg:hidden backdrop-blur-xs print:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar element:
          - On mobile: fixed slide-over drawer (so it doesn't break mobile view)
          - On desktop (lg): in normal document flow (sticky top-0 h-screen shrink-0), so it NEVER overlaps the dashboard content!
      */}
      <aside
        id="app-sidebar"
        className={`
          print:hidden
          bg-slate-900 text-slate-100 flex flex-col
          transition-all duration-300 ease-in-out
          z-40
          lg:border-r border-slate-800
          /* Mobile behavior */
          fixed top-0 bottom-0 left-0
          ${isMobileOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'}
          /* Desktop behavior: In-flow sibling, no overlay! */
          lg:static lg:translate-x-0 lg:shadow-none
          lg:sticky lg:top-0 lg:h-screen lg:shrink-0
          ${isCollapsed ? 'lg:w-20 w-72' : 'w-72'}
        `}
      >
        {/* Header Branding & Collapse Controls */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-lg bg-rose-900/80 border border-rose-700 flex items-center justify-center text-rose-200 shadow-md shrink-0">
              <Building2 className="w-6 h-6" />
            </div>
            {(!isCollapsed || isMobileOpen) && (
              <div className="flex-1 min-w-0">
                <h1 className="text-sm font-bold tracking-tight text-white truncate flex items-center gap-1.5">
                  FRIGORÍFICO KPI
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-rose-600/30 text-rose-300 font-semibold border border-rose-500/40">
                    PRO
                  </span>
                </h1>
                <p className="text-[11px] text-slate-400 truncate">
                  Setor de Desossa Industrial
                </p>
              </div>
            )}
          </div>

          {/* Action buttons on desktop header */}
          <div className="flex items-center gap-1">
            {/* Mobile close button */}
            <button
              onClick={() => setIsMobileOpen(false)}
              className="lg:hidden p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-md"
              title="Fechar menu"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Desktop collapse toggle */}
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="hidden lg:flex p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-md transition-colors"
              title={isCollapsed ? 'Expandir menu lateral' : 'Recolher menu lateral'}
            >
              {isCollapsed ? (
                <PanelLeftOpen className="w-4 h-4" />
              ) : (
                <PanelLeftClose className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 overflow-y-auto px-2.5 py-3 space-y-1">
          {(!isCollapsed || isMobileOpen) && (
            <div className="px-2 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              Navegação Principal
            </div>
          )}
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                id={`nav-btn-${item.id}`}
                onClick={() => {
                  setActiveTab(item.id);
                  setIsMobileOpen(false);
                }}
                title={isCollapsed ? `${item.label} (${item.desc})` : undefined}
                className={`w-full flex items-center ${
                  isCollapsed && !isMobileOpen ? 'justify-center px-2 py-2.5' : 'gap-3 px-3 py-2'
                } rounded-lg text-sm font-medium transition-all text-left group relative ${
                  isActive
                    ? 'bg-rose-950/70 text-white border border-rose-800/80 shadow-xs'
                    : 'text-slate-300 hover:bg-slate-800/90 hover:text-white'
                }`}
              >
                <Icon
                  className={`w-5 h-5 shrink-0 ${
                    isActive ? 'text-rose-400' : 'text-slate-400 group-hover:text-slate-200'
                  }`}
                />
                
                {(!isCollapsed || isMobileOpen) ? (
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="truncate text-xs font-semibold">{item.label}</span>
                      <span
                        className={`text-[9px] px-1.5 py-0.2 rounded font-mono font-medium ${
                          isActive
                            ? 'bg-rose-900/60 text-rose-200 border border-rose-700/50'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {item.badge}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400 truncate mt-0.5">
                      {item.desc}
                    </p>
                  </div>
                ) : (
                  // Dot indicator when active in collapsed mode
                  isActive && (
                    <span className="absolute right-1 top-1 w-2 h-2 rounded-full bg-rose-500" />
                  )
                )}
              </button>
            );
          })}
        </nav>

        {/* Footer Controls: Only Collapse / Expand */}
        {(!isCollapsed || isMobileOpen) ? (
          <div className="px-3 py-2.5 border-t border-slate-800 bg-slate-950/60 shrink-0">
            <button
              onClick={() => setIsCollapsed(true)}
              className="w-full flex items-center justify-between px-2.5 py-1.5 rounded bg-slate-800/70 hover:bg-slate-800 text-slate-300 hover:text-white text-[11px] font-medium border border-slate-700/60 transition-colors"
              title="Recolher Menu Lateral"
            >
              <span className="flex items-center gap-2">
                <PanelLeftClose className="w-3.5 h-3.5 text-rose-400" />
                <span>Recolher Menu</span>
              </span>
              <span className="text-[10px] text-slate-400 font-mono">«</span>
            </button>
          </div>
        ) : (
          <div className="p-3 border-t border-slate-800 flex justify-center shrink-0">
            <button
              onClick={() => setIsCollapsed(false)}
              title="Expandir Menu Lateral"
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-md transition-colors"
            >
              <PanelLeftOpen className="w-4 h-4 text-rose-400" />
            </button>
          </div>
        )}
      </aside>
    </>
  );
};
