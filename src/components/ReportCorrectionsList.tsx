import React, { useState, useMemo } from 'react';
import {
  FileText,
  FileEdit,
  Trash2,
  FileSpreadsheet,
  Search,
  Filter,
  Calendar,
  UserCheck,
  Users,
  Beef,
  ArrowUpDown,
  Download,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  PlusCircle
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { ProductionRecord } from '../types';
import { formatCurrency, formatKg, formatPct } from '../utils/calculations';
import { exportMasterDatabaseToExcel } from '../utils/excelDatabase';
import { EditRecordModal } from './EditRecordModal';
import { DeleteRecordModal } from './DeleteRecordModal';

interface ReportCorrectionsListProps {
  onSelectReportForOPR: (recordId: string) => void;
  onNavigateToUpload: () => void;
}

export const ReportCorrectionsList: React.FC<ReportCorrectionsListProps> = ({
  onSelectReportForOPR,
  onNavigateToUpload,
}) => {
  const { records, deleteRecord, correctRecordDetails, benchmarks, canEdit } = useApp();

  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filterType, setFilterType] = useState<'ALL' | 'DIANTEIRO' | 'TRASEIRO'>('ALL');
  const [filterShift, setFilterShift] = useState<string>('ALL');
  const [editingRecord, setEditingRecord] = useState<ProductionRecord | null>(null);
  const [deletingRecord, setDeletingRecord] = useState<ProductionRecord | null>(null);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  // Filter and sort records
  const filteredList = useMemo(() => {
    return records.filter((rec) => {
      if (filterType !== 'ALL' && rec.type !== filterType) return false;
      if (filterShift !== 'ALL' && rec.shift !== filterShift) return false;
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const matchesDate = rec.date.includes(query);
        const matchesLeader = rec.responsibleOperator.toLowerCase().includes(query);
        const matchesId = rec.id.toLowerCase().includes(query);
        const matchesType = (rec.type === 'DIANTEIRO' ? 'dianteiro dt' : 'traseiro tr').includes(query);
        if (!matchesDate && !matchesLeader && !matchesId && !matchesType) return false;
      }
      return true;
    });
  }, [records, filterType, filterShift, searchTerm]);

  const handleConfirmDelete = async (id: string) => {
    const res = await deleteRecord(id);
    setFeedbackMsg(res.message || 'Relatório excluído com sucesso da base de dados e do Supabase.');
    setDeletingRecord(null);
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
    setFeedbackMsg('Informações do lote corrigidas com sucesso! Indicadores recalculados.');
    setTimeout(() => setFeedbackMsg(null), 4000);
  };

  const handleExportSingleBatch = (rec: ProductionRecord) => {
    exportMasterDatabaseToExcel([rec], benchmarks);
  };

  return (
    <div className="space-y-4">
      {/* Feedback Banner */}
      {feedbackMsg && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
          {feedbackMsg}
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
        <div className="flex-1 flex items-center gap-2 bg-slate-50 px-3 py-2 rounded-lg border border-slate-200">
          <Search className="w-4 h-4 text-slate-400 shrink-0" />
          <input
            type="text"
            placeholder="Buscar por data, líder de desossa, tipo (DT/TR) ou ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-transparent border-none focus:outline-none text-slate-800 placeholder-slate-400"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="text-slate-400 hover:text-slate-600 font-bold"
            >
              ✕
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-slate-500">Tipo:</span>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as any)}
              className="p-1.5 border border-slate-300 rounded-lg bg-white font-medium"
            >
              <option value="ALL">Todos os Cortes</option>
              <option value="DIANTEIRO">Dianteiro (DT)</option>
              <option value="TRASEIRO">Traseiro (TR)</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-slate-500">Turno:</span>
            <select
              value={filterShift}
              onChange={(e) => setFilterShift(e.target.value)}
              className="p-1.5 border border-slate-300 rounded-lg bg-white font-medium"
            >
              <option value="ALL">Todos os Turnos</option>
              <option value="Turno 1">Turno 1</option>
              <option value="Turno 2">Turno 2</option>
              <option value="Turno 3">Turno 3</option>
            </select>
          </div>

          <button
            type="button"
            onClick={onNavigateToUpload}
            className="px-3 py-1.5 bg-rose-900 hover:bg-rose-800 text-white rounded-lg font-bold flex items-center gap-1.5 transition-colors"
            title="Fazer upload de um novo relatório SisAtak"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            Novo Upload
          </button>
        </div>
      </div>

      {/* Reports Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
          <div>
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
              Relatórios SisAtak Cadastrados no Sistema ({filteredList.length} de {records.length})
            </h4>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Identifique relatórios com erro para excluir e re-importar, ou corrija diretamente os parâmetros de líderes e operadores
            </p>
          </div>
        </div>

        {filteredList.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-xs">
            <AlertCircle className="w-8 h-8 text-slate-400 mx-auto mb-2" />
            Nenhum relatório encontrado com os filtros selecionados.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100/90 text-slate-600 font-semibold uppercase text-[10px] tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">Data / Turno</th>
                  <th className="py-2.5 px-3">Tipo</th>
                  <th className="py-2.5 px-3">Líder / Equipe</th>
                  <th className="py-2.5 px-3 text-right">Matéria-Prima</th>
                  <th className="py-2.5 px-3 text-right">Quebra (%)</th>
                  <th className="py-2.5 px-3 text-right">Rend. Desossa</th>
                  <th className="py-2.5 px-3 text-right">Produtividade</th>
                  <th className="py-2.5 px-3 text-right">Margem %</th>
                  <th className="py-2.5 px-3 text-center">Ações Gerenciais</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredList.map((rec) => {
                  const isDT = rec.type === 'DIANTEIRO';
                  return (
                    <tr key={rec.id} className="hover:bg-slate-50/90 transition-colors">
                      {/* Data / Turno */}
                      <td className="py-3 px-3">
                        <div className="font-bold text-slate-900">{rec.date}</div>
                        <div className="text-[11px] text-slate-500">{rec.shift}</div>
                      </td>

                      {/* Tipo */}
                      <td className="py-3 px-3">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold border ${
                            isDT
                              ? 'bg-amber-50 text-amber-900 border-amber-200'
                              : 'bg-rose-50 text-rose-900 border-rose-200'
                          }`}
                        >
                          <Beef className="w-3 h-3" />
                          {isDT ? 'DT (Dianteiro)' : 'TR (Traseiro)'}
                        </span>
                        <div className="text-[9px] text-slate-400 font-mono mt-0.5">
                          {rec.cuts.length} cortes
                        </div>
                      </td>

                      {/* Líder / Equipe */}
                      <td className="py-3 px-3">
                        <div className="font-semibold text-slate-800">{rec.responsibleOperator}</div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-1">
                          <Users className="w-3 h-3 text-slate-400" />
                          {rec.operatorCount} pessoas
                        </div>
                      </td>

                      {/* Matéria-Prima */}
                      <td className="py-3 px-3 text-right font-mono">
                        <span className="font-bold text-slate-900">{formatKg(rec.rawMaterialWeightKg, 1)}</span>
                        <div className="text-[10px] text-slate-500">PA: {formatKg(rec.finishedProductWeightKg, 1)}</div>
                      </td>

                      {/* Quebra */}
                      <td className="py-3 px-3 text-right font-mono">
                        <span className="font-bold text-rose-700">{formatPct(rec.lossPct, 3)}</span>
                        <div className="text-[10px] text-slate-500">({formatKg(rec.lossKg, 1)})</div>
                      </td>

                      {/* Rend. Desossa */}
                      <td className="py-3 px-3 text-right font-mono">
                        <span className="font-bold text-emerald-700">{formatPct(rec.deboningYieldNetPct, 2)}</span>
                        <div className="text-[10px] text-slate-500">Carnes/Carc.</div>
                      </td>

                      {/* Produtividade */}
                      <td className="py-3 px-3 text-right font-mono">
                        <span className="font-semibold text-blue-800">
                          {rec.productivityKgPerPerson.toFixed(1)}
                        </span>
                        <span className="text-[10px] text-slate-500 block">kg/pes</span>
                      </td>

                      {/* Margem */}
                      <td className="py-3 px-3 text-right font-mono">
                        <span className={`font-bold ${rec.profitMarginPct >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                          {formatPct(rec.profitMarginPct, 1)}
                        </span>
                        <div className={`text-[10px] ${rec.grossProfitValue >= 0 ? 'text-slate-500' : 'text-rose-600 font-medium'}`}>
                          {formatCurrency(rec.grossProfitValue)}
                        </div>
                      </td>

                      {/* Ações */}
                      <td className="py-3 px-3 text-center">
                        <div className="inline-flex items-center gap-1">
                          {/* Ver OPR */}
                          <button
                            type="button"
                            onClick={() => onSelectReportForOPR(rec.id)}
                            className="p-1.5 rounded-md hover:bg-slate-200 text-slate-700 hover:text-slate-900 transition-colors"
                            title="Gerar e Visualizar One Page Report para envio à Diretoria"
                          >
                            <FileText className="w-4 h-4 text-rose-900" />
                          </button>

                          {/* Corrigir Metadados */}
                          {canEdit && (
                            <button
                              type="button"
                              onClick={() => setEditingRecord(rec)}
                              className="p-1.5 rounded-md hover:bg-amber-100 text-amber-800 transition-colors"
                              title="Corrigir Informações (Líder, Operadores, Turno, Custo da Carcaça)"
                            >
                              <FileEdit className="w-4 h-4" />
                            </button>
                          )}

                          {/* Exportar Lote Excel */}
                          <button
                            type="button"
                            onClick={() => handleExportSingleBatch(rec)}
                            className="p-1.5 rounded-md hover:bg-emerald-100 text-emerald-800 transition-colors"
                            title="Exportar este lote em Excel (.xlsx)"
                          >
                            <FileSpreadsheet className="w-4 h-4" />
                          </button>

                          {/* Apagar com Erro */}
                          {canEdit && (
                            <button
                              type="button"
                              onClick={() => setDeletingRecord(rec)}
                              className="p-1.5 rounded-md hover:bg-rose-100 text-rose-700 transition-colors"
                              title="Apagar este relatório com erro para re-importar"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit Record Modal */}
      {editingRecord && (
        <EditRecordModal
          isOpen={!!editingRecord}
          onClose={() => setEditingRecord(null)}
          record={editingRecord}
          onSave={handleSaveCorrection}
        />
      )}

      {/* Delete Record Modal */}
      {deletingRecord && (
        <DeleteRecordModal
          isOpen={!!deletingRecord}
          onClose={() => setDeletingRecord(null)}
          record={deletingRecord}
          onConfirmDelete={handleConfirmDelete}
        />
      )}
    </div>
  );
};
