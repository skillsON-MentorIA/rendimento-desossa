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
import { formatCurrency, formatKg, formatPct, formatWeightNum } from '../utils/calculations';
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

  // 1. Cortes Vendáveis (exclui subprodutos Osso e Sebo)
  const saleableCuts = React.useMemo(() => {
    if (!activeRecord || !activeRecord.cuts) return [];
    return [...activeRecord.cuts]
      .filter((c) => {
        if (c.category === 'SUBPRODUTO_OSSO' || c.category === 'SUBPRODUTO_SEBO') return false;
        if (c.isNonSaleable) return false;
        const isBone = /X-MP.*OSSO/i.test(c.name) || /OSSO.*DESOSSA/i.test(c.name) || (activeRecord.type !== 'SUINO' && /OSSO/i.test(c.name) && !/S\/\s*OSSO|SEM\s*OSSO/i.test(c.name));
        const isFat = activeRecord.type !== 'SUINO' && /SEBO/i.test(c.name);
        return !isBone && !isFat;
      })
      .sort((a, b) => b.weightKg - a.weightKg);
  }, [activeRecord]);

  // Exibição dos cortes vendáveis principais e agrupamento dos demais se houver
  // Calibrado dinamicamente para garantir que o relatório OPR caiba estritamente em 1 única página A4 Paisagem (inclusive no Traseiro)
  const MAX_DISPLAYED_CUTS = saleableCuts.length <= 10 ? 10 : 8;
  const displayedCuts = React.useMemo(() => saleableCuts.slice(0, MAX_DISPLAYED_CUTS), [saleableCuts, MAX_DISPLAYED_CUTS]);
  const otherCuts = React.useMemo(() => saleableCuts.slice(MAX_DISPLAYED_CUTS), [saleableCuts, MAX_DISPLAYED_CUTS]);
  const otherCutsWeight = React.useMemo(() => otherCuts.reduce((acc, c) => acc + c.weightKg, 0), [otherCuts]);
  const otherCutsValue = React.useMemo(() => otherCuts.reduce((acc, c) => acc + c.totalPrice, 0), [otherCuts]);
  const otherCutsYieldPct = activeRecord?.rawMaterialWeightKg > 0 ? (otherCutsWeight / activeRecord.rawMaterialWeightKg) * 100 : 0;
  const otherCutsUnitPrice = otherCutsWeight > 0 ? otherCutsValue / otherCutsWeight : 0;
  const otherCutsCost = otherCutsWeight * (activeRecord?.carcassCostPerKg || 0);
  const otherCutsMarginPct = otherCutsValue > 0 ? ((otherCutsValue - otherCutsCost) / otherCutsValue) * 100 : 0;

  // 2. Subproduto Osso
  const boneCutsList = React.useMemo(() => {
    if (!activeRecord || !activeRecord.cuts) return [];
    return activeRecord.cuts.filter((c) => {
      if (c.category === 'SUBPRODUTO_OSSO') return true;
      if (/S\/\s*OSSO|SEM\s*OSSO/i.test(c.name)) return false;
      if (activeRecord.type === 'SUINO') {
        return /X-MP.*OSSO/i.test(c.name) || /OSSO.*DESOSSA/i.test(c.name) || c.code.includes('02010990005') || c.code.includes('02010990010');
      }
      return /OSSO/i.test(c.name);
    });
  }, [activeRecord]);

  const activeRecordBoneWeight = React.useMemo(() => {
    if (!activeRecord) return 0;
    if (boneCutsList.length > 0) {
      return boneCutsList.reduce((acc, c) => acc + c.weightKg, 0);
    }
    return activeRecord.boneWeightKg;
  }, [activeRecord, boneCutsList]);

  const boneValue = React.useMemo(() => {
    if (boneCutsList.length > 0) {
      const sum = boneCutsList.reduce((acc, c) => acc + c.totalPrice, 0);
      if (sum > 0) return sum;
    }
    return activeRecordBoneWeight * (activeRecord.type === 'SUINO' ? 0.80 : 0.77);
  }, [boneCutsList, activeRecordBoneWeight, activeRecord?.type]);

  const boneUnitPrice = activeRecordBoneWeight > 0 ? boneValue / activeRecordBoneWeight : (activeRecord?.type === 'SUINO' ? 0.80 : 0.77);
  const activeRecordBonePct = activeRecord?.rawMaterialWeightKg > 0
    ? (activeRecordBoneWeight / activeRecord.rawMaterialWeightKg) * 100
    : (activeRecord?.bonePct || 0);
  const boneCost = activeRecordBoneWeight * (activeRecord?.carcassCostPerKg || 0);
  const boneGrossProfit = boneValue - boneCost;
  const boneMarginPct = boneValue > 0 ? (boneGrossProfit / boneValue) * 100 : 0;

  const boneBenchmark = benchmarks.find((b) => b.type === activeRecord?.type && /OSSO/i.test(b.name));
  const boneExpectedYieldPct = boneBenchmark ? boneBenchmark.expectedYieldPct : (activeRecord?.type === 'SUINO' ? 3.50 : activeRecord?.type === 'DIANTEIRO' ? 21.00 : 19.50);
  const boneDeviation = activeRecordBonePct - boneExpectedYieldPct;

  // 3. Subproduto Sebo
  const fatCutsList = React.useMemo(() => {
    if (!activeRecord || !activeRecord.cuts || activeRecord.type === 'SUINO') return [];
    return activeRecord.cuts.filter((c) => c.category === 'SUBPRODUTO_SEBO' || /SEBO/i.test(c.name));
  }, [activeRecord]);

  const activeRecordFatWeight = React.useMemo(() => {
    if (!activeRecord || activeRecord.type === 'SUINO') return 0;
    if (fatCutsList.length > 0) {
      return fatCutsList.reduce((acc, c) => acc + c.weightKg, 0);
    }
    return activeRecord.fatWeightKg;
  }, [activeRecord, fatCutsList]);

  const fatValue = React.useMemo(() => {
    if (activeRecord?.type === 'SUINO') return 0;
    if (fatCutsList.length > 0) {
      const sum = fatCutsList.reduce((acc, c) => acc + c.totalPrice, 0);
      if (sum > 0) return sum;
    }
    return activeRecordFatWeight * 1.40;
  }, [fatCutsList, activeRecordFatWeight, activeRecord?.type]);

  const fatUnitPrice = activeRecordFatWeight > 0 ? fatValue / activeRecordFatWeight : (activeRecord?.type === 'SUINO' ? 0 : 1.40);
  const activeRecordFatPct = activeRecord?.type === 'SUINO'
    ? 0
    : (activeRecord?.rawMaterialWeightKg > 0 ? (activeRecordFatWeight / activeRecord.rawMaterialWeightKg) * 100 : (activeRecord?.fatPct || 0));
  const fatCost = activeRecordFatWeight * (activeRecord?.carcassCostPerKg || 0);
  const fatGrossProfit = fatValue - fatCost;
  const fatMarginPct = fatValue > 0 ? (fatGrossProfit / fatValue) * 100 : 0;

  const fatBenchmark = benchmarks.find((b) => b.type === activeRecord?.type && /SEBO/i.test(b.name));
  const fatExpectedYieldPct = activeRecord?.type === 'SUINO' ? 0 : (fatBenchmark ? fatBenchmark.expectedYieldPct : (activeRecord?.type === 'DIANTEIRO' ? 0.85 : 2.10));
  const fatDeviation = activeRecord?.type === 'SUINO' ? 0 : (activeRecordFatPct - fatExpectedYieldPct);

  // 4. Totais dos Cortes Vendáveis (Subtotal)
  const totalSaleableCutsValue = React.useMemo(() => {
    return saleableCuts.reduce((acc, c) => acc + c.totalPrice, 0);
  }, [saleableCuts]);

  const totalSaleableWeight = activeRecord.saleableCutsWeightKg;
  const totalSaleableYieldPct = activeRecord.rawMaterialWeightKg > 0 ? (totalSaleableWeight / activeRecord.rawMaterialWeightKg) * 100 : 0;
  const totalSaleableCost = totalSaleableWeight * activeRecord.carcassCostPerKg;
  const totalSaleableGrossProfit = totalSaleableCutsValue - totalSaleableCost;
  const totalSaleableMarginPct = totalSaleableCutsValue > 0 ? (totalSaleableGrossProfit / totalSaleableCutsValue) * 100 : 0;

  const activeRecordNonSaleableWeight = activeRecordBoneWeight + activeRecordFatWeight;
  const activeRecordNonSaleablePct = activeRecord?.rawMaterialWeightKg > 0
    ? (activeRecordNonSaleableWeight / activeRecord.rawMaterialWeightKg) * 100
    : (activeRecord.nonSaleablePct || 0);

  // 5. Total Geral Considerando Cortes + Osso + Sebo (Produto Acabado Total)
  const activeRecordTotalValue = React.useMemo(() => {
    if (!activeRecord) return 0;
    if (activeRecord.cuts && activeRecord.cuts.length > 0) {
      const sum = activeRecord.cuts.reduce((acc, c) => acc + c.totalPrice, 0);
      if (sum > 0) return sum;
    }
    return activeRecord.finishedProductTotalValue;
  }, [activeRecord]);

  const totalOverallValue = activeRecordTotalValue;

  const activeRecordGrossProfit = React.useMemo(() => {
    if (!activeRecord) return 0;
    return activeRecordTotalValue - activeRecord.totalCarcassCost;
  }, [activeRecord, activeRecordTotalValue]);

  const activeRecordMarginPct = React.useMemo(() => {
    return activeRecordTotalValue > 0 ? (activeRecordGrossProfit / activeRecordTotalValue) * 100 : 0;
  }, [activeRecordTotalValue, activeRecordGrossProfit]);

  const totalOverallWeight = activeRecord.finishedProductWeightKg;
  const totalOverallYieldPct = activeRecord.totalYieldPct || (activeRecord.rawMaterialWeightKg > 0 ? (totalOverallWeight / activeRecord.rawMaterialWeightKg) * 100 : 0);
  const totalOverallUnitPrice = totalOverallWeight > 0 ? activeRecordTotalValue / totalOverallWeight : 0;

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
          className="one-page-report-sheet bg-white text-slate-900 shadow-lg border border-slate-300 print:border-none print:shadow-none mx-auto p-3 sm:p-4 print:p-0 flex flex-col justify-between"
          style={{
            width: '100%',
            maxWidth: '1220px',
            minHeight: 'auto',
          }}
        >
          {/* HEADER INSTITUCIONAL A4 */}
          <div className="border-b-2 border-slate-900 pb-1.5 mb-1.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center font-black text-sm shadow-2xs">
                  BH
                </div>
                <div>
                  <h1 className="text-sm font-black tracking-tight text-slate-900 uppercase leading-tight">
                    BH FOODS COMÉRCIO E INDÚSTRIA LTDA
                  </h1>
                  <p className="text-[10px] font-bold text-rose-800 tracking-wider uppercase leading-tight">
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
            <div className="mt-1.5 pt-1.5 border-t border-slate-200 grid grid-cols-5 gap-2 text-xs bg-slate-50 p-1.5 rounded-lg">
              <div>
                <span className="text-slate-500 block text-[9px] uppercase font-bold">Data Operação:</span>
                <span className="font-black text-slate-900 text-[11px]">{activeRecord.date.split('-').reverse().join('/')}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[9px] uppercase font-bold">Linha de Desossa:</span>
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
                <span className="text-slate-500 block text-[9px] uppercase font-bold">Turno / Equipe:</span>
                <span className="font-bold text-slate-900 text-[11px]">{activeRecord.shift} ({activeRecord.operatorCount} pess.)</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[9px] uppercase font-bold">Líder / Responsável:</span>
                <span className="font-bold text-slate-900 text-[11px] truncate">{activeRecord.responsibleOperator}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[9px] uppercase font-bold">Custo Base Carcaça:</span>
                <span className="font-black text-slate-900 text-[11px] font-mono">{formatCurrency(activeRecord.carcassCostPerKg)}/kg</span>
              </div>
            </div>
          </div>

          {/* BOX 1: INDICADORES DA OPERAÇÃO DO DIA / LOTE ATIVO */}
          <div className="mb-2">
            <div className="flex flex-wrap items-center justify-between gap-1 mb-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[11px] font-black uppercase text-slate-800 tracking-wider flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-rose-700" />
                  Indicadores da Operação do Dia / Lote ({activeRecord.date.split('-').reverse().join('/')})
                </span>
                <span className="text-[9.5px] font-black uppercase px-1.5 py-0.5 rounded bg-rose-100 text-rose-900 border border-rose-200 tracking-wide font-mono">
                  {activeRecord.rawMaterialDesc || (activeRecord.type === 'SUINO' ? '1/2 CARCAÇA SUÍNA MATRIZ' : activeRecord.type === 'TRASEIRO' ? 'TRASEIRO BOVINO C/ OSSO' : 'DIANTEIRO BOVINO C/ OSSO')}
                </span>
              </div>
              <span className="text-[9.5px] font-bold text-slate-600 font-mono">
                {activeRecord.shift} • Carcaça: {formatWeightNum(activeRecord.rawMaterialWeightKg, 1)} kg
              </span>
            </div>

            {/* 7 KPI BOXES (Ordem solicitada: #1 Entrada, #2 Saída, #3 Rend. Desossa, #4 Sub Produtos, #5 Perda/Quebra, #6 Produtividade, #7 Margem) */}
            <div className="grid grid-cols-7 gap-1.5">
              {/* #1. PESO DE ENTRADA (Kg) */}
              <div className="p-1.5 rounded bg-slate-50 border border-slate-200 text-center flex flex-col justify-between h-[56px]">
                <span className="text-[9px] font-bold text-slate-600 uppercase tracking-tight block truncate h-3 leading-3" title="Peso de Entrada da Matéria-Prima (Carcaça)">
                  1. Entrada (Kg)
                </span>
                <span className="h-5 flex items-center justify-center text-[13px] font-black text-slate-900 font-mono tracking-tight leading-none truncate px-0.5">
                  {formatWeightNum(activeRecord.rawMaterialWeightKg, 0)} <span className="text-[8.5px] font-normal ml-0.5">kg</span>
                </span>
                <span className="text-[8.5px] text-slate-500 font-medium block truncate h-3 leading-3 font-mono">
                  {activeRecord.rawMaterialBoxes} {activeRecord.rawMaterialBoxes === 1 ? 'Carcaça' : 'Carcaças'}
                </span>
              </div>

              {/* #2. PESO DE SAÍDA (Kg) */}
              <div className="p-1.5 rounded bg-blue-50/70 border border-blue-200 text-center flex flex-col justify-between h-[56px]">
                <span className="text-[9px] font-bold text-blue-900 uppercase tracking-tight block truncate h-3 leading-3" title="Peso de Saída do Produto Acabado">
                  2. Saída (Kg)
                </span>
                <span className="h-5 flex items-center justify-center text-[13px] font-black text-blue-950 font-mono tracking-tight leading-none truncate px-0.5">
                  {formatWeightNum(activeRecord.finishedProductWeightKg, 0)} <span className="text-[8.5px] font-normal ml-0.5">kg</span>
                </span>
                <span className="h-3 block" aria-hidden="true" />
              </div>

              {/* #3. REND. DESOSSA (%) */}
              <div className="p-1.5 rounded bg-slate-50 border border-slate-200 text-center flex flex-col justify-between h-[56px]">
                <span className="text-[9px] font-bold text-slate-600 uppercase tracking-tight block truncate h-3 leading-3" title="Rendimento Líquido da Desossa">
                  3. Rend. Desossa
                </span>
                <span className="h-5 flex items-center justify-center text-[13px] font-black text-emerald-700 font-mono tracking-tight leading-none">
                  {formatPct(activeRecord.deboningYieldNetPct, 2)}
                </span>
                <span className="text-[8.5px] text-slate-500 font-medium block truncate h-3 leading-3 font-mono">
                  {activeRecord.hasPreDebonedInput
                    ? `Mista (-${formatKg(activeRecord.preDebonedInputKg || 0, 0)})`
                    : `${formatKg(activeRecord.saleableCutsWeightKg, 0)} carnes`}
                </span>
              </div>

              {/* #4. SUB PRODUTOS (%) com peso do Osso e Sebo na 2ª linha */}
              <div className="p-1.5 rounded bg-amber-50/70 border border-amber-200 text-center flex flex-col justify-between h-[56px]">
                <span className="text-[9px] font-bold text-amber-900 uppercase tracking-tight block truncate h-3 leading-3" title="Sub Produtos: Osso e Sebo">
                  4. Sub Produtos
                </span>
                <span className="h-5 flex items-center justify-center text-[13px] font-black text-amber-900 font-mono tracking-tight leading-none">
                  {formatPct(activeRecordNonSaleablePct, 2)}
                </span>
                <span className="text-[8.5px] text-amber-900 font-semibold block truncate h-3 leading-3 font-mono" title={`Osso: ${formatWeightNum(activeRecordBoneWeight, 1)} kg | Sebo: ${formatWeightNum(activeRecordFatWeight, 1)} kg`}>
                  {activeRecord.type === 'SUINO'
                    ? `Osso: ${formatWeightNum(activeRecordBoneWeight, 0)} kg`
                    : `Osso: ${formatWeightNum(activeRecordBoneWeight, 0)} kg • Sebo: ${formatWeightNum(activeRecordFatWeight, 0)} kg`}
                </span>
              </div>

              {/* #5. PERDA/QUEBRA */}
              <div className="p-1.5 rounded bg-slate-50 border border-slate-200 text-center flex flex-col justify-between h-[56px]">
                <span className="text-[9px] font-bold text-slate-600 uppercase tracking-tight block truncate h-3 leading-3" title="Perda / Quebra de Desossa">
                  5. Perda / Quebra
                </span>
                <span className={`h-5 flex items-center justify-center text-[13px] font-black font-mono tracking-tight leading-none ${activeRecord.lossPct <= 0.8 ? 'text-emerald-700' : 'text-rose-700'}`}>
                  {formatPct(activeRecord.lossPct, 3)}
                </span>
                <span className="text-[8.5px] text-slate-500 font-medium block truncate h-3 leading-3 font-mono">
                  Quebra: {formatKg(activeRecord.lossKg, 1)}
                </span>
              </div>

              {/* #6. PRODUTIVIDADE (Kg/p) */}
              <div className="p-1.5 rounded bg-slate-50 border border-slate-200 text-center flex flex-col justify-between h-[56px]">
                <span className="text-[9px] font-bold text-slate-600 uppercase tracking-tight block truncate h-3 leading-3">
                  6. Produtividade
                </span>
                <span className="h-5 flex items-center justify-center text-[13px] font-black text-blue-900 font-mono tracking-tight leading-none">
                  {activeRecord.productivityKgPerPerson.toFixed(1)} <span className="text-[8.5px] font-normal ml-0.5">kg/p</span>
                </span>
                <span className="text-[8.5px] text-slate-500 font-medium block truncate h-3 leading-3">
                  Equipe: {activeRecord.operatorCount} {activeRecord.operatorCount === 1 ? 'pessoa' : 'pessoas'}
                </span>
              </div>

              {/* #7. MARGEM DE LUCRO */}
              <div className={`p-1.5 rounded text-center flex flex-col justify-between h-[56px] ${
                activeRecordMarginPct >= 0
                  ? 'bg-emerald-50 border border-emerald-300'
                  : 'bg-rose-50 border border-rose-300'
              }`}>
                <span className={`text-[9px] font-bold uppercase tracking-tight block truncate h-3 leading-3 ${
                  activeRecordMarginPct >= 0 ? 'text-emerald-900' : 'text-rose-900'
                }`}>
                  7. Margem de Lucro
                </span>
                <span className={`h-5 flex items-center justify-center text-[13px] font-black font-mono tracking-tight leading-none ${
                  activeRecordMarginPct >= 0 ? 'text-emerald-800' : 'text-rose-600'
                }`}>
                  {formatPct(activeRecordMarginPct, 2)}
                </span>
                <span className={`text-[8.5px] font-bold block truncate h-3 leading-3 font-mono ${
                  activeRecordMarginPct >= 0 ? 'text-emerald-700' : 'text-rose-600'
                }`}>
                  {formatCurrency(activeRecordGrossProfit)}
                </span>
              </div>
            </div>
          </div>

          {/* MAIN 2-COLUMN SECTION: MASS BALANCE + CUTS PERFORMANCE & MARGIN TABLE */}
          <div className="grid grid-cols-12 gap-2.5 mb-1 flex-1">
            {/* Coluna 1: Balanço Físico de Massa (5 colunas de 12) */}
            <div className="col-span-5 border border-slate-200 rounded-lg p-2.5 flex flex-col justify-between bg-white">
              <div>
                <div className="flex items-center justify-between pb-1 mb-1.5 border-b border-slate-200">
                  <h3 className="text-[11px] font-black uppercase tracking-wider text-slate-900">
                    Balanço de Massa & Rendimentos
                  </h3>
                  <span className="text-[9px] font-bold text-slate-500">SisAtak RETQ010</span>
                </div>

                <div className="space-y-1 text-[11px]">
                  <div className="flex justify-between py-0.5 border-b border-slate-100">
                    <span className="font-semibold text-slate-700">Matéria-Prima (Carcaça):</span>
                    <span className="font-bold font-mono text-slate-900">
                      {formatWeightNum(activeRecord.rawMaterialWeightKg, 3)} kg ({activeRecord.rawMaterialBoxes} {activeRecord.rawMaterialBoxes === 1 ? 'Carcaça' : 'Carcaças'})
                    </span>
                  </div>

                  <div className="flex justify-between py-0.5 border-b border-slate-100 bg-amber-50/80 px-1 -mx-1 rounded">
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

                  <div className="flex justify-between py-0.5 border-b border-slate-100 text-slate-700">
                    <span className="font-medium">Subproduto Osso:</span>
                    <span className="font-mono font-bold text-slate-900">
                      {formatWeightNum(activeRecordBoneWeight, 3)} kg ({formatPct(activeRecordBonePct, 2)})
                    </span>
                  </div>

                  {activeRecord.type !== 'SUINO' ? (
                    <div className="flex justify-between py-0.5 border-b border-slate-100 text-slate-700">
                      <span className="font-medium">Subproduto Sebo:</span>
                      <span className="font-mono font-bold text-slate-900">
                        {formatWeightNum(activeRecordFatWeight, 3)} kg ({formatPct(activeRecordFatPct, 2)})
                      </span>
                    </div>
                  ) : (
                    <div className="flex justify-between py-0.5 border-b border-slate-100 text-slate-400">
                      <span className="font-medium">Subproduto Sebo:</span>
                      <span className="font-mono text-slate-400">Não aplicável (0,000 kg • 0,00%)</span>
                    </div>
                  )}
                </div>

                {/* Compact graphical representation */}
                <div className="mt-2 pt-1.5 border-t border-slate-200">
                  <div className="text-[9.5px] font-bold text-slate-600 uppercase mb-1">
                    Distribuição Proporcional da Carcaça
                  </div>
                  <div className="w-full h-3.5 bg-slate-100 rounded overflow-hidden flex text-[8px] font-bold text-white text-center leading-3.5">
                    <div
                      style={{ width: `${Math.round((activeRecord.saleableCutsWeightKg / activeRecord.rawMaterialWeightKg) * 100)}%` }}
                      className="bg-emerald-600 truncate px-1"
                      title="Cortes Vendáveis"
                    >
                      Cortes {Math.round((activeRecord.saleableCutsWeightKg / activeRecord.rawMaterialWeightKg) * 100)}%
                    </div>
                    <div
                      style={{ width: `${Math.round(activeRecordBonePct)}%` }}
                      className="bg-slate-400 truncate px-1"
                      title="Osso"
                    >
                      Osso {Math.round(activeRecordBonePct)}%
                    </div>
                    {activeRecord.type !== 'SUINO' && activeRecordFatPct > 0 && (
                      <div
                        style={{ width: `${Math.round(activeRecordFatPct * 2)}%` }}
                        className="bg-amber-500 truncate px-1"
                        title="Sebo"
                      >
                        Sebo {Math.round(activeRecordFatPct)}%
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Bloco de Eficiência Financeira da Desossa */}
              <div className="mt-2 p-2 bg-slate-50 border border-slate-200 rounded text-[11px] space-y-0.5">
                <div className="flex justify-between text-slate-700">
                  <span>Custo Total Carcaça:</span>
                  <span className="font-mono font-bold">{formatCurrency(activeRecord.totalCarcassCost)}</span>
                </div>
                <div className="flex justify-between text-slate-700">
                  <span>Faturamento dos Cortes:</span>
                  <span className="font-mono font-bold">{formatCurrency(totalOverallValue)}</span>
                </div>
                <div className={`flex justify-between font-bold border-t border-slate-200 pt-1 mt-1 ${
                  activeRecordGrossProfit >= 0 ? 'text-emerald-800' : 'text-rose-600'
                }`}>
                  <span>Margem Bruta Agregada:</span>
                  <span className="font-mono">{formatCurrency(activeRecordGrossProfit)} ({formatPct(activeRecordMarginPct, 2)})</span>
                </div>
              </div>
            </div>

            {/* Coluna 2: Tabela de Rendimento dos Cortes & Margem com OSSO e SEBO integrados */}
            <div className="col-span-7 border border-slate-200 rounded-lg p-2 flex flex-col justify-between bg-white">
              <div>
                <div className="flex items-center justify-between pb-1 mb-1 border-b border-slate-200">
                  <h3 className="text-[11px] font-black uppercase tracking-wider text-slate-900">
                    Rendimento dos Cortes & Margem ({activeRecord.type === 'DIANTEIRO' ? 'Dianteiro' : activeRecord.type === 'SUINO' ? 'Suíno' : 'Traseiro'})
                  </h3>
                  <span className="text-[9px] text-slate-600 font-bold bg-slate-100 px-1.5 py-0.5 rounded">
                    Rendimento Apurado vs Padrão Meta
                  </span>
                </div>

                <table className="w-full text-left text-[9.5px] border-collapse">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-300">
                      <th className="py-0.5 px-1">Descrição do Corte</th>
                      <th className="py-0.5 px-1 text-right">Peso (kg)</th>
                      <th className="py-0.5 px-1 text-right">Rend. Apurado</th>
                      <th className="py-0.5 px-1 text-right">Padrão Meta</th>
                      <th className="py-0.5 px-1 text-right">Desvio</th>
                      <th className="py-0.5 px-1 text-right">Preço (R$/kg)</th>
                      <th className="py-0.5 px-1 text-right">Valor Total (R$)</th>
                      <th className="py-0.5 px-1 text-right">Margem</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {displayedCuts.map((cut) => {
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
                          <td className="py-0.5 px-1 font-semibold text-slate-900 truncate max-w-[135px]" title={cut.name}>
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
                          <td className="py-0.5 px-1 text-right font-mono">
                            <span className={`font-bold ${cutMarginPct >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                              {cutMarginPct >= 0 ? '+' : ''}{formatPct(cutMarginPct, 1)}
                            </span>
                          </td>
                        </tr>
                      );
                    })}

                    {/* Linha consolidada dos demais cortes vendáveis se houver */}
                    {otherCuts.length > 0 && (
                      <tr className="hover:bg-slate-50 italic text-slate-700">
                        <td className="py-0.5 px-1 font-semibold truncate max-w-[135px]" title="Demais cortes vendáveis combinados">
                          Demais Cortes ({otherCuts.length} itens)
                        </td>
                        <td className="py-0.5 px-1 text-right font-mono">{formatWeightNum(otherCutsWeight, 1)}</td>
                        <td className="py-0.5 px-1 text-right font-mono font-bold text-slate-900">
                          {formatPct(otherCutsYieldPct, 2)}
                        </td>
                        <td className="py-0.5 px-1 text-right font-mono text-slate-400">-</td>
                        <td className="py-0.5 px-1 text-right font-mono text-slate-400">-</td>
                        <td className="py-0.5 px-1 text-right font-mono text-slate-600">
                          {formatCurrency(otherCutsUnitPrice)}
                        </td>
                        <td className="py-0.5 px-1 text-right font-mono font-bold text-slate-900">
                          {formatCurrency(otherCutsValue)}
                        </td>
                        <td className="py-0.5 px-1 text-right font-mono">
                          <span className={`font-bold ${otherCutsMarginPct >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                            {otherCutsMarginPct >= 0 ? '+' : ''}{formatPct(otherCutsMarginPct, 1)}
                          </span>
                        </td>
                      </tr>
                    )}

                    {/* LINHA COM INFORMAÇÕES DO OSSO (REQUISITO EXPLÍCITO DO USUÁRIO) */}
                    <tr className="bg-amber-50/50 hover:bg-amber-50/80 border-t border-amber-200">
                      <td className="py-0.5 px-1 font-bold text-amber-950 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-600 shrink-0" />
                        <span>Subproduto Osso</span>
                      </td>
                      <td className="py-0.5 px-1 text-right font-mono font-bold text-slate-900">{formatWeightNum(activeRecordBoneWeight, 1)}</td>
                      <td className="py-0.5 px-1 text-right font-mono font-bold text-amber-900">
                        {formatPct(activeRecordBonePct, 2)}
                      </td>
                      <td className="py-0.5 px-1 text-right font-mono text-slate-600">
                        {formatPct(boneExpectedYieldPct, 2)}
                      </td>
                      <td className="py-0.5 px-1 text-right font-mono font-bold">
                        <span className={boneDeviation >= 0 ? 'text-emerald-700' : 'text-rose-700'}>
                          {boneDeviation >= 0 ? '+' : ''}{boneDeviation.toFixed(2)}%
                        </span>
                      </td>
                      <td className="py-0.5 px-1 text-right font-mono text-slate-600">
                        {formatCurrency(boneUnitPrice)}
                      </td>
                      <td className="py-0.5 px-1 text-right font-mono font-bold text-slate-900">
                        {formatCurrency(boneValue)}
                      </td>
                      <td className="py-0.5 px-1 text-right font-mono">
                        <span className={`font-bold ${boneMarginPct >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                          {boneMarginPct >= 0 ? '+' : ''}{formatPct(boneMarginPct, 1)}
                        </span>
                      </td>
                    </tr>

                    {/* LINHA COM INFORMAÇÕES DO SEBO (REQUISITO EXPLÍCITO DO USUÁRIO) */}
                    <tr className="bg-amber-50/30 hover:bg-amber-50/60 border-t border-amber-100">
                      <td className="py-0.5 px-1 font-bold text-amber-950 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                        <span>Subproduto Sebo</span>
                      </td>
                      <td className="py-0.5 px-1 text-right font-mono font-bold text-slate-900">
                        {activeRecord.type === 'SUINO' ? '0,0' : formatWeightNum(activeRecordFatWeight, 1)}
                      </td>
                      <td className="py-0.5 px-1 text-right font-mono font-bold text-amber-900">
                        {activeRecord.type === 'SUINO' ? '0,00%' : formatPct(activeRecordFatPct, 2)}
                      </td>
                      <td className="py-0.5 px-1 text-right font-mono text-slate-600">
                        {activeRecord.type === 'SUINO' ? '-' : formatPct(fatExpectedYieldPct, 2)}
                      </td>
                      <td className="py-0.5 px-1 text-right font-mono font-bold">
                        {activeRecord.type === 'SUINO' ? (
                          <span className="text-slate-400">-</span>
                        ) : (
                          <span className={fatDeviation >= 0 ? 'text-emerald-700' : 'text-rose-700'}>
                            {fatDeviation >= 0 ? '+' : ''}{fatDeviation.toFixed(2)}%
                          </span>
                        )}
                      </td>
                      <td className="py-0.5 px-1 text-right font-mono text-slate-600">
                        {activeRecord.type === 'SUINO' ? '-' : formatCurrency(fatUnitPrice)}
                      </td>
                      <td className="py-0.5 px-1 text-right font-mono font-bold text-slate-900">
                        {activeRecord.type === 'SUINO' ? 'R$ 0,00' : formatCurrency(fatValue)}
                      </td>
                      <td className="py-0.5 px-1 text-right font-mono">
                        {activeRecord.type === 'SUINO' ? (
                          <span className="text-slate-400">-</span>
                        ) : (
                          <span className={`font-bold ${fatMarginPct >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                            {fatMarginPct >= 0 ? '+' : ''}{formatPct(fatMarginPct, 1)}
                          </span>
                        )}
                      </td>
                    </tr>
                  </tbody>

                  <tfoot>
                    {/* Subtotal Cortes Vendáveis */}
                    <tr className="bg-slate-50 font-bold text-slate-800 border-t border-slate-300 text-[9.5px]">
                      <td className="py-0.5 px-1 uppercase">Subtotal Cortes Vendáveis</td>
                      <td className="py-0.5 px-1 text-right font-mono">{formatWeightNum(totalSaleableWeight, 1)}</td>
                      <td className="py-0.5 px-1 text-right font-mono text-emerald-800">
                        {formatPct(totalSaleableYieldPct, 2)}
                      </td>
                      <td className="py-0.5 px-1 text-right font-mono text-slate-400">-</td>
                      <td className="py-0.5 px-1 text-right font-mono text-slate-400">-</td>
                      <td className="py-0.5 px-1 text-right font-mono text-slate-700">
                        {formatCurrency(totalSaleableWeight > 0 ? totalSaleableCutsValue / totalSaleableWeight : 0)}
                      </td>
                      <td className="py-0.5 px-1 text-right font-mono font-bold text-slate-900">
                        {formatCurrency(totalSaleableCutsValue)}
                      </td>
                      <td className={`py-0.5 px-1 text-right font-mono font-bold ${
                        totalSaleableMarginPct >= 0 ? 'text-emerald-800' : 'text-rose-600'
                      }`}>
                        {totalSaleableMarginPct >= 0 ? '+' : ''}{formatPct(totalSaleableMarginPct, 2)}
                      </td>
                    </tr>

                    {/* TOTAL GERAL CONSIDERANDO CORTES + OSSO + SEBO NAS SOMAS E MARGEM */}
                    <tr className="bg-slate-100 font-black text-slate-900 border-t-2 border-slate-400 text-[9.5px]">
                      <td className="py-1 px-1 uppercase tracking-wide">TOTAL GERAL (PRODUTO ACABADO)</td>
                      <td className="py-1 px-1 text-right font-mono text-blue-950 font-black">{formatWeightNum(totalOverallWeight, 1)}</td>
                      <td className="py-1 px-1 text-right font-mono text-emerald-900 font-black">
                        {formatPct(totalOverallYieldPct, 2)}
                      </td>
                      <td className="py-1 px-1 text-right font-mono text-slate-400">-</td>
                      <td className="py-1 px-1 text-right font-mono text-slate-400">-</td>
                      <td className="py-1 px-1 text-right font-mono text-slate-800 font-bold">
                        {formatCurrency(totalOverallUnitPrice)}
                      </td>
                      <td className="py-1 px-1 text-right font-mono text-slate-950 font-black">
                        {formatCurrency(totalOverallValue)}
                      </td>
                      <td className={`py-1 px-1 text-right font-mono font-black ${
                        activeRecordMarginPct >= 0 ? 'text-emerald-800' : 'text-rose-600'
                      }`}>
                        {activeRecordMarginPct >= 0 ? '+' : ''}{formatPct(activeRecordMarginPct, 2)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Subprodutos e Margem Agregada */}
              <div className="mt-1 pt-1 border-t border-slate-200 text-[9px] flex justify-between text-slate-600 font-medium">
                <span>
                  Subprodutos: Osso ({formatKg(activeRecordBoneWeight, 1)})
                  {activeRecord.type !== 'SUINO' && ` • Sebo (${formatKg(activeRecordFatWeight, 1)})`}
                </span>
                <span className="font-bold text-slate-800">
                  Faturamento Total PA: {formatCurrency(totalOverallValue)} | Margem da Desossa: <span className={`${activeRecordMarginPct >= 0 ? 'text-emerald-800' : 'text-rose-600'} font-black`}>{formatPct(activeRecordMarginPct, 2)}</span> ({formatCurrency(activeRecordGrossProfit)})
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
