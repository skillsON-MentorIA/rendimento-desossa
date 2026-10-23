import { CutItem, ProductionRecord } from '../types';

export interface CalculatedSummary {
  recordCount: number;
  totalRawMaterialKg: number;
  totalFinishedProductKg: number;
  totalSaleableCutsKg: number;
  totalNonSaleableKg: number;
  totalBoneKg: number;
  totalFatKg: number;
  totalLossKg: number;
  avgLossPct: number;
  
  // Desossa Mista (Carcaça c/ Osso vs Carne Já Desossada na Entrada)
  totalPreDebonedInputKg: number; // Quantidade de carne que já entrou desossada na esteira (kg)
  totalDeboningEffectiveMeatKg: number; // Carne obtida estritamente após a separação de osso e sebo da carcaça
  totalCarcassWithBoneKg: number; // Matéria-prima com osso (Carcaça in natura)
  hasAnyPreDebonedInput: boolean; // Flag se há registros com entrada de carne já desossada
  
  totalCarcassWeightKg: number; // Peso Total da Carcaça = Carnes Vendáveis + Osso + Sebo + Quebra
  avgDeboningYieldNetPct: number; // Rendimento da Desossa (%): Carne Desossada Efetiva / Carcaça In Natura c/ Osso
  avgSaleableYieldOnCarcassPct: number; // Cortes / MP total
  avgTotalYieldPct: number; // PA total / MP total
  avgNonSaleablePct: number; // (Osso + Sebo) / MP
  avgBonePct: number;
  avgFatPct: number;
  
  totalOperatorCount: number;
  avgProductivityKgPerPerson: number;
  
  totalCarcassCostValue: number; // R$
  totalFinishedValue: number; // Valor PA (R$)
  totalGrossProfitValue: number; // R$
  avgProfitMarginPct: number; // %
}

/**
 * Consolidação Efetiva da Equipe Diária de Produção (Regra Operacional da Fábrica):
 * - A fábrica possui estritamente 2 linhas físicas de desossa (máximo de 2 linhas simultâneas).
 * - Uma linha é normalmente liderada pelo PEU e a outra linha pelo VINICIUS.
 * - Em dias com 3, 4 ou mais desossas na mesma data, a mesma linha finaliza um tipo de carne
 *   e inicia outro tipo (turnover de matéria-prima na mesma esteira).
 * - Logo, os trabalhadores daquela linha NÃO devem ser somados novamente em duplicidade.
 * - Consolida pelo nome do Líder (PEU vs VINICIUS vs outros) tomando o MÁXIMO de pessoas por linha.
 * - Se houver mais de 2 linhas/líderes apontados na mesma data, toma a soma das 2 maiores linhas.
 */
export function calculateEffectiveDailyWorkforce(dayRecords: ProductionRecord[]): number {
  if (!dayRecords || dayRecords.length === 0) return 0;

  if (dayRecords.length === 1) {
    return dayRecords[0].operatorCount || 20;
  }

  const lineWorkforce: Record<string, number> = {};

  dayRecords.forEach((r, idx) => {
    const leaderUpper = (r.responsibleOperator || '').toUpperCase();
    const count = r.operatorCount > 0 ? r.operatorCount : 20;

    let lineKey: string;
    if (leaderUpper.includes('PEU')) {
      lineKey = 'LINHA_PEU';
    } else if (leaderUpper.includes('VINICIUS') || leaderUpper.includes('VINÍCIUS')) {
      lineKey = 'LINHA_VINICIUS';
    } else if (leaderUpper.trim()) {
      lineKey = `LIDER_${leaderUpper.trim()}`;
    } else {
      lineKey = `LINHA_${(idx % 2) + 1}`;
    }

    lineWorkforce[lineKey] = Math.max(lineWorkforce[lineKey] || 0, count);
  });

  const lineCounts = Object.values(lineWorkforce);

  // A fábrica possui no máximo 2 linhas físicas de produção
  if (lineCounts.length <= 2) {
    return lineCounts.reduce((a, b) => a + b, 0);
  }

  // Se mais de 2 grupos foram criados no mesmo dia, soma as 2 maiores linhas
  lineCounts.sort((a, b) => b - a);
  return lineCounts[0] + lineCounts[1];
}

/**
 * Consolidação do efetivo total (pessoas-dia) em um conjunto de registros (diário ou acumulado por período).
 */
export function calculateEffectiveTotalWorkforce(records: ProductionRecord[]): number {
  if (!records || records.length === 0) return 0;

  // Agrupar por data
  const byDate: Record<string, ProductionRecord[]> = {};
  for (const r of records) {
    const d = r.date || 'unknown';
    if (!byDate[d]) byDate[d] = [];
    byDate[d].push(r);
  }

  let totalPersonDays = 0;
  for (const date in byDate) {
    totalPersonDays += calculateEffectiveDailyWorkforce(byDate[date]);
  }

  return totalPersonDays;
}

export function calculateSummary(records: ProductionRecord[]): CalculatedSummary {
  if (!records || records.length === 0) {
    return {
      recordCount: 0,
      totalRawMaterialKg: 0,
      totalFinishedProductKg: 0,
      totalSaleableCutsKg: 0,
      totalNonSaleableKg: 0,
      totalBoneKg: 0,
      totalFatKg: 0,
      totalLossKg: 0,
      avgLossPct: 0,
      totalPreDebonedInputKg: 0,
      totalDeboningEffectiveMeatKg: 0,
      totalCarcassWithBoneKg: 0,
      hasAnyPreDebonedInput: false,
      totalCarcassWeightKg: 0,
      avgDeboningYieldNetPct: 0,
      avgSaleableYieldOnCarcassPct: 0,
      avgTotalYieldPct: 0,
      avgNonSaleablePct: 0,
      avgBonePct: 0,
      avgFatPct: 0,
      totalOperatorCount: 0,
      avgProductivityKgPerPerson: 0,
      totalCarcassCostValue: 0,
      totalFinishedValue: 0,
      totalGrossProfitValue: 0,
      avgProfitMarginPct: 0,
    };
  }

  const recordCount = records.length;
  const totalRawMaterialKg = records.reduce((acc, r) => acc + r.rawMaterialWeightKg, 0);
  const totalFinishedProductKg = records.reduce((acc, r) => acc + r.finishedProductWeightKg, 0);
  const totalSaleableCutsKg = records.reduce((acc, r) => acc + r.saleableCutsWeightKg, 0);
  const totalNonSaleableKg = records.reduce((acc, r) => acc + r.nonSaleableWeightKg, 0);
  const totalBoneKg = records.reduce((acc, r) => acc + r.boneWeightKg, 0);
  const totalFatKg = records.reduce((acc, r) => acc + r.fatWeightKg, 0);
  const totalLossKg = records.reduce((acc, r) => acc + r.lossKg, 0);
  
  // Detecção e consolidação de Carne que já entrou Desossada na Linha
  const totalPreDebonedInputKg = records.reduce((acc, r) => acc + (r.preDebonedInputKg || 0), 0);
  const hasAnyPreDebonedInput = totalPreDebonedInputKg > 0;

  const totalCarcassCostValue = records.reduce((acc, r) => acc + r.totalCarcassCost, 0);
  const totalFinishedValue = records.reduce((acc, r) => {
    const cutsSum = r.cuts && r.cuts.length > 0 ? r.cuts.reduce((a, b) => a + b.totalPrice, 0) : 0;
    return acc + (cutsSum > 0 ? cutsSum : r.finishedProductTotalValue);
  }, 0);
  const totalGrossProfitValue = totalFinishedValue - totalCarcassCostValue;

  // Cálculo consolidado de operadores respeitando o limite físico de 2 linhas da fábrica
  // e agrupando por líderes (Peu e Vinicius) para evitar duplicidades
  const totalOperatorCount = calculateEffectiveTotalWorkforce(records);

  const avgLossPct = totalRawMaterialKg > 0 ? (totalLossKg / totalRawMaterialKg) * 100 : 0;
  const avgTotalYieldPct = totalRawMaterialKg > 0 ? (totalFinishedProductKg / totalRawMaterialKg) * 100 : 0;
  const avgNonSaleablePct = totalRawMaterialKg > 0 ? (totalNonSaleableKg / totalRawMaterialKg) * 100 : 0;
  const avgBonePct = totalRawMaterialKg > 0 ? (totalBoneKg / totalRawMaterialKg) * 100 : 0;
  const avgFatPct = totalRawMaterialKg > 0 ? (totalFatKg / totalRawMaterialKg) * 100 : 0;
  
  // Peso Total da Carcaça = soma do peso total das carnes vendáveis + peso do osso + peso sebo + peso da perda (quebra)
  const calculatedCarcassTotal = (totalSaleableCutsKg + totalBoneKg + totalFatKg + totalLossKg);
  const totalCarcassWeightKg = calculatedCarcassTotal > 0 ? calculatedCarcassTotal : totalRawMaterialKg;

  // PARTICULARIDADE OPERACIONAL DO FRIGORÍFICO:
  // Se entrou carne já desossada na linha, para calcular o RENDIMENTO DA DESOSSA
  // (que considera o total de carne obtida após a separação de osso e sebo),
  // subtrai-se a carne já desossada tanto das carnes vendáveis quanto da base com osso da carcaça.
  const totalDeboningEffectiveMeatKg = Math.max(0, totalSaleableCutsKg - totalPreDebonedInputKg);
  const totalCarcassWithBoneKg = Math.max(0, totalCarcassWeightKg - totalPreDebonedInputKg);

  // Rendimento da Desossa Líquido da Carcaça
  const avgDeboningYieldNetPct = totalCarcassWithBoneKg > 0
    ? (totalDeboningEffectiveMeatKg / totalCarcassWithBoneKg) * 100
    : 0;

  const avgSaleableYieldOnCarcassPct = totalCarcassWeightKg > 0 ? (totalSaleableCutsKg / totalCarcassWeightKg) * 100 : 0;
  
  const avgProductivityKgPerPerson = totalOperatorCount > 0 ? totalRawMaterialKg / totalOperatorCount : 0;
  const avgProfitMarginPct = totalFinishedValue > 0 ? (totalGrossProfitValue / totalFinishedValue) * 100 : 0;

  return {
    recordCount,
    totalRawMaterialKg,
    totalFinishedProductKg,
    totalSaleableCutsKg,
    totalNonSaleableKg,
    totalBoneKg,
    totalFatKg,
    totalLossKg,
    avgLossPct,
    totalPreDebonedInputKg,
    totalDeboningEffectiveMeatKg,
    totalCarcassWithBoneKg,
    hasAnyPreDebonedInput,
    totalCarcassWeightKg,
    avgDeboningYieldNetPct,
    avgSaleableYieldOnCarcassPct,
    avgTotalYieldPct,
    avgNonSaleablePct,
    avgBonePct,
    avgFatPct,
    totalOperatorCount,
    avgProductivityKgPerPerson,
    totalCarcassCostValue,
    totalFinishedValue,
    totalGrossProfitValue,
    avgProfitMarginPct,
  };
}

export function formatKg(val: number, decimals: number = 1): string {
  if (val === undefined || isNaN(val)) return '0,0';
  return val.toLocaleString('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }) + ' kg';
}

export function formatWeightNum(val: number, decimals: number = 3): string {
  if (val === undefined || isNaN(val)) return '0,000';
  return val.toLocaleString('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function formatPct(val: number, decimals: number = 2): string {
  if (val === undefined || isNaN(val)) return '0,00%';
  return val.toLocaleString('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }) + '%';
}

export function formatCurrency(val: number): string {
  if (val === undefined || isNaN(val)) return 'R$ 0,00';
  return val.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

/**
 * Retorna a nomenclatura correta da unidade de matéria-prima:
 * - Carne Bovina (DT, TR, COSTELA): "PEÇA" / "PEÇAS"
 * - Carne Suína (SUINO): "CARCAÇA" / "CARCAÇAS"
 */
export function getUnitNoun(
  type?: string,
  count: number = 1,
  uppercase: boolean = false
): string {
  const isSuino = type === 'SUINO' || (typeof type === 'string' && /SU[IÍ]NO/i.test(type));
  if (isSuino) {
    if (uppercase) return count === 1 ? 'CARCAÇA' : 'CARCAÇAS';
    return count === 1 ? 'Carcaça' : 'Carcaças';
  }
  // Bovina: DT, TR, COSTELA
  if (uppercase) return count === 1 ? 'PEÇA' : 'PEÇAS';
  return count === 1 ? 'Peça' : 'Peças';
}

/**
 * Retorna o título singular da matéria-prima:
 * - Bovina: "Peça" / "PEÇA"
 * - Suína: "Carcaça" / "CARCAÇA"
 */
export function getRawMaterialUnitTitle(
  type?: string,
  uppercase: boolean = false
): string {
  const isSuino = type === 'SUINO' || (typeof type === 'string' && /SU[IÍ]NO/i.test(type));
  if (isSuino) {
    return uppercase ? 'CARCAÇA' : 'Carcaça';
  }
  return uppercase ? 'PEÇA' : 'Peça';
}

/**
 * Higieniza o nome descritivo da matéria-prima vindo do relatório SisAtak RETQ010.
 * Remove códigos de produto iniciais (ex: "1110002-0 "), dígitos soltos remanescentes (ex: "0 "),
 * e trunca todas as colunas numéricas de dados (pesos, caixas, médias, valores unitários e R$)
 * que aparecem após o nome da matéria-prima no cabeçalho do SisAtak.
 * Preserva nomes legítimos que iniciam com fração como "1/2 CARCAÇA SUÍNA MATRIZ".
 */
export function cleanRawMaterialName(rawDesc?: string): string {
  if (!rawDesc) return '';
  let cleaned = rawDesc.trim();

  // 1. Remover cabeçalhos de tabela capturados por equívoco
  cleaned = cleaned.replace(/^PRODUTO\s*\/Ref\s+Descri[çc][ãa]o\s+Produto.*/i, '');
  cleaned = cleaned.replace(/^PRODUTO\s*:\s*/i, '');
  cleaned = cleaned.replace(/^MP\s*-\s*/i, '');

  // 2. Remover código de produto do SisAtak no início (ex: "1110002-0 ", "1110001-0 - ")
  // Garante que não apague "1/2" porque exige pelo menos 4 dígitos
  cleaned = cleaned.replace(/^\d{4,12}(?:-\w+)?\s*(?:-\s*)?/, '');

  // 3. Remover dígito numérico isolado remanescente no início (ex: "0 DIANTEIRO BOVINO..." do print do usuário)
  cleaned = cleaned.replace(/^\d\s+(?=[A-Za-zÀ-ÿ])/i, '');

  // 4. Truncar a partir da primeira coluna numérica do SisAtak (peso kg, caixas cx, médias, valores em R$)
  // Exemplo: "DIANTEIRO BOVINO C/ OSSO 11.801,600KG 263,000CX 44,873KG 20,00 236.032,00 R$"
  cleaned = cleaned.replace(/\s+\d{1,3}(?:\.\d{3})*,\d{2,3}\s*(?:KG|CX|UN|R\$)?.*$/i, '');
  cleaned = cleaned.replace(/\s+\d+,\d{2,3}\s*(?:KG|CX|UN|R\$)?.*$/i, '');

  // 5. Remover qualquer sufixo residual de unidade ou moeda
  cleaned = cleaned.replace(/\s+(?:KG|CX|UN|R\$)$/i, '');

  return cleaned.trim().toUpperCase();
}


