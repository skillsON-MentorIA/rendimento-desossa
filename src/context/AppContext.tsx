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
  deleteRecord: (id: string) => void;
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
  updateCarcassCost: (type: 'DIANTEIRO' | 'TRASEIRO', newCost: number) => void;
  resetToDemoData: () => void;
  login: (username: string, password?: string) => { success: boolean; message?: string };
  logout: () => void;
  canEdit: boolean;
  canUpload: boolean;
  isAdmin: boolean;
  isDirectoria: boolean;
  syncSupabase: () => Promise<{ success: boolean; message: string }>;
  fetchSupabase: () => Promise<{ success: boolean; message: string }>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const STORAGE_KEY_RECORDS = 'frigo_kpi_records_v1';
const STORAGE_KEY_USER = 'frigo_kpi_active_user_v2';
const STORAGE_KEY_USERS = 'frigo_kpi_users_v2';
const STORAGE_KEY_BENCHMARKS = 'frigo_kpi_benchmarks_v1';
const STORAGE_KEY_LAST_EXPORT = 'frigo_last_export_date_v1';

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Users list persisted in localStorage
  const [users, setUsers] = useState<User[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_USERS);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {
        console.error(e);
      }
    }
    return INITIAL_USERS;
  });

  // Current authenticated user (default to admin so initial load is seamless)
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_USER);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.username) return parsed;
      } catch (e) {
        console.error(e);
      }
    }
    return INITIAL_USERS[0];
  });

  // Production records persisted in localStorage
  const [records, setRecords] = useState<ProductionRecord[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_RECORDS);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const initialMap = new Map(INITIAL_PRODUCTION_RECORDS.map((r) => [r.id, r]));
          // Upgrade any stored records where initial data has more cuts or newer complete SisAtak list
          const upgraded = parsed.map((p: ProductionRecord) => {
            const initRec = initialMap.get(p.id);
            if (initRec && (!p.cuts || p.cuts.length < initRec.cuts.length || p.finishedProductTotalValue !== initRec.finishedProductTotalValue)) {
              return initRec;
            }
            return p;
          });
          const existingIds = new Set(upgraded.map((p: ProductionRecord) => p.id));
          const missing = INITIAL_PRODUCTION_RECORDS.filter((r) => !existingIds.has(r.id));
          const result = missing.length > 0 ? [...upgraded, ...missing] : upgraded;
          try {
            localStorage.setItem(STORAGE_KEY_RECORDS, JSON.stringify(result));
          } catch {}
          return result;
        }
      } catch (e) { console.error(e); }
    }
    return INITIAL_PRODUCTION_RECORDS;
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
  };

  const deleteRecord = (id: string) => {
    setRecords((prev) => prev.filter((r) => r.id !== id));
  };

  const updateRecord = (record: ProductionRecord) => {
    setRecords((prev) => prev.map((r) => (r.id === record.id ? record : r)));
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
    setRecords((prev) =>
      prev.map((r) => {
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
      })
    );
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

  const updateCarcassCost = (type: 'DIANTEIRO' | 'TRASEIRO', newCost: number) => {
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
