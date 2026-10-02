import React, { useRef, useState } from 'react';
import {
  Printer,
  Download,
  FileSpreadsheet,
  Building2,
  Calendar,
  Layers,
  Scale,
  Users,
  AlertTriangle,
  CheckCircle2,
  DollarSign,
  TrendingUp,
  Beef,
  Bone,
  Flame,
  ArrowUpRight,
  ArrowDownRight,
  Filter,
  FileEdit,
  Trash2,
  HardDrive
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { ProductionRecord } from '../types';
import { formatCurrency, formatKg, formatPct, formatWeightNum, calculateSummary } from '../utils/calculations';
import { exportMasterDatabaseToExcel } from '../utils/excelDatabase';
import { findBenchmarkForCut } from '../utils/benchmarkMatcher';
import { EditRecordModal } from './EditRecordModal';
import { DeleteRecordModal } from './DeleteRecordModal';

interface OnePageReportProps {
  selectedRecordId?: string | null;
}

export const OnePageReport: React.FC<OnePageReportProps> = ({
  selectedRecordId,
}) => {
  const {
    records,
    filteredRecords,
    summary,
    benchmarks,
    filters,
    deleteRecord,
    correctRecordDetails,
    canEdit,
  } = useApp();
  
  // Choose record to display: either selected, or first filtered, or first overall
  const [activeRecordId, setActiveRecordId] = useState<string>(
    selectedRecordId || filteredRecords[0]?.id || records[0]?.id || ''
  );

  // Managerial Type Filter for One Page Report (DT vs TR vs DS vs ALL)
  const [reportTypeFilter, setReportTypeFilter] = useState<'ALL' | 'DIANTEIRO' | 'TRASEIRO' | 'SUINO'>(() => {
    return filters.type !== 'ALL' ? filters.type : 'ALL';
  });

  // Keep activeRecordId synced if selectedRecordId changes
  React.useEffect(() => {
    if (selectedRecordId) {
      setActiveRecordId(selectedRecordId);
      const rec = records.find((r) => r.id === selectedRecordId);
      if (rec) setReportTypeFilter(rec.type);
    }
  }, [selectedRecordId, records]);

  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  const [mode, setMode] = useState<'single_record' | 'consolidated'>(
    selectedRecordId ? 'single_record' : 'single_record'
  );

  // Filtered records list for lot selection dropdown
  const availableRecords = React.useMemo(() => {
    if (reportTypeFilter === 'ALL') return records;
    return records.filter((r) => r.type === reportTypeFilter);
  }, [records, reportTypeFilter]);

  const activeRecord = records.find((r) => r.id === activeRecordId) || availableRecords[0] || records[0];

  // Acumulado do Mês do lote ativo para o novo BOX de indicadores gerenciais
  const activeMonth = activeRecord?.date ? activeRecord.date.substring(0, 7) : (filters.month || new Date().toISOString().substring(0, 7));
  const monthRecords = React.useMemo(() => {
    return records.filter((r) => r.date.startsWith(activeMonth) && (reportTypeFilter === 'ALL' || r.type === activeRecord?.type));
  }, [records, activeMonth, reportTypeFilter, activeRecord?.type]);

  const monthSummary = React.useMemo(() => {
    return calculateSummary(monthRecords);
  }, [monthRecords]);

  const monthLabel = React.useMemo(() => {
    if (!activeMonth) return '';
    const [year, month] = activeMonth.split('-');
    const dateObj = new Date(Number(year), Number(month) - 1, 1);
    return dateObj.toLocaleString('pt-BR', { month: 'long', year: 'numeric' }).toUpperCase();
  }, [activeMonth]);

  // Handle line type filter change (DT vs TR vs DS vs ALL)
  const handleFilterTypeChange = (type: 'ALL' | 'DIANTEIRO' | 'TRASEIRO' | 'SUINO') => {
    setReportTypeFilter(type);
    if (type === 'ALL') return;

    // If active record already matches the selected type, keep it
    if (activeRecord && activeRecord.type === type) return;

    // 1. Prioritize finding a record of the requested type ON THE SAME DATE!
    const sameDateRecord = records.find((r) => r.date === activeRecord?.date && r.type === type);
    if (sameDateRecord) {
      setActiveRecordId(sameDateRecord.id);
      return;
    }

    // 2. Otherwise pick the first record of that type
    const firstOfType = records.find((r) => r.type === type);
    if (firstOfType) {
      setActiveRecordId(firstOfType.id);
    }
  };

  // Find complementary parallel record on the same date (e.g. if viewing TR, check if DT exists on same date)
  const oppositeType = activeRecord?.type === 'DIANTEIRO' ? 'TRASEIRO' : 'DIANTEIRO';
  const parallelRecordSameDate = React.useMemo(() => {
    if (!activeRecord) return null;
    return records.find((r) => r.date === activeRecord.date && r.type === oppositeType);
  }, [records, activeRecord, oppositeType]);

  const handlePrint = () => {
    window.print();
  };

  const handleExportExcel = () => {
    if (!activeRecord) return;
    try {
      exportMasterDatabaseToExcel([activeRecord], benchmarks);
      setFeedbackMsg(`Planilha Excel deste lote gerada e baixada com sucesso.`);
      setTimeout(() => setFeedbackMsg(null), 4000);
    } catch (e: any) {
      console.error(e);
      setFeedbackMsg(`Erro ao exportar lote para Excel: ${e.message || 'Falha'}`);
    }
  };

  const handleConfirmDelete = async (id: string) => {
    const res = await deleteRecord(id);
    setFeedbackMsg(res.message || 'Relatório excluído com sucesso da base de dados e do Supabase.');
    setIsDeleting(false);
    const remaining = records.filter((r) => r.id !== id);
    if (remaining.length > 0) {
      setActiveRecordId(remaining[0].id);
    }
    setTimeout(() => setFeedbackMsg(null), 4000);
  };

  const handleSaveCorrection = (
    id: string,
    updates: {
      responsibleOperator?: string;
      operatorCount?: number;
      shift?: 'Turno 1' | 'Turno 2' | 'Turno 3';
      carcassCostPerKg?: number;
      date?: string;
      notes?: string;
    }
  ) => {
    correctRecordDetails(id, updates);
    setFeedbackMsg('Informações do lote corrigidas com sucesso!');
    setTimeout(() => setFeedbackMsg(null), 4000);
  };

  const handleExportCSV = () => {
    if (!activeRecord) return;
    const headers = ['Codigo', 'Corte', 'Peso_KG', 'Caixas', 'Rend_Apurado_Pct', 'Rend_Esperado_Pct', 'Preco_Unit_R$', 'Total_R$'];
    const rows = activeRecord.cuts.map((c) => [
      `"${c.code}"`,
      `"${c.name}"`,
      c.weightKg.toFixed(3),
      c.boxesCount,
      c.yieldActualPct.toFixed(2),
      c.yieldExpectedPct.toFixed(2),
      c.unitPrice.toFixed(2),
      c.totalPrice.toFixed(2),
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `OnePageReport_Desossa_${activeRecord.type}_${activeRecord.date}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!activeRecord) {
    return (
      <div className="p-8 text-center text-slate-500 bg-white rounded-xl border">
        Nenhum registro de produção disponível para gerar o One Page Report.
      </div>
    );
  }

  // Pre-sort cuts to fit nicely on the 1-page layout
  const topCuts = [...activeRecord.cuts]
    .filter((c) => !c.isNonSaleable)
    .sort((a, b) => b.weightKg - a.weightKg)
    .slice(0, 11); // up to 11 principal cuts to ensure strict 1-page fit

  const totalSaleableCutsValue = activeRecord.cuts
    .filter((c) => !c.isNonSaleable)
    .reduce((acc, c) => acc + c.totalPrice, 0);

  // Exact calculations synchronized with the deboning analytical table
  const activeRecordTotalValue = React.useMemo(() => {
    if (!activeRecord) return 0;
    if (activeRecord.cuts && activeRecord.cuts.length > 0) {
      const sum = activeRecord.cuts.reduce((acc, c) => acc + c.totalPrice, 0);
      if (sum > 0) return sum;
    }
    return activeRecord.finishedProductTotalValue;
  }, [activeRecord]);

  const activeRecordGrossProfit = React.useMemo(() => {
    if (!activeRecord) return 0;
    return activeRecordTotalValue - activeRecord.totalCarcassCost;
  }, [activeRecord, activeRecordTotalValue]);

  const activeRecordMarginPct = React.useMemo(() => {
    return activeRecordTotalValue > 0 ? (activeRecordGrossProfit / activeRecordTotalValue) * 100 : 0;
  }, [activeRecordTotalValue, activeRecordGrossProfit]);

  return (
    <div className="space-y-4 pb-12">
      {/* Top action bar (Hidden when printing) */}
      <div className="print:hidden flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-rose-900 text-white flex items-center justify-center">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">
              One Page Report Gerencial (A4 Paisagem)
            </h2>
            <p className="text-xs text-slate-500">
              Visualização condensada e parametrizada em exatamente 1 folha A4 no sentido horizontal
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Seletor de Linha de Processamento: DT vs TR vs Todos */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs font-semibold">
            <span className="text-[10px] uppercase font-bold text-slate-500 px-1 flex items-center gap-1">
              <Layers className="w-3.5 h-3.5 text-rose-800" />
              Linha:
            </span>
            <button
              type="button"
              id="btn-report-filter-all"
              onClick={() => handleFilterTypeChange('ALL')}
              className={`px-2.5 py-1 rounded-md transition-all ${
                reportTypeFilter === 'ALL'
                  ? 'bg-white text-slate-900 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Todos ({records.length})
            </button>
            <button
              type="button"
              id="btn-report-filter-dt"
              onClick={() => handleFilterTypeChange('DIANTEIRO')}
              className={`px-2.5 py-1 rounded-md transition-all flex items-center gap-1 ${
                reportTypeFilter === 'DIANTEIRO'
                  ? 'bg-amber-600 text-white shadow-xs font-bold'
                  : 'text-slate-700 hover:text-amber-800'
              }`}
            >
              <Beef className="w-3.5 h-3.5" />
              Dianteiro (DT)
              <span className={`text-[10px] px-1 rounded-full font-mono ${reportTypeFilter === 'DIANTEIRO' ? 'bg-amber-800 text-white' : 'bg-amber-100 text-amber-900'}`}>
                {records.filter(r => r.type === 'DIANTEIRO').length}
              </span>
            </button>
            <button
              type="button"
              id="btn-report-filter-tr"
              onClick={() => handleFilterTypeChange('TRASEIRO')}
              className={`px-2.5 py-1 rounded-md transition-all flex items-center gap-1 ${
                reportTypeFilter === 'TRASEIRO'
                  ? 'bg-rose-800 text-white shadow-xs font-bold'
                  : 'text-slate-700 hover:text-rose-800'
              }`}
            >
              <Beef className="w-3.5 h-3.5" />
              Traseiro (TR)
              <span className={`text-[10px] px-1 rounded-full font-mono ${reportTypeFilter === 'TRASEIRO' ? 'bg-rose-950 text-white' : 'bg-rose-100 text-rose-900'}`}>
                {records.filter(r => r.type === 'TRASEIRO').length}
              </span>
            </button>
            <button
              type="button"
              id="btn-report-filter-ds"
              onClick={() => handleFilterTypeChange('SUINO')}
              className={`px-2.5 py-1 rounded-md transition-all flex items-center gap-1 ${
                reportTypeFilter === 'SUINO'
                  ? 'bg-emerald-700 text-white shadow-xs font-bold'
                  : 'text-slate-700 hover:text-emerald-800'
              }`}
            >
              <Beef className="w-3.5 h-3.5" />
              Suíno (DS)
              <span className={`text-[10px] px-1 rounded-full font-mono ${reportTypeFilter === 'SUINO' ? 'bg-emerald-950 text-white' : 'bg-emerald-100 text-emerald-900'}`}>
                {records.filter(r => r.type === 'SUINO').length}
              </span>
            </button>
          </div>

          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs">
            <Calendar className="w-3.5 h-3.5 text-slate-500" />
            <span className="text-slate-500">Lote:</span>
            <select
              value={activeRecordId}
              onChange={(e) => setActiveRecordId(e.target.value)}
              className="bg-transparent font-semibold text-slate-800 focus:outline-none cursor-pointer max-w-[210px] truncate"
            >
              {availableRecords.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.date.split('-').reverse().join('/')} - {r.type === 'DIANTEIRO' ? 'DT' : r.type === 'SUINO' ? 'DS' : 'TR'} ({r.shift} • {formatKg(r.rawMaterialWeightKg, 0)})
                </option>
              ))}
            </select>
          </div>

          {/* Quick Manager Actions: Edit & Delete if error */}
          {canEdit && (
            <div className="flex items-center gap-1 bg-slate-50 p-0.5 rounded-lg border border-slate-200">
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="px-2.5 py-1.5 hover:bg-amber-100 text-amber-900 rounded-md text-xs font-semibold flex items-center gap-1 transition-colors"
                title="Corrigir parâmetros operacionais deste lote (Líder, Operadores, Custo carcaça)"
              >
                <FileEdit className="w-3.5 h-3.5" />
                <span>Corrigir</span>
              </button>

              <button
                type="button"
                onClick={() => setIsDeleting(true)}
                className="px-2.5 py-1.5 hover:bg-rose-100 text-rose-800 rounded-md text-xs font-semibold flex items-center gap-1 transition-colors"
                title="Apagar este lote com erro da base para re-importar relatório SisAtak"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Apagar</span>
              </button>
            </div>
          )}

          {/* Excel Export */}
          <button
            onClick={handleExportExcel}
            className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors"
            title="Exportar dados deste lote e cortes para Planilha Excel (.xlsx)"
          >
            <FileSpreadsheet className="w-4 h-4" />
            Exportar Excel
          </button>

          {/* Print PDF */}
          <button
            onClick={handlePrint}
            className="px-4 py-1.5 bg-rose-900 hover:bg-rose-800 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all"
            title="Gerar PDF em formato A4 Paisagem para envio à Diretoria"
          >
            <Printer className="w-4 h-4" />
            Imprimir / Salvar PDF
          </button>
        </div>
      </div>

      {/* Feedback Toast */}
      {feedbackMsg && (
        <div className="print:hidden p-3 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          {feedbackMsg}
        </div>
      )}

      {/* Aviso e alternador rápido para Linhas Concorrentes/Paralelas no mesmo dia */}
      {parallelRecordSameDate && (
        <div className="print:hidden p-3 bg-amber-50 border border-amber-200 text-amber-900 rounded-xl text-xs font-semibold flex flex-wrap items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            <span>
              <strong>Mesmo Dia ({activeRecord.date.split('-').reverse().join('/')}):</strong> Consta também a <strong>{parallelRecordSameDate.type === 'DIANTEIRO' ? 'Desossa Dianteira (DT)' : 'Desossa Traseira (TR)'}</strong> ({formatKg(parallelRecordSameDate.rawMaterialWeightKg, 0)}) processada nesta data.
            </span>
          </div>
          <button
            type="button"
            onClick={() => {
              setActiveRecordId(parallelRecordSameDate.id);
              setReportTypeFilter(parallelRecordSameDate.type);
            }}
            className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold transition-all shadow-2xs flex items-center gap-1.5"
          >
            <span>Gerar One Page do {parallelRecordSameDate.type === 'DIANTEIRO' ? 'Dianteiro (DT)' : 'Traseiro (TR)'}</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 
        A4 LANDSCAPE PAGE CONTAINER 
        Calibrated with exact aspect ratio (297mm x 210mm) and print styles
      */}
      <div className="flex justify-center overflow-x-auto p-1 bg-slate-200/60 rounded-xl print:p-0 print:bg-transparent">
        <div
          id="one-page-report-canvas"
          className="one-page-report-sheet bg-white text-slate-900 shadow-lg border border-slate-300 print:border-none print:shadow-none mx-auto p-4 sm:p-5 flex flex-col justify-between"
          style={{
            width: '100%',
            maxWidth: '1120px', // Standard desktop landscape preview
            minHeight: '760px',
          }}
        >
          {/* HEADER INSTITUCIONAL A4 */}
          <div className="border-b-2 border-slate-900 pb-2 mb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded bg-slate-900 text-white flex items-center justify-center font-black text-sm">
                  BH
                </div>
                <div>
                  <h1 className="text-sm font-black tracking-tight text-slate-900 uppercase">
                    BH FOODS COMÉRCIO E INDÚSTRIA LTDA
                  </h1>
                  <p className="text-[10px] font-bold text-rose-800 tracking-wider uppercase">
                    RELATÓRIO GERENCIAL DE PERFORMANCE - SETOR DE DESOSSA (ONE PAGE REPORT)
                  </p>
                </div>
              </div>

              {/* Tag com código do sistema e data */}
              <div className="text-right text-[10px] text-slate-600 space-y-0.5">
                <div><strong>SisAtak RETQ010</strong> • Empresa: 021 • Lista: 101</div>
                <div>Emissão: {activeRecord.emissionTime || '26/08/2026 14:09 h'} • Pág. 0001/0001</div>
              </div>
            </div>

            {/* Context metadata ribbon */}
            <div className="mt-2 pt-1.5 border-t border-slate-200 grid grid-cols-5 gap-2 text-[11px] bg-slate-50 p-1.5 rounded">
              <div>
                <span className="text-slate-500 block text-[9px] uppercase font-semibold">Data Operação:</span>
                <span className="font-black text-slate-900">{activeRecord.date.split('-').reverse().join('/')}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[9px] uppercase font-semibold">Linha de Desossa:</span>
                <span className={`inline-flex items-center gap-1 font-black uppercase text-[10px] px-1.5 py-0.5 rounded border ${
                  activeRecord.type === 'DIANTEIRO'
                    ? 'bg-amber-100 text-amber-900 border-amber-300'
                    : activeRecord.type === 'SUINO'
                    ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                    : 'bg-rose-100 text-rose-900 border-rose-300'
                }`}>
                  <Beef className="w-3 h-3" />
                  {activeRecord.type === 'DIANTEIRO'
                    ? 'Dianteiro (DT)'
                    : activeRecord.type === 'SUINO'
                    ? 'Suíno (DS)'
                    : 'Traseiro (TR)'}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block text-[9px] uppercase font-semibold">Turno / Equipe:</span>
                <span className="font-bold text-slate-900">{activeRecord.shift} ({activeRecord.operatorCount} pessoas)</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[9px] uppercase font-semibold">Líder / Responsável:</span>
                <span className="font-bold text-slate-900 truncate">{activeRecord.responsibleOperator}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[9px] uppercase font-semibold">Custo Base Carcaça:</span>
                <span className="font-black text-slate-900 font-mono">{formatCurrency(activeRecord.carcassCostPerKg)}/kg</span>
              </div>
            </div>
          </div>

          {/* BOX 1: INDICADORES DA OPERAÇÃO DO DIA / LOTE ATIVO */}
          <div className="mb-2">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-black uppercase text-slate-800 tracking-wider flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-rose-700" />
                Indicadores da Operação do Dia / Lote ({activeRecord.date.split('-').reverse().join('/')})
              </span>
              <span className="text-[9px] font-bold text-slate-500 font-mono">
                {activeRecord.shift} • Carcaça: {formatKg(activeRecord.rawMaterialWeightKg, 0)}
              </span>
            </div>
            <div className="grid grid-cols-6 gap-2">
              {/* KPI 1 - Margem de Lucro */}
              <div className={`p-1.5 rounded text-center flex flex-col justify-between h-[62px] ${
                activeRecordMarginPct >= 0
                  ? 'bg-emerald-50 border border-emerald-300'
                  : 'bg-rose-50 border border-rose-300'
              }`}>
                <span className={`text-[8.5px] font-bold uppercase tracking-tight block truncate h-3.5 leading-3.5 ${
                  activeRecordMarginPct >= 0 ? 'text-emerald-900' : 'text-rose-900'
                }`}>
                  1. Margem de Lucro
                </span>
                <span className={`h-6 flex items-center justify-center text-[13px] font-black font-mono tracking-tight leading-none ${
                  activeRecordMarginPct >= 0 ? 'text-emerald-800' : 'text-rose-600'
                }`}>
                  {formatPct(activeRecordMarginPct, 2)}
                </span>
                <span className={`text-[8.5px] font-bold block truncate h-3.5 leading-3.5 font-mono ${
                  activeRecordMarginPct >= 0 ? 'text-emerald-700' : 'text-rose-600'
                }`}>
                  {formatCurrency(activeRecordGrossProfit)}
                </span>
              </div>

              {/* KPI 2 - Rend. Desossa */}
              <div className="p-1.5 rounded bg-slate-50 border border-slate-200 text-center flex flex-col justify-between h-[62px]">
                <span className="text-[8.5px] font-bold text-slate-600 uppercase tracking-tight block truncate h-3.5 leading-3.5">
                  2. Rend. Desossa
                </span>
                <span className="h-6 flex items-center justify-center text-[13px] font-black text-emerald-700 font-mono tracking-tight leading-none">
                  {formatPct(activeRecord.deboningYieldNetPct, 2)}
                </span>
                <span className="text-[8.5px] text-slate-500 font-medium block truncate h-3.5 leading-3.5">
                  {activeRecord.hasPreDebonedInput
                    ? `Mista (-${formatKg(activeRecord.preDebonedInputKg || 0, 0)})`
                    : `${formatKg(activeRecord.saleableCutsWeightKg, 0)} carnes`}
                </span>
              </div>

              {/* KPI 3 - Sub Produtos */}
              <div className="p-1.5 rounded bg-slate-50 border border-slate-200 text-center flex flex-col justify-between h-[62px]">
                <span className="text-[8.5px] font-bold text-slate-600 uppercase tracking-tight block truncate h-3.5 leading-3.5" title="Sub Produtos: Osso e Sebo">
                  3. Sub Produtos
                </span>
                <span className="h-6 flex items-center justify-center text-[13px] font-black text-amber-800 font-mono tracking-tight leading-none">
                  {formatPct(activeRecord.nonSaleablePct, 2)}
                </span>
                <span className="text-[8.5px] text-slate-600 font-medium block truncate h-3.5 leading-3.5 font-mono" title={`Osso: ${formatKg(activeRecord.boneWeightKg, 0)} (${formatPct(activeRecord.bonePct, 2)}) | Sebo: ${formatKg(activeRecord.fatWeightKg, 0)} (${formatPct(activeRecord.fatPct, 2)})`}>
                  Osso {formatPct(activeRecord.bonePct, 1)} • Sebo {formatPct(activeRecord.fatPct, 1)}
                </span>
              </div>

              {/* KPI 4 - Perda / Quebra */}
              <div className="p-1.5 rounded bg-slate-50 border border-slate-200 text-center flex flex-col justify-between h-[62px]">
                <span className="text-[8.5px] font-bold text-slate-600 uppercase tracking-tight block truncate h-3.5 leading-3.5">
                  4. Perda / Quebra
                </span>
                <span className={`h-6 flex items-center justify-center text-[13px] font-black font-mono tracking-tight leading-none ${activeRecord.lossPct <= 0.8 ? 'text-emerald-700' : 'text-rose-700'}`}>
                  {formatPct(activeRecord.lossPct, 3)}
                </span>
                <span className="text-[8.5px] text-slate-500 font-medium block truncate h-3.5 leading-3.5 font-mono">
                  Quebra: {formatKg(activeRecord.lossKg, 1)}
                </span>
              </div>

              {/* KPI 5 - Faturamento PA */}
              <div className="p-1.5 rounded bg-slate-50 border border-slate-200 text-center flex flex-col justify-between h-[62px]">
                <span className="text-[8.5px] font-bold text-slate-600 uppercase tracking-tight block truncate h-3.5 leading-3.5">
                  5. Faturamento PA
                </span>
                <span className="h-6 flex items-center justify-center text-[11.5px] font-black text-slate-900 font-mono tracking-tight leading-none truncate px-0.5">
                  {formatCurrency(activeRecordTotalValue)}
                </span>
                <span className="text-[8.5px] text-slate-500 font-medium block truncate h-3.5 leading-3.5 font-mono">
                  {activeRecord.finishedProductBoxes} CX • {formatKg(activeRecord.finishedProductWeightKg, 0)}
                </span>
              </div>

              {/* KPI 6 - Produtividade */}
              <div className="p-1.5 rounded bg-slate-50 border border-slate-200 text-center flex flex-col justify-between h-[62px]">
                <span className="text-[8.5px] font-bold text-slate-600 uppercase tracking-tight block truncate h-3.5 leading-3.5">
                  6. Produtividade
                </span>
                <span className="h-6 flex items-center justify-center text-[13px] font-black text-blue-900 font-mono tracking-tight leading-none">
                  {activeRecord.productivityKgPerPerson.toFixed(1)} <span className="text-[8.5px] font-normal ml-0.5">kg/p</span>
                </span>
                <span className="text-[8.5px] text-slate-500 font-medium block truncate h-3.5 leading-3.5">
                  Meta: 800 kg/p ({activeRecord.operatorCount} pess.)
                </span>
              </div>
            </div>
          </div>

          {/* MAIN 2-COLUMN SECTION: MASS BALANCE + CUTS PERFORMANCE & MARGIN TABLE */}
          <div className="grid grid-cols-12 gap-3 mb-1 flex-1">
            {/* Coluna 1: Balanço Físico de Massa (5 colunas de 12) */}
            <div className="col-span-5 border border-slate-200 rounded p-2.5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-1 mb-1.5 border-b border-slate-200">
                  <h3 className="text-[11px] font-black uppercase tracking-wider text-slate-900">
                    Balanço de Massa & Rendimentos
                  </h3>
                  <span className="text-[9px] font-bold text-slate-500">SisAtak RETQ010</span>
                </div>

                <div className="space-y-1.5 text-[10px]">
                  <div className="flex justify-between py-0.5 border-b border-slate-100">
                    <span className="font-semibold text-slate-700">Matéria-Prima (Carcaça):</span>
                    <span className="font-bold font-mono text-slate-900">
                      {formatWeightNum(activeRecord.rawMaterialWeightKg, 3)} kg ({activeRecord.rawMaterialBoxes} CX)
                    </span>
                  </div>

                  <div className="flex justify-between py-0.5 border-b border-slate-100 bg-amber-50/70 px-1 -mx-1 rounded">
                    <span className="font-bold text-amber-950">PESO MÉDIO DA CARCAÇA (Kg):</span>
                    <span className="font-black font-mono text-amber-900">
                      {activeRecord.rawMaterialBoxes > 0
                        ? `${formatWeightNum(activeRecord.rawMaterialWeightKg / activeRecord.rawMaterialBoxes, 2)} kg`
                        : `${formatWeightNum(activeRecord.rawMaterialAvgWeightKg || 0, 2)} kg`}
                    </span>
                  </div>

                  <div className="flex justify-between py-0.5 border-b border-slate-100">
                    <span className="font-semibold text-slate-700">Produto Acabado Total:</span>
                    <span className="font-bold font-mono text-slate-900">
                      {formatWeightNum(activeRecord.finishedProductWeightKg, 3)} kg ({formatPct(activeRecord.totalYieldPct, 2)})
                    </span>
                  </div>

                  <div className="flex justify-between py-0.5 border-b border-slate-100 text-rose-800">
                    <span className="font-semibold">Quebra / Perda Física:</span>
                    <span className="font-bold font-mono">
                      {formatWeightNum(activeRecord.lossKg, 3)} kg ({formatPct(activeRecord.lossPct, 4)})
                    </span>
                  </div>

                  <div className="flex justify-between py-0.5 border-b border-slate-100 text-emerald-800">
                    <span className="font-semibold">Cortes Vendáveis Líquidos:</span>
                    <span className="font-bold font-mono">
                      {formatWeightNum(activeRecord.saleableCutsWeightKg, 3)} kg ({formatPct((activeRecord.saleableCutsWeightKg / activeRecord.rawMaterialWeightKg) * 100)})
                    </span>
                  </div>

                  <div className="flex justify-between py-0.5 border-b border-slate-100 text-slate-600">
                    <span className="font-medium">Subproduto Osso:</span>
                    <span className="font-mono">{formatWeightNum(activeRecord.boneWeightKg, 3)} kg ({formatPct(activeRecord.bonePct, 2)})</span>
                  </div>

                  <div className="flex justify-between py-0.5 border-b border-slate-100 text-slate-600">
                    <span className="font-medium">Subproduto Sebo:</span>
                    <span className="font-mono">{formatWeightNum(activeRecord.fatWeightKg, 3)} kg ({formatPct(activeRecord.fatPct, 2)})</span>
                  </div>
                </div>

                {/* Compact graphical representation */}
                <div className="mt-2.5 pt-2 border-t border-slate-200">
                  <div className="text-[9px] font-bold text-slate-600 uppercase mb-1">
                    Distribuição Proporcional da Carcaça
                  </div>
                  <div className="w-full h-3.5 bg-slate-100 rounded overflow-hidden flex text-[8px] font-bold text-white text-center leading-3.5">
                    <div
                      style={{ width: `${Math.round((activeRecord.saleableCutsWeightKg / activeRecord.rawMaterialWeightKg) * 100)}%` }}
                      className="bg-emerald-600 truncate"
                      title="Cortes Vendáveis"
                    >
                      Cortes {Math.round((activeRecord.saleableCutsWeightKg / activeRecord.rawMaterialWeightKg) * 100)}%
                    </div>
                    <div
                      style={{ width: `${Math.round(activeRecord.bonePct)}%` }}
                      className="bg-slate-400 truncate"
                      title="Osso"
                    >
                      Osso {Math.round(activeRecord.bonePct)}%
                    </div>
                    <div
                      style={{ width: `${Math.round(activeRecord.fatPct * 2)}%` }}
                      className="bg-amber-500 truncate"
                      title="Sebo"
                    >
                      Sebo
                    </div>
                  </div>
                </div>
              </div>

              {/* Bloco de Eficiência Financeira da Desossa */}
              <div className="mt-2 p-2 bg-slate-50 border border-slate-200 rounded text-[10px]">
                <div className="flex justify-between text-slate-700">
                  <span>Custo Total Carcaça:</span>
                  <span className="font-mono font-bold">{formatCurrency(activeRecord.totalCarcassCost)}</span>
                </div>
                <div className="flex justify-between text-slate-700">
                  <span>Faturamento dos Cortes:</span>
                  <span className="font-mono font-bold">{formatCurrency(activeRecordTotalValue)}</span>
                </div>
                <div className={`flex justify-between font-bold border-t border-slate-200 pt-1 mt-1 ${
                  activeRecordGrossProfit >= 0 ? 'text-emerald-800' : 'text-rose-600'
                }`}>
                  <span>Margem Bruta Agregada:</span>
                  <span className="font-mono">{formatCurrency(activeRecordGrossProfit)} ({formatPct(activeRecordMarginPct, 2)})</span>
                </div>
              </div>
            </div>

            {/* Coluna 2: Tabela de Rendimento dos Cortes & Margem (Padrão Anterior) */}
            <div className="col-span-7 border border-slate-200 rounded p-2 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-1 mb-1 border-b border-slate-200">
                  <h3 className="text-[10.5px] font-black uppercase tracking-wider text-slate-900">
                    Rendimento dos Cortes & Margem ({activeRecord.type === 'DIANTEIRO' ? 'Dianteiro' : 'Traseiro'})
                  </h3>
                  <span className="text-[8.5px] text-slate-500 font-bold bg-slate-100 px-1.5 py-0.5 rounded">
                    Rendimento Apurado vs Padrão Meta
                  </span>
                </div>

                <table className="w-full text-left text-[9px] border-collapse">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-300">
                      <th className="py-1 px-1.5">Descrição do Corte</th>
                      <th className="py-1 px-1 text-right">Peso (kg)</th>
                      <th className="py-1 px-1 text-right">Rend. Apurado</th>
                      <th className="py-1 px-1 text-right">Padrão Meta</th>
                      <th className="py-1 px-1 text-right">Desvio</th>
                      <th className="py-1 px-1 text-right">Preço (R$/kg)</th>
                      <th className="py-1 px-1 text-right">Valor Total (R$)</th>
                      <th className="py-1 px-1.5 text-right">Margem</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {topCuts.map((cut) => {
                      const benchmark = findBenchmarkForCut(cut, benchmarks, activeRecord.type);
                      const expectedYieldPct = benchmark ? benchmark.expectedYieldPct : (cut.yieldExpectedPct || 0);
                      const hasBenchmark = expectedYieldPct > 0;
                      const deviation = hasBenchmark ? cut.yieldActualPct - expectedYieldPct : 0;
                      const unitPrice = cut.unitPrice || (cut.weightKg > 0 ? cut.totalPrice / cut.weightKg : 0);
                      const cutCost = cut.weightKg * activeRecord.carcassCostPerKg;
                      const cutGrossProfit = cut.totalPrice - cutCost;
                      const cutMarginPct = cut.totalPrice > 0 ? (cutGrossProfit / cut.totalPrice) * 100 : 0;
                      return (
                        <tr key={cut.id} className="hover:bg-slate-50">
                          <td className="py-0.5 px-1.5 font-semibold text-slate-900 truncate max-w-[130px]" title={cut.name}>
                            {cut.name.replace(/^(CXGG - |MP - |W-MP - |X-MP - )/, '')}
                          </td>
                          <td className="py-0.5 px-1 text-right font-mono">{formatWeightNum(cut.weightKg, 1)}</td>
                          <td className="py-0.5 px-1 text-right font-mono font-bold text-slate-900">
                            {formatPct(cut.yieldActualPct, 2)}
                          </td>
                          <td className="py-0.5 px-1 text-right font-mono text-slate-600">
                            {hasBenchmark ? formatPct(expectedYieldPct, 2) : '-'}
                          </td>
                          <td className="py-0.5 px-1 text-right font-mono font-bold">
                            {hasBenchmark ? (
                              <span className={deviation >= 0 ? 'text-emerald-700' : 'text-rose-700'}>
                                {deviation >= 0 ? '+' : ''}
                                {deviation.toFixed(2)}%
                              </span>
                            ) : (
                              <span className="text-slate-400">-</span>
                            )}
                          </td>
                          <td className="py-0.5 px-1 text-right font-mono text-slate-600">
                            {formatCurrency(unitPrice)}
                          </td>
                          <td className="py-0.5 px-1 text-right font-mono font-bold text-slate-900">
                            {formatCurrency(cut.totalPrice)}
                          </td>
                          <td className="py-0.5 px-1.5 text-right font-mono">
                            <span className={`font-bold ${cutMarginPct >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                              {cutMarginPct >= 0 ? '+' : ''}{formatPct(cutMarginPct, 1)}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-100/95 font-black text-slate-900 border-t border-slate-300 text-[9px]">
                      <td className="py-1 px-1.5 uppercase">Total Cortes</td>
                      <td className="py-1 px-1 text-right font-mono">{formatWeightNum(activeRecord.saleableCutsWeightKg, 1)}</td>
                      <td className="py-1 px-1 text-right font-mono text-emerald-800">
                        {formatPct((activeRecord.saleableCutsWeightKg / activeRecord.rawMaterialWeightKg) * 100, 2)}
                      </td>
                      <td className="py-1 px-1 text-right font-mono text-slate-600">-</td>
                      <td className="py-1 px-1 text-right font-mono text-slate-600">-</td>
                      <td className="py-1 px-1 text-right font-mono text-slate-700">
                        {formatCurrency(activeRecord.saleableCutsWeightKg > 0 ? totalSaleableCutsValue / activeRecord.saleableCutsWeightKg : 0)}
                      </td>
                      <td className="py-1 px-1 text-right font-mono text-slate-900 font-black">
                        {formatCurrency(totalSaleableCutsValue)}
                      </td>
                      <td className={`py-1 px-1.5 text-right font-mono font-black ${
                        activeRecordMarginPct >= 0 ? 'text-emerald-800' : 'text-rose-600'
                      }`}>
                        {formatPct(activeRecordMarginPct, 2)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Subprodutos e Margem Agregada */}
              <div className="mt-1 pt-1 border-t border-slate-200 text-[8.5px] flex justify-between text-slate-600 font-medium">
                <span>Subprodutos: Osso ({formatKg(activeRecord.boneWeightKg, 1)}) • Sebo ({formatKg(activeRecord.fatWeightKg, 1)})</span>
                <span className="font-bold text-slate-800">
                  Faturamento Total PA: {formatCurrency(activeRecordTotalValue)} | Margem da Desossa: <span className={`${activeRecordMarginPct >= 0 ? 'text-emerald-800' : 'text-rose-600'} font-black`}>{formatPct(activeRecordMarginPct, 2)}</span> ({formatCurrency(activeRecordGrossProfit)})
                </span>
              </div>
            </div>
          </div>

          {/* BOX: INDICADORES ACUMULADOS NO MÊS (POSICIONADO NA PARTE INFERIOR DO RELATÓRIO) */}
          <div className="mt-2.5 pt-2 border-t border-slate-200 shrink-0">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-black uppercase text-blue-950 tracking-wider flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-blue-600" />
                Indicadores Acumulados no Mês ({monthLabel} • {monthRecords.length} {monthRecords.length === 1 ? 'Lote' : 'Lotes'} {reportTypeFilter === 'ALL' ? 'Geral' : activeRecord.type === 'DIANTEIRO' ? 'DT' : 'TR'})
              </span>
              <span className="text-[9px] font-bold text-slate-500 font-mono">
                Total Mês: {formatKg(monthSummary.totalRawMaterialKg, 0)} Carcaça
              </span>
            </div>
            <div className="grid grid-cols-6 gap-2">
              {/* KPI 1 Mês - Margem de Lucro */}
              <div className={`p-1.5 rounded text-center flex flex-col justify-between h-[62px] ${
                monthSummary.avgProfitMarginPct >= 0
                  ? 'bg-emerald-50/70 border border-emerald-200'
                  : 'bg-rose-50/70 border border-rose-200'
              }`}>
                <span className={`text-[8.5px] font-bold uppercase tracking-tight block truncate h-3.5 leading-3.5 ${
                  monthSummary.avgProfitMarginPct >= 0 ? 'text-emerald-900' : 'text-rose-900'
                }`}>
                  1. Margem de Lucro (Mês)
                </span>
                <span className={`h-6 flex items-center justify-center text-[13px] font-black font-mono tracking-tight leading-none ${
                  monthSummary.avgProfitMarginPct >= 0 ? 'text-emerald-800' : 'text-rose-600'
                }`}>
                  {formatPct(monthSummary.avgProfitMarginPct, 2)}
                </span>
                <span className={`text-[8.5px] font-bold block truncate h-3.5 leading-3.5 font-mono ${
                  monthSummary.avgProfitMarginPct >= 0 ? 'text-emerald-700' : 'text-rose-600'
                }`}>
                  {formatCurrency(monthSummary.totalGrossProfitValue)}
                </span>
              </div>

              {/* KPI 2 Mês - Rend. Desossa */}
              <div className="p-1.5 rounded bg-slate-50 border border-slate-200 text-center flex flex-col justify-between h-[62px]">
                <span className="text-[8.5px] font-bold text-slate-600 uppercase tracking-tight block truncate h-3.5 leading-3.5">
                  2. Rend. Desossa (Mês)
                </span>
                <span className="h-6 flex items-center justify-center text-[13px] font-black text-emerald-700 font-mono tracking-tight leading-none">
                  {formatPct(monthSummary.avgDeboningYieldNetPct, 2)}
                </span>
                <span className="text-[8.5px] text-slate-500 font-medium block truncate h-3.5 leading-3.5 font-mono">
                  {formatKg(monthSummary.totalSaleableCutsKg, 0)} carnes
                </span>
              </div>

              {/* KPI 3 Mês - Sub Produtos */}
              <div className="p-1.5 rounded bg-slate-50 border border-slate-200 text-center flex flex-col justify-between h-[62px]">
                <span className="text-[8.5px] font-bold text-slate-600 uppercase tracking-tight block truncate h-3.5 leading-3.5" title="Sub Produtos Acumulados no Mês">
                  3. Sub Produtos (Mês)
                </span>
                <span className="h-6 flex items-center justify-center text-[13px] font-black text-amber-800 font-mono tracking-tight leading-none">
                  {formatPct(monthSummary.avgNonSaleablePct, 2)}
                </span>
                <span className="text-[8.5px] text-slate-600 font-medium block truncate h-3.5 leading-3.5 font-mono" title={`Osso: ${formatKg(monthSummary.totalBoneKg, 0)} (${formatPct(monthSummary.avgBonePct, 2)}) | Sebo: ${formatKg(monthSummary.totalFatKg, 0)} (${formatPct(monthSummary.avgFatPct, 2)})`}>
                  Osso {formatPct(monthSummary.avgBonePct, 1)} • Sebo {formatPct(monthSummary.avgFatPct, 1)}
                </span>
              </div>

              {/* KPI 4 Mês - Perda / Quebra */}
              <div className="p-1.5 rounded bg-slate-50 border border-slate-200 text-center flex flex-col justify-between h-[62px]">
                <span className="text-[8.5px] font-bold text-slate-600 uppercase tracking-tight block truncate h-3.5 leading-3.5">
                  4. Perda / Quebra (Mês)
                </span>
                <span className={`h-6 flex items-center justify-center text-[13px] font-black font-mono tracking-tight leading-none ${monthSummary.avgLossPct <= 0.8 ? 'text-emerald-700' : 'text-rose-700'}`}>
                  {formatPct(monthSummary.avgLossPct, 3)}
                </span>
                <span className="text-[8.5px] text-slate-500 font-medium block truncate h-3.5 leading-3.5 font-mono">
                  Quebra: {formatKg(monthSummary.totalLossKg, 1)}
                </span>
              </div>

              {/* KPI 5 Mês - Faturamento PA */}
              <div className="p-1.5 rounded bg-slate-50 border border-slate-200 text-center flex flex-col justify-between h-[62px]">
                <span className="text-[8.5px] font-bold text-slate-600 uppercase tracking-tight block truncate h-3.5 leading-3.5">
                  5. Faturamento PA (Mês)
                </span>
                <span className="h-6 flex items-center justify-center text-[11.5px] font-black text-slate-900 font-mono tracking-tight leading-none truncate px-0.5">
                  {formatCurrency(monthSummary.totalFinishedValue)}
                </span>
                <span className="text-[8.5px] text-slate-500 font-medium block truncate h-3.5 leading-3.5 font-mono">
                  {formatKg(monthSummary.totalFinishedProductKg, 0)} acabados
                </span>
              </div>

              {/* KPI 6 Mês - Produtividade */}
              <div className="p-1.5 rounded bg-slate-50 border border-slate-200 text-center flex flex-col justify-between h-[62px]">
                <span className="text-[8.5px] font-bold text-slate-600 uppercase tracking-tight block truncate h-3.5 leading-3.5">
                  6. Produtividade (Mês)
                </span>
                <span className="h-6 flex items-center justify-center text-[13px] font-black text-blue-900 font-mono tracking-tight leading-none">
                  {monthSummary.avgProductivityKgPerPerson.toFixed(1)} <span className="text-[8.5px] font-normal ml-0.5">kg/p</span>
                </span>
                <span className="text-[8.5px] text-slate-500 font-medium block truncate h-3.5 leading-3.5">
                  Meta: 800 kg/p ({monthSummary.totalOperatorCount} pess.)
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Record Modal */}
      {isEditing && activeRecord && (
        <EditRecordModal
          isOpen={isEditing}
          onClose={() => setIsEditing(false)}
          record={activeRecord}
          onSave={handleSaveCorrection}
        />
      )}

      {/* Delete Record Modal */}
      {isDeleting && activeRecord && (
        <DeleteRecordModal
          isOpen={isDeleting}
          onClose={() => setIsDeleting(false)}
          record={activeRecord}
          onConfirmDelete={handleConfirmDelete}
        />
      )}
    </div>
  );
};
