import { MarketBenchmark, CutType } from '../types';

/**
 * Normaliza nomes de cortes removendo prefixos de embalagem, tags de refrigeração e acentuações.
 */
export function normalizeCutText(text: string): string {
  if (!text) return '';
  return text
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove acentos
    .replace(/^(CXGG|CX|MP|W-MP|X-MP)\s*[-:]\s*/i, '') // remove prefixos de caixas e matérias
    .replace(/\(.*?\)/g, '') // remove parênteses como (DIMEZA), (TOP CARNES), (BOSCATTI)
    .replace(/\b(BOV|BOVINO|BOVINA|RESF|RESFRIADO|RESFRIADA|CONG|CONGELADO|CONGELADA|PCT|PECA|PACOTE)\b/g, '') // remove etiquetas
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Localiza de forma inteligente e resiliente o Padrão de Mercado (Benchmark) para um corte
 * informado no relatório SisAtak ou na base de dados.
 */
export function findBenchmarkForCut(
  cut: { code?: string; name: string; category?: string; yieldExpectedPct?: number },
  benchmarks: MarketBenchmark[],
  preferredType?: CutType
): MarketBenchmark | undefined {
  if (!benchmarks || benchmarks.length === 0) return undefined;

  const cleanCutCode = cut.code ? cut.code.trim().toUpperCase() : '';
  const normCutName = normalizeCutText(cut.name);

  // 1. Busca por Código Exato
  if (cleanCutCode) {
    const codeMatch = benchmarks.find((b) => b.code.trim().toUpperCase() === cleanCutCode);
    if (codeMatch) return codeMatch;
  }

  // 2. Busca por Nome Exato Normalizado
  const exactNameMatch = benchmarks.find((b) => normalizeCutText(b.name) === normCutName);
  if (exactNameMatch) return exactNameMatch;

  // Filtrar candidatos pelo tipo preferido (DIANTEIRO ou TRASEIRO) se informado
  const candidateBenchmarks = preferredType
    ? benchmarks.filter((b) => b.type === preferredType)
    : benchmarks;

  // 3. Subprodutos: Osso e Sebo
  const isBone = /OSSO/i.test(cut.name) || cut.category === 'SUBPRODUTO_OSSO';
  const isFat = /SEBO/i.test(cut.name) || cut.category === 'SUBPRODUTO_SEBO';

  if (isBone) {
    const boneBench = candidateBenchmarks.find((b) => /OSSO/i.test(b.name) || /OSSO/i.test(b.code))
      || benchmarks.find((b) => /OSSO/i.test(b.name));
    if (boneBench) return boneBench;
  }

  if (isFat) {
    const fatBench = candidateBenchmarks.find((b) => /SEBO/i.test(b.name) || /SEBO/i.test(b.code))
      || benchmarks.find((b) => /SEBO/i.test(b.name));
    if (fatBench) return fatBench;
  }

  // 4. Regras Semânticas de Cortes Típicos da Agroindústria Frigorífica
  const rules: { regex: RegExp; matcher: (b: MarketBenchmark) => boolean }[] = [
    // Picanha
    { regex: /PICANHA/i, matcher: (b) => /PICANHA/i.test(b.name) || /PICANHA/i.test(b.code) },
    // Filé Mignon
    { regex: /FILE\s*MIGNON|MIGNON/i, matcher: (b) => /MIGNON/i.test(b.name) || /MIGNON/i.test(b.code) },
    // Contra Filé (Ancho, Noix, Chorizo, Grill)
    { regex: /CONTRA\s*FILE|ANCHO|NOIX|CHORIZO/i, matcher: (b) => /CONTRA/i.test(b.name) || /CONTRA/i.test(b.code) },
    // Alcatra (Completa, Coração, Miolo)
    { regex: /ALCATRA/i, matcher: (b) => /ALCATRA/i.test(b.name) || /ALCATRA/i.test(b.code) },
    // Maminha
    { regex: /MAMINHA/i, matcher: (b) => /MAMINHA/i.test(b.name) || /ALCATRA/i.test(b.name) },
    // Coxão Mole (Chã de Dentro)
    { regex: /COXAO\s*MOLE|CHA\s*DE\s*DENTRO/i, matcher: (b) => /COXAO\s*MOLE/i.test(b.name) || /COXAO_MOLE/i.test(b.code) },
    // Coxão Duro (Chã de Fora)
    { regex: /COXAO\s*DURO|CHA\s*DE\s*FORA/i, matcher: (b) => /COXAO\s*DURO/i.test(b.name) || /COXAO_DURO/i.test(b.code) },
    // Patinho
    { regex: /PATINHO/i, matcher: (b) => /PATINHO/i.test(b.name) || /PATINHO/i.test(b.code) },
    // Lagarto
    { regex: /LAGARTO/i, matcher: (b) => /LAGARTO/i.test(b.name) || /LAGARTO/i.test(b.code) },
    // Fraldinha / Red Grill
    { regex: /FRALDINHA|RED\s*GRILL/i, matcher: (b) => /FRALDINHA/i.test(b.name) || /FRALDINHA/i.test(b.code) },
    // Capa de Filé
    { regex: /CAPA\s*FILE/i, matcher: (b) => /CAPA\s*FILE/i.test(b.name) || /CAPA/i.test(b.code) },
    // Músculo (Traseiro vs Dianteiro)
    {
      regex: /MUSCULO/i,
      matcher: (b) => {
        if (preferredType === 'TRASEIRO' || /TRASEIRO/i.test(cut.name)) {
          return /MUSCULO.*TRASEIRO|MUSCULO_TRASEIRO/i.test(b.name) || /MUSCULO_TRASEIRO/i.test(b.code);
        }
        return /MUSCULO.*DIANTEIRO|01010990051/i.test(b.name) || /01010990051/i.test(b.code) || /MUSCULO/i.test(b.name);
      }
    },
    // Acém
    { regex: /ACEM/i, matcher: (b) => /ACEM/i.test(b.name) || /01010990004/i.test(b.code) },
    // Paleta
    { regex: /PALETA/i, matcher: (b) => /PALETA/i.test(b.name) || /01010990005/i.test(b.code) },
    // Maca Peito
    { regex: /MACA\s*PEITO/i, matcher: (b) => /MACA/i.test(b.name) || /01010990063/i.test(b.code) },
    // Peito Bovino Geral
    { regex: /PEITO/i, matcher: (b) => /PEITO/i.test(b.name) && !/MACA/i.test(b.name) },
    // Recortes / Bananinha / Gordura / Nervo
    { regex: /BANANINHA/i, matcher: (b) => /BANANINHA|RECORTE/i.test(b.name) || /RECORTE/i.test(b.code) },
    {
      regex: /RECORTE|NERVO|GORDURA|DESCARTE|RETALHO/i,
      matcher: (b) => /RECORTE/i.test(b.name) || /RECORTE/i.test(b.code)
    },
  ];

  for (const rule of rules) {
    if (rule.regex.test(normCutName)) {
      const match = candidateBenchmarks.find(rule.matcher) || benchmarks.find(rule.matcher);
      if (match) return match;
    }
  }

  // 5. Fallback por similaridade de substring
  for (const b of candidateBenchmarks) {
    const normB = normalizeCutText(b.name);
    if (normB.length >= 4 && (normCutName.includes(normB) || normB.includes(normCutName))) {
      return b;
    }
  }

  return undefined;
}
