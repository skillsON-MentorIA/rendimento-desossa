import React, { useState, useEffect } from 'react';
import {
  Lock,
  User as UserIcon,
  AlertCircle,
  Beef,
  KeyRound,
  Eye,
  EyeOff,
  ArrowRight,
  ScanFace,
  Smartphone,
  CheckCircle2,
  Sparkles
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { getEnrolledBiometric, authenticateWithFaceBiometrics, BiometricProfile } from '../utils/biometricAuth';
import { APP_VERSION } from '../version';

export const LoginScreen: React.FC = () => {
  const { login } = useApp();
  const [username, setUsername] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isBiometricLoading, setIsBiometricLoading] = useState<boolean>(false);
  const [enrolledBio, setEnrolledBio] = useState<BiometricProfile | null>(null);

  useEffect(() => {
    const bio = getEnrolledBiometric();
    setEnrolledBio(bio);
  }, []);

  const handleBiometricLogin = async () => {
    setError('');
    setIsBiometricLoading(true);
    try {
      const res = await authenticateWithFaceBiometrics();
      if (res.success && res.username) {
        // Realiza o login direto do usuário autorizado
        const loginRes = login(res.username);
        if (!loginRes.success) {
          setError(loginRes.message || 'Falha ao autenticar biometria.');
        }
      } else {
        setError(res.message || 'Leitura facial não confirmada.');
      }
    } catch {
      setError('Erro ao processar leitura facial.');
    } finally {
      setIsBiometricLoading(false);
    }
  };

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
        <div className="text-center mb-7">
          <div className="h-14 px-3.5 py-1 rounded-2xl bg-white border border-slate-200 inline-flex items-center justify-center mx-auto mb-2.5 shadow-xs">
            <img
              src="/bh_foods_logo.png"
              alt="BH Foods"
              className="h-10 w-auto object-contain"
            />
          </div>
          <span className="text-[10px] uppercase font-mono tracking-widest text-rose-800 font-bold block">
            BH Foods • SisAtak Industrial
          </span>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-0.5">
            Frigorífico KPI Pro
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Painel Executivo & Rendimento da Desossa
          </p>
        </div>

        {/* Error Feedback */}
        {error && (
          <div className="p-3.5 mb-5 bg-rose-50 border border-rose-200 text-rose-900 text-xs rounded-xl flex items-center gap-2.5 animate-in fade-in">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span className="font-semibold">{error}</span>
          </div>
        )}

        {/* Biometric Face ID Login Card if Enrolled */}
        {enrolledBio && (
          <div className="mb-5 p-3.5 bg-emerald-50 border border-emerald-300 rounded-xl space-y-2.5 shadow-xs">
            <div className="flex items-center justify-between text-xs text-emerald-950 font-bold">
              <div className="flex items-center gap-2">
                <ScanFace className="w-4 h-4 text-emerald-600" />
                <span>Leitura Facial Ativa</span>
              </div>
              <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full border border-emerald-300 font-semibold truncate max-w-[130px]">
                {enrolledBio.name}
              </span>
            </div>

            <button
              type="button"
              onClick={handleBiometricLogin}
              disabled={isBiometricLoading}
              className="w-full py-2.5 px-4 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white rounded-xl text-xs font-black shadow-md shadow-emerald-950/20 flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-[0.98]"
            >
              <ScanFace className="w-4 h-4" />
              {isBiometricLoading ? 'Autenticando Leitura Facial...' : 'Acessar com Leitura Facial (Face ID)'}
            </button>
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
                autoFocus={!enrolledBio}
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
            {isLoading ? 'Autenticando...' : 'Acessar com Senha'}
            <ArrowRight className="w-4 h-4 ml-0.5" />
          </button>
        </form>

        {/* Informative Tip for Diretoria */}
        {!enrolledBio && (
          <div className="mt-3.5 p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[11px] text-slate-600 flex items-start gap-2">
            <ScanFace className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <span>
              <strong>Diretoria Executiva:</strong> faça seu 1º acesso com login e senha e ative o <strong>Face ID / Leitura Facial</strong> no menu para entrar instantaneamente nos próximos acessos.
            </span>
          </div>
        )}

        <div className="mt-6 pt-4 border-t border-slate-100 text-center space-y-2">
          <div className="flex flex-wrap items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => {
                setUsername('admin');
                setPassword('admin123');
              }}
              className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-bold border border-slate-200 transition-colors cursor-pointer"
            >
              🔑 Acesso Admin
            </button>
            <button
              type="button"
              onClick={() => {
                setUsername('diretoria');
                setPassword('diretoria2026');
              }}
              className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-[10px] font-bold border border-emerald-200 transition-colors cursor-pointer"
            >
              📱 Diretoria Executiva (Mobile)
            </button>
          </div>
          <p className="text-[11px] text-slate-400">
            Acesso restrito e monitorado • Módulo de Desossa Industrial
          </p>
          <div className="pt-1 flex items-center justify-center gap-1.5">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 font-mono text-[10px] border border-slate-200 transition-colors select-none" title="Versão do Sistema">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              Versão {APP_VERSION}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
