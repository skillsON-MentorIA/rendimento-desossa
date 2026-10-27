import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { ProductionRecord, User, MarketBenchmark } from '../types';
import { exportMasterDatabaseToExcel } from '../utils/excelDatabase';

const STORAGE_KEY_SUPABASE_URL = 'frigo_supabase_custom_url_v1';
const STORAGE_KEY_SUPABASE_KEY = 'frigo_supabase_custom_key_v1';

export interface SupabaseConfigInfo {
  url: string;
  anonKey: string;
  isConfigured: boolean;
  source: 'env' | 'admin_settings' | 'none';
}

/**
 * Returns current Supabase connection configuration:
 * Prioritizes Environment Variables (Netlify VITE_SUPABASE_URL), then Admin UI override.
 */
export function getSupabaseConfig(): SupabaseConfigInfo {
  const envUrl = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim();
  const envKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim();

  if (envUrl && envKey) {
    return {
      url: envUrl,
      anonKey: envKey,
      isConfigured: true,
      source: 'env',
    };
  }

  const customUrl = localStorage.getItem(STORAGE_KEY_SUPABASE_URL)?.trim() || '';
  const customKey = localStorage.getItem(STORAGE_KEY_SUPABASE_KEY)?.trim() || '';

  if (customUrl && customKey) {
    return {
      url: customUrl,
      anonKey: customKey,
      isConfigured: true,
      source: 'admin_settings',
    };
  }

  return {
    url: '',
    anonKey: '',
    isConfigured: false,
    source: 'none',
  };
}

export function saveCustomSupabaseConfig(url: string, anonKey: string) {
  localStorage.setItem(STORAGE_KEY_SUPABASE_URL, url.trim());
  localStorage.setItem(STORAGE_KEY_SUPABASE_KEY, anonKey.trim());
}

export function clearCustomSupabaseConfig() {
  localStorage.removeItem(STORAGE_KEY_SUPABASE_URL);
  localStorage.removeItem(STORAGE_KEY_SUPABASE_KEY);
}

let cachedClient: SupabaseClient | null = null;
let lastUsedUrl = '';
let lastUsedKey = '';

export function getSupabaseClient(): SupabaseClient | null {
  const cfg = getSupabaseConfig();
  if (!cfg.isConfigured) return null;

  if (cachedClient && lastUsedUrl === cfg.url && lastUsedKey === cfg.anonKey) {
    return cachedClient;
  }

  try {
    cachedClient = createClient(cfg.url, cfg.anonKey, {
      auth: {
        persistSession: false,
      },
    });
    lastUsedUrl = cfg.url;
    lastUsedKey = cfg.anonKey;
    return cachedClient;
  } catch (err) {
    console.error('Falha ao inicializar Supabase Client:', err);
    return null;
  }
}

export interface SupabaseTestResult {
  ok: boolean;
  message: string;
  details?: any;
  readRecordsOk: boolean;
  writeRecordsOk: boolean;
  readUsersOk: boolean;
  writeUsersOk: boolean;
  rlsBlocked: boolean;
  errors: string[];
}

/**
 * Tests connection with Supabase for BOTH Read and Write permissions on both tables.
 * Accurately detects whether Row-Level Security (RLS) is blocking inserts/updates.
 */
export async function testSupabaseConnection(): Promise<SupabaseTestResult> {
  const client = getSupabaseClient();
  if (!client) {
    return {
      ok: false,
      message: 'Supabase não está configurado. Preencha a URL e a Anon Key no Netlify ou no painel.',
      readRecordsOk: false,
      writeRecordsOk: false,
      readUsersOk: false,
      writeUsersOk: false,
      rlsBlocked: false,
      errors: ['Supabase não configurado.'],
    };
  }

  const errors: string[] = [];
  let readRecordsOk = false;
  let writeRecordsOk = false;
  let readUsersOk = false;
  let writeUsersOk = false;
  let rlsBlocked = false;

  // 1. Test Read Production Records
  try {
    const { error } = await client.from('production_records').select('id').limit(1);
    if (error) {
      errors.push(`Leitura de Lotes: ${error.message} (Código ${error.code})`);
      if (error.code === '42501' || error.message.toLowerCase().includes('row-level security') || error.message.toLowerCase().includes('policy')) {
        rlsBlocked = true;
      }
    } else {
      readRecordsOk = true;
    }
  } catch (e: any) {
    errors.push(`Leitura de Lotes: ${e.message}`);
  }

  // 2. Test Write Production Records (Ping record)
  try {
    const pingId = `__ping_diag_${Date.now()}__`;
    const pingRow = {
      id: pingId,
      date: '2026-01-01',
      period_start: '2026-01-01',
      period_end: '2026-01-01',
      company_name: 'Ping Test',
      emission_time: 'Agora',
      type: 'DIANTEIRO',
      shift: 'Turno 1',
      responsible_operator: 'Diagnóstico',
      operator_count: 20,
      raw_material_code: '0',
      raw_material_desc: 'Diagnóstico RLS',
      raw_material_weight_kg: 1,
      raw_material_boxes: 1,
      raw_material_avg_weight_kg: 1,
      carcass_cost_per_kg: 1,
      total_carcass_cost: 1,
      finished_product_weight_kg: 1,
      finished_product_boxes: 1,
      finished_product_total_value: 1,
      loss_kg: 0,
      loss_pct: 0,
      saleable_cuts_weight_kg: 1,
      saleable_cuts_boxes: 1,
      bone_weight_kg: 0,
      bone_pct: 0,
      fat_weight_kg: 0,
      fat_pct: 0,
      non_saleable_weight_kg: 0,
      non_saleable_pct: 0,
      deboning_yield_net_pct: 100,
      total_yield_pct: 100,
      productivity_kg_per_person: 1,
      gross_profit_value: 0,
      profit_margin_pct: 0,
      notes: 'Ping de diagnóstico RLS',
      cuts: [],
    };
    const { error: insErr } = await client.from('production_records').upsert(pingRow, { onConflict: 'id' });
    if (insErr) {
      errors.push(`Gravação de Lotes: ${insErr.message} (Código ${insErr.code})`);
      if (insErr.code === '42501' || insErr.message.toLowerCase().includes('row-level security') || insErr.message.toLowerCase().includes('policy') || insErr.message.toLowerCase().includes('violates')) {
        rlsBlocked = true;
      }
    } else {
      writeRecordsOk = true;
      // Clean up ping record
      await client.from('production_records').delete().eq('id', pingId);
    }
  } catch (e: any) {
    errors.push(`Gravação de Lotes: ${e.message}`);
  }

  // 3. Test Read app_users
  try {
    const { error } = await client.from('app_users').select('id').limit(1);
    if (error) {
      errors.push(`Leitura de Usuários: ${error.message} (Código ${error.code})`);
      if (error.code === '42501' || error.message.toLowerCase().includes('row-level security') || error.message.toLowerCase().includes('policy')) {
        rlsBlocked = true;
      }
    } else {
      readUsersOk = true;
    }
  } catch (e: any) {
    errors.push(`Leitura de Usuários: ${e.message}`);
  }

  // 4. Test Write app_users (Ping user)
  try {
    const pingUserId = `__ping_usr_${Date.now()}__`;
    const pingUserRow = {
      id: pingUserId,
      username: `__ping_${Date.now()}__`,
      name: 'Ping Test User',
      email: 'ping@test.com',
      password: 'test',
      role: 'ADMIN',
    };
    const { error: insUserErr } = await client.from('app_users').upsert(pingUserRow, { onConflict: 'id' });
    if (insUserErr) {
      errors.push(`Gravação de Usuários: ${insUserErr.message} (Código ${insUserErr.code})`);
      if (insUserErr.code === '42501' || insUserErr.message.toLowerCase().includes('row-level security') || insUserErr.message.toLowerCase().includes('policy') || insUserErr.message.toLowerCase().includes('violates')) {
        rlsBlocked = true;
      }
    } else {
      writeUsersOk = true;
      // Clean up ping user
      await client.from('app_users').delete().eq('id', pingUserId);
    }
  } catch (e: any) {
    errors.push(`Gravação de Usuários: ${e.message}`);
  }

  const allOk = readRecordsOk && writeRecordsOk && readUsersOk && writeUsersOk;

  let message = '';
  if (allOk) {
    message = '✅ Conexão perfeita! Leitura e Gravação 100% liberadas em ambas as tabelas (production_records e app_users).';
  } else if (rlsBlocked) {
    message = '⚠️ AVISO CRÍTICO: Conexão ativa, mas a GRAVAÇÃO está BLOQUEADA pelas políticas RLS do Supabase! Execute o Script de Desbloqueio no SQL Editor do Supabase.';
  } else {
    message = `Falha na verificação: ${errors.join(' | ')}`;
  }

  return {
    ok: allOk,
    message,
    readRecordsOk,
    writeRecordsOk,
    readUsersOk,
    writeUsersOk,
    rlsBlocked,
    errors,
  };
}

/**
 * Syncs local production records into Supabase production_records table.
 */
export async function syncRecordsToSupabase(records: ProductionRecord[]): Promise<{ success: boolean; message: string; count?: number }> {
  const client = getSupabaseClient();
  if (!client) {
    return {
      success: false,
      message: 'Supabase não configurado. Insira a URL e Anon Key no Netlify ou no menu Administrador.',
    };
  }

  if (!records || records.length === 0) {
    return {
      success: false,
      message: 'Nenhum lote para sincronizar.',
    };
  }

  const num = (v: any, fallback = 0): number => {
    if (typeof v === 'number') return Number.isFinite(v) ? v : fallback;
    if (typeof v === 'string') {
      const parsed = parseFloat(v.replace(',', '.'));
      return Number.isFinite(parsed) ? parsed : fallback;
    }
    return fallback;
  };

  const toIsoDate = (d?: string): string => {
    if (!d) return new Date().toISOString().split('T')[0];
    const s = d.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
    const brMatch = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (brMatch) return `${brMatch[3]}-${brMatch[2]}-${brMatch[1]}`;
    return new Date().toISOString().split('T')[0];
  };

  try {
    // Map application objects to DB format safely
    const rows = records.map((r) => {
      const cutsArray = Array.isArray(r.cuts) ? r.cuts : [];
      const saleableBoxes = cutsArray
        .filter((c) => !c.isNonSaleable)
        .reduce((acc, c) => acc + (num(c.boxesCount) || 0), 0);

      const targetDate = toIsoDate(r.date);

      return {
        id: r.id,
        date: targetDate,
        period_start: r.periodStart ? toIsoDate(r.periodStart) : targetDate,
        period_end: r.periodEnd ? toIsoDate(r.periodEnd) : targetDate,
        company_name: r.companyName || 'Frigorífico Industrial',
        emission_time: r.emissionTime || 'Hoje',
        type: r.type,
        shift: r.shift || 'Turno 1',
        responsible_operator: r.responsibleOperator || 'Operador Padrão',
        operator_count: Math.max(1, Math.round(num(r.operatorCount, 20))),
        raw_material_code: r.rawMaterialCode || '',
        raw_material_desc: r.rawMaterialDesc || '',
        raw_material_weight_kg: num(r.rawMaterialWeightKg),
        raw_material_boxes: Math.round(num(r.rawMaterialBoxes)),
        raw_material_avg_weight_kg: num(r.rawMaterialAvgWeightKg),
        carcass_cost_per_kg: num(r.carcassCostPerKg),
        total_carcass_cost: num(r.totalCarcassCost),
        finished_product_weight_kg: num(r.finishedProductWeightKg),
        finished_product_boxes: Math.round(num(r.finishedProductBoxes)),
        finished_product_total_value: num(r.finishedProductTotalValue),
        loss_kg: num(r.lossKg),
        loss_pct: num(r.lossPct),
        saleable_cuts_weight_kg: num(r.saleableCutsWeightKg),
        saleable_cuts_boxes: Math.round(saleableBoxes),
        bone_weight_kg: num(r.boneWeightKg),
        bone_pct: num(r.bonePct),
        fat_weight_kg: num(r.fatWeightKg),
        fat_pct: num(r.fatPct),
        non_saleable_weight_kg: num(r.nonSaleableWeightKg),
        non_saleable_pct: num(r.nonSaleablePct),
        deboning_yield_net_pct: num(r.deboningYieldNetPct),
        total_yield_pct: num(r.totalYieldPct),
        productivity_kg_per_person: num(r.productivityKgPerPerson),
        gross_profit_value: num(r.grossProfitValue),
        profit_margin_pct: num(r.profitMarginPct),
        notes: r.notes || '',
        cuts: cutsArray,
        updated_at: new Date().toISOString(),
      };
    });

    const { error } = await client.from('production_records').upsert(rows, { onConflict: 'id' });
    if (error) {
      throw error;
    }

    return {
      success: true,
      message: `${rows.length} lote(s) sincronizado(s) com sucesso na nuvem do Supabase!`,
      count: rows.length,
    };
  } catch (err: any) {
    console.error('Erro ao sincronizar produção no Supabase:', err);
    return {
      success: false,
      message: `Erro ao enviar lotes para o Supabase: ${err.message}`,
    };
  }
}

/**
 * Deletes a single production record from Supabase table.
 */
export async function deleteRecordFromSupabase(id: string): Promise<{ success: boolean; message: string }> {
  const client = getSupabaseClient();
  if (!client) {
    return {
      success: false,
      message: 'Supabase não configurado. Exclusão feita apenas localmente.',
    };
  }

  try {
    const { error } = await client.from('production_records').delete().eq('id', id);
    if (error) throw error;

    return {
      success: true,
      message: `Lote ${id} excluído com sucesso do banco de dados Supabase!`,
    };
  } catch (err: any) {
    console.error('Erro ao excluir registro no Supabase:', err);
    return {
      success: false,
      message: `Erro ao excluir lote do Supabase: ${err.message}`,
    };
  }
}

/**
 * Deletes all production records from Supabase table.
 */
export async function deleteAllRecordsFromSupabase(): Promise<{ success: boolean; message: string }> {
  const client = getSupabaseClient();
  if (!client) {
    return {
      success: false,
      message: 'Supabase não configurado.',
    };
  }

  try {
    const { error } = await client.from('production_records').delete().neq('id', '___safe_purge_all___');
    if (error) throw error;

    return {
      success: true,
      message: 'Todos os lotes foram excluídos do banco Supabase.',
    };
  } catch (err: any) {
    console.error('Erro ao limpar lotes do Supabase:', err);
    return {
      success: false,
      message: `Erro ao limpar Supabase: ${err.message}`,
    };
  }
}

/**
 * Fully synchronizes local records to Supabase, deleting any orphaned lotes
 * in Supabase that are no longer present in the local database.
 */
export async function replaceRecordsInSupabase(records: ProductionRecord[]): Promise<{ success: boolean; message: string; deletedCount?: number }> {
  const client = getSupabaseClient();
  if (!client) {
    return {
      success: false,
      message: 'Supabase não configurado.',
    };
  }

  try {
    // 1. Fetch current IDs stored in Supabase
    const { data: existing, error: fetchErr } = await client.from('production_records').select('id');
    if (fetchErr) throw fetchErr;

    const currentIds = new Set(records.map((r) => r.id));
    const toDeleteIds = (existing || [])
      .map((e: any) => e.id)
      .filter((id: string) => !currentIds.has(id));

    // 2. Delete orphaned records from Supabase
    if (toDeleteIds.length > 0) {
      const { error: delErr } = await client.from('production_records').delete().in('id', toDeleteIds);
      if (delErr) throw delErr;
    }

    // 3. Upsert current active records
    if (records.length > 0) {
      await syncRecordsToSupabase(records);
    }

    return {
      success: true,
      message: `Sincronização concluída: ${toDeleteIds.length} lote(s) órfão(s) excluído(s) da nuvem e ${records.length} lote(s) atualizado(s)!`,
      deletedCount: toDeleteIds.length,
    };
  } catch (err: any) {
    console.error('Erro na sincronização completa:', err);
    return {
      success: false,
      message: `Erro ao sincronizar com Supabase: ${err.message}`,
    };
  }
}

/**
 * Fetches records from Supabase and transforms back to ProductionRecord[]
 */
export async function fetchRecordsFromSupabase(): Promise<{ success: boolean; data?: ProductionRecord[]; message: string }> {
  const client = getSupabaseClient();
  if (!client) {
    return {
      success: false,
      message: 'Supabase não configurado.',
    };
  }

  try {
    const { data, error } = await client
      .from('production_records')
      .select('*')
      .order('date', { ascending: false });

    if (error) throw error;

    if (!data || data.length === 0) {
      return {
        success: true,
        data: [],
        message: 'Nenhum registro encontrado no Supabase.',
      };
    }

    const transformed: ProductionRecord[] = data.map((d: any) => ({
      id: d.id,
      date: d.date,
      periodStart: d.period_start,
      periodEnd: d.period_end,
      companyName: d.company_name,
      emissionTime: d.emission_time,
      type: d.type,
      shift: d.shift,
      responsibleOperator: d.responsible_operator,
      operatorCount: Number(d.operator_count),
      rawMaterialCode: d.raw_material_code,
      rawMaterialDesc: d.raw_material_desc,
      rawMaterialWeightKg: Number(d.raw_material_weight_kg),
      rawMaterialBoxes: Number(d.raw_material_boxes),
      rawMaterialAvgWeightKg: Number(d.raw_material_avg_weight_kg),
      carcassCostPerKg: Number(d.carcass_cost_per_kg),
      totalCarcassCost: Number(d.total_carcass_cost),
      finishedProductWeightKg: Number(d.finished_product_weight_kg),
      finishedProductBoxes: Number(d.finished_product_boxes),
      finishedProductTotalValue: Number(d.finished_product_total_value),
      lossKg: Number(d.loss_kg),
      lossPct: Number(d.loss_pct),
      saleableCutsWeightKg: Number(d.saleable_cuts_weight_kg),
      saleableCutsBoxes: Number(d.saleable_cuts_boxes),
      boneWeightKg: Number(d.bone_weight_kg),
      bonePct: Number(d.bone_pct),
      fatWeightKg: Number(d.fat_weight_kg),
      fatPct: Number(d.fat_pct),
      nonSaleableWeightKg: Number(d.non_saleable_weight_kg),
      nonSaleablePct: Number(d.non_saleable_pct),
      deboningYieldNetPct: Number(d.deboning_yield_net_pct),
      totalYieldPct: Number(d.total_yield_pct),
      productivityKgPerPerson: Number(d.productivity_kg_per_person),
      grossProfitValue: Number(d.gross_profit_value),
      profitMarginPct: Number(d.profit_margin_pct),
      notes: d.notes,
      cuts: d.cuts || [],
    }));

    return {
      success: true,
      data: transformed,
      message: `${transformed.length} lote(s) carregado(s) diretamente do Supabase!`,
    };
  } catch (err: any) {
    return {
      success: false,
      message: `Erro ao buscar dados do Supabase: ${err.message}`,
    };
  }
}

/**
 * Deletes a single user from Supabase app_users table.
 */
export async function deleteUserFromSupabase(userId: string, username?: string): Promise<{ success: boolean; message: string }> {
  const client = getSupabaseClient();
  if (!client) {
    return { success: false, message: 'Supabase não configurado.' };
  }

  try {
    let query = client.from('app_users').delete();
    if (userId) {
      query = query.eq('id', userId);
    } else if (username) {
      query = query.eq('username', username.toLowerCase().trim());
    }
    const { error } = await query;
    if (error) throw error;

    return { success: true, message: 'Usuário excluído com sucesso do Supabase.' };
  } catch (err: any) {
    console.error('Erro ao excluir usuário no Supabase:', err);
    return { success: false, message: `Erro ao excluir usuário no Supabase: ${err.message}` };
  }
}

/**
 * Syncs user accounts to Supabase app_users table safely.
 * Matches existing usernames to their DB primary keys so onConflict doesn't fail on unique username collisions.
 */
export async function syncUsersToSupabase(users: User[]): Promise<{ success: boolean; message: string; count?: number }> {
  const client = getSupabaseClient();
  if (!client) {
    return { success: false, message: 'Supabase não configurado. Verifique a URL e a Anon Key no menu Administrador.' };
  }

  if (!users || users.length === 0) {
    return { success: false, message: 'Nenhum usuário local para sincronizar.' };
  }

  try {
    // 1. Fetch remote users to identify matching usernames and reuse their DB IDs
    const { data: remoteUsers, error: fetchErr } = await client
      .from('app_users')
      .select('id, username');

    if (fetchErr) {
      console.warn('Aviso ao consultar app_users existentes no Supabase:', fetchErr.message);
    }

    const remoteUsernameMap = new Map<string, string>(); // lowercase username -> remote id
    if (remoteUsers && Array.isArray(remoteUsers)) {
      remoteUsers.forEach((ru: any) => {
        if (ru.username) {
          remoteUsernameMap.set(ru.username.toLowerCase().trim(), ru.id);
        }
      });
    }

    // 2. Map users, reusing existing remote ID when username matches
    const rows = users.map((u) => {
      const cleanUsername = u.username.toLowerCase().trim();
      const dbId = remoteUsernameMap.get(cleanUsername) || u.id;
      return {
        id: dbId,
        name: u.name.trim(),
        username: cleanUsername,
        email: u.email?.trim() || `${cleanUsername}@frigorifico.com.br`,
        password: u.password || 'admin123',
        role: u.role,
        updated_at: new Date().toISOString(),
      };
    });

    // 3. Upsert using primary key 'id'
    const { error: upsertErr } = await client.from('app_users').upsert(rows, { onConflict: 'id' });
    if (upsertErr) {
      // Fallback: try onConflict on 'username'
      const { error: retryErr } = await client.from('app_users').upsert(rows, { onConflict: 'username' });
      if (retryErr) {
        throw new Error(upsertErr.message || retryErr.message);
      }
    }

    return {
      success: true,
      message: `${rows.length} usuário(s) sincronizado(s) com sucesso no Supabase!`,
      count: rows.length,
    };
  } catch (err: any) {
    console.error('Erro ao sincronizar usuários no Supabase:', err);
    return {
      success: false,
      message: `Erro ao sincronizar usuários no Supabase: ${err.message}`,
    };
  }
}

/**
 * Fetches users from Supabase app_users table
 */
export async function fetchUsersFromSupabase(): Promise<{ success: boolean; data?: User[]; message: string }> {
  const client = getSupabaseClient();
  if (!client) {
    return { success: false, message: 'Supabase não configurado.' };
  }

  try {
    const { data, error } = await client.from('app_users').select('*').order('name');
    if (error) throw error;

    if (!data || data.length === 0) {
      return { success: true, data: [], message: 'Nenhum usuário no Supabase.' };
    }

    const users: User[] = data.map((d: any) => ({
      id: d.id,
      name: d.name,
      username: d.username,
      email: d.email,
      password: d.password,
      role: d.role,
    }));

    return { success: true, data: users, message: `${users.length} usuários obtidos do Supabase.` };
  } catch (err: any) {
    return { success: false, message: `Erro ao buscar usuários do Supabase: ${err.message}` };
  }
}

/**
 * Master download function: Exports all current database records & cuts into an Excel spreadsheet.
 */
export function downloadDatabaseSpreadsheet(records: ProductionRecord[], benchmarks: MarketBenchmark[] = []) {
  exportMasterDatabaseToExcel(records, benchmarks);
}

/**
 * Complete SQL script to set up Supabase database tables with 1-click in the Supabase SQL Editor.
 */
export function getSupabaseSetupSQL(): string {
  return `-- ========================================================
-- SCRIPT DE CRIAÇÃO E ATUALIZAÇÃO DO BANCO NO SUPABASE
-- Execute este script no SQL Editor do seu projeto Supabase:
-- ========================================================

-- 1. Tabela de Lotes e Desempenho da Desossa (com tipos numéricos flexíveis para evitar estouro de precisão)
CREATE TABLE IF NOT EXISTS public.production_records (
    id TEXT PRIMARY KEY,
    date DATE NOT NULL,
    period_start TEXT,
    period_end TEXT,
    company_name TEXT,
    emission_time TEXT,
    type TEXT NOT NULL,
    shift TEXT,
    responsible_operator TEXT,
    operator_count INTEGER DEFAULT 20,
    raw_material_code TEXT,
    raw_material_desc TEXT,
    raw_material_weight_kg NUMERIC NOT NULL,
    raw_material_boxes INTEGER DEFAULT 0,
    raw_material_avg_weight_kg NUMERIC,
    carcass_cost_per_kg NUMERIC NOT NULL,
    total_carcass_cost NUMERIC NOT NULL,
    finished_product_weight_kg NUMERIC NOT NULL,
    finished_product_boxes INTEGER DEFAULT 0,
    finished_product_total_value NUMERIC NOT NULL,
    loss_kg NUMERIC DEFAULT 0,
    loss_pct NUMERIC DEFAULT 0,
    saleable_cuts_weight_kg NUMERIC DEFAULT 0,
    saleable_cuts_boxes INTEGER DEFAULT 0,
    bone_weight_kg NUMERIC DEFAULT 0,
    bone_pct NUMERIC DEFAULT 0,
    fat_weight_kg NUMERIC DEFAULT 0,
    fat_pct NUMERIC DEFAULT 0,
    non_saleable_weight_kg NUMERIC DEFAULT 0,
    non_saleable_pct NUMERIC DEFAULT 0,
    deboning_yield_net_pct NUMERIC DEFAULT 0,
    total_yield_pct NUMERIC DEFAULT 0,
    productivity_kg_per_person NUMERIC DEFAULT 0,
    gross_profit_value NUMERIC DEFAULT 0,
    profit_margin_pct NUMERIC DEFAULT 0,
    notes TEXT,
    cuts JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Garantir que tabelas pré-existentes tenham colunas sem restrição de tamanho rígida (evita numeric field overflow)
DO $$
BEGIN
    ALTER TABLE public.production_records ALTER COLUMN loss_pct TYPE NUMERIC;
    ALTER TABLE public.production_records ALTER COLUMN loss_kg TYPE NUMERIC;
    ALTER TABLE public.production_records ALTER COLUMN profit_margin_pct TYPE NUMERIC;
    ALTER TABLE public.production_records ALTER COLUMN bone_pct TYPE NUMERIC;
    ALTER TABLE public.production_records ALTER COLUMN fat_pct TYPE NUMERIC;
    ALTER TABLE public.production_records ALTER COLUMN non_saleable_pct TYPE NUMERIC;
    ALTER TABLE public.production_records ALTER COLUMN deboning_yield_net_pct TYPE NUMERIC;
    ALTER TABLE public.production_records ALTER COLUMN total_yield_pct TYPE NUMERIC;
    ALTER TABLE public.production_records ALTER COLUMN productivity_kg_per_person TYPE NUMERIC;
    ALTER TABLE public.production_records ALTER COLUMN raw_material_weight_kg TYPE NUMERIC;
    ALTER TABLE public.production_records ALTER COLUMN finished_product_weight_kg TYPE NUMERIC;
    ALTER TABLE public.production_records ALTER COLUMN total_carcass_cost TYPE NUMERIC;
    ALTER TABLE public.production_records ALTER COLUMN finished_product_total_value TYPE NUMERIC;
    ALTER TABLE public.production_records ALTER COLUMN gross_profit_value TYPE NUMERIC;
EXCEPTION
    WHEN OTHERS THEN NULL;
END $$;

-- Índices de consulta rápida
CREATE INDEX IF NOT EXISTS idx_prod_records_date ON public.production_records(date DESC);
CREATE INDEX IF NOT EXISTS idx_prod_records_type ON public.production_records(type);

-- 2. Tabela de Usuários do Sistema e Perfis de Acesso
CREATE TABLE IF NOT EXISTS public.app_users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    username TEXT UNIQUE NOT NULL,
    email TEXT,
    password TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('ADMIN', 'GERENCIAL', 'DIRETORIA')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Inserção segura dos usuários padrão sem sobrescrever senhas existentes
INSERT INTO public.app_users (id, name, username, email, password, role)
VALUES 
    ('usr_admin', 'Administrador Geral', 'admin', 'admin@frigorifico.com.br', 'admin123', 'ADMIN')
ON CONFLICT (username) DO NOTHING;

-- 3. Habilita RLS (Row Level Security) com políticas idempotentes (pode ser executado múltiplas vezes)
ALTER TABLE public.production_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Acesso completo produção para anon" ON public.production_records;
CREATE POLICY "Acesso completo produção para anon" ON public.production_records
    FOR ALL
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "Acesso completo usuários para anon" ON public.app_users;
CREATE POLICY "Acesso completo usuários para anon" ON public.app_users
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- Pronto! O banco de dados do seu frigorífico está configurado no Supabase.
`;
}
