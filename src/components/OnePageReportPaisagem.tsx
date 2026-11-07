import React, { useState, useMemo } from 'react';
import {
  Printer,
  Calendar,
  Layers,
  Scale,
  Users,
  AlertTriangle,
  TrendingUp,
  Beef,
  CheckCircle2,
  FileSpreadsheet,
  Smartphone,
  ChevronDown,
  Percent,
  Bone
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { ProductionRecord, CutType } from '../types';
import {
  formatKg,
  formatPct,
  calculateEffectiveTotalWorkforce
} from '../utils/calculations';

interface OnePageReportPaisagemProps {
  onNavigateToGeneralReport?: () => void;
  onNavigateToMobileCockpit?: () => void;
}

export const OnePageReportPaisagem: React.FC<OnePageReportPaisagemProps> = ({
  onNavigateToGeneralReport,
  onNavigateToMobileCockpit
}) => {
  const { records } = useApp();

  // Lista de meses disponíveis nos registros ordenados cronologicamente decrescente
  const availableMonths = useMemo(() => {
    const monthSet = new Set<string>();
    records.forEach((r) => {
      if (r.date && r.date.length >= 7) {
        monthSet.add(r.date.substring(0, 7)); // YYYY-MM
      }
    });
    const arr = Array.from(monthSet).sort((a, b) => b.localeCompare(a));
    return arr;
  }, [records]);

  // Mês selecionado por padrão: o mais recente ou mês atual
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    return availableMonths[0] || new Date().toISOString().substring(0, 7);
  });

  // Filtragem dos registros pelo mês selecionado
  const monthRecords = useMemo(() => {
    if (!selectedMonth) return records;
    return records.filter((r) => r.date && r.date.startsWith(selectedMonth));
  }, [records, selectedMonth]);

  // Formatação do nome do mês para exibição
  const monthFormattedName = useMemo(() => {
    if (!selectedMonth) return 'Período Completo';
    const [y, m] = selectedMonth.split('-');
    const months = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
    const monthName = months[parseInt(m, 10) - 1] || m;
    return `${monthName} de ${y}`;
  }, [selectedMonth]);

  // Consolidação Geral do Mês
  const generalSummary = useMemo(() => {
    if (monthRecords.length === 0) {
      return {
        lotes: 0,
        entradaKg: 0,
        qtdPecas: 0,
        saidaKg: 0,
        rendimentoNetPct: 0,
        subProdutosKg: 0,
        subProdutosPct: 0,
        quebraKg: 0,
        quebraPct: 0,
        produtividadeMedia: 0,
        pesoMedioPeca: 0,
        efetivoTotalPessoasDia: 0
      };
    }

    const lotes = monthRecords.length;
    const entradaKg = monthRecords.reduce((acc, r) => acc + (r.rawMaterialWeightKg || 0), 0);
    const qtdPecas = monthRecords.reduce((acc, r) => acc + (r.rawMaterialBoxes || 0), 0);
    const saidaKg = monthRecords.reduce((acc, r) => acc + (r.finishedProductWeightKg || 0), 0);
    const subProdutosKg = monthRecords.reduce((acc, r) => acc + (r.boneWeightKg || 0) + (r.fatWeightKg || 0), 0);
    const quebraKg = monthRecords.reduce((acc, r) => acc + (r.lossKg || 0), 0);

    const rendimentoNetPct = entradaKg > 0 ? ((saidaKg - subProdutosKg) / entradaKg) * 100 : 0;
    const subProdutosPct = entradaKg > 0 ? (subProdutosKg / entradaKg) * 100 : 0;
    const quebraPct = entradaKg > 0 ? (quebraKg / entradaKg) * 100 : 0;
    const pesoMedioPeca = qtdPecas > 0 ? entradaKg / qtdPecas : 0;

    const efetivoTotalPessoasDia = calculateEffectiveTotalWorkforce(monthRecords);
    const produtividadeMedia = efetivoTotalPessoasDia > 0 ? entradaKg / efetivoTotalPessoasDia : 0;

    return {
      lotes,
      entradaKg,
      qtdPecas,
      saidaKg,
      rendimentoNetPct,
      subProdutosKg,
      subProdutosPct,
      quebraKg,
      quebraPct,
      produtividadeMedia,
      pesoMedioPeca,
      efetivoTotalPessoasDia
    };
  }, [monthRecords]);

  // 2) OS 4 BOXES DE INDICADORES ESTRATÉGICOS CONSOLIDADOS (UM PARA CADA TIPO DE CARNE)
  // Box 1: Dianteiro Bovino (DT)
  // Box 2: Traseiro Bovino (TR)
  // Box 3: Costela (CT)
  // Box 4: Suíno (SU)
  const cutTypesSummary = useMemo(() => {
    const types: {
      key: CutType;
      label: string;
      fullName: string;
      code: string;
      icon: string;
      badgeColor: string;
      headerBg: string;
      borderAccent: string;
      benchmarkYield: number;
    }[] = [
      {
        key: 'DIANTEIRO',
        label: 'DIANTEIRO BOVINO',
        fullName: 'Dianteiro Bovino com Osso (DT)',
        code: 'DT',
        icon: '🐮',
        badgeColor: 'bg-amber-100 text-amber-900 border-amber-300',
        headerBg: 'bg-amber-50/80 border-amber-200',
        borderAccent: 'border-l-4 border-l-amber-600',
        benchmarkYield: 77.5
      },
      {
        key: 'TRASEIRO',
        label: 'TRASEIRO BOVINO',
        fullName: 'Traseiro Bovino Especial (TR)',
        code: 'TR',
        icon: '🥩',
        badgeColor: 'bg-rose-100 text-rose-900 border-rose-300',
        headerBg: 'bg-rose-50/80 border-rose-200',
        borderAccent: 'border-l-4 border-l-rose-700',
        benchmarkYield: 80.0
      },
      {
        key: 'COSTELA',
        label: 'COSTELA BOVINA',
        fullName: 'Costela Bovina (CT)',
        code: 'CT',
        icon: '🍖',
        badgeColor: 'bg-orange-100 text-orange-900 border-orange-300',
        headerBg: 'bg-orange-50/80 border-orange-200',
        borderAccent: 'border-l-4 border-l-orange-600',
        benchmarkYield: 68.0
      },
      {
        key: 'SUINO',
        label: 'SUÍNO INDUSTRIAL',
        fullName: 'Carcaça Suína Inteira (SU)',
        code: 'SU',
        icon: '🥓',
        badgeColor: 'bg-pink-100 text-pink-900 border-pink-300',
        headerBg: 'bg-pink-50/80 border-pink-200',
        borderAccent: 'border-l-4 border-l-pink-600',
        benchmarkYield: 75.0
      }
    ];

    const totalEntradaGeral = generalSummary.entradaKg || 1;

    const rows = types.map((t) => {
      const recs = monthRecords.filter((r) => r.type === t.key);
      const lotes = recs.length;
      const entradaKg = recs.reduce((acc, r) => acc + (r.rawMaterialWeightKg || 0), 0);
      const qtdPecas = recs.reduce((acc, r) => acc + (r.rawMaterialBoxes || 0), 0);
      const saidaKg = recs.reduce((acc, r) => acc + (r.finishedProductWeightKg || 0), 0);
      const subProdutosKg = recs.reduce((acc, r) => acc + (r.boneWeightKg || 0) + (r.fatWeightKg || 0), 0);
      const quebraKg = recs.reduce((acc, r) => acc + (r.lossKg || 0), 0);

      const rendimentoNetPct = entradaKg > 0 ? ((saidaKg - subProdutosKg) / entradaKg) * 100 : 0;
      const subProdutosPct = entradaKg > 0 ? (subProdutosKg / entradaKg) * 100 : 0;
      const quebraPct = entradaKg > 0 ? (quebraKg / entradaKg) * 100 : 0;
      const pesoMedioPeca = qtdPecas > 0 ? entradaKg / qtdPecas : 0;

      const workforce = calculateEffectiveTotalWorkforce(recs);
      const produtividade = workforce > 0 ? entradaKg / workforce : 0;

      const pctTotal = (entradaKg / totalEntradaGeral) * 100;

      return {
        key: t.key,
        label: t.label,
        fullName: t.fullName,
        code: t.code,
        icon: t.icon,
        badgeColor: t.badgeColor,
        headerBg: t.headerBg,
        borderAccent: t.borderAccent,
        benchmarkYield: t.benchmarkYield,
        lotes,
        entradaKg,
        pctTotal,
        qtdPecas,
        pesoMedioPeca,
        saidaKg,
        rendimentoNetPct,
        subProdutosKg,
        subProdutosPct,
        quebraKg,
        quebraPct,
        produtividade,
        workforce
      };
    });

    return rows;
  }, [monthRecords, generalSummary.entradaKg]);

  // Função para imprimir no formato paisagem
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-slate-100 p-2 sm:p-4 text-slate-800 font-sans print:p-0 print:bg-white print:min-h-0 print:text-black">
      {/* Forçar @page para Paisagem (Landscape) na Impressão Oficial */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @page {
              size: A4 landscape;
              margin: 4.5mm;
            }
            @media print {
              html, body, #root, .min-h-screen, main {
                background: #ffffff !important;
                background-color: #ffffff !important;
                color: #000000 !important;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
                margin: 0 !important;
                padding: 0 !important;
              }
              .one-page-landscape-sheet {
                box-shadow: none !important;
                border: 1px solid #94a3b8 !important;
                border-radius: 0px !important;
                width: 100% !important;
                max-width: 100% !important;
                height: 100% !important;
                max-height: 200mm !important;
                margin: 0 auto !important;
                padding: 3.5mm 4.5mm !important;
                box-sizing: border-box !important;
                overflow: hidden !important;
                background: #ffffff !important;
                page-break-after: avoid !important;
                page-break-inside: avoid !important;
                break-inside: avoid !important;
              }
            }
          `
        }}
      />

      {/* =========================================================================
          BARRA DE CONTROLES SUPERIOR (OCULTA NA IMPRESSÃO)
         ========================================================================= */}
      <div className="max-w-[1440px] mx-auto mb-3 bg-white border border-slate-200 rounded-2xl p-3 shadow-sm flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div className="flex items-center gap-3">
          <div className="h-9 px-2.5 py-1 rounded-xl bg-white border border-slate-200 flex items-center justify-center shadow-xs">
            <img src="/bh_foods_logo.png" alt="BH Foods" className="h-6 w-auto object-contain" />
          </div>
          <div>
            <h1 className="text-sm font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
              <span>ONE PAGE REPORT MENSAL</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold border border-emerald-300">
                Orientação Paisagem (Landscape)
              </span>
            </h1>
            <p className="text-[11px] text-slate-500">
              Relatório Executivo Consolidado: Indicadores Estratégicos por Tipo de Carne (DT, TR, CT, SU)
            </p>
          </div>
        </div>

        {/* Filtros e Ações */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Seletor de Mês */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs">
            <Calendar className="w-4 h-4 text-slate-500" />
            <label className="text-[11px] font-bold text-slate-600 uppercase">Mês:</label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-transparent font-bold text-slate-800 focus:outline-none cursor-pointer pr-1"
            >
              {availableMonths.map((m) => {
                const [y, mo] = m.split('-');
                const names = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
                const label = `${names[parseInt(mo, 10) - 1]} / ${y}`;
                return (
                  <option key={m} value={m}>
                    {label}
                  </option>
                );
              })}
            </select>
          </div>

          {/* Botão de Imprimir / PDF */}
          <button
            type="button"
            onClick={handlePrint}
            className="px-3.5 py-2 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-950/20 flex items-center gap-1.5 cursor-pointer transition-all active:scale-95"
            title="Imprimir ou salvar em PDF na orientação paisagem"
          >
            <Printer className="w-4 h-4" />
            <span>Imprimir / Salvar PDF</span>
          </button>

          {/* Links rápidos para outras visões */}
          {onNavigateToGeneralReport && (
            <button
              type="button"
              onClick={onNavigateToGeneralReport}
              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-rose-700" />
              <span>OPR Detalhado</span>
            </button>
          )}

          {onNavigateToMobileCockpit && (
            <button
              type="button"
              onClick={onNavigateToMobileCockpit}
              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors"
            >
              <Smartphone className="w-3.5 h-3.5 text-emerald-700" />
              <span>Cockpit Mobile</span>
            </button>
          )}
        </div>
      </div>

      {/* =========================================================================
          FOLHA OFICIAL ONE PAGE REPORT MENSAL (1 PÁGINA A4 PAISAGEM)
         ========================================================================= */}
      <div className="max-w-[1440px] mx-auto bg-white rounded-2xl shadow-xl border border-slate-300 p-4 one-page-landscape-sheet flex flex-col justify-between">
        
        {/* 1) CABEÇALHO CORPORATIVO BH FOODS (MANTIDO) */}
        <header className="border-b-2 border-slate-800 pb-2 mb-2 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 px-2.5 py-0.5 bg-white rounded-lg border border-slate-200 flex items-center justify-center shadow-xs">
              <img src="/bh_foods_logo.png" alt="BH Foods" className="h-8 w-auto object-contain" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-mono tracking-widest text-rose-800 font-bold block leading-none">
                BH FOODS COMÉRCIO E INDÚSTRIA LTDA • SETOR INDUSTRIAL
              </span>
              <h1 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight uppercase leading-tight mt-0.5">
                ONE PAGE REPORT MENSAL • LINHA DE DESOSSA
              </h1>
              <p className="text-[11px] text-slate-500 font-medium">
                Painel Estratégico Consolidado por Linha de Desossa (DT, TR, CT, SU)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 text-right">
            <div className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 shadow-2xs">
              <span className="text-[9px] uppercase tracking-wider text-slate-400 font-bold block leading-none">
                Mês de Referência
              </span>
              <span className="text-sm font-black text-rose-800">
                {monthFormattedName}
              </span>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 shadow-2xs hidden sm:block">
              <span className="text-[9px] uppercase tracking-wider text-slate-400 font-bold block leading-none">
                Lotes Catalogados
              </span>
              <span className="text-sm font-black text-slate-800">
                {generalSummary.lotes} lote(s)
              </span>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 shadow-2xs hidden sm:block text-left">
              <span className="text-[9px] uppercase tracking-wider text-slate-400 font-bold block leading-none">
                Emissão
              </span>
              <span className="text-xs font-semibold text-slate-700">
                {new Date().toLocaleDateString('pt-BR')}
              </span>
            </div>
          </div>
        </header>

        {/* =========================================================================
            2) OS 4 BOXES DE INDICADORES ESTRATÉGICOS (CONSOLIDADO DO MÊS)
            Sendo 1 box para cada tipo de carne:
            - BOX 1: DIANTEIRO BOVINO (DT)
            - BOX 2: TRASEIRO BOVINO (TR)
            - BOX 3: COSTELA (CT)
            - BOX 4: SUÍNO (SU)
            Dispostos em uma grade 2x2 com alta densidade e clareza analítica
           ========================================================================= */}
        <section className="mb-2">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-600 inline-block"></span>
              2. Painéis de Indicadores Estratégicos por Tipo de Carne (Consolidado do Mês)
            </span>
            <span className="text-[9px] text-slate-400 font-medium">
              Indicadores apurados especificamente para cada matéria-prima
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {cutTypesSummary.map((cut) => {
              const hasData = cut.lotes > 0;
              return (
                <div
                  key={cut.key}
                  className={`bg-white rounded-xl border border-slate-300 shadow-2xs p-2.5 flex flex-col justify-between ${cut.borderAccent}`}
                >
                  {/* Cabeçalho do Box do Tipo de Carne */}
                  <div className="flex items-center justify-between pb-1.5 border-b border-slate-200 mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-base">{cut.icon}</span>
                      <div>
                        <h2 className="text-xs font-black text-slate-900 uppercase tracking-tight leading-tight">
                          {cut.label} <span className="text-slate-400 font-mono">({cut.code})</span>
                        </h2>
                        <span className="text-[9px] text-slate-500 font-medium">
                          {cut.fullName}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                        {cut.lotes} lote(s)
                      </span>
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded-md border ${cut.badgeColor}`}>
                        {cut.pctTotal.toFixed(1).replace('.', ',')}% do Total
                      </span>
                    </div>
                  </div>

                  {/* Grade Interna de Indicadores Estratégicos (Igual à versão Mobile) */}
                  <div className="grid grid-cols-4 gap-1.5">
                    {/* 1. Entrada (Kg) */}
                    <div className="bg-slate-50 p-1.5 rounded-lg border border-slate-200">
                      <span className="text-[8px] font-bold uppercase text-slate-500 block leading-tight">
                        1. Entrada (Kg)
                      </span>
                      <span className="text-xs sm:text-sm font-black text-cyan-900 leading-tight block mt-0.5">
                        {hasData ? formatKg(cut.entradaKg, 0) : '-'}
                      </span>
                      <span className="text-[8px] text-slate-400 block">Matéria-Prima</span>
                    </div>

                    {/* 2. Qtd. Peças / Peso Médio */}
                    <div className="bg-slate-50 p-1.5 rounded-lg border border-slate-200">
                      <span className="text-[8px] font-bold uppercase text-slate-500 block leading-tight">
                        2. Qtd. Peças
                      </span>
                      <span className="text-xs sm:text-sm font-black text-indigo-900 leading-tight block mt-0.5">
                        {hasData ? `${cut.qtdPecas.toLocaleString('pt-BR')} pçs` : '-'}
                      </span>
                      <span className="text-[8px] text-slate-400 block">
                        {hasData && cut.pesoMedioPeca > 0 ? `${cut.pesoMedioPeca.toFixed(1).replace('.', ',')} kg/pç` : '-'}
                      </span>
                    </div>

                    {/* 3. Saída (Kg) */}
                    <div className="bg-slate-50 p-1.5 rounded-lg border border-slate-200">
                      <span className="text-[8px] font-bold uppercase text-slate-500 block leading-tight">
                        3. Saída (Kg)
                      </span>
                      <span className="text-xs sm:text-sm font-black text-emerald-900 leading-tight block mt-0.5">
                        {hasData ? formatKg(cut.saidaKg, 0) : '-'}
                      </span>
                      <span className="text-[8px] text-slate-400 block">Total Cortes</span>
                    </div>

                    {/* 4. Rendimento Desossa (%) */}
                    <div className="bg-emerald-50/90 p-1.5 rounded-lg border border-emerald-300">
                      <div className="flex items-center justify-between">
                        <span className="text-[8px] font-black uppercase text-emerald-900 leading-tight">
                          4. Rendimento
                        </span>
                        <span className="text-[7px] text-emerald-700 font-bold">Meta {cut.benchmarkYield}%</span>
                      </div>
                      <span className="text-xs sm:text-sm font-black text-emerald-700 leading-tight block mt-0.5">
                        {hasData && cut.rendimentoNetPct > 0 ? `${cut.rendimentoNetPct.toFixed(2).replace('.', ',')}%` : '-'}
                      </span>
                      <span className="text-[8px] text-emerald-800 font-medium block">Líquido Desossa</span>
                    </div>

                    {/* 5. Sub Produtos */}
                    <div className="bg-slate-50 p-1.5 rounded-lg border border-slate-200">
                      <span className="text-[8px] font-bold uppercase text-slate-500 block leading-tight">
                        5. Sub Produtos
                      </span>
                      <span className="text-xs sm:text-sm font-black text-amber-900 leading-tight block mt-0.5">
                        {hasData && cut.subProdutosPct > 0 ? `${cut.subProdutosPct.toFixed(2).replace('.', ',')}%` : '-'}
                      </span>
                      <span className="text-[8px] text-slate-400 block truncate">
                        {hasData ? `${formatKg(cut.subProdutosKg, 0)} (Osso/Sebo)` : '-'}
                      </span>
                    </div>

                    {/* 6. Perda / Quebra */}
                    <div className={`p-1.5 rounded-lg border ${
                      hasData && cut.quebraPct > 1.0 ? 'bg-rose-50 border-rose-300' : 'bg-slate-50 border-slate-200'
                    }`}>
                      <div className="flex items-center justify-between">
                        <span className="text-[8px] font-bold uppercase text-slate-500 leading-tight">
                          6. Quebra
                        </span>
                        <span className={`text-[7px] font-bold px-1 rounded ${
                          hasData && cut.quebraPct > 1.0 ? 'bg-rose-200 text-rose-900' : 'bg-emerald-100 text-emerald-800'
                        }`}>
                          {hasData && cut.quebraPct > 1.0 ? 'Alerta' : '≤1%'}
                        </span>
                      </div>
                      <span className={`text-xs sm:text-sm font-black leading-tight block mt-0.5 ${
                        hasData && cut.quebraPct > 1.0 ? 'text-rose-700' : 'text-slate-800'
                      }`}>
                        {hasData ? `${cut.quebraPct.toFixed(3).replace('.', ',')}%` : '-'}
                      </span>
                      <span className="text-[8px] text-slate-400 block truncate">
                        {hasData ? formatKg(cut.quebraKg, 0) : '-'}
                      </span>
                    </div>

                    {/* 7. Produtividade */}
                    <div className="bg-slate-50 p-1.5 rounded-lg border border-slate-200">
                      <span className="text-[8px] font-bold uppercase text-slate-500 block leading-tight">
                        7. Produtiv.
                      </span>
                      <span className="text-xs sm:text-sm font-black text-sky-900 leading-tight block mt-0.5">
                        {hasData && cut.produtividade > 0 ? `${cut.produtividade.toFixed(0)}` : '-'}
                      </span>
                      <span className="text-[8px] text-slate-400 block">kg/pessoa/dia</span>
                    </div>

                    {/* 8. Peso Médio Unitário */}
                    <div className="bg-slate-50 p-1.5 rounded-lg border border-slate-200">
                      <span className="text-[8px] font-bold uppercase text-slate-500 block leading-tight">
                        8. Peso Médio
                      </span>
                      <span className="text-xs sm:text-sm font-black text-slate-800 leading-tight block mt-0.5">
                        {hasData && cut.pesoMedioPeca > 0 ? `${cut.pesoMedioPeca.toFixed(1).replace('.', ',')} kg` : '-'}
                      </span>
                      <span className="text-[8px] text-slate-400 block">In Natura c/ Osso</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* =========================================================================
            3) TABELA CONSOLIDADA POR TIPO DE DESOSSA NO MÊS
            Conforme solicitado: Manter APENAS as colunas:
            - TIPO DE DESOSSA
            - QTD. LOTES
            - ENTRADA (Kg)
            - % DO TOTAL
            Layout harmônico integrado com barra de distribuição proporcional
           ========================================================================= */}
        <section className="mb-2">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-rose-700 inline-block"></span>
              3. Tabela Consolidada por Tipo de Desossa no Mês (Volume de Entrada e Representatividade)
            </span>
            <span className="text-[9px] text-slate-400 font-medium">
              Dados auditados do SisAtak Industrial
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-stretch">
            {/* Tabela de 4 colunas estritas */}
            <div className="lg:col-span-8 overflow-hidden border border-slate-300 rounded-xl shadow-2xs">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="bg-slate-900 text-white font-black uppercase tracking-wider text-[9px]">
                    <th className="py-2 px-3">TIPO DE DESOSSA</th>
                    <th className="py-2 px-3 text-center">QTD. LOTES</th>
                    <th className="py-2 px-3 text-right">ENTRADA (Kg)</th>
                    <th className="py-2 px-3 text-right bg-slate-800">% DO TOTAL</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 font-medium text-[11px]">
                  {cutTypesSummary.map((row) => (
                    <tr key={row.key} className="hover:bg-slate-50 transition-colors">
                      <td className="py-2 px-3 font-bold text-slate-900 flex items-center gap-2">
                        <span className="text-sm">{row.icon}</span>
                        <span>{row.fullName}</span>
                      </td>
                      <td className="py-2 px-3 text-center font-bold text-slate-700">
                        {row.lotes}
                      </td>
                      <td className="py-2 px-3 text-right font-bold text-cyan-950 font-mono">
                        {formatKg(row.entradaKg, 0)}
                      </td>
                      <td className="py-2 px-3 text-right font-black text-slate-900 bg-slate-50/80">
                        {row.pctTotal.toFixed(1).replace('.', ',')}%
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-900 text-white font-black text-[11px] border-t-2 border-slate-950">
                    <td className="py-2 px-3 uppercase tracking-wide flex items-center gap-2">
                      <span>🌐</span>
                      <span>TOTAL CONSOLIDADO</span>
                    </td>
                    <td className="py-2 px-3 text-center text-cyan-300 font-mono">
                      {generalSummary.lotes}
                    </td>
                    <td className="py-2 px-3 text-right text-cyan-300 font-mono">
                      {formatKg(generalSummary.entradaKg, 0)}
                    </td>
                    <td className="py-2 px-3 text-right text-emerald-300 bg-slate-800 font-mono">
                      100,0%
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Painel Lateral Harmônico de Apoio: Barra de Distribuição & Destaques de Produção */}
            <div className="lg:col-span-4 bg-slate-50 border border-slate-300 rounded-xl p-3 flex flex-col justify-between shadow-2xs">
              <div>
                <span className="text-[10px] font-bold text-slate-700 uppercase tracking-tight block mb-2">
                  Distribuição Percentual de Entrada (Mix da Indústria)
                </span>

                {/* Barra Visual Proporcional Multi-Segmentada */}
                <div className="h-3 w-full rounded-full overflow-hidden flex bg-slate-200 border border-slate-300 mb-2.5">
                  {cutTypesSummary.map((cut) => {
                    let color = 'bg-amber-500';
                    if (cut.key === 'TRASEIRO') color = 'bg-rose-600';
                    if (cut.key === 'COSTELA') color = 'bg-orange-500';
                    if (cut.key === 'SUINO') color = 'bg-pink-500';
                    if (cut.pctTotal <= 0) return null;
                    return (
                      <div
                        key={cut.key}
                        style={{ width: `${cut.pctTotal}%` }}
                        className={`${color} h-full transition-all`}
                        title={`${cut.label}: ${cut.pctTotal.toFixed(1)}%`}
                      />
                    );
                  })}
                </div>

                {/* Legenda com Valores */}
                <div className="grid grid-cols-2 gap-1.5 text-[10px]">
                  {cutTypesSummary.map((cut) => (
                    <div key={cut.key} className="flex items-center justify-between bg-white px-2 py-1 rounded border border-slate-200">
                      <span className="flex items-center gap-1 font-semibold text-slate-700 truncate">
                        <span>{cut.icon}</span>
                        <span>{cut.code}:</span>
                      </span>
                      <span className="font-black text-slate-900">{cut.pctTotal.toFixed(1).replace('.', ',')}%</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Indicador Global Síntese da Fábrica */}
              <div className="mt-2 pt-2 border-t border-slate-200 flex items-center justify-between text-[10px]">
                <span className="text-slate-500 font-medium">Rendimento Médio Global:</span>
                <span className="font-black text-emerald-800 text-xs">
                  {generalSummary.rendimentoNetPct.toFixed(2).replace('.', ',')}%
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* =========================================================================
            RODAPÉ OFICIAL (SEM CAMPOS DE ASSINATURA, CONFORME SOLICITADO)
           ========================================================================= */}
        <footer className="pt-2 border-t border-slate-300 flex items-center justify-between text-[10px] text-slate-500">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-800">BH Foods Comércio e Indústria Ltda</span>
            <span>•</span>
            <span>SisAtak Industrial • Linha Industrial de Desossa</span>
            <span>•</span>
            <span className="font-bold text-rose-800">One Page Report Mensal</span>
          </div>

          <div className="text-right text-[9px] text-slate-400">
            Documento Gerencial Confidencial • Uso Interno e Restrito à Diretoria
          </div>
        </footer>

      </div>
    </div>
  );
};
