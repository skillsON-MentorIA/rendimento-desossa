import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Users,
  Database,
  Sliders,
  Download,
  UploadCloud,
  RefreshCw,
  KeyRound,
  CheckCircle2,
  AlertTriangle,
  FileSpreadsheet,
  Copy,
  ExternalLink,
  Plus,
  Trash2,
  Lock,
  Mail,
  User as UserIcon,
  Shield,
  Eye,
  EyeOff,
  Sparkles,
  HelpCircle,
  Server,
  DollarSign,
  Scale,
  Beef
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { User, UserRole, ProductionRecord } from '../types';
import { formatCurrency, formatPct } from '../utils/calculations';
import {
  getSupabaseConfig,
  saveCustomSupabaseConfig,
  clearCustomSupabaseConfig,
  testSupabaseConnection,
  syncRecordsToSupabase,
  fetchRecordsFromSupabase,
  syncUsersToSupabase,
  getSupabaseSetupSQL,
  downloadDatabaseSpreadsheet
} from '../services/supabaseClient';

export const AdminView: React.FC = () => {
  const {
    currentUser,
    users,
    addUser,
    removeUser,
    updateUser,
    records,
    deleteRecord,
    deleteAllRecords,
    syncCleanToSupabase,
    replaceRecords,
    benchmarks,
    updateBenchmark,
    updateCarcassCost,
    resetToDemoData,
    isAdmin,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'users' | 'database' | 'netlify' | 'parameters'>('users');
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  // User management form state
  const [isAddUserOpen, setIsAddUserOpen] = useState<boolean>(false);
  const [newUserName, setNewUserName] = useState<string>('');
  const [newUserUsername, setNewUserUsername] = useState<string>('');
  const [newUserEmail, setNewUserEmail] = useState<string>('');
  const [newUserPassword, setNewUserPassword] = useState<string>('');
  const [newUserRole, setNewUserRole] = useState<UserRole>('GERENCIAL');

  // Password change modal
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [changePasswordVal, setChangePasswordVal] = useState<string>('');

  // Supabase config state
  const [supabaseConfig, setSupabaseConfig] = useState(getSupabaseConfig());
  const [inputUrl, setInputUrl] = useState<string>(supabaseConfig.url);
  const [inputKey, setInputKey] = useState<string>(supabaseConfig.anonKey);
  const [isTestingConn, setIsTestingConn] = useState<boolean>(false);
  const [connStatus, setConnStatus] = useState<{ checked: boolean; ok: boolean; msg: string }>({
    checked: false,
    ok: false,
    msg: '',
  });
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [copiedSql, setCopiedSql] = useState<boolean>(false);

  // Parameters state
  const [dtCost, setDtCost] = useState<number>(15.20);
  const [trCost, setTrCost] = useState<number>(21.80);
  const [benchmarkFilter, setBenchmarkFilter] = useState<'ALL' | 'DIANTEIRO' | 'TRASEIRO'>('ALL');

  useEffect(() => {
    setSupabaseConfig(getSupabaseConfig());
  }, []);

  const showFeedback = (text: string, type: 'success' | 'error' | 'info' = 'success') => {
    setFeedbackMsg({ text, type });
    setTimeout(() => setFeedbackMsg(null), 5000);
  };

  // Add user handler
  const handleAddUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserName.trim() || !newUserUsername.trim() || !newUserPassword.trim()) {
      showFeedback('Por favor, preencha todos os campos obrigatórios do usuário.', 'error');
      return;
    }

    try {
      addUser({
        name: newUserName.trim(),
        username: newUserUsername.trim().toLowerCase(),
        email: newUserEmail.trim() || `${newUserUsername.trim().toLowerCase()}@frigorifico.com.br`,
        password: newUserPassword.trim(),
        role: newUserRole,
      });

      setNewUserName('');
      setNewUserUsername('');
      setNewUserEmail('');
      setNewUserPassword('');
      setNewUserRole('GERENCIAL');
      setIsAddUserOpen(false);

      showFeedback(`Usuário "${newUserUsername.trim()}" cadastrado com sucesso no perfil ${newUserRole}!`);
    } catch (err: any) {
      showFeedback(err.message || 'Erro ao cadastrar usuário.', 'error');
    }
  };

  // Remove user handler
  const handleRemoveUser = (u: User) => {
    if (u.id === currentUser?.id) {
      showFeedback('Você não pode excluir o seu próprio usuário logado!', 'error');
      return;
    }
    if (confirm(`Tem certeza que deseja descadastrar o usuário "${u.name}" (${u.username})?`)) {
      const ok = removeUser(u.id);
      if (ok) {
        showFeedback(`Usuário "${u.name}" descadastrado com sucesso.`);
      } else {
        showFeedback('Não foi possível descadastrar o usuário.', 'error');
      }
    }
  };

  // Change password handler
  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser || !changePasswordVal.trim()) return;

    updateUser(editingUser.id, { password: changePasswordVal.trim() });
    showFeedback(`Senha do usuário ${editingUser.name} alterada com sucesso!`);
    setEditingUser(null);
    setChangePasswordVal('');
  };

  // Test Supabase connection
  const handleTestConnection = async () => {
    setIsTestingConn(true);
    setConnStatus({ checked: false, ok: false, msg: 'Testando conexão...' });
    const res = await testSupabaseConnection();
    setIsTestingConn(false);
    setConnStatus({
      checked: true,
      ok: res.ok,
      msg: res.message,
    });
    if (res.ok) {
      showFeedback(res.message, 'success');
    } else {
      showFeedback(res.message, 'error');
    }
  };

  // Save manual Supabase credentials
  const handleSaveSupabaseConfig = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputUrl.trim() || !inputKey.trim()) {
      showFeedback('Informe a URL do Supabase e a Anon Public Key.', 'error');
      return;
    }

    saveCustomSupabaseConfig(inputUrl.trim(), inputKey.trim());
    setSupabaseConfig(getSupabaseConfig());
    showFeedback('Credenciais do Supabase salvas localmente! Teste a conexão agora.');
    handleTestConnection();
  };

  const handleClearSupabaseConfig = () => {
    clearCustomSupabaseConfig();
    const cfg = getSupabaseConfig();
    setSupabaseConfig(cfg);
    setInputUrl(cfg.url);
    setInputKey(cfg.anonKey);
    setConnStatus({ checked: false, ok: false, msg: '' });
    showFeedback('Configuração personalizada removida. Usando variáveis do Netlify se houver.', 'info');
  };

  // Sync to Supabase
  const handleSyncToSupabase = async () => {
    setIsSyncing(true);
    const res = await syncRecordsToSupabase(records);
    await syncUsersToSupabase(users);
    setIsSyncing(false);
    if (res.success) {
      showFeedback(res.message, 'success');
    } else {
      showFeedback(res.message, 'error');
    }
  };

  // Load from Supabase
  const handleLoadFromSupabase = async () => {
    if (!confirm('Deseja puxar todos os lotes salvos no Supabase? Os dados da nuvem atualizarão a visualização atual.')) {
      return;
    }
    setIsSyncing(true);
    const res = await fetchRecordsFromSupabase();
    setIsSyncing(false);
    if (res.success && res.data && res.data.length > 0) {
      replaceRecords(res.data);
      showFeedback(`${res.data.length} lotes carregados com sucesso do Supabase!`, 'success');
    } else {
      showFeedback(res.message || 'Nenhum registro carregado.', res.success ? 'info' : 'error');
    }
  };

  // Synchronize clean (purge orphaned records from Supabase)
  const handleCleanSyncToSupabase = async () => {
    setIsSyncing(true);
    const res = await syncCleanToSupabase();
    setIsSyncing(false);
    if (res.success) {
      showFeedback(res.message, 'success');
    } else {
      showFeedback(res.message, 'error');
    }
  };

  // Delete single record from App and Supabase
  const handleDeleteSingleRecord = async (rec: ProductionRecord) => {
    if (!confirm(`Deseja realmente apagar o lote ${rec.type} de ${rec.date} (${rec.shift}) do aplicativo e da nuvem Supabase?`)) {
      return;
    }
    setIsSyncing(true);
    const res = await deleteRecord(rec.id);
    setIsSyncing(false);
    if (res.success) {
      showFeedback(res.message || 'Lote excluído com sucesso do banco e do app!', 'success');
    } else {
      showFeedback(res.message, 'error');
    }
  };

  // Delete all records from App and Supabase
  const handleDeleteAllRecords = async () => {
    if (!confirm('ATENÇÃO: Deseja realmente APAGAR TODOS OS RELATÓRIOS cadastrados no aplicativo e na nuvem Supabase? Esta ação é definitiva.')) {
      return;
    }
    setIsSyncing(true);
    const res = await deleteAllRecords();
    setIsSyncing(false);
    if (res.success) {
      showFeedback(res.message, 'success');
    } else {
      showFeedback(res.message, 'error');
    }
  };

  // Copy SQL script
  const handleCopySQL = () => {
    const sql = getSupabaseSetupSQL();
    navigator.clipboard.writeText(sql);
    setCopiedSql(true);
    showFeedback('Script SQL copiado para a área de transferência! Cole no SQL Editor do Supabase.', 'success');
    setTimeout(() => setCopiedSql(false), 4000);
  };

  // Download Master Spreadsheet
  const handleDownloadSpreadsheet = () => {
    try {
      downloadDatabaseSpreadsheet(records, benchmarks);
      showFeedback(`Planilha consolidada com ${records.length} lotes e histórico da desossa gerada com sucesso!`);
    } catch (e: any) {
      showFeedback(`Erro ao gerar planilha: ${e.message}`, 'error');
    }
  };

  // Save Costs
  const handleSaveCosts = (e: React.FormEvent) => {
    e.preventDefault();
    updateCarcassCost('DIANTEIRO', dtCost);
    updateCarcassCost('TRASEIRO', trCost);
    showFeedback('Custos médios de carcaça atualizados e aplicados às margens!');
  };

  const filteredBenchmarks = React.useMemo(() => {
    if (benchmarkFilter === 'ALL') return benchmarks;
    return benchmarks.filter((b) => b.type === benchmarkFilter);
  }, [benchmarks, benchmarkFilter]);

  if (!isAdmin) {
    return (
      <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-sm max-w-xl mx-auto text-center my-12">
        <div className="w-14 h-14 rounded-full bg-rose-50 text-rose-800 flex items-center justify-center mx-auto mb-4 border border-rose-200">
          <Lock className="w-7 h-7" />
        </div>
        <h3 className="text-lg font-bold text-slate-900">Acesso Restrito: Menu do Administrador</h3>
        <p className="text-sm text-slate-600 mt-2">
          Você está conectado como <strong>{currentUser?.name}</strong> no perfil <strong>{currentUser?.role}</strong>.
          Este menu é exclusivo para o perfil <strong>ADMIN</strong>.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12 max-w-6xl mx-auto">
      {/* Feedback Banner */}
      {feedbackMsg && (
        <div
          className={`p-4 rounded-xl text-xs font-bold flex items-center justify-between gap-3 shadow-sm border transition-all animate-in fade-in duration-200 ${
            feedbackMsg.type === 'success'
              ? 'bg-emerald-50 text-emerald-900 border-emerald-300'
              : feedbackMsg.type === 'error'
              ? 'bg-rose-50 text-rose-900 border-rose-300'
              : 'bg-blue-50 text-blue-900 border-blue-300'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {feedbackMsg.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />}
            {feedbackMsg.type === 'error' && <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />}
            {feedbackMsg.type === 'info' && <HelpCircle className="w-5 h-5 text-blue-600 shrink-0" />}
            <span>{feedbackMsg.text}</span>
          </div>
          <button
            onClick={() => setFeedbackMsg(null)}
            className="text-slate-400 hover:text-slate-700 text-xs px-2 py-0.5 rounded"
          >
            ✕
          </button>
        </div>
      )}

      {/* Admin Header Banner */}
      <div className="bg-slate-900 text-white p-6 rounded-2xl border border-slate-800 shadow-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
              <ShieldCheck className="w-4 h-4 text-purple-400" />
              MENU EXECUTIVO DE ADMINISTRAÇÃO
            </div>
            <h1 className="text-2xl font-black mt-2 tracking-tight">
              Gestão de Usuários, Banco Supabase & Parâmetros
            </h1>
            <p className="text-xs text-slate-300 mt-1 max-w-2xl">
              Controle central do frigorífico: cadastre e remova usuários, sincronize o banco de dados em nuvem no Supabase, baixe planilhas analíticas e calibre os custos de carcaça.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={handleDownloadSpreadsheet}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-2"
              title="Baixar planilha Excel com todos os lotes, cortes e balanços de massa"
            >
              <Download className="w-4 h-4" />
              Baixar Planilha de Dados (.xlsx)
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 mt-6 pt-4 border-t border-slate-800 overflow-x-auto text-xs font-bold">
          <button
            onClick={() => setActiveTab('users')}
            className={`px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 shrink-0 ${
              activeTab === 'users'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <Users className="w-4 h-4 text-purple-300" />
            <span>1. Gestão de Usuários & Perfis ({users.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('database')}
            className={`px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 shrink-0 ${
              activeTab === 'database'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <Database className="w-4 h-4 text-emerald-400" />
            <span>2. Banco de Dados Supabase</span>
          </button>

          <button
            onClick={() => setActiveTab('netlify')}
            className={`px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 shrink-0 ${
              activeTab === 'netlify'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <Server className="w-4 h-4 text-blue-400" />
            <span>3. Como Configurar Netlify + Supabase</span>
          </button>

          <button
            onClick={() => setActiveTab('parameters')}
            className={`px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 shrink-0 ${
              activeTab === 'parameters'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <Sliders className="w-4 h-4 text-amber-400" />
            <span>4. Parâmetros & Custos Carcaça</span>
          </button>
        </div>
      </div>

      {/* TAB 1: GESTÃO DE USUÁRIOS */}
      {activeTab === 'users' && (
        <div className="space-y-6">
          {/* Header Action Bar */}
          <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Users className="w-5 h-5 text-purple-700" />
                Usuários do Sistema e Níveis de Permissão
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Defina quem tem acesso ao sistema com senhas individuais e atribua o perfil correspondente: <strong>ADMIN</strong>, <strong>GERENCIAL</strong> ou <strong>DIRETORIA</strong>.
              </p>
            </div>

            <button
              onClick={() => setIsAddUserOpen(!isAddUserOpen)}
              className="px-4 py-2 bg-purple-700 hover:bg-purple-600 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-2 self-start sm:self-auto shrink-0"
            >
              <Plus className="w-4 h-4" />
              {isAddUserOpen ? 'Fechar Formulário' : '+ Novo Usuário'}
            </button>
          </div>

          {/* New User Form Drawer */}
          {isAddUserOpen && (
            <div className="bg-purple-50/70 border border-purple-200 rounded-2xl p-6 shadow-sm animate-in fade-in duration-200">
              <div className="flex items-center justify-between pb-3 mb-4 border-b border-purple-200/80">
                <h4 className="text-sm font-bold text-purple-950 flex items-center gap-2">
                  <UserIcon className="w-4 h-4 text-purple-700" />
                  Cadastrar Novo Usuário no Sistema
                </h4>
                <span className="text-xs text-purple-700 font-medium">Todos os campos marcados são necessários</span>
              </div>

              <form onSubmit={handleAddUser} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Nome Completo: *
                    </label>
                    <input
                      type="text"
                      value={newUserName}
                      onChange={(e) => setNewUserName(e.target.value)}
                      placeholder="Ex: João da Silva"
                      required
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-700/20 focus:border-purple-700"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Usuário de Login: *
                    </label>
                    <input
                      type="text"
                      value={newUserUsername}
                      onChange={(e) => setNewUserUsername(e.target.value)}
                      placeholder="Ex: joao.silva"
                      required
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-700/20 focus:border-purple-700"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      E-mail:
                    </label>
                    <input
                      type="email"
                      value={newUserEmail}
                      onChange={(e) => setNewUserEmail(e.target.value)}
                      placeholder="Ex: joao@frigorifico.com.br"
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-700/20 focus:border-purple-700"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Senha de Acesso: *
                    </label>
                    <input
                      type="password"
                      value={newUserPassword}
                      onChange={(e) => setNewUserPassword(e.target.value)}
                      placeholder="Defina a senha"
                      required
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-700/20 focus:border-purple-700"
                    />
                  </div>
                </div>

                {/* Role Selection */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-2">
                    Perfil de Permissão: *
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <label
                      className={`p-3 rounded-xl border text-xs cursor-pointer transition-all flex items-start gap-3 ${
                        newUserRole === 'ADMIN'
                          ? 'border-purple-600 bg-white shadow-xs'
                          : 'border-slate-200 bg-white/60 hover:bg-white'
                      }`}
                    >
                      <input
                        type="radio"
                        name="role"
                        value="ADMIN"
                        checked={newUserRole === 'ADMIN'}
                        onChange={() => setNewUserRole('ADMIN')}
                        className="mt-0.5 text-purple-700 focus:ring-purple-700"
                      />
                      <div>
                        <span className="font-bold text-purple-950 block">ADMIN (Administrador)</span>
                        <span className="text-[11px] text-slate-500 leading-tight block mt-0.5">
                          Acesso total a tudo: Gestão de usuários, Supabase, download mestre, parâmetros de custos, uploads e relatórios.
                        </span>
                      </div>
                    </label>

                    <label
                      className={`p-3 rounded-xl border text-xs cursor-pointer transition-all flex items-start gap-3 ${
                        newUserRole === 'GERENCIAL'
                          ? 'border-blue-600 bg-white shadow-xs'
                          : 'border-slate-200 bg-white/60 hover:bg-white'
                      }`}
                    >
                      <input
                        type="radio"
                        name="role"
                        value="GERENCIAL"
                        checked={newUserRole === 'GERENCIAL'}
                        onChange={() => setNewUserRole('GERENCIAL')}
                        className="mt-0.5 text-blue-700 focus:ring-blue-700"
                      />
                      <div>
                        <span className="font-bold text-blue-950 block">GERENCIAL (Operação & Upload)</span>
                        <span className="text-[11px] text-slate-500 leading-tight block mt-0.5">
                          Responsável por fazer uploads do SisAtak RETQ010, correções de lotes e acompanhamento diário. Sem acesso ao menu Admin.
                        </span>
                      </div>
                    </label>

                    <label
                      className={`p-3 rounded-xl border text-xs cursor-pointer transition-all flex items-start gap-3 ${
                        newUserRole === 'DIRETORIA'
                          ? 'border-amber-600 bg-white shadow-xs'
                          : 'border-slate-200 bg-white/60 hover:bg-white'
                      }`}
                    >
                      <input
                        type="radio"
                        name="role"
                        value="DIRETORIA"
                        checked={newUserRole === 'DIRETORIA'}
                        onChange={() => setNewUserRole('DIRETORIA')}
                        className="mt-0.5 text-amber-700 focus:ring-amber-700"
                      />
                      <div>
                        <span className="font-bold text-amber-950 block">DIRETORIA (Visualização Executiva)</span>
                        <span className="text-[11px] text-slate-500 leading-tight block mt-0.5">
                          Apenas visualização dos dashboards, gráficos de desempenho e One Page Report A4. Sem upload nem alterações.
                        </span>
                      </div>
                    </label>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsAddUserOpen(false)}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 rounded-lg"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-purple-700 hover:bg-purple-600 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Salvar Novo Usuário
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Users Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div className="text-xs text-slate-600">
                Total de Usuários Cadastrados: <strong className="text-slate-900">{users.length}</strong>
              </div>
              <span className="text-[11px] text-slate-400">
                Você está conectado como: <strong className="text-purple-900 font-bold">{currentUser?.name}</strong>
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Usuário</th>
                    <th className="py-3 px-4">Login / E-mail</th>
                    <th className="py-3 px-4">Perfil de Acesso</th>
                    <th className="py-3 px-4">Permissões Permitidas</th>
                    <th className="py-3 px-4 text-center">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {users.map((u) => {
                    const isSelf = u.id === currentUser?.id;
                    return (
                      <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-slate-700">
                              {u.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <span className="font-bold text-slate-900 flex items-center gap-1.5">
                                {u.name}
                                {isSelf && (
                                  <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-purple-100 text-purple-800">
                                    Você
                                  </span>
                                )}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4 font-mono">
                          <div className="text-slate-900 font-bold">{u.username}</div>
                          <div className="text-[10px] text-slate-500">{u.email}</div>
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-lg ${
                              u.role === 'ADMIN'
                                ? 'bg-purple-100 text-purple-900 border border-purple-200'
                                : u.role === 'GERENCIAL'
                                ? 'bg-blue-100 text-blue-900 border border-blue-200'
                                : 'bg-amber-100 text-amber-900 border border-amber-200'
                            }`}
                          >
                            <Shield className="w-3 h-3" />
                            {u.role}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-[11px] text-slate-600 max-w-xs">
                          {u.role === 'ADMIN' && (
                            <span className="text-purple-900 font-medium">
                              Acesso Total: Usuários, Custos, Supabase, Uploads, Relatórios
                            </span>
                          )}
                          {u.role === 'GERENCIAL' && (
                            <span className="text-blue-900 font-medium">
                              Upload SisAtak RETQ010, Correções de Lotes e Dashboards
                            </span>
                          )}
                          {u.role === 'DIRETORIA' && (
                            <span className="text-amber-900 font-medium">
                              Visualização de Dashboards, Gráficos e One Page Report (Somente Leitura)
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              onClick={() => {
                                setEditingUser(u);
                                setChangePasswordVal('');
                              }}
                              className="px-2.5 py-1 text-[11px] font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors flex items-center gap-1"
                              title="Alterar senha"
                            >
                              <KeyRound className="w-3 h-3 text-slate-500" />
                              Senha
                            </button>

                            {!isSelf ? (
                              <button
                                onClick={() => handleRemoveUser(u)}
                                className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                title="Descadastrar usuário"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            ) : (
                              <span className="text-[10px] text-slate-400 italic px-2">Protegido</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Change Password Modal */}
          {editingUser && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
              <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-sm p-5 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <KeyRound className="w-4 h-4 text-purple-700" />
                    Alterar Senha de {editingUser.name}
                  </h4>
                  <button onClick={() => setEditingUser(null)} className="text-slate-400 hover:text-slate-600">✕</button>
                </div>
                <form onSubmit={handleChangePassword} className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Nova Senha:
                    </label>
                    <input
                      type="password"
                      value={changePasswordVal}
                      onChange={(e) => setChangePasswordVal(e.target.value)}
                      placeholder="Digite a nova senha"
                      required
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-700/20"
                    />
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setEditingUser(null)}
                      className="px-3 py-1.5 text-xs text-slate-600 rounded-lg"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-1.5 bg-purple-700 hover:bg-purple-600 text-white rounded-lg text-xs font-bold shadow-sm"
                    >
                      Salvar Senha
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: BANCO DE DADOS SUPABASE */}
      {activeTab === 'database' && (
        <div className="space-y-6">
          {/* Card 1: Baixar Planilha Consolidada */}
          <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0 border border-emerald-200">
                <FileSpreadsheet className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Baixar Planilha Consolidada do Banco de Dados (.XLSX)
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Exporta uma planilha Excel completa contendo 5 abas organizadas: Lotes da Desossa, Todos os Cortes Individuais SisAtak, Balanço de Massa, Metas Técnicas e Indicadores do Sistema.
                </p>
                <div className="flex items-center gap-3 mt-2 text-[11px] text-slate-600">
                  <span>• {records.length} lotes de produção</span>
                  <span>• {records.reduce((acc, r) => acc + (r.cuts?.length || 0), 0)} itens de corte catalogados</span>
                </div>
              </div>
            </div>

            <button
              onClick={handleDownloadSpreadsheet}
              className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-2 self-start md:self-auto shrink-0"
            >
              <Download className="w-4 h-4" />
              Baixar Planilha Agora (.xlsx)
            </button>
          </div>

          {/* Card 2: Status da Conexão & Credenciais Supabase */}
          <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-2xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-2">
                  <Database className="w-5 h-5 text-emerald-600" />
                  <h3 className="text-base font-bold text-slate-900">
                    Conexão com a Nuvem Supabase
                  </h3>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Origem atual da configuração: {supabaseConfig.source === 'env' ? (
                    <strong className="text-emerald-700">Variáveis de Ambiente do Netlify (VITE_SUPABASE_URL)</strong>
                  ) : supabaseConfig.source === 'admin_settings' ? (
                    <strong className="text-blue-700">Configuração Salva no Painel do Administrador</strong>
                  ) : (
                    <strong className="text-amber-700">Ainda Não Configurado (utilizando armazenamento local)</strong>
                  )}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleTestConnection}
                  disabled={isTestingConn}
                  className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isTestingConn ? 'animate-spin' : ''}`} />
                  {isTestingConn ? 'Verificando...' : 'Testar Conexão'}
                </button>

                <button
                  type="button"
                  onClick={handleSyncToSupabase}
                  disabled={isSyncing}
                  className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition-all shadow-sm flex items-center gap-1.5"
                >
                  <UploadCloud className="w-3.5 h-3.5" />
                  {isSyncing ? 'Sincronizando...' : 'Enviar Dados para Nuvem'}
                </button>

                <button
                  type="button"
                  onClick={handleLoadFromSupabase}
                  disabled={isSyncing}
                  className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1.5"
                  title="Carregar todos os lotes que estão salvos na nuvem do Supabase"
                >
                  <Database className="w-3.5 h-3.5 text-emerald-400" />
                  Carregar da Nuvem
                </button>

                <button
                  type="button"
                  onClick={handleCleanSyncToSupabase}
                  disabled={isSyncing}
                  className="px-3.5 py-1.5 bg-purple-700 hover:bg-purple-600 text-white rounded-lg text-xs font-bold transition-all shadow-sm flex items-center gap-1.5"
                  title="Remove do Supabase qualquer lote que foi apagado no app e atualiza os existentes"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-purple-200" />
                  Sincronizar Exclusões (Remover Órfãos)
                </button>
              </div>
            </div>

            {/* Test Connection Banner */}
            {connStatus.checked && (
              <div
                className={`p-3.5 rounded-xl text-xs font-bold flex items-center gap-2.5 ${
                  connStatus.ok
                    ? 'bg-emerald-50 text-emerald-900 border border-emerald-200'
                    : 'bg-rose-50 text-rose-900 border border-rose-200'
                }`}
              >
                {connStatus.ok ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                )}
                <span>{connStatus.msg}</span>
              </div>
            )}

            {/* Manual Credential Configuration Form */}
            <form onSubmit={handleSaveSupabaseConfig} className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                  Parâmetros de Acesso ao Supabase (URL e Chave Pública):
                </span>
                {supabaseConfig.source === 'admin_settings' && (
                  <button
                    type="button"
                    onClick={handleClearSupabaseConfig}
                    className="text-[11px] text-rose-600 hover:underline"
                  >
                    Restaurar padrões
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Supabase Project URL (Ex: https://xyzcompany.supabase.co):
                  </label>
                  <input
                    type="text"
                    value={inputUrl}
                    onChange={(e) => setInputUrl(e.target.value)}
                    placeholder="https://sua-empresa.supabase.co"
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg font-mono focus:outline-none focus:ring-2 focus:ring-emerald-600/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Supabase Anon Public API Key (anon public):
                  </label>
                  <input
                    type="password"
                    value={inputKey}
                    onChange={(e) => setInputKey(e.target.value)}
                    placeholder="eyJh..."
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg font-mono focus:outline-none focus:ring-2 focus:ring-emerald-600/20"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <span className="text-[11px] text-slate-500">
                  Dica: Para deploy no Netlify, você também pode inserir essas chaves nas variáveis de ambiente do Netlify.
                </span>
                <button
                  type="submit"
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition-all shadow-sm flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  Salvar Credenciais
                </button>
              </div>
            </form>

            {/* Script SQL para Rodar no Supabase */}
            <div className="pt-2">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <h4 className="text-xs font-bold uppercase text-slate-900">
                    Script SQL para Inicializar o Banco no Supabase:
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Copie o script abaixo e execute-o com 1 clique no menu <strong>SQL Editor</strong> do seu painel do Supabase.
                  </p>
                </div>
                <button
                  onClick={handleCopySQL}
                  className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1.5"
                >
                  <Copy className="w-3.5 h-3.5 text-emerald-400" />
                  {copiedSql ? 'Copiado!' : 'Copiar Código SQL'}
                </button>
              </div>

              <div className="bg-slate-950 text-slate-200 p-4 rounded-xl border border-slate-800 font-mono text-[11px] max-h-56 overflow-y-auto leading-relaxed">
                <pre>{getSupabaseSetupSQL()}</pre>
              </div>
            </div>
          </div>

          {/* Card 3: Gestão de Lotes Cadastrados no Banco & Exclusão */}
          <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-2">
                  <Beef className="w-5 h-5 text-rose-700" />
                  <h3 className="text-base font-bold text-slate-900">
                    Lotes e Relatórios Cadastrados no Sistema ({records.length})
                  </h3>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Visualize os relatórios atualmente em vigor. Ao excluir um lote aqui, ele é removido imediatamente do APP e da nuvem Supabase.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCleanSyncToSupabase}
                  disabled={isSyncing}
                  className="px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white rounded-lg text-xs font-bold transition-all shadow-sm flex items-center gap-1.5"
                  title="Garante que o Supabase contenha exatamente os lotes abaixo, apagando qualquer lote excluído anteriormente"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Sincronizar Exclusões
                </button>

                {records.length > 0 && (
                  <button
                    type="button"
                    onClick={handleDeleteAllRecords}
                    disabled={isSyncing}
                    className="px-3.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5"
                    title="Excluir todos os relatórios do sistema e do Supabase para começar do zero"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                    Apagar Todos os Lotes
                  </button>
                )}
              </div>
            </div>

            {records.length === 0 ? (
              <div className="text-center py-8 bg-slate-50 rounded-xl border border-dashed border-slate-300 text-slate-500 text-xs">
                <Beef className="w-8 h-8 text-slate-400 mx-auto mb-2 opacity-50" />
                <p className="font-semibold text-slate-700">Nenhum lote cadastrado no momento.</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  A base está limpa. Você pode fazer o upload de novos relatórios no menu "Upload SisAtak & Base".
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">Lote / Data</th>
                      <th className="py-2.5 px-3">Tipo</th>
                      <th className="py-2.5 px-3">Turno / Líder</th>
                      <th className="py-2.5 px-3 text-right">Matéria-Prima</th>
                      <th className="py-2.5 px-3 text-right">Prod. Acabado</th>
                      <th className="py-2.5 px-3 text-right">Quebra</th>
                      <th className="py-2.5 px-3 text-center">Cortes</th>
                      <th className="py-2.5 px-3 text-center">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {records.map((r) => (
                      <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-2.5 px-3">
                          <div className="font-bold text-slate-900">{r.date}</div>
                          <div className="text-[10px] font-mono text-slate-400">{r.id}</div>
                        </td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold ${
                              r.type === 'DIANTEIRO'
                                ? 'bg-amber-100 text-amber-900 border border-amber-200'
                                : 'bg-rose-100 text-rose-900 border border-rose-200'
                            }`}
                          >
                            {r.type === 'DIANTEIRO' ? 'Dianteiro (DT)' : 'Traseiro (TR)'}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-slate-700">
                          <div className="font-semibold">{r.shift}</div>
                          <div className="text-[11px] text-slate-500">{r.responsibleOperator}</div>
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-semibold text-slate-900">
                          {r.rawMaterialWeightKg.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} kg
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-semibold text-emerald-800">
                          {r.finishedProductWeightKg.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} kg
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-rose-700">
                          {r.lossPct.toFixed(3)}%
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span className="px-1.5 py-0.5 bg-slate-100 text-slate-700 rounded text-[11px] font-bold">
                            {r.cuts?.length || 0}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => handleDeleteSingleRecord(r)}
                            disabled={isSyncing}
                            className="p-1.5 text-rose-600 hover:bg-rose-50 hover:text-rose-800 rounded-lg transition-colors"
                            title="Apagar este lote do APP e do Supabase"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: INSTRUÇÕES PASSO A PASSO NETLIFY + SUPABASE */}
      {activeTab === 'netlify' && (
        <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-2xs space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-800 border border-blue-200 mb-2">
              <Server className="w-3.5 h-3.5 text-blue-600" />
              GUIA DE IMPLANTAÇÃO
            </div>
            <h3 className="text-xl font-black text-slate-900 tracking-tight">
              Instruções Passo a Passo: Como Configurar o Netlify com o Supabase
            </h3>
            <p className="text-xs text-slate-600 mt-1">
              Siga os 5 passos práticos abaixo para conectar seu site publicado no Netlify ao banco de dados na nuvem Supabase:
            </p>
          </div>

          <div className="space-y-5 text-xs text-slate-700">
            {/* Passo 1 */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-start gap-4">
              <div className="w-7 h-7 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                1
              </div>
              <div className="space-y-1">
                <h4 className="font-bold text-slate-900 text-sm">Criar ou Acessar seu Projeto no Supabase</h4>
                <p>
                  Acesse <a href="https://supabase.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 font-semibold hover:underline inline-flex items-center gap-1">supabase.com <ExternalLink className="w-3 h-3" /></a> e faça login. Crie um novo projeto (ex: <code className="bg-slate-200 px-1 py-0.5 rounded font-mono">frigorifico-desossa-db</code>) ou selecione o projeto existente.
                </p>
              </div>
            </div>

            {/* Passo 2 */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-start gap-4">
              <div className="w-7 h-7 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                2
              </div>
              <div className="space-y-1.5 flex-1">
                <h4 className="font-bold text-slate-900 text-sm">Executar o Script SQL no Supabase</h4>
                <p>
                  No menu lateral esquerdo do Supabase, clique em <strong>SQL Editor</strong> &gt; <strong>New query</strong>.
                </p>
                <p>
                  Cole o script SQL que fornecemos na aba anterior e clique no botão verde <strong>RUN</strong>. Ele criará as tabelas <code className="bg-slate-200 px-1 py-0.5 rounded font-mono">production_records</code> e <code className="bg-slate-200 px-1 py-0.5 rounded font-mono">app_users</code> com as políticas de acesso público.
                </p>
                <button
                  onClick={handleCopySQL}
                  className="px-3 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-[11px] font-bold inline-flex items-center gap-1.5"
                >
                  <Copy className="w-3 h-3 text-emerald-400" />
                  Copiar o Script SQL Agora
                </button>
              </div>
            </div>

            {/* Passo 3 */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-start gap-4">
              <div className="w-7 h-7 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                3
              </div>
              <div className="space-y-1">
                <h4 className="font-bold text-slate-900 text-sm">Copiar a URL e a Anon Public Key do Supabase</h4>
                <p>
                  No Supabase, vá em <strong>Project Settings (ícone de engrenagem)</strong> &gt; <strong>API</strong>.
                </p>
                <ul className="list-disc list-inside space-y-0.5 pl-2 text-slate-600">
                  <li><strong>Project URL</strong> (ex: <code className="font-mono text-slate-800">https://abcdefghijk.supabase.co</code>)</li>
                  <li><strong>Project API Keys &gt; anon public</strong> (chave longa que começa com <code className="font-mono text-slate-800">eyJ...</code>)</li>
                </ul>
              </div>
            </div>

            {/* Passo 4 */}
            <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200 flex items-start gap-4">
              <div className="w-7 h-7 rounded-full bg-emerald-700 text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                4
              </div>
              <div className="space-y-2">
                <h4 className="font-bold text-emerald-950 text-sm">Configurar as Variáveis no Netlify</h4>
                <p>
                  Acesse o painel do seu site no <strong>Netlify</strong>:
                </p>
                <ol className="list-decimal list-inside space-y-1 pl-2 text-slate-700">
                  <li>Clique no seu site e vá em <strong>Site configuration</strong> (ou <strong>Site settings</strong>).</li>
                  <li>No menu esquerdo, clique em <strong>Environment variables</strong>.</li>
                  <li>Clique em <strong>Add a variable</strong> (ou <strong>Import from .env</strong>) e crie exatamente duas variáveis:</li>
                </ol>
                <div className="bg-white p-3 rounded-lg border border-emerald-200 font-mono text-[11px] space-y-1">
                  <div><strong className="text-slate-900">Key:</strong> VITE_SUPABASE_URL &nbsp;|&nbsp; <strong className="text-slate-900">Value:</strong> sua URL do Supabase</div>
                  <div><strong className="text-slate-900">Key:</strong> VITE_SUPABASE_ANON_KEY &nbsp;|&nbsp; <strong className="text-slate-900">Value:</strong> sua chave anon public</div>
                </div>
                <p className="text-[11px] text-slate-500 italic">
                  * Importante: O prefixo <code className="font-bold font-mono">VITE_</code> é obrigatório para que o Vite inclua as variáveis na compilação do front-end do Netlify.
                </p>
              </div>
            </div>

            {/* Passo 5 */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-start gap-4">
              <div className="w-7 h-7 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                5
              </div>
              <div className="space-y-1">
                <h4 className="font-bold text-slate-900 text-sm">Disparar um Novo Deploy no Netlify</h4>
                <p>
                  Após salvar as variáveis, vá na aba <strong>Deploys</strong> no Netlify, clique no botão <strong>Trigger deploy</strong> &gt; <strong>Deploy site</strong>.
                </p>
                <p className="text-slate-600">
                  O Netlify recompilará a aplicação carregando as chaves automaticamente. Quando o deploy concluir, o APP estará 100% conectado à nuvem do Supabase!
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: PARÂMETROS E CUSTOS DA CARCAÇA */}
      {activeTab === 'parameters' && (
        <div className="space-y-6">
          {/* Custo de Carcaça */}
          <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-2xs">
            <div className="flex items-center gap-2 mb-3 pb-3 border-b border-slate-100">
              <DollarSign className="w-5 h-5 text-emerald-700" />
              <div>
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                  Calibração dos Custos Médios de Aquisição de Carcaça (R$/kg)
                </h3>
                <p className="text-xs text-slate-500">
                  Define o valor pago por quilo de matéria-prima utilizado para apurar o Custo Integral da Carcaça e a Margem Bruta
                </p>
              </div>
            </div>

            <form onSubmit={handleSaveCosts} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-xs font-bold text-slate-700 block mb-1">
                    Custo Médio Dianteiro (DT):
                  </span>
                  <div className="relative mt-1">
                    <span className="absolute left-3 top-2.5 text-xs font-bold text-slate-400">R$</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={dtCost}
                      onChange={(e) => setDtCost(parseFloat(e.target.value) || 0)}
                      className="w-full pl-9 pr-3 py-2 text-sm font-bold font-mono bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-700/20"
                    />
                  </div>
                  <span className="text-[10px] text-slate-500 block mt-1">
                    Padrão de mercado atual: R$ 15,20 / kg
                  </span>
                </div>

                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-xs font-bold text-slate-700 block mb-1">
                    Custo Médio Traseiro (TR):
                  </span>
                  <div className="relative mt-1">
                    <span className="absolute left-3 top-2.5 text-xs font-bold text-slate-400">R$</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={trCost}
                      onChange={(e) => setTrCost(parseFloat(e.target.value) || 0)}
                      className="w-full pl-9 pr-3 py-2 text-sm font-bold font-mono bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-700/20"
                    />
                  </div>
                  <span className="text-[10px] text-slate-500 block mt-1">
                    Padrão de mercado atual: R$ 21,80 / kg
                  </span>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-purple-700 hover:bg-purple-600 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Salvar Novos Custos de Carcaça
                </button>
              </div>
            </form>
          </div>

          {/* Benchmarks de Cortes */}
          <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-2xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                  Tabela Oficial de Padrões Técnicos de Mercado (Benchmarks)
                </h3>
                <p className="text-xs text-slate-500">
                  Valores de rendimento esperado (%) utilizados para calcular os desvios de desossa no One Page Report
                </p>
              </div>

              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg text-xs font-semibold">
                <button
                  onClick={() => setBenchmarkFilter('ALL')}
                  className={`px-3 py-1 rounded-md transition-all ${
                    benchmarkFilter === 'ALL' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                  }`}
                >
                  Todos ({benchmarks.length})
                </button>
                <button
                  onClick={() => setBenchmarkFilter('DIANTEIRO')}
                  className={`px-3 py-1 rounded-md transition-all ${
                    benchmarkFilter === 'DIANTEIRO' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                  }`}
                >
                  Dianteiro (DT)
                </button>
                <button
                  onClick={() => setBenchmarkFilter('TRASEIRO')}
                  className={`px-3 py-1 rounded-md transition-all ${
                    benchmarkFilter === 'TRASEIRO' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                  }`}
                >
                  Traseiro (TR)
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">Código</th>
                    <th className="py-2.5 px-3">Nome do Produto</th>
                    <th className="py-2.5 px-3">Linha</th>
                    <th className="py-2.5 px-3 text-right">Rend. Padrão (%)</th>
                    <th className="py-2.5 px-3 text-right">Preço Padrão (R$/kg)</th>
                    <th className="py-2.5 px-3 text-center">Editar Padrão</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredBenchmarks.map((b) => (
                    <tr key={b.code} className="hover:bg-slate-50/60">
                      <td className="py-2 px-3 font-mono text-[11px] text-slate-500">{b.code}</td>
                      <td className="py-2 px-3 font-semibold text-slate-900">{b.name}</td>
                      <td className="py-2 px-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          b.type === 'DIANTEIRO' ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'
                        }`}>
                          {b.type === 'DIANTEIRO' ? 'DT' : 'TR'}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">
                        {formatPct(b.expectedYieldPct, 2)}
                      </td>
                      <td className="py-2 px-3 text-right font-mono text-slate-700">
                        {formatCurrency(b.standardPricePerKg)}
                      </td>
                      <td className="py-2 px-3 text-center">
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          max="100"
                          defaultValue={b.expectedYieldPct}
                          onBlur={(e) => {
                            const val = parseFloat(e.target.value);
                            if (!isNaN(val) && val !== b.expectedYieldPct) {
                              updateBenchmark(b.code, val);
                              showFeedback(`Padrão do corte "${b.name}" atualizado para ${val.toFixed(2)}%!`);
                            }
                          }}
                          className="w-20 px-2 py-1 text-xs font-mono text-right bg-white border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-purple-700"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
