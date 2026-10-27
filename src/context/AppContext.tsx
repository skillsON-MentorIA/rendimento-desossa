import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import {
  INITIAL_MARKET_BENCHMARKS,
  INITIAL_OPERATORS,
  INITIAL_PRODUCTION_RECORDS,
  INITIAL_USERS
} from '../data/initialData';
import { CutItem, CutType, FilterState, MarketBenchmark, OperatorStat, ProductionRecord, User, UserRole } from '../types';
import { CalculatedSummary, calculateSummary, cleanRawMaterialName } from '../utils/calculations';
import { encryptPassword, decryptPassword, verifyPassword } from '../utils/securityCrypto';
import {
  syncRecordsToSupabase,
  fetchRecordsFromSupabase,
  syncUsersToSupabase,
  fetchUsersFromSupabase,
  deleteRecordFromSupabase,
  deleteAllRecordsFromSupabase,
  replaceRecordsInSupabase,
  getSupabaseConfig,
} from '../services/supabaseClient';

interface AppContextType {
  currentUser: User | null;
  setCurrentUser: (user: User | null) => void;
  users: User[];
  addUser: (user: Omit<User, 'id'>) => void;
  removeUser: (userId: string) => boolean;
  updateUser: (userId: string, updates: Partial<User>) => void;
  records: ProductionRecord[];
  filteredRecords: ProductionRecord[];
  summary: CalculatedSummary;
  operators: OperatorStat[];
  benchmarks: MarketBenchmark[];
  filters: FilterState;
  setFilters: React.Dispatch<React.SetStateAction<FilterState>>;
  addRecord: (record: ProductionRecord) => void;
  deleteRecord: (id: string) => Promise<{ success: boolean; message: string }>;
  deleteAllRecords: () => Promise<{ success: boolean; message: string }>;
  updateRecord: (record: ProductionRecord) => void;
  correctRecordDetails: (
    id: string,
    updates: {
      responsibleOperator?: string;
      operatorCount?: number;
      shift?: 'Turno 1' | 'Turno 2' | 'Turno 3';
      carcassCostPerKg?: number;
      date?: string;
      notes?: string;
    }
  ) => void;
  replaceRecords: (newRecords: ProductionRecord[]) => void;
  mergeRecords: (newRecords: ProductionRecord[]) => void;
  lastExportDate: string | null;
  setLastExportDate: (date: string | null) => void;
  updateBenchmark: (code: string, newExpectedPct: number) => void;
  carcassCosts: { DIANTEIRO: number; TRASEIRO: number; SUINO: number; COSTELA: number };
  updateCarcassCost: (type: 'DIANTEIRO' | 'TRASEIRO' | 'SUINO' | 'COSTELA', newCost: number) => void;
  resetToDemoData: () => void;
  login: (username: string, password?: string) => { success: boolean; message?: string };
  logout: () => void;
  canEdit: boolean;
  canUpload: boolean;
  isAdmin: boolean;
  isDirectoria: boolean;
  syncSupabase: () => Promise<{ success: boolean; message: string }>;
  syncCleanToSupabase: () => Promise<{ success: boolean; message: string; deletedCount?: number }>;
  fetchSupabase: () => Promise<{ success: boolean; message: string }>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const STORAGE_KEY_RECORDS = 'frigo_kpi_records_v1';
const STORAGE_KEY_DELETED_RECORDS = 'frigo_kpi_deleted_records_v1';
const STORAGE_KEY_USER = 'frigo_kpi_active_user_v3';
const STORAGE_KEY_USERS = 'frigo_kpi_users_v3';
const STORAGE_KEY_BENCHMARKS = 'frigo_kpi_benchmarks_v1';
const STORAGE_KEY_LAST_EXPORT = 'frigo_last_export_date_v1';
const STORAGE_KEY_CARCASS_COSTS = 'frigo_kpi_carcass_costs_v2';

export interface CarcassCostsState {
  DIANTEIRO: number;
  TRASEIRO: number;
  SUINO: number;
  COSTELA: number;
}

const DEFAULT_CARCASS_COSTS: CarcassCostsState = {
  DIANTEIRO: 15.20,
  TRASEIRO: 21.80,
  SUINO: 9.30,
  COSTELA: 14.50,
};

/**
 * Garante que produtos sem osso (como PERNIL S/OSSO, PALETA S/OSSO) não sejam contabilizados
 * incorretamente como subproduto osso em lotes suínos já existentes no banco local.
 * Garante também que a carne suína tenha como ÚNICO subproduto o OSSO (Sebo = 0 kg e 0,00%).
 */
function sanitizeProductionRecord(r: ProductionRecord, currentSuinoCost: number = 9.30): ProductionRecord {
  const rawDescCleaned = cleanRawMaterialName(r.rawMaterialDesc) || r.rawMaterialDesc;

  // Verificar se é suíno mesmo que tenha sido classificado incorretamente
  const isActuallySuino = r.type === 'SUINO' ||
    /SU[IÍ]NO|CARCA[ÇC]A\s+SU[IÍ]NA|1\/2\s*CARCA[ÇC]A|MATRIZ/i.test(rawDescCleaned || '') ||
    r.rawMaterialCode?.startsWith('2110') ||
    (r.cuts && r.cuts.some((c) => /PERNIL|PALETA\s+SU|SU[IÍ]NO/i.test(c.name)));

  if (!r.cuts || r.cuts.length === 0) {
    return {
      ...r,
      rawMaterialDesc: rawDescCleaned,
    };
  }

  if (isActuallySuino) {
    const type: CutType = 'SUINO';

    const updatedCuts = r.cuts.map((cut) => {
      const isSemOsso = /S\/\s*OSSO|SEM\s*OSSO/i.test(cut.name);
      const isMeatCut = /PERNIL|PALETA|LOMBO|COSTEL|BISTECA|CARRE|BARRIGA|PANCETA|COPA|FILE|MIGNON/i.test(cut.name);
      const hasXMP = /^X-MP/i.test(cut.name) || /X-MP/i.test(cut.code);
      const isBone = !isSemOsso && !isMeatCut && hasXMP && /OSSO/i.test(cut.name);
      const category: CutItem['category'] = isBone
        ? 'SUBPRODUTO_OSSO'
        : /RECORTE|RETALHO|MOIDA|CARNE\s+INDUSTRIAL|PEZINHO|RABINHO|PELE/i.test(cut.name)
        ? 'RECORTE'
        : 'SUINO';
      return {
        ...cut,
        isNonSaleable: isBone,
        category,
      };
    });

    const boneWeightKg = updatedCuts.filter((c) => c.category === 'SUBPRODUTO_OSSO').reduce((a, b) => a + b.weightKg, 0);
    const fatWeightKg = 0; // Na carne suína, o ÚNICO subproduto é o OSSO!
    const nonSaleableWeightKg = boneWeightKg;
    const saleableCutsWeightKg = Math.max(0, r.finishedProductWeightKg - nonSaleableWeightKg);

    const bonePct = r.rawMaterialWeightKg > 0 ? (boneWeightKg / r.rawMaterialWeightKg) * 100 : 0;
    const fatPct = 0; // Sebo é inexistente na suinocultura (0,00%)
    const nonSaleablePct = bonePct;

    const calculatedCarcass = saleableCutsWeightKg + boneWeightKg + r.lossKg;
    const totalCarcassWeightKg = calculatedCarcass > 0 ? calculatedCarcass : r.rawMaterialWeightKg;

    const preDebonedInputKg = r.preDebonedInputKg || 0;
    const deboningEffectiveMeatKg = Math.max(0, saleableCutsWeightKg - preDebonedInputKg);
    const carcassWithBoneWeightKg = Math.max(0, totalCarcassWeightKg - preDebonedInputKg);
    const deboningYieldNetPct = carcassWithBoneWeightKg > 0 ? (deboningEffectiveMeatKg / carcassWithBoneWeightKg) * 100 : 0;

    // Se o lote suíno herdou por engano o custo bovino de 15.20/15.50/21.80, calibrar para o custo suíno correto
    const costPerKg = (r.carcassCostPerKg >= 15.00) ? currentSuinoCost : r.carcassCostPerKg;
    const totalCarcassCost = r.rawMaterialWeightKg * costPerKg;
    const grossProfitValue = r.finishedProductTotalValue - totalCarcassCost;
    const profitMarginPct = r.finishedProductTotalValue > 0 ? (grossProfitValue / r.finishedProductTotalValue) * 100 : 0;

    let suinoDesc = rawDescCleaned;
    if (!suinoDesc || suinoDesc === 'CARCAÇA SUÍNA C/ OSSO' || /MATRIZ/i.test(suinoDesc) || r.rawMaterialCode?.includes('1110003') || r.rawMaterialWeightKg === 21284) {
      suinoDesc = '1/2 CARCAÇA SUÍNA MATRIZ';
    }

    return {
      ...r,
      type,
      rawMaterialDesc: suinoDesc,
      cuts: updatedCuts,
      boneWeightKg,
      fatWeightKg: 0,
      nonSaleableWeightKg,
      saleableCutsWeightKg,
      bonePct,
      fatPct: 0,
      nonSaleablePct,
      deboningYieldNetPct,
      carcassCostPerKg: costPerKg,
      totalCarcassCost,
      grossProfitValue,
      profitMarginPct,
    };
  }

  // Verificar se é COSTELA mesmo que tenha sido classificado incorretamente como TRASEIRO
  const isActuallyCostela = r.type === 'COSTELA' ||
    /COSTELA|PONTA\s*DE\s*AGULHA|COSTEL[ÃA]O|1110004/i.test(rawDescCleaned || '') ||
    r.rawMaterialCode?.includes('1110004') ||
    (r.cuts && r.cuts.some((c) => /COSTELA\s*BOV|MINGA|RIPA|MATAMBRE/i.test(c.name)));

  let effectiveType: CutType = r.type;
  let effectiveDesc = rawDescCleaned;
  if (isActuallyCostela && !isActuallySuino) {
    effectiveType = 'COSTELA';
    if (!/COSTELA/i.test(effectiveDesc || '')) {
      effectiveDesc = 'COSTELA BOVINA C/ OSSO';
    }
  }

  // BOVINO (DT, TR, COSTELA):
  // REGRA OFICIAL SOLICITADA PELA DIRETORIA:
  // Considerar como OSSO na soma do subproduto Osso SOMENTE os registros no relatório ATAK que tenham o código/prefixo X-MP.
  // Produtos vendáveis feitos de osso (ex: "CXGG - OSSO PATINHO BOV CONG", "OSSO BUCO", etc.) NÃO têm o código X-MP
  // e portanto NÃO são subprodutos, devendo ser considerados cortes vendáveis normais.
  const updatedCuts = r.cuts.map((cut) => {
    const isSemOsso = /S\/\s*OSSO|SEM\s*OSSO/i.test(cut.name);
    const hasXMP = /^X-MP/i.test(cut.name) || /X-MP/i.test(cut.code);
    const isBone = hasXMP && /OSSO/i.test(cut.name) && !isSemOsso;
    const isFat = /SEBO/i.test(cut.name) || cut.category === 'SUBPRODUTO_SEBO' || cut.code.includes('01010990023') || cut.code.includes('01010990008');

    if (isBone) {
      return {
        ...cut,
        isNonSaleable: true,
        category: 'SUBPRODUTO_OSSO' as const,
      };
    }

    if (isFat) {
      return {
        ...cut,
        isNonSaleable: true,
        category: 'SUBPRODUTO_SEBO' as const,
      };
    }

    // Categoria do corte vendável
    let category: CutItem['category'];
    if (effectiveType === 'COSTELA' || /COSTELA|MINGA|RIPA|MATAMBRE/i.test(cut.name)) {
      category = /RECORTE/i.test(cut.name) ? 'RECORTE' : 'COSTELA';
    } else if (effectiveType === 'DIANTEIRO') {
      category = /RECORTE|MOIDA/i.test(cut.name) ? 'RECORTE' : 'DIANTEIRO';
    } else {
      category = /PICANHA|FIL[ÉE]|ALCATRA|CONTRA|MAMINHA/i.test(cut.name) ? 'NOBRE' : /RECORTE/i.test(cut.name) ? 'RECORTE' : 'TRASEIRO';
    }

    return {
      ...cut,
      isNonSaleable: false,
      category,
    };
  });

  const boneWeightKg = updatedCuts.filter((c) => c.category === 'SUBPRODUTO_OSSO').reduce((a, b) => a + b.weightKg, 0);
  const fatWeightKg = updatedCuts.filter((c) => c.category === 'SUBPRODUTO_SEBO').reduce((a, b) => a + b.weightKg, 0);
  const nonSaleableWeightKg = boneWeightKg + fatWeightKg;
  const saleableCutsWeightKg = Math.max(0, r.finishedProductWeightKg - nonSaleableWeightKg);

  const bonePct = r.rawMaterialWeightKg > 0 ? (boneWeightKg / r.rawMaterialWeightKg) * 100 : 0;
  const fatPct = r.rawMaterialWeightKg > 0 ? (fatWeightKg / r.rawMaterialWeightKg) * 100 : 0;
  const nonSaleablePct = r.rawMaterialWeightKg > 0 ? (nonSaleableWeightKg / r.rawMaterialWeightKg) * 100 : 0;

  const calculatedCarcass = saleableCutsWeightKg + nonSaleableWeightKg + r.lossKg;
  const totalCarcassWeightKg = calculatedCarcass > 0 ? calculatedCarcass : r.rawMaterialWeightKg;
  const preDebonedInputKg = r.preDebonedInputKg || 0;
  const deboningEffectiveMeatKg = Math.max(0, saleableCutsWeightKg - preDebonedInputKg);
  const carcassWithBoneWeightKg = Math.max(0, totalCarcassWeightKg - preDebonedInputKg);
  const deboningYieldNetPct = carcassWithBoneWeightKg > 0 ? (deboningEffectiveMeatKg / carcassWithBoneWeightKg) * 100 : 0;

  return {
    ...r,
    type: effectiveType,
    rawMaterialDesc: effectiveDesc,
    cuts: updatedCuts,
    boneWeightKg,
    fatWeightKg,
    nonSaleableWeightKg,
    saleableCutsWeightKg,
    bonePct,
    fatPct,
    nonSaleablePct,
    deboningYieldNetPct,
  };
}

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Configured Carcass Costs
  const [carcassCosts, setCarcassCosts] = useState<CarcassCostsState>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_CARCASS_COSTS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed.DIANTEIRO === 'number' && typeof parsed.TRASEIRO === 'number' && typeof parsed.SUINO === 'number') {
          return parsed;
        }
      }
    } catch (e) {
      console.error(e);
    }
    return DEFAULT_CARCASS_COSTS;
  });

  // Users list persisted in localStorage
  const [users, setUsers] = useState<User[]>(() => {
    // Purge old versions that contained fictitious mock names
    localStorage.removeItem('frigo_kpi_users_v2');
    localStorage.removeItem('frigo_kpi_active_user_v2');
    const saved = localStorage.getItem(STORAGE_KEY_USERS);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const sanitized = parsed
            .filter(
              (u: User) =>
                !u.name.includes('Roberto') &&
                !u.name.includes('Carlos') &&
                !u.name.includes('Arthur')
            )
            .map((u: User) => ({
              ...u,
              password: encryptPassword(u.password || 'admin123'),
            }));
          if (sanitized.length > 0) return sanitized;
        }
      } catch (e) {
        console.error(e);
      }
    }
    return INITIAL_USERS.map((u) => ({
      ...u,
      password: encryptPassword(u.password || 'admin123'),
    }));
  });

  // Current authenticated user
  // CRITICAL: When no user is active or after logout, this MUST be null!
  // It must NEVER default to INITIAL_USERS[0] on refresh when logged out.
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_USER);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (
          parsed &&
          parsed.username &&
          !parsed.name?.includes('Roberto') &&
          !parsed.name?.includes('Carlos') &&
          !parsed.name?.includes('Arthur')
        ) {
          return parsed;
        }
      } catch (e) {
        console.error(e);
      }
    }
    return null;
  });

  // Production records persisted in localStorage with deleted IDs blacklist
  const [records, setRecords] = useState<ProductionRecord[]>(() => {
    let deletedIds = new Set<string>();
    try {
      const savedDeleted = localStorage.getItem(STORAGE_KEY_DELETED_RECORDS);
      if (savedDeleted) {
        const parsedDel = JSON.parse(savedDeleted);
        if (Array.isArray(parsedDel)) {
          deletedIds = new Set(parsedDel);
        }
      }
    } catch (e) {
      console.error(e);
    }

    const saved = localStorage.getItem(STORAGE_KEY_RECORDS);
    if (saved !== null) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          // Return sanitized records without re-inserting deleted items
          return parsed
            .filter((p: ProductionRecord) => !deletedIds.has(p.id))
            .map((p: ProductionRecord) => sanitizeProductionRecord(p, 9.30));
        }
      } catch (e) {
        console.error(e);
      }
    }

    // First time opening the application ever (saved === null):
    return INITIAL_PRODUCTION_RECORDS
      .filter((r) => !deletedIds.has(r.id))
      .map((p) => sanitizeProductionRecord(p, 9.30));
  });

  const [lastExportDate, setLastExportDate] = useState<string | null>(() => {
    return localStorage.getItem(STORAGE_KEY_LAST_EXPORT);
  });

  const [operators] = useState<OperatorStat[]>(INITIAL_OPERATORS);
  
  const [benchmarks, setBenchmarks] = useState<MarketBenchmark[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_BENCHMARKS);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const existingCodes = new Set(parsed.map((p: MarketBenchmark) => p.code));
          const missing = INITIAL_MARKET_BENCHMARKS.filter((b) => !existingCodes.has(b.code));
          return [...parsed, ...missing];
        }
      } catch (e) { console.error(e); }
    }
    return INITIAL_MARKET_BENCHMARKS;
  });

  // Helper to extract date range from records
  const getDatesRangeFromRecords = (recList: ProductionRecord[]): { latest: string; oldest: string } => {
    if (!recList || recList.length === 0) {
      const today = new Date().toISOString().split('T')[0];
      return { latest: today, oldest: today };
    }
    const dates = Array.from(new Set(recList.map((r) => r.date))).sort();
    return {
      oldest: dates[0],
      latest: dates[dates.length - 1],
    };
  };

  const [filters, setFilters] = useState<FilterState>(() => {
    const range = getDatesRangeFromRecords(records);
    return {
      viewMode: 'daily',
      date: range.latest,
      startDate: range.oldest,
      endDate: range.latest,
      month: range.latest.substring(0, 7),
      type: 'ALL',
      shift: 'ALL',
      operator: 'ALL',
    };
  });

  // Save changes to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_RECORDS, JSON.stringify(records));
    } catch (e) {
      console.error('Storage quota exceeded for records:', e);
    }
  }, [records]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(users));
    } catch (e) {
      console.error(e);
    }
  }, [users]);

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(currentUser));
    } else {
      localStorage.removeItem(STORAGE_KEY_USER);
    }
  }, [currentUser]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_BENCHMARKS, JSON.stringify(benchmarks));
  }, [benchmarks]);

  useEffect(() => {
    if (lastExportDate) {
      localStorage.setItem(STORAGE_KEY_LAST_EXPORT, lastExportDate);
    }
  }, [lastExportDate]);

  // Sincronização automática com o Supabase na inicialização do aplicativo
  // Permite que qualquer usuário acessando pelo Netlify em outro dispositivo receba os dados reais
  useEffect(() => {
    const config = getSupabaseConfig();
    if (!config.isConfigured) return;

    let isMounted = true;

    // Buscar usuários cadastrados no Supabase para permitir login em qualquer dispositivo
    fetchUsersFromSupabase()
      .then((res) => {
        if (isMounted && res.success && res.data && res.data.length > 0) {
          setUsers((prevLocal) => {
            const map = new Map<string, User>();
            prevLocal.forEach((u) => map.set(u.username.toLowerCase(), u));
            res.data!.forEach((u) => {
              map.set(u.username.toLowerCase(), {
                ...u,
                password: encryptPassword(u.password || 'admin123'),
              });
            });
            return Array.from(map.values());
          });
        }
      })
      .catch((err) => console.error('Erro na sincronização inicial de usuários:', err));

    // Buscar lotes de produção cadastrados no Supabase
    fetchRecordsFromSupabase()
      .then((res) => {
        if (isMounted && res.success && res.data && res.data.length > 0) {
          setRecords((prev) => {
            const existingIds = new Set(prev.map((p) => p.id));
            const newFromRemote = res.data!.filter((p) => !existingIds.has(p.id));
            if (newFromRemote.length > 0) {
              return [...prev, ...newFromRemote.map((p) => sanitizeProductionRecord(p, 9.30))];
            }
            return prev;
          });
        }
      })
      .catch((err) => console.error('Erro na sincronização inicial de lotes:', err));

    return () => {
      isMounted = false;
    };
  }, []);

  // User management methods
  const addUser = (userData: Omit<User, 'id'>) => {
    const cleanUsername = userData.username.trim().toLowerCase();
    const exists = users.some((u) => u.username.toLowerCase() === cleanUsername);
    if (exists) {
      throw new Error(`O usuário "${cleanUsername}" já existe no sistema. Escolha outro login.`);
    }

    const newUser: User = {
      ...userData,
      id: `usr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      username: cleanUsername,
      password: encryptPassword(userData.password || 'admin123'),
    };

    setUsers((prev) => {
      const next = [...prev, newUser];
      const cfg = getSupabaseConfig();
      if (cfg.isConfigured) {
        syncUsersToSupabase(next).catch(console.error);
      }
      return next;
    });
  };

  const removeUser = (userId: string): boolean => {
    if (currentUser?.id === userId) return false;
    setUsers((prev) => {
      const next = prev.filter((u) => u.id !== userId);
      const cfg = getSupabaseConfig();
      if (cfg.isConfigured) {
        syncUsersToSupabase(next).catch(console.error);
      }
      return next;
    });
    return true;
  };

  const updateUser = (userId: string, updates: Partial<User>) => {
    const finalUpdates = { ...updates };
    if (finalUpdates.password) {
      finalUpdates.password = encryptPassword(finalUpdates.password);
    }

    setUsers((prev) => {
      const next = prev.map((u) => (u.id === userId ? { ...u, ...finalUpdates } : u));
      const cfg = getSupabaseConfig();
      if (cfg.isConfigured) {
        syncUsersToSupabase(next).catch(console.error);
      }
      return next;
    });

    if (currentUser?.id === userId) {
      setCurrentUser((prev) => (prev ? { ...prev, ...finalUpdates } : null));
    }
  };

  const login = (username: string, password?: string): { success: boolean; message?: string } => {
    const cleanUser = username.trim().toLowerCase();
    const cleanPass = password?.trim() || '';

    const user = users.find(
      (u) => u.username.toLowerCase() === cleanUser || u.email?.toLowerCase() === cleanUser
    );

    if (!user) {
      return {
        success: false,
        message: 'Usuário ou e-mail não encontrado no sistema. Verifique a digitação.',
      };
    }

    if (user.password && !verifyPassword(cleanPass, user.password)) {
      return {
        success: false,
        message: 'Senha incorreta para este usuário.',
      };
    }

    setCurrentUser(user);
    return { success: true };
  };

  const logout = () => {
    setCurrentUser(null);
    localStorage.removeItem(STORAGE_KEY_USER);
    localStorage.removeItem('frigo_kpi_active_user_v2');
    localStorage.removeItem('frigo_kpi_active_user_v1');
  };

  // Filter logic
  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      if (filters.viewMode === 'daily') {
        if (r.date !== filters.date) return false;
      } else if (filters.viewMode === 'period') {
        if (filters.startDate && r.date < filters.startDate) return false;
        if (filters.endDate && r.date > filters.endDate) return false;
      } else if (filters.viewMode === 'accumulated') {
        if (!r.date.startsWith(filters.month)) return false;
      }

      if (filters.type === 'ALL') {
        // Consolidado Geral: exclui a Desossa Suína (SU), consolidando estritamente DT, TR e CT (bovinos)
        if (r.type === 'SUINO') return false;
      } else if (r.type !== filters.type) {
        return false;
      }
      if (filters.shift !== 'ALL' && r.shift !== filters.shift) return false;
      if (filters.operator !== 'ALL' && r.responsibleOperator !== filters.operator) return false;

      return true;
    });
  }, [records, filters]);

  const summary = useMemo(() => {
    return calculateSummary(filteredRecords);
  }, [filteredRecords]);

  // Record CRUD
  const addRecord = (newRec: ProductionRecord) => {
    setRecords((prev) => {
      const idx = prev.findIndex((r) => r.id === newRec.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = newRec;
        return copy;
      }
      return [newRec, ...prev];
    });

    setFilters((prev) => ({
      ...prev,
      date: newRec.date,
      viewMode: 'daily',
    }));

    // If Supabase is configured, automatically send new batch to Supabase
    const cfg = getSupabaseConfig();
    if (cfg.isConfigured) {
      syncRecordsToSupabase([newRec]).catch((err) => {
        console.warn('Falha na sincronização em nuvem do novo lote:', err);
      });
    }
  };

  const deleteRecord = async (id: string): Promise<{ success: boolean; message: string }> => {
    // 1. Mark ID in blacklist so it never gets resurrected by initialData
    try {
      const savedDeleted = localStorage.getItem(STORAGE_KEY_DELETED_RECORDS);
      const parsedDel = savedDeleted ? JSON.parse(savedDeleted) : [];
      const updatedDel = Array.from(new Set([...(Array.isArray(parsedDel) ? parsedDel : []), id]));
      localStorage.setItem(STORAGE_KEY_DELETED_RECORDS, JSON.stringify(updatedDel));
    } catch (e) {
      console.error(e);
    }

    // 2. Remove from local state and update localStorage
    setRecords((prev) => {
      const next = prev.filter((r) => r.id !== id);
      try {
        localStorage.setItem(STORAGE_KEY_RECORDS, JSON.stringify(next));
      } catch (e) {
        console.error(e);
      }
      return next;
    });

    // 3. Immediately delete from Supabase if configured
    const cfg = getSupabaseConfig();
    if (cfg.isConfigured) {
      return await deleteRecordFromSupabase(id);
    }

    return {
      success: true,
      message: 'Relatório excluído com sucesso da base de dados.',
    };
  };

  const deleteAllRecords = async (): Promise<{ success: boolean; message: string }> => {
    try {
      const allIds = records.map((r) => r.id);
      const savedDeleted = localStorage.getItem(STORAGE_KEY_DELETED_RECORDS);
      const parsedDel = savedDeleted ? JSON.parse(savedDeleted) : [];
      const updatedDel = Array.from(new Set([...(Array.isArray(parsedDel) ? parsedDel : []), ...allIds]));
      localStorage.setItem(STORAGE_KEY_DELETED_RECORDS, JSON.stringify(updatedDel));
    } catch (e) {
      console.error(e);
    }

    setRecords([]);
    try {
      localStorage.setItem(STORAGE_KEY_RECORDS, JSON.stringify([]));
    } catch (e) {
      console.error(e);
    }

    const cfg = getSupabaseConfig();
    if (cfg.isConfigured) {
      return await deleteAllRecordsFromSupabase();
    }

    return {
      success: true,
      message: 'Todos os relatórios foram excluídos com sucesso.',
    };
  };

  const updateRecord = (record: ProductionRecord) => {
    setRecords((prev) => prev.map((r) => (r.id === record.id ? record : r)));
    const cfg = getSupabaseConfig();
    if (cfg.isConfigured) {
      syncRecordsToSupabase([record]).catch((err) => {
        console.warn('Falha ao atualizar lote no Supabase:', err);
      });
    }
  };

  const correctRecordDetails = (
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
    setRecords((prev) => {
      const next = prev.map((r) => {
        if (r.id !== id) return r;
        const newCostPerKg = updates.carcassCostPerKg ?? r.carcassCostPerKg;
        const newOperatorCount = updates.operatorCount ?? r.operatorCount;
        const newTotalCarcassCost = r.rawMaterialWeightKg * newCostPerKg;
        const grossProfitValue = r.finishedProductTotalValue - newTotalCarcassCost;
        const profitMarginPct = r.finishedProductTotalValue > 0 ? (grossProfitValue / r.finishedProductTotalValue) * 100 : 0;
        const productivityKgPerPerson = newOperatorCount > 0 ? r.rawMaterialWeightKg / newOperatorCount : r.productivityKgPerPerson;

        return {
          ...r,
          ...updates,
          carcassCostPerKg: newCostPerKg,
          totalCarcassCost: newTotalCarcassCost,
          operatorCount: newOperatorCount,
          grossProfitValue,
          profitMarginPct,
          productivityKgPerPerson,
        };
      });

      const updatedItem = next.find((r) => r.id === id);
      if (updatedItem) {
        const cfg = getSupabaseConfig();
        if (cfg.isConfigured) {
          syncRecordsToSupabase([updatedItem]).catch((err) => {
            console.warn('Falha ao sincronizar correções no Supabase:', err);
          });
        }
      }

      return next;
    });
  };

  const replaceRecords = (newRecords: ProductionRecord[]) => {
    setRecords(newRecords);
  };

  const mergeRecords = (newRecords: ProductionRecord[]) => {
    setRecords((prev) => {
      const map = new Map(prev.map((r) => [r.id, r]));
      newRecords.forEach((nr) => map.set(nr.id, nr));
      return Array.from(map.values()).sort((a, b) => b.date.localeCompare(a.date));
    });
  };

  const updateBenchmark = (code: string, newExpectedPct: number) => {
    setBenchmarks((prev) =>
      prev.map((b) => (b.code === code ? { ...b, expectedYieldPct: newExpectedPct } : b))
    );
  };

  const updateCarcassCost = (type: 'DIANTEIRO' | 'TRASEIRO' | 'SUINO' | 'COSTELA', newCost: number) => {
    setCarcassCosts((prev) => {
      const next = { ...prev, [type]: newCost };
      localStorage.setItem(STORAGE_KEY_CARCASS_COSTS, JSON.stringify(next));
      return next;
    });

    setRecords((prev) =>
      prev.map((r) => {
        if (r.type !== type) return r;
        const newTotalCost = r.rawMaterialWeightKg * newCost;
        const grossProfitValue = r.finishedProductTotalValue - newTotalCost;
        const profitMarginPct = r.finishedProductTotalValue > 0 ? (grossProfitValue / r.finishedProductTotalValue) * 100 : 0;
        return {
          ...r,
          carcassCostPerKg: newCost,
          totalCarcassCost: newTotalCost,
          grossProfitValue,
          profitMarginPct,
        };
      })
    );
  };

  const resetToDemoData = () => {
    setRecords(INITIAL_PRODUCTION_RECORDS);
    setBenchmarks(INITIAL_MARKET_BENCHMARKS);
    setUsers(INITIAL_USERS);
    localStorage.removeItem(STORAGE_KEY_RECORDS);
    localStorage.removeItem(STORAGE_KEY_DELETED_RECORDS);
    localStorage.removeItem(STORAGE_KEY_BENCHMARKS);
    localStorage.removeItem(STORAGE_KEY_USERS);
    const initialDate = INITIAL_PRODUCTION_RECORDS[0]?.date || '2026-08-28';
    const dates = INITIAL_PRODUCTION_RECORDS.map((r) => r.date).sort();
    setFilters({
      viewMode: 'daily',
      date: initialDate,
      startDate: dates[0] || initialDate,
      endDate: dates[dates.length - 1] || initialDate,
      month: initialDate.substring(0, 7),
      type: 'ALL',
      shift: 'ALL',
      operator: 'ALL',
    });
  };

  // Supabase sync methods
  const syncSupabase = async () => {
    const res = await syncRecordsToSupabase(records);
    await syncUsersToSupabase(users);
    return res;
  };

  const syncCleanToSupabase = async () => {
    const res = await replaceRecordsInSupabase(records);
    await syncUsersToSupabase(users);
    return res;
  };

  const fetchSupabase = async () => {
    const res = await fetchRecordsFromSupabase();
    if (res.success && res.data && res.data.length > 0) {
      setRecords(res.data);
    }
    return {
      success: res.success,
      message: res.message,
    };
  };

  // Permission flags based on user role
  const isAdmin = currentUser?.role === 'ADMIN';
  const canUpload = currentUser?.role === 'ADMIN' || currentUser?.role === 'GERENCIAL';
  const canEdit = currentUser?.role === 'ADMIN' || currentUser?.role === 'GERENCIAL';
  const isDirectoria = currentUser?.role === 'DIRETORIA';

  return (
    <AppContext.Provider
      value={{
        currentUser,
        setCurrentUser,
        users,
        addUser,
        removeUser,
        updateUser,
        records,
        filteredRecords,
        summary,
        operators,
        benchmarks,
        filters,
        setFilters,
        addRecord,
        deleteRecord,
        deleteAllRecords,
        updateRecord,
        correctRecordDetails,
        replaceRecords,
        mergeRecords,
        lastExportDate,
        setLastExportDate,
        updateBenchmark,
        carcassCosts,
        updateCarcassCost,
        resetToDemoData,
        login,
        logout,
        canEdit,
        canUpload,
        isAdmin,
        isDirectoria,
        syncSupabase,
        syncCleanToSupabase,
        fetchSupabase,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
