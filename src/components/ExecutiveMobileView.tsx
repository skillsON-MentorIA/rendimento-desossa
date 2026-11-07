import React, { useState, useMemo } from 'react';
import {
  Calendar,
  CalendarDays,
  CalendarRange,
  Clock,
  Layers,
  Scale,
  CheckCircle2,
  TrendingUp,
  Percent,
  Bone,
  AlertTriangle,
  Users,
  DollarSign,
  Share2,
  FileText,
  RefreshCw,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Filter,
  BarChart3,
  Smartphone,
  Shield,
  ChevronDown,
  Sparkles,
  ArrowUpRight,
  ArrowDownRight,
  Info,
  ScanFace
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { ProductionRecord, CutType } from '../types';
import { calculateSummary, formatCurrency, formatKg, formatPct } from '../utils/calculations';
import {
  getEnrolledBiometric,
  enrollBiometricFace,
  clearBiometricEnrollment,
  BiometricProfile
} from '../utils/biometricAuth';
import { OnePageReportPaisagem } from './OnePageReportPaisagem';

interface ExecutiveMobileViewProps {
  onBack?: () => void;
  onLogout?: () => void;
}

type DateFilterMode = 'DATA' | 'MES' | 'PERIODO' | 'ANO';
type CutFilterMode = 'CONSOLIDADO' | 'DT' | 'TR' | 'CT' | 'SU';
type ChartMetric = 'rendimento' | 'produtividade' | 'quebra' | 'subprodutos' | 'pesoMedio';

export const ExecutiveMobileView: React.FC<ExecutiveMobileViewProps> = ({ onBack, onLogout }) => {
  const { currentUser, records, logout, syncSupabase, fetchSupabase } = useApp();

  // 1. Primary Filter State (DATA, MÊS, PERÍODO, ANO)
  const [dateFilterMode, setDateFilterMode] = useState<DateFilterMode>('DATA');
  
  // Find available dates sorted
  const availableDates = useMemo(() => {
    const dates = Array.from(new Set(records.map(r => r.date).filter(Boolean)));
    return dates.sort((a, b) => b.localeCompare(a));
  }, [records]);

  // Default to most recent date
  const latestDate = availableDates[0] || new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState<string>(latestDate);
  const [selectedMonth, setSelectedMonth] = useState<string>(() => latestDate.substring(0, 7)); // YYYY-MM
  const [startDate, setStartDate] = useState<string>(() => {
    if (availableDates.length > 5) return availableDates[availableDates.length - 1];
    return latestDate;
  });
  const [endDate, setEndDate] = useState<string>(latestDate);
  const [selectedYear, setSelectedYear] = useState<string>(() => latestDate.substring(0, 4));

  // 2. Secondary Filter State (Desossa Cut Options)
  const [cutFilter, setCutFilter] = useState<CutFilterMode>('CONSOLIDADO');

  // 3. Chart Metric State
  const [chartMetric, setChartMetric] = useState<ChartMetric>('rendimento');
  const [selectedRecordForDetail, setSelectedRecordForDetail] = useState<ProductionRecord | null>(null);

  // Sync state
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);
  const [showInstallInstructions, setShowInstallInstructions] = useState<boolean>(false);
  const [showLandscapeReportModal, setShowLandscapeReportModal] = useState<boolean>(false);

  // Device detection
  const isIOS = typeof navigator !== 'undefined' && /iphone|ipad|ipod/i.test(navigator.userAgent || '');
  const isAndroid = typeof navigator !== 'undefined' && /android/i.test(navigator.userAgent || '');
  const isStandalone = typeof window !== 'undefined' && (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );

  // Biometric / Face ID state
  const [enrolledBio, setEnrolledBio] = useState<BiometricProfile | null>(() => getEnrolledBiometric());
  const [bioFeedback, setBioFeedback] = useState<string | null>(null);
  const [isBioEnrolling, setIsBioEnrolling] = useState<boolean>(false);

  const handleEnrollBio = async () => {
    setIsBioEnrolling(true);
    setBioFeedback(null);
    try {
      const res = await enrollBiometricFace(
        currentUser?.username || 'diretoria',
        currentUser?.name || 'Diretoria Executiva',
        currentUser?.role || 'DIRETORIA_EXECUTIVA'
      );
      if (res.success) {
        setEnrolledBio(getEnrolledBiometric());
        setBioFeedback('Leitura facial ativada com sucesso neste aparelho!');
      } else {
        setBioFeedback(res.message);
      }
    } catch {
      setBioFeedback('Erro ao ativar biometria.');
    } finally {
      setIsBioEnrolling(false);
      setTimeout(() => setBioFeedback(null), 5000);
    }
  };

  const handleClearBio = () => {
    clearBiometricEnrollment();
    setEnrolledBio(null);
    setBioFeedback('Leitura facial desativada deste aparelho.');
    setTimeout(() => setBioFeedback(null), 3000);
  };

  // Lista suspensa completa de meses para o filtro MÊS
  const monthOptions = useMemo(() => {
    const monthNames = [
      { num: '01', name: 'Janeiro' },
      { num: '02', name: 'Fevereiro' },
      { num: '03', name: 'Março' },
      { num: '04', name: 'Abril' },
      { num: '05', name: 'Maio' },
      { num: '06', name: 'Junho' },
      { num: '07', name: 'Julho' },
      { num: '08', name: 'Agosto' },
      { num: '09', name: 'Setembro' },
      { num: '10', name: 'Outubro' },
      { num: '11', name: 'Novembro' },
      { num: '12', name: 'Dezembro' },
    ];
    const opts: { value: string; label: string }[] = [];
    ['2026', '2025'].forEach(y => {
      monthNames.forEach(m => {
        opts.push({
          value: `${y}-${m.num}`,
          label: `${m.name} de ${y}`
        });
      });
    });
    return opts;
  }, []);

  // Handle Cloud Sync
  const handleCloudSync = async () => {
    setIsSyncing(true);
    setSyncFeedback(null);
    try {
      const res = await fetchSupabase();
      if (res.success) {
        setSyncFeedback('Dados atualizados com a nuvem!');
      } else {
        setSyncFeedback('Aviso: ' + res.message);
      }
    } catch {
      setSyncFeedback('Erro ao conectar à nuvem.');
    } finally {
      setIsSyncing(false);
      setTimeout(() => setSyncFeedback(null), 4000);
    }
  };

  // Filter records based on Date Filter Mode
  const dateFilteredRecords = useMemo(() => {
    if (!records || records.length === 0) return [];

    return records.filter(r => {
      if (!r.date) return false;

      if (dateFilterMode === 'DATA') {
        return r.date === selectedDate;
      }
      if (dateFilterMode === 'MES') {
        return r.date.startsWith(selectedMonth);
      }
      if (dateFilterMode === 'PERIODO') {
        return r.date >= startDate && r.date <= endDate;
      }
      if (dateFilterMode === 'ANO') {
        return r.date.startsWith(selectedYear);
      }
      return true;
    });
  }, [records, dateFilterMode, selectedDate, selectedMonth, startDate, endDate, selectedYear]);

  // Secondary Filter based on Cut Options
  const fullyFilteredRecords = useMemo(() => {
    if (cutFilter === 'CONSOLIDADO') {
      // Consolidado (DT + TR + CT)
      return dateFilteredRecords.filter(r => r.type === 'DIANTEIRO' || r.type === 'TRASEIRO' || r.type === 'COSTELA');
    }
    if (cutFilter === 'DT') {
      return dateFilteredRecords.filter(r => r.type === 'DIANTEIRO');
    }
    if (cutFilter === 'TR') {
      return dateFilteredRecords.filter(r => r.type === 'TRASEIRO');
    }
    if (cutFilter === 'CT') {
      return dateFilteredRecords.filter(r => r.type === 'COSTELA');
    }
    if (cutFilter === 'SU') {
      return dateFilteredRecords.filter(r => r.type === 'SUINO');
    }
    return dateFilteredRecords;
  }, [dateFilteredRecords, cutFilter]);

  // Calculate Summary for the 8 KPI Boxes
  const summary = useMemo(() => {
    return calculateSummary(fullyFilteredRecords);
  }, [fullyFilteredRecords]);

  // Total Carcasses / Pieces count
  const totalCarcassesOrBoxes = useMemo(() => {
    return fullyFilteredRecords.reduce((acc, r) => acc + (r.rawMaterialBoxes || 0), 0);
  }, [fullyFilteredRecords]);

  // Average carcass weight
  const avgCarcassWeight = useMemo(() => {
    if (totalCarcassesOrBoxes > 0) {
      return summary.totalRawMaterialKg / totalCarcassesOrBoxes;
    }
    return 0;
  }, [summary.totalRawMaterialKg, totalCarcassesOrBoxes]);

  // Last 15 records for the bar chart
  const last15Records = useMemo(() => {
    // Sort chronologically ascending for the chart timeline
    const sorted = [...fullyFilteredRecords].sort((a, b) => a.date.localeCompare(b.date));
    return sorted.slice(-15);
  }, [fullyFilteredRecords]);

  // Helper for date switching in DATA mode
  const handleDateNavigate = (direction: 'prev' | 'next') => {
    const idx = availableDates.indexOf(selectedDate);
    if (idx === -1) return;
    if (direction === 'prev' && idx < availableDates.length - 1) {
      setSelectedDate(availableDates[idx + 1]);
    } else if (direction === 'next' && idx > 0) {
      setSelectedDate(availableDates[idx - 1]);
    }
  };

  // Label text for the active period
  const periodLabel = useMemo(() => {
    if (dateFilterMode === 'DATA') {
      if (!selectedDate) return 'Sem data selecionada';
      const [y, m, d] = selectedDate.split('-');
      return `${d}/${m}/${y}`;
    }
    if (dateFilterMode === 'MES') {
      const [y, m] = selectedMonth.split('-');
      const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
      return `${months[parseInt(m, 10) - 1] || m} de ${y}`;
    }
    if (dateFilterMode === 'PERIODO') {
      const format = (dt: string) => {
        if (!dt) return '';
        const [y, m, d] = dt.split('-');
        return `${d}/${m}/${y}`;
      };
      return `${format(startDate)} a ${format(endDate)}`;
    }
    if (dateFilterMode === 'ANO') {
      return `Acumulado ${selectedYear}`;
    }
    return '';
  }, [dateFilterMode, selectedDate, selectedMonth, startDate, endDate, selectedYear]);

  // Cut label text
  const cutLabel = useMemo(() => {
    switch (cutFilter) {
      case 'CONSOLIDADO': return 'Consolidado (DT + TR + CT)';
      case 'DT': return 'Dianteiro (DT)';
      case 'TR': return 'Traseiro (TR)';
      case 'CT': return 'Costela (CT)';
      case 'SU': return 'Suíno (SU)';
      default: return 'Geral';
    }
  }, [cutFilter]);

  // Handle WhatsApp Export
  const handleWhatsAppShare = () => {
    const lines = [
      `*BH FOODS • LINHA INDUSTRIAL DE DESOSSA*`,
      `*MONITORAMENTO EXECUTIVO*`,
      `📅 *Período:* ${periodLabel}`,
      `🥩 *Linha:* ${cutLabel}`,
      `📊 *Lotes Processados:* ${summary.recordCount}`,
      `---------------------------------`,
      `⚖️ *1. ENTRADA:* ${summary.totalRawMaterialKg.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} kg`,
      `📦 *2. PEÇAS/CARCAÇAS:* ${totalCarcassesOrBoxes} un (${avgCarcassWeight.toFixed(1)} kg/peça)`,
      `✅ *3. SAÍDA (PA):* ${summary.totalFinishedProductKg.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} kg`,
      `📈 *4. RENDIMENTO DESOSSA:* ${summary.avgDeboningYieldNetPct.toFixed(2).replace('.', ',')}%`,
      `🦴 *5. SUB PRODUTOS:* ${summary.avgNonSaleablePct.toFixed(2).replace('.', ',')}% (${summary.totalNonSaleableKg.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} kg)`,
      `⚠️ *6. PERDA / QUEBRA:* ${summary.avgLossPct.toFixed(3).replace('.', ',')}% (${summary.totalLossKg.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} kg)`,
      `👥 *7. PRODUTIVIDADE:* ${summary.avgProductivityKgPerPerson.toFixed(1).replace('.', ',')} kg/pes (${summary.totalOperatorCount} pessoas)`,
      `💰 *8. MARGEM DE LUCRO:* ${summary.avgProfitMarginPct.toFixed(2).replace('.', ',')}% (${formatCurrency(summary.totalGrossProfitValue)})`,
      `---------------------------------`,
      `_Gerado em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} pelo FrigoKPI Mobile_`
    ];

    const message = encodeURIComponent(lines.join('\n'));
    const url = `https://api.whatsapp.com/send?text=${message}`;
    window.open(url, '_blank');
  };

  // Handle Print/PDF - Abre o Relatório Gerencial One Page Report Paisagem
  const handleGeneratePDF = () => {
    setShowLandscapeReportModal(true);
  };

  // Chart values calculation
  const chartData = useMemo(() => {
    return last15Records.map((r, idx) => {
      let val = 0;
      let unit = '';
      if (chartMetric === 'rendimento') {
        val = r.deboningYieldNetPct;
        unit = '%';
      } else if (chartMetric === 'produtividade') {
        val = r.productivityKgPerPerson;
        unit = ' kg/pes';
      } else if (chartMetric === 'quebra') {
        val = r.lossPct;
        unit = '%';
      } else if (chartMetric === 'subprodutos') {
        val = r.nonSaleablePct;
        unit = '%';
      } else if (chartMetric === 'pesoMedio') {
        val = r.rawMaterialAvgWeightKg || (r.rawMaterialBoxes > 0 ? r.rawMaterialWeightKg / r.rawMaterialBoxes : 0);
        unit = ' kg';
      }

      const [y, m, d] = (r.date || '').split('-');
      const shortDate = d && m ? `${d}/${m}` : `Lote ${idx + 1}`;
      const shortType = r.type === 'DIANTEIRO' ? 'DT' : r.type === 'TRASEIRO' ? 'TR' : r.type === 'COSTELA' ? 'CT' : 'SU';

      return {
        id: r.id,
        record: r,
        shortDate,
        shortType,
        value: val,
        unit,
        rawWeight: r.rawMaterialWeightKg,
        lossPct: r.lossPct,
      };
    });
  }, [last15Records, chartMetric]);

  const maxChartVal = useMemo(() => {
    if (chartData.length === 0) return 100;
    const max = Math.max(...chartData.map(d => d.value));
    return max > 0 ? max * 1.15 : 100;
  }, [chartData]);

  return (
    <div className="min-h-screen bg-black text-slate-100 flex flex-col font-sans antialiased selection:bg-emerald-600 selection:text-white pb-16 print:pb-0 print:bg-white print:text-black">
      {/* Admin preview banner if opened by an Admin */}
      {currentUser?.role === 'ADMIN' && onBack && (
        <div className="bg-amber-500/10 border-b border-amber-500/30 px-4 py-2 flex items-center justify-between text-xs text-amber-300 print:hidden">
          <div className="flex items-center gap-2">
            <Smartphone className="w-4 h-4 text-amber-400" />
            <span className="font-semibold">Modo de Simulação: Visão Diretoria Executiva</span>
          </div>
          <button
            onClick={onBack}
            className="px-3 py-1 bg-amber-500 hover:bg-amber-400 text-black font-bold rounded-lg transition-colors cursor-pointer"
          >
            Voltar ao Painel Geral
          </button>
        </div>
      )}

      {/* a) Top Header Simplificado */}
      <header className="sticky top-0 z-30 bg-black/95 backdrop-blur-md border-b border-zinc-800 px-4 py-3 shadow-md print:static print:bg-white print:border-b-2 print:border-black print:px-0">
        <div className="max-w-2xl mx-auto flex items-center justify-between gap-3">
          {/* Logo BH Foods & Título da Tela Proporcional e Discreto */}
          <div className="flex items-center gap-2.5">
            <div className="h-9 px-2.5 py-1 rounded-xl bg-white flex items-center justify-center shadow-md border border-zinc-700/80 shrink-0">
              <img
                src="/bh_foods_logo.png"
                alt="BH Foods"
                className="h-6 w-auto max-w-[65px] object-contain"
              />
            </div>
            <div>
              <h1 className="text-sm sm:text-base font-black tracking-tight text-white uppercase leading-none print:text-black">
                LINHA INDUSTRIAL DE DESOSSA
              </h1>
              <p className="text-[11px] text-zinc-400 font-medium tracking-wide mt-0.5 print:text-slate-600">
                BH Foods • Cockpit Executivo de Indicadores
              </p>
            </div>
          </div>

          {/* Quick Actions (Sync & Logout) - Hidden on Print */}
          <div className="flex items-center gap-1.5 print:hidden">
            <button
              onClick={handleCloudSync}
              disabled={isSyncing}
              title="Atualizar dados do Supabase"
              className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer relative"
            >
              <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin text-emerald-400' : ''}`} />
            </button>

            <button
              onClick={onLogout || logout}
              title="Sair do sistema"
              className="px-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-rose-400 hover:bg-zinc-800 transition-colors flex items-center gap-1 text-xs font-semibold cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sair</span>
            </button>
          </div>
        </div>

        {/* Sync feedback notification */}
        {syncFeedback && (
          <div className="max-w-2xl mx-auto mt-2 px-3 py-1.5 bg-emerald-950/80 border border-emerald-600/40 rounded-lg text-emerald-300 text-[11px] flex items-center justify-between print:hidden">
            <span>{syncFeedback}</span>
            <button onClick={() => setSyncFeedback(null)} className="text-emerald-400 font-bold ml-2">×</button>
          </div>
        )}
      </header>

      {/* Main Container - Mobile Centered Cockpit */}
      <main className="max-w-2xl mx-auto w-full px-3 sm:px-4 py-4 space-y-4">
        {/* Printable Filter Banner */}
        <div className="hidden print:flex items-center justify-between bg-slate-100 border border-slate-300 p-2.5 rounded-lg text-xs font-bold text-slate-800">
          <div>
            <span className="text-slate-500 uppercase text-[10px] block">Período Selecionado:</span>
            <span>{periodLabel}</span>
          </div>
          <div className="text-right">
            <span className="text-slate-500 uppercase text-[10px] block">Linha de Desossa:</span>
            <span>{cutLabel}</span>
          </div>
        </div>

        {/* =========================================================================
            b) MENU DE FILTROS COM BOTÕES LARGOS E VISÍVEIS (DATA, MÊS, PERÍODO, ANO)
           ========================================================================= */}
        <section className="bg-zinc-950 border border-zinc-800 rounded-2xl p-3 sm:p-4 shadow-lg space-y-3 print:hidden">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-300 uppercase tracking-wider">
              <Calendar className="w-4 h-4 text-emerald-400" />
              <span>PERÍODO</span>
            </div>
            <span className="text-[11px] font-semibold text-emerald-400 bg-emerald-950/50 px-2 py-0.5 rounded-md border border-emerald-800/40">
              {periodLabel}
            </span>
          </div>

          {/* 4 Wide, Touch-Friendly Buttons */}
          <div className="grid grid-cols-4 gap-2">
            <button
              type="button"
              onClick={() => setDateFilterMode('DATA')}
              className={`py-3 px-2 rounded-xl text-xs font-black transition-all flex flex-col items-center justify-center gap-1 cursor-pointer border ${
                dateFilterMode === 'DATA'
                  ? 'bg-gradient-to-b from-emerald-600 to-emerald-700 text-white border-emerald-400 shadow-lg shadow-emerald-950/50'
                  : 'bg-zinc-900 hover:bg-zinc-800/80 text-zinc-400 border-zinc-800 hover:text-white'
              }`}
            >
              <Calendar className="w-4 h-4" />
              <span>DATA</span>
            </button>

            <button
              type="button"
              onClick={() => setDateFilterMode('MES')}
              className={`py-3 px-2 rounded-xl text-xs font-black transition-all flex flex-col items-center justify-center gap-1 cursor-pointer border ${
                dateFilterMode === 'MES'
                  ? 'bg-gradient-to-b from-emerald-600 to-emerald-700 text-white border-emerald-400 shadow-lg shadow-emerald-950/50'
                  : 'bg-zinc-900 hover:bg-zinc-800/80 text-zinc-400 border-zinc-800 hover:text-white'
              }`}
            >
              <CalendarDays className="w-4 h-4" />
              <span>MÊS</span>
            </button>

            <button
              type="button"
              onClick={() => setDateFilterMode('PERIODO')}
              className={`py-3 px-2 rounded-xl text-xs font-black transition-all flex flex-col items-center justify-center gap-1 cursor-pointer border ${
                dateFilterMode === 'PERIODO'
                  ? 'bg-gradient-to-b from-emerald-600 to-emerald-700 text-white border-emerald-400 shadow-lg shadow-emerald-950/50'
                  : 'bg-zinc-900 hover:bg-zinc-800/80 text-zinc-400 border-zinc-800 hover:text-white'
              }`}
            >
              <CalendarRange className="w-4 h-4" />
              <span>PERÍODO</span>
            </button>

            <button
              type="button"
              onClick={() => setDateFilterMode('ANO')}
              className={`py-3 px-2 rounded-xl text-xs font-black transition-all flex flex-col items-center justify-center gap-1 cursor-pointer border ${
                dateFilterMode === 'ANO'
                  ? 'bg-gradient-to-b from-emerald-600 to-emerald-700 text-white border-emerald-400 shadow-lg shadow-emerald-950/50'
                  : 'bg-zinc-900 hover:bg-zinc-800/80 text-zinc-400 border-zinc-800 hover:text-white'
              }`}
            >
              <Clock className="w-4 h-4" />
              <span>ANO</span>
            </button>
          </div>

          {/* Contextual Selector Based on Active Button */}
          <div className="pt-2 border-t border-zinc-900">
            {dateFilterMode === 'DATA' && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleDateNavigate('prev')}
                  className="p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-800 cursor-pointer"
                  title="Dia anterior"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>

                <div className="flex-1 relative">
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2.5 text-center text-sm font-bold text-white focus:outline-none focus:border-emerald-500 cursor-pointer"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => handleDateNavigate('next')}
                  className="p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-800 cursor-pointer"
                  title="Próximo dia"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>

                {availableDates.length > 0 && selectedDate !== availableDates[0] && (
                  <button
                    type="button"
                    onClick={() => setSelectedDate(availableDates[0])}
                    className="px-2.5 py-2.5 bg-emerald-950 border border-emerald-600/40 hover:bg-emerald-900 text-emerald-300 rounded-xl text-xs font-bold cursor-pointer"
                    title="Ir para a última data com desossa gravada"
                  >
                    Última
                  </button>
                )}
              </div>
            )}

            {dateFilterMode === 'MES' && (
              <div className="flex items-center gap-2 relative">
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2.5 text-center text-sm font-bold text-white focus:outline-none focus:border-emerald-500 cursor-pointer appearance-none pr-8"
                >
                  {monthOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 text-emerald-400 absolute right-3 top-3.5 pointer-events-none" />
              </div>
            )}

            {dateFilterMode === 'PERIODO' && (
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-zinc-400 block mb-1 font-semibold uppercase">De:</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-2 py-2 text-xs font-bold text-white focus:outline-none focus:border-emerald-500 cursor-pointer"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-zinc-400 block mb-1 font-semibold uppercase">Até:</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-2 py-2 text-xs font-bold text-white focus:outline-none focus:border-emerald-500 cursor-pointer"
                  />
                </div>
              </div>
            )}

            {dateFilterMode === 'ANO' && (
              <div className="flex items-center gap-2">
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2.5 text-center text-sm font-bold text-white focus:outline-none focus:border-emerald-500 cursor-pointer"
                >
                  <option value="2026">Ano 2026 (Exercício Corrente)</option>
                  <option value="2025">Ano 2025</option>
                  <option value="2024">Ano 2024</option>
                </select>
              </div>
            )}
          </div>
        </section>

        {/* =========================================================================
            c) BOX DELIMITANDO O OUTRO MENU DE FILTROS COM AS OPÇÕES DE DESOSSA
            1) Consolidado (DT + TR + CT)
            2) DT (Dianteiro)
            3) TR (Traseiro)
            4) CT (Costela)
            5) SU (Suíno)
           ========================================================================= */}
        <section className="bg-zinc-950 border border-zinc-800 rounded-2xl p-3 sm:p-4 shadow-lg space-y-2.5 print:hidden">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-300 uppercase tracking-wider">
              <Layers className="w-4 h-4 text-cyan-400" />
              <span>Opções de Desossa & Linhas</span>
            </div>
            <span className="text-[11px] font-semibold text-zinc-400">
              {fullyFilteredRecords.length} lote(s)
            </span>
          </div>

          {/* Layout Personalizado: CONSOLIDADO ocupa as 2 linhas em formato 1:1 (quadrado), e os 4 botões restantes ocupam as 2 linhas no espaço proporcional restante */}
          <div className="flex gap-2.5 items-stretch">
            {/* a) Botão CONSOLIDADO ocupando as 2 linhas em formato 1:1 */}
            <button
              type="button"
              onClick={() => setCutFilter('CONSOLIDADO')}
              className={`w-[115px] sm:w-[135px] shrink-0 aspect-square rounded-2xl p-2 text-center flex flex-col items-center justify-center gap-1.5 cursor-pointer border transition-all ${
                cutFilter === 'CONSOLIDADO'
                  ? 'bg-gradient-to-br from-cyan-600 via-blue-700 to-indigo-800 text-white border-cyan-400 shadow-lg shadow-cyan-950/60 ring-2 ring-cyan-400/40'
                  : 'bg-zinc-900/90 hover:bg-zinc-800 text-zinc-300 border-zinc-800'
              }`}
            >
              <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-xl shadow-inner border border-white/10">
                🌐
              </div>
              <span className="text-[11px] font-black uppercase tracking-tight leading-tight">
                CONSOLIDADO
              </span>
              <span className="text-[9px] text-zinc-300/80 font-semibold bg-black/40 px-1.5 py-0.5 rounded">
                DT + TR + CT
              </span>
            </button>

            {/* b) Os demais 4 botões (DT, TR, CT, SU) ocupando as 2 linhas proporcionalmente no espaço restante */}
            <div className="flex-1 grid grid-cols-2 grid-rows-2 gap-2">
              {/* 2) DT */}
              <button
                type="button"
                onClick={() => setCutFilter('DT')}
                className={`py-2 px-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer border ${
                  cutFilter === 'DT'
                    ? 'bg-gradient-to-r from-amber-600 to-orange-700 text-white border-amber-400 shadow-md shadow-amber-950/40 ring-1 ring-amber-400/40'
                    : 'bg-zinc-900/90 hover:bg-zinc-800 text-zinc-300 border-zinc-800'
                }`}
              >
                <span className="text-sm">🐮</span>
                <span className="truncate">DT (Dianteiro)</span>
              </button>

              {/* 3) TR */}
              <button
                type="button"
                onClick={() => setCutFilter('TR')}
                className={`py-2 px-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer border ${
                  cutFilter === 'TR'
                    ? 'bg-gradient-to-r from-rose-600 to-red-700 text-white border-rose-400 shadow-md shadow-rose-950/40 ring-1 ring-rose-400/40'
                    : 'bg-zinc-900/90 hover:bg-zinc-800 text-zinc-300 border-zinc-800'
                }`}
              >
                <span className="text-sm">🥩</span>
                <span className="truncate">TR (Traseiro)</span>
              </button>

              {/* 4) CT */}
              <button
                type="button"
                onClick={() => setCutFilter('CT')}
                className={`py-2 px-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer border ${
                  cutFilter === 'CT'
                    ? 'bg-gradient-to-r from-orange-600 to-amber-700 text-white border-orange-400 shadow-md shadow-orange-950/40 ring-1 ring-orange-400/40'
                    : 'bg-zinc-900/90 hover:bg-zinc-800 text-zinc-300 border-zinc-800'
                }`}
              >
                <span className="text-sm">🍖</span>
                <span className="truncate">CT (Costela)</span>
              </button>

              {/* 5) SU */}
              <button
                type="button"
                onClick={() => setCutFilter('SU')}
                className={`py-2 px-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer border ${
                  cutFilter === 'SU'
                    ? 'bg-gradient-to-r from-pink-600 to-rose-700 text-white border-pink-400 shadow-md shadow-pink-950/40 ring-1 ring-pink-400/40'
                    : 'bg-zinc-900/90 hover:bg-zinc-800 text-zinc-300 border-zinc-800'
                }`}
              >
                <span className="text-sm">🥓</span>
                <span className="truncate">SU (Suíno)</span>
              </button>
            </div>
          </div>
        </section>

        {/* =========================================================================
            d) 8 BOXES COM OS INDICADORES SOLICITADOS (LAYOUT 4 BOX POR LINHA)
            1) ENTRADA (Kg)
            2) QTD. CARCAÇAS/PEÇAS
            3) SAÍDA (Kg)
            4) RENDIMENTO DESOSSA (%)
            5) SUB PRODUTOS
            6) PERDA / QUEBRA
            7) PRODUTIVIDADE
            8) MARGEM DE LUCRO
           ========================================================================= */}
        <section className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <span className="text-[11px] font-black uppercase text-zinc-400 tracking-wider flex items-center gap-1.5">
              <BarChart3 className="w-3.5 h-3.5 text-emerald-400" />
              Painel de Indicadores Estratégicos
            </span>
            <span className="text-[10px] text-zinc-500 font-medium">
              4 Boxes por linha
            </span>
          </div>

          {/* Responsive Grid: 4 boxes per row on sm/md screens, 2 on ultra narrow */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-2.5">
            {/* 1) ENTRADA (Kg) */}
            <div className="bg-zinc-950 border border-zinc-800 hover:border-cyan-500/50 rounded-2xl p-3 flex flex-col justify-between transition-all">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase text-zinc-400">1. ENTRADA</span>
                <Scale className="w-3.5 h-3.5 text-cyan-400" />
              </div>
              <div className="my-1.5">
                <p className="text-sm sm:text-base font-black text-cyan-300 tracking-tight leading-none">
                  {summary.totalRawMaterialKg.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}
                  <span className="text-[10px] font-bold text-cyan-400 ml-1">kg</span>
                </p>
              </div>
              <p className="text-[10px] text-zinc-500 font-medium truncate">
                Carcaça c/ osso bruta
              </p>
            </div>

            {/* 2) QTD. CARCAÇAS/PEÇAS */}
            <div className="bg-zinc-950 border border-zinc-800 hover:border-indigo-500/50 rounded-2xl p-3 flex flex-col justify-between transition-all">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase text-zinc-400">2. QTD. PEÇAS</span>
                <Layers className="w-3.5 h-3.5 text-indigo-400" />
              </div>
              <div className="my-1.5">
                <p className="text-sm sm:text-base font-black text-indigo-300 tracking-tight leading-none">
                  {totalCarcassesOrBoxes.toLocaleString('pt-BR')}
                  <span className="text-[10px] font-bold text-indigo-400 ml-1">un</span>
                </p>
              </div>
              <p className="text-[10px] text-zinc-500 font-medium truncate">
                Média: {avgCarcassWeight.toFixed(1)} kg/pc
              </p>
            </div>

            {/* 3) SAÍDA (Kg) */}
            <div className="bg-zinc-950 border border-zinc-800 hover:border-emerald-500/50 rounded-2xl p-3 flex flex-col justify-between transition-all">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase text-zinc-400">3. SAÍDA (PA)</span>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              </div>
              <div className="my-1.5">
                <p className="text-sm sm:text-base font-black text-emerald-300 tracking-tight leading-none">
                  {summary.totalFinishedProductKg.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}
                  <span className="text-[10px] font-bold text-emerald-400 ml-1">kg</span>
                </p>
              </div>
              <p className="text-[10px] text-zinc-500 font-medium truncate">
                Produto Acabado Total
              </p>
            </div>

            {/* 4) RENDIMENTO DESOSSA (%) */}
            <div className="bg-zinc-950 border-2 border-emerald-500/40 rounded-2xl p-3 flex flex-col justify-between shadow-lg shadow-emerald-950/30 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase text-emerald-400">4. RENDIMENTO</span>
                <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
              </div>
              <div className="my-1.5">
                <p className="text-base sm:text-lg font-black text-emerald-300 tracking-tight leading-none">
                  {summary.avgDeboningYieldNetPct.toFixed(2).replace('.', ',')}%
                </p>
              </div>
              <p className="text-[10px] text-emerald-500 font-medium truncate">
                Carnes s/ osso e sebo
              </p>
            </div>

            {/* 5) SUB PRODUTOS */}
            <div className="bg-zinc-950 border border-zinc-800 hover:border-amber-500/50 rounded-2xl p-3 flex flex-col justify-between transition-all">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase text-zinc-400">5. SUB PRODUTOS</span>
                <Bone className="w-3.5 h-3.5 text-amber-400" />
              </div>
              <div className="my-1.5">
                <p className="text-sm sm:text-base font-black text-amber-300 tracking-tight leading-none">
                  {summary.avgNonSaleablePct.toFixed(2).replace('.', ',')}%
                </p>
              </div>
              <p className="text-[10px] text-zinc-500 font-medium truncate">
                {summary.totalNonSaleableKg.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} kg (Osso+Sebo)
              </p>
            </div>

            {/* 6) PERDA / QUEBRA */}
            <div className="bg-zinc-950 border border-zinc-800 hover:border-rose-500/50 rounded-2xl p-3 flex flex-col justify-between transition-all">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase text-zinc-400">6. PERDA/QUEBRA</span>
                <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
              </div>
              <div className="my-1.5">
                <p className="text-sm sm:text-base font-black text-rose-300 tracking-tight leading-none">
                  {summary.avgLossPct.toFixed(3).replace('.', ',')}%
                </p>
              </div>
              <p className="text-[10px] text-zinc-500 font-medium truncate">
                Quebra: {summary.totalLossKg.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} kg
              </p>
            </div>

            {/* 7) PRODUTIVIDADE */}
            <div className="bg-zinc-950 border border-zinc-800 hover:border-sky-500/50 rounded-2xl p-3 flex flex-col justify-between transition-all">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase text-zinc-400">7. PRODUTIVIDADE</span>
                <Users className="w-3.5 h-3.5 text-sky-400" />
              </div>
              <div className="my-1.5">
                <p className="text-sm sm:text-base font-black text-sky-300 tracking-tight leading-none">
                  {summary.avgProductivityKgPerPerson.toFixed(1).replace('.', ',')}
                  <span className="text-[10px] font-bold text-sky-400 ml-1">kg/p</span>
                </p>
              </div>
              <p className="text-[10px] text-zinc-500 font-medium truncate">
                Equipe: {summary.totalOperatorCount} pessoas
              </p>
            </div>

            {/* 8) MARGEM DE LUCRO */}
            <div className="bg-zinc-950 border border-zinc-800 hover:border-emerald-500/50 rounded-2xl p-3 flex flex-col justify-between transition-all">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase text-zinc-400">8. MARGEM LUCRO</span>
                <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
              </div>
              <div className="my-1.5">
                <p className="text-sm sm:text-base font-black text-emerald-400 tracking-tight leading-none">
                  {summary.avgProfitMarginPct.toFixed(2).replace('.', ',')}%
                </p>
              </div>
              <p className="text-[10px] text-zinc-500 font-medium truncate">
                {formatCurrency(summary.totalGrossProfitValue)}
              </p>
            </div>
          </div>
        </section>

        {/* =========================================================================
            e) GRÁFICO DE BARRAS COM OS ÚLTIMOS 15 REGISTROS
            Menu de filtro com Lista Suspensa Elegante e Proporcional
           ========================================================================= */}
        <section className="bg-zinc-950 border border-zinc-800 rounded-2xl p-3.5 sm:p-4 shadow-lg space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-emerald-950/80 border border-emerald-600/40 flex items-center justify-center text-emerald-400">
                <BarChart3 className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                  Evolução Histórica (Últimos 15 Registros)
                </h3>
                <span className="text-[10px] text-zinc-500">
                  {chartData.length} lote(s) exibidos
                </span>
              </div>
            </div>

            {/* Lista Suspensa Elegante e Proporcional */}
            <div className="relative w-full sm:w-64">
              <select
                value={chartMetric}
                onChange={(e) => setChartMetric(e.target.value as ChartMetric)}
                className="w-full bg-zinc-900 border border-zinc-700 hover:border-emerald-500 rounded-xl px-3 py-2 text-xs font-bold text-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 cursor-pointer appearance-none pr-8 transition-colors"
              >
                <option value="rendimento">📈 Rendimento da Desossa (%)</option>
                <option value="produtividade">⚡ Produtividade (kg/pessoa)</option>
                <option value="quebra">⚠️ Perda / Quebra (%)</option>
                <option value="subprodutos">🦴 Sub Produtos - Osso & Sebo (%)</option>
                <option value="pesoMedio">⚖️ Peso Médio da Carcaça (kg)</option>
              </select>
              <ChevronDown className="w-4 h-4 text-emerald-400 absolute right-3 top-2.5 pointer-events-none" />
            </div>
          </div>

          {/* Interactive Bar Chart (Responsive SVG) */}
          {chartData.length === 0 ? (
            <div className="py-12 text-center text-zinc-500 text-xs">
              Nenhum registro encontrado para o filtro e período selecionados.
            </div>
          ) : (
            <div className="space-y-2 pt-2">
              <div className="h-56 w-full flex items-end gap-1.5 sm:gap-2 px-1 pt-6 pb-2 border-b border-zinc-800 overflow-x-auto">
                {chartData.map((item, idx) => {
                  const heightPct = Math.min(100, Math.max(12, (item.value / maxChartVal) * 100));
                  const isSelected = selectedRecordForDetail?.id === item.id;

                  // Bar color styling based on metric
                  let barGradient = 'from-emerald-500 to-teal-700';
                  let textColor = 'text-emerald-300';
                  if (chartMetric === 'produtividade') {
                    barGradient = 'from-sky-500 to-blue-700';
                    textColor = 'text-sky-300';
                  } else if (chartMetric === 'quebra') {
                    barGradient = item.value > 1.0 ? 'from-rose-500 to-red-700' : 'from-amber-500 to-orange-700';
                    textColor = item.value > 1.0 ? 'text-rose-300' : 'text-amber-300';
                  } else if (chartMetric === 'subprodutos') {
                    barGradient = 'from-amber-500 to-yellow-700';
                    textColor = 'text-amber-300';
                  } else if (chartMetric === 'pesoMedio') {
                    barGradient = 'from-indigo-500 to-purple-700';
                    textColor = 'text-indigo-300';
                  }

                  return (
                    <div
                      key={item.id || idx}
                      onClick={() => setSelectedRecordForDetail(item.record)}
                      className="flex-1 min-w-[28px] max-w-[42px] h-full flex flex-col justify-end items-center group cursor-pointer relative"
                    >
                      {/* Value label on top of bar */}
                      <span className={`text-[9px] font-black ${textColor} mb-1 leading-none text-center transform -rotate-45 sm:rotate-0 origin-bottom`}>
                        {item.value < 10
                          ? item.value.toFixed(2).replace('.', ',')
                          : item.value.toFixed(1).replace('.', ',')}
                      </span>

                      {/* Bar Pillar */}
                      <div
                        style={{ height: `${heightPct}%` }}
                        className={`w-full rounded-t-md bg-gradient-to-t ${barGradient} transition-all duration-300 group-hover:brightness-125 border border-white/10 ${
                          isSelected ? 'ring-2 ring-white brightness-125' : ''
                        }`}
                      />

                      {/* Date & Type Tag */}
                      <div className="mt-1.5 flex flex-col items-center leading-none">
                        <span className="text-[9px] font-bold text-zinc-300">
                          {item.shortDate}
                        </span>
                        <span className="text-[8px] font-semibold text-zinc-500 uppercase mt-0.5">
                          {item.shortType}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex items-center justify-between text-[10px] text-zinc-500 px-1 pt-1">
                <span>Toque em qualquer barra para abrir detalhes do lote</span>
                <span>Máx: {maxChartVal.toFixed(1)}</span>
              </div>
            </div>
          )}

          {/* Selected Record Mini Detail Drawer */}
          {selectedRecordForDetail && (
            <div className="mt-3 p-3 bg-zinc-900 border border-zinc-700 rounded-xl relative">
              <button
                onClick={() => setSelectedRecordForDetail(null)}
                className="absolute top-2 right-2 text-zinc-400 hover:text-white font-bold p-1"
              >
                ✕
              </button>
              <div className="flex items-center gap-2 mb-2">
                <span className="px-2 py-0.5 rounded-md bg-emerald-950 text-emerald-300 border border-emerald-800 text-[10px] font-bold uppercase">
                  {selectedRecordForDetail.type} • {selectedRecordForDetail.date}
                </span>
                <span className="text-xs text-zinc-300 font-semibold truncate">
                  {selectedRecordForDetail.responsibleOperator || 'Linha Industrial'}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 text-xs">
                <div className="bg-black/60 p-2 rounded-lg border border-zinc-800">
                  <span className="text-[10px] text-zinc-400 block">Entrada MP</span>
                  <span className="font-bold text-cyan-300">
                    {formatKg(selectedRecordForDetail.rawMaterialWeightKg, 1)}
                  </span>
                </div>
                <div className="bg-black/60 p-2 rounded-lg border border-zinc-800">
                  <span className="text-[10px] text-zinc-400 block">Rendimento</span>
                  <span className="font-bold text-emerald-300">
                    {selectedRecordForDetail.deboningYieldNetPct.toFixed(2).replace('.', ',')}%
                  </span>
                </div>
                <div className="bg-black/60 p-2 rounded-lg border border-zinc-800">
                  <span className="text-[10px] text-zinc-400 block">Quebra</span>
                  <span className="font-bold text-rose-300">
                    {selectedRecordForDetail.lossPct.toFixed(3).replace('.', ',')}%
                  </span>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* =========================================================================
            f) GERAÇÃO DESSA VISÃO EM PDF E COMPARTILHAMENTO WHATSAPP
           ========================================================================= */}
        <section className="bg-zinc-950 border border-zinc-800 rounded-2xl p-4 shadow-lg space-y-3 print:hidden">
          <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-300 uppercase tracking-wider">
            <Share2 className="w-4 h-4 text-emerald-400" />
            <span>Exportação & Envio Executivo</span>
          </div>

          <p className="text-xs text-zinc-400 leading-relaxed">
            Envie este resumo consolidado diretamente para o WhatsApp de diretores e acionistas ou gere o relatório oficial para impressão/PDF.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
            {/* WhatsApp Share Button */}
            <button
              type="button"
              onClick={handleWhatsAppShare}
              className="w-full py-3 px-4 bg-gradient-to-r from-emerald-600 to-green-700 hover:from-emerald-500 hover:to-green-600 text-white rounded-xl text-xs font-black shadow-lg shadow-emerald-950/60 flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-[0.98]"
            >
              <Share2 className="w-4 h-4" />
              <span>Enviar via WhatsApp</span>
            </button>

            {/* PDF Generation Button */}
            <button
              type="button"
              onClick={handleGeneratePDF}
              className="w-full py-3 px-4 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 hover:text-white border border-zinc-700 rounded-xl text-xs font-black flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-[0.98]"
            >
              <FileText className="w-4 h-4 text-rose-400" />
              <span>Gerar / Baixar PDF (OPR Mensal)</span>
            </button>
          </div>
        </section>

        {/* =========================================================================
            g) AUTENTICAÇÃO FACIAL NATIVA (FACE ID / BIOMETRIA)
           ========================================================================= */}
        <section className="bg-zinc-950 border border-zinc-800 rounded-2xl p-4 shadow-lg space-y-3 print:hidden">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-emerald-950/80 border border-emerald-600/40 flex items-center justify-center text-emerald-400 shadow-md">
                <ScanFace className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                  Leitura Facial (Face ID / Biometria)
                </h3>
                <p className="text-[10px] text-zinc-400">
                  Login nativo com 1 toque no iPhone ou Android
                </p>
              </div>
            </div>

            {enrolledBio ? (
              <span className="px-2 py-0.5 rounded-full bg-emerald-950 border border-emerald-600/50 text-emerald-300 text-[10px] font-bold">
                ✓ Ativo
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-400 text-[10px] font-medium">
                Não cadastrado
              </span>
            )}
          </div>

          {bioFeedback && (
            <div className="p-2.5 bg-emerald-950/90 border border-emerald-500/50 rounded-xl text-emerald-200 text-xs font-medium flex items-center gap-2 animate-in fade-in">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>{bioFeedback}</span>
            </div>
          )}

          {enrolledBio ? (
            <div className="bg-zinc-900/90 border border-zinc-800 rounded-xl p-3 space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-400">Usuário vinculado:</span>
                <span className="font-bold text-white">@{enrolledBio.username} ({enrolledBio.name})</span>
              </div>
              <div className="flex items-center justify-between text-[11px] text-zinc-500">
                <span>Dispositivo:</span>
                <span className="text-zinc-400 font-mono">{enrolledBio.deviceType || 'Smartphone Mobile'}</span>
              </div>
              <div className="flex items-center justify-between text-[11px] text-zinc-500">
                <span>Data do cadastro:</span>
                <span className="text-zinc-400">{new Date(enrolledBio.enrolledAt).toLocaleDateString('pt-BR')}</span>
              </div>

              <div className="pt-2 flex items-center gap-2 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={handleEnrollBio}
                  disabled={isBioEnrolling}
                  className="flex-1 py-2 px-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 hover:text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isBioEnrolling ? 'animate-spin' : ''}`} />
                  <span>Recadastrar Face ID</span>
                </button>
                <button
                  type="button"
                  onClick={handleClearBio}
                  className="py-2 px-3 bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-800/50 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                >
                  Desativar
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-2.5">
              <p className="text-xs text-zinc-400 leading-relaxed">
                Você pode habilitar o reconhecimento biométrico nativo (Face ID no iPhone ou Leitura Digital/Facial no Android). Nos próximos acessos, bastará tocar no botão biométrico na tela de login.
              </p>
              <button
                type="button"
                onClick={handleEnrollBio}
                disabled={isBioEnrolling}
                className="w-full py-3 px-4 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-black shadow-lg shadow-emerald-950/60 flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-[0.98]"
              >
                <ScanFace className={`w-4 h-4 ${isBioEnrolling ? 'animate-pulse' : ''}`} />
                <span>{isBioEnrolling ? 'Escaneando Leitura Facial...' : 'Cadastrar Leitura Facial (Face ID) Agora'}</span>
              </button>
            </div>
          )}
        </section>

        {/* =========================================================================
            h) COMO INSTALAR NO CELULAR (EXPANSÍVEL COM APENAS 1 BOTÃO - CLEAN)
           ========================================================================= */}
        <section className="print:hidden space-y-2.5">
          <button
            type="button"
            onClick={() => setShowInstallInstructions(prev => !prev)}
            className="w-full py-3 px-4 bg-zinc-950 hover:bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded-2xl text-xs font-bold text-zinc-300 hover:text-white flex items-center justify-between shadow-md transition-all cursor-pointer group active:scale-[0.99]"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-cyan-950/80 border border-cyan-600/40 flex items-center justify-center text-cyan-400 group-hover:scale-105 transition-transform">
                <Smartphone className="w-4 h-4" />
              </div>
              <span className="text-xs uppercase tracking-wider font-extrabold text-zinc-200">
                Como Instalar no Celular
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-zinc-500 group-hover:text-cyan-400">
              <span>{showInstallInstructions ? 'Ocultar' : 'Ver instruções (iPhone / Android)'}</span>
              <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${showInstallInstructions ? 'rotate-180 text-cyan-400' : ''}`} />
            </div>
          </button>

          {/* Instruções detalhadas exibidas somente ao clicar no botão */}
          {showInstallInstructions && (
            <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-4 shadow-xl space-y-3.5 animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="flex items-center gap-2 text-xs font-bold text-zinc-300 uppercase tracking-wider">
                <Smartphone className="w-4 h-4 text-cyan-400" />
                <span>Guia Rápido de Instalação Mobile</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                {/* Box iPhone */}
                <div className="bg-zinc-900/90 border border-zinc-800 rounded-xl p-3.5 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-white">
                    <span className="text-base">🍎</span>
                    <span>No iPhone (Apple Safari):</span>
                  </div>
                  <ol className="text-xs text-zinc-300 space-y-1.5 list-decimal list-inside leading-relaxed pl-0.5">
                    <li>Abra o link do sistema no navegador <strong className="text-white">Safari</strong>.</li>
                    <li>Toque no botão <strong className="text-emerald-400">Compartilhar</strong> (ícone do quadrado com a seta para cima <span className="font-mono text-emerald-400">⬆</span> na barra inferior).</li>
                    <li>Role as opções para baixo e selecione <strong className="text-white">"Adicionar à Tela de Início"</strong>.</li>
                    <li>Toque em <strong className="text-emerald-400">"Adicionar"</strong> no canto superior direito.</li>
                  </ol>
                  <div className="pt-1 text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 shrink-0" />
                    <span>Ícone estilizado da BH Foods criado na tela inicial</span>
                  </div>
                </div>

                {/* Box Android */}
                <div className="bg-zinc-900/90 border border-zinc-800 rounded-xl p-3.5 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-white">
                    <span className="text-base">🤖</span>
                    <span>No Android (Google Chrome):</span>
                  </div>
                  <ol className="text-xs text-zinc-300 space-y-1.5 list-decimal list-inside leading-relaxed pl-0.5">
                    <li>Abra o link do sistema no <strong className="text-white">Google Chrome</strong>.</li>
                    <li>Toque nos <strong className="text-emerald-400">3 pontinhos</strong> verticais no canto superior direito.</li>
                    <li>Selecione <strong className="text-white">"Instalar aplicativo"</strong> ou <strong className="text-white">"Adicionar à tela inicial"</strong>.</li>
                    <li>Confirme o prompt clicando em <strong className="text-emerald-400">"Instalar"</strong>.</li>
                  </ol>
                  <div className="pt-1 text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 shrink-0" />
                    <span>App instalado na gaveta de apps com inicialização rápida</span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowInstallInstructions(false)}
                className="w-full py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-xl text-xs font-semibold transition-colors text-center cursor-pointer"
              >
                Recolher Instruções
              </button>
            </div>
          )}
        </section>

        {/* Institutional Footnote */}
        <footer className="text-center pt-2 pb-4 text-[11px] text-zinc-500 space-y-1">
          <p className="font-semibold text-zinc-400">
            BH FOODS COMERCIO E INDUSTRIA LTDA
          </p>
          <p>
            Painel Executivo Móvel • Versão 3.5 • Sincronizado com Supabase Cloud
          </p>
        </footer>
      </main>

      {/* Modal One Page Report Mensal */}
      {showLandscapeReportModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-md overflow-y-auto p-2 sm:p-4 animate-in fade-in">
          <div className="max-w-[1440px] mx-auto mb-2 flex justify-between items-center print:hidden bg-zinc-900 border border-zinc-700 px-4 py-2 rounded-xl text-white">
            <span className="text-xs font-bold uppercase tracking-wider flex items-center gap-2">
              <span>📄</span> One Page Report Mensal • Visualização e Impressão
            </span>
            <button
              onClick={() => setShowLandscapeReportModal(false)}
              className="px-3 py-1 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg text-xs font-bold cursor-pointer"
            >
              ✕ Fechar / Voltar ao Cockpit
            </button>
          </div>
          <OnePageReportPaisagem
            onNavigateToMobileCockpit={() => setShowLandscapeReportModal(false)}
          />
        </div>
      )}
    </div>
  );
};
