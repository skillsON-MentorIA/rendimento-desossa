import React from 'react';
import {
  Calendar,
  Layers,
  Clock,
  Menu,
  RotateCcw,
  FileSpreadsheet,
  PanelLeftClose,
  PanelLeftOpen,
  CalendarRange
} from 'lucide-react';
import { useApp } from '../context/AppContext';

interface HeaderProps {
  activeTab?: string;
  onToggleMobileMenu: () => void;
  onToggleCollapse: () => void;
  isCollapsed: boolean;
  onNavigateToOnePage: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  onToggleMobileMenu,
  onToggleCollapse,
  isCollapsed,
  onNavigateToOnePage,
}) => {
  const { filters, setFilters, records } = useApp();

  // Extract unique dates from records
  const availableDates = Array.from(new Set(records.map((r) => r.date))).sort().reverse();
  const availableMonths = Array.from(new Set(records.map((r) => r.date.substring(0, 7)))).sort().reverse();

  const handleResetFilters = () => {
    const defaultDate = availableDates[0] || '2026-08-28';
    const sorted = availableDates.slice().sort();
    setFilters({
      viewMode: 'daily',
      date: defaultDate,
      startDate: sorted[0] || defaultDate,
      endDate: sorted[sorted.length - 1] || defaultDate,
      month: availableMonths[0] || '2026-08',
      type: 'ALL',
      shift: 'ALL',
      operator: 'ALL',
    });
  };

  const hasActiveFilters =
    filters.type !== 'ALL' ||
    filters.shift !== 'ALL';

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-2xs">
      <div className="px-4 sm:px-6 py-3">
        {/* Top row: Mode Switcher & Mobile button */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-3">
            {/* Mobile menu trigger */}
            <button
              onClick={onToggleMobileMenu}
              className="lg:hidden p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg"
              title="Abrir Menu"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Desktop collapse/expand toggle */}
            <button
              onClick={onToggleCollapse}
              className="hidden lg:flex items-center justify-center p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors border border-slate-200"
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
                <span className="text-xs font-bold uppercase tracking-wider text-rose-800">
                  BH FOODS • LINHA INDUSTRIAL DE DESOSSA
                </span>
              </div>
              <h2 className="text-lg font-bold text-slate-900 tracking-tight">
                Painel de Indicadores & Rentabilidade
              </h2>
            </div>
          </div>

          {/* View Mode Toggle: Data Única vs Por Período vs Acumulado Mês */}
          <div className="flex items-center gap-2">
            <div className="inline-flex rounded-lg p-1 bg-slate-100 border border-slate-200 text-xs font-medium">
              <button
                id="btn-viewmode-daily"
                onClick={() => setFilters((f) => ({ ...f, viewMode: 'daily' }))}
                className={`px-3 py-1.5 rounded-md transition-all font-semibold ${
                  filters.viewMode === 'daily'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Data Única
              </button>
              <button
                id="btn-viewmode-period"
                onClick={() => {
                  const sorted = availableDates.slice().sort();
                  setFilters((f) => ({
                    ...f,
                    viewMode: 'period',
                    startDate: f.startDate || sorted[0] || f.date,
                    endDate: f.endDate || sorted[sorted.length - 1] || f.date,
                  }));
                }}
                className={`px-3 py-1.5 rounded-md transition-all font-semibold ${
                  filters.viewMode === 'period'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Por Período
              </button>
              <button
                id="btn-viewmode-accumulated"
                onClick={() => setFilters((f) => ({ ...f, viewMode: 'accumulated' }))}
                className={`px-3 py-1.5 rounded-md transition-all font-semibold ${
                  filters.viewMode === 'accumulated'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Acumulado Mês
              </button>
            </div>

            <button
              onClick={onNavigateToOnePage}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-900 hover:bg-rose-800 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
              title="Gerar One Page Report A4 Paisagem"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span className="hidden sm:inline">One Page Report</span>
            </button>
          </div>
        </div>

        {/* Bottom row: Operational Filters (Data/Período, Linha, Turno) - OPERADOR EXCLUÍDO */}
        <div className="pt-2.5 flex flex-wrap items-center gap-2 text-xs">
          {/* 1. Date or Period Selector */}
          {filters.viewMode === 'daily' ? (
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 shadow-2xs">
              <Calendar className="w-3.5 h-3.5 text-rose-700 shrink-0" />
              <span className="text-slate-600 font-bold">Data Única:</span>
              <select
                id="filter-select-date"
                value={availableDates.includes(filters.date) ? filters.date : (availableDates[0] || '')}
                onChange={(e) => {
                  const selectedDate = e.target.value;
                  setFilters((f) => ({
                    ...f,
                    viewMode: 'daily',
                    date: selectedDate,
                    month: selectedDate.substring(0, 7),
                  }));
                }}
                className="bg-transparent text-slate-900 font-bold focus:outline-none cursor-pointer pr-1 text-xs"
              >
                {availableDates.map((d) => {
                  const dayRecords = records.filter((r) => r.date === d);
                  const hasDt = dayRecords.some((r) => r.type === 'DIANTEIRO');
                  const hasTr = dayRecords.some((r) => r.type === 'TRASEIRO');
                  const tag = hasDt && hasTr ? ' (DT + TR)' : hasDt ? ' (DT)' : hasTr ? ' (TR)' : '';
                  const formatted = d.split('-').reverse().join('/');
                  return (
                    <option key={d} value={d} className="text-slate-900 font-semibold">
                      {formatted}{tag}
                    </option>
                  );
                })}
              </select>
            </div>
          ) : filters.viewMode === 'period' ? (
            <div className="flex flex-wrap items-center gap-2 bg-slate-50 border border-rose-200 rounded-lg px-2.5 py-1.5 shadow-2xs">
              <div className="flex items-center gap-1 text-rose-800 font-bold">
                <CalendarRange className="w-3.5 h-3.5 text-rose-700 shrink-0" />
                <span>Período:</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-slate-500 font-medium text-[11px]">De:</span>
                <input
                  type="date"
                  value={filters.startDate || (availableDates[availableDates.length - 1] || '')}
                  onChange={(e) =>
                    setFilters((f) => ({
                      ...f,
                      viewMode: 'period',
                      startDate: e.target.value,
                    }))
                  }
                  className="bg-white border border-slate-300 rounded px-1.5 py-0.5 text-slate-900 font-bold text-xs focus:ring-1 focus:ring-rose-500 focus:outline-none"
                />
              </div>
              <div className="flex items-center gap-1">
                <span className="text-slate-500 font-medium text-[11px]">Até:</span>
                <input
                  type="date"
                  value={filters.endDate || (availableDates[0] || '')}
                  onChange={(e) =>
                    setFilters((f) => ({
                      ...f,
                      viewMode: 'period',
                      endDate: e.target.value,
                    }))
                  }
                  className="bg-white border border-slate-300 rounded px-1.5 py-0.5 text-slate-900 font-bold text-xs focus:ring-1 focus:ring-rose-500 focus:outline-none"
                />
              </div>
              {/* Quick shortcut for all available records */}
              {availableDates.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    const sorted = availableDates.slice().sort();
                    setFilters((f) => ({
                      ...f,
                      viewMode: 'period',
                      startDate: sorted[0],
                      endDate: sorted[sorted.length - 1],
                    }));
                  }}
                  className="px-1.5 py-0.5 text-[10px] bg-rose-50 text-rose-800 hover:bg-rose-100 rounded font-semibold border border-rose-200 transition-colors"
                  title="Ajustar período para abranger todos os lotes gravados"
                >
                  Todo o Período
                </button>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5">
              <Calendar className="w-3.5 h-3.5 text-slate-500 shrink-0" />
              <span className="text-slate-500 font-medium">Mês:</span>
              <select
                id="filter-select-month"
                value={filters.month}
                onChange={(e) => setFilters((f) => ({ ...f, month: e.target.value }))}
                className="bg-transparent text-slate-800 font-semibold focus:outline-none cursor-pointer"
              >
                {availableMonths.map((m) => {
                  const [ano, mes] = m.split('-');
                  const mesNome = new Date(Number(ano), Number(mes) - 1, 1).toLocaleString('pt-BR', { month: 'long' });
                  return (
                    <option key={m} value={m}>
                      {mesNome.toUpperCase()} / {ano}
                    </option>
                  );
                })}
              </select>
            </div>
          )}

          {/* 2. Type Filter (Linha): Dianteiro / Traseiro / Todas */}
          {activeTab !== 'dianteiro' && activeTab !== 'traseiro' ? (
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5">
              <Layers className="w-3.5 h-3.5 text-slate-500 shrink-0" />
              <span className="text-slate-500 font-medium">Linha:</span>
              <select
                id="filter-select-type"
                value={filters.type}
                onChange={(e) => setFilters((f) => ({ ...f, type: e.target.value as any }))}
                className="bg-transparent text-slate-800 font-semibold focus:outline-none cursor-pointer"
              >
                <option value="ALL">Todas as Linhas (DT + TR)</option>
                <option value="DIANTEIRO">Desossa Dianteira (DT)</option>
                <option value="TRASEIRO">Desossa Traseira (TR)</option>
              </select>
            </div>
          ) : activeTab === 'dianteiro' ? (
            <div className="flex items-center gap-1.5 bg-amber-50 border border-amber-200 text-amber-900 rounded-lg px-2.5 py-1.5 text-xs font-bold">
              <Layers className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              <span>Menu Exclusivo: Dianteiro (DT)</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 bg-rose-50 border border-rose-200 text-rose-900 rounded-lg px-2.5 py-1.5 text-xs font-bold">
              <Layers className="w-3.5 h-3.5 text-rose-600 shrink-0" />
              <span>Menu Exclusivo: Traseiro (TR)</span>
            </div>
          )}

          {/* 3. Shift Filter (Turno) */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5">
            <Clock className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            <span className="text-slate-500 font-medium">Turno:</span>
            <select
              id="filter-select-shift"
              value={filters.shift}
              onChange={(e) => setFilters((f) => ({ ...f, shift: e.target.value as any }))}
              className="bg-transparent text-slate-800 font-semibold focus:outline-none cursor-pointer"
            >
              <option value="ALL">Todos os Turnos</option>
              <option value="Turno 1">Turno 1 (Manhã)</option>
              <option value="Turno 2">Turno 2 (Tarde)</option>
              <option value="Turno 3">Turno 3 (Noite)</option>
            </select>
          </div>

          {/* Reset Filters */}
          {hasActiveFilters && (
            <button
              onClick={handleResetFilters}
              className="inline-flex items-center gap-1 px-2 py-1 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded text-[11px] font-medium transition-colors"
              title="Limpar filtros de Linha e Turno"
            >
              <RotateCcw className="w-3 h-3" />
              Limpar Filtros
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
