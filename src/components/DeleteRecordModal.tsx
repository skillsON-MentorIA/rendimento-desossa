import React from 'react';
import {
  AlertTriangle,
  Trash2,
  X,
  Beef,
  Calendar,
  UserCheck,
  Scale,
  RefreshCw
} from 'lucide-react';
import { ProductionRecord } from '../types';
import { formatCurrency, formatKg, formatPct } from '../utils/calculations';

interface DeleteRecordModalProps {
  isOpen: boolean;
  onClose: () => void;
  record: ProductionRecord | null;
  onConfirmDelete: (id: string) => void;
}

export const DeleteRecordModal: React.FC<DeleteRecordModalProps> = ({
  isOpen,
  onClose,
  record,
  onConfirmDelete,
}) => {
  if (!record) return null;

  const handleConfirm = () => {
    onConfirmDelete(record.id);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-rose-200 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-rose-900 text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/15 border border-white/20 flex items-center justify-center text-white">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold tracking-tight">
                Apagar Relatório de Desossa
              </h3>
              <p className="text-xs text-rose-200">
                Remover lote com erro para reprocessamento
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-rose-300 hover:text-white hover:bg-rose-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4 text-xs">
          <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-900 rounded-xl flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 shrink-0 text-rose-700 mt-0.5" />
            <div>
              <span className="font-bold block text-sm mb-1">
                Atenção: Exclusão Permanente de Registro
              </span>
              Você está prestes a apagar este relatório da base de dados do sistema. Esta ação remove todos os {record.cuts.length} cortes apurados e recalcula automaticamente todas as médias do Frigorífico.
            </div>
          </div>

          {/* Record Details to be Deleted */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2.5">
            <div className="flex items-center justify-between font-bold text-slate-800 pb-2 border-b border-slate-200">
              <span className="flex items-center gap-1.5">
                <Beef className="w-4 h-4 text-rose-800" />
                Lote: {record.type === 'DIANTEIRO' ? 'DIANTEIRO (DT)' : 'TRASEIRO (TR)'}
              </span>
              <span className="px-2 py-0.5 rounded bg-slate-200 text-slate-700 text-[10px] font-mono">
                ID: {record.id}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-slate-600">
              <div>
                <span className="text-slate-400 block text-[10px]">Data & Turno:</span>
                <span className="font-semibold text-slate-800">{record.date} • {record.shift}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Líder de Desossa:</span>
                <span className="font-semibold text-slate-800">{record.responsibleOperator}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Matéria-Prima:</span>
                <span className="font-bold text-slate-900 font-mono">{formatKg(record.rawMaterialWeightKg)}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Produto Acabado:</span>
                <span className="font-bold text-slate-900 font-mono">{formatKg(record.finishedProductWeightKg)}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Quebra / Perda:</span>
                <span className="font-bold text-rose-700 font-mono">{formatPct(record.lossPct, 3)} ({formatKg(record.lossKg)})</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Rend. Desossa (Carnes):</span>
                <span className="font-bold text-emerald-700 font-mono">{formatPct(record.deboningYieldNetPct, 2)}</span>
              </div>
            </div>
          </div>

          <div className="p-3 bg-blue-50 border border-blue-200 text-blue-900 rounded-lg flex items-center gap-2">
            <RefreshCw className="w-4 h-4 shrink-0 text-blue-700" />
            <span>
              Após apagar este lote, você poderá fazer imediatamente um novo upload do relatório correto gerado pelo SisAtak.
            </span>
          </div>

          {/* Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-700 hover:bg-slate-100 rounded-lg text-xs font-semibold transition-colors"
            >
              Cancelar e Manter
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              className="px-5 py-2.5 bg-rose-700 hover:bg-rose-800 text-white rounded-lg text-xs font-bold shadow-sm transition-colors flex items-center gap-1.5"
            >
              <Trash2 className="w-4 h-4" />
              Sim, Apagar Este Relatório
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
