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

/**
 * Tests connection with Supabase
 */
export async function testSupabaseConnection(): Promise<{ ok: boolean; message: string; details?: any }> {
  const client = getSupabaseClient();
  if (!client) {
    return {
      ok: false,
      message: 'Supabase não está configurado. Preencha a URL e a Anon Key no Netlify ou no painel.',
    };
  }

  try {
    // Attempt a light query to verify credentials and table existence
    const { data, error } = await client.from('production_records').select('id').limit(1);
    if (error) {
      if (error.code === '42P01') {
        // Table doesn't exist yet
        return {
          ok: false,
          message: 'Conectado ao Supabase, mas a tabela "production_records" ainda não foi criada. Execute o Script SQL fornecido no SQL Editor do Supabase.',
          details: error,
        };
      }
      return {
        ok: false,
        message: `Erro do Supabase: ${error.message} (Código: ${error.code})`,
        details: error,
      };
    }

    return {
      ok: true,
      message: 'Conexão com o Supabase estabelecida com sucesso! Tabelas prontas.',
      details: data,
    };
  } catch (err: any) {
    return {
      ok: false,
      message: `Falha na requisição ao Supabase: ${err.message || 'Verifique sua conexão ou URL'}`,
      details: err,
    };
  }
}

/**
 * Syncs local production records into Supabase production_records table.
 */
export async function syncRecordsToSupabase(records: ProductionRecord[]): Promise<{ success: boolean; message: string; count?: number }> {
  const client = getSupabaseClient();
  if (!client) {
    return {
      success: false,
      message: 'Supabase não configurado.',
    };
  }

  if (!records || records.length === 0) {
    return {
      success: false,
      message: 'Nenhum lote para sincronizar.',
    };
  }

  try {
    // Map application objects to DB format
    const rows = records.map((r) => ({
      id: r.id,
      date: r.date,
      period_start: r.periodStart,
      period_end: r.periodEnd,
      company_name: r.companyName,
      emission_time: r.emissionTime,
      type: r.type,
      shift: r.shift,
      responsible_operator: r.responsibleOperator,
      operator_count: r.operatorCount,
      raw_material_code: r.rawMaterialCode,
      raw_material_desc: r.rawMaterialDesc,
      raw_material_weight_kg: r.rawMaterialWeightKg,
      raw_material_boxes: r.rawMaterialBoxes,
      raw_material_avg_weight_kg: r.rawMaterialAvgWeightKg,
      carcass_cost_per_kg: r.carcassCostPerKg,
      total_carcass_cost: r.totalCarcassCost,
      finished_product_weight_kg: r.finishedProductWeightKg,
      finished_product_boxes: r.finishedProductBoxes,
      finished_product_total_value: r.finishedProductTotalValue,
      loss_kg: r.lossKg,
      loss_pct: r.lossPct,
      saleable_cuts_weight_kg: r.saleableCutsWeightKg,
      saleable_cuts_boxes: r.cuts.filter((c) => !c.isNonSaleable).reduce((acc, c) => acc + (c.boxesCount || 0), 0),
      bone_weight_kg: r.boneWeightKg,
      bone_pct: r.bonePct,
      fat_weight_kg: r.fatWeightKg,
      fat_pct: r.fatPct,
      non_saleable_weight_kg: r.nonSaleableWeightKg,
      non_saleable_pct: r.nonSaleablePct,
      deboning_yield_net_pct: r.deboningYieldNetPct,
      total_yield_pct: r.totalYieldPct,
      productivity_kg_per_person: r.productivityKgPerPerson,
      gross_profit_value: r.grossProfitValue,
      profit_margin_pct: r.profitMarginPct,
      notes: r.notes,
      cuts: r.cuts,
      updated_at: new Date().toISOString(),
    }));

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
    return {
      success: false,
      message: `Erro ao enviar dados para o Supabase: ${err.message}`,
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
 * Syncs user accounts to Supabase app_users table
 */
export async function syncUsersToSupabase(users: User[]): Promise<{ success: boolean; message: string }> {
  const client = getSupabaseClient();
  if (!client) {
    return { success: false, message: 'Supabase não configurado.' };
  }

  try {
    const rows = users.map((u) => ({
      id: u.id,
      name: u.name,
      username: u.username.toLowerCase().trim(),
      email: u.email,
      password: u.password || 'admin123',
      role: u.role,
      updated_at: new Date().toISOString(),
    }));

    const { error } = await client.from('app_users').upsert(rows, { onConflict: 'id' });
    if (error) throw error;

    return { success: true, message: `${users.length} usuários sincronizados no Supabase.` };
  } catch (err: any) {
    return { success: false, message: `Erro ao sincronizar usuários no Supabase: ${err.message}` };
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
-- SCRIPT DE CRIAÇÃO DO BANCO DE DADOS DESOSSA NO SUPABASE
-- Execute este script no SQL Editor do seu projeto Supabase:
-- ========================================================

-- 1. Tabela de Lotes e Desempenho da Desossa
CREATE TABLE IF NOT EXISTS public.production_records (
    id TEXT PRIMARY KEY,
    date DATE NOT NULL,
    period_start TEXT,
    period_end TEXT,
    company_name TEXT,
    emission_time TEXT,
    type TEXT NOT NULL, -- 'DIANTEIRO' ou 'TRASEIRO'
    shift TEXT,
    responsible_operator TEXT,
    operator_count INTEGER DEFAULT 20,
    raw_material_code TEXT,
    raw_material_desc TEXT,
    raw_material_weight_kg NUMERIC(12,3) NOT NULL,
    raw_material_boxes INTEGER DEFAULT 0,
    raw_material_avg_weight_kg NUMERIC(10,3),
    carcass_cost_per_kg NUMERIC(10,2) NOT NULL,
    total_carcass_cost NUMERIC(12,2) NOT NULL,
    finished_product_weight_kg NUMERIC(12,3) NOT NULL,
    finished_product_boxes INTEGER DEFAULT 0,
    finished_product_total_value NUMERIC(12,2) NOT NULL,
    loss_kg NUMERIC(10,3) DEFAULT 0,
    loss_pct NUMERIC(6,4) DEFAULT 0,
    saleable_cuts_weight_kg NUMERIC(12,3) DEFAULT 0,
    saleable_cuts_boxes INTEGER DEFAULT 0,
    bone_weight_kg NUMERIC(10,3) DEFAULT 0,
    bone_pct NUMERIC(6,3) DEFAULT 0,
    fat_weight_kg NUMERIC(10,3) DEFAULT 0,
    fat_pct NUMERIC(6,3) DEFAULT 0,
    non_saleable_weight_kg NUMERIC(10,3) DEFAULT 0,
    non_saleable_pct NUMERIC(6,3) DEFAULT 0,
    deboning_yield_net_pct NUMERIC(6,3) DEFAULT 0,
    total_yield_pct NUMERIC(6,3) DEFAULT 0,
    productivity_kg_per_person NUMERIC(10,2) DEFAULT 0,
    gross_profit_value NUMERIC(12,2) DEFAULT 0,
    profit_margin_pct NUMERIC(6,3) DEFAULT 0,
    notes TEXT,
    cuts JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

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

-- Inserção dos usuários padrão se ainda não existirem
INSERT INTO public.app_users (id, name, username, email, password, role)
VALUES 
    ('usr_admin', 'Administrador Geral', 'admin', 'admin@frigorifico.com.br', 'admin123', 'ADMIN'),
    ('usr_gerente', 'Gerente de Produção', 'gerente', 'gerente@frigorifico.com.br', 'gerente123', 'GERENCIAL'),
    ('usr_diretoria', 'Diretoria Executiva', 'diretoria', 'diretoria@frigorifico.com.br', 'diretoria123', 'DIRETORIA')
ON CONFLICT (id) DO NOTHING;

-- 3. Habilita RLS (Row Level Security) permitindo leitura/escrita com a chave ANON pública da aplicação
ALTER TABLE public.production_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Acesso completo produção para anon" ON public.production_records
    FOR ALL
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Acesso completo usuários para anon" ON public.app_users
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- Pronto! O banco de dados do seu frigorífico está configurado no Supabase.
`;
}
