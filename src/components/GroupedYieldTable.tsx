import React from 'react';
import { GroupedYieldSummary } from '../utils/cutGrouping';
import { formatKg, formatPct } from '../utils/calculations';
import { ArrowDownRight, ArrowUpRight, CheckCircle2, ShieldAlert } from 'lucide-react';

interface GroupedYieldTableProps {
  summary: GroupedYieldSummary;
  title?: string;
  subtitle?: string;
  compact?: boolean;
}

export const GroupedYieldTable: React.FC<GroupedYieldTableProps> = ({
  summary,
  title = 'Rendimento Apurado por Tipo de Carne vs Padrão Oficial',
  subtitle = 'Análise operacional de peso e rendimento (%) sem impacto financeiro',
  compact = false,
}) => {
  const { items, totalYieldActualPct, totalYieldExpectedPct, rawMaterialWeightKg } = summary;

  const totalWeightKg = items.reduce((acc, i) => acc + i.weightKg, 0);
  const totalDeviation = totalYieldActualPct - totalYieldExpectedPct;

  return (
    <div className={`bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden ${compact ? 'text-[10px]' : 'text-xs'}`}>
      {/* Table Header */}
      <div className={`${compact ? 'p-2.5' : 'p-4'} border-b border-slate-100 flex flex-wrap items-center justify-between gap-2 bg-slate-50/70`}>
        <div>
          <h3 className={`font-black uppercase tracking-wider text-slate-900 ${compact ? 'text-xs' : 'text-sm'}`}>
            {title}
          </h3>
          {subtitle && (
            <p className="text-[11px] text-slate-500 mt-0.5">
              {subtitle} • Matéria-Prima: <strong>{formatKg(rawMaterialWeightKg, 0)}</strong>
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 text-[10px] font-bold border border-emerald-200">
            Padrão Referência Oficial
          </span>
        </div>
      </div>

      {/* Table Content */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-100/90 text-slate-700 font-bold uppercase text-[10.5px] border-b border-slate-200">
              <th className={`${compact ? 'py-1.5 px-2' : 'py-2.5 px-3.5'}`}>Tipo de Carne / Subproduto</th>
              <th className={`${compact ? 'py-1.5 px-2' : 'py-2.5 px-3'} text-right`}>Peso Apurado (kg)</th>
              <th className={`${compact ? 'py-1.5 px-2' : 'py-2.5 px-3'} text-right`}>% Apurado</th>
              <th className={`${compact ? 'py-1.5 px-2' : 'py-2.5 px-3'} text-right`}>% Padrão</th>
              <th className={`${compact ? 'py-1.5 px-2' : 'py-2.5 px-3'} text-right`}>Desvio (%)</th>
              <th className={`${compact ? 'py-1.5 px-2' : 'py-2.5 px-3.5'} text-center`}>Situação</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {items.map((item) => {
              const absDev = Math.abs(item.deviationPct);
              const isOk = absDev <= 0.35;
              const isAbove = item.deviationPct > 0.35;
              const isBelow = item.deviationPct < -0.35;

              // Diferenciação visual para Subprodutos (Osso e Sebo)
              const rowBg = item.isSubProduct ? 'bg-amber-50/40 hover:bg-amber-50/70' : 'hover:bg-slate-50/80';

              return (
                <tr key={item.id} className={`transition-colors ${rowBg}`}>
                  <td className={`${compact ? 'py-1 px-2' : 'py-2 px-3.5'} font-bold text-slate-800 flex items-center gap-1.5`}>
                    <span className={`w-2 h-2 rounded-full shrink-0 ${item.isSubProduct ? 'bg-amber-500' : 'bg-slate-400'}`} />
                    <span>{item.name}</span>
                    {item.isSubProduct && (
                      <span className="text-[9px] font-semibold text-amber-800 bg-amber-100/80 px-1.5 py-0.2 rounded border border-amber-200">
                        Subproduto
                      </span>
                    )}
                  </td>
                  <td className={`${compact ? 'py-1 px-2' : 'py-2 px-3'} text-right font-mono font-bold text-slate-900`}>
                    {formatKg(item.weightKg, 2)}
                  </td>
                  <td className={`${compact ? 'py-1 px-2' : 'py-2 px-3'} text-right font-mono font-black text-slate-900`}>
                    {formatPct(item.yieldActualPct, 2)}
                  </td>
                  <td className={`${compact ? 'py-1 px-2' : 'py-2 px-3'} text-right font-mono font-semibold text-slate-600`}>
                    {formatPct(item.yieldExpectedPct, 2)}
                  </td>
                  <td
                    className={`${compact ? 'py-1 px-2' : 'py-2 px-3'} text-right font-mono font-bold ${
                      isOk ? 'text-slate-600' : isAbove ? 'text-emerald-700' : 'text-rose-700'
                    }`}
                  >
                    {item.deviationPct > 0 ? `+${formatPct(item.deviationPct, 2)}` : formatPct(item.deviationPct, 2)}
                  </td>
                  <td className={`${compact ? 'py-1 px-2' : 'py-2 px-3.5'} text-center`}>
                    {isOk ? (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        No Padrão
                      </span>
                    ) : isAbove ? (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <ArrowUpRight className="w-3 h-3" />
                        + Acima
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                        <ArrowDownRight className="w-3 h-3" />
                        - Abaixo
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="bg-slate-100/95 font-black text-slate-900 border-t-2 border-slate-300 text-[11px]">
              <td className={`${compact ? 'py-2 px-2' : 'py-3 px-3.5'} uppercase tracking-wide`}>
                Total Apurado (Cortes + Subprodutos)
              </td>
              <td className={`${compact ? 'py-2 px-2' : 'py-3 px-3'} text-right font-mono`}>
                {formatKg(totalWeightKg, 2)}
              </td>
              <td className={`${compact ? 'py-2 px-2' : 'py-3 px-3'} text-right font-mono text-emerald-800`}>
                {formatPct(totalYieldActualPct, 2)}
              </td>
              <td className={`${compact ? 'py-2 px-2' : 'py-3 px-3'} text-right font-mono text-slate-700`}>
                {formatPct(totalYieldExpectedPct, 2)}
              </td>
              <td
                className={`${compact ? 'py-2 px-2' : 'py-3 px-3'} text-right font-mono ${
                  totalDeviation >= 0 ? 'text-emerald-800' : 'text-rose-800'
                }`}
              >
                {totalDeviation > 0 ? `+${formatPct(totalDeviation, 2)}` : formatPct(totalDeviation, 2)}
              </td>
              <td className={`${compact ? 'py-2 px-2' : 'py-3 px-3.5'} text-center text-[10px] text-slate-500 font-bold`}>
                {rawMaterialWeightKg > totalWeightKg ? `Quebra: ${formatPct(((rawMaterialWeightKg - totalWeightKg) / rawMaterialWeightKg) * 100, 2)}` : '100%'}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
};
