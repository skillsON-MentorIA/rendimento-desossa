import React, { useState } from 'react';
import {
  UploadCloud,
  FileText,
  CheckCircle2,
  AlertTriangle,
  FileSpreadsheet,
  Layers,
  Users,
  DollarSign,
  Beef,
  Scale,
  Sparkles,
  ShieldAlert,
  ArrowRight,
  ListFilter,
  HardDrive,
  ExternalLink,
  Trash2,
  FileEdit,
  RefreshCw,
  Loader2
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { RAW_SAMPLE_SISATAK_DT, RAW_SAMPLE_SISATAK_TR, RAW_SAMPLE_SISATAK_DS } from '../data/initialData';
import { CutType, ProductionRecord } from '../types';
import { formatCurrency, formatKg, formatPct } from '../utils/calculations';
import { parseSisAtakReport } from '../utils/parser';
import { extractTextFromFile } from '../utils/fileExtractor';
import { ReportCorrectionsList } from './ReportCorrectionsList';

interface UploadViewProps {
  onSuccessUpload: (newRecordId: string) => void;
}

export const UploadView: React.FC<UploadViewProps> = ({ onSuccessUpload }) => {
  const { addRecord, canUpload, currentUser, records, carcassCosts } = useApp();

  const [activeSubTab, setActiveSubTab] = useState<'upload' | 'corrections'>('upload');

  const [rawText, setRawText] = useState<string>('');
  const [fileName, setFileName] = useState<string>('');
  const [isExtracting, setIsExtracting] = useState<boolean>(false);
  const [cutTypeOverride, setCutTypeOverride] = useState<'AUTO' | 'DIANTEIRO' | 'TRASEIRO' | 'SUINO'>('AUTO');
  const [shift, setShift] = useState<'Turno 1' | 'Turno 2' | 'Turno 3'>('Turno 1');
  const [operatorCount, setOperatorCount] = useState<number>(20);
  const [responsibleOperator, setResponsibleOperator] = useState<string>('Marcos Silveira');
  const [carcassCostPerKg, setCarcassCostPerKg] = useState<number>(15.20);
  const [preDebonedInputKg, setPreDebonedInputKg] = useState<number>(0);
  const [customDate, setCustomDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [parsedPreview, setParsedPreview] = useState<ProductionRecord | null>(null);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [successMsg, setSuccessMsg] = useState<string>('');

  // When text or params change, parse automatically
  const handleParse = (
    textToParse: string,
    cost?: number,
    opCount?: number,
    typeOverride: 'AUTO' | 'DIANTEIRO' | 'TRASEIRO' | 'SUINO' = cutTypeOverride,
    preDebonedKg?: number
  ) => {
    if (!textToParse.trim()) {
      setParsedPreview(null);
      return;
    }
    try {
      setErrorMsg('');
      const effectivePreDeboned = preDebonedKg !== undefined ? preDebonedKg : preDebonedInputKg;
      const preview = parseSisAtakReport(textToParse, {
        shift,
        operatorCount: opCount ?? operatorCount,
        responsibleOperator,
        carcassCostPerKg: cost,
        customDate,
        type: typeOverride === 'AUTO' ? undefined : (typeOverride as CutType),
        preDebonedInputKg: effectivePreDeboned,
      });

      if (preview.rawMaterialWeightKg === 0 && preview.finishedProductWeightKg === 0) {
        setErrorMsg('Não foi possível identificar os pesos de Matéria-Prima ou Produto Acabado neste arquivo. Verifique se o documento contém a tabela de Matéria-Prima, Produto Acabado ou o Resumo/Totalização do SisAtak RETQ010.');
        setParsedPreview(null);
        return;
      }

      if (cost === undefined) {
        setCarcassCostPerKg(preview.carcassCostPerKg);
      }

      // If parser auto-detected pre-deboned meat from raw material lines and user hasn't set it yet
      if (preview.preDebonedInputKg && preview.preDebonedInputKg > 0 && preDebonedInputKg === 0 && preDebonedKg === undefined) {
        setPreDebonedInputKg(preview.preDebonedInputKg);
      }

      setParsedPreview(preview);
    } catch (err: any) {
      console.error(err);
      setErrorMsg('Não foi possível interpretar o relatório. Verifique se o formato é do SisAtak RETQ010.');
    }
  };

  // 1-Click Load attached reports
  const handleLoadSampleDT = () => {
    setFileName('RETQ010_Dianteiro_25082026.txt');
    setRawText(RAW_SAMPLE_SISATAK_DT);
    setShift('Turno 1');
    setOperatorCount(20);
    setCutTypeOverride('DIANTEIRO');
    setResponsibleOperator('Marcos Silveira');
    setCarcassCostPerKg(15.20);
    setCustomDate('2026-08-25');
    handleParse(RAW_SAMPLE_SISATAK_DT, 15.20, 20, 'DIANTEIRO');
  };

  const handleLoadSampleTR = () => {
    setFileName('RETQ010_Traseiro_28082026.txt');
    setRawText(RAW_SAMPLE_SISATAK_TR);
    setShift('Turno 1');
    setOperatorCount(22);
    setCutTypeOverride('TRASEIRO');
    setResponsibleOperator('Valdemar Nogueira');
    setCarcassCostPerKg(21.80);
    setCustomDate('2026-08-28');
    handleParse(RAW_SAMPLE_SISATAK_TR, 21.80, 22, 'TRASEIRO');
  };

  const handleLoadSampleDS = () => {
    setFileName('RETQ010_Suino_27082026.txt');
    setRawText(RAW_SAMPLE_SISATAK_DS);
    setShift('Turno 1');
    setOperatorCount(18);
    setCutTypeOverride('SUINO');
    setResponsibleOperator('Edmar Ferreira');
    setCarcassCostPerKg(11.50);
    setCustomDate('2026-08-27');
    handleParse(RAW_SAMPLE_SISATAK_DS, 11.50, 18, 'SUINO');
  };

  // Handle file drop or selection with multi-format support (.pdf, .txt, .xlsx, .csv)
  const processUploadedFile = async (file: File) => {
    setFileName(file.name);
    setIsExtracting(true);
    setErrorMsg('');
    try {
      const { text } = await extractTextFromFile(file);
      setRawText(text);
      handleParse(text, carcassCostPerKg, operatorCount, cutTypeOverride);
    } catch (err: any) {
      console.error('File extraction failed:', err);
      setErrorMsg(`Falha ao ler o arquivo "${file.name}": ${err.message || 'Formato não suportado'}`);
    } finally {
      setIsExtracting(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processUploadedFile(file);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    processUploadedFile(file);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canUpload) {
      setErrorMsg('Seu perfil atual (DIRETORIA) tem permissão de apenas visualização.');
      return;
    }

    if (!parsedPreview) {
      setErrorMsg('Nenhum relatório processado. Cole ou carregue o arquivo SisAtak RETQ010.');
      return;
    }

    addRecord(parsedPreview);
    setSuccessMsg('Lote de produção adicionado com sucesso ao sistema!');
    setTimeout(() => {
      onSuccessUpload(parsedPreview.id);
    }, 1200);
  };

  if (!canUpload) {
    return (
      <div className="max-w-2xl mx-auto my-12 p-8 bg-white rounded-xl border border-slate-200 text-center shadow-xs">
        <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center mx-auto mb-4">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <h3 className="text-lg font-bold text-slate-900">
          Acesso Restrito: Perfil {currentUser?.role || 'DIRETORIA'}
        </h3>
        <p className="text-sm text-slate-600 mt-2">
          O perfil de <strong>DIRETORIA</strong> possui permissão de <strong>Apenas Visualização</strong> dos dashboards, KPIs e relatórios executivos.
        </p>
        <p className="text-xs text-slate-500 mt-1">
          Para realizar uploads e incluir novos dados de produção, utilize o perfil <strong>GERENCIAL</strong> ou <strong>ADMIN</strong> na barra lateral.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12 max-w-5xl mx-auto">
      {/* Header */}
      <div className="bg-slate-900 text-white p-5 rounded-xl border border-slate-800 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-xs font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
              <UploadCloud className="w-3.5 h-3.5" />
              CENTRAL DO GERENTE ATAK • GESTÃO DE LOTES E UPLOAD
            </div>
            <h2 className="text-xl font-bold mt-1 tracking-tight">
              Ingestão Diária, Auditoria Técnica e Correções
            </h2>
            <p className="text-xs text-slate-300 mt-0.5">
              Faça o upload do RETQ010 diário, valide o balanço físico de massa e gerencie os relatórios cadastrados
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto text-xs bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="text-slate-300">Base Ativa:</span>
            <strong className="text-white font-mono">{records.length} lotes</strong>
          </div>
        </div>

        {/* Sub-Tabs Selector */}
        <div className="flex items-center gap-2 mt-5 pt-4 border-t border-slate-800/80 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveSubTab('upload')}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${
              activeSubTab === 'upload'
                ? 'bg-rose-900 text-white shadow-sm border border-rose-700'
                : 'bg-slate-800/60 text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <UploadCloud className="w-4 h-4 text-rose-400" />
            <span>1. Novo Upload SisAtak</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('corrections')}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${
              activeSubTab === 'corrections'
                ? 'bg-rose-900 text-white shadow-sm border border-rose-700'
                : 'bg-slate-800/60 text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <ListFilter className="w-4 h-4 text-amber-400" />
            <span>2. Relatórios & Correções</span>
            <span className="px-1.5 py-0.2 rounded bg-slate-950/60 text-[10px] text-slate-300 font-mono">
              {records.length}
            </span>
          </button>
        </div>
      </div>

      {/* Sub-tab 1: New Upload */}
      {activeSubTab === 'upload' && (
        <div className="space-y-6">
          {/* Quick Buttons for attached SisAtak samples */}
          <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-2xs">
            <div className="flex items-center gap-2 mb-2 text-xs font-bold text-slate-700 uppercase tracking-wide">
              <Sparkles className="w-4 h-4 text-rose-700" />
              Modelos Oficiais do Frigorífico (Formulários Anexados):
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button
                type="button"
                onClick={handleLoadSampleDT}
                className="p-3 rounded-lg border border-amber-200 bg-amber-50/70 hover:bg-amber-100/80 text-left transition-colors flex items-center justify-between group"
              >
                <div>
                  <div className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
                    <Beef className="w-4 h-4 text-amber-700" />
                    SisAtak Dianteiro - DT (25/08)
                  </div>
                  <p className="text-[11px] text-slate-600 mt-0.5">
                    16.513 kg MP • 16.426 kg PA • 11 cortes
                  </p>
                </div>
                <span className="text-xs font-semibold px-2 py-1 bg-white text-amber-900 border border-amber-300 rounded group-hover:bg-amber-900 group-hover:text-white transition-colors">
                  Carregar
                </span>
              </button>

              <button
                type="button"
                onClick={handleLoadSampleTR}
                className="p-3 rounded-lg border border-rose-200 bg-rose-50/70 hover:bg-rose-100/80 text-left transition-colors flex items-center justify-between group"
              >
                <div>
                  <div className="text-xs font-bold text-rose-950 flex items-center gap-1.5">
                    <Beef className="w-4 h-4 text-rose-700" />
                    SisAtak Traseiro - TR (28/08)
                  </div>
                  <p className="text-[11px] text-slate-600 mt-0.5">
                    16.124 kg MP • 15.895 kg PA • 25 cortes
                  </p>
                </div>
                <span className="text-xs font-semibold px-2 py-1 bg-white text-rose-900 border border-rose-300 rounded group-hover:bg-rose-900 group-hover:text-white transition-colors">
                  Carregar
                </span>
              </button>

              <button
                type="button"
                onClick={handleLoadSampleDS}
                className="p-3 rounded-lg border border-emerald-200 bg-emerald-50/70 hover:bg-emerald-100/80 text-left transition-colors flex items-center justify-between group"
              >
                <div>
                  <div className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
                    <Beef className="w-4 h-4 text-emerald-700" />
                    SisAtak Suíno - DS (27/08)
                  </div>
                  <p className="text-[11px] text-slate-600 mt-0.5">
                    12.850 kg MP • 12.659 kg PA • 11 cortes
                  </p>
                </div>
                <span className="text-xs font-semibold px-2 py-1 bg-white text-emerald-900 border border-emerald-300 rounded group-hover:bg-emerald-900 group-hover:text-white transition-colors">
                  Carregar
                </span>
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Upload Dropzone */}
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              className="bg-white rounded-xl border-2 border-dashed border-slate-300 p-6 text-center hover:border-rose-700 hover:bg-rose-50/20 transition-all cursor-pointer relative"
            >
              <input
                type="file"
                id="file-input-sisatak"
                accept=".txt,.pdf,.csv,.json,.xlsx,.xls"
                onChange={handleFileChange}
                className="hidden"
                disabled={isExtracting}
              />
              <label htmlFor="file-input-sisatak" className="cursor-pointer block">
                {isExtracting ? (
                  <div className="py-4 flex flex-col items-center justify-center gap-2">
                    <Loader2 className="w-9 h-9 text-rose-800 animate-spin" />
                    <div className="text-sm font-bold text-slate-800">
                      Extraindo e analisando dados do arquivo SisAtak...
                    </div>
                    <p className="text-xs text-slate-500">
                      Processando páginas, tabelas e calculando rendimentos e quebra.
                    </p>
                  </div>
                ) : (
                  <>
                    <UploadCloud className="w-10 h-10 text-rose-800 mx-auto mb-2" />
                    <div className="text-sm font-bold text-slate-900">
                      Arraste o arquivo do SisAtak RETQ010 aqui ou clique para selecionar
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      Formatos aceitos: PDF de relatório (.pdf), Arquivo de texto (.txt), Planilha (.xlsx / .xls / .csv)
                    </p>
                    {fileName && (
                      <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-semibold">
                        <FileText className="w-3.5 h-3.5" /> Arquivo selecionado: {fileName}
                      </div>
                    )}
                  </>
                )}
              </label>
            </div>

            {/* Text Area (Paste Raw Text Option) */}
            <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-2xs">
              <label className="block text-xs font-bold text-slate-900 uppercase tracking-wide mb-1.5">
                Ou Cole o Texto do Relatório de Produção Diretamente:
              </label>
              <textarea
                rows={5}
                value={rawText}
                onChange={(e) => {
                  setRawText(e.target.value);
                  handleParse(e.target.value);
                }}
                placeholder="Cole aqui o conteúdo gerado pelo SisAtak RETQ010 (tabela de Matéria-Prima, cortes ou resumo)..."
                className="w-full text-xs font-mono p-3 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-rose-800/20 focus:border-rose-800 bg-slate-50 text-slate-800"
              />
            </div>

            {/* Complementary Operational Metadata Fields */}
            <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-2xs">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide mb-3 pb-2 border-b border-slate-100">
                Informações Complementares Digitadas pelo Responsável ATAK
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Classificação da Carcaça:
                  </label>
                  <select
                    value={cutTypeOverride}
                    onChange={(e) => {
                      const t = e.target.value as 'AUTO' | 'DIANTEIRO' | 'TRASEIRO' | 'SUINO';
                      setCutTypeOverride(t);
                      if (rawText) handleParse(rawText, carcassCostPerKg, operatorCount, t);
                    }}
                    className="w-full p-2 border border-slate-300 rounded-lg bg-white font-medium focus:ring-2 focus:ring-rose-800/20"
                  >
                    <option value="AUTO">Automático (SisAtak)</option>
                    <option value="TRASEIRO">TR - Traseiro Bovino</option>
                    <option value="DIANTEIRO">DT - Dianteiro Bovino</option>
                    <option value="SUINO">DS - Desossa Suíno</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Turno de Trabalho:
                  </label>
                  <select
                    value={shift}
                    onChange={(e) => {
                      const s = e.target.value as any;
                      setShift(s);
                      if (rawText) handleParse(rawText);
                    }}
                    className="w-full p-2 border border-slate-300 rounded-lg bg-white font-medium focus:ring-2 focus:ring-rose-800/20"
                  >
                    <option value="Turno 1">Turno 1 (Manhã)</option>
                    <option value="Turno 2">Turno 2 (Tarde)</option>
                    <option value="Turno 3">Turno 3 (Noite)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Nº de Pessoas na Linha:
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={150}
                    value={operatorCount}
                    onChange={(e) => {
                      const count = Number(e.target.value);
                      setOperatorCount(count);
                      if (rawText) handleParse(rawText, carcassCostPerKg, count);
                    }}
                    className="w-full p-2 border border-slate-300 rounded-lg bg-white font-medium focus:ring-2 focus:ring-rose-800/20 font-mono"
                  />
                  <span className="text-[10px] text-slate-500">Para cálculo de kg/pessoa</span>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Líder / Encarregado da Linha:
                  </label>
                  <input
                    type="text"
                    value={responsibleOperator}
                    onChange={(e) => {
                      setResponsibleOperator(e.target.value);
                      if (rawText) handleParse(rawText);
                    }}
                    className="w-full p-2 border border-slate-300 rounded-lg bg-white font-medium focus:ring-2 focus:ring-rose-800/20"
                    placeholder="Ex: Marcos Silveira"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Custo da Carcaça (R$/kg):
                  </label>
                  <input
                    type="number"
                    step="0.10"
                    min={1}
                    value={carcassCostPerKg}
                    onChange={(e) => {
                      const cost = Number(e.target.value);
                      setCarcassCostPerKg(cost);
                      if (rawText) handleParse(rawText, cost);
                    }}
                    className="w-full p-2 border border-slate-300 rounded-lg bg-white font-medium focus:ring-2 focus:ring-rose-800/20 font-mono"
                  />
                  <span className="text-[10px] text-slate-500">Para apuração de margem de lucro</span>
                </div>

                <div>
                  <label className="block font-semibold text-amber-900 mb-1 flex items-center justify-between">
                    <span>Carne Já Desossada na Linha (kg):</span>
                    <span className="text-[9px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded font-bold">Desossa Mista</span>
                  </label>
                  <input
                    type="number"
                    step="0.10"
                    min={0}
                    value={preDebonedInputKg || ''}
                    onChange={(e) => {
                      const val = Number(e.target.value) || 0;
                      setPreDebonedInputKg(val);
                      if (rawText) handleParse(rawText, carcassCostPerKg, operatorCount, cutTypeOverride, val);
                    }}
                    placeholder="0,00 kg (Se houver)"
                    className="w-full p-2 border border-amber-300 bg-amber-50/40 rounded-lg font-medium focus:ring-2 focus:ring-amber-800/20 font-mono"
                  />
                  <span className="text-[10px] text-slate-500">Subtraído apenas no Rend. da Desossa</span>
                </div>
              </div>
            </div>

            {/* Live Calculation Preview */}
            {parsedPreview && (
              <div className="bg-emerald-50/50 border border-emerald-200 rounded-xl p-5 shadow-2xs">
                <div className="flex items-center justify-between pb-3 border-b border-emerald-200 mb-4">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    <h4 className="text-sm font-bold text-slate-900">
                      Pré-visualização dos KPIs Calculados pelo Sistema:
                    </h4>
                  </div>
                  <div className="flex items-center gap-2">
                    {(parsedPreview.hasPreDebonedInput || preDebonedInputKg > 0) && (
                      <span className="text-xs font-bold px-2 py-0.5 rounded bg-amber-200 text-amber-900 flex items-center gap-1">
                        ⚡ Desossa Mista Ativa
                      </span>
                    )}
                    <span className="text-xs font-bold px-2 py-0.5 rounded bg-emerald-200 text-emerald-900">
                      {parsedPreview.type === 'SUINO'
                        ? 'DS - SUÍNO'
                        : parsedPreview.type === 'DIANTEIRO'
                        ? 'DT - DIANTEIRO'
                        : 'TR - TRASEIRO'} • {parsedPreview.date}
                    </span>
                  </div>
                </div>

                {/* Banner Explicativo da Desossa Mista */}
                {(parsedPreview.hasPreDebonedInput || preDebonedInputKg > 0) && (
                  <div className="mb-4 p-3 bg-amber-50 border border-amber-300 rounded-lg text-amber-950 flex items-start gap-2.5 text-xs">
                    <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-amber-900">Particularidade Operacional: Desossa Mista Identificada</span>
                        <span className="font-mono font-bold bg-amber-200/80 px-2 py-0.5 rounded text-amber-900">
                          {formatKg(parsedPreview.preDebonedInputKg || preDebonedInputKg)} já desossada
                        </span>
                      </div>
                      <p className="mt-1 text-slate-700 leading-relaxed">
                        No mesmo turno entraram carnes in natura (na carcaça) e carnes já desossadas. Para o cálculo do <strong>Rendimento da Desossa</strong> (que mede a carne obtida após separação de osso e sebo da carcaça), o volume de carne já desossada foi subtraído da carne vendável e da base da carcaça com osso:
                      </p>
                      <div className="mt-1.5 p-2 bg-white rounded border border-amber-200 font-mono text-[11px] text-slate-800">
                        Rend. Desossa = ({formatKg(parsedPreview.saleableCutsWeightKg, 1)} vendáveis - {formatKg(parsedPreview.preDebonedInputKg || preDebonedInputKg, 1)} já desossada) / ({formatKg(parsedPreview.rawMaterialWeightKg, 1)} MP - {formatKg(parsedPreview.preDebonedInputKg || preDebonedInputKg, 1)}) = <strong className="text-emerald-700">{formatPct(parsedPreview.deboningYieldNetPct, 2)}</strong>
                      </div>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs">
                  <div className="p-2.5 rounded-lg bg-white border border-emerald-100">
                    <span className="text-slate-500 block">Matéria-Prima (Carcaça)</span>
                    <span className="text-sm font-bold font-mono text-slate-900">
                      {formatKg(parsedPreview.rawMaterialWeightKg, 1)}
                    </span>
                    <span className="text-[10px] text-slate-500 block">
                      {parsedPreview.rawMaterialBoxes} peças / caixas
                    </span>
                  </div>

                  <div className="p-2.5 rounded-lg bg-white border border-emerald-100">
                    <span className="text-slate-500 block">Produto Acabado Total</span>
                    <span className="text-sm font-bold font-mono text-slate-900">
                      {formatKg(parsedPreview.finishedProductWeightKg, 1)}
                    </span>
                    <span className="text-[10px] text-slate-500 block">
                      Rend. Total: {formatPct(parsedPreview.totalYieldPct, 2)}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-lg bg-white border border-emerald-100">
                    <span className="text-slate-500 block">Carnes Vendáveis</span>
                    <span className="text-sm font-bold font-mono text-emerald-700">
                      {formatKg(parsedPreview.saleableCutsWeightKg, 1)}
                    </span>
                    <span className="text-[10px] text-slate-500 block">
                      Cortes comerciais
                    </span>
                  </div>

                  <div className="p-2.5 rounded-lg bg-white border border-emerald-100">
                    <span className="text-slate-500 block">Subprodutos (Osso + Sebo)</span>
                    <span className="text-sm font-bold font-mono text-amber-800">
                      {formatKg(parsedPreview.nonSaleableWeightKg, 1)}
                    </span>
                    <span className="text-[10px] text-slate-500 block">
                      Osso: {formatPct(parsedPreview.bonePct, 1)} • Sebo: {formatPct(parsedPreview.fatPct, 1)}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-lg bg-white border border-emerald-100">
                    <span className="text-slate-500 block">Perda / Quebra Real</span>
                    <span className={`text-sm font-bold font-mono ${parsedPreview.lossPct > 2.0 ? 'text-rose-700' : 'text-slate-900'}`}>
                      {formatPct(parsedPreview.lossPct, 3)} ({formatKg(parsedPreview.lossKg, 1)})
                    </span>
                    <span className="text-[10px] text-slate-500 block">
                      {parsedPreview.lossPct <= 2.0 ? 'Dentro do teto padrão' : 'Atenção: Acima da média'}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-lg bg-white border border-emerald-100">
                    <span className="text-slate-500 block">Rend. Desossa (Carnes/Carc.)</span>
                    <span className="text-sm font-bold font-mono text-emerald-700">
                      {formatPct(parsedPreview.deboningYieldNetPct, 2)}
                    </span>
                    <span className="text-[10px] text-slate-500 block">
                      Rendimento líquido
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs mt-3">
                  <div className="p-2.5 rounded-lg bg-white border border-emerald-100">
                    <span className="text-slate-500 block">Produtividade da Linha</span>
                    <span className="text-sm font-bold font-mono text-blue-700">
                      {parsedPreview.productivityKgPerPerson.toFixed(1)} kg/pessoa
                    </span>
                    <span className="text-[10px] text-slate-500 block">
                      {parsedPreview.operatorCount} colaboradores
                    </span>
                  </div>

                  <div className="p-2.5 rounded-lg bg-white border border-emerald-100">
                    <span className="text-slate-500 block">Faturamento PA</span>
                    <span className="text-sm font-bold font-mono text-emerald-800">
                      {formatCurrency(parsedPreview.finishedProductTotalValue)}
                    </span>
                    <span className="text-[10px] text-slate-500 block">
                      Preço médio: {parsedPreview.finishedProductWeightKg > 0 ? formatCurrency(parsedPreview.finishedProductTotalValue / parsedPreview.finishedProductWeightKg) + '/kg' : '-'}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-lg bg-white border border-emerald-100">
                    <span className="text-slate-500 block">Custo Total Carcaça</span>
                    <span className="text-sm font-bold font-mono text-slate-800">
                      {formatCurrency(parsedPreview.totalCarcassCost)}
                    </span>
                    <span className="text-[10px] text-slate-500 block">
                      Base: {formatCurrency(parsedPreview.carcassCostPerKg)}/kg
                    </span>
                  </div>

                  <div className="p-2.5 rounded-lg bg-white border border-emerald-100">
                    <span className="text-slate-500 block">Margem Bruta</span>
                    <span className={`text-sm font-bold font-mono ${parsedPreview.grossProfitValue >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                      {formatPct(parsedPreview.profitMarginPct, 2)} ({formatCurrency(parsedPreview.grossProfitValue)})
                    </span>
                    <span className="text-[10px] text-slate-500 block">
                      Resultado operacional
                    </span>
                  </div>
                </div>

                <div className="mt-3 text-xs text-slate-600 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 pt-2 border-t border-emerald-100">
                  <span>
                    Detalhamento: <strong>{parsedPreview.cuts.length} cortes individuais</strong> identificados
                  </span>
                  <span className="font-medium text-slate-500">
                    {parsedPreview.notes}
                  </span>
                </div>
              </div>
            )}

            {/* Error / Success Messages */}
            {errorMsg && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg text-xs font-semibold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                {errorMsg}
              </div>
            )}

            {successMsg && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs font-bold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                {successMsg}
              </div>
            )}

            {/* Submit Button */}
            <div className="flex items-center justify-between gap-3 pt-2">
              <button
                type="button"
                onClick={() => setActiveSubTab('corrections')}
                className="px-4 py-2.5 border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                <ListFilter className="w-4 h-4 text-slate-500" />
                Ver Relatórios Cadastrados ({records.length})
              </button>

              <button
                type="submit"
                disabled={!parsedPreview}
                className="px-6 py-2.5 bg-rose-900 hover:bg-rose-800 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-sm font-bold shadow-sm transition-all flex items-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                Processar e Salvar Lote de Produção
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Sub-tab 2: Reports List, Corrections and Deletions */}
      {activeSubTab === 'corrections' && (
        <ReportCorrectionsList
          onSelectReportForOPR={(id) => onSuccessUpload(id)}
          onNavigateToUpload={() => setActiveSubTab('upload')}
        />
      )}
    </div>
  );
};
