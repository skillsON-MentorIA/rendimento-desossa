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
  Percent
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { formatCurrency, formatKg, formatPct, formatWeightNum } from '../utils/calculations';
import { findBenchmarkForCut } from '../utils/benchmarkMatcher';
import { GroupedYieldTable } from './GroupedYieldTable';
import { calculateGroupedYields } from '../utils/cutGrouping';

export const DianteiroView: React.FC = () => {
  const { records, filteredRecords, benchmarks } = useApp();

  // All Dianteiro records in the system
  const allDtRecords = React.useMemo(() => {
    return records.filter((r) => r.type === 'DIANTEIRO');
  }, [records]);

  // Batch selector state: 'auto' | 'all' | specific record ID
  const [selectedBatchId, setSelectedBatchId] = React.useState<string>('auto');

  // Determine active Dianteiro records to display
  const dtRecords = React.useMemo(() => {
    if (selectedBatchId === 'all') {
      return allDtRecords;
    }
    if (selectedBatchId !== 'auto') {
      const match = allDtRecords.find((r) => r.id === selectedBatchId);
      if (match) return [match];
    }
    // Auto mode: prefer filtered records if any match DIANTEIRO; fallback to most recent DT record
    const filteredDt = filteredRecords.filter((r) => r.type === 'DIANTEIRO');
    if (filteredDt.length > 0) return filteredDt;
    if (allDtRecords.length > 0) return [allDtRecords[0]];
    return [];
  }, [selectedBatchId, filteredRecords, allDtRecords]);

  // Current active display label
  const activeBatchLabel = React.useMemo(() => {
    if (selectedBatchId === 'all') return `Consolidado (${allDtRecords.length} Lotes DT)`;
    if (dtRecords.length === 1) {
      const r = dtRecords[0];
      return `${r.date.split('-').reverse().join('/')} - ${r.shift} (${formatKg(r.rawMaterialWeightKg, 1)})`;
    }
    if (dtRecords.length > 1) {
      return `Filtro Selecionado (${dtRecords.length} Lotes DT)`;
    }
    return 'Nenhum lote DT encontrado';
  }, [selectedBatchId, dtRecords, allDtRecords]);

  // Aggregate cuts from the resolved Dianteiro records
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

    dtRecords.forEach((r) => {
      totalMP += r.rawMaterialWeightKg;
      r.cuts.forEach((cut) => {
        if (!cutMap[cut.code]) {
          const benchmark = findBenchmarkForCut(cut, benchmarks, 'DIANTEIRO');
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
  }, [dtRecords, benchmarks]);

  const totalRawMaterial = dtRecords.reduce((a, b) => a + b.rawMaterialWeightKg, 0);
  const totalFinished = dtRecords.reduce((a, b) => a + b.finishedProductWeightKg, 0);
  const totalBone = dtRecords.reduce((a, b) => a + b.boneWeightKg, 0);
  const totalFat = dtRecords.reduce((a, b) => a + b.fatWeightKg, 0);
  const totalNonSaleable = totalBone + totalFat;
  const totalLoss = dtRecords.reduce((a, b) => a + b.lossKg, 0);
  const totalValue = dtRecords.reduce((a, b) => a + b.finishedProductTotalValue, 0);
  const totalCost = dtRecords.reduce((a, b) => a + b.totalCarcassCost, 0);
  const grossProfit = totalValue - totalCost;
  const profitMarginPct = totalValue > 0 ? (grossProfit / totalValue) * 100 : 0;

  // Somatórios diretos da Tabela Analítica (Cortes e Subprodutos)
  const cutsTotalWeight = aggregatedCuts.reduce((acc, c) => acc + c.totalWeightKg, 0);
  const cutsTotalBoxes = aggregatedCuts.reduce((acc, c) => acc + c.totalBoxes, 0);
  const cutsTotalValue = aggregatedCuts.reduce((acc, c) => acc + c.totalValue, 0);
  const cutsTotalYieldPct = totalRawMaterial > 0 ? (cutsTotalWeight / totalRawMaterial) * 100 : 0;
  const cutsAvgPricePerKg = cutsTotalWeight > 0 ? cutsTotalValue / cutsTotalWeight : 0;
  const avgCarcassCostPerKg = totalRawMaterial > 0 ? totalCost / totalRawMaterial : 0;

  // Proporção / Margem Bruta da Desossa:
  // Somatório do VALOR TOTAL (em R$) confrontado proporcionalmente com o Valor Total da CARCAÇA COMPRADA
  const operationGrossProfit = cutsTotalValue - totalCost;
  // Margem Bruta Comercial (% sobre o Faturamento da Desossa):
  const operationMarginOnRevenuePct = cutsTotalValue > 0 ? (operationGrossProfit / cutsTotalValue) * 100 : 0;
  // Margem / Markup sobre o Custo da Carcaça Comprada (%):
  const operationMarginOnCostPct = totalCost > 0 ? (operationGrossProfit / totalCost) * 100 : 0;
  // Relação Percentual de Retorno da Carcaça (Faturamento / Custo):
  const carcassRevenueRatioPct = totalCost > 0 ? (cutsTotalValue / totalCost) * 100 : 0;

  const avgLossPct = totalRawMaterial > 0 ? (totalLoss / totalRawMaterial) * 100 : 0;
  const totalSaleableCuts = Math.max(0, totalFinished - totalNonSaleable);
  
  // Peso Total da Carcaça = Carnes Vendáveis + Osso + Sebo + Quebra (Perda)
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
    return calculateGroupedYields(dtRecords, 'DIANTEIRO');
  }, [dtRecords]);

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner com Seletor de Lote Integrado */}
      <div className="bg-gradient-to-r from-amber-950 via-slate-900 to-slate-900 text-white p-5 rounded-xl border border-amber-900/40 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
              <Beef className="w-3.5 h-3.5" />
              SETOR DIANTEIRO BOVINO (DT)
            </div>
            <h2 className="text-xl font-bold mt-1 tracking-tight">
              Desossa da Parte Dianteira & Rendimento por Corte
            </h2>
            <p className="text-xs text-slate-300 mt-0.5">
              Monitoramento analítico de Acém, Paleta, Peito, Músculo, Osso e Sebo vs Padrão de Mercado
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
                className="bg-slate-900 text-white text-xs font-semibold rounded px-2 py-1.5 border border-slate-600 focus:outline-hidden focus:border-amber-400 cursor-pointer"
              >
                <option value="auto">Automático (Lote Recente / Filtro Ativo)</option>
                <option value="all">Consolidado (Todos os {allDtRecords.length} Lotes DT)</option>
                <optgroup label="Lotes Individuais Dianteiro">
                  {allDtRecords.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.date.split('-').reverse().join('/')} - {r.shift} ({formatKg(r.rawMaterialWeightKg, 0)})
                    </option>
                  ))}
                </optgroup>
              </select>
            </div>

            <div className="text-right pl-3 border-l border-slate-700/60 hidden sm:block">
              <span className="text-xs text-slate-400 block">Total Matéria-Prima DT</span>
              <span className="text-2xl font-black text-amber-400 font-mono">
                {formatKg(totalRawMaterial, 1)}
              </span>
            </div>
          </div>
        </div>

        {/* Status do Lote Selecionado */}
        <div className="mt-3 pt-2.5 border-t border-slate-800 flex flex-wrap items-center justify-between text-xs text-slate-300 gap-2">
          <span className="flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-amber-400" />
            Exibindo: <strong className="text-white">{activeBatchLabel}</strong>
          </span>
          <span className="text-slate-400">
            Total de Cortes e Subprodutos Cadastrados: <strong className="text-amber-300">{aggregatedCuts.length}</strong>
          </span>
        </div>
      </div>

      {/* KPI Cards DT */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Rendimento Desossa DT */}
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between h-full min-h-[156px]">
          <div className="flex items-center justify-between text-slate-500 mb-2 h-7">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 truncate" title="Rendimento Líquido da Desossa: Carnes Vendáveis sobre Carcaça">
              Rend. Desossa DT
            </span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
              <Scale className="w-4 h-4" />
            </div>
          </div>
          <div className="my-auto py-1">
            <div className="text-2xl font-black text-emerald-700 tracking-tight whitespace-nowrap">
              {formatPct(avgDeboningYieldPct, 2)}
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-xs min-h-[34px]">
            <span className="text-slate-500 text-[11px] whitespace-nowrap">Carnes Vendáveis:</span>
            <span className="font-bold text-slate-800 text-xs whitespace-nowrap">{formatKg(totalSaleableCuts, 0)}</span>
          </div>
        </div>

        {/* 2. Perda / Quebra */}
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between h-full min-h-[156px]">
          <div className="flex items-center justify-between text-slate-500 mb-2 h-7">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 truncate" title="Perda de Desossa (Quebra Técnica)">
              Perda / Quebra
            </span>
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${avgLossPct <= 0.8 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="my-auto py-1">
            <div className="text-2xl font-black text-slate-900 tracking-tight whitespace-nowrap">
              {formatPct(avgLossPct, 3)}
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-xs min-h-[34px]">
            <span className="text-slate-500 text-[11px] whitespace-nowrap">
              Quebra: <strong className="text-slate-700 font-bold">{formatKg(totalLoss, 0)}</strong>
            </span>
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded whitespace-nowrap ${avgLossPct <= 0.8 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
              {avgLossPct <= 0.8 ? 'No Limite' : 'Acima Teto'}
            </span>
          </div>
        </div>

        {/* 3. Sub Produtos (Osso + Sebo) */}
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between h-full min-h-[156px]">
          <div className="flex items-center justify-between text-slate-500 mb-2 h-7">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 truncate" title="Subprodutos do Dianteiro: Osso e Sebo">
              Sub Produtos DT
            </span>
            <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center shrink-0">
              <Bone className="w-4 h-4" />
            </div>
          </div>
          <div className="my-auto py-1">
            <div className="flex items-baseline gap-1.5 whitespace-nowrap">
              <span className="text-2xl font-black text-slate-900 tracking-tight">
                {formatPct(nonSaleablePct, 2)}
              </span>
              <span className="text-xs font-semibold text-slate-500 font-mono">
                ({formatKg(totalNonSaleable, 0)})
              </span>
            </div>
          </div>
          <div className="mt-3 pt-1.5 border-t border-slate-100 flex flex-col justify-center text-[10.5px] min-h-[34px] text-slate-600 gap-0.5">
            <div className="flex items-center justify-between whitespace-nowrap">
              <span className="text-slate-500">Osso:</span>
              <span className="text-slate-800">
                <strong className="font-bold">{formatKg(totalBone, 0)}</strong>{' '}
                <span className="text-slate-600 font-mono text-[10px] font-bold">({formatPct(bonePct, 2)})</span>
              </span>
            </div>
            <div className="flex items-center justify-between whitespace-nowrap">
              <span className="text-slate-500">Sebo:</span>
              <span className="text-slate-800">
                <strong className="font-bold">{formatKg(totalFat, 0)}</strong>{' '}
                <span className="text-slate-600 font-mono text-[10px] font-bold">({formatPct(fatPct, 2)})</span>
              </span>
            </div>
          </div>
        </div>

        {/* 4. Margem de Lucro DT */}
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between h-full min-h-[156px]">
          <div className="flex items-center justify-between text-slate-500 mb-2 h-7">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 truncate" title="Margem Bruta da Operação da Desossa sobre o Somatório dos Cortes">
              Margem de Lucro DT
            </span>
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
              operationMarginOnRevenuePct >= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
            }`}>
              {operationMarginOnRevenuePct >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
            </div>
          </div>
          <div className="my-auto py-1">
            <div className={`text-2xl font-black tracking-tight whitespace-nowrap ${
              operationMarginOnRevenuePct >= 0 ? 'text-emerald-700' : 'text-rose-600'
            }`}>
              {formatPct(operationMarginOnRevenuePct, 2)}
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-xs min-h-[34px]">
            <span className="text-slate-500 text-[11px] whitespace-nowrap">Margem Bruta:</span>
            <span className={`font-bold text-xs whitespace-nowrap ${
              operationGrossProfit >= 0 ? 'text-emerald-700' : 'text-rose-600'
            }`}>{formatCurrency(operationGrossProfit)}</span>
          </div>
        </div>
      </div>

      {/* Tabela de Rendimento Operacional por Tipo de Carne vs Padrão (Sem Dados Financeiros) */}
      <GroupedYieldTable
        summary={groupedYieldSummary}
        title="Rendimento dos Cortes Agrupados por Tipo vs Padrão Oficial (Dianteiro)"
        subtitle="Quadro operacional de rendimento físico (%) e conformidade técnica (Acém, Maçã, Paleta, Músculo, Recorte, Osso e Sebo)"
      />

      {/* Table: Rendimento dos Cortes vs Padrão de Mercado */}
      <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-2xs">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
              Tabela Analítica e Financeira dos Cortes do Dianteiro
            </h3>
            <p className="text-xs text-slate-500">
              Detalhamento de peso apurado, caixas, rendimento (%) e faturamento individualizado
            </p>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <span className="flex items-center gap-1 text-emerald-700 font-semibold">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              Dentro do Padrão / Positivo
            </span>
            <span className="flex items-center gap-1 text-rose-700 font-semibold">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
              Desvio Negativo
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-600 font-semibold border-y border-slate-200">
                <th className="py-2.5 px-3">Descrição do Produto / Corte</th>
                <th className="py-2.5 px-3 text-center">Tipo</th>
                <th className="py-2.5 px-3 text-right">Peso Total (kg)</th>
                <th className="py-2.5 px-3 text-right">Caixas</th>
                <th className="py-2.5 px-3 text-right">Rend. Apurado (%)</th>
                <th className="py-2.5 px-3 text-right">Padrão Mercado (%)</th>
                <th className="py-2.5 px-3 text-right">Desvio (%)</th>
                <th className="py-2.5 px-3 text-right">Preço Médio (R$/kg)</th>
                <th className="py-2.5 px-3 text-right">Valor Total (R$)</th>
                <th className="py-2.5 px-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {aggregatedCuts.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-slate-500">
                    Nenhum corte do setor dianteiro encontrado para os parâmetros selecionados.
                  </td>
                </tr>
              ) : (
                aggregatedCuts.map((cut) => {
                  const hasBenchmark = cut.yieldExpectedPct > 0;
                  const isUnder = hasBenchmark && cut.deviationPct < -0.3;

                  return (
                    <tr
                      key={cut.code}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        cut.isNonSaleable ? 'bg-slate-50/40 text-slate-500' : ''
                      }`}
                    >
                      <td className="py-2.5 px-3 font-semibold text-slate-900">
                        {cut.name}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span
                          className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            cut.category === 'SUBPRODUTO_OSSO'
                              ? 'bg-slate-200 text-slate-700'
                              : cut.category === 'SUBPRODUTO_SEBO'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {cut.isNonSaleable ? 'Subproduto' : 'Corte Vendável'}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-medium text-slate-900">
                        {formatWeightNum(cut.totalWeightKg, 3)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-600">
                        {cut.totalBoxes}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                        {formatPct(cut.yieldActualPct, 2)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-800">
                        {hasBenchmark ? formatPct(cut.yieldExpectedPct, 2) : '-'}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold">
                        {hasBenchmark ? (
                          <span
                            className={`inline-flex items-center gap-0.5 ${
                              cut.deviationPct >= 0 ? 'text-emerald-600' : 'text-rose-600'
                            }`}
                          >
                            {cut.deviationPct >= 0 ? (
                              <ArrowUpRight className="w-3.5 h-3.5" />
                            ) : (
                              <ArrowDownRight className="w-3.5 h-3.5" />
                            )}
                            {cut.deviationPct >= 0 ? '+' : ''}
                            {cut.deviationPct.toFixed(2)}%
                          </span>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-700">
                        {formatCurrency(cut.unitPriceAvg)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                        {formatCurrency(cut.totalValue)}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        {cut.isNonSaleable ? (
                          <span className="text-[10px] font-semibold text-slate-500">Subproduto</span>
                        ) : !hasBenchmark ? (
                          <span className="text-[10px] font-medium text-slate-400">Sem Meta</span>
                        ) : isUnder ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-rose-100 text-rose-800">
                            <AlertTriangle className="w-3 h-3" /> Abaixo Meta
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                            <CheckCircle2 className="w-3 h-3" /> Conforme
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            <tfoot>
              {/* Linha 1: Somatório do VALOR TOTAL (em R$) de todos os cortes e subprodutos */}
              <tr className="bg-slate-100 text-slate-900 font-bold border-t-2 border-slate-300">
                <td className="py-2.5 px-3 uppercase tracking-wider text-slate-800">
                  Somatório dos Produtos Desossados (PA + Subprodutos)
                </td>
                <td className="py-2.5 px-3 text-center">
                  <span className="text-[10px] font-bold text-slate-700 bg-slate-200 px-1.5 py-0.5 rounded">
                    {aggregatedCuts.length} itens
                  </span>
                </td>
                <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                  {formatWeightNum(cutsTotalWeight, 3)}
                </td>
                <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-700">
                  {cutsTotalBoxes}
                </td>
                <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-800">
                  {formatPct(cutsTotalYieldPct, 2)}
                </td>
                <td className="py-2.5 px-3 text-right font-mono text-slate-400">-</td>
                <td className="py-2.5 px-3 text-right font-mono text-slate-400">-</td>
                <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-800">
                  {formatCurrency(cutsAvgPricePerKg)}
                </td>
                <td className="py-2.5 px-3 text-right font-mono font-black text-slate-950 bg-slate-200/70">
                  {formatCurrency(cutsTotalValue)}
                </td>
                <td className="py-2.5 px-3 text-center">
                  <span className="text-[10px] font-bold text-slate-700 bg-slate-200 px-1.5 py-0.5 rounded">
                    Faturamento
                  </span>
                </td>
              </tr>

              {/* Linha 2: Valor Total da CARCAÇA COMPRADA (Matéria-Prima de Entrada) */}
              <tr className="bg-amber-50/80 text-amber-950 font-bold border-t border-amber-200">
                <td className="py-2.5 px-3 flex items-center gap-1.5 text-amber-950">
                  <span className="w-2 h-2 rounded-full bg-amber-600 shrink-0" />
                  <span>(-) Custo da Carcaça Comprada (Matéria-Prima com Osso)</span>
                </td>
                <td className="py-2.5 px-3 text-center">
                  <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded uppercase">
                    Entrada
                  </span>
                </td>
                <td className="py-2.5 px-3 text-right font-mono font-semibold text-amber-950">
                  {formatWeightNum(totalRawMaterial, 3)}
                </td>
                <td className="py-2.5 px-3 text-right font-mono text-slate-400">-</td>
                <td className="py-2.5 px-3 text-right font-mono font-semibold text-amber-900">
                  100,00%
                </td>
                <td className="py-2.5 px-3 text-right font-mono text-slate-400">-</td>
                <td className="py-2.5 px-3 text-right font-mono text-slate-400">-</td>
                <td className="py-2.5 px-3 text-right font-mono font-semibold text-amber-900">
                  {formatCurrency(avgCarcassCostPerKg)}
                </td>
                <td className="py-2.5 px-3 text-right font-mono font-black text-amber-950 bg-amber-100/70">
                  {formatCurrency(totalCost)}
                </td>
                <td className="py-2.5 px-3 text-center">
                  <span className="text-[10px] font-bold text-amber-800 bg-amber-200/70 px-1.5 py-0.5 rounded">
                    Custo MP
                  </span>
                </td>
              </tr>

              {/* Linha 3: MARGEM BRUTA DA OPERAÇÃO DA DESOSSA (Solicitação do Cliente: Proporcionar Valor Total com a Carcaça Comprada) */}
              <tr className="bg-emerald-100/90 text-emerald-950 font-black border-t-2 border-emerald-400 text-[12.5px]">
                <td className="py-3 px-3 uppercase tracking-wide text-emerald-950 flex items-center gap-1.5">
                  <TrendingUp className="w-4 h-4 text-emerald-700 shrink-0" />
                  <span>(=) Margem Bruta da Operação da Desossa</span>
                </td>
                <td className="py-3 px-3 text-center">
                  <span className="text-[10px] font-black text-emerald-900 bg-emerald-200/80 px-2 py-0.5 rounded uppercase">
                    Resultado
                  </span>
                </td>
                <td className="py-3 px-3 text-right font-mono font-semibold text-slate-700 text-xs">
                  Quebra: {formatKg(totalLoss, 1)}
                </td>
                <td className="py-3 px-3 text-right font-mono text-slate-400 text-xs">-</td>
                <td className="py-3 px-3 text-right font-mono font-bold text-emerald-900 text-xs">
                  Rend: {formatPct(avgDeboningYieldPct, 2)}
                </td>
                <td className="py-3 px-3 text-right font-mono text-slate-400 text-xs">-</td>
                <td className="py-3 px-3 text-right font-mono text-slate-400 text-xs">-</td>
                <td className="py-3 px-3 text-right font-mono font-bold text-emerald-900 text-xs">
                  +{formatCurrency(cutsTotalWeight > 0 ? operationGrossProfit / cutsTotalWeight : 0)}/kg
                </td>
                <td className="py-3 px-3 text-right font-mono font-black text-emerald-950 text-sm bg-emerald-200/80">
                  {formatCurrency(operationGrossProfit)}
                </td>
                <td className="py-3 px-3 text-center">
                  <span className="inline-flex flex-col items-center justify-center px-2 py-0.5 rounded bg-emerald-800 text-white text-xs font-black shadow-2xs">
                    <span>{formatPct(operationMarginOnRevenuePct, 2)}</span>
                  </span>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Quadro Explicativo & Auditoria de Cálculo da Margem Bruta */}
        <div className="mt-4 pt-4 border-t border-slate-200 bg-slate-50/70 -mx-5 -mb-5 p-5 rounded-b-xl">
          <div className="flex items-center gap-2 mb-2.5">
            <Calculator className="w-4 h-4 text-emerald-700" />
            <h4 className="text-xs font-black text-slate-800 uppercase tracking-wide">
              Memória de Cálculo & Análise de Proporção da Margem da Desossa (DT)
            </h4>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
            {/* Box 1: Faturamento dos Produtos */}
            <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs">
              <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                1. Somatório do Valor Total
              </span>
              <div className="text-base font-black text-slate-900 font-mono">
                {formatCurrency(cutsTotalValue)}
              </div>
              <span className="text-[10px] text-slate-500 block mt-0.5">
                {formatKg(cutsTotalWeight, 1)} de carnes, osso e sebo
              </span>
            </div>

            {/* Box 2: Custo da Carcaça Comprada */}
            <div className="bg-white p-3 rounded-lg border border-amber-200 shadow-2xs">
              <span className="text-[10px] font-bold text-amber-900 uppercase block mb-1">
                2. (-) Carcaça Comprada
              </span>
              <div className="text-base font-black text-amber-900 font-mono">
                {formatCurrency(totalCost)}
              </div>
              <span className="text-[10px] text-amber-700 block mt-0.5">
                {formatKg(totalRawMaterial, 1)} × {formatCurrency(avgCarcassCostPerKg)}/kg
              </span>
            </div>

            {/* Box 3: Margem Bruta em R$ */}
            <div className={`p-3 rounded-lg border shadow-2xs ${
              operationGrossProfit >= 0 ? 'bg-white border-emerald-200' : 'bg-rose-50 border-rose-300'
            }`}>
              <span className={`text-[10px] font-bold uppercase block mb-1 ${
                operationGrossProfit >= 0 ? 'text-emerald-900' : 'text-rose-950'
              }`}>
                3. (=) Margem Bruta (R$)
              </span>
              <div className={`text-base font-black font-mono ${
                operationGrossProfit >= 0 ? 'text-emerald-800' : 'text-rose-600'
              }`}>
                {formatCurrency(operationGrossProfit)}
              </div>
              <span className={`text-[10px] block mt-0.5 ${
                operationGrossProfit >= 0 ? 'text-emerald-700' : 'text-rose-700'
              }`}>
                {operationGrossProfit >= 0 ? 'Ganho absoluto após desossar a carcaça' : 'Resultado deficitário da carcaça'}
              </span>
            </div>

            {/* Box 4: Indicadores Proporcionais */}
            <div className={`p-3 rounded-lg border shadow-2xs ${
              operationMarginOnRevenuePct >= 0
                ? 'bg-emerald-50 border-emerald-300'
                : 'bg-rose-50 border-rose-300'
            }`}>
              <span className={`text-[10px] font-bold uppercase block mb-1 ${
                operationMarginOnRevenuePct >= 0 ? 'text-emerald-950' : 'text-rose-950'
              }`}>
                4. Proporção & Margem Bruta
              </span>
              <div className="flex items-baseline gap-2">
                <span className={`text-base font-black font-mono ${
                  operationMarginOnRevenuePct >= 0 ? 'text-emerald-900' : 'text-rose-600'
                }`}>
                  {formatPct(operationMarginOnRevenuePct, 2)}
                </span>
                <span className={`text-[10px] font-bold ${
                  operationMarginOnRevenuePct >= 0 ? 'text-emerald-700' : 'text-rose-700'
                }`}>
                  (s/ Faturamento)
                </span>
              </div>
              <div className={`text-[10px] mt-1 flex items-center justify-between border-t pt-1 ${
                operationMarginOnRevenuePct >= 0 ? 'text-emerald-800 border-emerald-200' : 'text-rose-800 border-rose-200'
              }`}>
                <span>Markup s/ Carcaça:</span>
                <strong className="font-mono">+{formatPct(operationMarginOnCostPct, 2)}</strong>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
