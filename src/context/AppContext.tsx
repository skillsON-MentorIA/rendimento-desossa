import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import {
  INITIAL_MARKET_BENCHMARKS,
  INITIAL_OPERATORS,
  INITIAL_PRODUCTION_RECORDS,
  INITIAL_USERS
} from '../data/initialData';
import { FilterState, MarketBenchmark, OperatorStat, ProductionRecord, User, UserRole } from '../types';
import { CalculatedSummary, calculateSummary } from '../utils/calculations';
import {
  syncRecordsToSupabase,
  fetchRecordsFromSupabase,
  syncUsersToSupabase,
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
  updateCarcassCost: (type: 'DIANTEIRO' | 'TRASEIRO' | 'SUINO', newCost: number) => void;
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

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
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
          const sanitized = parsed.filter(
            (u: User) =>
              !u.name.includes('Roberto') &&
              !u.name.includes('Carlos') &&
              !u.name.includes('Arthur')
          );
          if (sanitized.length > 0) return sanitized;
        }
      } catch (e) {
        console.error(e);
      }
    }
    return INITIAL_USERS;
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
          // Return exactly the saved records without re-inserting deleted items
          return parsed.filter((p: ProductionRecord) => !deletedIds.has(p.id));
        }
      } catch (e) {
        console.error(e);
      }
    }

    // First time opening the application ever (saved === null):
    return INITIAL_PRODUCTION_RECORDS.filter((r) => !deletedIds.has(r.id));
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
    };

    setUsers((prev) => [...prev, newUser]);
  };

  const removeUser = (userId: string): boolean => {
    if (currentUser?.id === userId) return false;
    setUsers((prev) => prev.filter((u) => u.id !== userId));
    return true;
  };

  const updateUser = (userId: string, updates: Partial<User>) => {
    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, ...updates } : u))
    );
    if (currentUser?.id === userId) {
      setCurrentUser((prev) => (prev ? { ...prev, ...updates } : null));
    }
  };

  const login = (username: string, password?: string): { success: boolean; message?: string } => {
    const cleanUser = username.trim().toLowerCase();
    const cleanPass = password?.trim();

    const user = users.find(
      (u) => u.username.toLowerCase() === cleanUser || u.email?.toLowerCase() === cleanUser
    );

    if (!user) {
      return {
        success: false,
        message: 'Usuário ou e-mail não encontrado no sistema. Verifique a digitação.',
      };
    }

    if (user.password && cleanPass !== user.password) {
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

      if (filters.type !== 'ALL' && r.type !== filters.type) return false;
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

  const updateCarcassCost = (type: 'DIANTEIRO' | 'TRASEIRO' | 'SUINO', newCost: number) => {
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
