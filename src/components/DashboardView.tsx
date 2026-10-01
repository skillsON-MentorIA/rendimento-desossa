import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  Scale,
  DollarSign,
  Users,
  Bone,
  Flame,
  BarChart3,
  Calendar,
  CalendarRange,
  Clock,
  Layers,
  ArrowUpRight,
  Info,
  Beef,
  FileSpreadsheet
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Cell,
  Line,
  ComposedChart,
  LabelList
} from 'recharts';
import { useApp } from '../context/AppContext';
import { calculateSummary, formatCurrency, formatKg, formatPct, formatWeightNum } from '../utils/calculations';

interface DashboardViewProps {
  onSelectRecord: (recordId: string) => void;
  onNavigateToOnePage: () => void;
  onNavigateToDianteiro: () => void;
  onNavigateToTraseiro: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  onSelectRecord,
  onNavigateToOnePage,
  onNavigateToDianteiro,
  onNavigateToTraseiro,
}) => {
  const { filteredRecords, summary, records, filters, setFilters } = useApp();
  const [weeklyMetric, setWeeklyMetric] = useState<'rendimento' | 'produtividade' | 'quebra' | 'financeiro'>('rendimento');

  const availableDates = React.useMemo(() => {
    return Array.from(new Set(records.map((r) => r.date))).sort().reverse();
  }, [records]);

  // Current active date string formatted DD/MM/YYYY synced directly from filters
  const activeDisplayDate = React.useMemo(() => {
    if (!filters.date) {
      return availableDates[0] ? availableDates[0].split('-').reverse().join('/') : '--/--/----';
    }
    return filters.date.split('-').reverse().join('/');
  }, [filters.date, availableDates]);

  // Formatted display range for period filter mode
  const periodDisplayRange = React.useMemo(() => {
    const start = filters.startDate ? filters.startDate.split('-').reverse().join('/') : '';
    const end = filters.endDate ? filters.endDate.split('-').reverse().join('/') : '';
    if (start && end) {
      return `${start} a ${end}`;
    }
    return start || end || 'Todo o Período';
  }, [filters.startDate, filters.endDate]);

  // Prepare weekly chart data by date (from Monday to Saturday)
  const weeklyData = React.useMemo(() => {
    // Sort all records chronologically
    const sorted = [...records].sort((a, b) => a.date.localeCompare(b.date));
    const byDate: Record<string, {
      date: string;
      diaSemana: string;
      rawWeightKg: number;
      finishedWeightKg: number;
      saleableKg: number;
      lossKg: number;
      lossPct: number;
      deboningYieldNetPct: number;
      totalYieldPct: number;
      productivityKgPerPerson: number;
      nonSaleablePct: number;
      grossProfitValue: number;
      profitMarginPct: number;
      faturamentoPA: number;
      custoCarcaça: number;
      dtCount: number;
      trCount: number;
    }> = {};

    sorted.forEach((r) => {
      const d = r.date;
      if (!byDate[d]) {
        const dateObj = new Date(d + 'T12:00:00');
        const diaSemana = dateObj.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '').toUpperCase();
        const diaNum = d.split('-')[2] + '/' + d.split('-')[1];

        byDate[d] = {
          date: d,
          diaSemana: `${diaSemana} (${diaNum})`,
          rawWeightKg: 0,
          finishedWeightKg: 0,
          saleableKg: 0,
          lossKg: 0,
          lossPct: 0,
          deboningYieldNetPct: 0,
          totalYieldPct: 0,
          productivityKgPerPerson: 0,
          nonSaleablePct: 0,
          grossProfitValue: 0,
          profitMarginPct: 0,
          faturamentoPA: 0,
          custoCarcaça: 0,
          dtCount: 0,
          trCount: 0,
        };
      }

      byDate[d].rawWeightKg += r.rawMaterialWeightKg;
      byDate[d].finishedWeightKg += r.finishedProductWeightKg;
      byDate[d].saleableKg += r.saleableCutsWeightKg;
      byDate[d].lossKg += r.lossKg;
      byDate[d].faturamentoPA += r.finishedProductTotalValue;
      byDate[d].custoCarcaça += r.totalCarcassCost;
      byDate[d].grossProfitValue += r.grossProfitValue;
      if (r.type === 'DIANTEIRO') byDate[d].dtCount++;
      if (r.type === 'TRASEIRO') byDate[d].trCount++;
    });

    return Object.values(byDate).map((item) => {
      const nonSaleableWeight = item.finishedWeightKg - item.saleableKg;
      // Peso Total da Carcaça = Carnes Vendáveis + Osso + Sebo + Quebra (Perda)
      const totalCarcass = (item.saleableKg + nonSaleableWeight + item.lossKg) > 0
        ? (item.saleableKg + nonSaleableWeight + item.lossKg)
        : item.rawWeightKg;
      const deboningYieldNetPct = totalCarcass > 0 ? (item.saleableKg / totalCarcass) * 100 : 0;
      const lossPct = item.rawWeightKg > 0 ? (item.lossKg / item.rawWeightKg) * 100 : 0;
      const totalYieldPct = item.rawWeightKg > 0 ? (item.finishedWeightKg / item.rawWeightKg) * 100 : 0;
      const nonSaleablePct = item.rawWeightKg > 0 ? (nonSaleableWeight / item.rawWeightKg) * 100 : 0;
      const profitMarginPct = item.faturamentoPA > 0 ? (item.grossProfitValue / item.faturamentoPA) * 100 : 0;
      const productivityKgPerPerson = item.rawWeightKg / (item.dtCount * 20 + item.trCount * 22 || 20);

      return {
        ...item,
        deboningYieldNetPct: Number(deboningYieldNetPct.toFixed(2)),
        lossPct: Number(lossPct.toFixed(3)),
        totalYieldPct: Number(totalYieldPct.toFixed(2)),
        nonSaleablePct: Number(nonSaleablePct.toFixed(2)),
        profitMarginPct: Number(profitMarginPct.toFixed(2)),
        productivityKgPerPerson: Number(productivityKgPerPerson.toFixed(1)),
      };
    });
  }, [records]);

  // Specific subsets for DT and TR dynamic comparisons
  const dtRecords = useMemo(() => filteredRecords.filter((r) => r.type === 'DIANTEIRO'), [filteredRecords]);
  const trRecords = useMemo(() => filteredRecords.filter((r) => r.type === 'TRASEIRO'), [filteredRecords]);
  const dtSummary = useMemo(() => calculateSummary(dtRecords), [dtRecords]);
  const trSummary = useMemo(() => calculateSummary(trRecords), [trRecords]);

  // Current active period records (to detect when DT and TR occur on the same day or month)
  const periodAllRecords = useMemo(() => {
    return records.filter((r) => {
      if (filters.viewMode === 'daily' && filters.date) {
        return r.date === filters.date;
      }
      if (filters.viewMode === 'period') {
        if (filters.startDate && r.date < filters.startDate) return false;
        if (filters.endDate && r.date > filters.endDate) return false;
        return true;
      }
      if (filters.viewMode === 'accumulated' && filters.month) {
        return r.date.startsWith(filters.month);
      }
      return true;
    });
  }, [records, filters.viewMode, filters.date, filters.startDate, filters.endDate, filters.month]);

  const countDtInPeriod = useMemo(() => periodAllRecords.filter((r) => r.type === 'DIANTEIRO').length, [periodAllRecords]);
  const countTrInPeriod = useMemo(() => periodAllRecords.filter((r) => r.type === 'TRASEIRO').length, [periodAllRecords]);
  const kgDtInPeriod = useMemo(() => periodAllRecords.filter((r) => r.type === 'DIANTEIRO').reduce((acc, r) => acc + r.rawMaterialWeightKg, 0), [periodAllRecords]);
  const kgTrInPeriod = useMemo(() => periodAllRecords.filter((r) => r.type === 'TRASEIRO').reduce((acc, r) => acc + r.rawMaterialWeightKg, 0), [periodAllRecords]);

  // Target benchmarks
  const TARGET_DEBONING_YIELD = 76.5; // Meta de rendimento desossa (carnes vendáveis sobre peso da carcaça)
  const TARGET_LOSS_MAX = 0.80; // Meta de quebra <= 0.80%
  const TARGET_PRODUCTIVITY = 800; // Meta 800 kg/pessoa
  const TARGET_PROFIT_MARGIN = 20.0; // Meta 20% margem

  return (
    <div className="space-y-6 pb-12">
      {/* Overview Context Badge */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900 text-white p-4 rounded-xl shadow-sm border border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-rose-300">
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
            DESOSSA INDUSTRIAL •{' '}
            {filters.viewMode === 'daily'
              ? 'VISÃO DIÁRIA'
              : filters.viewMode === 'period'
              ? 'VISÃO POR PERÍODO'
              : 'VISÃO ACUMULADA MENSAL'}
          </div>
          <h2 className="text-xl font-bold mt-0.5 tracking-tight">
            {filters.viewMode === 'daily'
              ? `Operação do Dia: ${activeDisplayDate}`
              : filters.viewMode === 'period'
              ? `Período Selecionado: ${periodDisplayRange}`
              : `Consolidado Mensal: ${filters.month}`}
          </h2>
          <p className="text-xs text-slate-300 mt-0.5">
            {filteredRecords.length} lote(s) considerado(s) • Total Matéria-Prima: {formatKg(summary.totalRawMaterialKg)} • Faturamento PA: {formatCurrency(summary.totalFinishedValue)}
          </p>
        </div>

        {/* Action navigation buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={onNavigateToDianteiro}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5"
          >
            <Beef className="w-4 h-4 text-amber-400" />
            Ver Dianteiro (DT)
          </button>
          <button
            onClick={onNavigateToTraseiro}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5"
          >
            <Beef className="w-4 h-4 text-rose-400" />
            Ver Traseiro (TR)
          </button>
          <button
            onClick={onNavigateToOnePage}
            className="px-3.5 py-1.5 bg-rose-800 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition-all shadow-sm flex items-center gap-1.5"
          >
            <FileSpreadsheet className="w-4 h-4" />
            One Page Report (A4)
          </button>
        </div>
      </div>

      {/* SELETOR RÁPIDO DO MODO DE ANÁLISE: DATA ÚNICA OU PERÍODO */}
      <div className="bg-white rounded-xl p-3 border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-slate-700 uppercase tracking-wide flex items-center gap-1.5 mr-1">
            <Calendar className="w-4 h-4 text-rose-800" />
            Filtrar Tempo / Análise:
          </span>

          {/* Toggle buttons: Data Única vs Por Período vs Acumulado Mês */}
          <div className="inline-flex rounded-lg p-1 bg-slate-100 border border-slate-200 text-xs font-semibold">
            <button
              id="dash-mode-daily"
              onClick={() => setFilters((f) => ({ ...f, viewMode: 'daily' }))}
              className={`px-3 py-1.5 rounded-md transition-all flex items-center gap-1.5 ${
                filters.viewMode === 'daily'
                  ? 'bg-slate-900 text-white shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              Data Única
            </button>

            <button
              id="dash-mode-period"
              onClick={() => {
                const sorted = availableDates.slice().sort();
                setFilters((f) => ({
                  ...f,
                  viewMode: 'period',
                  startDate: f.startDate || sorted[0] || f.date,
                  endDate: f.endDate || sorted[sorted.length - 1] || f.date,
                }));
              }}
              className={`px-3 py-1.5 rounded-md transition-all flex items-center gap-1.5 ${
                filters.viewMode === 'period'
                  ? 'bg-rose-900 text-white shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <CalendarRange className="w-3.5 h-3.5" />
              Período Selecionado
            </button>

            <button
              id="dash-mode-accumulated"
              onClick={() => setFilters((f) => ({ ...f, viewMode: 'accumulated' }))}
              className={`px-3 py-1.5 rounded-md transition-all flex items-center gap-1.5 ${
                filters.viewMode === 'accumulated'
                  ? 'bg-slate-900 text-white shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Acumulado Mês
            </button>
          </div>
        </div>

        {/* Dynamic Controls based on selected mode */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {filters.viewMode === 'daily' ? (
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5">
              <span className="text-slate-600 font-bold">Data:</span>
              <select
                id="dash-select-date"
                value={availableDates.includes(filters.date) ? filters.date : (availableDates[0] || '')}
                onChange={(e) => {
                  const selDate = e.target.value;
                  setFilters((f) => ({
                    ...f,
                    viewMode: 'daily',
                    date: selDate,
                    month: selDate.substring(0, 7),
                  }));
                }}
                className="bg-transparent font-bold text-slate-900 focus:outline-none cursor-pointer"
              >
                {availableDates.map((d) => (
                  <option key={d} value={d}>
                    {d.split('-').reverse().join('/')}
                  </option>
                ))}
              </select>
            </div>
          ) : filters.viewMode === 'period' ? (
            <div className="flex flex-wrap items-center gap-2 bg-rose-50/70 border border-rose-200 rounded-lg px-2.5 py-1.5">
              <span className="text-rose-900 font-bold">De:</span>
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
                className="bg-white border border-slate-300 rounded px-1.5 py-0.5 text-slate-900 font-bold text-xs"
              />
              <span className="text-rose-900 font-bold">Até:</span>
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
                className="bg-white border border-slate-300 rounded px-1.5 py-0.5 text-slate-900 font-bold text-xs"
              />
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
                className="px-2 py-0.5 bg-rose-900 hover:bg-rose-800 text-white font-semibold rounded text-[11px] transition-colors"
                title="Ajustar período para abranger todos os lotes gravados"
              >
                Todo o Período
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5">
              <span className="text-slate-600 font-bold">Mês:</span>
              <select
                id="dash-select-month"
                value={filters.month}
                onChange={(e) => setFilters((f) => ({ ...f, month: e.target.value }))}
                className="bg-transparent font-bold text-slate-900 focus:outline-none cursor-pointer"
              >
                {Array.from(new Set(records.map((r) => r.date.substring(0, 7)))).sort().reverse().map((m) => {
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

          {/* Filtro de Turno colocado na barra cinza ao lado do campo data */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 shadow-2xs">
            <Clock className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            <span className="text-slate-600 font-bold">Turno:</span>
            <select
              id="dash-select-shift"
              value={filters.shift}
              onChange={(e) => setFilters((f) => ({ ...f, shift: e.target.value as any }))}
              className="bg-transparent font-bold text-slate-900 focus:outline-none cursor-pointer"
            >
              <option value="ALL">Todos os Turnos</option>
              <option value="Turno 1">Turno 1 (Manhã)</option>
              <option value="Turno 2">Turno 2 (Tarde)</option>
              <option value="Turno 3">Turno 3 (Noite)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Alerta e Recuperação caso nenhum lote corresponda aos filtros da data selecionada */}
      {filteredRecords.length === 0 && (
        <div className="p-3.5 bg-amber-50 border border-amber-300 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs text-amber-900 shadow-xs">
          <div className="flex items-center gap-2">
            <span className="font-bold text-amber-800">Atenção:</span>
            <span>
              Nenhum lote de desossa foi encontrado para{' '}
              {filters.viewMode === 'daily' ? (
                <>o dia <strong>{activeDisplayDate}</strong></>
              ) : filters.viewMode === 'period' ? (
                <>o período <strong>{periodDisplayRange}</strong></>
              ) : (
                <>o mês <strong>{filters.month}</strong></>
              )}{' '}
              com os filtros selecionados.
            </span>
          </div>
          {availableDates.length > 0 && (
            <button
              onClick={() => {
                const sorted = availableDates.slice().sort();
                setFilters((f) => ({
                  ...f,
                  viewMode: 'daily',
                  date: availableDates[0],
                  startDate: sorted[0],
                  endDate: sorted[sorted.length - 1],
                  month: availableDates[0].substring(0, 7),
                  type: 'ALL',
                  shift: 'ALL',
                  operator: 'ALL',
                }));
              }}
              className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg text-xs transition-colors shadow-2xs"
            >
              Exibir Lotes Mais Recentes ({availableDates[0].split('-').reverse().join('/')})
            </button>
          )}
        </div>
      )}

      {/* SELETOR GERENCIAL DE LINHA DE DESOSSA (DT x TR) */}
      <div className="bg-white rounded-xl p-3.5 border border-slate-200 shadow-2xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wide flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-rose-800" />
              Filtrar Linha de Desossa:
            </span>

            <div className="inline-flex rounded-lg p-1 bg-slate-100 border border-slate-200 text-xs font-semibold">
              <button
                id="btn-filter-line-all"
                onClick={() => setFilters((f) => ({ ...f, type: 'ALL' }))}
                className={`px-3 py-1.5 rounded-md transition-all flex items-center gap-1.5 ${
                  filters.type === 'ALL'
                    ? 'bg-slate-900 text-white shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                Consolidado da Planta (DT + TR)
              </button>

              <button
                id="btn-filter-line-dt"
                onClick={() => setFilters((f) => ({ ...f, type: 'DIANTEIRO' }))}
                className={`px-3 py-1.5 rounded-md transition-all flex items-center gap-1.5 ${
                  filters.type === 'DIANTEIRO'
                    ? 'bg-amber-600 text-white shadow-xs font-bold'
                    : 'text-slate-700 hover:text-amber-800'
                }`}
              >
                <Beef className="w-3.5 h-3.5" />
                Desossa Dianteira (DT)
                {countDtInPeriod > 0 && (
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                      filters.type === 'DIANTEIRO' ? 'bg-amber-800 text-white' : 'bg-amber-100 text-amber-900'
                    }`}
                  >
                    {countDtInPeriod} lote(s)
                  </span>
                )}
              </button>

              <button
                id="btn-filter-line-tr"
                onClick={() => setFilters((f) => ({ ...f, type: 'TRASEIRO' }))}
                className={`px-3 py-1.5 rounded-md transition-all flex items-center gap-1.5 ${
                  filters.type === 'TRASEIRO'
                    ? 'bg-rose-800 text-white shadow-xs font-bold'
                    : 'text-slate-700 hover:text-rose-800'
                }`}
              >
                <Beef className="w-3.5 h-3.5" />
                Desossa Traseira (TR)
                {countTrInPeriod > 0 && (
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                      filters.type === 'TRASEIRO' ? 'bg-rose-950 text-white' : 'bg-rose-100 text-rose-900'
                    }`}
                  >
                    {countTrInPeriod} lote(s)
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Quick Line Overview / Parallel Warning */}
          {countDtInPeriod > 0 && countTrInPeriod > 0 && filters.viewMode === 'daily' ? (
            <div className="flex items-center gap-2 text-xs bg-emerald-50 text-emerald-800 border border-emerald-200 px-3 py-1.5 rounded-lg">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>
                <strong>Linhas Simultâneas no Mesmo Dia:</strong> DT ({formatKg(kgDtInPeriod)}) e TR ({formatKg(kgTrInPeriod)}) operando paralelamente.
              </span>
            </div>
          ) : (
            <div className="text-xs text-slate-500 font-medium">
              {filters.type === 'DIANTEIRO' && 'Exibindo indicadores exclusivos da esteira de Dianteiro (Acém, Paleta, Peito, etc.).'}
              {filters.type === 'TRASEIRO' && 'Exibindo indicadores exclusivos da esteira de Traseiro (Picanha, Mignon, Alcatra, etc.).'}
              {filters.type === 'ALL' && 'Exibindo soma das linhas operadas no período selecionado.'}
            </div>
          )}
        </div>
      </div>

      {/* Primary KPI Grid (Ordem solicitada: Margem de Lucro, Rend. Desossa, Sub Produtos, Perda/Quebra, Faturamento PA, Produtividade) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3.5">
        {/* a) 1. Margem de Lucro */}
        <div id="kpi-box-margem-lucro" className="bg-white rounded-xl p-4 border border-slate-200/80 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between h-full min-h-[156px]">
          <div className="flex items-center justify-between text-slate-500 mb-2 h-7">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 truncate" title="Margem de Lucro Bruta sobre Faturamento do PA">
              Margem de Lucro
            </span>
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
              summary.avgProfitMarginPct >= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
            }`}>
              {summary.avgProfitMarginPct >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
            </div>
          </div>
          <div className="my-auto py-1">
            <div className={`text-2xl font-black tracking-tight whitespace-nowrap ${
              summary.avgProfitMarginPct >= 0 ? 'text-emerald-700' : 'text-rose-600'
            }`}>
              {formatPct(summary.avgProfitMarginPct, 2)}
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-xs min-h-[34px]">
            <span className="text-slate-500 text-[11px] whitespace-nowrap">Margem Bruta:</span>
            <span className={`font-bold text-xs whitespace-nowrap ${
              summary.totalGrossProfitValue >= 0 ? 'text-emerald-700' : 'text-rose-600'
            }`}>{formatCurrency(summary.totalGrossProfitValue)}</span>
          </div>
        </div>

        {/* b) 2. Rend. Desossa (excluída informação de Rend. Bruto PA) */}
        <div id="kpi-box-rend-desossa" className="bg-white rounded-xl p-4 border border-slate-200/80 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between h-full min-h-[156px]">
          <div className="flex items-center justify-between text-slate-500 mb-2 h-7">
            <span
              className="text-xs font-bold uppercase tracking-wider text-slate-500 truncate"
              title="Rendimento Líquido da Desossa: Peso Total da Carne Vendável sobre o Peso da Carcaça"
            >
              Rend. Desossa
            </span>
            <div
              className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0"
              title="Carnes Vendáveis / Peso da Carcaça"
            >
              <Scale className="w-4 h-4" />
            </div>
          </div>
          <div className="my-auto py-1">
            <div className="text-2xl font-black text-emerald-700 tracking-tight whitespace-nowrap">
              {formatPct(summary.avgDeboningYieldNetPct, 2)}
            </div>
          </div>
          {summary.hasAnyPreDebonedInput ? (
            <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] min-h-[34px] text-amber-900 bg-amber-50/70 -mx-1 px-1.5 rounded" title="Desossa Mista: Carne já desossada deduzida da carcaça">
              <span className="font-semibold text-[10px] whitespace-nowrap">⚡ Mista:</span>
              <span className="font-mono font-bold text-[10px] whitespace-nowrap">-{formatKg(summary.totalPreDebonedInputKg, 0)}</span>
            </div>
          ) : (
            <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-xs min-h-[34px]">
              <span className="text-slate-500 text-[11px] whitespace-nowrap">Carnes Vendáveis:</span>
              <span className="font-bold text-slate-800 text-xs whitespace-nowrap">
                {formatKg(summary.totalSaleableCutsKg, 0)}
              </span>
            </div>
          )}
        </div>

        {/* c) 3. Sub Produtos (com pesos do OSSO e do SEBO e seus respectivos %) */}
        <div id="kpi-box-sub-produtos" className="bg-white rounded-xl p-4 border border-slate-200/80 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between h-full min-h-[156px]">
          <div className="flex items-center justify-between text-slate-500 mb-2 h-7">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 truncate" title="Sub Produtos: Soma de Osso e Sebo sobre a Matéria-Prima">
              Sub Produtos
            </span>
            <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center shrink-0">
              <Bone className="w-4 h-4" />
            </div>
          </div>
          <div className="my-auto py-1">
            <div className="flex items-baseline gap-1.5 whitespace-nowrap">
              <span className="text-2xl font-black text-slate-900 tracking-tight">
                {formatPct(summary.avgNonSaleablePct, 2)}
              </span>
              <span className="text-xs font-semibold text-slate-500 font-mono">
                ({formatKg(summary.totalNonSaleableKg, 0)})
              </span>
            </div>
          </div>
          <div className="mt-3 pt-1.5 border-t border-slate-100 flex flex-col justify-center text-[10.5px] min-h-[34px] text-slate-600 gap-0.5">
            <div className="flex items-center justify-between whitespace-nowrap">
              <span className="text-slate-500">Osso:</span>
              <span className="text-slate-800">
                <strong className="font-bold">{formatKg(summary.totalBoneKg, 0)}</strong>{' '}
                <span className="text-slate-600 font-mono text-[10px] font-bold">({formatPct(summary.avgBonePct, 2)})</span>
              </span>
            </div>
            <div className="flex items-center justify-between whitespace-nowrap">
              <span className="text-slate-500">Sebo:</span>
              <span className="text-slate-800">
                <strong className="font-bold">{formatKg(summary.totalFatKg, 0)}</strong>{' '}
                <span className="text-slate-600 font-mono text-[10px] font-bold">({formatPct(summary.avgFatPct, 2)})</span>
              </span>
            </div>
          </div>
        </div>

        {/* d) 4. Perda / Quebra */}
        <div id="kpi-box-perda-quebra" className="bg-white rounded-xl p-4 border border-slate-200/80 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between h-full min-h-[156px]">
          <div className="flex items-center justify-between text-slate-500 mb-2 h-7">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 truncate" title="Perda de Desossa (Quebra Técnica)">
              Perda / Quebra
            </span>
            <div
              className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                summary.avgLossPct <= TARGET_LOSS_MAX
                  ? 'bg-emerald-50 text-emerald-700'
                  : 'bg-rose-50 text-rose-700'
              }`}
            >
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="my-auto py-1">
            <div className="text-2xl font-black text-slate-900 tracking-tight whitespace-nowrap">
              {formatPct(summary.avgLossPct, 3)}
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-xs min-h-[34px]">
            <span className="text-slate-500 text-[11px] whitespace-nowrap">
              Quebra: <strong className="text-slate-700 font-bold">{formatKg(summary.totalLossKg, 0)}</strong>
            </span>
            <span
              className={`text-[10px] font-bold px-1.5 py-0.5 rounded whitespace-nowrap ${
                summary.avgLossPct <= TARGET_LOSS_MAX
                  ? 'bg-emerald-50 text-emerald-700'
                  : 'bg-rose-50 text-rose-700'
              }`}
            >
              {summary.avgLossPct <= TARGET_LOSS_MAX ? 'No Limite' : 'Acima Teto'}
            </span>
          </div>
        </div>

        {/* e) 5. Faturamento PA */}
        <div id="kpi-box-faturamento-pa" className="bg-white rounded-xl p-4 border border-slate-200/80 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between h-full min-h-[156px]">
          <div className="flex items-center justify-between text-slate-500 mb-2 h-7">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 truncate" title="Faturamento Total do Produto Acabado">
              Faturamento PA
            </span>
            <div className="w-7 h-7 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="my-auto py-1">
            <div className="text-xl xl:text-[18px] 2xl:text-xl font-black text-slate-900 tracking-tight whitespace-nowrap">
              {formatCurrency(summary.totalFinishedValue)}
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-xs min-h-[34px]">
            <span className="text-slate-500 text-[11px] whitespace-nowrap">Custo Carcaça:</span>
            <span className="font-bold text-slate-700 text-xs whitespace-nowrap">{formatCurrency(summary.totalCarcassCostValue)}</span>
          </div>
        </div>

        {/* f) 6. Produtividade (Linha de Desossa como um todo) */}
        <div id="kpi-box-produtividade" className="bg-white rounded-xl p-4 border border-slate-200/80 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between h-full min-h-[156px]">
          <div className="flex items-center justify-between text-slate-500 mb-2 h-7">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 truncate" title="Produtividade da Linha de Desossa (kg por operador)">
              Produtividade
            </span>
            <div className="w-7 h-7 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="my-auto py-1">
            <div className="flex items-baseline gap-1 whitespace-nowrap">
              <span className="text-2xl font-black text-slate-900 tracking-tight">
                {formatWeightNum(summary.avgProductivityKgPerPerson, 1)}
              </span>
              <span className="text-xs font-semibold text-slate-500">kg/pes</span>
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-xs min-h-[34px]">
            <span className="text-slate-500 text-[11px] whitespace-nowrap">
              Meta: <strong className="text-slate-700 font-bold">{TARGET_PRODUCTIVITY} kg</strong>
            </span>
            <span
              className={`text-[10px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1 shrink-0 whitespace-nowrap ${
                summary.avgProductivityKgPerPerson >= TARGET_PRODUCTIVITY ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
              }`}
            >
              {summary.avgProductivityKgPerPerson >= TARGET_PRODUCTIVITY ? (
                <CheckCircle2 className="w-3 h-3" />
              ) : (
                <AlertTriangle className="w-3 h-3" />
              )}
              {summary.avgProductivityKgPerPerson >= TARGET_PRODUCTIVITY ? 'Batida' : 'Abaixo'}
            </span>
          </div>
        </div>
      </div>

      {/* Gráfico de Barras Comparativo de Desempenho Semanal (REQUISITO EXPLÍCITO DO USUÁRIO) */}
      <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-2xs">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-rose-800" />
              <h3 className="text-base font-bold text-slate-900">
                Comparativo de Desempenho Semanal da Desossa
              </h3>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Acompanhamento dia a dia da performance dos lotes processados na semana
            </p>
          </div>

          {/* Metric Selector Buttons */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg text-xs font-semibold">
            <button
              onClick={() => setWeeklyMetric('rendimento')}
              className={`px-3 py-1 rounded-md transition-all ${
                weeklyMetric === 'rendimento'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Rendimento (%)
            </button>
            <button
              onClick={() => setWeeklyMetric('produtividade')}
              className={`px-3 py-1 rounded-md transition-all ${
                weeklyMetric === 'produtividade'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Produtividade (Kg/pessoa)
            </button>
            <button
              onClick={() => setWeeklyMetric('quebra')}
              className={`px-3 py-1 rounded-md transition-all ${
                weeklyMetric === 'quebra'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Perda / Quebra (%)
            </button>
            <button
              onClick={() => setWeeklyMetric('financeiro')}
              className={`px-3 py-1 rounded-md transition-all ${
                weeklyMetric === 'financeiro'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Margem Financeira (R$)
            </button>
          </div>
        </div>

        {/* Chart Canvas */}
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            {weeklyMetric === 'rendimento' ? (
              <BarChart data={weeklyData} margin={{ top: 22, right: 20, left: 0, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="diaSemana" tick={{ fontSize: 11, fill: '#475569' }} />
                <YAxis domain={[60, 105]} tick={{ fontSize: 11, fill: '#475569' }} unit="%" />
                <Tooltip
                  formatter={(value: any) => [`${value}%`, '']}
                  contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                />
                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                <Bar dataKey="deboningYieldNetPct" name="Rend. Desossa (Carnes/Carcaça %)" fill="#059669" radius={[4, 4, 0, 0]}>
                  <LabelList
                    dataKey="deboningYieldNetPct"
                    position="top"
                    formatter={(val: any) => `${Number(val).toFixed(1)}%`}
                    style={{ fontSize: '10px', fontWeight: 'bold', fill: '#047857' }}
                  />
                </Bar>
                <Bar dataKey="totalYieldPct" name="Rend. Bruto Total PA (%)" fill="#2563eb" radius={[4, 4, 0, 0]}>
                  <LabelList
                    dataKey="totalYieldPct"
                    position="top"
                    formatter={(val: any) => `${Number(val).toFixed(1)}%`}
                    style={{ fontSize: '10px', fontWeight: 'bold', fill: '#1d4ed8' }}
                  />
                </Bar>
              </BarChart>
            ) : weeklyMetric === 'produtividade' ? (
              <BarChart data={weeklyData} margin={{ top: 22, right: 20, left: 0, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="diaSemana" tick={{ fontSize: 11, fill: '#475569' }} />
                <YAxis domain={[500, 1000]} tick={{ fontSize: 11, fill: '#475569' }} unit=" kg" />
                <Tooltip
                  formatter={(value: any) => [`${value} kg/pessoa`, 'Produtividade']}
                  contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                />
                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                <Bar dataKey="productivityKgPerPerson" name="Kg / Pessoa" fill="#d97706" radius={[4, 4, 0, 0]}>
                  {weeklyData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.productivityKgPerPerson >= TARGET_PRODUCTIVITY ? '#059669' : '#d97706'}
                    />
                  ))}
                  <LabelList
                    dataKey="productivityKgPerPerson"
                    position="top"
                    formatter={(val: any) => `${Math.round(Number(val))} kg`}
                    style={{ fontSize: '10px', fontWeight: 'bold', fill: '#0f172a' }}
                  />
                </Bar>
              </BarChart>
            ) : weeklyMetric === 'quebra' ? (
              <BarChart data={weeklyData} margin={{ top: 22, right: 20, left: 0, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="diaSemana" tick={{ fontSize: 11, fill: '#475569' }} />
                <YAxis domain={[0, 2.2]} tick={{ fontSize: 11, fill: '#475569' }} unit="%" />
                <Tooltip
                  formatter={(value: any) => [`${value}%`, 'Quebra / Perda']}
                  contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                />
                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                <Bar dataKey="lossPct" name="Quebra Apurada (%)" fill="#e11d48" radius={[4, 4, 0, 0]}>
                  {weeklyData.map((entry, index) => (
                    <Cell
                      key={`cell-loss-${index}`}
                      fill={entry.lossPct <= TARGET_LOSS_MAX ? '#059669' : '#e11d48'}
                    />
                  ))}
                  <LabelList
                    dataKey="lossPct"
                    position="top"
                    formatter={(val: any) => `${Number(val).toFixed(2)}%`}
                    style={{ fontSize: '10px', fontWeight: 'bold', fill: '#be123c' }}
                  />
                </Bar>
              </BarChart>
            ) : (
              <BarChart data={weeklyData} margin={{ top: 22, right: 20, left: 10, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="diaSemana" tick={{ fontSize: 11, fill: '#475569' }} />
                <YAxis
                  tick={{ fontSize: 11, fill: '#475569' }}
                  tickFormatter={(val) => `R$ ${(val / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  formatter={(value: any) => [formatCurrency(value), '']}
                  contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                />
                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                <Bar dataKey="grossProfitValue" name="Margem Bruta (R$)" fill="#059669" radius={[4, 4, 0, 0]}>
                  <LabelList
                    dataKey="grossProfitValue"
                    position="top"
                    formatter={(val: any) => `R$ ${(Number(val) / 1000).toFixed(0)}k`}
                    style={{ fontSize: '10px', fontWeight: 'bold', fill: '#047857' }}
                  />
                </Bar>
                <Bar dataKey="custoCarcaça" name="Custo Carcaça (R$)" fill="#94a3b8" radius={[4, 4, 0, 0]}>
                  <LabelList
                    dataKey="custoCarcaça"
                    position="top"
                    formatter={(val: any) => `R$ ${(Number(val) / 1000).toFixed(0)}k`}
                    style={{ fontSize: '10px', fontWeight: 'bold', fill: '#475569' }}
                  />
                </Bar>
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>
      </div>

      {/* Two Columns: Segmentos Dianteiro/Traseiro & Balanço de Subprodutos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Segmentação Operacional: Dianteiro (DT) vs Traseiro (TR) */}
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                Segmentação Operacional: DT vs TR
              </h3>
              <p className="text-xs text-slate-500">
                Comparativo de rendimento e rentabilidade entre partes
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={onNavigateToDianteiro}
                className="text-xs text-rose-800 hover:text-rose-900 font-semibold flex items-center gap-1"
              >
                Detalhes DT <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={onNavigateToTraseiro}
                className="text-xs text-rose-800 hover:text-rose-900 font-semibold flex items-center gap-1 ml-2"
              >
                Detalhes TR <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Box Dianteiro */}
            <div className="p-3.5 rounded-lg bg-amber-50/60 border border-amber-200/70">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                  <Beef className="w-4 h-4 text-amber-700" />
                  Dianteiro Bovino (DT)
                </span>
                <span className="text-[10px] bg-amber-200 text-amber-900 px-1.5 py-0.5 rounded font-bold">
                  Acém / Paleta
                </span>
              </div>
              <div className="mt-2 space-y-1.5 text-xs text-slate-700">
                <div className="flex justify-between">
                  <span className="text-slate-500">Rend. Desossa (Carnes/Carc.):</span>
                  <span className="font-bold text-slate-900">{formatPct(dtSummary.avgDeboningYieldNetPct, 2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Quebra Média:</span>
                  <span className={`font-semibold ${dtSummary.avgLossPct <= TARGET_LOSS_MAX ? 'text-emerald-700' : 'text-rose-700'}`}>
                    {formatPct(dtSummary.avgLossPct, 2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Subprodutos (Osso+Sebo):</span>
                  <span className="font-semibold text-slate-800">{formatPct(dtSummary.avgNonSaleablePct, 2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Margem Operacional:</span>
                  <span className={`font-bold ${dtSummary.avgProfitMarginPct >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>{formatPct(dtSummary.avgProfitMarginPct, 2)}</span>
                </div>
              </div>
            </div>

            {/* Box Traseiro */}
            <div className="p-3.5 rounded-lg bg-rose-50/60 border border-rose-200/70">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-rose-950 flex items-center gap-1.5">
                  <Beef className="w-4 h-4 text-rose-700" />
                  Traseiro Bovino (TR)
                </span>
                <span className="text-[10px] bg-rose-200 text-rose-900 px-1.5 py-0.5 rounded font-bold">
                  Picanha / Contra
                </span>
              </div>
              <div className="mt-2 space-y-1.5 text-xs text-slate-700">
                <div className="flex justify-between">
                  <span className="text-slate-500">Rend. Desossa (Carnes/Carc.):</span>
                  <span className="font-bold text-slate-900">{formatPct(trSummary.avgDeboningYieldNetPct, 2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Quebra Média:</span>
                  <span className={`font-semibold ${trSummary.avgLossPct <= TARGET_LOSS_MAX ? 'text-emerald-700' : 'text-amber-700'}`}>
                    {formatPct(trSummary.avgLossPct, 2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Subprodutos (Osso+Sebo):</span>
                  <span className="font-semibold text-slate-800">{formatPct(trSummary.avgNonSaleablePct, 2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Margem Operacional:</span>
                  <span className={`font-bold ${trSummary.avgProfitMarginPct >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>{formatPct(trSummary.avgProfitMarginPct, 2)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Decomposição de Massa & Sub Produtos */}
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                Balanço de Massa & Sub Produtos
              </h3>
              <p className="text-xs text-slate-500">
                Aproveitamento de carcaça: Cortes Vendáveis vs Sub Produtos (Osso e Sebo)
              </p>
            </div>
            <span className="text-xs font-bold px-2 py-1 rounded bg-slate-100 text-slate-700">
              Total MP: {formatKg(summary.totalRawMaterialKg, 0)}
            </span>
          </div>

          <div className="space-y-3 pt-1">
            {/* Bar 1: Cortes Vendáveis */}
            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span className="text-emerald-800 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  Cortes Vendáveis (Nobre/Especial/Recorte)
                </span>
                <span className="text-slate-900">
                  {formatKg(summary.totalSaleableCutsKg)} ({formatPct(summary.avgSaleableYieldOnCarcassPct)})
                </span>
              </div>
              <div className="w-full h-3 rounded-full bg-slate-100 overflow-hidden">
                <div
                  className="h-full bg-emerald-600 rounded-full"
                  style={{ width: `${Math.min(summary.avgSaleableYieldOnCarcassPct, 100)}%` }}
                />
              </div>
            </div>

            {/* Bar 2: Osso (Subproduto) */}
            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span className="text-slate-700 flex items-center gap-1">
                  <Bone className="w-3.5 h-3.5 text-slate-500" />
                  Osso Total Extraído
                </span>
                <span className="text-slate-900">
                  {formatKg(summary.totalBoneKg)} ({formatPct(summary.avgBonePct)})
                </span>
              </div>
              <div className="w-full h-3 rounded-full bg-slate-100 overflow-hidden">
                <div
                  className="h-full bg-slate-400 rounded-full"
                  style={{ width: `${Math.min(summary.avgBonePct * 2.5, 100)}%` }}
                />
              </div>
            </div>

            {/* Bar 3: Sebo / Gordura industrial */}
            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span className="text-amber-800 flex items-center gap-1">
                  <Flame className="w-3.5 h-3.5 text-amber-600" />
                  Sebo e Gordura Industrial
                </span>
                <span className="text-slate-900">
                  {formatKg(summary.totalFatKg)} ({formatPct(summary.avgFatPct)})
                </span>
              </div>
              <div className="w-full h-3 rounded-full bg-slate-100 overflow-hidden">
                <div
                  className="h-full bg-amber-500 rounded-full"
                  style={{ width: `${Math.min(summary.avgFatPct * 10, 100)}%` }}
                />
              </div>
            </div>

            {/* Bar 4: Quebra Operacional */}
            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span className="text-rose-800 flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                  Perda / Quebra Físico-Química
                </span>
                <span className="text-slate-900">
                  {formatKg(summary.totalLossKg)} ({formatPct(summary.avgLossPct, 3)})
                </span>
              </div>
              <div className="w-full h-3 rounded-full bg-slate-100 overflow-hidden">
                <div
                  className={`h-full rounded-full ${summary.avgLossPct <= TARGET_LOSS_MAX ? 'bg-emerald-500' : 'bg-rose-600'}`}
                  style={{ width: `${Math.min(summary.avgLossPct * 40, 100)}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Relatórios de Produção Filtrados / Lotes do Período */}
      <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-2xs">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
              Lotes de Produção & Relatórios Processados
            </h3>
            <p className="text-xs text-slate-500">
              Clique em um lote para visualizar os dados detalhados ou gerar o relatório gerencial
            </p>
          </div>
          <span className="text-xs font-semibold text-slate-600">
            {filteredRecords.length} lote(s) listado(s)
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-600 font-semibold border-y border-slate-200">
                <th className="py-2.5 px-3">Data / Turno</th>
                <th className="py-2.5 px-3">Tipo Carcaça</th>
                <th className="py-2.5 px-3">Responsável</th>
                <th className="py-2.5 px-3 text-right">Matéria-Prima (kg)</th>
                <th className="py-2.5 px-3 text-right">Prod. Acabado (kg)</th>
                <th className="py-2.5 px-3 text-right">Rend. Desossa</th>
                <th className="py-2.5 px-3 text-right">Quebra (%)</th>
                <th className="py-2.5 px-3 text-right">Produtividade</th>
                <th className="py-2.5 px-3 text-right">Margem (%)</th>
                <th className="py-2.5 px-3 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRecords.map((r) => {
                const isLossOk = r.lossPct <= TARGET_LOSS_MAX;
                return (
                  <tr
                    key={r.id}
                    className="hover:bg-slate-50/80 transition-colors"
                  >
                    <td className="py-3 px-3">
                      <div className="font-bold text-slate-900">
                        {r.date.split('-').reverse().join('/')}
                      </div>
                      <div className="text-[11px] text-slate-500">{r.shift}</div>
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                          r.type === 'DIANTEIRO'
                            ? 'bg-amber-100 text-amber-900 border border-amber-200'
                            : 'bg-rose-100 text-rose-900 border border-rose-200'
                        }`}
                      >
                        {r.type === 'DIANTEIRO' ? 'DT - DIANTEIRO' : 'TR - TRASEIRO'}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-slate-800 font-medium">
                      {r.responsibleOperator}
                      <span className="text-slate-400 block text-[10px]">
                        {r.operatorCount} pessoas
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-medium text-slate-800">
                      {formatWeightNum(r.rawMaterialWeightKg, 3)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-medium text-slate-800">
                      {formatWeightNum(r.finishedProductWeightKg, 3)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-emerald-700">
                      {formatPct(r.deboningYieldNetPct, 2)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-bold">
                      <span
                        className={isLossOk ? 'text-emerald-700' : 'text-rose-600'}
                      >
                        {formatPct(r.lossPct, 3)}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-slate-800 font-medium">
                      {formatWeightNum(r.productivityKgPerPerson, 1)} kg
                    </td>
                    <td className={`py-3 px-3 text-right font-mono font-bold ${
                      r.profitMarginPct >= 0 ? 'text-emerald-700' : 'text-rose-600'
                    }`}>
                      {formatPct(r.profitMarginPct, 2)}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <button
                        onClick={() => onSelectRecord(r.id)}
                        className="px-2.5 py-1 text-xs font-semibold bg-slate-100 hover:bg-rose-900 hover:text-white text-slate-700 rounded transition-colors"
                      >
                        Visualizar
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
