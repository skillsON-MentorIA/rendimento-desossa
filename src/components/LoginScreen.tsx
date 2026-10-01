import React, { useState } from 'react';
import {
  Lock,
  User as UserIcon,
  AlertCircle,
  Beef,
  KeyRound,
  Eye,
  EyeOff,
  ArrowRight
} from 'lucide-react';
import { useApp } from '../context/AppContext';

export const LoginScreen: React.FC = () => {
  const { login } = useApp();
  const [username, setUsername] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!username.trim()) {
      setError('Por favor, informe seu usuário ou e-mail.');
      return;
    }

    if (!password.trim()) {
      setError('Por favor, digite sua senha de acesso.');
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-rose-950 flex items-center justify-center p-4 sm:p-6 text-slate-800 antialiased selection:bg-rose-800 selection:text-white">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200/80 p-8 sm:p-10 animate-in fade-in zoom-in-95 duration-200 relative overflow-hidden">
        {/* Subtle decorative top bar */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-rose-800 via-rose-600 to-slate-800" />

        {/* Branding & Header */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-rose-900/10 text-rose-900 border border-rose-900/20 flex items-center justify-center mx-auto mb-3.5 shadow-xs">
            <Beef className="w-8 h-8" />
          </div>
          <span className="text-[10px] uppercase font-mono tracking-widest text-rose-800 font-bold block">
            SisAtak Industrial
          </span>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-0.5">
            Frigorífico KPI Pro
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Painel de Gestão e Rendimento da Desossa
          </p>
        </div>

        {/* Error Feedback */}
        {error && (
          <div className="p-3.5 mb-5 bg-rose-50 border border-rose-200 text-rose-900 text-xs rounded-xl flex items-center gap-2.5 animate-in fade-in">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span className="font-semibold">{error}</span>
          </div>
        )}

        {/* Simple Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Login:
            </label>
            <div className="relative">
              <UserIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Digite seu usuário ou e-mail"
                className="w-full pl-10 pr-4 py-2.5 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-800/20 focus:border-rose-800 transition-all font-medium text-slate-900"
                required
                autoFocus
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Senha:
            </label>
            <div className="relative">
              <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Digite sua senha de acesso"
                className="w-full pl-10 pr-10 py-2.5 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-800/20 focus:border-rose-800 transition-all font-medium text-slate-900"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 p-0.5"
                title={showPassword ? 'Ocultar senha' : 'Ver senha'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 bg-rose-900 hover:bg-rose-800 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center justify-center gap-2 mt-4 cursor-pointer"
          >
            <Lock className="w-4 h-4" />
            {isLoading ? 'Autenticando...' : 'Acessar o Sistema'}
            <ArrowRight className="w-4 h-4 ml-0.5" />
          </button>
        </form>

        <div className="mt-8 pt-4 border-t border-slate-100 text-center">
          <p className="text-[11px] text-slate-400">
            Acesso restrito e monitorado • Módulo de Desossa Industrial
          </p>
        </div>
      </div>
    </div>
  );
};
