import React, { useRef, useState } from 'react';
import {
  Printer,
  Download,
  FileSpreadsheet,
  Building2,
  Calendar,
  CalendarRange,
  Layers,
  Scale,
  Users,
  AlertTriangle,
  CheckCircle2,
  DollarSign,
  TrendingUp,
  Beef,
  Crown,
  Ham,
  Bone,
  Flame,
  ArrowUpRight,
  ArrowDownRight,
  Filter,
  FileEdit,
  Trash2,
  HardDrive,
  FileText
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { CutItem, ProductionRecord } from '../types';
import {
  formatCurrency,
  formatKg,
  formatPct,
  formatWeightNum,
  getUnitNoun,
  getRawMaterialUnitTitle,
  cleanRawMaterialName,
  calculateEffectiveTotalWorkforce,
  calculateEffectiveDailyWorkforce,
} from '../utils/calculations';
import { exportMasterDatabaseToExcel } from '../utils/excelDatabase';
import { findBenchmarkForCut } from '../utils/benchmarkMatcher';
import { EditRecordModal } from './EditRecordModal';
import { DeleteRecordModal } from './DeleteRecordModal';

interface OnePageReportProps {
  selectedRecordId?: string | null;
  onNavigateToCortesReport?: () => void;
}

export const OnePageReport: React.FC<OnePageReportProps> = ({
  selectedRecordId,
  onNavigateToCortesReport,
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
  
  // Mode: Lote Individual vs Consolidado Bovino (DT + TR + CT)
  const [reportMode, setReportMode] = useState<'INDIVIDUAL' | 'CONSOLIDADO'>('INDIVIDUAL');

  // Filter Mode in Consolidated view: Data Única vs Por Período
  const [dateFilterMode, setDateFilterMode] = useState<'SINGLE' | 'PERIOD'>('SINGLE');

  const availableDates = React.useMemo(() => {
    return Array.from(new Set(records.map((r) => r.date))).sort().reverse();
  }, [records]);

  const [selectedDate, setSelectedDate] = useState<string>(() => {
    return filters.date || (records[0]?.date) || '';
  });

  const [startDate, setStartDate] = useState<string>(() => {
    if (filters.startDate) return filters.startDate;
    const sorted = records.map((r) => r.date).sort();
    return sorted[0] || '';
  });

  const [endDate, setEndDate] = useState<string>(() => {
    if (filters.endDate) return filters.endDate;
    const sorted = records.map((r) => r.date).sort();
    return sorted[sorted.length - 1] || '';
  });

  // Choose record to display for individual mode: either selected, or first filtered, or first overall
  const [activeRecordId, setActiveRecordId] = useState<string>(
    selectedRecordId || filteredRecords[0]?.id || records[0]?.id || ''
  );

  // Managerial Type Filter for Individual One Page Report (DT vs TR vs CT vs SU vs ALL)
  const [reportTypeFilter, setReportTypeFilter] = useState<'ALL' | 'DIANTEIRO' | 'TRASEIRO' | 'COSTELA' | 'SUINO'>(() => {
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

  // Filtered records list for lot selection dropdown (Individual Mode)
  const availableRecords = React.useMemo(() => {
    if (reportTypeFilter === 'ALL') return records;
    return records.filter((r) => r.type === reportTypeFilter);
  }, [records, reportTypeFilter]);

  // Consolidated Bovino Data (DT + TR + CT strictly excluding SUINO)
  const consolidatedBovineData = React.useMemo(() => {
    if (reportMode !== 'CONSOLIDADO') return null;

    const matching = records.filter((r) => {
      // Exclui suíno rigorosamente do consolidado bovino
      if (r.type === 'SUINO') return false;

      if (dateFilterMode === 'SINGLE') {
        return r.date === selectedDate;
      } else {
        if (startDate && r.date < startDate) return false;
        if (endDate && r.date > endDate) return false;
        return true;
      }
    });

    if (matching.length === 0) return null;

    const rawMaterialWeightKg = matching.reduce((sum, r) => sum + r.rawMaterialWeightKg, 0);
    const finishedProductWeightKg = matching.reduce((sum, r) => sum + r.finishedProductWeightKg, 0);
    const saleableCutsWeightKg = matching.reduce((sum, r) => sum + r.saleableCutsWeightKg, 0);
    const rawMaterialBoxes = matching.reduce((sum, r) => sum + (r.rawMaterialBoxes || 0), 0);
    const boneWeightKg = matching.reduce((sum, r) => sum + (r.boneWeightKg || 0), 0);
    const fatWeightKg = matching.reduce((sum, r) => sum + (r.fatWeightKg || 0), 0);
    const lossKg = matching.reduce((sum, r) => sum + r.lossKg, 0);
    const finishedProductTotalValue = matching.reduce((sum, r) => sum + r.finishedProductTotalValue, 0);
    const totalCarcassCost = matching.reduce((sum, r) => sum + r.totalCarcassCost, 0);
    const grossProfitValue = finishedProductTotalValue - totalCarcassCost;
    const carcassCostPerKg = rawMaterialWeightKg > 0 ? totalCarcassCost / rawMaterialWeightKg : 0;
    const lossPct = rawMaterialWeightKg > 0 ? (lossKg / rawMaterialWeightKg) * 100 : 0;
    const totalYieldPct = rawMaterialWeightKg > 0 ? (finishedProductWeightKg / rawMaterialWeightKg) * 100 : 0;
    const deboningYieldNetPct = rawMaterialWeightKg > 0 ? (saleableCutsWeightKg / rawMaterialWeightKg) * 100 : 0;
    const profitMarginPct = finishedProductTotalValue > 0 ? (grossProfitValue / finishedProductTotalValue) * 100 : 0;

    // Consolidação de equipe conforme regra de máximo 2 linhas físicas (50 pessoas máx por dia)
    const operatorCount = calculateEffectiveTotalWorkforce(matching);
    const productivityKgPerPerson = operatorCount > 0 ? rawMaterialWeightKg / operatorCount : 0;

    // Consolidação de cortes (somando pesos e valores de cortes com mesmo nome/código)
    const cutMap: Record<string, CutItem> = {};
    matching.forEach((r) => {
      r.cuts.forEach((c) => {
        const cleanKey = c.name.trim().toUpperCase();
        if (!cutMap[cleanKey]) {
          cutMap[cleanKey] = {
            ...c,
            id: `cons-${c.code}-${cleanKey}`,
            weightKg: 0,
            boxesCount: 0,
            totalPrice: 0,
            yieldActualPct: 0,
          };
        }
        cutMap[cleanKey].weightKg += c.weightKg;
        cutMap[cleanKey].boxesCount = (cutMap[cleanKey].boxesCount || 0) + (c.boxesCount || 0);
        cutMap[cleanKey].totalPrice += c.totalPrice;
      });
    });

    const cuts = Object.values(cutMap).map((c) => {
      const yieldActualPct = rawMaterialWeightKg > 0 ? (c.weightKg / rawMaterialWeightKg) * 100 : 0;
      const unitPrice = c.weightKg > 0 ? c.totalPrice / c.weightKg : c.unitPrice;
      return {
        ...c,
        yieldActualPct,
        unitPrice,
      };
    });

    const displayDate = dateFilterMode === 'SINGLE'
      ? (selectedDate ? selectedDate.split('-').reverse().join('/') : '')
      : `${startDate.split('-').reverse().join('/')} a ${endDate.split('-').reverse().join('/')}`;

    const rec: ProductionRecord = {
      id: 'consolidado-bovino-opr',
      date: dateFilterMode === 'SINGLE' ? selectedDate : `${startDate}_${endDate}`,
      periodStart: startDate || selectedDate,
      periodEnd: endDate || selectedDate,
      companyName: 'BH FOODS COMERCIO E INDUSTRIA LTDA',
      finishedProductBoxes: matching.reduce((sum, r) => sum + (r.finishedProductBoxes || 0), 0),
      shift: 'Turno 1',
      type: 'DIANTEIRO', // Tipo interno para compatibilidade
      rawMaterialCode: '1110000',
      rawMaterialDesc: 'CONSOLIDADO GERAL BOVINO (DT + TR + CT)',
      rawMaterialWeightKg,
      rawMaterialBoxes,
      rawMaterialAvgWeightKg: rawMaterialBoxes > 0 ? rawMaterialWeightKg / rawMaterialBoxes : 0,
      carcassCostPerKg,
      totalCarcassCost,
      finishedProductWeightKg,
      finishedProductTotalValue,
      saleableCutsWeightKg,
      boneWeightKg,
      fatWeightKg,
      nonSaleableWeightKg: boneWeightKg + fatWeightKg,
      lossKg,
      lossPct,
      deboningYieldNetPct,
      totalYieldPct,
      nonSaleablePct: rawMaterialWeightKg > 0 ? ((boneWeightKg + fatWeightKg) / rawMaterialWeightKg) * 100 : 0,
      bonePct: rawMaterialWeightKg > 0 ? (boneWeightKg / rawMaterialWeightKg) * 100 : 0,
      fatPct: rawMaterialWeightKg > 0 ? (fatWeightKg / rawMaterialWeightKg) * 100 : 0,
      grossProfitValue,
      profitMarginPct,
      operatorCount,
      productivityKgPerPerson,
      responsibleOperator: 'Líder Peu (Linha 1) / Líder Vinicius (Linha 2)',
      emissionTime: new Date().toLocaleDateString('pt-BR') + ' ' + new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      preDebonedInputKg: 0,
      deboningEffectiveMeatKg: saleableCutsWeightKg,
      cuts,
    };

    return { rec, matchingCount: matching.length, displayDate };
  }, [reportMode, records, dateFilterMode, selectedDate, startDate, endDate]);

  const activeRecord = reportMode === 'CONSOLIDADO'
    ? (consolidatedBovineData?.rec || records[0])
    : (records.find((r) => r.id === activeRecordId) || availableRecords[0] || records[0]);

  // Handle line type filter change (DT vs TR vs CT vs SU vs ALL)
  const handleFilterTypeChange = (type: 'ALL' | 'DIANTEIRO' | 'TRASEIRO' | 'COSTELA' | 'SUINO') => {
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

  // Find complementary parallel record on the same date (Individual Mode only)
  const parallelRecordsSameDate = React.useMemo(() => {
    if (reportMode === 'CONSOLIDADO' || !activeRecord) return [];
    return records.filter((r) => r.date === activeRecord.date && r.id !== activeRecord.id);
  }, [records, activeRecord, reportMode]);

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
    const headers = ['Codigo', 'Corte', 'Peso_KG', 'Caixas', 'Rend_Apurado_Pct', 'Preco_Unit_R$', 'Total_R$'];
    const rows = activeRecord.cuts.map((c) => [
      `"${c.code}"`,
      `"${c.name}"`,
      c.weightKg.toFixed(3),
      c.boxesCount,
      c.yieldActualPct.toFixed(2),
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
        // REGRA OFICIAL SOLICITADA PELA DIRETORIA:
        // Considerar como OSSO na soma do subproduto Osso SOMENTE os registros no relatório ATAK que tenham o código/prefixo X-MP.
        // Produtos vendáveis feitos de osso (ex: "CXGG - OSSO PATINHO BOV CONG") NÃO possuem o código X-MP
        // e portanto NÃO são subprodutos (devem ser tratados como produtos vendáveis normais).
        const hasXMP = /^X-MP/i.test(c.name) || /X-MP/i.test(c.code);
        const isBoneSubproduct = hasXMP && /OSSO/i.test(c.name) && !/S\/\s*OSSO|SEM\s*OSSO/i.test(c.name);
        const isFat = activeRecord.type !== 'SUINO' && (/SEBO/i.test(c.name) || c.category === 'SUBPRODUTO_SEBO');

        if (isBoneSubproduct || isFat) return false;
        if (!hasXMP && /OSSO/i.test(c.name) && !isFat) {
          // É produto de osso vendável comercializável (ex: CXGG - OSSO PATINHO BOV CONG)
          return true;
        }
        if (c.category === 'SUBPRODUTO_OSSO' || c.category === 'SUBPRODUTO_SEBO' || c.isNonSaleable) {
          return false;
        }
        return true;
      })
      .sort((a, b) => {
        // ORDENAÇÃO POR DESCRIÇÃO DO CORTE EM ORDEM ALFABÉTICA (conforme solicitação explícita):
        // Remove prefixos como CXGG -, MP -, W-MP - para ordenar pelo nome real do corte (Alcatra, Contra Filé, etc.),
        // facilitando a localização e agrupando todos os cortes similares na conferência diária.
        const cleanNameA = a.name.replace(/^(CXGG - |MP - |W-MP - |X-MP - )/i, '').trim();
        const cleanNameB = b.name.replace(/^(CXGG - |MP - |W-MP - |X-MP - )/i, '').trim();
        return cleanNameA.localeCompare(cleanNameB, 'pt-BR', { sensitivity: 'base' });
      });
  }, [activeRecord]);

  // Diretoria: APRESENTAR TODOS OS CORTES DE FORMA SEPARADA (Sem "Demais Cortes")
  const displayedCuts = saleableCuts;

  // 2. Subproduto Osso (somente os registros no relatório ATAK que tenham o código X-MP)
  const boneCutsList = React.useMemo(() => {
    if (!activeRecord || !activeRecord.cuts) return [];
    return activeRecord.cuts.filter((c) => {
      if (/S\/\s*OSSO|SEM\s*OSSO/i.test(c.name)) return false;
      const hasXMP = /^X-MP/i.test(c.name) || /X-MP/i.test(c.code);
      // REGRA: Considerar como OSSO na soma do subproduto Osso SOMENTE os registros com o código X-MP
      return hasXMP && /OSSO/i.test(c.name);
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

  // 4. Totais dos Cortes Vendáveis (Subtotal)
  const totalSaleableCutsValue = React.useMemo(() => {
    return saleableCuts.reduce((acc, c) => acc + c.totalPrice, 0);
  }, [saleableCuts]);

  const totalSaleableWeight = React.useMemo(() => {
    if (saleableCuts.length > 0) {
      return saleableCuts.reduce((acc, c) => acc + c.weightKg, 0);
    }
    return activeRecord.saleableCutsWeightKg;
  }, [saleableCuts, activeRecord.saleableCutsWeightKg]);

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

  const unitNounLower = getUnitNoun(activeRecord.type, activeRecord.rawMaterialBoxes);
  const unitNounPluralUpper = getUnitNoun(activeRecord.type, 2, true);
  const unitNounSingular = activeRecord.type === 'SUINO' ? 'carcaça' : 'peça';
  const rawMaterialUnitTitle = getRawMaterialUnitTitle(activeRecord.type);
  const avgWeight = activeRecord.rawMaterialBoxes > 0
    ? activeRecord.rawMaterialWeightKg / activeRecord.rawMaterialBoxes
    : (activeRecord.rawMaterialAvgWeightKg || 0);

  // Allow table to flow naturally across pages when cut count is high
  const isLargeBatch = false;

  return (
    <div className="space-y-4 pb-12 print:p-0 print:m-0 print:space-y-0 print:pb-0">
      {/* Top action bar (Hidden when printing) */}
      <div className="print:hidden flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-rose-900 text-white flex items-center justify-center shadow-xs">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">
              One Page Report Gerencial (A4 Retrato)
            </h2>
            <p className="text-xs text-slate-500">
              Padrão executivo oficial com todos os cortes discriminados individualmente em formato A4 Retrato
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Seletor Principal de Modo: Lote Individual vs Consolidado Bovino */}
          <div className="inline-flex rounded-lg p-1 bg-slate-100 border border-slate-200 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setReportMode('INDIVIDUAL')}
              className={`px-3 py-1.5 rounded-md transition-all flex items-center gap-1.5 cursor-pointer ${
                reportMode === 'INDIVIDUAL'
                  ? 'bg-slate-900 text-white shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              Lote Individual
            </button>
            <button
              type="button"
              onClick={() => setReportMode('CONSOLIDADO')}
              className={`px-3 py-1.5 rounded-md transition-all flex items-center gap-1.5 cursor-pointer ${
                reportMode === 'CONSOLIDADO'
                  ? 'bg-rose-900 text-white shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              Consolidado (DT + TR + CT)
            </button>
          </div>

          {/* Controles para MODO CONSOLIDADO (Data Única vs Por Período) */}
          {reportMode === 'CONSOLIDADO' ? (
            <div className="flex items-center gap-2 flex-wrap">
              <div className="inline-flex rounded-lg p-1 bg-rose-50 border border-rose-200 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setDateFilterMode('SINGLE')}
                  className={`px-2.5 py-1 rounded-md transition-all flex items-center gap-1 cursor-pointer ${
                    dateFilterMode === 'SINGLE'
                      ? 'bg-rose-900 text-white shadow-xs font-bold'
                      : 'text-rose-900 hover:bg-rose-100'
                  }`}
                >
                  <Calendar className="w-3 h-3" />
                  Data Única
                </button>
                <button
                  type="button"
                  onClick={() => setDateFilterMode('PERIOD')}
                  className={`px-2.5 py-1 rounded-md transition-all flex items-center gap-1 cursor-pointer ${
                    dateFilterMode === 'PERIOD'
                      ? 'bg-rose-900 text-white shadow-xs font-bold'
                      : 'text-rose-900 hover:bg-rose-100'
                  }`}
                >
                  <CalendarRange className="w-3 h-3" />
                  Por Período
                </button>
              </div>

              {dateFilterMode === 'SINGLE' ? (
                <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs">
                  <span className="font-bold text-slate-600">Data:</span>
                  <select
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="bg-transparent font-bold text-slate-800 focus:outline-none cursor-pointer"
                  >
                    {availableDates.map((d) => (
                      <option key={d} value={d}>
                        {d.split('-').reverse().join('/')}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="flex items-center gap-2 bg-rose-50/70 border border-rose-200 rounded-lg px-2.5 py-1 text-xs">
                  <span className="text-rose-900 font-bold">De:</span>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="bg-white border border-slate-300 rounded px-1.5 py-0.5 text-slate-900 font-bold text-xs"
                  />
                  <span className="text-rose-900 font-bold">Até:</span>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="bg-white border border-slate-300 rounded px-1.5 py-0.5 text-slate-900 font-bold text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const sorted = availableDates.slice().sort();
                      setStartDate(sorted[0] || '');
                      setEndDate(sorted[sorted.length - 1] || '');
                    }}
                    className="px-2 py-0.5 bg-rose-900 hover:bg-rose-800 text-white font-semibold rounded text-[11px] transition-colors"
                  >
                    Todo o Período
                  </button>
                </div>
              )}

              <span className="px-2 py-1 rounded bg-slate-100 border border-slate-200 text-slate-700 text-xs font-bold">
                {consolidatedBovineData?.matchingCount || 0} lote(s) bovino(s)
              </span>
            </div>
          ) : (
            /* Controles para MODO LOTE INDIVIDUAL */
            <div className="flex items-center gap-2 flex-wrap">
              {/* Seletor de Linha de Processamento: DT vs TR vs CT vs SU vs Todos */}
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs font-semibold">
                <span className="text-[10px] uppercase font-bold text-slate-500 px-1 flex items-center gap-1">
                  <Layers className="w-3.5 h-3.5 text-rose-800" />
                  Linha:
                </span>
                <button
                  type="button"
                  id="btn-report-filter-all"
                  onClick={() => handleFilterTypeChange('ALL')}
                  className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
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
                  className={`px-2.5 py-1 rounded-md transition-all flex items-center gap-1 cursor-pointer ${
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
                  className={`px-2.5 py-1 rounded-md transition-all flex items-center gap-1 cursor-pointer ${
                    reportTypeFilter === 'TRASEIRO'
                      ? 'bg-rose-800 text-white shadow-xs font-bold'
                      : 'text-slate-700 hover:text-rose-800'
                  }`}
                >
                  <Crown className="w-3.5 h-3.5" />
                  Traseiro (TR)
                  <span className={`text-[10px] px-1 rounded-full font-mono ${reportTypeFilter === 'TRASEIRO' ? 'bg-rose-950 text-white' : 'bg-rose-100 text-rose-900'}`}>
                    {records.filter(r => r.type === 'TRASEIRO').length}
                  </span>
                </button>
                <button
                  type="button"
                  id="btn-report-filter-ct"
                  onClick={() => handleFilterTypeChange('COSTELA')}
                  className={`px-2.5 py-1 rounded-md transition-all flex items-center gap-1 cursor-pointer ${
                    reportTypeFilter === 'COSTELA'
                      ? 'bg-orange-600 text-white shadow-xs font-bold'
                      : 'text-slate-700 hover:text-orange-800'
                  }`}
                >
                  <Bone className="w-3.5 h-3.5" />
                  Costela (CT)
                  <span className={`text-[10px] px-1 rounded-full font-mono ${reportTypeFilter === 'COSTELA' ? 'bg-orange-950 text-white' : 'bg-orange-100 text-orange-900'}`}>
                    {records.filter(r => r.type === 'COSTELA').length}
                  </span>
                </button>
                <button
                  type="button"
                  id="btn-report-filter-su"
                  onClick={() => handleFilterTypeChange('SUINO')}
                  className={`px-2.5 py-1 rounded-md transition-all flex items-center gap-1 cursor-pointer ${
                    reportTypeFilter === 'SUINO'
                      ? 'bg-emerald-700 text-white shadow-xs font-bold'
                      : 'text-slate-700 hover:text-emerald-800'
                  }`}
                >
                  <Ham className="w-3.5 h-3.5" />
                  Suíno (SU)
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
                      {r.date.split('-').reverse().join('/')} - {r.type === 'DIANTEIRO' ? 'DT' : r.type === 'SUINO' ? 'SU' : r.type === 'COSTELA' ? 'CT' : 'TR'} ({r.shift} • {formatKg(r.rawMaterialWeightKg, 0)})
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
                    className="px-2.5 py-1.5 hover:bg-amber-100 text-amber-900 rounded-md text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                    title="Corrigir parâmetros operacionais deste lote (Líder, Operadores, Custo da matéria-prima)"
                  >
                    <FileEdit className="w-3.5 h-3.5" />
                    <span>Corrigir</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsDeleting(true)}
                    className="px-2.5 py-1.5 hover:bg-rose-100 text-rose-800 rounded-md text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                    title="Excluir este relatório caso tenha sido importado incorretamente"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Excluir</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Segundo Botão: One Page Report Cortes (Consolidado por Tipo) */}
          {onNavigateToCortesReport && (
            <button
              type="button"
              onClick={onNavigateToCortesReport}
              className="px-3 py-1.5 bg-blue-800 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
              title="Abrir o novo One Page Report Cortes (Análise consolidada por tipos de cortes vs padrão de mercado)"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>One Page Report Cortes</span>
            </button>
          )}

          {/* Buttons: Print & Export */}
          <button
            type="button"
            onClick={handlePrint}
            className="px-3 py-1.5 bg-rose-900 hover:bg-rose-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
            title="Imprimir ou Salvar como PDF em Formato A4 Retrato"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Imprimir A4 Retrato</span>
          </button>

          <button
            type="button"
            onClick={handleExportExcel}
            className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
            title="Baixar planilha Excel com todos os cortes e balanço de massa"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Excel</span>
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

      {/* Parallel records notification on same date */}
      {parallelRecordsSameDate.length > 0 && (
        <div className="print:hidden p-2.5 bg-amber-50 border border-amber-200 text-amber-900 rounded-xl text-xs font-semibold flex flex-wrap items-center justify-between gap-2 shadow-2xs">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            <span>
              <strong>Mesmo Dia ({activeRecord.date.split('-').reverse().join('/')}):</strong> Outros lotes processados nesta data:{' '}
              {parallelRecordsSameDate.map((p) => `${p.type} (${formatKg(p.rawMaterialWeightKg, 0)})`).join(', ')}.
            </span>
          </div>
          <div className="flex items-center gap-1">
            {parallelRecordsSameDate.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => {
                  setActiveRecordId(p.id);
                  setReportTypeFilter(p.type);
                }}
                className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold transition-all shadow-2xs flex items-center gap-1 cursor-pointer"
              >
                <span>Ver {p.type === 'DIANTEIRO' ? 'Dianteiro (DT)' : p.type === 'TRASEIRO' ? 'Traseiro (TR)' : p.type === 'COSTELA' ? 'Costela (CT)' : 'Suíno (SU)'}</span>
                <ArrowUpRight className="w-3 h-3" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 
        A4 PORTRAIT PAGE CONTAINER 
        Calibrated with exact portrait proportions and printable height
      */}
      <div className="flex justify-center overflow-x-auto p-0 sm:p-2 bg-white rounded-xl print:p-0 print:m-0 print:bg-white print-page-wrapper">
        <div
          id="one-page-report-canvas"
          className="one-page-report-sheet bg-white text-slate-900 border border-slate-400 print:border print:border-slate-500 rounded-sm print:rounded-none mx-auto p-3.5 sm:p-4 print:p-2.5 flex flex-col justify-between"
          style={{
            width: '100%',
            maxWidth: '850px',
            minHeight: 'auto',
          }}
        >
          {/* 1. HEADER INSTITUCIONAL A4 RETRATO */}
          <div className="border-b-2 border-slate-900 pb-1 mb-1.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded bg-slate-900 text-white flex items-center justify-center font-black text-xs shadow-2xs">
                  BH
                </div>
                <div>
                  <h1 className="text-xs font-black tracking-tight text-slate-900 uppercase leading-tight">
                    BH FOODS COMÉRCIO E INDÚSTRIA LTDA
                  </h1>
                  <p className="text-[9.5px] font-bold text-rose-800 tracking-wider uppercase leading-tight">
                    RELATÓRIO GERENCIAL DE PERFORMANCE - SETOR DE DESOSSA (ONE PAGE REPORT)
                  </p>
                </div>
              </div>

              {/* Tag com código do sistema e emissão */}
              <div className="text-right text-[9px] text-slate-600 space-y-0.5 font-mono">
                <div><strong>SisAtak RETQ010</strong> • Empresa: 021 • Lista: 101</div>
                <div>Emissão: {activeRecord.emissionTime || '26/08/2026 14:09 h'} • Pág. 0001/0001</div>
              </div>
            </div>

            {/* Context metadata ribbon com altura aumentada e fontes ampliadas */}
            <div className="mt-2 pt-2 border-t border-slate-300 grid grid-cols-2 sm:grid-cols-5 gap-2.5 sm:gap-3 text-xs bg-slate-50/80 print:bg-white border border-slate-300 p-2.5 sm:p-3 rounded-lg min-h-[64px] items-center">
              <div>
                <span className="text-slate-600 block text-[11px] uppercase font-bold tracking-wide">Data Operação:</span>
                <span className="font-black text-slate-950 text-sm sm:text-[15px] tracking-tight block">
                  {reportMode === 'CONSOLIDADO'
                    ? (consolidatedBovineData?.displayDate || activeRecord.date)
                    : activeRecord.date.split('-').reverse().join('/')}
                </span>
              </div>
              <div>
                <span className="text-slate-600 block text-[11px] uppercase font-bold tracking-wide">Linha de Desossa:</span>
                {reportMode === 'CONSOLIDADO' ? (
                  <span className="inline-flex items-center gap-1.5 font-black uppercase text-xs px-2.5 py-1 rounded border bg-blue-100 text-blue-950 border-blue-300">
                    <Layers className="w-3.5 h-3.5 text-blue-900" />
                    Consolidado (DT+TR+CT)
                  </span>
                ) : (
                  <span className={`inline-flex items-center gap-1.5 font-black uppercase text-xs px-2.5 py-1 rounded border ${
                    activeRecord.type === 'DIANTEIRO'
                      ? 'bg-amber-100 text-amber-900 border-amber-300'
                      : activeRecord.type === 'SUINO'
                      ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                      : activeRecord.type === 'COSTELA'
                      ? 'bg-orange-100 text-orange-900 border-orange-300'
                      : 'bg-rose-100 text-rose-900 border-rose-300'
                  }`}>
                    {activeRecord.type === 'DIANTEIRO' && <Beef className="w-3.5 h-3.5" />}
                    {activeRecord.type === 'TRASEIRO' && <Crown className="w-3.5 h-3.5" />}
                    {activeRecord.type === 'COSTELA' && <Bone className="w-3.5 h-3.5" />}
                    {activeRecord.type === 'SUINO' && <Ham className="w-3.5 h-3.5" />}
                    {activeRecord.type === 'DIANTEIRO'
                      ? 'Dianteiro (DT)'
                      : activeRecord.type === 'SUINO'
                      ? 'Suíno (SU)'
                      : activeRecord.type === 'COSTELA'
                      ? 'Costela (CT)'
                      : 'Traseiro (TR)'}
                  </span>
                )}
              </div>
              <div>
                <span className="text-slate-600 block text-[11px] uppercase font-bold tracking-wide">Turno / Equipe:</span>
                <span className="font-bold text-slate-900 text-sm sm:text-[14px] block truncate">
                  {reportMode === 'CONSOLIDADO'
                    ? (dateFilterMode === 'SINGLE' ? 'Consolidado Diário' : 'Consolidado Período')
                    : activeRecord.shift} ({activeRecord.operatorCount} pess.{reportMode === 'CONSOLIDADO' ? ' máx 2 lin.' : ''})
                </span>
              </div>
              <div>
                <span className="text-slate-600 block text-[11px] uppercase font-bold tracking-wide">Líder / Responsável:</span>
                <span className="font-bold text-slate-900 text-sm sm:text-[14px] block truncate">{activeRecord.responsibleOperator}</span>
              </div>
              <div>
                <span className="text-slate-600 block text-[11px] uppercase font-bold tracking-wide">
                  Custo Base {activeRecord.type === 'SUINO' ? 'Carcaça' : 'Peça'}:
                </span>
                <span className="font-black text-slate-950 text-sm sm:text-[15px] font-mono block">
                  {formatCurrency(activeRecord.carcassCostPerKg)}/kg
                  {reportMode === 'CONSOLIDADO' ? ' (médio)' : ''}
                </span>
              </div>
            </div>
          </div>

          {/* 2. INDICADORES DA OPERAÇÃO DO DIA / LOTE ATIVO */}
          <div className="mb-2.5">
            <div className="flex flex-wrap items-center justify-between gap-1 mb-1.5">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-xs sm:text-[13px] font-black uppercase text-slate-900 tracking-wider flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-700" />
                  Indicadores da Operação • {reportMode === 'CONSOLIDADO' ? (consolidatedBovineData?.displayDate || 'Consolidado') : activeRecord.date.split('-').reverse().join('/')}
                </span>
                <span className="text-[10.5px] font-black uppercase px-2 py-0.5 rounded bg-rose-100 text-rose-900 border border-rose-200 tracking-wide font-mono">
                  {cleanRawMaterialName(activeRecord.rawMaterialDesc) || (
                    activeRecord.type === 'SUINO'
                      ? '1/2 CARCAÇA SUÍNA MATRIZ'
                      : activeRecord.type === 'COSTELA'
                      ? 'COSTELA BOVINA C/ OSSO'
                      : activeRecord.type === 'TRASEIRO'
                      ? 'TRASEIRO BOVINO C/ OSSO'
                      : 'DIANTEIRO BOVINO C/ OSSO'
                  )}
                </span>
              </div>
              <span className="text-[11px] font-bold text-slate-600 font-mono">
                {activeRecord.shift} • {activeRecord.type === 'SUINO' ? 'Carcaça' : 'Peça'}: {formatWeightNum(activeRecord.rawMaterialWeightKg, 1)} kg
              </span>
            </div>

            {/* 8 KPI BOXES (Divididos em 2 linhas de 4 boxes para permitir fontes bem maiores) */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-2.5 mb-2">
              {/* #1. ENTRADA (KG) */}
              <div className="p-2.5 rounded-md bg-white border border-slate-300 text-center flex flex-col justify-between min-h-[72px] sm:min-h-[76px] shadow-2xs">
                <span className="text-[11px] sm:text-xs font-bold text-slate-700 uppercase tracking-tight block truncate" title={`Peso de Entrada da Matéria-Prima (${unitNounPluralUpper})`}>
                  1. Entrada (Kg)
                </span>
                <span className="text-lg sm:text-xl font-black text-slate-950 font-mono tracking-tight leading-tight">
                  {formatWeightNum(activeRecord.rawMaterialWeightKg, 0)} <span className="text-xs font-normal text-slate-500">kg</span>
                </span>
                <span className="text-[10px] text-slate-500 font-medium block truncate font-mono">
                  Matéria-Prima Bruta
                </span>
              </div>

              {/* #2. QTD PEÇAS (ou QTD CARCAÇAS) */}
              <div className="p-2.5 rounded-md bg-amber-50/50 print:bg-white border border-amber-200 print:border-slate-300 text-center flex flex-col justify-between min-h-[72px] sm:min-h-[76px] shadow-2xs">
                <span className="text-[11px] sm:text-xs font-bold text-amber-950 uppercase tracking-tight block truncate" title={`Quantidade de ${unitNounPluralUpper} e Peso Médio`}>
                  {activeRecord.type === 'SUINO' ? '2. Qtd Carcaças' : '2. Qtd Peças'}
                </span>
                <span className="text-lg sm:text-xl font-black text-amber-950 font-mono tracking-tight leading-tight">
                  {activeRecord.rawMaterialBoxes} <span className="text-xs font-normal text-amber-800">{unitNounLower}</span>
                </span>
                <span className="text-[10px] text-amber-900 font-medium block truncate font-mono">
                  Méd: {formatWeightNum(avgWeight, 1)} kg/{unitNounSingular}
                </span>
              </div>

              {/* #3. SAÍDA (KG) */}
              <div className="p-2.5 rounded-md bg-blue-50/50 print:bg-white border border-blue-200 print:border-slate-300 text-center flex flex-col justify-between min-h-[72px] sm:min-h-[76px] shadow-2xs">
                <span className="text-[11px] sm:text-xs font-bold text-blue-900 uppercase tracking-tight block truncate" title="Peso de Saída do Produto Acabado Total">
                  3. Saída (Kg)
                </span>
                <span className="text-lg sm:text-xl font-black text-blue-950 font-mono tracking-tight leading-tight">
                  {formatWeightNum(activeRecord.finishedProductWeightKg, 0)} <span className="text-xs font-normal text-blue-600">kg</span>
                </span>
                <span className="text-[10px] text-blue-700 font-medium block truncate font-mono">
                  Produto Acabado Total
                </span>
              </div>

              {/* #4. REND. DESOSSA (%) */}
              <div className="p-2.5 rounded-md bg-emerald-50/40 print:bg-white border border-emerald-200 print:border-slate-300 text-center flex flex-col justify-between min-h-[72px] sm:min-h-[76px] shadow-2xs">
                <span className="text-[11px] sm:text-xs font-bold text-emerald-900 uppercase tracking-tight block truncate" title="Rendimento Líquido de Cortes Vendáveis">
                  4. Rend. Desossa (%)
                </span>
                <span className="text-lg sm:text-xl font-black text-emerald-700 font-mono tracking-tight leading-tight">
                  {formatPct(activeRecord.rawMaterialWeightKg > 0 ? (totalSaleableWeight / activeRecord.rawMaterialWeightKg) * 100 : activeRecord.deboningYieldNetPct, 2)}
                </span>
                <span className="text-[10px] text-slate-500 font-medium block truncate font-mono">
                  {formatKg(totalSaleableWeight, 0)} carnes vendáveis
                </span>
              </div>

              {/* #5. SUBPRODUTOS (%) */}
              <div className="p-2.5 rounded-md bg-amber-50/40 print:bg-white border border-amber-200 print:border-slate-300 text-center flex flex-col justify-between min-h-[72px] sm:min-h-[76px] shadow-2xs">
                <span className="text-[11px] sm:text-xs font-bold text-amber-900 uppercase tracking-tight block truncate" title="Subprodutos: Osso e Sebo">
                  5. Subprodutos
                </span>
                <span className="text-lg sm:text-xl font-black text-amber-900 font-mono tracking-tight leading-tight">
                  {formatPct(activeRecordNonSaleablePct, 2)}
                </span>
                <span className="text-[10px] text-amber-900 font-bold block truncate font-mono" title={`Osso: ${formatWeightNum(activeRecordBoneWeight, 1)} kg | Sebo: ${formatWeightNum(activeRecordFatWeight, 1)} kg`}>
                  {activeRecord.type === 'SUINO'
                    ? `Osso: ${formatWeightNum(activeRecordBoneWeight, 0)} kg`
                    : `Osso: ${formatWeightNum(activeRecordBoneWeight, 0)}k • Sebo: ${formatWeightNum(activeRecordFatWeight, 0)}k`}
                </span>
              </div>

              {/* #6. PERDA/QUEBRA */}
              <div className="p-2.5 rounded-md bg-white border border-slate-300 text-center flex flex-col justify-between min-h-[72px] sm:min-h-[76px] shadow-2xs">
                <span className="text-[11px] sm:text-xs font-bold text-slate-700 uppercase tracking-tight block truncate" title="Perda / Quebra de Desossa">
                  6. Perda/Quebra
                </span>
                <span className={`text-lg sm:text-xl font-black font-mono tracking-tight leading-tight ${activeRecord.lossPct <= 0.8 ? 'text-emerald-700' : 'text-rose-700'}`}>
                  {formatPct(activeRecord.lossPct, 3)}
                </span>
                <span className="text-[10px] text-slate-500 font-medium block truncate font-mono">
                  Quebra: {formatKg(activeRecord.lossKg, 1)}
                </span>
              </div>

              {/* #7. PRODUTIVIDADE */}
              <div className="p-2.5 rounded-md bg-white border border-slate-300 text-center flex flex-col justify-between min-h-[72px] sm:min-h-[76px] shadow-2xs">
                <span className="text-[11px] sm:text-xs font-bold text-slate-700 uppercase tracking-tight block truncate" title="Produtividade Média por Operador">
                  7. Produtividade
                </span>
                <span className="text-lg sm:text-xl font-black text-blue-900 font-mono tracking-tight leading-tight">
                  {activeRecord.productivityKgPerPerson.toFixed(1)} <span className="text-xs font-normal text-slate-500">kg/p</span>
                </span>
                <span className="text-[10px] text-slate-500 font-medium block truncate">
                  Equipe: {activeRecord.operatorCount} pess.{reportMode === 'CONSOLIDADO' ? ' (máx 2 lin.)' : ''}
                </span>
              </div>

              {/* #8. MARGEM DE LUCRO */}
              <div className={`p-2.5 rounded-md text-center flex flex-col justify-between min-h-[72px] sm:min-h-[76px] shadow-2xs ${
                activeRecordMarginPct >= 0
                  ? 'bg-emerald-50/60 print:bg-white border border-emerald-300 print:border-slate-300'
                  : 'bg-rose-50/60 print:bg-white border border-rose-300 print:border-slate-300'
              }`}>
                <span className={`text-[11px] sm:text-xs font-bold uppercase tracking-tight block truncate ${
                  activeRecordMarginPct >= 0 ? 'text-emerald-900' : 'text-rose-900'
                }`}>
                  8. Margem de Lucro
                </span>
                <span className={`text-lg sm:text-xl font-black font-mono tracking-tight leading-tight ${
                  activeRecordMarginPct >= 0 ? 'text-emerald-800' : 'text-rose-600'
                }`}>
                  {formatPct(activeRecordMarginPct, 2)}
                </span>
                <span className={`text-[10px] font-bold block truncate font-mono ${
                  activeRecordMarginPct >= 0 ? 'text-emerald-700' : 'text-rose-600'
                }`}>
                  {formatCurrency(activeRecordGrossProfit)}
                </span>
              </div>
            </div>
          </div>

          {/* 3. BALANÇO DE MASSA & COMPOSIÇÃO (Cada um em linha separada ocupando toda a largura) */}
          <div className="flex flex-col gap-2.5 mb-2.5">
            {/* Bloco 1: Balanço Físico de Massa */}
            <div className="border border-slate-300 rounded-lg p-3 bg-white shadow-2xs">
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-200">
                <span className="text-xs sm:text-sm font-black uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                  <Scale className="w-4 h-4 text-slate-700" />
                  Balanço Físico de Massa
                </span>
                <span className="text-[10.5px] font-bold text-slate-500 font-mono">SisAtak RETQ010</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                <div className="flex flex-col justify-between p-2.5 rounded bg-slate-50 border border-slate-200">
                  <span className="font-bold text-slate-600 text-[11px] uppercase">
                    Matéria-Prima ({activeRecord.type === 'SUINO' ? 'Carcaça' : 'Peça'}):
                  </span>
                  <span className="font-black font-mono text-slate-900 text-sm sm:text-base mt-0.5">
                    {formatWeightNum(activeRecord.rawMaterialWeightKg, 1)} kg
                  </span>
                </div>
                <div className="flex flex-col justify-between p-2.5 rounded bg-amber-50/80 border border-amber-200">
                  <span className="font-bold text-amber-950 text-[11px] uppercase">
                    PESO MÉDIO ({rawMaterialUnitTitle}):
                  </span>
                  <span className="font-black font-mono text-amber-900 text-sm sm:text-base mt-0.5">
                    {formatWeightNum(avgWeight, 2)} kg
                  </span>
                </div>
                <div className="flex flex-col justify-between p-2.5 rounded bg-slate-50 border border-slate-200">
                  <span className="font-bold text-slate-600 text-[11px] uppercase">
                    Produto Acabado Total:
                  </span>
                  <span className="font-black font-mono text-slate-900 text-sm sm:text-base mt-0.5">
                    {formatWeightNum(activeRecord.finishedProductWeightKg, 1)} kg{' '}
                    <span className="text-xs font-bold text-slate-600">({formatPct(activeRecord.totalYieldPct, 2)})</span>
                  </span>
                </div>
                <div className="flex flex-col justify-between p-2.5 rounded bg-rose-50/70 border border-rose-200 text-rose-900">
                  <span className="font-bold text-[11px] uppercase">
                    Quebra / Perda Física:
                  </span>
                  <span className="font-black font-mono text-sm sm:text-base mt-0.5">
                    {formatWeightNum(activeRecord.lossKg, 1)} kg{' '}
                    <span className="text-xs font-bold">({formatPct(activeRecord.lossPct, 3)})</span>
                  </span>
                </div>
              </div>
            </div>

            {/* Bloco 2: Composição & Eficiência da Desossa */}
            <div className="border border-slate-300 rounded-lg p-3 bg-white shadow-2xs">
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-200">
                <span className="text-xs sm:text-sm font-black uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                  <TrendingUp className="w-4 h-4 text-emerald-700" />
                  Composição & Eficiência da Desossa
                </span>
                <span className="text-[11px] font-bold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded font-mono border border-emerald-200">
                  Margem Consolidada: {formatPct(activeRecordMarginPct, 2)}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                <div className="flex flex-col justify-between p-2.5 rounded bg-emerald-50/70 border border-emerald-200 text-emerald-950">
                  <span className="font-bold text-[11px] uppercase">Cortes Vendáveis Líquidos:</span>
                  <span className="font-black font-mono text-emerald-900 text-sm sm:text-base mt-0.5">
                    {formatWeightNum(totalSaleableWeight, 1)} kg{' '}
                    <span className="text-xs font-bold">({formatPct(activeRecord.rawMaterialWeightKg > 0 ? (totalSaleableWeight / activeRecord.rawMaterialWeightKg) * 100 : 0, 2)})</span>
                  </span>
                </div>
                <div className="flex flex-col justify-between p-2.5 rounded bg-slate-50 border border-slate-200">
                  <span className="font-bold text-slate-600 text-[11px] uppercase">
                    Custo Total {activeRecord.type === 'SUINO' ? 'Carcaça' : 'Peça'}:
                  </span>
                  <span className="font-mono font-black text-slate-900 text-sm sm:text-base mt-0.5">
                    {formatCurrency(activeRecord.totalCarcassCost)}
                  </span>
                </div>
                <div className="flex flex-col justify-between p-2.5 rounded bg-amber-50/70 border border-amber-200 text-amber-950">
                  <span className="font-bold text-[11px] uppercase">
                    Subprodutos (Osso {activeRecord.type !== 'SUINO' ? '+ Sebo' : ''}):
                  </span>
                  <span className="font-mono font-black text-amber-900 text-sm sm:text-base mt-0.5">
                    {formatWeightNum(activeRecordNonSaleableWeight, 1)} kg{' '}
                    <span className="text-xs font-bold">({formatPct(activeRecordNonSaleablePct, 2)})</span>
                  </span>
                </div>
                <div className="flex flex-col justify-between p-2.5 rounded bg-emerald-50/70 border border-emerald-200 text-emerald-950 font-bold">
                  <span className="text-[11px] uppercase text-emerald-900">Faturamento PA Total:</span>
                  <span className="font-mono font-black text-emerald-950 text-sm sm:text-base mt-0.5">
                    {formatCurrency(totalOverallValue)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* 4. TABELA INTEGRAL DE RENDIMENTO DOS CORTES (Formato A4 Retrato, com fontes ampliadas e quebra de página livre) */}
          <div className="border border-slate-300 rounded-lg p-2.5 bg-white flex-1 flex flex-col justify-between shadow-2xs">
            <div>
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-200">
                <div className="flex items-center gap-2">
                  <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider text-slate-900">
                    Rendimento dos Cortes ({reportMode === 'CONSOLIDADO' ? 'Consolidado Bovino DT + TR + CT' : activeRecord.type === 'DIANTEIRO' ? 'Dianteiro' : activeRecord.type === 'SUINO' ? 'Suíno' : activeRecord.type === 'COSTELA' ? 'Costela' : 'Traseiro'})
                  </h3>
                  <span className="text-[11px] text-slate-500 font-bold">
                    • {displayedCuts.length} cortes discriminados
                  </span>
                </div>
                <span className="text-[10px] text-slate-600 font-bold bg-slate-100 px-2 py-0.5 rounded font-mono border border-slate-200">
                  SisAtak RETQ010
                </span>
              </div>

              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100 print:bg-slate-50 text-slate-800 font-black border-b-2 border-slate-300 text-xs uppercase tracking-wide">
                    <th className="py-2 px-3">Descrição do Corte</th>
                    <th className="py-2 px-2.5 text-right">Peso (kg)</th>
                    <th className="py-2 px-2.5 text-right">Rend. Apurado (%)</th>
                    <th className="py-2 px-2.5 text-right">Preço (R$/kg)</th>
                    <th className="py-2 px-3 text-right">Valor Total (R$)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-150">
                  {displayedCuts.map((cut) => {
                    const unitPrice = cut.unitPrice || (cut.weightKg > 0 ? cut.totalPrice / cut.weightKg : 0);
                    return (
                      <tr key={cut.id} className="hover:bg-slate-50 leading-normal">
                        <td className="py-2 px-3 font-semibold text-slate-900 text-xs sm:text-[13px] truncate max-w-[320px]" title={cut.name}>
                          {cut.name.replace(/^(CXGG - |MP - |W-MP - |X-MP - )/, '')}
                        </td>
                        <td className="py-2 px-2.5 text-right font-mono text-xs sm:text-[13px] text-slate-800 font-medium">
                          {formatWeightNum(cut.weightKg, 1)}
                        </td>
                        <td className="py-2 px-2.5 text-right font-mono font-black text-slate-900 text-xs sm:text-[13px]">
                          {formatPct(cut.yieldActualPct, 2)}
                        </td>
                        <td className="py-2 px-2.5 text-right font-mono text-slate-600 text-xs sm:text-[13px]">
                          {formatCurrency(unitPrice)}
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-black text-slate-900 text-xs sm:text-[13px]">
                          {formatCurrency(cut.totalPrice)}
                        </td>
                      </tr>
                    );
                  })}

                  {/* LINHA COM INFORMAÇÕES DO OSSO (REQUISITO EXPLÍCITO) */}
                  <tr className="bg-amber-50/60 print:bg-white hover:bg-amber-50/80 border-t border-amber-200 print:border-slate-300 leading-normal">
                    <td className="py-2 px-3 font-bold text-amber-950 flex items-center gap-1.5 text-xs sm:text-[13px]">
                      <span className="w-2 h-2 rounded-full bg-amber-600 shrink-0 print:border print:border-amber-700" />
                      <span>Subproduto Osso</span>
                    </td>
                    <td className="py-2 px-2.5 text-right font-mono font-black text-slate-900 text-xs sm:text-[13px]">
                      {formatWeightNum(activeRecordBoneWeight, 1)}
                    </td>
                    <td className="py-2 px-2.5 text-right font-mono font-black text-amber-900 text-xs sm:text-[13px]">
                      {formatPct(activeRecordBonePct, 2)}
                    </td>
                    <td className="py-2 px-2.5 text-right font-mono text-slate-600 text-xs sm:text-[13px]">
                      {formatCurrency(boneUnitPrice)}
                    </td>
                    <td className="py-2 px-3 text-right font-mono font-black text-slate-900 text-xs sm:text-[13px]">
                      {formatCurrency(boneValue)}
                    </td>
                  </tr>

                  {/* LINHA COM INFORMAÇÕES DO SEBO (REQUISITO EXPLÍCITO) */}
                  {activeRecord.type !== 'SUINO' && (
                    <tr className="bg-amber-50/40 print:bg-white hover:bg-amber-50/70 border-t border-amber-100 print:border-slate-300 leading-normal">
                      <td className="py-2 px-3 font-bold text-amber-950 flex items-center gap-1.5 text-xs sm:text-[13px]">
                        <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0 print:border print:border-amber-600" />
                        <span>Subproduto Sebo</span>
                      </td>
                      <td className="py-2 px-2.5 text-right font-mono font-black text-slate-900 text-xs sm:text-[13px]">
                        {formatWeightNum(activeRecordFatWeight, 1)}
                      </td>
                      <td className="py-2 px-2.5 text-right font-mono font-black text-amber-900 text-xs sm:text-[13px]">
                        {formatPct(activeRecordFatPct, 2)}
                      </td>
                      <td className="py-2 px-2.5 text-right font-mono text-slate-600 text-xs sm:text-[13px]">
                        {formatCurrency(fatUnitPrice)}
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-black text-slate-900 text-xs sm:text-[13px]">
                        {formatCurrency(fatValue)}
                      </td>
                    </tr>
                  )}
                </tbody>

                <tfoot>
                  {/* Subtotal Cortes Vendáveis */}
                  <tr className="bg-white font-bold text-slate-800 border-t-2 border-slate-300 text-xs sm:text-[13px]">
                    <td className="py-2 px-3 uppercase tracking-wide">Subtotal Cortes Vendáveis</td>
                    <td className="py-2 px-2.5 text-right font-mono font-black">{formatWeightNum(totalSaleableWeight, 1)}</td>
                    <td className="py-2 px-2.5 text-right font-mono font-black text-emerald-800">
                      {formatPct(totalSaleableYieldPct, 2)}
                    </td>
                    <td className="py-2 px-2.5 text-right font-mono text-slate-700">
                      {formatCurrency(totalSaleableWeight > 0 ? totalSaleableCutsValue / totalSaleableWeight : 0)}
                    </td>
                    <td className="py-2 px-3 text-right font-mono font-black text-slate-900">
                      {formatCurrency(totalSaleableCutsValue)}
                    </td>
                  </tr>

                  {/* TOTAL GERAL CONSIDERANDO CORTES + OSSO + SEBO NAS SOMAS */}
                  <tr className="bg-slate-100 print:bg-white font-black text-slate-900 border-t-2 border-slate-900 text-xs sm:text-sm">
                    <td className="py-2.5 px-3 uppercase tracking-wide">TOTAL GERAL (PRODUTO ACABADO)</td>
                    <td className="py-2.5 px-2.5 text-right font-mono text-blue-950 font-black">{formatWeightNum(totalOverallWeight, 1)}</td>
                    <td className="py-2.5 px-2.5 text-right font-mono text-emerald-900 font-black">
                      {formatPct(totalOverallYieldPct, 2)}
                    </td>
                    <td className="py-2.5 px-2.5 text-right font-mono text-slate-800 font-bold">
                      {formatCurrency(totalOverallUnitPrice)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-slate-950 font-black">
                      {formatCurrency(totalOverallValue)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Subprodutos e Margem Agregada Consolidada */}
            <div className="mt-2.5 pt-2 border-t border-slate-300 text-xs flex justify-between items-center text-slate-700 font-medium">
              <span>
                Subprodutos: Osso ({formatKg(activeRecordBoneWeight, 1)})
                {activeRecord.type !== 'SUINO' && ` • Sebo (${formatKg(activeRecordFatWeight, 1)})`}
              </span>
              <span className="font-bold text-slate-900">
                Faturamento PA: {formatCurrency(totalOverallValue)} | Margem Consolidada da Desossa:{' '}
                <span className={`${activeRecordMarginPct >= 0 ? 'text-emerald-800' : 'text-rose-600'} font-black text-xs sm:text-sm`}>
                  {formatPct(activeRecordMarginPct, 2)}
                </span>{' '}
                ({formatCurrency(activeRecordGrossProfit)})
              </span>
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
