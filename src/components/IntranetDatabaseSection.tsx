import React, { useState, useRef } from 'react';
import {
  FileSpreadsheet,
  Download,
  Upload,
  HardDrive,
  FolderSync,
  CheckCircle2,
  AlertTriangle,
  FileCheck,
  Calendar,
  Layers,
  ShieldCheck,
  RefreshCw,
  ExternalLink,
  Edit3
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { exportMasterDatabaseToExcel, importMasterDatabaseFromExcel } from '../utils/excelDatabase';
import { formatCurrency, formatKg } from '../utils/calculations';

export const IntranetDatabaseSection: React.FC = () => {
  const {
    records,
    benchmarks,
    replaceRecords,
    mergeRecords,
    intranetDrivePath,
    setIntranetDrivePath,
    lastExportDate,
    setLastExportDate,
    canUpload,
  } = useApp();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isEditingPath, setIsEditingPath] = useState<boolean>(false);
  const [tempPath, setTempPath] = useState<string>(intranetDrivePath);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [importMode, setImportMode] = useState<'replace' | 'merge'>('replace');

  // Total cuts count
  const totalCutsCount = records.reduce((acc, r) => acc + r.cuts.length, 0);
  const totalWeightProcessed = records.reduce((acc, r) => acc + r.rawMaterialWeightKg, 0);
  const totalRevenue = records.reduce((acc, r) => acc + r.finishedProductTotalValue, 0);

  const handleExportExcel = () => {
    try {
      setIsProcessing(true);
      exportMasterDatabaseToExcel(records, benchmarks, intranetDrivePath);
      const now = new Date().toLocaleString('pt-BR');
      setLastExportDate(now);
      setStatusMsg({
        type: 'success',
        text: `Planilha Excel gerada com sucesso! Salve o arquivo na pasta da Intranet: "${intranetDrivePath}". Ela contém ${records.length} lotes e ${totalCutsCount} itens de cortes.`,
      });
    } catch (err: any) {
      console.error(err);
      setStatusMsg({
        type: 'error',
        text: `Erro ao exportar banco de dados para Excel: ${err.message || 'Falha desconhecida'}`,
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsProcessing(true);
      setStatusMsg(null);
      const result = await importMasterDatabaseFromExcel(file);

      if (result.success && result.importedRecords.length > 0) {
        if (importMode === 'replace') {
          replaceRecords(result.importedRecords);
          setStatusMsg({
            type: 'success',
            text: `Banco de Dados Mestre substituído com sucesso! ${result.importedRecords.length} lotes de produção foram carregados da planilha do Drive.`,
          });
        } else {
          mergeRecords(result.importedRecords);
          setStatusMsg({
            type: 'success',
            text: `Lotes mesclados com sucesso! ${result.importedRecords.length} lotes foram sincronizados da planilha do Drive.`,
          });
        }
      } else {
        setStatusMsg({
          type: 'error',
          text: result.message || 'Falha ao importar registros da planilha.',
        });
      }
    } catch (err: any) {
      console.error(err);
      setStatusMsg({
        type: 'error',
        text: `Erro ao ler planilha: ${err.message || 'Arquivo inválido'}`,
      });
    } finally {
      setIsProcessing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSavePath = () => {
    if (tempPath.trim()) {
      setIntranetDrivePath(tempPath.trim());
      setIsEditingPath(false);
      setStatusMsg({
        type: 'info',
        text: 'Caminho da pasta do Drive da Intranet atualizado com sucesso.',
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Overview Card */}
      <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-700">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900 tracking-tight">
                  Banco de Dados em Planilha Excel (Drive da Intranet)
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-300">
                  .XLSX MESTRE
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Armazenamento centralizado na rede local do Frigorífico para uso exclusivo do Gerente ATAK e consultas da Diretoria
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportExcel}
              disabled={isProcessing || records.length === 0}
              className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white rounded-lg text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5"
              title="Gerar e salvar a planilha mestre atualizada no Drive da Intranet"
            >
              <Download className="w-4 h-4" />
              Exportar para o Drive (.xlsx)
            </button>
          </div>
        </div>

        {/* Intranet Path Config */}
        <div className="mt-4 p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-slate-700">
              <HardDrive className="w-4 h-4 text-slate-500 shrink-0" />
              <span className="font-bold">Local do Arquivo no Drive da Intranet:</span>
            </div>
            {!isEditingPath && (
              <button
                type="button"
                onClick={() => setIsEditingPath(true)}
                className="text-xs text-rose-800 hover:text-rose-950 font-semibold flex items-center gap-1 self-start sm:self-auto"
              >
                <Edit3 className="w-3.5 h-3.5" />
                Alterar Pasta/Caminho
              </button>
            )}
          </div>

          {isEditingPath ? (
            <div className="mt-2 flex items-center gap-2">
              <input
                type="text"
                value={tempPath}
                onChange={(e) => setTempPath(e.target.value)}
                placeholder="Ex: \\SRV-FRIGORIFICO\Intranet\Desossa\BANCO_DADOS_DESOSSA.xlsx"
                className="flex-1 p-2 border border-slate-300 rounded-lg bg-white font-mono text-xs text-slate-800 focus:ring-2 focus:ring-rose-800/20"
              />
              <button
                type="button"
                onClick={handleSavePath}
                className="px-3 py-2 bg-rose-900 hover:bg-rose-800 text-white rounded-lg font-bold text-xs"
              >
                Salvar
              </button>
              <button
                type="button"
                onClick={() => {
                  setTempPath(intranetDrivePath);
                  setIsEditingPath(false);
                }}
                className="px-3 py-2 text-slate-600 hover:bg-slate-200 rounded-lg font-semibold text-xs"
              >
                Cancelar
              </button>
            </div>
          ) : (
            <div className="mt-1.5 flex items-center justify-between">
              <span className="font-mono text-slate-800 font-semibold truncate bg-white px-2.5 py-1 rounded border border-slate-200 block max-w-full">
                {intranetDrivePath}
              </span>
            </div>
          )}

          <div className="mt-2.5 flex flex-wrap items-center gap-y-1 gap-x-4 text-[11px] text-slate-500">
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3 text-slate-400" />
              Última exportação para o Drive: <strong>{lastExportDate || 'Nenhuma exportação nesta sessão'}</strong>
            </span>
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-emerald-600" />
              Formato Multi-Aba: <strong>Lotes, Itens Cortes, Resumo Diário, Metas</strong>
            </span>
          </div>
        </div>

        {/* Database Metrics Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 text-xs">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
            <span className="text-slate-500 block text-[10px] uppercase font-bold">Lotes Armazenados</span>
            <span className="text-lg font-bold font-mono text-slate-900 mt-0.5 block">
              {records.length} relatórios
            </span>
            <span className="text-[10px] text-slate-400">
              {records.filter((r) => r.type === 'DIANTEIRO').length} DT • {records.filter((r) => r.type === 'TRASEIRO').length} TR
            </span>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
            <span className="text-slate-500 block text-[10px] uppercase font-bold">Cortes Cadastrados</span>
            <span className="text-lg font-bold font-mono text-slate-900 mt-0.5 block">
              {totalCutsCount} itens
            </span>
            <span className="text-[10px] text-slate-400">
              Carnes, ossos e sebos detalhados
            </span>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
            <span className="text-slate-500 block text-[10px] uppercase font-bold">Volume Total MP</span>
            <span className="text-lg font-bold font-mono text-slate-900 mt-0.5 block">
              {formatKg(totalWeightProcessed, 0)}
            </span>
            <span className="text-[10px] text-slate-400">
              Total acumulado na base
            </span>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
            <span className="text-slate-500 block text-[10px] uppercase font-bold">Faturamento Acumulado</span>
            <span className="text-lg font-bold font-mono text-emerald-700 mt-0.5 block">
              {formatCurrency(totalRevenue)}
            </span>
            <span className="text-[10px] text-slate-400">
              Valor apurado dos produtos
            </span>
          </div>
        </div>
      </div>

      {/* Sync / Reload from Intranet Drive Card */}
      <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-2xs">
        <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wide mb-2 flex items-center gap-1.5">
          <FolderSync className="w-4 h-4 text-blue-700" />
          Importar / Sincronizar Banco de Dados do Drive da Intranet
        </h4>
        <p className="text-xs text-slate-600 mb-4">
          Caso você tenha aberto o aplicativo em outro computador da intranet ou precise restaurar a base de dados a partir da planilha Excel mestre salva na rede, selecione o arquivo abaixo:
        </p>

        {/* Hidden File Input */}
        <input
          type="file"
          ref={fileInputRef}
          accept=".xlsx,.xls"
          onChange={handleFileSelect}
          className="hidden"
          id="intranet-excel-file-input"
        />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isProcessing}
              className="px-5 py-3 rounded-xl border-2 border-dashed border-blue-300 hover:border-blue-600 bg-blue-50/50 hover:bg-blue-50 text-blue-900 text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer flex-1"
            >
              <Upload className="w-4 h-4 text-blue-700 shrink-0" />
              <span>Carregar Planilha Excel do Drive (.xlsx)</span>
            </button>

            <div className="flex flex-col gap-1 text-xs">
              <span className="font-semibold text-slate-700 text-[11px]">Modo de Carga:</span>
              <div className="flex items-center gap-2">
                <label className="inline-flex items-center gap-1 cursor-pointer">
                  <input
                    type="radio"
                    name="importMode"
                    value="replace"
                    checked={importMode === 'replace'}
                    onChange={() => setImportMode('replace')}
                    className="text-rose-800"
                  />
                  <span className="text-[11px] text-slate-700">Substituir Base Completa</span>
                </label>
                <label className="inline-flex items-center gap-1 cursor-pointer">
                  <input
                    type="radio"
                    name="importMode"
                    value="merge"
                    checked={importMode === 'merge'}
                    onChange={() => setImportMode('merge')}
                    className="text-rose-800"
                  />
                  <span className="text-[11px] text-slate-700">Mesclar Lotes Novos</span>
                </label>
              </div>
            </div>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-[11px] text-slate-600 flex flex-col justify-center">
            <span className="font-bold text-slate-800 block mb-0.5">Segurança & Integridade:</span>
            A importação valida as abas de lotes e cortes, preservando as fórmulas industriais de rendimento da desossa.
          </div>
        </div>

        {/* Feedback Message */}
        {statusMsg && (
          <div
            className={`mt-4 p-3 rounded-xl text-xs font-medium flex items-start gap-2 ${
              statusMsg.type === 'success'
                ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                : statusMsg.type === 'error'
                ? 'bg-rose-50 border border-rose-200 text-rose-800'
                : 'bg-blue-50 border border-blue-200 text-blue-800'
            }`}
          >
            {statusMsg.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
            ) : statusMsg.type === 'error' ? (
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
            ) : (
              <RefreshCw className="w-4 h-4 shrink-0 text-blue-600 mt-0.5" />
            )}
            <div>{statusMsg.text}</div>
          </div>
        )}
      </div>
    </div>
  );
};
