import React from 'react';
import {
  Beef,
  Scale,
  DollarSign,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  Info,
  Layers,
  ArrowDownRight,
  ArrowUpRight,
  Calendar,
  Filter,
  Bone,
  Calculator,
  Percent,
  Sparkles
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { formatCurrency, formatKg, formatPct, formatWeightNum } from '../utils/calculations';
import { findBenchmarkForCut } from '../utils/benchmarkMatcher';
import { GroupedYieldTable } from './GroupedYieldTable';
import { calculateGroupedYields } from '../utils/cutGrouping';

export const SuinoView: React.FC = () => {
  const { records, filteredRecords, benchmarks } = useApp();

  // All Suíno records in the system
  const allDsRecords = React.useMemo(() => {
    return records.filter((r) => r.type === 'SUINO');
  }, [records]);

  // Batch selector state: 'auto' | 'all' | specific record ID
  const [selectedBatchId, setSelectedBatchId] = React.useState<string>('auto');

  // Determine active Suíno records to display
  const dsRecords = React.useMemo(() => {
    if (selectedBatchId === 'all') {
      return allDsRecords;
    }
    if (selectedBatchId !== 'auto') {
      const match = allDsRecords.find((r) => r.id === selectedBatchId);
      if (match) return [match];
    }
    // Auto mode: prefer filtered records if any match SUINO; fallback to most recent DS record
    const filteredDs = filteredRecords.filter((r) => r.type === 'SUINO');
    if (filteredDs.length > 0) return filteredDs;
    if (allDsRecords.length > 0) return [allDsRecords[0]];
    return [];
  }, [selectedBatchId, filteredRecords, allDsRecords]);

  // Current active display label
  const activeBatchLabel = React.useMemo(() => {
    if (selectedBatchId === 'all') return `Consolidado (${allDsRecords.length} Lotes DS)`;
    if (dsRecords.length === 1) {
      const r = dsRecords[0];
      return `${r.date.split('-').reverse().join('/')} - ${r.shift} (${formatKg(r.rawMaterialWeightKg, 1)})`;
    }
    if (dsRecords.length > 1) {
      return `Filtro Selecionado (${dsRecords.length} Lotes DS)`;
    }
    return 'Nenhum lote DS encontrado';
  }, [selectedBatchId, dsRecords, allDsRecords]);

  // Aggregate cuts from the resolved Suíno records
  const aggregatedCuts = React.useMemo(() => {
    const cutMap: Record<string, {
      code: string;
      name: string;
      category: string;
      totalWeightKg: number;
      totalBoxes: number;
      totalValue: number;
      unitPriceAvg: number;
      yieldActualPct: number;
      yieldExpectedPct: number;
      isNonSaleable: boolean;
    }> = {};

    let totalMP = 0;

    dsRecords.forEach((r) => {
      totalMP += r.rawMaterialWeightKg;
      r.cuts.forEach((cut) => {
        if (!cutMap[cut.code]) {
          const benchmark = findBenchmarkForCut(cut, benchmarks, 'SUINO');
          const expectedYieldPct = benchmark ? benchmark.expectedYieldPct : (cut.yieldExpectedPct || 0);

          cutMap[cut.code] = {
            code: cut.code,
            name: cut.name,
            category: cut.category,
            totalWeightKg: 0,
            totalBoxes: 0,
            totalValue: 0,
            unitPriceAvg: cut.unitPrice,
            yieldActualPct: 0,
            yieldExpectedPct: expectedYieldPct,
            isNonSaleable: !!cut.isNonSaleable,
          };
        }
        cutMap[cut.code].totalWeightKg += cut.weightKg;
        cutMap[cut.code].totalBoxes += cut.boxesCount;
        cutMap[cut.code].totalValue += cut.totalPrice;
      });
    });

    return Object.values(cutMap).map((c) => {
      const yieldActualPct = totalMP > 0 ? (c.totalWeightKg / totalMP) * 100 : 0;
      const unitPriceAvg = c.totalWeightKg > 0 ? c.totalValue / c.totalWeightKg : 0;
      const deviationPct = c.yieldExpectedPct > 0 ? yieldActualPct - c.yieldExpectedPct : 0;
      return {
        ...c,
        yieldActualPct,
        unitPriceAvg,
        deviationPct,
      };
    }).sort((a, b) => b.totalWeightKg - a.totalWeightKg);
  }, [dsRecords, benchmarks]);

  const totalRawMaterial = dsRecords.reduce((a, b) => a + b.rawMaterialWeightKg, 0);
  const totalFinished = dsRecords.reduce((a, b) => a + b.finishedProductWeightKg, 0);
  const totalBone = dsRecords.reduce((a, b) => a + b.boneWeightKg, 0);
  const totalFat = dsRecords.reduce((a, b) => a + b.fatWeightKg, 0);
  const totalNonSaleable = totalBone + totalFat;
  const totalLoss = dsRecords.reduce((a, b) => a + b.lossKg, 0);
  const totalValue = dsRecords.reduce((a, b) => a + b.finishedProductTotalValue, 0);
  const totalCost = dsRecords.reduce((a, b) => a + b.totalCarcassCost, 0);
  const grossProfit = totalValue - totalCost;
  const profitMarginPct = totalValue > 0 ? (grossProfit / totalValue) * 100 : 0;

  // Somatórios diretos da Tabela Analítica (Cortes e Subprodutos)
  const cutsTotalWeight = aggregatedCuts.reduce((acc, c) => acc + c.totalWeightKg, 0);
  const cutsTotalBoxes = aggregatedCuts.reduce((acc, c) => acc + c.totalBoxes, 0);
  const cutsTotalValue = aggregatedCuts.reduce((acc, c) => acc + c.totalValue, 0);
  const cutsTotalYieldPct = totalRawMaterial > 0 ? (cutsTotalWeight / totalRawMaterial) * 100 : 0;
  const cutsAvgPricePerKg = cutsTotalWeight > 0 ? cutsTotalValue / cutsTotalWeight : 0;
  const avgCarcassCostPerKg = totalRawMaterial > 0 ? totalCost / totalRawMaterial : 0;

  // Proporção / Margem Bruta da Desossa Suína:
  const operationGrossProfit = cutsTotalValue - totalCost;
  const operationMarginOnRevenuePct = cutsTotalValue > 0 ? (operationGrossProfit / cutsTotalValue) * 100 : 0;
  const operationMarginOnCostPct = totalCost > 0 ? (operationGrossProfit / totalCost) * 100 : 0;
  const carcassRevenueRatioPct = totalCost > 0 ? (cutsTotalValue / totalCost) * 100 : 0;

  const avgLossPct = totalRawMaterial > 0 ? (totalLoss / totalRawMaterial) * 100 : 0;
  const totalSaleableCuts = Math.max(0, totalFinished - totalNonSaleable);
  
  // Peso Total da Carcaça = Carnes Vendáveis + Osso + Sebo/Toucinho + Quebra
  const totalCarcass = (totalSaleableCuts + totalBone + totalFat + totalLoss) > 0
    ? (totalSaleableCuts + totalBone + totalFat + totalLoss)
    : totalRawMaterial;
  const avgDeboningYieldPct = totalCarcass > 0
    ? (totalSaleableCuts / totalCarcass) * 100
    : 0;

  const bonePct = totalRawMaterial > 0 ? (totalBone / totalRawMaterial) * 100 : 0;
  const fatPct = totalRawMaterial > 0 ? (totalFat / totalRawMaterial) * 100 : 0;
  const nonSaleablePct = totalRawMaterial > 0 ? (totalNonSaleable / totalRawMaterial) * 100 : 0;

  // Rendimento dos cortes agrupados por tipo vs padrão oficial da diretoria
  const groupedYieldSummary = React.useMemo(() => {
    return calculateGroupedYields(dsRecords, 'SUINO');
  }, [dsRecords]);

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner com Seletor de Lote Integrado */}
      <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-slate-900 text-white p-5 rounded-xl border border-emerald-900/40 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              <Beef className="w-3.5 h-3.5" />
              SETOR DESOSSA SUÍNO (DS)
            </div>
            <h2 className="text-xl font-bold mt-1 tracking-tight">
              Desossa de Carcaça Suína & Rendimento por Corte
            </h2>
            <p className="text-xs text-slate-300 mt-0.5">
              Monitoramento analítico de Pernil, Paleta, Lombo, Costela, Barriga/Panceta, Bisteca/Carré vs Padrão de Mercado
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Seletor de Lote / Visualização */}
            <div className="bg-slate-800/80 backdrop-blur-sm border border-slate-700 rounded-lg p-2 text-left">
              <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                Lote em Visualização:
              </label>
              <select
                value={selectedBatchId}
                onChange={(e) => setSelectedBatchId(e.target.value)}
                className="bg-slate-900 text-white text-xs font-semibold rounded px-2 py-1.5 border border-slate-600 focus:outline-hidden focus:border-emerald-400 cursor-pointer"
              >
                <option value="auto">Automático (Lote Recente / Filtro Ativo)</option>
                <option value="all">Consolidar Todos os Lotes Suínos ({allDsRecords.length})</option>
                {allDsRecords.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.date.split('-').reverse().join('/')} - {r.shift} ({formatKg(r.rawMaterialWeightKg, 0)}) - {r.responsibleOperator}
                  </option>
                ))}
              </select>
            </div>

            {/* Tag do Lote Ativo */}
            <div className="px-3.5 py-2 rounded-lg bg-emerald-900/50 border border-emerald-700/60 text-right">
              <span className="text-[10px] uppercase tracking-wider text-emerald-300 font-bold block">
                Base Analisada
              </span>
              <span className="text-xs font-bold text-white">
                {activeBatchLabel}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Grid de Cards de Destaque / KPIs Executivos */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Rendimento da Desossa (Líquido) */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-950">Rend. Desossa (DS)</span>
            <Scale className="w-4 h-4 text-emerald-700" />
          </div>
          <p className="text-xl font-black text-slate-900 tracking-tight">
            {formatPct(avgDeboningYieldPct, 2)}
          </p>
          <div className="mt-1 flex items-center gap-1 text-[11px] text-emerald-700 font-semibold">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Carnes / Carcaça</span>
          </div>
        </div>

        {/* Quebra Operacional */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Quebra / Perda</span>
            <AlertTriangle className="w-4 h-4 text-emerald-700" />
          </div>
          <p className="text-xl font-black text-slate-900 tracking-tight">
            {formatPct(avgLossPct, 3)}
          </p>
          <div className="mt-1 flex items-center gap-1 text-[11px] text-slate-500">
            <span>Perda: {formatKg(totalLoss, 1)}</span>
          </div>
        </div>

        {/* Faturamento PA */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Faturamento PA</span>
            <DollarSign className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-xl font-black text-emerald-900 tracking-tight">
            {formatCurrency(totalValue)}
          </p>
          <div className="mt-1 flex items-center gap-1 text-[11px] text-emerald-700 font-semibold">
            <span>PA: {formatKg(totalFinished, 1)}</span>
          </div>
        </div>

        {/* Custo Carcaça */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Custo Carcaça</span>
            <Calculator className="w-4 h-4 text-slate-400" />
          </div>
          <p className="text-xl font-black text-slate-900 tracking-tight">
            {formatCurrency(totalCost)}
          </p>
          <div className="mt-1 flex items-center gap-1 text-[11px] text-slate-500">
            <span>Méd: {formatCurrency(avgCarcassCostPerKg)}/kg</span>
          </div>
        </div>

        {/* Margem Bruta Comercial */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Margem Bruta</span>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-xl font-black text-emerald-900 tracking-tight">
            {formatPct(operationMarginOnRevenuePct, 2)}
          </p>
          <div className="mt-1 flex items-center gap-1 text-[11px] text-emerald-700 font-semibold">
            <span>{formatCurrency(operationGrossProfit)}</span>
          </div>
        </div>

        {/* Relação Retorno Carcaça / Markup */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Retorno Carcaça</span>
            <Percent className="w-4 h-4 text-emerald-700" />
          </div>
          <p className="text-xl font-black text-slate-900 tracking-tight">
            {formatPct(carcassRevenueRatioPct, 2)}
          </p>
          <div className="mt-1 flex items-center gap-1 text-[11px] text-slate-500">
            <span>+{formatPct(operationMarginOnCostPct, 1)} s/ custo</span>
          </div>
        </div>
      </div>

      {/* NOVA TABELA DE RENDIMENTO AGRUPADO POR TIPO vs PADRÃO OFICIAL */}
      <div className="space-y-2">
        <GroupedYieldTable
          summary={groupedYieldSummary}
          title="Balanço de Massa & Rendimento por Tipo de Corte Suíno vs Padrão Oficial"
          subtitle="Agrupamento oficial dos cortes e subprodutos da desossa suína (DS) com apuração de desvios"
        />
      </div>

      {/* Balanço de Massa e Subprodutos */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Carnes Vendáveis */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 mb-2">
            <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <Beef className="w-4 h-4 text-emerald-700" />
              Carnes Vendáveis
            </span>
            <span className="text-[10px] font-bold bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded">
              {formatPct(totalRawMaterial > 0 ? (totalSaleableCuts / totalRawMaterial) * 100 : 0, 2)}
            </span>
          </div>
          <div className="space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-500">Peso Total:</span>
              <span className="font-bold text-slate-900">{formatKg(totalSaleableCuts)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Preço Médio Vendável:</span>
              <span className="font-semibold text-emerald-800">
                {formatCurrency(totalSaleableCuts > 0 ? (totalValue - (cutsTotalValue - totalValue)) / totalSaleableCuts : 0)}/kg
              </span>
            </div>
          </div>
        </div>

        {/* Subprodutos (Osso + Toucinho/Banha) */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 mb-2">
            <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <Bone className="w-4 h-4 text-amber-700" />
              Subprodutos Suínos
            </span>
            <span className="text-[10px] font-bold bg-amber-50 text-amber-800 px-2 py-0.5 rounded">
              {formatPct(nonSaleablePct, 2)}
            </span>
          </div>
          <div className="space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-500">Osso Suíno:</span>
              <span className="font-bold text-slate-900">{formatKg(totalBone)} ({formatPct(bonePct, 2)})</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Toucinho / Banha:</span>
              <span className="font-bold text-slate-900">{formatKg(totalFat)} ({formatPct(fatPct, 2)})</span>
            </div>
          </div>
        </div>

        {/* Matéria-Prima & Quebra */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 mb-2">
            <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <Scale className="w-4 h-4 text-slate-600" />
              Balanço Global Matéria-Prima
            </span>
            <span className="text-[10px] font-bold bg-slate-100 text-slate-800 px-2 py-0.5 rounded">
              100,00%
            </span>
          </div>
          <div className="space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-500">Entrada Carcaça Suína:</span>
              <span className="font-bold text-slate-900">{formatKg(totalRawMaterial)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Quebra Industrial:</span>
              <span className="font-semibold text-rose-700">{formatKg(totalLoss)} ({formatPct(avgLossPct, 3)})</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabela Analítica de Cortes SisAtak */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 bg-slate-50/50">
          <div>
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide flex items-center gap-2">
              <Layers className="w-4 h-4 text-emerald-800" />
              Tabela Analítica de Cortes Suínos (SisAtak RETQ010)
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {aggregatedCuts.length} itens extraídos • Comparativo com Padrão de Mercado e Faturamento individual
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="px-2 py-1 bg-white border border-slate-200 rounded-md font-bold text-slate-700">
              Total Faturado: <span className="text-emerald-900">{formatCurrency(cutsTotalValue)}</span>
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100 text-slate-700 font-bold uppercase text-[11px] border-b border-slate-200">
                <th className="py-2.5 px-3">Código</th>
                <th className="py-2.5 px-3">Descrição do Corte</th>
                <th className="py-2.5 px-3 text-center">Tipo</th>
                <th className="py-2.5 px-3 text-right">Peso Total (kg)</th>
                <th className="py-2.5 px-3 text-right">Caixas</th>
                <th className="py-2.5 px-3 text-right">Rend. Apurado (%)</th>
                <th className="py-2.5 px-3 text-right">Padrão Mercado (%)</th>
                <th className="py-2.5 px-3 text-right">Desvio</th>
                <th className="py-2.5 px-3 text-right">Preço Médio (R$/kg)</th>
                <th className="py-2.5 px-3 text-right">Valor Total (R$)</th>
                <th className="py-2.5 px-3 text-center">Situação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {aggregatedCuts.map((cut) => {
                const isOver = cut.deviationPct > 0.1;
                const isUnder = cut.deviationPct < -0.1;
                const isOk = !isOver && !isUnder;

                return (
                  <tr
                    key={cut.code}
                    className={`hover:bg-slate-50 transition-colors ${
                      cut.isNonSaleable ? 'bg-amber-50/20' : ''
                    }`}
                  >
                    <td className="py-2 px-3 font-mono text-[11px] text-slate-500">{cut.code}</td>
                    <td className="py-2 px-3 font-semibold text-slate-900">
                      <div className="flex items-center gap-1.5">
                        <span>{cut.name}</span>
                        {cut.isNonSaleable && (
                          <span className="text-[9px] px-1 py-0.2 rounded bg-amber-100 text-amber-900 font-bold">
                            Subproduto
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-2 px-3 text-center">
                      <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                        cut.category === 'NOBRE'
                          ? 'bg-purple-100 text-purple-900'
                          : cut.category === 'SUBPRODUTO_OSSO'
                          ? 'bg-amber-100 text-amber-900'
                          : cut.category === 'SUBPRODUTO_SEBO'
                          ? 'bg-yellow-100 text-yellow-900'
                          : 'bg-emerald-100 text-emerald-900'
                      }`}>
                        {cut.category === 'SUBPRODUTO_OSSO'
                          ? 'OSSO'
                          : cut.category === 'SUBPRODUTO_SEBO'
                          ? 'TOUCINHO'
                          : 'SUÍNO'}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">
                      {formatKg(cut.totalWeightKg, 2)}
                    </td>
                    <td className="py-2 px-3 text-right font-mono text-slate-600">
                      {cut.totalBoxes}
                    </td>
                    <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">
                      {formatPct(cut.yieldActualPct, 2)}
                    </td>
                    <td className="py-2 px-3 text-right font-mono text-slate-600">
                      {cut.yieldExpectedPct > 0 ? formatPct(cut.yieldExpectedPct, 2) : '-'}
                    </td>
                    <td className={`py-2 px-3 text-right font-mono font-bold ${
                      isOk ? 'text-slate-600' : isOver ? 'text-emerald-700' : 'text-rose-700'
                    }`}>
                      {cut.yieldExpectedPct > 0
                        ? (cut.deviationPct > 0 ? `+${formatPct(cut.deviationPct, 2)}` : formatPct(cut.deviationPct, 2))
                        : '-'}
                    </td>
                    <td className="py-2 px-3 text-right font-mono text-slate-700">
                      {formatCurrency(cut.unitPriceAvg)}
                    </td>
                    <td className="py-2 px-3 text-right font-mono font-bold text-emerald-950">
                      {formatCurrency(cut.totalValue)}
                    </td>
                    <td className="py-2 px-3 text-center">
                      {cut.yieldExpectedPct === 0 ? (
                        <span className="text-[10px] text-slate-400 font-medium">Sem Ref.</span>
                      ) : isOk ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                          <CheckCircle2 className="w-3 h-3" /> Padrão
                        </span>
                      ) : isOver ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                          <ArrowUpRight className="w-3 h-3" /> Acima
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded">
                          <ArrowDownRight className="w-3 h-3" /> Abaixo
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="bg-slate-100 font-black text-slate-900 border-t-2 border-slate-300 text-xs">
                <td colSpan={3} className="py-3 px-3 uppercase tracking-wider">
                  Totalização Analítica dos Cortes Suínos
                </td>
                <td className="py-3 px-3 text-right font-mono font-bold text-slate-900">
                  {formatKg(cutsTotalWeight, 2)}
                </td>
                <td className="py-3 px-3 text-right font-mono">
                  {cutsTotalBoxes}
                </td>
                <td className="py-3 px-3 text-right font-mono font-bold text-emerald-800">
                  {formatPct(cutsTotalYieldPct, 2)}
                </td>
                <td className="py-3 px-3 text-right font-mono text-slate-600">
                  -
                </td>
                <td className="py-3 px-3 text-right font-mono">
                  -
                </td>
                <td className="py-3 px-3 text-right font-mono font-semibold text-slate-700">
                  {formatCurrency(cutsAvgPricePerKg)}
                </td>
                <td className="py-3 px-3 text-right font-mono font-black text-emerald-950 text-sm">
                  {formatCurrency(cutsTotalValue)}
                </td>
                <td className="py-3 px-3 text-center text-[10px] text-slate-500">
                  {aggregatedCuts.length} itens
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
};
