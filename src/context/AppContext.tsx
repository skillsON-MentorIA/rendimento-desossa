import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import {
  INITIAL_MARKET_BENCHMARKS,
  INITIAL_OPERATORS,
  INITIAL_PRODUCTION_RECORDS,
  INITIAL_USERS
} from '../data/initialData';
import { FilterState, MarketBenchmark, OperatorStat, ProductionRecord, User, UserRole } from '../types';
import { CalculatedSummary, calculateSummary } from '../utils/calculations';

interface AppContextType {
  currentUser: User;
  setCurrentUser: (user: User) => void;
  users: User[];
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
  intranetDrivePath: string;
  setIntranetDrivePath: (path: string) => void;
  lastExportDate: string | null;
  setLastExportDate: (date: string | null) => void;
  updateBenchmark: (code: string, newExpectedPct: number) => void;
  updateCarcassCost: (type: 'DIANTEIRO' | 'TRASEIRO', newCost: number) => void;
  resetToDemoData: () => void;
  login: (username: string, password?: string) => boolean;
  logout: () => void;
  canEdit: boolean;
  canUpload: boolean;
  isAdmin: boolean;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const STORAGE_KEY_RECORDS = 'frigo_kpi_records_v1';
const STORAGE_KEY_USER = 'frigo_kpi_user_v1';
const STORAGE_KEY_BENCHMARKS = 'frigo_kpi_benchmarks_v1';
const STORAGE_KEY_DRIVE_PATH = 'frigo_intranet_drive_path_v1';
const STORAGE_KEY_LAST_EXPORT = 'frigo_last_export_date_v1';

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_USER);
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { console.error(e); }
    }
    return INITIAL_USERS[0]; // Admin by default
  });

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

  const [intranetDrivePath, setIntranetDrivePath] = useState<string>(() => {
    return localStorage.getItem(STORAGE_KEY_DRIVE_PATH) || '\\\\SRV-FRIGORIFICO\\Intranet\\Desossa\\BANCO_DADOS_DESOSSA.xlsx';
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

  // Auto-heal: Ensure filters.date is always synchronized with available records
  useEffect(() => {
    if (records.length === 0) return;
    const availableDates = Array.from(new Set(records.map((r) => r.date))).sort().reverse();
    if (!filters.date || !availableDates.includes(filters.date)) {
      const fallbackDate = availableDates[0];
      setFilters((prev) => ({
        ...prev,
        date: fallbackDate,
        month: fallbackDate.substring(0, 7),
      }));
    }
  }, [records, filters.date]);

  // Save to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(currentUser));
  }, [currentUser]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_RECORDS, JSON.stringify(records));
  }, [records]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_BENCHMARKS, JSON.stringify(benchmarks));
  }, [benchmarks]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_DRIVE_PATH, intranetDrivePath);
  }, [intranetDrivePath]);

  useEffect(() => {
    if (lastExportDate) {
      localStorage.setItem(STORAGE_KEY_LAST_EXPORT, lastExportDate);
    }
  }, [lastExportDate]);

  // Filter records
  const filteredRecords = useMemo(() => {
    return records.filter((rec) => {
      // Date or Period or Month filter
      if (filters.viewMode === 'daily') {
        if (filters.date && rec.date !== filters.date) return false;
      } else if (filters.viewMode === 'period') {
        if (filters.startDate && rec.date < filters.startDate) return false;
        if (filters.endDate && rec.date > filters.endDate) return false;
      } else if (filters.viewMode === 'accumulated') {
        if (filters.month && !rec.date.startsWith(filters.month)) return false;
      }

      // Cut Type filter
      if (filters.type !== 'ALL' && rec.type !== filters.type) return false;

      // Shift filter
      if (filters.shift !== 'ALL' && rec.shift !== filters.shift) return false;

      // Operator filter
      if (filters.operator !== 'ALL' && rec.responsibleOperator !== filters.operator) return false;

      return true;
    });
  }, [records, filters]);

  // Calculate summary of filtered records
  const summary = useMemo(() => {
    return calculateSummary(filteredRecords);
  }, [filteredRecords]);

  // Permission helpers
  const isAdmin = currentUser.role === 'ADMIN';
  const canUpload = currentUser.role === 'ADMIN' || currentUser.role === 'GERENCIAL';
  const canEdit = currentUser.role === 'ADMIN' || currentUser.role === 'GERENCIAL';

  const addRecord = (newRec: ProductionRecord) => {
    setRecords((prev) => [newRec, ...prev]);
    // Automatically switch the active daily filter to the newly uploaded record's date!
    setFilters((prev) => ({
      ...prev,
      viewMode: 'daily',
      date: newRec.date,
      endDate: !prev.endDate || newRec.date > prev.endDate ? newRec.date : prev.endDate,
      startDate: !prev.startDate || newRec.date < prev.startDate ? newRec.date : prev.startDate,
      month: newRec.date.substring(0, 7),
    }));
  };

  const updateRecord = (updated: ProductionRecord) => {
    setRecords((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
  };

  const deleteRecord = (id: string) => {
    setRecords((prev) => prev.filter((r) => r.id !== id));
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
      preDebonedInputKg?: number;
    }
  ) => {
    setRecords((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r;

        const responsibleOperator = updates.responsibleOperator ?? r.responsibleOperator;
        const operatorCount = updates.operatorCount ?? r.operatorCount;
        const shift = updates.shift ?? r.shift;
        const date = updates.date ?? r.date;
        const notes = updates.notes !== undefined ? updates.notes : r.notes;
        const carcassCostPerKg = updates.carcassCostPerKg ?? r.carcassCostPerKg;

        const totalCarcassCost = r.rawMaterialWeightKg * carcassCostPerKg;
        const grossProfitValue = r.finishedProductTotalValue - totalCarcassCost;
        const profitMarginPct = r.finishedProductTotalValue > 0 ? (grossProfitValue / r.finishedProductTotalValue) * 100 : 0;
        const productivityKgPerPerson = operatorCount > 0 ? r.rawMaterialWeightKg / operatorCount : 0;

        // Desossa Mista e Rendimento da Desossa
        const preDebonedInputKg = updates.preDebonedInputKg !== undefined
          ? Math.max(0, updates.preDebonedInputKg)
          : (r.preDebonedInputKg ?? 0);
        const hasPreDebonedInput = preDebonedInputKg > 0;
        const deboningEffectiveMeatKg = Math.max(0, r.saleableCutsWeightKg - preDebonedInputKg);
        const totalCarcass = (r.saleableCutsWeightKg + r.boneWeightKg + r.fatWeightKg + r.lossKg) || r.rawMaterialWeightKg;
        const carcassWithBoneWeightKg = Math.max(0, totalCarcass - preDebonedInputKg);
        const deboningYieldNetPct = carcassWithBoneWeightKg > 0
          ? (deboningEffectiveMeatKg / carcassWithBoneWeightKg) * 100
          : 0;

        return {
          ...r,
          responsibleOperator,
          operatorCount,
          shift,
          date,
          notes,
          carcassCostPerKg,
          totalCarcassCost,
          grossProfitValue,
          profitMarginPct,
          productivityKgPerPerson,
          preDebonedInputKg,
          hasPreDebonedInput,
          deboningEffectiveMeatKg,
          carcassWithBoneWeightKg,
          deboningYieldNetPct,
        };
      })
    );
  };

  const replaceRecords = (newRecords: ProductionRecord[]) => {
    setRecords(newRecords);
  };

  const mergeRecords = (newRecords: ProductionRecord[]) => {
    setRecords((prev) => {
      const existingIds = new Set(prev.map((r) => r.id));
      const toAdd = newRecords.filter((r) => !existingIds.has(r.id));
      const updated = prev.map((old) => {
        const replacement = newRecords.find((r) => r.id === old.id);
        return replacement || old;
      });
      return [...toAdd, ...updated];
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
        if (r.type === type) {
          const totalCarcassCost = r.rawMaterialWeightKg * newCost;
          const grossProfitValue = r.finishedProductTotalValue - totalCarcassCost;
          const profitMarginPct = r.finishedProductTotalValue > 0 ? (grossProfitValue / r.finishedProductTotalValue) * 100 : 0;
          return {
            ...r,
            carcassCostPerKg: newCost,
            totalCarcassCost,
            grossProfitValue,
            profitMarginPct,
          };
        }
        return r;
      })
    );
  };

  const resetToDemoData = () => {
    setRecords(INITIAL_PRODUCTION_RECORDS);
    setBenchmarks(INITIAL_MARKET_BENCHMARKS);
    localStorage.removeItem(STORAGE_KEY_RECORDS);
    localStorage.removeItem(STORAGE_KEY_BENCHMARKS);
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

  const login = (username: string, password?: string): boolean => {
    const user = INITIAL_USERS.find(
      (u) => u.username.toLowerCase() === username.toLowerCase() && (!password || !u.password || u.password === password)
    );
    if (user) {
      setCurrentUser(user);
      return true;
    }
    return false;
  };

  const logout = () => {
    // Default back to Diretoria (read-only view) or first user
    const defaultUser = INITIAL_USERS.find((u) => u.role === 'DIRETORIA') || INITIAL_USERS[0];
    setCurrentUser(defaultUser);
  };

  return (
    <AppContext.Provider
      value={{
        currentUser,
        setCurrentUser,
        users: INITIAL_USERS,
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
        intranetDrivePath,
        setIntranetDrivePath,
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
