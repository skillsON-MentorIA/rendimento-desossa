import React, { useState } from 'react';
import {
  Printer,
  Download,
  FileSpreadsheet,
  Layers,
  ArrowUpRight,
  TrendingUp,
  Beef,
  Crown,
  Ham,
  Bone,
  CheckCircle2,
  FileText,
  Filter,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { CutItem, ProductionRecord } from '../types';
import {
  formatKg,
  formatPct,
  formatWeightNum,
  getUnitNoun,
  getRawMaterialUnitTitle,
  cleanRawMaterialName,
} from '../utils/calculations';
import {
  STANDARDS_DIANTEIRO,
  STANDARDS_TRASEIRO,
  STANDARDS_SUINO,
  STANDARDS_COSTELA,
  matchGroupDianteiro,
  matchGroupTraseiro,
  matchGroupSuino,
  matchGroupCostela,
} from '../utils/cutGrouping';
import * as XLSX from 'xlsx';

interface OnePageReportCortesProps {
  selectedRecordId?: string | null;
  onNavigateToGeneralReport?: () => void;
}

export interface ConsolidatedCutFamily {
  name: string;
  standardPct: number;
  totalWeightKg: number;
  yieldActualPct: number;
  deviationPct: number;
  cuts: CutItem[];
  isSubProduct: boolean;
}

export const OnePageReportCortes: React.FC<OnePageReportCortesProps> = ({
  selectedRecordId,
  onNavigateToGeneralReport,
}) => {
  const { records } = useApp();

  const [activeRecordId, setActiveRecordId] = useState<string>(
    () => selectedRecordId || (records.length > 0 ? records[0].id : '')
  );

  const [reportTypeFilter, setReportTypeFilter] = useState<string>('ALL');
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  // Sync with selectedRecordId when changed from parent
  React.useEffect(() => {
    if (selectedRecordId) {
      setActiveRecordId(selectedRecordId);
    }
  }, [selectedRecordId]);

  const activeRecord = React.useMemo(() => {
    return records.find((r) => r.id === activeRecordId) || records[0];
  }, [records, activeRecordId]);

  const availableRecords = React.useMemo(() => {
    if (reportTypeFilter === 'ALL') return records;
    return records.filter((r) => r.type === reportTypeFilter);
  }, [records, reportTypeFilter]);

  const handleFilterTypeChange = (type: string) => {
    setReportTypeFilter(type);
    if (type === 'ALL') return;

    const sameDateRecord = records.find(
      (r) => r.type === type && activeRecord && r.date === activeRecord.date
    );
    if (sameDateRecord) {
      setActiveRecordId(sameDateRecord.id);
      return;
    }

    const firstOfType = records.find((r) => r.type === type);
    if (firstOfType) {
      setActiveRecordId(firstOfType.id);
    }
  };

  const parallelRecordsSameDate = React.useMemo(() => {
    if (!activeRecord) return [];
    return records.filter((r) => r.date === activeRecord.date && r.id !== activeRecord.id);
  }, [records, activeRecord]);

  const handlePrint = () => {
    window.print();
  };

  // Consolidação dos Tipos de Cortes na Desossa
  const consolidatedFamilies = React.useMemo(() => {
    if (!activeRecord || !activeRecord.cuts) return [];

    const isSuino = activeRecord.type === 'SUINO';
    const isDianteiro = activeRecord.type === 'DIANTEIRO';
    const isCostela = activeRecord.type === 'COSTELA';

    const standards = isDianteiro
      ? STANDARDS_DIANTEIRO
      : isSuino
      ? STANDARDS_SUINO
      : isCostela
      ? STANDARDS_COSTELA
      : STANDARDS_TRASEIRO;

    const matchFn = isDianteiro
      ? matchGroupDianteiro
      : isSuino
      ? matchGroupSuino
      : isCostela
      ? matchGroupCostela
      : matchGroupTraseiro;

    const familyMap: Record<string, { std: number; cuts: CutItem[]; isSubProduct: boolean }> = {};

    // Inicializar famílias oficiais com seus padrões
    standards.forEach((std) => {
      const isSubProduct = isSuino
        ? std.name === 'Osso'
        : std.name === 'Osso' || std.name === 'Sebo';
      familyMap[std.name] = {
        std: std.standardPct,
        cuts: [],
        isSubProduct,
      };
    });

    // Mapear cada corte individual da desossa para sua respectiva família consolidada
    activeRecord.cuts.forEach((cut) => {
      const isSemOsso = /S\/\s*OSSO|SEM\s*OSSO/i.test(cut.name);
      const hasXMP = /^X-MP/i.test(cut.name) || /X-MP/i.test(cut.code);

      // REGRA OFICIAL ATAK: Somente registros com código X-MP são considerados Subproduto Osso
      if (hasXMP && /OSSO/i.test(cut.name) && !isSemOsso) {
        if (familyMap['Osso']) {
          familyMap['Osso'].cuts.push(cut);
          return;
        }
      }

      // Subproduto Sebo (apenas bovino)
      if (!isSuino && (/SEBO/i.test(cut.name) || cut.category === 'SUBPRODUTO_SEBO')) {
        if (familyMap['Sebo']) {
          familyMap['Sebo'].cuts.push(cut);
          return;
        }
      }

      // Cortes vendáveis (inclusive produtos de osso vendáveis como CXGG - OSSO PATINHO)
      const groupName = matchFn(cut);
      if (familyMap[groupName]) {
        familyMap[groupName].cuts.push(cut);
      } else {
        // Fallback seguro em Recorte
        if (familyMap['Recorte']) {
          familyMap['Recorte'].cuts.push(cut);
        } else {
          // Caso a tabela não tenha Recorte explícito
          familyMap[groupName] = {
            std: 0,
            cuts: [cut],
            isSubProduct: false,
          };
        }
      }
    });

    const totalMP = activeRecord.rawMaterialWeightKg || 1;

    // Converter para array mantendo a ordem oficial dos padrões
    const result: ConsolidatedCutFamily[] = standards
      .filter((std) => !std.name.includes('Osso') && !std.name.includes('Sebo'))
      .map((std) => {
        const entry = familyMap[std.name] || { std: std.standardPct, cuts: [], isSubProduct: false };
        const totalWeightKg = entry.cuts.reduce((acc, c) => acc + c.weightKg, 0);
        const yieldActualPct = (totalWeightKg / totalMP) * 100;
        const deviationPct = yieldActualPct - entry.std;

        return {
          name: std.name,
          standardPct: entry.std,
          totalWeightKg,
          yieldActualPct,
          deviationPct,
          cuts: entry.cuts,
          isSubProduct: false,
        };
      });

    return result;
  }, [activeRecord]);

  // Subprodutos isolados
  const boneCuts = React.useMemo(() => {
    if (!activeRecord || !activeRecord.cuts) return [];
    return activeRecord.cuts.filter((c) => {
      if (/S\/\s*OSSO|SEM\s*OSSO/i.test(c.name)) return false;
      const hasXMP = /^X-MP/i.test(c.name) || /X-MP/i.test(c.code);
      return hasXMP && /OSSO/i.test(c.name);
    });
  }, [activeRecord]);

  const fatCuts = React.useMemo(() => {
    if (!activeRecord || !activeRecord.cuts || activeRecord.type === 'SUINO') return [];
    return activeRecord.cuts.filter(
      (c) => c.category === 'SUBPRODUTO_SEBO' || /SEBO/i.test(c.name)
    );
  }, [activeRecord]);

  const rawMaterialWeight = activeRecord?.rawMaterialWeightKg || 0;

  // Totais consolidados de carnes vendáveis
  const totalSaleableWeight = React.useMemo(() => {
    return consolidatedFamilies.reduce((acc, f) => acc + f.totalWeightKg, 0);
  }, [consolidatedFamilies]);

  const totalSaleableYieldPct =
    rawMaterialWeight > 0 ? (totalSaleableWeight / rawMaterialWeight) * 100 : 0;

  const totalSaleableStandardPct = React.useMemo(() => {
    return consolidatedFamilies.reduce((acc, f) => acc + f.standardPct, 0);
  }, [consolidatedFamilies]);

  const totalSaleableDeviationPct = totalSaleableYieldPct - totalSaleableStandardPct;

  // Subproduto Osso
  const boneWeightKg = React.useMemo(() => {
    if (boneCuts.length > 0) {
      return boneCuts.reduce((acc, c) => acc + c.weightKg, 0);
    }
    return activeRecord?.boneWeightKg || 0;
  }, [boneCuts, activeRecord?.boneWeightKg]);

  const boneYieldPct = rawMaterialWeight > 0 ? (boneWeightKg / rawMaterialWeight) * 100 : 0;
  const boneStandardPct =
    activeRecord?.type === 'DIANTEIRO'
      ? 21.5
      : activeRecord?.type === 'SUINO'
      ? 3.5
      : activeRecord?.type === 'COSTELA'
      ? 29.0
      : 21.0;
  const boneDeviationPct = boneYieldPct - boneStandardPct;

  // Subproduto Sebo
  const fatWeightKg = React.useMemo(() => {
    if (activeRecord?.type === 'SUINO') return 0;
    if (fatCuts.length > 0) {
      return fatCuts.reduce((acc, c) => acc + c.weightKg, 0);
    }
    return activeRecord?.fatWeightKg || 0;
  }, [fatCuts, activeRecord?.fatWeightKg, activeRecord?.type]);

  const fatYieldPct = rawMaterialWeight > 0 ? (fatWeightKg / rawMaterialWeight) * 100 : 0;
  const fatStandardPct =
    activeRecord?.type === 'SUINO'
      ? 0
      : activeRecord?.type === 'DIANTEIRO'
      ? 0.8
      : activeRecord?.type === 'COSTELA'
      ? 3.0
      : 1.0;
  const fatDeviationPct = fatYieldPct - fatStandardPct;

  // Total Produto Acabado
  const totalFinishedWeight = totalSaleableWeight + boneWeightKg + fatWeightKg;
  const totalFinishedYieldPct =
    rawMaterialWeight > 0 ? (totalFinishedWeight / rawMaterialWeight) * 100 : 0;

  // Perda / Quebra
  const lossKg = activeRecord?.lossKg || Math.max(0, rawMaterialWeight - totalFinishedWeight);
  const lossPct =
    rawMaterialWeight > 0
      ? (lossKg / rawMaterialWeight) * 100
      : activeRecord?.lossPct || 0;

  const unitNounLower = getUnitNoun(activeRecord?.type, activeRecord?.rawMaterialBoxes);
  const unitNounPluralUpper = getUnitNoun(activeRecord?.type, 2, true);
  const rawMaterialUnitTitle = getRawMaterialUnitTitle(activeRecord?.type);

  // Exportação Excel Consolidada (Sem valores financeiros)
  const handleExportExcelCortes = () => {
    if (!activeRecord) return;
    try {
      const wb = XLSX.utils.book_new();

      const summaryRows = [
        ['EMPRESA', 'BH FOODS COMERCIO E INDUSTRIA LTDA'],
        ['RELATÓRIO', 'ONE PAGE REPORT CORTES - CONSOLIDAÇÃO POR TIPO DE CORTE'],
        ['DATA DA OPERAÇÃO', activeRecord.date.split('-').reverse().join('/')],
        ['LINHA DE DESOSSA', activeRecord.type],
        ['TURNO', activeRecord.shift],
        ['LÍDER DA DESOSSA', activeRecord.responsibleOperator],
        ['ENTRADA MATÉRIA-PRIMA (KG)', activeRecord.rawMaterialWeightKg],
        ['TOTAL PEÇAS/CARCAÇAS', activeRecord.rawMaterialBoxes],
        ['PESO MÉDIO PEÇA (KG)', activeRecord.rawMaterialBoxes > 0 ? activeRecord.rawMaterialWeightKg / activeRecord.rawMaterialBoxes : 0],
        ['PRODUTIVIDADE (KG/PESSOA)', activeRecord.productivityKgPerPerson],
        ['', ''],
      ];

      const headerRow = [
        'Tipo de Corte / Família',
        'Cortes SisAtak Consolidados',
        'Qtd Cortes',
        'Peso Consolidado (Kg)',
        'Rend. Apurado (% MP)',
        'Padrão Mercado (% MP)',
        'Desvio (pp)',
      ];

      const dataRows = consolidatedFamilies.map((fam) => [
        fam.name,
        fam.cuts.map((c) => c.name.replace(/^(CXGG - |MP - |W-MP - |X-MP - )/i, '')).join(', '),
        fam.cuts.length,
        Number(fam.totalWeightKg.toFixed(2)),
        Number(fam.yieldActualPct.toFixed(2)),
        Number(fam.standardPct.toFixed(2)),
        Number(fam.deviationPct.toFixed(2)),
      ]);

      const subtotalRow = [
        'SUBTOTAL CORTES VENDÁVEIS',
        'Soma de todos os cortes comerciais vendáveis',
        activeRecord.cuts.length - boneCuts.length - fatCuts.length,
        Number(totalSaleableWeight.toFixed(2)),
        Number(totalSaleableYieldPct.toFixed(2)),
        Number(totalSaleableStandardPct.toFixed(2)),
        Number(totalSaleableDeviationPct.toFixed(2)),
      ];

      const ossoRow = [
        'SUBPRODUTO OSSO (X-MP)',
        boneCuts.map((c) => c.name).join(', ') || 'X-MP - OSSO',
        boneCuts.length,
        Number(boneWeightKg.toFixed(2)),
        Number(boneYieldPct.toFixed(2)),
        Number(boneStandardPct.toFixed(2)),
        Number(boneDeviationPct.toFixed(2)),
      ];

      const rows: any[] = [...summaryRows, headerRow, ...dataRows, subtotalRow, ossoRow];

      if (activeRecord.type !== 'SUINO') {
        rows.push([
          'SUBPRODUTO SEBO',
          fatCuts.map((c) => c.name).join(', ') || 'X-MP - SEBO',
          fatCuts.length,
          Number(fatWeightKg.toFixed(2)),
          Number(fatYieldPct.toFixed(2)),
          Number(fatStandardPct.toFixed(2)),
          Number(fatDeviationPct.toFixed(2)),
        ]);
      }

      rows.push([
        'TOTAL PRODUTO ACABADO (PA)',
        'Carnes Vendáveis + Subprodutos',
        activeRecord.cuts.length,
        Number(totalFinishedWeight.toFixed(2)),
        Number(totalFinishedYieldPct.toFixed(2)),
        100 - Number(lossPct.toFixed(2)),
        Number((totalFinishedYieldPct - (100 - lossPct)).toFixed(2)),
      ]);

      rows.push([
        'PERDA / QUEBRA FÍSICA',
        'Diferença Matéria-Prima vs Produto Acabado',
        '-',
        Number(lossKg.toFixed(2)),
        Number(lossPct.toFixed(3)),
        '-',
        '-',
      ]);

      rows.push([
        'TOTAL CARCAÇA / MATÉRIA-PRIMA',
        'Base 100% da Matéria-Prima Entrada',
        '-',
        Number(rawMaterialWeight.toFixed(2)),
        100.0,
        100.0,
        0.0,
      ]);

      const ws = XLSX.utils.aoa_to_sheet(rows);
      XLSX.utils.book_append_sheet(wb, ws, 'OPR_Cortes');
      XLSX.writeFile(wb, `OnePageReport_Cortes_${activeRecord.type}_${activeRecord.date}.xlsx`);

      setFeedbackMsg('Planilha Excel do OPR Cortes gerada com sucesso.');
      setTimeout(() => setFeedbackMsg(null), 4000);
    } catch (e: any) {
      console.error(e);
      setFeedbackMsg(`Erro ao exportar OPR Cortes: ${e.message}`);
    }
  };

  if (!activeRecord) {
    return (
      <div className="p-8 text-center text-slate-500 bg-white rounded-xl border border-slate-200">
        Nenhum registro de produção disponível para gerar o One Page Report Cortes.
      </div>
    );
  }

  const avgWeight =
    activeRecord.rawMaterialBoxes > 0
      ? activeRecord.rawMaterialWeightKg / activeRecord.rawMaterialBoxes
      : activeRecord.rawMaterialAvgWeightKg || 0;

  return (
    <div className="space-y-4 pb-12 print:p-0 print:m-0 print:space-y-0 print:pb-0">
      {/* Top action bar (Hidden when printing) */}
      <div className="print:hidden flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-900 text-white flex items-center justify-center shadow-xs">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-900">
                One Page Report Cortes (Consolidado por Tipo)
              </h2>
              <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-blue-100 text-blue-900 border border-blue-200">
                Operacional
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Análise dos tipos de cortes consolidados (soma por tipo) e % de matéria-prima vs padrão do mercado (sem dados financeiros)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Botão de Alternância para o OPR Geral com Valores */}
          {onNavigateToGeneralReport && (
            <button
              type="button"
              onClick={onNavigateToGeneralReport}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
              title="Alternar para o One Page Report Geral com todos os cortes e valores financeiros"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Ver OPR Geral</span>
            </button>
          )}

          {/* Seletor de Linha de Processamento: DT vs TR vs CT vs DS vs Todos */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs font-semibold">
            <span className="text-[10px] uppercase font-bold text-slate-500 px-1 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5 text-blue-800" />
              Linha:
            </span>
            <button
              type="button"
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
              onClick={() => handleFilterTypeChange('DIANTEIRO')}
              className={`px-2.5 py-1 rounded-md transition-all flex items-center gap-1 cursor-pointer ${
                reportTypeFilter === 'DIANTEIRO'
                  ? 'bg-amber-600 text-white shadow-xs font-bold'
                  : 'text-slate-700 hover:text-amber-800'
              }`}
            >
              <Beef className="w-3.5 h-3.5" />
              DT
            </button>
            <button
              type="button"
              onClick={() => handleFilterTypeChange('TRASEIRO')}
              className={`px-2.5 py-1 rounded-md transition-all flex items-center gap-1 cursor-pointer ${
                reportTypeFilter === 'TRASEIRO'
                  ? 'bg-rose-800 text-white shadow-xs font-bold'
                  : 'text-slate-700 hover:text-rose-900'
              }`}
            >
              <Crown className="w-3.5 h-3.5" />
              TR
            </button>
            <button
              type="button"
              onClick={() => handleFilterTypeChange('COSTELA')}
              className={`px-2.5 py-1 rounded-md transition-all flex items-center gap-1 cursor-pointer ${
                reportTypeFilter === 'COSTELA'
                  ? 'bg-orange-700 text-white shadow-xs font-bold'
                  : 'text-slate-700 hover:text-orange-900'
              }`}
            >
              <Bone className="w-3.5 h-3.5" />
              CT
            </button>
            <button
              type="button"
              onClick={() => handleFilterTypeChange('SUINO')}
              className={`px-2.5 py-1 rounded-md transition-all flex items-center gap-1 cursor-pointer ${
                reportTypeFilter === 'SUINO'
                  ? 'bg-emerald-700 text-white shadow-xs font-bold'
                  : 'text-slate-700 hover:text-emerald-900'
              }`}
            >
              <Ham className="w-3.5 h-3.5" />
              SU
            </button>
          </div>

          {/* Seletor do Lote Atual */}
          <div className="flex items-center gap-1.5">
            <select
              value={activeRecordId}
              onChange={(e) => setActiveRecordId(e.target.value)}
              className="bg-slate-50 border border-slate-300 text-slate-800 rounded-lg px-2.5 py-1.5 text-xs font-medium focus:ring-2 focus:ring-blue-700 focus:outline-hidden"
              title="Selecionar Lote de Produção para Visualizar"
            >
              {availableRecords.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.date.split('-').reverse().join('/')} - {r.type === 'DIANTEIRO' ? 'DT' : r.type === 'SUINO' ? 'SU' : r.type === 'COSTELA' ? 'CT' : 'TR'} ({r.shift} • {formatKg(r.rawMaterialWeightKg, 0)})
                </option>
              ))}
            </select>
          </div>

          {/* Botões: Imprimir e Exportar Excel */}
          <button
            type="button"
            onClick={handlePrint}
            className="px-3 py-1.5 bg-blue-900 hover:bg-blue-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
            title="Imprimir ou Salvar como PDF em Formato A4 Retrato"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Imprimir A4 Retrato</span>
          </button>

          <button
            type="button"
            onClick={handleExportExcelCortes}
            className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
            title="Baixar planilha Excel com a consolidação dos cortes"
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
                <span>Ver {p.type === 'DIANTEIRO' ? 'Dianteiro (DT)' : p.type === 'TRASEIRO' ? 'Traseiro (TR)' : p.type === 'COSTELA' ? 'Costela (CT)' : 'Suíno (DS)'}</span>
                <ArrowUpRight className="w-3 h-3" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 
        A4 PORTRAIT PAGE CONTAINER 
        Calibrated with exact portrait proportions and printable height
        Zero gray margin in print + elegant border frame
      */}
      <div className="flex justify-center overflow-x-auto p-0 sm:p-2 bg-white rounded-xl print:p-0 print:m-0 print:bg-white print-page-wrapper">
        <div
          id="one-page-report-cortes-canvas"
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
                <div className="w-7 h-7 rounded bg-blue-950 text-white flex items-center justify-center font-black text-xs shadow-2xs">
                  BH
                </div>
                <div>
                  <h1 className="text-xs font-black tracking-tight text-slate-900 uppercase leading-tight">
                    BH FOODS COMÉRCIO E INDÚSTRIA LTDA
                  </h1>
                  <p className="text-[9.5px] font-bold text-blue-900 tracking-wider uppercase leading-tight">
                    RELATÓRIO GERENCIAL DE CORTES CONSOLIDADOS (ONE PAGE REPORT CORTES)
                  </p>
                </div>
              </div>

              {/* Tag com código do sistema e emissão */}
              <div className="text-right text-[9px] text-slate-600 space-y-0.5 font-mono">
                <div><strong>SisAtak RETQ010</strong> • Empresa: 021 • Lista: 101</div>
                <div>Emissão: {activeRecord.emissionTime || '28/08/2026 11:08 h'} • Pág. 0001/0001</div>
              </div>
            </div>

            {/* Context metadata ribbon (100% OPERACIONAL - ZERO FINANCEIRO) */}
            <div className="mt-1 pt-1 border-t border-slate-200 grid grid-cols-5 gap-1.5 text-xs bg-white border border-slate-200 p-1.5 rounded">
              <div>
                <span className="text-slate-500 block text-[8.5px] uppercase font-bold">Data Operação:</span>
                <span className="font-black text-slate-900 text-[10.5px]">
                  {activeRecord.date.split('-').reverse().join('/')}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block text-[8.5px] uppercase font-bold">Linha de Desossa:</span>
                <span className={`inline-flex items-center gap-1 font-black uppercase text-[9.5px] px-1 py-0.2 rounded border ${
                  activeRecord.type === 'DIANTEIRO'
                    ? 'bg-amber-100 text-amber-900 border-amber-300'
                    : activeRecord.type === 'SUINO'
                    ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                    : activeRecord.type === 'COSTELA'
                    ? 'bg-orange-100 text-orange-900 border-orange-300'
                    : 'bg-blue-100 text-blue-900 border-blue-300'
                }`}>
                  {activeRecord.type === 'DIANTEIRO' && <Beef className="w-2.5 h-2.5" />}
                  {activeRecord.type === 'TRASEIRO' && <Crown className="w-2.5 h-2.5" />}
                  {activeRecord.type === 'COSTELA' && <Bone className="w-2.5 h-2.5" />}
                  {activeRecord.type === 'SUINO' && <Ham className="w-2.5 h-2.5" />}
                  {activeRecord.type === 'DIANTEIRO'
                    ? 'Dianteiro (DT)'
                    : activeRecord.type === 'SUINO'
                    ? 'Suíno (SU)'
                    : activeRecord.type === 'COSTELA'
                    ? 'Costela (CT)'
                    : 'Traseiro (TR)'}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block text-[8.5px] uppercase font-bold">Turno / Equipe:</span>
                <span className="font-bold text-slate-900 text-[10.5px]">
                  {activeRecord.shift} ({activeRecord.operatorCount} pess.)
                </span>
              </div>
              <div>
                <span className="text-slate-500 block text-[8.5px] uppercase font-bold">Líder / Responsável:</span>
                <span className="font-bold text-slate-900 text-[10.5px] truncate">
                  {activeRecord.responsibleOperator}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block text-[8.5px] uppercase font-bold">
                  Peso Médio {rawMaterialUnitTitle}:
                </span>
                <span className="font-black text-slate-900 text-[10.5px] font-mono">
                  {formatWeightNum(avgWeight, 2)} kg
                </span>
              </div>
            </div>
          </div>

          {/* 2. INDICADORES DA OPERAÇÃO DO DIA / LOTE ATIVO (7 Caixas Operacionais) */}
          <div className="mb-1.5">
            <div className="flex flex-wrap items-center justify-between gap-1 mb-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[10px] font-black uppercase text-slate-800 tracking-wider flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-700" />
                  Indicadores da Operação do Dia / Lote ({activeRecord.date.split('-').reverse().join('/')})
                </span>
                <span className="text-[9px] font-black uppercase px-1.5 py-0.2 rounded bg-blue-100 text-blue-900 border border-blue-200 tracking-wide font-mono">
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
              <span className="text-[9px] font-bold text-slate-600 font-mono">
                {activeRecord.shift} • {activeRecord.type === 'SUINO' ? 'Carcaça' : 'Peça'}: {formatWeightNum(activeRecord.rawMaterialWeightKg, 1)} kg
              </span>
            </div>

            {/* 6 KPI BOXES (Operacionais: #1 Entrada, #2 Saída, #3 Rend. Desossa, #4 Sub Produtos, #5 Perda/Quebra, #6 Produtividade) */}
            <div className="grid grid-cols-6 gap-1">
              {/* #1. ENTRADA (Kg) */}
              <div className="p-1 rounded bg-white border border-slate-300 text-center flex flex-col justify-between h-[50px]">
                <span className="text-[8.5px] font-bold text-slate-600 uppercase tracking-tight block truncate h-3 leading-3" title={`Peso de Entrada da Matéria-Prima (${unitNounPluralUpper})`}>
                  1. Entrada (Kg)
                </span>
                <span className="h-4 flex items-center justify-center text-[12px] font-black text-slate-900 font-mono tracking-tight leading-none truncate px-0.5">
                  {formatWeightNum(activeRecord.rawMaterialWeightKg, 0)} <span className="text-[8px] font-normal ml-0.5">kg</span>
                </span>
                <span className="text-[8px] text-slate-500 font-medium block truncate h-3 leading-3 font-mono">
                  {activeRecord.rawMaterialBoxes} {unitNounLower}
                </span>
              </div>

              {/* #2. SAÍDA (Kg) */}
              <div className="p-1 rounded bg-blue-50/40 print:bg-white border border-blue-200 print:border-slate-300 text-center flex flex-col justify-between h-[50px]">
                <span className="text-[8.5px] font-bold text-blue-900 uppercase tracking-tight block truncate h-3 leading-3" title="Peso de Saída do Produto Acabado">
                  2. Saída (Kg)
                </span>
                <span className="h-4 flex items-center justify-center text-[12px] font-black text-blue-950 font-mono tracking-tight leading-none truncate px-0.5">
                  {formatWeightNum(activeRecord.finishedProductWeightKg, 0)} <span className="text-[8px] font-normal ml-0.5">kg</span>
                </span>
                <span className="h-3 block" aria-hidden="true" />
              </div>

              {/* #3. REND. DESOSSA (%) */}
              <div className="p-1 rounded bg-white border border-slate-300 text-center flex flex-col justify-between h-[50px]">
                <span className="text-[8.5px] font-bold text-slate-600 uppercase tracking-tight block truncate h-3 leading-3" title="Rendimento Líquido da Desossa (% sobre Matéria-Prima)">
                  3. Rend. Desossa
                </span>
                <span className="h-4 flex items-center justify-center text-[12px] font-black text-emerald-700 font-mono tracking-tight leading-none">
                  {formatPct(totalSaleableYieldPct, 2)}
                </span>
                <span className="text-[8px] text-slate-500 font-medium block truncate h-3 leading-3 font-mono">
                  {formatKg(totalSaleableWeight, 0)} carnes
                </span>
              </div>

              {/* #4. SUB PRODUTOS (%) */}
              <div className="p-1 rounded bg-amber-50/40 print:bg-white border border-amber-200 print:border-slate-300 text-center flex flex-col justify-between h-[50px]">
                <span className="text-[8.5px] font-bold text-amber-900 uppercase tracking-tight block truncate h-3 leading-3" title="Sub Produtos: Osso e Sebo">
                  4. Sub Produtos
                </span>
                <span className="h-4 flex items-center justify-center text-[12px] font-black text-amber-900 font-mono tracking-tight leading-none">
                  {formatPct(boneYieldPct + fatYieldPct, 2)}
                </span>
                <span className="text-[8px] text-amber-900 font-semibold block truncate h-3 leading-3 font-mono">
                  {activeRecord.type === 'SUINO'
                    ? `Osso: ${formatWeightNum(boneWeightKg, 0)} kg`
                    : `Osso: ${formatWeightNum(boneWeightKg, 0)}k • Sebo: ${formatWeightNum(fatWeightKg, 0)}k`}
                </span>
              </div>

              {/* #5. PERDA / QUEBRA */}
              <div className="p-1 rounded bg-white border border-slate-300 text-center flex flex-col justify-between h-[50px]">
                <span className="text-[8.5px] font-bold text-slate-600 uppercase tracking-tight block truncate h-3 leading-3" title="Perda / Quebra de Desossa">
                  5. Perda / Quebra
                </span>
                <span className={`h-4 flex items-center justify-center text-[12px] font-black font-mono tracking-tight leading-none ${lossPct <= 0.8 ? 'text-emerald-700' : 'text-rose-700'}`}>
                  {formatPct(lossPct, 3)}
                </span>
                <span className="text-[8px] text-slate-500 font-medium block truncate h-3 leading-3 font-mono">
                  Quebra: {formatKg(lossKg, 1)}
                </span>
              </div>

              {/* #6. PRODUTIVIDADE */}
              <div className="p-1 rounded bg-white border border-slate-300 text-center flex flex-col justify-between h-[50px]">
                <span className="text-[8.5px] font-bold text-slate-600 uppercase tracking-tight block truncate h-3 leading-3">
                  6. Produtividade
                </span>
                <span className="h-4 flex items-center justify-center text-[12px] font-black text-blue-900 font-mono tracking-tight leading-none">
                  {activeRecord.productivityKgPerPerson.toFixed(1)} <span className="text-[8px] font-normal ml-0.5">kg/p</span>
                </span>
                <span className="text-[8px] text-slate-500 font-medium block truncate h-3 leading-3">
                  Equipe: {activeRecord.operatorCount} pess.
                </span>
              </div>
            </div>
          </div>

          {/* 3. TABELA CONSOLIDADA DE TIPOS DE CORTES VS PADRÃO DE MERCADO */}
          <div className="border border-slate-300 rounded p-1.5 bg-white flex-1 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-1 mb-1 border-b border-slate-200">
                <div className="flex items-center gap-1.5">
                  <h3 className="text-[10.5px] font-black uppercase tracking-wider text-slate-900 flex items-center gap-1">
                    <Layers className="w-3 h-3 text-blue-800" />
                    Consolidação dos Tipos de Cortes na Desossa vs Padrão de Mercado ({activeRecord.type === 'DIANTEIRO' ? 'Dianteiro' : activeRecord.type === 'SUINO' ? 'Suíno' : activeRecord.type === 'COSTELA' ? 'Costela' : 'Traseiro'})
                  </h3>
                  <span className="text-[9px] text-slate-500 font-semibold">
                    • {consolidatedFamilies.length} famílias de cortes consolidadas
                  </span>
                </div>
                <span className="text-[8.5px] text-blue-900 font-bold bg-blue-50 px-1.5 py-0.2 rounded border border-blue-200">
                  Base 100% Matéria-Prima: {formatWeightNum(rawMaterialWeight, 1)} kg
                </span>
              </div>

              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 print:bg-white text-slate-800 font-bold border-b-2 border-slate-300 text-[9px] uppercase tracking-wide">
                    <th className="py-0.5 px-1.5">Tipo de Corte / Família (Cortes Somados)</th>
                    <th className="py-0.5 px-1 text-center">Itens</th>
                    <th className="py-0.5 px-1.5 text-right">Peso Consolidado (kg)</th>
                    <th className="py-0.5 px-1.5 text-right font-black text-blue-950">Rend. Apurado (% MP)</th>
                    <th className="py-0.5 px-1.5 text-right text-slate-600">Padrão Mercado (%)</th>
                    <th className="py-0.5 px-1.5 text-right">Desvio (pp)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {consolidatedFamilies.map((fam) => {
                    const isPositive = fam.deviationPct >= 0;

                    return (
                      <tr key={fam.name} className="hover:bg-slate-50 leading-tight">
                        {/* Nome do Tipo e cortes somados */}
                        <td className="py-0.5 px-1.5">
                          <div className="font-bold text-slate-900 text-[9.5px]">
                            {fam.name}
                          </div>
                          {fam.cuts.length > 0 ? (
                            <div className="text-[8px] text-slate-500 font-mono truncate max-w-[340px]" title={fam.cuts.map((c) => c.name).join(' • ')}>
                              {fam.cuts.map((c) => c.name.replace(/^(CXGG - |MP - |W-MP - |X-MP - )/i, '')).join(' • ')}
                            </div>
                          ) : (
                            <div className="text-[8px] text-slate-400 italic">Sem cortes apurados neste lote</div>
                          )}
                        </td>

                        {/* Quantidade de Cortes */}
                        <td className="py-0.5 px-1 text-center font-mono text-[9px] text-slate-600">
                          {fam.cuts.length}
                        </td>

                        {/* Peso Consolidado (kg) */}
                        <td className="py-0.5 px-1.5 text-right font-mono font-bold text-slate-900 text-[9px]">
                          {formatWeightNum(fam.totalWeightKg, 1)}
                        </td>

                        {/* Rendimento Apurado (% sobre MP) */}
                        <td className="py-0.5 px-1.5 text-right font-mono font-black text-blue-950 text-[9.5px]">
                          {formatPct(fam.yieldActualPct, 2)}
                        </td>

                        {/* Padrão de Mercado (%) */}
                        <td className="py-0.5 px-1.5 text-right font-mono text-slate-600 text-[9px]">
                          {formatPct(fam.standardPct, 2)}
                        </td>

                        {/* Desvio (pp) */}
                        <td className={`py-0.5 px-1.5 text-right font-mono font-bold text-[9px] ${
                          isPositive ? 'text-emerald-700' : fam.deviationPct < -0.3 ? 'text-rose-700' : 'text-amber-700'
                        }`}>
                          {isPositive ? `+${fam.deviationPct.toFixed(2)}` : fam.deviationPct.toFixed(2)} pp
                        </td>
                      </tr>
                    );
                  })}

                  {/* LINHA COM INFORMAÇÕES DO SUBPRODUTO OSSO (SOMENTE CÓDIGO X-MP) */}
                  <tr className="bg-amber-50/50 print:bg-white hover:bg-amber-50/80 border-t border-amber-200 print:border-slate-300 leading-tight">
                    <td className="py-0.5 px-1.5">
                      <div className="font-bold text-amber-950 text-[9.5px] flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-600 shrink-0 print:border print:border-amber-700" />
                        <span>Subproduto Osso (somente código X-MP)</span>
                      </div>
                      <div className="text-[8px] text-amber-900/80 font-mono truncate max-w-[340px]" title={boneCuts.map((c) => c.name).join(' • ')}>
                        {boneCuts.map((c) => c.name).join(' • ') || 'X-MP - OSSO'}
                      </div>
                    </td>
                    <td className="py-0.5 px-1 text-center font-mono text-[9px] text-slate-600">
                      {boneCuts.length}
                    </td>
                    <td className="py-0.5 px-1.5 text-right font-mono font-bold text-slate-900 text-[9px]">
                      {formatWeightNum(boneWeightKg, 1)}
                    </td>
                    <td className="py-0.5 px-1.5 text-right font-mono font-black text-amber-900 text-[9.5px]">
                      {formatPct(boneYieldPct, 2)}
                    </td>
                    <td className="py-0.5 px-1.5 text-right font-mono text-slate-600 text-[9px]">
                      {formatPct(boneStandardPct, 2)}
                    </td>
                    <td className={`py-0.5 px-1.5 text-right font-mono font-bold text-[9px] ${
                      boneDeviationPct <= 0 ? 'text-emerald-700' : 'text-rose-700'
                    }`}>
                      {boneDeviationPct > 0 ? `+${boneDeviationPct.toFixed(2)}` : boneDeviationPct.toFixed(2)} pp
                    </td>
                  </tr>

                  {/* LINHA COM INFORMAÇÕES DO SUBPRODUTO SEBO (BOVINO) */}
                  {activeRecord.type !== 'SUINO' && (
                    <tr className="bg-amber-50/30 print:bg-white hover:bg-amber-50/60 border-t border-amber-100 print:border-slate-300 leading-tight">
                      <td className="py-0.5 px-1.5">
                        <div className="font-bold text-amber-950 text-[9.5px] flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0 print:border print:border-amber-600" />
                          <span>Subproduto Sebo</span>
                        </div>
                        <div className="text-[8px] text-amber-900/80 font-mono truncate max-w-[340px]" title={fatCuts.map((c) => c.name).join(' • ')}>
                          {fatCuts.map((c) => c.name).join(' • ') || 'X-MP - SEBO'}
                        </div>
                      </td>
                      <td className="py-0.5 px-1 text-center font-mono text-[9px] text-slate-600">
                        {fatCuts.length}
                      </td>
                      <td className="py-0.5 px-1.5 text-right font-mono font-bold text-slate-900 text-[9px]">
                        {formatWeightNum(fatWeightKg, 1)}
                      </td>
                      <td className="py-0.5 px-1.5 text-right font-mono font-black text-amber-900 text-[9.5px]">
                        {formatPct(fatYieldPct, 2)}
                      </td>
                      <td className="py-0.5 px-1.5 text-right font-mono text-slate-600 text-[9px]">
                        {formatPct(fatStandardPct, 2)}
                      </td>
                      <td className={`py-0.5 px-1.5 text-right font-mono font-bold text-[9px] ${
                        fatDeviationPct <= 0 ? 'text-emerald-700' : 'text-amber-700'
                      }`}>
                        {fatDeviationPct > 0 ? `+${fatDeviationPct.toFixed(2)}` : fatDeviationPct.toFixed(2)} pp
                      </td>
                    </tr>
                  )}
                </tbody>

                <tfoot>
                  {/* Subtotal Cortes Vendáveis */}
                  <tr className="bg-white font-bold text-slate-900 border-t-2 border-slate-300 text-[9px]">
                    <td className="py-0.5 px-1.5 uppercase font-black">Subtotal Cortes Vendáveis Consolidados</td>
                    <td className="py-0.5 px-1 text-center font-mono text-slate-600">
                      {activeRecord.cuts.length - boneCuts.length - fatCuts.length}
                    </td>
                    <td className="py-0.5 px-1.5 text-right font-mono font-black">{formatWeightNum(totalSaleableWeight, 1)}</td>
                    <td className="py-0.5 px-1.5 text-right font-mono font-black text-emerald-800">
                      {formatPct(totalSaleableYieldPct, 2)}
                    </td>
                    <td className="py-0.5 px-1.5 text-right font-mono text-slate-700">
                      {formatPct(totalSaleableStandardPct, 2)}
                    </td>
                    <td className={`py-0.5 px-1.5 text-right font-mono font-bold ${
                      totalSaleableDeviationPct >= 0 ? 'text-emerald-800' : 'text-rose-700'
                    }`}>
                      {totalSaleableDeviationPct >= 0 ? `+${totalSaleableDeviationPct.toFixed(2)}` : totalSaleableDeviationPct.toFixed(2)} pp
                    </td>
                  </tr>

                  {/* TOTAL PRODUTO ACABADO (PA) */}
                  <tr className="bg-slate-50 print:bg-white font-black text-slate-900 border-t border-slate-300 text-[9px]">
                    <td className="py-0.5 px-1.5 uppercase">TOTAL PRODUTO ACABADO (CORTES + SUBPRODUTOS)</td>
                    <td className="py-0.5 px-1 text-center font-mono text-slate-600">{activeRecord.cuts.length}</td>
                    <td className="py-0.5 px-1.5 text-right font-mono text-blue-950 font-black">{formatWeightNum(totalFinishedWeight, 1)}</td>
                    <td className="py-0.5 px-1.5 text-right font-mono text-blue-900 font-black">
                      {formatPct(totalFinishedYieldPct, 2)}
                    </td>
                    <td className="py-0.5 px-1.5 text-right font-mono text-slate-700">
                      {formatPct(100 - lossPct, 2)}
                    </td>
                    <td className="py-0.5 px-1.5 text-right font-mono font-bold text-slate-700">
                      {(totalFinishedYieldPct - (100 - lossPct)).toFixed(2)} pp
                    </td>
                  </tr>

                  {/* QUEBRA DE DESOSSA */}
                  <tr className="bg-white font-semibold text-rose-800 border-t border-slate-200 text-[9px]">
                    <td className="py-0.5 px-1.5 uppercase">PERDA / QUEBRA FÍSICA DA DESOSSA</td>
                    <td className="py-0.5 px-1 text-center font-mono text-slate-400">-</td>
                    <td className="py-0.5 px-1.5 text-right font-mono font-bold">{formatWeightNum(lossKg, 1)}</td>
                    <td className="py-0.5 px-1.5 text-right font-mono font-bold">{formatPct(lossPct, 3)}</td>
                    <td className="py-0.5 px-1.5 text-right font-mono text-slate-400">≤ 0,80%</td>
                    <td className="py-0.5 px-1.5 text-right font-mono">
                      {(lossPct - 0.80).toFixed(2)} pp
                    </td>
                  </tr>

                  {/* BALANÇO TOTAL CARCAÇA */}
                  <tr className="bg-slate-50 print:bg-white font-black text-slate-950 border-t-2 border-slate-900 text-[9.5px]">
                    <td className="py-1 px-1.5 uppercase tracking-wide">BALANÇO TOTAL DA MATÉRIA-PRIMA (BASE 100%)</td>
                    <td className="py-1 px-1 text-center font-mono text-slate-700">{activeRecord.rawMaterialBoxes} cx</td>
                    <td className="py-1 px-1.5 text-right font-mono text-slate-950 font-black">{formatWeightNum(rawMaterialWeight, 1)}</td>
                    <td className="py-1 px-1.5 text-right font-mono text-slate-950 font-black">100,00%</td>
                    <td className="py-1 px-1.5 text-right font-mono text-slate-700">100,00%</td>
                    <td className="py-1 px-1.5 text-right font-mono text-slate-700">0,00 pp</td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Rodapé institucional com regras de conferência */}
            <div className="mt-1 pt-1 border-t border-slate-200 text-[9px] flex justify-between items-center text-slate-600 font-medium">
              <span>
                Subproduto Osso (código X-MP): {formatKg(boneWeightKg, 1)} ({formatPct(boneYieldPct, 2)})
                {activeRecord.type !== 'SUINO' && ` • Sebo: ${formatKg(fatWeightKg, 1)} (${formatPct(fatYieldPct, 2)})`}
                {' • '}Quebra: {formatKg(lossKg, 1)} ({formatPct(lossPct, 3)})
              </span>
              <span className="font-bold text-slate-800">
                Aproveitamento Efetivo da Desossa: {formatPct(totalSaleableYieldPct, 2)} carnes vendáveis
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
