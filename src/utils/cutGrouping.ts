import { CutItem, CutType, ProductionRecord } from '../types';

export interface GroupedYieldItem {
  id: string;
  name: string;
  type: CutType;
  weightKg: number;
  yieldActualPct: number;
  yieldExpectedPct: number;
  deviationPct: number;
  isSubProduct: boolean;
  codeRef?: string;
}

export interface GroupedYieldSummary {
  items: GroupedYieldItem[];
  totalMeatWeightKg: number;
  totalBoneWeightKg: number;
  totalFatWeightKg: number;
  totalSubProductsKg: number;
  totalYieldActualPct: number;
  totalYieldExpectedPct: number;
  rawMaterialWeightKg: number;
}

// Padrões oficiais extraídos do documento técnico do cliente
export const STANDARDS_DIANTEIRO: { name: string; standardPct: number; codeRef?: string }[] = [
  { name: 'Acém', standardPct: 30.00 },
  { name: 'Maçã', standardPct: 11.00 },
  { name: 'Paleta', standardPct: 21.00 },
  { name: 'Músculo', standardPct: 8.00 },
  { name: 'Recorte', standardPct: 7.25 },
  { name: 'Osso', standardPct: 21.50 },
  { name: 'Sebo', standardPct: 0.80 },
];

export const STANDARDS_TRASEIRO: { name: string; standardPct: number; codeRef: string }[] = [
  { name: 'Alcatra', standardPct: 9.12, codeRef: '01010990016' },
  { name: 'Capa Filé', standardPct: 1.68, codeRef: '01010990018' },
  { name: 'Contra Filé', standardPct: 12.79, codeRef: '01010990015' },
  { name: 'Coxão Duro', standardPct: 8.27, codeRef: '01010990012' },
  { name: 'Coxão Mole', standardPct: 14.54, codeRef: '01010990011' },
  { name: 'Filé Mignon', standardPct: 2.94, codeRef: '01010990044' },
  { name: 'Fraldinha', standardPct: 0.98, codeRef: '01010990017' },
  { name: 'Lagarto', standardPct: 3.94, codeRef: '01010990013' },
  { name: 'Músculo', standardPct: 6.28, codeRef: '01010990043' },
  { name: 'Patinho', standardPct: 7.48, codeRef: '01010990014' },
  { name: 'Picanha', standardPct: 2.46, codeRef: '01010990045' },
  { name: 'Recorte', standardPct: 7.22, codeRef: '01010990019' },
  { name: 'Osso', standardPct: 21.00, codeRef: '01010990022' },
  { name: 'Sebo', standardPct: 1.00, codeRef: '01010990023' },
];

export const STANDARDS_SUINO: { name: string; standardPct: number; codeRef?: string }[] = [
  { name: 'Pernil', standardPct: 32.00, codeRef: 'PERNIL_SUINO' },
  { name: 'Paleta', standardPct: 18.50, codeRef: 'PALETA_SUINA' },
  { name: 'Lombo', standardPct: 9.50, codeRef: 'LOMBO_SUINO' },
  { name: 'Costela', standardPct: 7.50, codeRef: 'COSTELA_SUINA' },
  { name: 'Barriga / Panceta', standardPct: 13.00, codeRef: 'BARRIGA_PANCETA' },
  { name: 'Bisteca / Carré', standardPct: 7.50, codeRef: 'BISTECA_CARRE' },
  { name: 'Toucinho / Banha', standardPct: 4.50, codeRef: 'TOUCINHO_SUINO' },
  { name: 'Recorte', standardPct: 4.00, codeRef: 'RECORTE_SUINO' },
  { name: 'Osso', standardPct: 3.50, codeRef: 'OSSO_SUINO' },
];

/**
 * Normaliza o texto para casamento de padrões
 */
function cleanText(txt: string): string {
  if (!txt) return '';
  return txt
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

/**
 * Identifica o grupo padrão do Dianteiro para um corte
 */
export function matchGroupDianteiro(cut: { name: string; code?: string }): string {
  const n = cleanText(cut.name);
  if (/OSSO/i.test(n)) return 'Osso';
  if (/SEBO/i.test(n)) return 'Sebo';
  if (/ACEM/i.test(n)) return 'Acém';
  if (/MACA|PEITO/i.test(n)) return 'Maçã';
  if (/PALETA/i.test(n)) return 'Paleta';
  if (/MUSCULO/i.test(n)) return 'Músculo';
  if (/RECORTE|BANANINHA|GORDURA|NERVO|DESCARTE|RETALHO/i.test(n)) return 'Recorte';
  return 'Recorte';
}

/**
 * Identifica o grupo padrão do Traseiro para um corte
 */
export function matchGroupTraseiro(cut: { name: string; code?: string }): string {
  const n = cleanText(cut.name);
  const code = (cut.code || '').replace(/\D/g, '');

  if (/OSSO/i.test(n) || code.includes('01010990022')) return 'Osso';
  if (/SEBO/i.test(n) || code.includes('01010990023')) return 'Sebo';
  if (/PICANHA/i.test(n) || code.includes('01010990045')) return 'Picanha';
  if (/FILE\s*MIGNON|MIGNON/i.test(n) || code.includes('01010990044')) return 'Filé Mignon';
  if (/CAPA/i.test(n) || code.includes('01010990018')) return 'Capa Filé';
  if (/CONTRA\s*FILE|CHORIZO|ANCHO|NOIX|GRILL/i.test(n) || code.includes('01010990015')) return 'Contra Filé';
  if (/ALCATRA|MAMINHA|CORACAO.*ALCATRA/i.test(n) || code.includes('01010990016')) return 'Alcatra';
  if (/DURO|CHA.*FORA/i.test(n) || code.includes('01010990012')) return 'Coxão Duro';
  if (/MOLE|CHA.*DENTRO/i.test(n) || code.includes('01010990011')) return 'Coxão Mole';
  if (/FRALDINHA|RED\s*GRILL/i.test(n) || code.includes('01010990017')) return 'Fraldinha';
  if (/LAGARTO/i.test(n) || code.includes('01010990013')) return 'Lagarto';
  if (/MUSCULO/i.test(n) || code.includes('01010990043')) return 'Músculo';
  if (/PATINHO/i.test(n) || code.includes('01010990014')) return 'Patinho';
  if (/RECORTE|BANANINHA|GORDURA|NERVO|DESCARTE|RETALHO/i.test(n) || code.includes('01010990019')) return 'Recorte';

  return 'Recorte';
}

/**
 * Identifica o grupo padrão do Suíno para um corte
 */
export function matchGroupSuino(cut: { name: string; code?: string }): string {
  const n = cleanText(cut.name);
  const code = (cut.code || '').replace(/\D/g, '');

  // Subproduto Osso Suíno: exclusivamente X-MP - OSSO SUÍNO (código 02010990005)
  // IMPORTANTE: Produtos como "PERNIL S/OSSO" ou "PALETA S/OSSO" JAMAIS são ossos!
  if (!/S\/\s*OSSO|SEM\s*OSSO/i.test(n)) {
    if (/X-MP.*OSSO/i.test(n) || code.includes('02010990005') || (/OSSO/i.test(n) && !/PERNIL|PALETA|COSTELA|LOMBO|BISTECA|BARRIGA/i.test(n))) {
      return 'Osso';
    }
  }

  if (/PERNIL/i.test(n)) return 'Pernil';
  if (/PALETA/i.test(n)) return 'Paleta';
  if (/LOMBO/i.test(n)) return 'Lombo';
  if (/COSTELA|COSTELINHA/i.test(n)) return 'Costela';
  if (/BARRIGA|PANCETA/i.test(n)) return 'Barriga / Panceta';
  if (/BISTECA|CARRE|CHOP/i.test(n)) return 'Bisteca / Carré';
  if (/TOUCINHO|BANHA|PAPADA|GORDURA/i.test(n)) return 'Toucinho / Banha';
  if (/RECORTE|RETALHO|MOIDA|CARNE INDUSTRIAL|PEZINHO|RABINHO|PELE/i.test(n)) return 'Recorte';

  return 'Recorte';
}

/**
 * Agrupa cortes por tipo e calcula o rendimento apurado vs padrão
 */
export function calculateGroupedYields(
  records: ProductionRecord[],
  targetType: CutType
): GroupedYieldSummary {
  const filtered = records.filter((r) => r.type === targetType);
  const totalMP = filtered.reduce((acc, r) => acc + r.rawMaterialWeightKg, 0);

  const standards = targetType === 'DIANTEIRO'
    ? STANDARDS_DIANTEIRO
    : targetType === 'SUINO'
    ? STANDARDS_SUINO
    : STANDARDS_TRASEIRO;
  const matchFn = targetType === 'DIANTEIRO'
    ? matchGroupDianteiro
    : targetType === 'SUINO'
    ? matchGroupSuino
    : matchGroupTraseiro;

  // Inicializar acumuladores para cada grupo oficial
  const groupWeights: Record<string, number> = {};
  standards.forEach((s) => {
    groupWeights[s.name] = 0;
  });

  filtered.forEach((rec) => {
    rec.cuts.forEach((cut) => {
      const gName = matchFn(cut);
      if (groupWeights[gName] !== undefined) {
        groupWeights[gName] += cut.weightKg;
      } else {
        groupWeights['Recorte'] = (groupWeights['Recorte'] || 0) + cut.weightKg;
      }
    });
  });

  const items: GroupedYieldItem[] = standards.map((std, idx) => {
    const w = groupWeights[std.name] || 0;
    const yieldActualPct = totalMP > 0 ? (w / totalMP) * 100 : 0;
    const deviationPct = yieldActualPct - std.standardPct;
    const isSubProduct = targetType === 'SUINO'
      ? std.name === 'Osso'
      : (std.name === 'Osso' || std.name === 'Sebo');

    return {
      id: `grp_${targetType.toLowerCase()}_${idx}`,
      name: std.name,
      type: targetType,
      weightKg: w,
      yieldActualPct,
      yieldExpectedPct: std.standardPct,
      deviationPct,
      isSubProduct,
      codeRef: 'codeRef' in std ? (std as any).codeRef : undefined,
    };
  });

  const totalBoneWeightKg = groupWeights['Osso'] || 0;
  const totalFatWeightKg = targetType === 'SUINO' ? 0 : (groupWeights['Sebo'] || 0);
  const totalSubProductsKg = totalBoneWeightKg + totalFatWeightKg;
  const totalMeatWeightKg = Object.entries(groupWeights)
    .filter(([k]) => k !== 'Osso' && (targetType === 'SUINO' || k !== 'Sebo'))
    .reduce((acc, [, v]) => acc + v, 0);

  const totalYieldActualPct = items.reduce((acc, i) => acc + i.yieldActualPct, 0);
  const totalYieldExpectedPct = items.reduce((acc, i) => acc + i.yieldExpectedPct, 0);

  return {
    items,
    totalMeatWeightKg,
    totalBoneWeightKg,
    totalFatWeightKg,
    totalSubProductsKg,
    totalYieldActualPct,
    totalYieldExpectedPct,
    rawMaterialWeightKg: totalMP,
  };
}
