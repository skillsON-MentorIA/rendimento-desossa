import { CutItem, CutType, ProductionRecord } from '../types';

export interface ParseOptions {
  shift?: 'Turno 1' | 'Turno 2' | 'Turno 3';
  operatorCount?: number;
  responsibleOperator?: string;
  carcassCostPerKg?: number;
  customDate?: string;
  type?: CutType;
  preDebonedInputKg?: number; // Quantidade de carne que já entrou desossada na linha (kg)
}

/**
 * Robust parser for Brazilian decimal numbers (e.g. "16.124,400", "448.200,04", "228,705", "1,4184")
 */
export function parseBrNumber(valStr: string | number | undefined | null): number {
  if (typeof valStr === 'number') return isNaN(valStr) ? 0 : valStr;
  if (!valStr) return 0;

  // Clean currency, units, spaces
  const cleaned = valStr.toString().trim().replace(/[R\$\s%KGkXcx]/gi, '');
  if (!cleaned) return 0;

  if (cleaned.includes(',') && cleaned.includes('.')) {
    // Standard Brazilian format: 16.124,400 -> 16124.400
    return parseFloat(cleaned.replace(/\./g, '').replace(',', '.')) || 0;
  }
  if (cleaned.includes(',')) {
    // Comma decimal: 228,705 -> 228.705
    return parseFloat(cleaned.replace(',', '.')) || 0;
  }
  // Single dot or integer: 16124.400
  return parseFloat(cleaned) || 0;
}

/**
 * Parses SisAtak RETQ010 reports (from text, PDF extraction, or spreadsheet).
 */
export function parseSisAtakReport(
  rawText: string,
  extraParams: ParseOptions = {}
): ProductionRecord {
  const lines = rawText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

  // 1. Detect Cut Type (TRASEIRO vs DIANTEIRO vs SUINO)
  let type: CutType = 'TRASEIRO';
  if (extraParams.type) {
    type = extraParams.type;
  } else {
    const suinoHits = (rawText.match(/SU[IÍ]NO|DS\s*-\s*SU[IÍ]NO|1110003|Total:\s*DS|CARCA[ÇC]A\s+SU[IÍ]NA|PERNIL|PALETA\s+SU|LOMBO|BISTECA|PANCETA|COSTELINHA/gi) || []).length;
    const dianteiroHits = (rawText.match(/DIANTEIRO|DT\s*-\s*DIANTEIRO|1110002|Total:\s*DT/gi) || []).length;
    const traseiroHits = (rawText.match(/TRASEIRO|TR\s*-\s*TRASEIRO|1110001|Total:\s*TR/gi) || []).length;
    if (suinoHits > dianteiroHits && suinoHits > traseiroHits) {
      type = 'SUINO';
    } else if (dianteiroHits > traseiroHits) {
      type = 'DIANTEIRO';
    } else {
      type = 'TRASEIRO';
    }
  }
  const isTraseiro = type === 'TRASEIRO';
  const isSuino = type === 'SUINO';

  // 2. Detect Dates & Header
  // Conforme requisito: O campo correto onde a DATA deve ser coletada é no final do relatório do ATAK onde aparece com o nome PERÍODO:
  // Exemplo: "Período: 25/08/2026   a  25/08/2026"
  let date = '';
  let periodStart = '';
  let periodEnd = '';

  const periodMatch = rawText.match(/Per[íi]odo:\s*(\d{2})\/(\d{2})\/(\d{4})(?:\s*(?:a|-|at[ée])\s*(\d{2})\/(\d{2})\/(\d{4}))?/i);
  if (periodMatch) {
    const d1 = periodMatch[1];
    const m1 = periodMatch[2];
    const y1 = periodMatch[3];
    const d2 = periodMatch[4] || d1;
    const m2 = periodMatch[5] || m1;
    const y2 = periodMatch[6] || y1;
    periodStart = `${y1}-${m1}-${d1}`;
    periodEnd = `${y2}-${m2}-${d2}`;
    date = periodStart; // Prioridade máxima: data da produção no PERÍODO do relatório ATAK
  }

  // Se não foi identificado campo Período no documento, usar customDate ou data de emissão
  if (!date && extraParams.customDate) {
    date = extraParams.customDate;
    periodStart = date;
    periodEnd = date;
  }

  if (!date) {
    const dateMatch = rawText.match(/Emiss[ãa]o:\s*(\d{2})\/(\d{2})\/(\d{4})/i) ||
                      rawText.match(/(\d{2})\/(\d{2})\/(\d{4})/);
    if (dateMatch) {
      const [, d, m, y] = dateMatch;
      date = `${y}-${m}-${d}`;
      if (!periodStart) periodStart = date;
      if (!periodEnd) periodEnd = date;
    } else {
      date = new Date().toISOString().split('T')[0];
      periodStart = date;
      periodEnd = date;
    }
  }

  // Emission line
  let emissionTime = 'Hoje';
  const emissMatch = rawText.match(/Emiss[ãa]o:\s*([^\n\r]+)/i);
  if (emissMatch) {
    emissionTime = emissMatch[1].trim();
  }

  // Company Name
  let companyName = 'BH FOODS COMERCIO E INDUSTRIA LTDA';
  const compMatch = rawText.match(/SisAtak[^\n\r]*?\s{2,}([A-Z0-9\.\s\-]+(?:LTDA|S\/A|ME|EPP|EIRELI))/i);
  if (compMatch) {
    companyName = compMatch[1].trim();
  }

  // 3. Extract Summary / Totals from Report (TOTALIZAÇÃO, RESUMO, Total: TR/DT, QUEBRA)
  let mpFromSummary = 0;
  let paFromSummary = 0;
  let paBoxesFromSummary = 0;
  let valorPaFromSummary = 0;
  let lossKgFromReport = 0;
  let lossPctFromReport = 0;

  // Pattern: TOTALIZAÇÃO: 16.124,400 15.895,695 98,58 % 0,00 448.200,04 448.200,04
  const totalizacaoMatch = rawText.match(/TOTALIZA[ÇC][ÃA]O:\s*([^\n\r]+)/i);
  if (totalizacaoMatch) {
    const nums = [...totalizacaoMatch[1].matchAll(/(\d{1,3}(?:\.\d{3})*,\d{2,4})/g)].map((x) => parseBrNumber(x[1]));
    if (nums.length >= 2) {
      mpFromSummary = nums[0];
      paFromSummary = nums[1];
    }
    // Search for Valor PA in the line: usually the largest number or the 5th number
    if (nums.length >= 5 && nums[4] > 0) {
      valorPaFromSummary = nums[4];
    }
  }

  // Pattern: (TR - TRASEIRO | DT - DIANTEIRO | DS - SUÍNO | SU - SUÍNO) 16.124,400 15.895,695 98,58 % 0,00 448.200,04
  const resumoGrupoMatch = rawText.match(/(?:TR|DT|DS|SU)\s*-\s*(?:TRASEIRO|DIANTEIRO|SU[IÍ]NO)\s+([^\n\r]+)/i);
  if (resumoGrupoMatch) {
    const nums = [...resumoGrupoMatch[1].matchAll(/(\d{1,3}(?:\.\d{3})*,\d{2,4})/g)].map((x) => parseBrNumber(x[1]));
    if (nums.length >= 2) {
      if (mpFromSummary === 0) mpFromSummary = nums[0];
      if (paFromSummary === 0) paFromSummary = nums[1];
    }
    if (nums.length >= 5 && nums[4] > 0 && valorPaFromSummary === 0) {
      valorPaFromSummary = nums[4];
    }
  }

  // Pattern: Total: TR / DT / DS / SU 15.895,695 493,000 98,58 % 28,20 448.200,04
  const totalCutsRowMatch = rawText.match(/Total:\s*(?:TR|DT|DS|SU)\s+([^\n\r]+)/i);
  if (totalCutsRowMatch) {
    const nums = [...totalCutsRowMatch[1].matchAll(/(\d{1,3}(?:\.\d{3})*,\d{2,4})/g)].map((x) => parseBrNumber(x[1]));
    if (nums.length >= 2) {
      if (paFromSummary === 0) paFromSummary = nums[0];
      paBoxesFromSummary = Math.round(nums[1]);
    }
    if (nums.length >= 5 && nums[4] > 0 && valorPaFromSummary === 0) {
      valorPaFromSummary = nums[4];
    }
  }

  // Pattern: QUEBRA: 228,705 1,4184 %
  const quebraMatch = rawText.match(/QUEBRA:\s*(\d{1,3}(?:\.\d{3})*,\d{2,4})(?:KG)?(?:\s*.*?(\d{1,3}(?:,\d+)?)\s*%)?/i);
  if (quebraMatch) {
    lossKgFromReport = parseBrNumber(quebraMatch[1]);
    if (quebraMatch[2]) {
      lossPctFromReport = parseBrNumber(quebraMatch[2]);
    }
  }

  // 4. Raw Material Line in Table
  let rawMaterialWeightKg = mpFromSummary;
  let rawMaterialBoxes = 0;
  let rawMaterialCode = isSuino ? '2110001-0' : isTraseiro ? '1110001-0' : '1110002-0';
  let rawMaterialDesc = isSuino ? 'CARCAÇA SUÍNA C/ OSSO' : isTraseiro ? 'TRASEIRO BOVINO C/ OSSO' : 'DIANTEIRO BOVINO C/ OSSO';
  let detectedPreDebonedKg = 0;
  const hasPaHeader = /PRODUTO\s+ACABADO/i.test(rawText);

  let inRawMaterialSection = false;
  for (const line of lines) {
    if (/MAT[ÉE]RIA.PRIMA|ENTRADA\s+DE\s+CARCA[ÇC]A/i.test(line)) {
      inRawMaterialSection = true;
      continue;
    }
    if (/PRODUTO\s+ACABADO/i.test(line)) {
      inRawMaterialSection = false;
    }

    // Detecção de carnes que já entraram desossadas no cabeçalho/matéria-prima (apenas se estiver dentro da seção de matéria-prima)
    if (inRawMaterialSection) {
      const isPreDebonedText = /S\/\s*OSSO|SEM\s*OSSO|DESOSSAD|DESOSSADO|CARNE\s+DESOSSADA/i.test(line);
      const isBoneIn = /C\/\s*OSSO|COM\s*OSSO|BOVINO\s+C\/|SU[IÍ]NO\s+C\/|1\/2\s*CARCACA/i.test(line);
      if (isPreDebonedText && !isBoneIn) {
        const matchKg = line.match(/(\d{1,3}(?:\.\d{3})*,\d{3})\s*KG/i);
        if (matchKg) {
          detectedPreDebonedKg += parseBrNumber(matchKg[1]);
        }
      }
    }

    if (/BOVINO C\/\s*OSSO|CARCA[ÇC]A\s+SU[IÍ]NA|1\/2\s*CARCACA\s+SUINA|SU[IÍ]NO\s+C\/\s*OSSO/i.test(line) || /MAT[ÉE]RIA.PRIMA/i.test(line) || /111000[123]|211000[123]/i.test(line)) {
      const matchKg = line.match(/(\d{1,3}(?:\.\d{3})*,\d{3})\s*KG/i);
      const matchCx = line.match(/(\d{1,3}(?:\.\d{3})*,\d{3})\s*CX/i);
      if (matchKg && rawMaterialWeightKg === 0) {
        rawMaterialWeightKg = parseBrNumber(matchKg[1]);
      }
      if (matchCx) {
        rawMaterialBoxes = Math.round(parseBrNumber(matchCx[1]));
      }
      const codeM = line.match(/(\d{5,11}(?:-\d)?)/);
      if (codeM) rawMaterialCode = codeM[1];
      if (/1\/2\s*CARCACA\s+SUINA\s+MATRIZ/i.test(line)) {
        rawMaterialDesc = '1/2 CARCAÇA SUÍNA MATRIZ';
      } else if (/1\/2\s*CARCACA\s+SUINA/i.test(line)) {
        rawMaterialDesc = '1/2 CARCAÇA SUÍNA';
      }
    }

    if (/Total Mat[ée]ria Prima\s*:/i.test(line) || /Total Grupo:\s*(?:TR|DT|DS|SU)/i.test(line)) {
      const nums = [...line.matchAll(/(\d{1,3}(?:\.\d{3})*,\d{2,3})/g)].map((x) => parseBrNumber(x[1]));
      if (nums.length >= 1 && rawMaterialWeightKg === 0) {
        rawMaterialWeightKg = nums[0];
      }
      if (nums.length >= 2 && rawMaterialBoxes === 0) {
        rawMaterialBoxes = Math.round(nums[1]);
      }
    }
  }

  const rawMaterialAvgWeightKg = rawMaterialBoxes > 0 ? rawMaterialWeightKg / rawMaterialBoxes : 0;

  // 5. Individual Cuts Extraction
  const cuts: CutItem[] = [];
  let cutIdCounter = 1;
  let inProdutoAcabado = !hasPaHeader; // If no header, fallback to true but skip raw materials

  for (const line of lines) {
    if (/PRODUTO\s+ACABADO/i.test(line)) {
      inProdutoAcabado = true;
      continue;
    }
    if (/^Total:\s*(?:TR|DT|DS|SU)/i.test(line) || /^RESUMO/i.test(line) || /^TOTALIZA[ÇC][ÃA]O/i.test(line) || /Filtros\s+Utilizados/i.test(line)) {
      inProdutoAcabado = false;
      continue;
    }

    if (!inProdutoAcabado) continue;

    if (!line || /^Produto\/Ref/i.test(line) || /^GRUPO/i.test(line) || /^====================/i.test(line) || /^--------------------/i.test(line)) {
      continue;
    }

    // Match cut line starting with a product code
    const codeMatch = line.match(/^(\d{5,12}(?:-\d)?)\s+(.+)$/);
    if (!codeMatch) continue;

    const code = codeMatch[1];
    const rest = codeMatch[2];

    // Explicitly prevent raw material from being recorded as a finished cut
    if (code === rawMaterialCode || /BOVINO C\/\s*OSSO|CARCA[ÇC]A\s+SU[IÍ]NA|1\/2\s*CARCACA\s+SUINA|SU[IÍ]NO\s+C\/\s*OSSO/i.test(rest) || /MAT[ÉE]RIA.PRIMA/i.test(rest)) {
      continue;
    }

    // Check if line contains weight & boxes: e.g. "CXGG - ALCATRA ... 440,320 KG 16,000 CX ... 39,00 17.172,48 R$"
    const cutMatch = rest.match(/^(.*?)\s+(\d{1,3}(?:\.\d{3})*,\d{3})\s*(?:KG)?\s+(\d{1,3}(?:\.\d{3})*,\d{3})\s*(?:CX)?(.*)$/i);
    if (cutMatch) {
      const name = cutMatch[1].trim();
      const weightKg = parseBrNumber(cutMatch[2]);
      const boxesCount = Math.round(parseBrNumber(cutMatch[3]));
      const tail = cutMatch[4];

      // Extract percentages
      const pcts = [...tail.matchAll(/(\d{1,3}(?:,\d+)?)\s*%/g)].map((x) => parseBrNumber(x[1]));
      const yieldActualPct = pcts.length > 0 ? pcts[0] : (rawMaterialWeightKg > 0 ? (weightKg / rawMaterialWeightKg) * 100 : 0);
      const yieldExpectedPct = pcts.length > 1 ? pcts[1] : 0;

      // Extract prices (unit and total)
      const prices = [...tail.matchAll(/(\d{1,3}(?:\.\d{3})*,\d{2})/g)].map((x) => parseBrNumber(x[1]));
      let unitPrice = 0;
      let totalPrice = 0;
      if (prices.length >= 2) {
        unitPrice = prices[prices.length - 2];
        totalPrice = prices[prices.length - 1];
      } else if (prices.length === 1) {
        totalPrice = prices[0];
        unitPrice = weightKg > 0 ? totalPrice / weightKg : 0;
      }

      // REGRA OFICIAL DE IDENTIFICAÇÃO DE OSSO E SUBPRODUTOS:
      // Atenção: Produtos com "S/OSSO" ou "S/ OSSO" ou "SEM OSSO" (como PERNIL S/OSSO, PALETA S/OSSO)
      // NUNCA são subprodutos osso - são carnes vendáveis nobres de alto valor!
      const isSemOsso = /S\/\s*OSSO|SEM\s*OSSO/i.test(name);

      let isBone = false;
      let isFat = false;

      if (type === 'SUINO') {
        // Conforme instrução expressa do cliente:
        // Considere como OSSO exclusivamente o subproduto com código/descrição X-MP - OSSO SUÍNO (ex: 02010990005-0)
        isBone = !isSemOsso && (/X-MP.*OSSO/i.test(name) || /X-MP.*OSSO/i.test(line) || code.includes('02010990005') || (/OSSO/i.test(name) && /X-MP/i.test(name)));
        // Em suínos, toucinho e gorduras de rama são itens comerciais vendidos com preço de PA
        isFat = false;
      } else {
        // Bovino (DT/TR): osso subproduto descartável (desde que não seja carne S/OSSO)
        isBone = !isSemOsso && (/OSSO/i.test(name) || code.includes('01010990022'));
        isFat = /SEBO/i.test(name) || code.includes('01010990023');
      }

      const isNonSaleable = isBone || isFat;

      let category: CutItem['category'] = 'RECORTE';
      if (isBone) category = 'SUBPRODUTO_OSSO';
      else if (isFat) category = 'SUBPRODUTO_SEBO';
      else if (type === 'SUINO') {
        if (/RECORTE|RETALHO|MOIDA|CARNE\s+INDUSTRIAL|PEZINHO|RABINHO|PELE/i.test(name)) category = 'RECORTE';
        else category = 'SUINO';
      }
      else if (/PICANHA|FIL[ÉE]\s*MIGNON|CONTRA\s*FIL[ÉE]|ALCATRA|CORA[ÇC][ÃA]O|MAMINHA/i.test(name)) category = 'NOBRE';
      else if (/RECORTE|BANANINHA|NERVO|DESCARTE|MO[ÍI]DA/i.test(name)) category = 'RECORTE';
      else if (type === 'DIANTEIRO') category = 'DIANTEIRO';
      else category = 'TRASEIRO';

      cuts.push({
        id: `parsed_cut_${cutIdCounter++}`,
        code,
        name,
        weightKg,
        boxesCount,
        unitPrice,
        totalPrice,
        yieldActualPct,
        yieldExpectedPct,
        isNonSaleable,
        category,
      });
    }
  }

  // 6. Finished Product Totals Consolidation
  const cutsTotalWeight = cuts.reduce((a, b) => a + b.weightKg, 0);
  const cutsTotalBoxes = cuts.reduce((a, b) => a + b.boxesCount, 0);
  const cutsTotalValue = cuts.reduce((a, b) => a + b.totalPrice, 0);

  let finishedProductWeightKg = 0;
  if (cutsTotalWeight > 0) {
    finishedProductWeightKg = cutsTotalWeight;
  } else if (paFromSummary > 0) {
    finishedProductWeightKg = paFromSummary;
  }

  let finishedProductBoxes = cutsTotalBoxes > 0 ? cutsTotalBoxes : paBoxesFromSummary;

  let finishedProductTotalValue = 0;
  if (cutsTotalValue > 0) {
    finishedProductTotalValue = cutsTotalValue;
  } else if (valorPaFromSummary > 0) {
    finishedProductTotalValue = valorPaFromSummary;
  }

  // 7. Loss (Quebra) Calculation
  let lossKg = 0;
  let lossPct = 0;

  if (lossKgFromReport > 0) {
    lossKg = lossKgFromReport;
    lossPct = lossPctFromReport > 0
      ? lossPctFromReport
      : (rawMaterialWeightKg > 0 ? (lossKg / rawMaterialWeightKg) * 100 : 0);
  } else if (rawMaterialWeightKg > 0 && finishedProductWeightKg > 0) {
    lossKg = Math.max(0, rawMaterialWeightKg - finishedProductWeightKg);
    lossPct = (lossKg / rawMaterialWeightKg) * 100;
  }

  // 8. Subproducts (Osso e Sebo) and Saleable Cuts
  const boneCuts = cuts.filter((c) => c.category === 'SUBPRODUTO_OSSO');
  const fatCuts = cuts.filter((c) => c.category === 'SUBPRODUTO_SEBO');

  let boneWeightKg = boneCuts.reduce((a, b) => a + b.weightKg, 0);
  let fatWeightKg = fatCuts.reduce((a, b) => a + b.weightKg, 0);

  // If cuts were not present in report (e.g. only summary was uploaded)
  // use industry standard proportions for display until full cuts are provided
  if (cuts.length === 0 && rawMaterialWeightKg > 0) {
    boneWeightKg = isSuino
      ? rawMaterialWeightKg * 0.0350
      : isTraseiro
      ? rawMaterialWeightKg * 0.2055
      : rawMaterialWeightKg * 0.2116;
    fatWeightKg = isSuino
      ? rawMaterialWeightKg * 0.0450
      : isTraseiro
      ? rawMaterialWeightKg * 0.0220
      : rawMaterialWeightKg * 0.0081;
  }

  const nonSaleableWeightKg = boneWeightKg + fatWeightKg;
  const nonSaleablePct = rawMaterialWeightKg > 0 ? (nonSaleableWeightKg / rawMaterialWeightKg) * 100 : 0;
  const bonePct = rawMaterialWeightKg > 0 ? (boneWeightKg / rawMaterialWeightKg) * 100 : 0;
  const fatPct = rawMaterialWeightKg > 0 ? (fatWeightKg / rawMaterialWeightKg) * 100 : 0;

  const saleableCutsWeightKg = Math.max(0, finishedProductWeightKg - nonSaleableWeightKg);

  // Peso Total da Carcaça = Carnes Vendáveis + Osso + Sebo + Quebra
  const calculatedCarcass = saleableCutsWeightKg + boneWeightKg + fatWeightKg + lossKg;
  const totalCarcassWeightKg = calculatedCarcass > 0 ? calculatedCarcass : rawMaterialWeightKg;

  // PARTICULARIDADE OPERACIONAL DO FRIGORÍFICO:
  // Se na linha de desossa entraram carnes in natura (na carcaça) e carnes já desossadas,
  // para calcular o RENDIMENTO DA DESOSSA (que considera o total de carne obtida após a separação de osso e sebo),
  // SUBTRAI-SE o total de carne que entrou já desossada tanto das carnes vendáveis quanto da carcaça com osso.
  // Esse CÁLCULO é realizado apenas para obtermos o RENDIMENTO DA DESOSSA.
  const preDebonedInputKg = extraParams.preDebonedInputKg !== undefined
    ? Math.max(0, extraParams.preDebonedInputKg)
    : detectedPreDebonedKg;
  const hasPreDebonedInput = preDebonedInputKg > 0;
  const deboningEffectiveMeatKg = Math.max(0, saleableCutsWeightKg - preDebonedInputKg);
  const carcassWithBoneWeightKg = Math.max(0, totalCarcassWeightKg - preDebonedInputKg);

  // Yields
  // Rendimento da Desossa Líquido (estritamente da carcaça in natura)
  const deboningYieldNetPct = carcassWithBoneWeightKg > 0
    ? (deboningEffectiveMeatKg / carcassWithBoneWeightKg) * 100
    : 0;
  const totalYieldPct = totalCarcassWeightKg > 0 ? (finishedProductWeightKg / totalCarcassWeightKg) * 100 : 0;

  // 9. Financials & Costs
  const carcassCostPerKg = extraParams.carcassCostPerKg ?? (type === 'SUINO' ? 9.30 : type === 'TRASEIRO' ? 21.80 : 15.20);
  const totalCarcassCost = rawMaterialWeightKg * carcassCostPerKg;
  const grossProfitValue = finishedProductTotalValue - totalCarcassCost;
  const profitMarginPct = finishedProductTotalValue > 0 ? (grossProfitValue / finishedProductTotalValue) * 100 : 0;

  // 10. Operational Team & Productivity
  const operatorCount = extraParams.operatorCount ?? (type === 'SUINO' ? 18 : type === 'TRASEIRO' ? 22 : 20);
  const shift = extraParams.shift ?? 'Turno 1';
  const responsibleOperator = extraParams.responsibleOperator ?? (type === 'SUINO' ? 'Edmar Ferreira' : type === 'TRASEIRO' ? 'Valdemar Nogueira' : 'Marcos Silveira');
  const productivityKgPerPerson = operatorCount > 0 && rawMaterialWeightKg > 0 ? rawMaterialWeightKg / operatorCount : 0;

  return {
    id: `rec_${type.toLowerCase()}_${Date.now()}`,
    date,
    periodStart,
    periodEnd,
    companyName,
    emissionTime,
    type,
    shift,
    responsibleOperator,
    operatorCount,
    rawMaterialCode,
    rawMaterialDesc,
    rawMaterialWeightKg,
    rawMaterialBoxes,
    rawMaterialAvgWeightKg,
    carcassCostPerKg,
    totalCarcassCost,
    preDebonedInputKg,
    carcassWithBoneWeightKg,
    deboningEffectiveMeatKg,
    hasPreDebonedInput,
    finishedProductWeightKg,
    finishedProductBoxes,
    finishedProductTotalValue,
    cuts,
    lossKg,
    lossPct,
    saleableCutsWeightKg,
    nonSaleableWeightKg,
    boneWeightKg,
    fatWeightKg,
    nonSaleablePct,
    bonePct,
    fatPct,
    deboningYieldNetPct,
    totalYieldPct,
    productivityKgPerPerson,
    grossProfitValue,
    profitMarginPct,
    notes: cuts.length > 0
      ? (hasPreDebonedInput
          ? `Relatório SisAtak processado com ${cuts.length} cortes. Desossa Mista: deduzido ${preDebonedInputKg.toFixed(1)} kg de carne já desossada para o cálculo do Rendimento da Desossa.`
          : `Relatório SisAtak processado com sucesso (${cuts.length} cortes identificados).`)
      : 'Relatório SisAtak processado via Resumo/Totalização oficial.',
  };
}
