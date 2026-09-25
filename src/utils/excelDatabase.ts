import * as XLSX from 'xlsx';
import { CutItem, MarketBenchmark, ProductionRecord } from '../types';

export interface ExcelImportResult {
  success: boolean;
  message: string;
  importedRecords: ProductionRecord[];
  totalRecords: number;
}

/**
 * Exports the complete system database into an Excel (.xlsx) workbook,
 * formatted to be stored in the Intranet Drive.
 */
export function exportMasterDatabaseToExcel(
  records: ProductionRecord[],
  benchmarks: MarketBenchmark[] = [],
  drivePath = '\\\\SRV-FRIGORIFICO\\Intranet\\Desossa\\BANCO_DADOS_DESOSSA.xlsx'
): void {
  const wb = XLSX.utils.book_new();

  // 1. Sheet: Lotes_Desossa
  const lotesData = records.map((r, idx) => ({
    'Nº Lote': idx + 1,
    'ID Sistema': r.id,
    'Data': r.date,
    'Turno': r.shift,
    'Tipo': r.type === 'DIANTEIRO' ? 'DT - DIANTEIRO' : 'TR - TRASEIRO',
    'Líder de Desossa': r.responsibleOperator,
    'Operadores (Pessoas)': r.operatorCount,
    'Empresa Frigorífico': r.companyName || 'FRIGORÍFICO INDUSTRIAL',
    'Horário Emissão SisAtak': r.emissionTime || '00:00',
    'Cód. Matéria-Prima': r.rawMaterialCode || '001',
    'Desc. Matéria-Prima': r.rawMaterialDesc || (r.type === 'DIANTEIRO' ? 'DIANTEIRO BOVINO C/ OSSO' : 'TRASEIRO BOVINO C/ OSSO'),
    'Matéria-Prima (Kg)': Number(r.rawMaterialWeightKg.toFixed(2)),
    'Caixas MP': r.rawMaterialBoxes || 0,
    'Produto Acabado (Kg)': Number(r.finishedProductWeightKg.toFixed(2)),
    'Caixas PA': r.finishedProductBoxes || 0,
    'Quebra / Perda (Kg)': Number(r.lossKg.toFixed(2)),
    'Quebra (%)': Number(r.lossPct.toFixed(3)),
    'Carnes Vendáveis (Kg)': Number(r.saleableCutsWeightKg.toFixed(2)),
    'Subprodutos Osso (Kg)': Number(r.boneWeightKg.toFixed(2)),
    'Subprodutos Sebo (Kg)': Number(r.fatWeightKg.toFixed(2)),
    'Total Subprodutos (Kg)': Number(r.nonSaleableWeightKg.toFixed(2)),
    'Rend. Desossa Carnes/Carcaça (%)': Number(r.deboningYieldNetPct.toFixed(2)),
    'Rend. Bruto Total PA (%)': Number(r.totalYieldPct.toFixed(2)),
    'Produtividade (Kg/Pessoa)': Number(r.productivityKgPerPerson.toFixed(2)),
    'Custo Carcaça (R$/Kg)': Number(r.carcassCostPerKg.toFixed(2)),
    'Custo Total Carcaça (R$)': Number(r.totalCarcassCost.toFixed(2)),
    'Faturamento PA (R$)': Number(r.finishedProductTotalValue.toFixed(2)),
    'Lucro Bruto (R$)': Number(r.grossProfitValue.toFixed(2)),
    'Margem de Lucro (%)': Number(r.profitMarginPct.toFixed(2)),
    'Qtd Cortes Cadastrados': r.cuts.length,
    'Observações': r.notes || '',
  }));

  const wsLotes = XLSX.utils.json_to_sheet(lotesData);
  XLSX.utils.book_append_sheet(wb, wsLotes, 'Lotes_Desossa');

  // 2. Sheet: Itens_Cortes (All individual cuts across all batches)
  const allCutsData: Array<{
    'ID Lote': string;
    'Data': string;
    'Turno': string;
    'Tipo': string;
    'Líder': string;
    'Código Produto': string;
    'Descrição do Corte': string;
    'Categoria': string;
    'Peso (Kg)': number;
    'Caixas': number;
    'Rendimento Apurado (%)': number;
    'Rendimento Padrão (%)': number;
    'Preço Unitário (R$/Kg)': number;
    'Valor Total (R$)': number;
  }> = [];

  records.forEach((r) => {
    r.cuts.forEach((cut) => {
      allCutsData.push({
        'ID Lote': r.id,
        'Data': r.date,
        'Turno': r.shift,
        'Tipo': r.type,
        'Líder': r.responsibleOperator,
        'Código Produto': cut.code,
        'Descrição do Corte': cut.name,
        'Categoria': cut.category,
        'Peso (Kg)': Number(cut.weightKg.toFixed(2)),
        'Caixas': cut.boxesCount || 0,
        'Rendimento Apurado (%)': Number(cut.yieldActualPct.toFixed(2)),
        'Rendimento Padrão (%)': Number(cut.yieldExpectedPct.toFixed(2)),
        'Preço Unitário (R$/Kg)': Number(cut.unitPrice.toFixed(2)),
        'Valor Total (R$)': Number(cut.totalPrice.toFixed(2)),
      });
    });
  });

  const wsCortes = XLSX.utils.json_to_sheet(allCutsData);
  XLSX.utils.book_append_sheet(wb, wsCortes, 'Itens_Cortes');

  // 3. Sheet: Resumo_Diario
  const byDate: Record<string, {
    date: string;
    lotesCount: number;
    mpKg: number;
    paKg: number;
    lossKg: number;
    saleableKg: number;
    boneKg: number;
    fatKg: number;
    faturamento: number;
    custo: number;
    lucro: number;
    pessoas: number;
  }> = {};

  records.forEach((r) => {
    if (!byDate[r.date]) {
      byDate[r.date] = {
        date: r.date,
        lotesCount: 0,
        mpKg: 0,
        paKg: 0,
        lossKg: 0,
        saleableKg: 0,
        boneKg: 0,
        fatKg: 0,
        faturamento: 0,
        custo: 0,
        lucro: 0,
        pessoas: 0,
      };
    }
    const d = byDate[r.date];
    d.lotesCount += 1;
    d.mpKg += r.rawMaterialWeightKg;
    d.paKg += r.finishedProductWeightKg;
    d.lossKg += r.lossKg;
    d.saleableKg += r.saleableCutsWeightKg;
    d.boneKg += r.boneWeightKg;
    d.fatKg += r.fatWeightKg;
    d.faturamento += r.finishedProductTotalValue;
    d.custo += r.totalCarcassCost;
    d.lucro += r.grossProfitValue;
    d.pessoas += r.operatorCount;
  });

  const resumoData = Object.values(byDate)
    .sort((a, b) => b.date.localeCompare(a.date))
    .map((d) => {
      const totalCarcass = (d.saleableKg + d.boneKg + d.fatKg + d.lossKg) > 0
        ? (d.saleableKg + d.boneKg + d.fatKg + d.lossKg)
        : d.mpKg;
      return {
        'Data Produção': d.date,
        'Qtd Lotes': d.lotesCount,
        'MP Total (Kg)': Number(d.mpKg.toFixed(2)),
        'PA Total (Kg)': Number(d.paKg.toFixed(2)),
        'Quebra Total (Kg)': Number(d.lossKg.toFixed(2)),
        'Quebra Média (%)': Number((d.mpKg > 0 ? (d.lossKg / d.mpKg) * 100 : 0).toFixed(3)),
        'Carnes Vendáveis (Kg)': Number(d.saleableKg.toFixed(2)),
        'Rend. Desossa (%)': Number((totalCarcass > 0 ? (d.saleableKg / totalCarcass) * 100 : 0).toFixed(2)),
        'Produtividade (Kg/Pes)': Number((d.pessoas > 0 ? d.mpKg / d.pessoas : 0).toFixed(2)),
        'Faturamento (R$)': Number(d.faturamento.toFixed(2)),
        'Custo Carcaça (R$)': Number(d.custo.toFixed(2)),
        'Lucro Bruto (R$)': Number(d.lucro.toFixed(2)),
        'Margem (%)': Number((d.faturamento > 0 ? (d.lucro / d.faturamento) * 100 : 0).toFixed(2)),
      };
    });

  const wsResumo = XLSX.utils.json_to_sheet(resumoData);
  XLSX.utils.book_append_sheet(wb, wsResumo, 'Resumo_Diario');

  // 4. Sheet: Metas_Benchmarks
  if (benchmarks && benchmarks.length > 0) {
    const benchData = benchmarks.map((b) => ({
      'Código': b.code,
      'Corte': b.name,
      'Tipo': b.type,
      'Rendimento Esperado (%)': b.expectedYieldPct,
      'Preço Padrão (R$/Kg)': b.standardPricePerKg,
      'Tolerância (+/- %)': b.tolerancePct,
    }));
    const wsBench = XLSX.utils.json_to_sheet(benchData);
    XLSX.utils.book_append_sheet(wb, wsBench, 'Metas_Benchmarks');
  }

  // 5. Sheet: Info_Intranet
  const infoData = [
    { 'Parâmetro': 'Sistema', 'Valor': 'Frigorífico KPI Pro - Módulo de Desossa Industrial' },
    { 'Parâmetro': 'Drive Intranet', 'Valor': drivePath },
    { 'Parâmetro': 'Data/Hora da Exportação', 'Valor': new Date().toLocaleString('pt-BR') },
    { 'Parâmetro': 'Total de Lotes Registrados', 'Valor': records.length },
    { 'Parâmetro': 'Total de Cortes Registrados', 'Valor': allCutsData.length },
    { 'Parâmetro': 'Instrução para Gerente ATAK', 'Valor': 'Salve este arquivo na pasta do Drive da Intranet. Ele é o Banco de Dados Mestre do Frigorífico.' },
  ];
  const wsInfo = XLSX.utils.json_to_sheet(infoData);
  XLSX.utils.book_append_sheet(wb, wsInfo, 'Info_Intranet');

  // Generate date stamp for file name
  const dateStr = new Date().toISOString().split('T')[0];
  const fileName = `BANCO_DADOS_DESOSSA_INTRANET_${dateStr}.xlsx`;

  // Write and trigger download
  XLSX.writeFile(wb, fileName);
}

/**
 * Imports records and cuts from a master Excel workbook stored in the Intranet Drive.
 */
export async function importMasterDatabaseFromExcel(file: File): Promise<ExcelImportResult> {
  return new Promise((resolve) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });

        if (!workbook.SheetNames.includes('Lotes_Desossa')) {
          resolve({
            success: false,
            message: 'Planilha inválida: Não foi encontrada a aba "Lotes_Desossa". Verifique se este é o Banco de Dados do sistema.',
            importedRecords: [],
            totalRecords: 0,
          });
          return;
        }

        const rawLotes: any[] = XLSX.utils.sheet_to_json(workbook.Sheets['Lotes_Desossa']);
        let rawCortes: any[] = [];
        if (workbook.SheetNames.includes('Itens_Cortes')) {
          rawCortes = XLSX.utils.sheet_to_json(workbook.Sheets['Itens_Cortes']);
        }

        // Group cuts by batch ID
        const cutsByLoteId: Record<string, CutItem[]> = {};
        rawCortes.forEach((c, cIdx) => {
          const loteId = String(c['ID Lote'] || c['Id Lote'] || c['id'] || '');
          if (!loteId) return;
          if (!cutsByLoteId[loteId]) {
            cutsByLoteId[loteId] = [];
          }

          const desc = String(c['Descrição do Corte'] || c['Descricao'] || c['Nome'] || '').toUpperCase();
          const categoryRaw = String(c['Categoria'] || '').toUpperCase();
          
          let category: CutItem['category'] = 'DIANTEIRO';
          let isNonSaleable = false;
          if (categoryRaw.includes('OSSO') || desc.includes('OSSO')) {
            category = 'SUBPRODUTO_OSSO';
            isNonSaleable = true;
          } else if (categoryRaw.includes('SEBO') || desc.includes('SEBO')) {
            category = 'SUBPRODUTO_SEBO';
            isNonSaleable = true;
          } else if (categoryRaw.includes('NOBRE') || ['PICANHA', 'FILÉ MIGNON', 'CONTRA-FILÉ', 'ALCATRA'].some((n) => desc.includes(n))) {
            category = 'NOBRE';
          } else if (categoryRaw.includes('RECORTE') || desc.includes('RECORTE')) {
            category = 'RECORTE';
          } else if (String(c['Tipo'] || '').includes('TR')) {
            category = 'TRASEIRO';
          }

          const weightKg = Number(c['Peso (Kg)'] || c['Peso'] || 0);
          const boxesCount = Number(c['Caixas'] || 0);
          const yieldActualPct = Number(c['Rendimento Apurado (%)'] || c['Rendimento'] || 0);
          const yieldExpectedPct = Number(c['Rendimento Padrão (%)'] || yieldActualPct);
          const unitPrice = Number(c['Preço Unitário (R$/Kg)'] || c['Preco'] || 0);
          const totalPrice = Number(c['Valor Total (R$)'] || c['Valor'] || (weightKg * unitPrice));

          cutsByLoteId[loteId].push({
            id: `cut-imp-${loteId}-${cIdx}`,
            code: String(c['Código Produto'] || c['Codigo'] || '000'),
            name: String(c['Descrição do Corte'] || c['Nome'] || 'Corte'),
            weightKg,
            boxesCount,
            unitPrice,
            totalPrice,
            yieldActualPct,
            yieldExpectedPct,
            isNonSaleable,
            category,
          });
        });

        const importedRecords: ProductionRecord[] = rawLotes.map((row, idx) => {
          const id = String(row['ID Sistema'] || row['id'] || `REC-IMPORT-${Date.now()}-${idx}`);
          const date = String(row['Data'] || new Date().toISOString().split('T')[0]);
          const shift = (row['Turno'] || 'Turno 1') as 'Turno 1' | 'Turno 2' | 'Turno 3';
          const type = (String(row['Tipo'] || '').includes('TR') ? 'TRASEIRO' : 'DIANTEIRO') as 'DIANTEIRO' | 'TRASEIRO';
          const responsibleOperator = String(row['Líder de Desossa'] || row['Lider'] || 'Encarregado');
          const operatorCount = Number(row['Operadores (Pessoas)'] || row['Operadores'] || 20);
          const rawMaterialWeightKg = Number(row['Matéria-Prima (Kg)'] || row['MP'] || 0);
          const finishedProductWeightKg = Number(row['Produto Acabado (Kg)'] || row['PA'] || 0);
          const lossKg = Number(row['Quebra / Perda (Kg)'] || row['Quebra Kg'] || Math.max(0, rawMaterialWeightKg - finishedProductWeightKg));
          const lossPct = Number(row['Quebra (%)'] || (rawMaterialWeightKg > 0 ? (lossKg / rawMaterialWeightKg) * 100 : 0));

          const cuts = cutsByLoteId[id] || [];

          // Subproducts and saleable cuts
          const boneWeightKg = Number(row['Subprodutos Osso (Kg)'] || 0) || cuts.filter((c) => c.category === 'SUBPRODUTO_OSSO').reduce((acc, c) => acc + c.weightKg, 0);
          const fatWeightKg = Number(row['Subprodutos Sebo (Kg)'] || 0) || cuts.filter((c) => c.category === 'SUBPRODUTO_SEBO').reduce((acc, c) => acc + c.weightKg, 0);
          const nonSaleableWeightKg = boneWeightKg + fatWeightKg;
          const saleableCutsWeightKg = Number(row['Carnes Vendáveis (Kg)'] || Math.max(0, finishedProductWeightKg - nonSaleableWeightKg));

          const bonePct = rawMaterialWeightKg > 0 ? (boneWeightKg / rawMaterialWeightKg) * 100 : 0;
          const fatPct = rawMaterialWeightKg > 0 ? (fatWeightKg / rawMaterialWeightKg) * 100 : 0;
          const nonSaleablePct = rawMaterialWeightKg > 0 ? (nonSaleableWeightKg / rawMaterialWeightKg) * 100 : 0;

          // Peso total da carcaça = Carnes + Osso + Sebo + Quebra
          const totalCarcass = (saleableCutsWeightKg + boneWeightKg + fatWeightKg + lossKg) > 0
            ? (saleableCutsWeightKg + boneWeightKg + fatWeightKg + lossKg)
            : rawMaterialWeightKg;

          const deboningYieldNetPct = totalCarcass > 0 ? (saleableCutsWeightKg / totalCarcass) * 100 : 0;
          const totalYieldPct = rawMaterialWeightKg > 0 ? (finishedProductWeightKg / rawMaterialWeightKg) * 100 : 0;

          const carcassCostPerKg = Number(row['Custo Carcaça (R$/Kg)'] || (type === 'TRASEIRO' ? 21.80 : 15.20));
          const totalCarcassCost = Number(row['Custo Total Carcaça (R$)'] || (rawMaterialWeightKg * carcassCostPerKg));
          const finishedProductTotalValue = Number(row['Faturamento PA (R$)'] || cuts.reduce((acc, c) => acc + c.totalPrice, 0));
          const grossProfitValue = Number(row['Lucro Bruto (R$)'] || (finishedProductTotalValue - totalCarcassCost));
          const profitMarginPct = finishedProductTotalValue > 0 ? (grossProfitValue / finishedProductTotalValue) * 100 : 0;

          const productivityKgPerPerson = operatorCount > 0 ? rawMaterialWeightKg / operatorCount : 0;

          return {
            id,
            date,
            periodStart: String(row['Data'] || date),
            periodEnd: String(row['Data'] || date),
            companyName: String(row['Empresa Frigorífico'] || 'FRIGORÍFICO INDUSTRIAL'),
            emissionTime: String(row['Horário Emissão SisAtak'] || '18:00'),
            type,
            shift,
            responsibleOperator,
            operatorCount,
            rawMaterialCode: String(row['Cód. Matéria-Prima'] || (type === 'DIANTEIRO' ? '0010' : '0020')),
            rawMaterialDesc: String(row['Desc. Matéria-Prima'] || (type === 'DIANTEIRO' ? 'DIANTEIRO BOVINO C/ OSSO' : 'TRASEIRO BOVINO C/ OSSO')),
            rawMaterialWeightKg,
            rawMaterialBoxes: Number(row['Caixas MP'] || 0),
            rawMaterialAvgWeightKg: rawMaterialWeightKg,
            carcassCostPerKg,
            totalCarcassCost,
            finishedProductWeightKg,
            finishedProductBoxes: Number(row['Caixas PA'] || 0),
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
            notes: row['Observações'] ? String(row['Observações']) : undefined,
          };
        });

        resolve({
          success: true,
          message: `Banco de Dados importado com sucesso: ${importedRecords.length} lotes e ${rawCortes.length} itens de corte restaurados da planilha do Drive da Intranet.`,
          importedRecords,
          totalRecords: importedRecords.length,
        });
      } catch (err: any) {
        console.error('Erro na importação do Excel:', err);
        resolve({
          success: false,
          message: `Falha ao processar arquivo Excel: ${err.message || 'Formato incompatível'}`,
          importedRecords: [],
          totalRecords: 0,
        });
      }
    };

    reader.onerror = () => {
      resolve({
        success: false,
        message: 'Erro na leitura física do arquivo Excel.',
        importedRecords: [],
        totalRecords: 0,
      });
    };

    reader.readAsArrayBuffer(file);
  });
}
