import React from 'react';
import {
  Menu,
  FileSpreadsheet,
  PanelLeftClose,
  PanelLeftOpen,
  LogOut
} from 'lucide-react';
import { useApp } from '../context/AppContext';

interface HeaderProps {
  activeTab?: string;
  onToggleMobileMenu: () => void;
  onToggleCollapse: () => void;
  isCollapsed: boolean;
  onNavigateToOnePage: () => void;
  onOpenLogin?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onToggleMobileMenu,
  onToggleCollapse,
  isCollapsed,
  onNavigateToOnePage,
}) => {
  const { currentUser, logout } = useApp();

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-2xs print:hidden">
      <div className="px-4 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-3">
        {/* Left Section: Controls & Branding Title */}
        <div className="flex items-center gap-3">
          {/* Mobile menu trigger */}
          <button
            onClick={onToggleMobileMenu}
            className="lg:hidden p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg cursor-pointer"
            title="Abrir Menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Desktop collapse/expand toggle */}
          <button
            onClick={onToggleCollapse}
            className="hidden lg:flex items-center justify-center p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors border border-slate-200 cursor-pointer"
            title={isCollapsed ? 'Expandir menu lateral' : 'Recolher menu lateral para tela cheia'}
          >
            {isCollapsed ? (
              <PanelLeftOpen className="w-4 h-4 text-rose-800" />
            ) : (
              <PanelLeftClose className="w-4 h-4 text-slate-700" />
            )}
          </button>

          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-rose-800">
                BH FOODS • LINHA INDUSTRIAL DE DESOSSA
              </span>
            </div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight leading-tight">
              Painel de Indicadores & Rentabilidade
            </h2>
          </div>
        </div>

        {/* Right Section: One Page Report & User Session */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={onNavigateToOnePage}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-900 hover:bg-rose-800 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer"
            title="Gerar One Page Report A4 Paisagem"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span className="hidden sm:inline">One Page Report</span>
          </button>

          {currentUser && (
            <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
              <span
                className={`text-[10px] px-2 py-0.5 rounded-md font-bold uppercase border ${
                  currentUser.role === 'ADMIN'
                    ? 'bg-purple-100 text-purple-900 border-purple-300'
                    : currentUser.role === 'GERENCIAL'
                    ? 'bg-blue-100 text-blue-900 border-blue-300'
                    : 'bg-amber-100 text-amber-900 border-amber-300'
                }`}
                title={`Usuário autenticado: ${currentUser.name} (${currentUser.username})`}
              >
                {currentUser.role}
              </span>

              <button
                type="button"
                onClick={logout}
                className="inline-flex items-center gap-1 px-2 py-1 text-slate-500 hover:text-rose-700 hover:bg-rose-50 rounded-md transition-colors text-xs font-semibold border border-transparent hover:border-rose-200 cursor-pointer"
                title="Encerrar sessão / Sair"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Sair</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
