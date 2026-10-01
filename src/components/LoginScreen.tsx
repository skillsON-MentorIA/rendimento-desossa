import React, { useState } from 'react';
import {
  Lock,
  User as UserIcon,
  Shield,
  Building2,
  CheckCircle2,
  AlertCircle,
  Beef,
  KeyRound,
  Eye,
  EyeOff,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { UserRole } from '../types';

export const LoginScreen: React.FC = () => {
  const { login, users } = useApp();
  const [username, setUsername] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!username.trim()) {
      setError('Informe o seu usuário ou e-mail.');
      return;
    }

    setIsLoading(true);
    setTimeout(() => {
      const res = login(username, password);
      setIsLoading(false);
      if (!res.success) {
        setError(res.message || 'Usuário ou senha inválidos.');
      }
    }, 200);
  };

  const handleQuickLogin = (uName: string, pWord: string) => {
    setError('');
    setUsername(uName);
    setPassword(pWord);
    login(uName, pWord);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-rose-950 flex items-center justify-center p-4 sm:p-6 text-slate-800 antialiased selection:bg-rose-800 selection:text-white">
      <div className="w-full max-w-4xl bg-white rounded-3xl shadow-2xl border border-slate-200/80 overflow-hidden grid grid-cols-1 lg:grid-cols-12 animate-in fade-in zoom-in-95 duration-200">
        {/* Left Side: Branding & Role Explanation (5 cols) */}
        <div className="lg:col-span-5 bg-gradient-to-br from-slate-900 via-rose-950 to-slate-950 text-white p-8 flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-rose-600/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-purple-600/10 rounded-full blur-2xl -ml-16 -mb-16 pointer-events-none" />

          <div>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-2xl bg-rose-600/20 text-rose-400 border border-rose-500/30 flex items-center justify-center shadow-lg">
                <Beef className="w-7 h-7" />
              </div>
              <div>
                <span className="text-[10px] uppercase font-mono tracking-widest text-rose-300 font-bold block">
                  SisAtak Industrial
                </span>
                <h1 className="text-xl font-black text-white tracking-tight leading-tight">
                  Frigorífico KPI Pro
                </h1>
              </div>
            </div>

            <div className="space-y-4 my-6">
              <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wide">
                Níveis de Acesso ao Sistema:
              </h2>

              {/* Card Admin */}
              <div className="p-3 rounded-xl bg-white/5 border border-white/10 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-purple-300 flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5 text-purple-400" />
                    Perfil ADMIN (Você)
                  </span>
                  <span className="text-[9px] bg-purple-500/30 text-purple-200 px-1.5 py-0.2 rounded font-mono font-bold">
                    Total
                  </span>
                </div>
                <p className="text-[11px] text-slate-300 leading-snug">
                  Gestão de usuários, Supabase, download da planilha mestre, custos de carcaça e relatórios.
                </p>
              </div>

              {/* Card Gerencial */}
              <div className="p-3 rounded-xl bg-white/5 border border-white/10 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-blue-300 flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-blue-400" />
                    Perfil GERENCIAL
                  </span>
                  <span className="text-[9px] bg-blue-500/30 text-blue-200 px-1.5 py-0.2 rounded font-mono font-bold">
                    Operação
                  </span>
                </div>
                <p className="text-[11px] text-slate-300 leading-snug">
                  Upload do SisAtak RETQ010, auditoria de desossa, correções de lotes e acompanhamento.
                </p>
              </div>

              {/* Card Diretoria */}
              <div className="p-3 rounded-xl bg-white/5 border border-white/10 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-amber-400" />
                    Perfil DIRETORIA
                  </span>
                  <span className="text-[9px] bg-amber-500/30 text-amber-200 px-1.5 py-0.2 rounded font-mono font-bold">
                    Visualização
                  </span>
                </div>
                <p className="text-[11px] text-slate-300 leading-snug">
                  Acesso executivo aos dashboards, rentabilidades, One Page Report A4 e gráficos semanais.
                </p>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-white/10 text-[10px] text-slate-400 flex items-center justify-between">
            <span>Módulo de Desossa Integrado</span>
            <span className="text-emerald-400 font-semibold flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Nuvem Supabase Ativa
            </span>
          </div>
        </div>

        {/* Right Side: Login Form & Quick Access (7 cols) */}
        <div className="lg:col-span-7 p-8 sm:p-10 flex flex-col justify-between space-y-6">
          <div>
            <div className="mb-6">
              <span className="text-xs font-bold text-rose-800 uppercase tracking-wide">
                Autenticação de Usuário
              </span>
              <h2 className="text-2xl font-black text-slate-900 tracking-tight mt-0.5">
                Entrar no Frigorífico KPI Pro
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Digite suas credenciais corporativas para acessar o painel de desossa.
              </p>
            </div>

            {error && (
              <div className="p-3.5 mb-5 bg-rose-50 border border-rose-200 text-rose-900 text-xs rounded-xl flex items-center gap-2.5 animate-in fade-in">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span className="font-semibold">{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Usuário ou E-mail:
                </label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Ex: admin, gerente ou diretoria"
                    className="w-full pl-10 pr-4 py-2.5 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-800/20 focus:border-rose-800 transition-all font-medium"
                    required
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Senha de Acesso:
                  </label>
                </div>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Digite sua senha"
                    className="w-full pl-10 pr-10 py-2.5 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-800/20 focus:border-rose-800 transition-all font-medium"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 p-0.5"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 bg-rose-900 hover:bg-rose-800 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center justify-center gap-2 mt-2"
              >
                <Lock className="w-4 h-4" />
                {isLoading ? 'Autenticando...' : 'Acessar o Sistema'}
                <ArrowRight className="w-4 h-4 ml-0.5" />
              </button>
            </form>
          </div>

          {/* Quick Access Buttons for immediate testing */}
          <div className="pt-5 border-t border-slate-100">
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wide flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-rose-700" />
                Entrada Rápida por Perfil (1 Clique):
              </span>
              <span className="text-[10px] text-slate-400">Ambiente Pronto</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleQuickLogin('admin', 'admin123')}
                className="p-2.5 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-xl text-left transition-all group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-purple-950 group-hover:text-purple-700">
                    ADMIN
                  </span>
                  <span className="text-[9px] font-mono text-purple-600 font-bold">admin123</span>
                </div>
                <span className="text-[10px] text-purple-800/80 block mt-0.5 truncate">
                  Acesso Total & Menu
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('gerente', 'gerente123')}
                className="p-2.5 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-xl text-left transition-all group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-blue-950 group-hover:text-blue-700">
                    GERENCIAL
                  </span>
                  <span className="text-[9px] font-mono text-blue-600 font-bold">gerente123</span>
                </div>
                <span className="text-[10px] text-blue-800/80 block mt-0.5 truncate">
                  Upload RETQ010
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('diretoria', 'diretoria123')}
                className="p-2.5 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-xl text-left transition-all group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-950 group-hover:text-amber-700">
                    DIRETORIA
                  </span>
                  <span className="text-[9px] font-mono text-amber-600 font-bold">diretoria123</span>
                </div>
                <span className="text-[10px] text-amber-800/80 block mt-0.5 truncate">
                  Visualização Executiva
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
