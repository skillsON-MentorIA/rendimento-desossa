export type UserRole = 'ADMIN' | 'GERENCIAL' | 'DIRETORIA';

export interface User {
  id: string;
  name: string;
  username: string;
  password?: string;
  email: string;
  role: UserRole;
  avatar?: string;
  shift?: string;
}

export type CutType = 'DIANTEIRO' | 'TRASEIRO';

export interface CutItem {
  id: string;
  code: string;
  name: string;
  weightKg: number;
  boxesCount: number;
  unitPrice: number;
  totalPrice: number;
  yieldActualPct: number; // Rendimento Apurado %
  yieldExpectedPct: number; // Rendimento Padrão Mercado %
  isNonSaleable?: boolean; // Sebo ou Osso
  category: 'NOBRE' | 'DIANTEIRO' | 'TRASEIRO' | 'SUBPRODUTO_OSSO' | 'SUBPRODUTO_SEBO' | 'RECORTE';
}

export interface OperatorStat {
  operatorId: string;
  name: string;
  shift: 'Turno 1' | 'Turno 2' | 'Turno 3';
  station: 'Desossa DT' | 'Desossa TR' | 'Refile/Toalete' | 'Embalagem' | 'Geral';
  kgProcessed: number;
  hoursWorked: number;
  productivityKgPerPerson: number; // kg / pessoa
  qualityScorePct: number; // Precisão de corte / refile
  boneScrapLossKg: number; // Perda residual no osso
}

export interface ProductionRecord {
  id: string;
  date: string; // YYYY-MM-DD
  periodStart: string;
  periodEnd: string;
  companyName: string;
  emissionTime: string;
  type: CutType; // DT or TR
  shift: 'Turno 1' | 'Turno 2' | 'Turno 3';
  responsibleOperator: string;
  operatorCount: number;
  
  // Matéria-prima (Carcaça e Entradas na Linha)
  rawMaterialCode: string;
  rawMaterialDesc: string;
  rawMaterialWeightKg: number;
  rawMaterialBoxes: number;
  rawMaterialAvgWeightKg: number;
  carcassCostPerKg: number; // R$/kg pago pela carcaça
  totalCarcassCost: number; // R$
  
  // Desossa Mista (Entrada de Carcaça com Osso + Carne Já Desossada)
  preDebonedInputKg?: number; // Quantidade de carne que já entrou desossada na linha (kg)
  carcassWithBoneWeightKg?: number; // Carne ainda na carcaça com osso (kg)
  deboningEffectiveMeatKg?: number; // Carne obtida estritamente após separação do osso e sebo (kg)
  hasPreDebonedInput?: boolean; // Flag de desossa mista
  
  // Produto Acabado
  finishedProductWeightKg: number;
  finishedProductBoxes: number;
  finishedProductTotalValue: number; // Valor PA (R$)
  
  // Cortes
  cuts: CutItem[];
  
  // Indicadores Calculados
  lossKg: number; // Quebra (kg) = Matéria Prima - Produto Acabado
  lossPct: number; // Quebra (%)
  
  // Rendimento da Desossa: Peso Total da Carne Vendável / Peso Total da Carcaça
  // (Peso Total da Carcaça = Carnes Vendáveis + Osso + Sebo + Quebra/Perda)
  saleableCutsWeightKg: number; // Cortes Vendáveis (sem osso e sebo)
  nonSaleableWeightKg: number; // Osso + Sebo (kg)
  boneWeightKg: number; // Apenas osso
  fatWeightKg: number; // Apenas sebo
  
  nonSaleablePct: number; // (Osso + Sebo) / Peso Total da Carcaça (%)
  bonePct: number;
  fatPct: number;
  
  deboningYieldNetPct: number; // Rendimento da Desossa (%): Peso Total da Carne Vendável / Peso Total da Carcaça
  totalYieldPct: number; // Produto Acabado / Peso Total da Carcaça (%)
  
  productivityKgPerPerson: number; // Matéria-prima ou Cortes / Nº de pessoas
  
  // Margem de Lucro
  grossProfitValue: number; // Valor PA - Custo Carcaça
  profitMarginPct: number; // (Margem / Valor PA) * 100
  
  notes?: string;
}

export interface MarketBenchmark {
  code: string;
  name: string;
  type: CutType;
  expectedYieldPct: number; // Padrão de mercado %
  standardPricePerKg: number;
  tolerancePct: number; // tolerância aceitável (+/- %)
}

export interface FilterState {
  viewMode: 'daily' | 'period' | 'accumulated';
  date: string; // YYYY-MM-DD
  startDate?: string; // YYYY-MM-DD
  endDate?: string; // YYYY-MM-DD
  month: string; // YYYY-MM
  type: 'ALL' | 'DIANTEIRO' | 'TRASEIRO';
  shift: 'ALL' | 'Turno 1' | 'Turno 2' | 'Turno 3';
  operator: 'ALL' | string;
}
