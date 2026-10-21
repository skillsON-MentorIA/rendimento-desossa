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

export const CostelaView: React.FC = () => {
  const { records, filteredRecords, benchmarks } = useApp();

  // All Costela records in the system
  const allCtRecords = React.useMemo(() => {
    return records.filter((r) => r.type === 'COSTELA');
  }, [records]);

  // Batch selector state: 'auto' | 'all' | specific record ID
  const [selectedBatchId, setSelectedBatchId] = React.useState<string>('auto');

  // Determine active Costela records to display
  const ctRecords = React.useMemo(() => {
    if (selectedBatchId === 'all') {
      return allCtRecords;
    }
    if (selectedBatchId !== 'auto') {
      const match = allCtRecords.find((r) => r.id === selectedBatchId);
      if (match) return [match];
    }
    // Auto mode: prefer filtered records if any match COSTELA; fallback to most recent CT record
    const filteredCt = filteredRecords.filter((r) => r.type === 'COSTELA');
    if (filteredCt.length > 0) return filteredCt;
    if (allCtRecords.length > 0) return [allCtRecords[0]];
    return [];
  }, [selectedBatchId, filteredRecords, allCtRecords]);

  // Current active display label
  const activeBatchLabel = React.useMemo(() => {
    if (selectedBatchId === 'all') return `Consolidado (${allCtRecords.length} Lotes Costela)`;
    if (ctRecords.length === 1) {
      const r = ctRecords[0];
      return `${r.date.split('-').reverse().join('/')} - ${r.shift} (${formatKg(r.rawMaterialWeightKg, 1)})`;
    }
    if (ctRecords.length > 1) {
      return `Filtro Selecionado (${ctRecords.length} Lotes Costela)`;
    }
    return 'Nenhum lote Costela encontrado';
  }, [selectedBatchId, ctRecords, allCtRecords]);

  // Aggregate cuts from the resolved Costela records
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

    ctRecords.forEach((r) => {
      totalMP += r.rawMaterialWeightKg;
      r.cuts.forEach((cut) => {
        if (!cutMap[cut.code]) {
          const benchmark = findBenchmarkForCut(cut, benchmarks, 'COSTELA');
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

    return Object.values(cutMap).map((cut) => {
      const yieldActualPct = totalMP > 0 ? (cut.totalWeightKg / totalMP) * 100 : 0;
      const unitPriceAvg = cut.totalWeightKg > 0 ? cut.totalValue / cut.totalWeightKg : cut.unitPriceAvg;
      const deviationPct = cut.yieldExpectedPct > 0 ? yieldActualPct - cut.yieldExpectedPct : 0;

      return {
        ...cut,
        yieldActualPct,
        unitPriceAvg,
        deviationPct,
      };
    }).sort((a, b) => b.totalWeightKg - a.totalWeightKg);
  }, [ctRecords, benchmarks]);

  // Totais Gerais
  const totalRawMaterial = ctRecords.reduce((a, b) => a + b.rawMaterialWeightKg, 0);
  const totalBoxesIn = ctRecords.reduce((a, b) => a + b.rawMaterialBoxes, 0);
  const totalFinished = ctRecords.reduce((a, b) => a + b.finishedProductWeightKg, 0);
  const totalBone = ctRecords.reduce((a, b) => a + b.boneWeightKg, 0);
  const totalFat = ctRecords.reduce((a, b) => a + b.fatWeightKg, 0);
  const totalNonSaleable = totalBone + totalFat;
  const totalLoss = ctRecords.reduce((a, b) => a + b.lossKg, 0);
  const totalValue = ctRecords.reduce((a, b) => a + b.finishedProductTotalValue, 0);
  const totalCost = ctRecords.reduce((a, b) => a + b.totalCarcassCost, 0);
  const grossProfit = totalValue - totalCost;
  const profitMarginPct = totalValue > 0 ? (grossProfit / totalValue) * 100 : 0;

  // Somatórios diretos da Tabela Analítica (Cortes e Subprodutos)
  const cutsTotalWeight = aggregatedCuts.reduce((acc, c) => acc + c.totalWeightKg, 0);
  const cutsTotalBoxes = aggregatedCuts.reduce((acc, c) => acc + c.totalBoxes, 0);
  const cutsTotalValue = aggregatedCuts.reduce((acc, c) => acc + c.totalValue, 0);
  const cutsTotalYieldPct = totalRawMaterial > 0 ? (cutsTotalWeight / totalRawMaterial) * 100 : 0;
  const cutsAvgPricePerKg = cutsTotalWeight > 0 ? cutsTotalValue / cutsTotalWeight : 0;
  const avgPieceCostPerKg = totalRawMaterial > 0 ? totalCost / totalRawMaterial : 0;

  // Proporção / Margem Bruta da Desossa da Peça:
  const operationGrossProfit = cutsTotalValue - totalCost;
  const operationMarginOnRevenuePct = cutsTotalValue > 0 ? (operationGrossProfit / cutsTotalValue) * 100 : 0;
  const operationMarginOnCostPct = totalCost > 0 ? (operationGrossProfit / totalCost) * 100 : 0;
  const pieceRevenueRatioPct = totalCost > 0 ? (cutsTotalValue / totalCost) * 100 : 0;

  const avgLossPct = totalRawMaterial > 0 ? (totalLoss / totalRawMaterial) * 100 : 0;
  const totalSaleableCuts = Math.max(0, totalFinished - totalNonSaleable);
  const totalPiece = (totalSaleableCuts + totalBone + totalFat + totalLoss) > 0
    ? (totalSaleableCuts + totalBone + totalFat + totalLoss)
    : totalRawMaterial;
  const avgDeboningYieldPct = totalPiece > 0
    ? (totalSaleableCuts / totalPiece) * 100
    : 0;

  const bonePct = totalRawMaterial > 0 ? (totalBone / totalRawMaterial) * 100 : 0;
  const fatPct = totalRawMaterial > 0 ? (totalFat / totalRawMaterial) * 100 : 0;
  const nonSaleablePct = totalRawMaterial > 0 ? (totalNonSaleable / totalRawMaterial) * 100 : 0;

  // Rendimento dos cortes agrupados por tipo vs padrão oficial da Costela
  const groupedSummary = React.useMemo(() => {
    return calculateGroupedYields(ctRecords, 'COSTELA');
  }, [ctRecords]);

  return (
    <div className="space-y-6">
      {/* Header & Sub-view Selector */}
      <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-2xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-amber-900/10 border border-amber-300 flex items-center justify-center text-amber-900">
              <Beef className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-amber-900 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                  Setor Bovino • Costela (CT)
                </span>
                <span className="text-xs text-slate-500 font-medium font-mono">
                  Matéria-Prima: Peças Bovinas
                </span>
              </div>
              <h2 className="text-xl font-black text-slate-900 tracking-tight mt-0.5">
                Desossa de Costela Bovina & Rendimento de Cortes
              </h2>
            </div>
          </div>

          {/* Selector de Lotes de Costela */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5">
              <Filter className="w-4 h-4 text-slate-500" />
              <label htmlFor="ct-batch-select" className="text-xs font-bold text-slate-700">
                Lote CT:
              </label>
              <select
                id="ct-batch-select"
                value={selectedBatchId}
                onChange={(e) => setSelectedBatchId(e.target.value)}
                className="bg-transparent text-xs font-semibold text-slate-800 focus:outline-none cursor-pointer"
              >
                <option value="auto">Automático ({activeBatchLabel})</option>
                <option value="all">Consolidar Todos ({allCtRecords.length} lotes)</option>
                {allCtRecords.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.date.split('-').reverse().join('/')} - {r.shift} ({formatKg(r.rawMaterialWeightKg, 0)} • {r.rawMaterialBoxes} peças)
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Cards: Matéria-Prima em Peças, Faturamento, Custo e Margem */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Entrada Peças */}
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase">
            <span>Matéria-Prima (Peças)</span>
            <Scale className="w-4 h-4 text-amber-800" />
          </div>
          <div className="text-2xl font-black font-mono text-slate-900 mt-2">
            {formatKg(totalRawMaterial, 1)}
          </div>
          <div className="text-xs text-slate-500 mt-1 flex items-center justify-between">
            <span>{totalBoxesIn} {totalBoxesIn === 1 ? 'Peça' : 'Peças'}</span>
            <span className="font-mono font-bold text-amber-900">
              Méd: {totalBoxesIn > 0 ? formatWeightNum(totalRawMaterial / totalBoxesIn, 1) : '0,0'} kg/pç
            </span>
          </div>
        </div>

        {/* Faturamento dos Cortes */}
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase">
            <span>Faturamento Cortes</span>
            <DollarSign className="w-4 h-4 text-blue-700" />
          </div>
          <div className="text-2xl font-black font-mono text-blue-900 mt-2">
            {formatCurrency(cutsTotalValue)}
          </div>
          <div className="text-xs text-slate-500 mt-1 flex items-center justify-between">
            <span>PA: {formatKg(cutsTotalWeight, 1)}</span>
            <span className="font-mono font-bold text-blue-900">
              Méd: {formatCurrency(cutsAvgPricePerKg)}/kg
            </span>
          </div>
        </div>

        {/* Custo da Peça Comprada */}
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase">
            <span>Custo da Peça Comprada</span>
            <Calculator className="w-4 h-4 text-rose-700" />
          </div>
          <div className="text-2xl font-black font-mono text-rose-900 mt-2">
            {formatCurrency(totalCost)}
          </div>
          <div className="text-xs text-slate-500 mt-1 flex items-center justify-between">
            <span>Base Custo MP:</span>
            <span className="font-mono font-bold text-rose-900">
              {formatCurrency(avgPieceCostPerKg)}/kg
            </span>
          </div>
        </div>

        {/* Margem Bruta Agregada */}
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase">
            <span>Margem Bruta Desossa</span>
            <TrendingUp className="w-4 h-4 text-emerald-700" />
          </div>
          <div className={`text-2xl font-black font-mono mt-2 ${operationGrossProfit >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
            {formatCurrency(operationGrossProfit)}
          </div>
          <div className="text-xs text-slate-500 mt-1 flex items-center justify-between">
            <span>Margem Comercial:</span>
            <span className={`font-mono font-bold ${operationMarginOnRevenuePct >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
              {formatPct(operationMarginOnRevenuePct, 2)}
            </span>
          </div>
        </div>
      </div>

      {/* Tabela de Rendimento Oficial dos Cortes de Costela */}
      <GroupedYieldTable
        summary={groupedSummary}
        title="Rendimento dos Cortes de Costela vs Padrão Oficial"
        subtitle="Minga, Ripa, Matambre, Recorte, Osso e Sebo da Costela"
      />

      {/* Tabela Analítica de Todos os Cortes da Costela */}
      <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-2xs">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
              Tabela Analítica e Financeira dos Cortes da Costela
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
                <th className="py-2.5 px-3 text-right">Preço Médio (R$/kg)</th>
                <th className="py-2.5 px-3 text-right">Valor Total (R$)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {aggregatedCuts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500">
                    Nenhum corte do setor de Costela encontrado para os parâmetros selecionados.
                  </td>
                </tr>
              ) : (
                aggregatedCuts.map((cut) => (
                  <tr
                    key={cut.code}
                    className={`hover:bg-slate-50/80 transition-colors ${
                      cut.isNonSaleable ? 'bg-amber-50/30 text-amber-950 font-medium' : ''
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
                    <td className="py-2.5 px-3 text-right font-mono text-slate-700">
                      {formatCurrency(cut.unitPriceAvg)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-black text-slate-900">
                      {formatCurrency(cut.totalValue)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            <tfoot>
              {/* Linha 1: Somatório dos Cortes e Subprodutos */}
              <tr className="bg-slate-100 text-slate-900 font-bold border-t-2 border-slate-300">
                <td className="py-2.5 px-3 uppercase tracking-wide">
                  1. Faturamento Total dos Produtos Acabados (PA)
                </td>
                <td className="py-2.5 px-3 text-center">
                  <span className="text-[10px] font-bold text-slate-700 bg-slate-200 px-1.5 py-0.5 rounded uppercase">
                    Total PA
                  </span>
                </td>
                <td className="py-2.5 px-3 text-right font-mono font-black text-slate-900">
                  {formatWeightNum(cutsTotalWeight, 3)}
                </td>
                <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-700">
                  {cutsTotalBoxes}
                </td>
                <td className="py-2.5 px-3 text-right font-mono font-black text-slate-900">
                  {formatPct(cutsTotalYieldPct, 2)}
                </td>
                <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-700">
                  {formatCurrency(cutsAvgPricePerKg)}
                </td>
                <td className="py-2.5 px-3 text-right font-mono font-black text-blue-950 bg-blue-100/70">
                  {formatCurrency(cutsTotalValue)}
                </td>
              </tr>

              {/* Linha 2: Valor Total da PEÇA COMPRADA */}
              <tr className="bg-rose-50/90 text-rose-950 font-bold border-t border-rose-200">
                <td className="py-2.5 px-3 flex items-center gap-1.5 text-rose-950">
                  <span className="w-2 h-2 rounded-full bg-rose-600 shrink-0" />
                  <span>(-) Custo da Peça Comprada (Matéria-Prima com Osso)</span>
                </td>
                <td className="py-2.5 px-3 text-center">
                  <span className="text-[10px] font-bold text-rose-800 bg-rose-100 px-1.5 py-0.5 rounded uppercase">
                    Entrada
                  </span>
                </td>
                <td className="py-2.5 px-3 text-right font-mono font-semibold text-rose-950">
                  {formatWeightNum(totalRawMaterial, 3)}
                </td>
                <td className="py-2.5 px-3 text-right font-mono text-slate-600">
                  {totalBoxesIn} pçs
                </td>
                <td className="py-2.5 px-3 text-right font-mono font-semibold text-rose-900">
                  100,00%
                </td>
                <td className="py-2.5 px-3 text-right font-mono font-semibold text-rose-900">
                  {formatCurrency(avgPieceCostPerKg)}
                </td>
                <td className="py-2.5 px-3 text-right font-mono font-black text-rose-950 bg-rose-100/70">
                  {formatCurrency(totalCost)}
                </td>
              </tr>

              {/* Linha 3: MARGEM BRUTA DA OPERAÇÃO DA DESOSSA */}
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
                <td className="py-3 px-3 text-right font-mono font-black text-emerald-950 text-sm bg-emerald-200/90">
                  {formatCurrency(operationGrossProfit)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
};
