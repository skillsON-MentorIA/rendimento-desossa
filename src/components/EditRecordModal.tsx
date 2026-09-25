import React, { useState, useEffect } from 'react';
import {
  X,
  CheckCircle2,
  AlertTriangle,
  UserCheck,
  Users,
  DollarSign,
  Calendar,
  Clock,
  FileEdit,
  Beef,
  Scale
} from 'lucide-react';
import { ProductionRecord } from '../types';
import { formatCurrency, formatKg, formatPct } from '../utils/calculations';

interface EditRecordModalProps {
  isOpen: boolean;
  onClose: () => void;
  record: ProductionRecord | null;
  onSave: (
    id: string,
    updates: {
      responsibleOperator?: string;
      operatorCount?: number;
      shift?: 'Turno 1' | 'Turno 2' | 'Turno 3';
      carcassCostPerKg?: number;
      date?: string;
      notes?: string;
      preDebonedInputKg?: number;
    }
  ) => void;
}

export const EditRecordModal: React.FC<EditRecordModalProps> = ({
  isOpen,
  onClose,
  record,
  onSave,
}) => {
  const [responsibleOperator, setResponsibleOperator] = useState(record?.responsibleOperator || '');
  const [operatorCount, setOperatorCount] = useState(record?.operatorCount || 20);
  const [shift, setShift] = useState<'Turno 1' | 'Turno 2' | 'Turno 3'>(record?.shift || 'Turno 1');
  const [carcassCostPerKg, setCarcassCostPerKg] = useState(record?.carcassCostPerKg || 15.5);
  const [preDebonedInputKg, setPreDebonedInputKg] = useState(record?.preDebonedInputKg || 0);
  const [date, setDate] = useState(record?.date || '');
  const [notes, setNotes] = useState(record?.notes || '');

  // Reset form when record changes or opens
  useEffect(() => {
    if (record) {
      setResponsibleOperator(record.responsibleOperator);
      setOperatorCount(record.operatorCount);
      setShift(record.shift);
      setCarcassCostPerKg(record.carcassCostPerKg);
      setPreDebonedInputKg(record.preDebonedInputKg || 0);
      setDate(record.date);
      setNotes(record.notes || '');
    }
  }, [record, isOpen]);

  if (!isOpen || !record) return null;

  // Recalculate live preview
  const estimatedTotalCost = record.rawMaterialWeightKg * carcassCostPerKg;
  const estimatedGrossProfit = record.finishedProductTotalValue - estimatedTotalCost;
  const estimatedMarginPct = record.finishedProductTotalValue > 0
    ? (estimatedGrossProfit / record.finishedProductTotalValue) * 100
    : 0;
  const estimatedProductivity = operatorCount > 0
    ? record.rawMaterialWeightKg / operatorCount
    : 0;

  // Desossa Mista e Rendimento da Desossa recalculado
  const estimatedDeboningEffectiveMeat = Math.max(0, record.saleableCutsWeightKg - preDebonedInputKg);
  const totalCarcass = (record.saleableCutsWeightKg + record.boneWeightKg + record.fatWeightKg + record.lossKg) || record.rawMaterialWeightKg;
  const estimatedCarcassWithBone = Math.max(0, totalCarcass - preDebonedInputKg);
  const estimatedDeboningYield = estimatedCarcassWithBone > 0
    ? (estimatedDeboningEffectiveMeat / estimatedCarcassWithBone) * 100
    : 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(record.id, {
      responsibleOperator,
      operatorCount,
      shift,
      carcassCostPerKg,
      date,
      notes,
      preDebonedInputKg,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <FileEdit className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold tracking-tight">
                  Corrigir Informações do Lote
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-900 text-rose-200 border border-rose-700">
                  {record.type === 'DIANTEIRO' ? 'DT - DIANTEIRO' : 'TR - TRASEIRO'}
                </span>
              </div>
              <p className="text-xs text-slate-300">
                Lote {record.id} • {record.date} • {formatKg(record.rawMaterialWeightKg)} MP
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5 flex-1 text-xs">
          <div className="p-3 bg-amber-50 border border-amber-200 text-amber-900 rounded-lg flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-amber-700 mt-0.5" />
            <div>
              <span className="font-bold block">Correção de Metadados Operacionais:</span>
              Os pesos e cortes do SisAtak são preservados. Ao alterar a quantidade de operadores ou custo da carcaça, o sistema recalculará instantaneamente a produtividade (kg/pessoa), custos e margens de lucro.
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Data da Produção */}
            <div>
              <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-500" />
                Data de Produção:
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                className="w-full p-2.5 border border-slate-300 rounded-lg bg-white font-medium focus:ring-2 focus:ring-rose-800/20"
              />
            </div>

            {/* Turno */}
            <div>
              <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-500" />
                Turno de Trabalho:
              </label>
              <select
                value={shift}
                onChange={(e) => setShift(e.target.value as any)}
                className="w-full p-2.5 border border-slate-300 rounded-lg bg-white font-medium focus:ring-2 focus:ring-rose-800/20"
              >
                <option value="Turno 1">Turno 1 (Manhã)</option>
                <option value="Turno 2">Turno 2 (Tarde)</option>
                <option value="Turno 3">Turno 3 (Noite)</option>
              </select>
            </div>

            {/* Líder / Encarregado */}
            <div>
              <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                <UserCheck className="w-3.5 h-3.5 text-slate-500" />
                Líder / Encarregado da Linha:
              </label>
              <input
                type="text"
                value={responsibleOperator}
                onChange={(e) => setResponsibleOperator(e.target.value)}
                required
                placeholder="Ex: Marcos Silveira"
                className="w-full p-2.5 border border-slate-300 rounded-lg bg-white font-medium focus:ring-2 focus:ring-rose-800/20"
              />
            </div>

            {/* Quantidade de Pessoas */}
            <div>
              <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-slate-500" />
                Nº de Pessoas / Operadores na Linha:
              </label>
              <input
                type="number"
                min={1}
                max={150}
                value={operatorCount}
                onChange={(e) => setOperatorCount(Number(e.target.value))}
                required
                className="w-full p-2.5 border border-slate-300 rounded-lg bg-white font-mono font-bold focus:ring-2 focus:ring-rose-800/20"
              />
            </div>

            {/* Custo da Carcaça */}
            <div>
              <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5 text-slate-500" />
                Custo Pago pela Carcaça (R$/kg):
              </label>
              <input
                type="number"
                step="0.05"
                min={1}
                value={carcassCostPerKg}
                onChange={(e) => setCarcassCostPerKg(Number(e.target.value))}
                required
                className="w-full p-2.5 border border-slate-300 rounded-lg bg-white font-mono font-bold focus:ring-2 focus:ring-rose-800/20"
              />
            </div>

            {/* Carne Já Desossada de Entrada (Desossa Mista) */}
            <div>
              <label className="block font-bold text-amber-950 mb-1 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Scale className="w-3.5 h-3.5 text-amber-700" />
                  Carne Já Desossada na Linha (kg):
                </span>
                <span className="text-[10px] bg-amber-100 text-amber-900 px-1.5 py-0.5 rounded font-bold">
                  Desossa Mista
                </span>
              </label>
              <input
                type="number"
                step="0.10"
                min={0}
                value={preDebonedInputKg || ''}
                onChange={(e) => setPreDebonedInputKg(Number(e.target.value) || 0)}
                placeholder="0,00 kg"
                className="w-full p-2.5 border border-amber-300 bg-amber-50/40 rounded-lg font-mono font-bold focus:ring-2 focus:ring-amber-800/20"
              />
              <span className="text-[10px] text-slate-500 block mt-0.5">
                Subtraído apenas para isolar o Rendimento da Desossa da carcaça in natura.
              </span>
            </div>

            {/* Observações / Justificativa da Correção */}
            <div className="sm:col-span-2">
              <label className="block font-bold text-slate-700 mb-1">
                Observações / Motivo da Correção:
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ex: Corrigido o número de operadores ou peso de carne já desossada de entrada..."
                className="w-full p-2.5 border border-slate-300 rounded-lg bg-white font-medium focus:ring-2 focus:ring-rose-800/20"
              />
            </div>
          </div>

          {/* Impact Preview */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wide mb-2.5 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Scale className="w-4 h-4 text-rose-800" />
                Recálculo dos Indicadores com as Correções:
              </span>
              {preDebonedInputKg > 0 && (
                <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded">
                  ⚡ Rend. Desossa ajustado (-{formatKg(preDebonedInputKg, 0)} já desossada)
                </span>
              )}
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 text-center">
              <div className="p-2 bg-white rounded-lg border border-slate-200">
                <span className="text-[10px] text-slate-500 block">Novo Rend. Desossa</span>
                <span className="text-sm font-bold font-mono text-emerald-700">
                  {formatPct(estimatedDeboningYield, 2)}
                </span>
              </div>

              <div className="p-2 bg-white rounded-lg border border-slate-200">
                <span className="text-[10px] text-slate-500 block">Nova Produtividade</span>
                <span className="text-sm font-bold font-mono text-blue-700">
                  {estimatedProductivity.toFixed(1)} kg/pes.
                </span>
              </div>

              <div className="p-2 bg-white rounded-lg border border-slate-200">
                <span className="text-[10px] text-slate-500 block">Novo Custo Carcaça</span>
                <span className="text-sm font-bold font-mono text-slate-800">
                  {formatCurrency(estimatedTotalCost)}
                </span>
              </div>

              <div className="p-2 bg-white rounded-lg border border-slate-200">
                <span className="text-[10px] text-slate-500 block">Novo Lucro Bruto</span>
                <span className="text-sm font-bold font-mono text-emerald-700">
                  {formatCurrency(estimatedGrossProfit)}
                </span>
              </div>

              <div className="p-2 bg-white rounded-lg border border-slate-200">
                <span className="text-[10px] text-slate-500 block">Nova Margem %</span>
                <span className="text-sm font-bold font-mono text-emerald-700">
                  {formatPct(estimatedMarginPct, 2)}
                </span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-700 hover:bg-slate-100 rounded-lg text-xs font-semibold transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 bg-rose-900 hover:bg-rose-800 text-white rounded-lg text-xs font-bold shadow-sm transition-colors flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              Salvar Correções no Lote
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
