import React, { useState } from 'react';
import {
  Settings,
  Shield,
  DollarSign,
  Scale,
  Users,
  RotateCcw,
  CheckCircle2,
  Save,
  Beef,
  AlertTriangle
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { formatCurrency, formatPct } from '../utils/calculations';
import { IntranetDatabaseSection } from './IntranetDatabaseSection';

export const SettingsView: React.FC = () => {
  const {
    benchmarks,
    updateBenchmark,
    updateCarcassCost,
    resetToDemoData,
    users,
    currentUser,
    isAdmin,
  } = useApp();

  const [dtCost, setDtCost] = useState<number>(15.20);
  const [trCost, setTrCost] = useState<number>(21.80);
  const [saveSuccess, setSaveSuccess] = useState<string>('');
  const [benchmarkFilter, setBenchmarkFilter] = useState<'ALL' | 'DIANTEIRO' | 'TRASEIRO'>('ALL');

  const filteredBenchmarks = React.useMemo(() => {
    if (benchmarkFilter === 'ALL') return benchmarks;
    return benchmarks.filter((b) => b.type === benchmarkFilter);
  }, [benchmarks, benchmarkFilter]);

  const handleSaveCosts = (e: React.FormEvent) => {
    e.preventDefault();
    updateCarcassCost('DIANTEIRO', dtCost);
    updateCarcassCost('TRASEIRO', trCost);
    setSaveSuccess('Custos de carcaça atualizados e aplicados aos cálculos de margem!');
    setTimeout(() => setSaveSuccess(''), 3000);
  };

  const handleBenchmarkChange = (code: string, newPct: number) => {
    updateBenchmark(code, Math.max(0, newPct));
    setSaveSuccess('Padrão de mercado atualizado! Os desvios no One Page Report e nas Tabelas de Rendimento foram recalculados.');
    setTimeout(() => setSaveSuccess(''), 3500);
  };

  return (
    <div className="space-y-6 pb-12 max-w-5xl mx-auto">
      {/* Header */}
      <div className="bg-slate-900 text-white p-5 rounded-xl border border-slate-800 shadow-sm">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-xs font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
          <Settings className="w-3.5 h-3.5" />
          PARAMETRIZAÇÃO DO SISTEMA & AUDITORIA
        </div>
        <h2 className="text-xl font-bold mt-1 tracking-tight">
          Configuração de Custos de Carcaça e Padrões de Mercado
        </h2>
        <p className="text-xs text-slate-300 mt-0.5">
          Ajuste as referências utilizadas no cálculo das margens de lucro e desvios de rendimento
        </p>
      </div>

      {saveSuccess && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          {saveSuccess}
        </div>
      )}

      {/* Custo da Carcaça (Para Margem de Lucro) */}
      <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-2xs">
        <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-100">
          <DollarSign className="w-5 h-5 text-rose-800" />
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Custo Base da Matéria-Prima (Carcaça Bovina R$/kg)
            </h3>
            <p className="text-xs text-slate-500">
              Valor de aquisição da carcaça utilizado no cálculo da margem de lucro operacional
            </p>
          </div>
        </div>

        <form onSubmit={handleSaveCosts} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
            <div className="flex items-center gap-2 mb-2 font-bold text-slate-800 text-xs uppercase">
              <Beef className="w-4 h-4 text-amber-700" />
              Carcaça Dianteiro com Osso (DT)
            </div>
            <label className="block text-xs text-slate-600 mb-1">
              Custo por Kg (R$/kg):
            </label>
            <div className="relative">
              <input
                type="number"
                step="0.05"
                min={1}
                value={dtCost}
                onChange={(e) => setDtCost(Number(e.target.value))}
                className="w-full p-2 text-sm font-bold font-mono border border-slate-300 rounded-lg bg-white"
              />
              <span className="absolute right-3 top-2.5 text-xs text-slate-400 font-semibold">
                R$/kg
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Referência do anexo: R$ 15,20 / kg
            </p>
          </div>

          <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
            <div className="flex items-center gap-2 mb-2 font-bold text-slate-800 text-xs uppercase">
              <Beef className="w-4 h-4 text-rose-700" />
              Carcaça Traseiro com Osso (TR)
            </div>
            <label className="block text-xs text-slate-600 mb-1">
              Custo por Kg (R$/kg):
            </label>
            <div className="relative">
              <input
                type="number"
                step="0.05"
                min={1}
                value={trCost}
                onChange={(e) => setTrCost(Number(e.target.value))}
                className="w-full p-2 text-sm font-bold font-mono border border-slate-300 rounded-lg bg-white"
              />
              <span className="absolute right-3 top-2.5 text-xs text-slate-400 font-semibold">
                R$/kg
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Referência do anexo: R$ 21,80 / kg
            </p>
          </div>

          <div className="sm:col-span-2 flex justify-end">
            <button
              type="submit"
              className="px-4 py-2 bg-rose-900 hover:bg-rose-800 text-white rounded-lg text-xs font-bold transition-all shadow-xs flex items-center gap-1.5"
            >
              <Save className="w-4 h-4" />
              Salvar Custos de Carcaça
            </button>
          </div>
        </form>
      </div>

      {/* Padrões de Mercado por Tipo de Corte */}
      <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-2xs">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Scale className="w-5 h-5 text-rose-800" />
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Padrões de Rendimento de Mercado por Tipo de Corte (%)
              </h3>
              <p className="text-xs text-slate-500">
                Parâmetros agroindustriais sincronizados em tempo real com o One Page Report e as Tabelas de Rendimento (DT e TR)
              </p>
            </div>
          </div>

          <div className="flex items-center bg-slate-100 p-0.5 rounded-lg text-xs font-semibold">
            <button
              type="button"
              onClick={() => setBenchmarkFilter('ALL')}
              className={`px-3 py-1 rounded-md transition-all ${
                benchmarkFilter === 'ALL'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Todos ({benchmarks.length})
            </button>
            <button
              type="button"
              onClick={() => setBenchmarkFilter('DIANTEIRO')}
              className={`px-3 py-1 rounded-md transition-all ${
                benchmarkFilter === 'DIANTEIRO'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-amber-800'
              }`}
            >
              Dianteiro (DT)
            </button>
            <button
              type="button"
              onClick={() => setBenchmarkFilter('TRASEIRO')}
              className={`px-3 py-1 rounded-md transition-all ${
                benchmarkFilter === 'TRASEIRO'
                  ? 'bg-rose-700 text-white shadow-xs'
                  : 'text-slate-600 hover:text-rose-800'
              }`}
            >
              Traseiro (TR)
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredBenchmarks.map((b) => (
            <div
              key={b.code}
              className="p-3 rounded-lg border border-slate-200 bg-slate-50/50 hover:bg-white transition-colors"
            >
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-900 block truncate max-w-[190px]">
                    {b.name}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    Cód: {b.code}
                  </span>
                </div>
                <span
                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded self-start ${
                    b.type === 'DIANTEIRO' ? 'bg-amber-100 text-amber-900' : 'bg-rose-100 text-rose-900'
                  }`}
                >
                  {b.type === 'DIANTEIRO' ? 'DT' : 'TR'}
                </span>
              </div>
              <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-500 font-medium">Meta Mercado:</span>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    step="0.05"
                    min={0}
                    max={60}
                    value={b.expectedYieldPct}
                    onChange={(e) => handleBenchmarkChange(b.code, Number(e.target.value))}
                    className="w-16 p-1 text-right font-mono font-bold border border-slate-300 rounded bg-white focus:outline-hidden focus:border-rose-500"
                  />
                  <span className="font-bold text-slate-600">%</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Banco de Dados Excel no Drive da Intranet */}
      <IntranetDatabaseSection />

      {/* Perfis de Acesso e Níveis de Segurança */}
      <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-2xs">
        <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-100">
          <Shield className="w-5 h-5 text-rose-800" />
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Níveis de Acesso e Segurança (Perfis de Usuário)
            </h3>
            <p className="text-xs text-slate-500">
              Conforme requisitos de segurança e segregação de funções
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/50">
            <span className="text-xs font-bold px-2 py-0.5 rounded bg-emerald-200 text-emerald-900">
              PERFIL ADMIN
            </span>
            <h4 className="text-sm font-bold text-slate-900 mt-2">Acesso Geral ao APP</h4>
            <p className="text-xs text-slate-600 mt-1 leading-relaxed">
              Permissão irrestrita: parametrização de custos de carcaça, metas de mercado, inclusão e exclusão de relatórios, upload, relatórios gerenciais e gerenciamento.
            </p>
          </div>

          <div className="p-4 rounded-xl border border-blue-200 bg-blue-50/50">
            <span className="text-xs font-bold px-2 py-0.5 rounded bg-blue-200 text-blue-900">
              PERFIL GERENCIAL
            </span>
            <h4 className="text-sm font-bold text-slate-900 mt-2">Operação & Relatórios</h4>
            <p className="text-xs text-slate-600 mt-1 leading-relaxed">
              Inclusão de informações diárias, upload dos relatórios SisAtak RETQ010, geração e exportação do ONE PAGE REPORT, controle de turnos e operadores.
            </p>
          </div>

          <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/50">
            <span className="text-xs font-bold px-2 py-0.5 rounded bg-amber-200 text-amber-900">
              PERFIL DIRETORIA
            </span>
            <h4 className="text-sm font-bold text-slate-900 mt-2">Apenas Visualização</h4>
            <p className="text-xs text-slate-600 mt-1 leading-relaxed">
              Acesso executivo de consulta: monitoramento de dashboards, gráficos comparativos de desempenho semanal, visualização e impressão do One Page Report. Sem permissão de upload ou alteração.
            </p>
          </div>
        </div>
      </div>

      {/* Reset System Data */}
      <div className="p-4 rounded-xl border border-slate-200 bg-white flex flex-wrap items-center justify-between gap-4">
        <div>
          <h4 className="text-xs font-bold text-slate-900 uppercase">
            Restaurar Dados Originais de Demonstração
          </h4>
          <p className="text-xs text-slate-500">
            Restaura os relatórios autênticos do SisAtak RETQ010 (Dianteiro 25/08 e Traseiro 28/08)
          </p>
        </div>
        <button
          onClick={() => {
            if (confirm('Deseja restaurar todos os dados originais dos relatórios anexados?')) {
              resetToDemoData();
              setSaveSuccess('Dados restaurados com sucesso para os arquivos oficiais anexados!');
              setTimeout(() => setSaveSuccess(''), 3000);
            }
          }}
          className="px-3 py-1.5 border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Restaurar Demonstração
        </button>
      </div>
    </div>
  );
};
