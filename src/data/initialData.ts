import { MarketBenchmark, OperatorStat, ProductionRecord, User } from '../types';

export const INITIAL_USERS: User[] = [
  {
    id: 'usr_admin',
    name: 'Eng. Roberto Vasconcelos',
    username: 'admin',
    password: 'admin123',
    email: 'admin@frigo-industrial.com.br',
    role: 'ADMIN',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
    shift: 'Turno 1',
  },
  {
    id: 'usr_gerente',
    name: 'Carlos Mendes (Gerente Industrial)',
    username: 'gerente',
    password: 'gerente123',
    email: 'gerente@frigo-industrial.com.br',
    role: 'GERENCIAL',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80',
    shift: 'Turno 1',
  },
  {
    id: 'usr_diretoria',
    name: 'Dr. Arthur Prado (Diretor Operacional)',
    username: 'diretoria',
    password: 'diretoria123',
    email: 'diretoria@frigo-industrial.com.br',
    role: 'DIRETORIA',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&auto=format&fit=crop&q=80',
    shift: 'Turno 1',
  },
];

export const INITIAL_OPERATORS: OperatorStat[] = [
  {
    operatorId: 'op_101',
    name: 'Marcos Silveira (Líder Desossa DT)',
    shift: 'Turno 1',
    station: 'Desossa DT',
    kgProcessed: 8250.4,
    hoursWorked: 8.8,
    productivityKgPerPerson: 937.5,
    qualityScorePct: 98.6,
    boneScrapLossKg: 12.4,
  },
  {
    operatorId: 'op_102',
    name: 'João Pedro Alcantara',
    shift: 'Turno 1',
    station: 'Desossa DT',
    kgProcessed: 7890.0,
    hoursWorked: 8.8,
    productivityKgPerPerson: 896.6,
    qualityScorePct: 97.9,
    boneScrapLossKg: 14.2,
  },
  {
    operatorId: 'op_103',
    name: 'Valdemar Nogueira (Líder Desossa TR)',
    shift: 'Turno 1',
    station: 'Desossa TR',
    kgProcessed: 8100.2,
    hoursWorked: 8.8,
    productivityKgPerPerson: 920.5,
    qualityScorePct: 99.1,
    boneScrapLossKg: 9.8,
  },
  {
    operatorId: 'op_104',
    name: 'Alexandre Souza',
    shift: 'Turno 1',
    station: 'Desossa TR',
    kgProcessed: 8024.2,
    hoursWorked: 8.8,
    productivityKgPerPerson: 911.8,
    qualityScorePct: 98.2,
    boneScrapLossKg: 11.5,
  },
  {
    operatorId: 'op_105',
    name: 'Fabiano Ribeiro (Refile e Toalete)',
    shift: 'Turno 1',
    station: 'Refile/Toalete',
    kgProcessed: 5420.0,
    hoursWorked: 8.8,
    productivityKgPerPerson: 615.9,
    qualityScorePct: 99.4,
    boneScrapLossKg: 6.2,
  },
  {
    operatorId: 'op_106',
    name: 'Tiago Bernardes',
    shift: 'Turno 2',
    station: 'Desossa DT',
    kgProcessed: 7420.0,
    hoursWorked: 8.0,
    productivityKgPerPerson: 872.9,
    qualityScorePct: 96.5,
    boneScrapLossKg: 18.0,
  },
  {
    operatorId: 'op_107',
    name: 'Cleber Santoro',
    shift: 'Turno 2',
    station: 'Desossa TR',
    kgProcessed: 7650.0,
    hoursWorked: 8.0,
    productivityKgPerPerson: 900.0,
    qualityScorePct: 97.4,
    boneScrapLossKg: 15.6,
  },
  {
    operatorId: 'op_108',
    name: 'Ronaldo Esteves',
    shift: 'Turno 3',
    station: 'Desossa DT',
    kgProcessed: 6890.0,
    hoursWorked: 7.5,
    productivityKgPerPerson: 810.5,
    qualityScorePct: 95.8,
    boneScrapLossKg: 21.0,
  }
];

export const INITIAL_MARKET_BENCHMARKS: MarketBenchmark[] = [
  // Dianteiro
  { code: '01010990004-0', name: 'Acém Completo c/ Peito', type: 'DIANTEIRO', expectedYieldPct: 30.0, standardPricePerKg: 27.00, tolerancePct: 1.5 },
  { code: '01010990005-0', name: 'Paleta Bovina', type: 'DIANTEIRO', expectedYieldPct: 23.5, standardPricePerKg: 27.00, tolerancePct: 1.2 },
  { code: '01010990051-0', name: 'Músculo Dianteiro', type: 'DIANTEIRO', expectedYieldPct: 7.8, standardPricePerKg: 27.00, tolerancePct: 0.8 },
  { code: '01010020257-0', name: 'Peito Bovino Resf', type: 'DIANTEIRO', expectedYieldPct: 4.5, standardPricePerKg: 29.00, tolerancePct: 0.5 },
  { code: '01020020378-0', name: 'Recorte Dianteiro', type: 'DIANTEIRO', expectedYieldPct: 4.2, standardPricePerKg: 12.50, tolerancePct: 0.8 },
  { code: '01010990063-0', name: 'Maca Peito Bovino', type: 'DIANTEIRO', expectedYieldPct: 3.0, standardPricePerKg: 14.00, tolerancePct: 0.5 },
  { code: '01010990025-0', name: 'Osso do Dianteiro (Subproduto)', type: 'DIANTEIRO', expectedYieldPct: 21.0, standardPricePerKg: 0.77, tolerancePct: 1.5 },
  { code: '01010990008-0', name: 'Sebo do Dianteiro (Subproduto)', type: 'DIANTEIRO', expectedYieldPct: 0.85, standardPricePerKg: 1.40, tolerancePct: 0.3 },

  // Traseiro
  { code: 'PICANHA_TOTAL', name: 'Picanha Bovina (Geral)', type: 'TRASEIRO', expectedYieldPct: 1.70, standardPricePerKg: 65.00, tolerancePct: 0.2 },
  { code: 'FILE_MIGNON', name: 'Filé Mignon s/ Cordão', type: 'TRASEIRO', expectedYieldPct: 2.60, standardPricePerKg: 78.00, tolerancePct: 0.3 },
  { code: 'CONTRA_FILE', name: 'Contra Filé (Ancho/Noix/Grill)', type: 'TRASEIRO', expectedYieldPct: 8.80, standardPricePerKg: 42.00, tolerancePct: 0.8 },
  { code: 'ALCATRA_MAMI', name: 'Alcatra c/ Maminha & Grill', type: 'TRASEIRO', expectedYieldPct: 8.50, standardPricePerKg: 41.00, tolerancePct: 0.7 },
  { code: 'COXAO_MOLE', name: 'Coxão Mole Bovino', type: 'TRASEIRO', expectedYieldPct: 12.80, standardPricePerKg: 35.00, tolerancePct: 1.0 },
  { code: 'COXAO_DURO', name: 'Coxão Duro Bovino', type: 'TRASEIRO', expectedYieldPct: 9.00, standardPricePerKg: 31.00, tolerancePct: 0.8 },
  { code: 'PATINHO', name: 'Patinho Bovino', type: 'TRASEIRO', expectedYieldPct: 8.50, standardPricePerKg: 33.00, tolerancePct: 0.7 },
  { code: 'MUSCULO_TRASEIRO', name: 'Músculo Traseiro', type: 'TRASEIRO', expectedYieldPct: 6.00, standardPricePerKg: 29.00, tolerancePct: 0.5 },
  { code: 'LAGARTO', name: 'Lagarto Bovino', type: 'TRASEIRO', expectedYieldPct: 3.20, standardPricePerKg: 31.00, tolerancePct: 0.4 },
  { code: 'FRALDINHA', name: 'Fraldinha / Red Grill', type: 'TRASEIRO', expectedYieldPct: 2.70, standardPricePerKg: 35.00, tolerancePct: 0.4 },
  { code: 'CAPA_FILE', name: 'Capa de Filé', type: 'TRASEIRO', expectedYieldPct: 1.75, standardPricePerKg: 29.00, tolerancePct: 0.3 },
  { code: 'RECORTE_TRASEIRO', name: 'Recortes / Bananinha Traseiro', type: 'TRASEIRO', expectedYieldPct: 3.50, standardPricePerKg: 13.00, tolerancePct: 0.5 },
  { code: 'OSSO_TRASEIRO', name: 'Osso do Traseiro (Subproduto)', type: 'TRASEIRO', expectedYieldPct: 19.80, standardPricePerKg: 0.77, tolerancePct: 1.5 },
  { code: 'SEBO_TRASEIRO', name: 'Sebo do Traseiro (Subproduto)', type: 'TRASEIRO', expectedYieldPct: 2.10, standardPricePerKg: 1.40, tolerancePct: 0.4 }
];

// Dados históricos e autênticos extraídos dos relatórios SisAtak anexados
export const INITIAL_PRODUCTION_RECORDS: ProductionRecord[] = [
  // 1. DIANTEIRO - 25/08/2026 (Do relatório do anexo)
  {
    id: 'rec_dt_20260825',
    date: '2026-08-25',
    periodStart: '2026-08-25',
    periodEnd: '2026-08-25',
    companyName: 'BH FOODS COMERCIO E INDUSTRIA LTDA',
    emissionTime: '26/08/2026 14:09 h',
    type: 'DIANTEIRO',
    shift: 'Turno 1',
    responsibleOperator: 'Marcos Silveira',
    operatorCount: 20,
    rawMaterialCode: '1110002-0',
    rawMaterialDesc: 'DIANTEIRO BOVINO C/ OSSO',
    rawMaterialWeightKg: 16513.600,
    rawMaterialBoxes: 308,
    rawMaterialAvgWeightKg: 53.616,
    carcassCostPerKg: 15.20, // R$/kg custo carcaça dianteiro
    totalCarcassCost: 16513.600 * 15.20, // R$ 251.006,72
    finishedProductWeightKg: 16426.860,
    finishedProductBoxes: 117,
    finishedProductTotalValue: 321646.42,
    cuts: [
      { id: 'c1', code: '01020020192-0', name: 'CXGG - GORDURA BOV CONG (TOP CARNES)', weightKg: 172.710, boxesCount: 10, unitPrice: 8.00, totalPrice: 1381.68, yieldActualPct: 1.05, yieldExpectedPct: 1.00, category: 'RECORTE' },
      { id: 'c2', code: '01020020187-0', name: 'CXGG - NERVO BOV CONG (TOP CARNES)', weightKg: 23.490, boxesCount: 1, unitPrice: 1.40, totalPrice: 32.89, yieldActualPct: 0.14, yieldExpectedPct: 0.15, category: 'RECORTE' },
      { id: 'c3', code: '01010020257-0', name: 'CXGG - PEITO BOV RESF (DIMEZA)', weightKg: 739.290, boxesCount: 28, unitPrice: 29.00, totalPrice: 21439.41, yieldActualPct: 4.48, yieldExpectedPct: 4.50, category: 'DIANTEIRO' },
      { id: 'c4', code: '01020020378-0', name: 'CXGG - RECORTE DIANTEIRO BOV CONG (BOSCATTI)', weightKg: 709.270, boxesCount: 34, unitPrice: 12.50, totalPrice: 8865.88, yieldActualPct: 4.30, yieldExpectedPct: 4.20, category: 'RECORTE' },
      { id: 'c5', code: '01010990004-0', name: 'MP - ACEM COMPLETO C/ PEITO - RESF', weightKg: 5040.000, boxesCount: 3, unitPrice: 27.00, totalPrice: 136080.00, yieldActualPct: 30.52, yieldExpectedPct: 30.00, category: 'DIANTEIRO' },
      { id: 'c6', code: '01010990063-0', name: 'MP - MACA PEITO BOV - RESF', weightKg: 493.600, boxesCount: 2, unitPrice: 14.00, totalPrice: 6910.40, yieldActualPct: 2.99, yieldExpectedPct: 3.00, category: 'DIANTEIRO' },
      { id: 'c7', code: '01010990051-0', name: 'MP - MUSCULO DIANTEIRO BOV - RESF', weightKg: 1297.000, boxesCount: 4, unitPrice: 27.00, totalPrice: 35019.00, yieldActualPct: 7.85, yieldExpectedPct: 7.80, category: 'DIANTEIRO' },
      { id: 'c8', code: '01010990005-0', name: 'MP - PALETA BOV - RESF', weightKg: 3810.500, boxesCount: 5, unitPrice: 27.00, totalPrice: 102883.50, yieldActualPct: 23.07, yieldExpectedPct: 23.50, category: 'DIANTEIRO' },
      { id: 'c9', code: '01010990009-0', name: 'MP - RECORTE DO DIANTEIRO BOV - RESF', weightKg: 513.000, boxesCount: 7, unitPrice: 12.00, totalPrice: 6156.00, yieldActualPct: 3.11, yieldExpectedPct: 3.10, category: 'RECORTE' },
      { id: 'c10', code: '01010990025-0', name: 'X-MP - OSSO DO DIANTEIRO - RESF', weightKg: 3494.500, boxesCount: 16, unitPrice: 0.77, totalPrice: 2690.76, yieldActualPct: 21.16, yieldExpectedPct: 21.00, isNonSaleable: true, category: 'SUBPRODUTO_OSSO' },
      { id: 'c11', code: '01010990008-0', name: 'X-MP - SEBO DO DIANTEIRO BOV - RESF', weightKg: 133.500, boxesCount: 7, unitPrice: 1.40, totalPrice: 186.90, yieldActualPct: 0.81, yieldExpectedPct: 0.85, isNonSaleable: true, category: 'SUBPRODUTO_SEBO' },
    ],
    lossKg: 86.740,
    lossPct: 0.5253,
    saleableCutsWeightKg: 16426.860 - (3494.500 + 133.500), // 12.798,86 kg
    nonSaleableWeightKg: 3494.500 + 133.500, // 3.628,00 kg
    boneWeightKg: 3494.500,
    fatWeightKg: 133.500,
    nonSaleablePct: ((3494.500 + 133.500) / 16513.600) * 100, // 21.97%
    bonePct: (3494.500 / 16513.600) * 100, // 21.16%
    fatPct: (133.500 / 16513.600) * 100, // 0.81%
    deboningYieldNetPct: (12798.860 / 16513.600) * 100, // 77.51% rendimento da desossa (carnes vendáveis / peso total carcaça)
    totalYieldPct: (16426.860 / 16513.600) * 100, // 99.47%
    productivityKgPerPerson: 16513.600 / 20, // 825.68 kg/pessoa
    grossProfitValue: 321646.42 - (16513.600 * 15.20), // R$ 70.639,70
    profitMarginPct: ((321646.42 - (16513.600 * 15.20)) / 321646.42) * 100, // 21.96%
    notes: 'Desossa fluida sem interrupções de esteira. Refile do acém e paleta dentro do padrão.'
  },

  // 2. TRASEIRO - 28/08/2026 (Do relatório do anexo)
  {
    id: 'rec_tr_20260828',
    date: '2026-08-28',
    periodStart: '2026-08-28',
    periodEnd: '2026-08-28',
    companyName: 'BH FOODS COMERCIO E INDUSTRIA LTDA',
    emissionTime: '31/08/2026 11:08 h',
    type: 'TRASEIRO',
    shift: 'Turno 1',
    responsibleOperator: 'Valdemar Nogueira',
    operatorCount: 22,
    rawMaterialCode: '1110001-0',
    rawMaterialDesc: 'TRASEIRO BOVINO C/ OSSO',
    rawMaterialWeightKg: 16124.400,
    rawMaterialBoxes: 254,
    rawMaterialAvgWeightKg: 63.482,
    carcassCostPerKg: 21.80, // R$/kg custo carcaça traseiro
    totalCarcassCost: 16124.400 * 21.80, // R$ 351.511,92
    finishedProductWeightKg: 15895.695,
    finishedProductBoxes: 493,
    finishedProductTotalValue: 448200.04,
    cuts: [
      { id: 'tr1', code: '01010020250-0', name: 'CXGG - ALCATRA C/MAMINHA BOV RESF (DIMEZA)', weightKg: 440.320, boxesCount: 16, unitPrice: 39.00, totalPrice: 17172.48, yieldActualPct: 2.73, yieldExpectedPct: 2.75, category: 'TRASEIRO' },
      { id: 'tr2', code: '01010020252-0', name: 'CXGG - ALCATRA COMPLETA GRILL BOV RESF (DIMEZA)', weightKg: 376.870, boxesCount: 14, unitPrice: 46.00, totalPrice: 17336.02, yieldActualPct: 2.34, yieldExpectedPct: 2.30, category: 'NOBRE' },
      { id: 'tr3', code: '01010020247-0', name: 'CXGG - CAPA FILE BOV RESF (DIMEZA)', weightKg: 281.370, boxesCount: 11, unitPrice: 29.00, totalPrice: 8159.73, yieldActualPct: 1.74, yieldExpectedPct: 1.75, category: 'TRASEIRO' },
      { id: 'tr4', code: '01010020258-0', name: 'CXGG - CONTRA FILE ANCHO BOV RESF (DIMEZA)', weightKg: 578.890, boxesCount: 37, unitPrice: 40.00, totalPrice: 23155.60, yieldActualPct: 3.59, yieldExpectedPct: 3.60, category: 'NOBRE' },
      { id: 'tr5', code: '01010020255-0', name: 'CXGG - CONTRA FILE S/NOIX BOV RESF (DIMEZA)', weightKg: 647.490, boxesCount: 24, unitPrice: 42.00, totalPrice: 27194.58, yieldActualPct: 4.02, yieldExpectedPct: 4.10, category: 'NOBRE' },
      { id: 'tr6', code: '01010020256-0', name: 'CXGG - CONTRA FILE S/NOIX GRILL BOV RESF (DIMEZA)', weightKg: 221.440, boxesCount: 8, unitPrice: 46.00, totalPrice: 10186.24, yieldActualPct: 1.37, yieldExpectedPct: 1.35, category: 'NOBRE' },
      { id: 'tr7', code: '01020020280-0', name: 'CXGG - CORACAO ALCATRA BOV CONG (TOP CARNES)', weightKg: 169.105, boxesCount: 7, unitPrice: 37.00, totalPrice: 6256.89, yieldActualPct: 1.05, yieldExpectedPct: 1.05, category: 'NOBRE' },
      { id: 'tr8', code: '01020020085-0', name: 'CXGG - COXAO DURO BOV CONG (TOP CARNES)', weightKg: 334.110, boxesCount: 14, unitPrice: 31.00, totalPrice: 10357.41, yieldActualPct: 2.07, yieldExpectedPct: 2.10, category: 'TRASEIRO' },
      { id: 'tr9', code: '01010020238-0', name: 'CXGG - COXAO DURO BOV RESF (DIMEZA)', weightKg: 47.010, boxesCount: 2, unitPrice: 31.00, totalPrice: 1457.31, yieldActualPct: 0.29, yieldExpectedPct: 0.29, category: 'TRASEIRO' },
      { id: 'tr10', code: '01010020078-0', name: 'CXGG - COXAO DURO BOV RESF (TOP CARNES)', weightKg: 750.495, boxesCount: 29, unitPrice: 31.00, totalPrice: 23265.35, yieldActualPct: 4.65, yieldExpectedPct: 4.70, category: 'TRASEIRO' },
      { id: 'tr11', code: '01010020237-0', name: 'CXGG - COXAO MOLE BOV RESF (DIMEZA)', weightKg: 452.570, boxesCount: 17, unitPrice: 33.00, totalPrice: 14934.81, yieldActualPct: 2.81, yieldExpectedPct: 2.85, category: 'TRASEIRO' },
      { id: 'tr12', code: '01020020253-0', name: 'CXGG - COXAO MOLE BOV SEM CAPA CONG (TOP CARNES)', weightKg: 1271.660, boxesCount: 47, unitPrice: 36.00, totalPrice: 45779.76, yieldActualPct: 7.89, yieldExpectedPct: 7.80, category: 'TRASEIRO' },
      { id: 'tr13', code: '01020020250-0', name: 'CXGG - FILE MIGNON BOV S/CORDAO CONG (BOSCATTI)', weightKg: 55.915, boxesCount: 2, unitPrice: 70.00, totalPrice: 3914.05, yieldActualPct: 0.35, yieldExpectedPct: 0.35, category: 'NOBRE' },
      { id: 'tr14', code: '01010020243-0', name: 'CXGG - FILE MIGNON BOV S/CORDAO RESF (DIMEZA)', weightKg: 365.860, boxesCount: 26, unitPrice: 82.00, totalPrice: 30000.52, yieldActualPct: 2.27, yieldExpectedPct: 2.30, category: 'NOBRE' },
      { id: 'tr15', code: '01010020260-0', name: 'CXGG - FRALDINHA BOV RESF (DIMEZA)', weightKg: 304.130, boxesCount: 20, unitPrice: 33.00, totalPrice: 10036.29, yieldActualPct: 1.89, yieldExpectedPct: 1.90, category: 'NOBRE' },
      { id: 'tr16', code: '01010020261-0', name: 'CXGG - FRALDINHA GRILL BOV RESF (DIMEZA)', weightKg: 87.830, boxesCount: 6, unitPrice: 36.00, totalPrice: 3161.88, yieldActualPct: 0.54, yieldExpectedPct: 0.55, category: 'NOBRE' },
      { id: 'tr17', code: '01010020307-0', name: 'CXGG - FRALDINHA RED BOV RESF (DIMEZA)', weightKg: 45.150, boxesCount: 3, unitPrice: 44.00, totalPrice: 1986.60, yieldActualPct: 0.28, yieldExpectedPct: 0.30, category: 'NOBRE' },
      { id: 'tr18', code: '01020020141-0', name: 'CXGG - LAGARTO BOV CONG (TOP CARNES)', weightKg: 520.500, boxesCount: 20, unitPrice: 31.00, totalPrice: 16135.50, yieldActualPct: 3.23, yieldExpectedPct: 3.20, category: 'TRASEIRO' },
      { id: 'tr19', code: '01020020353-0', name: 'CXGG - MAMINHA BOV CONG (BOSCATTI)', weightKg: 185.545, boxesCount: 8, unitPrice: 38.00, totalPrice: 7050.71, yieldActualPct: 1.15, yieldExpectedPct: 1.20, category: 'NOBRE' },
      { id: 'tr20', code: '01010020240-0', name: 'CXGG - MIOLO ALCATRA BOV RESF (DIMEZA)', weightKg: 554.320, boxesCount: 37, unitPrice: 41.00, totalPrice: 22727.12, yieldActualPct: 3.44, yieldExpectedPct: 3.40, category: 'NOBRE' },
      { id: 'tr21', code: '01020010043-0', name: 'CXGG - OSSO PATINHO BOV CONG (TOP CARNES)', weightKg: 150.335, boxesCount: 7, unitPrice: 5.00, totalPrice: 751.67, yieldActualPct: 0.93, yieldExpectedPct: 0.90, isNonSaleable: true, category: 'SUBPRODUTO_OSSO' },
      { id: 'tr22', code: '01010020246-0', name: 'CXGG - PATINHO BOV RESF (DIMEZA)', weightKg: 731.810, boxesCount: 28, unitPrice: 33.00, totalPrice: 24149.73, yieldActualPct: 4.54, yieldExpectedPct: 4.50, category: 'TRASEIRO' },
      { id: 'tr23', code: '01020020395-0', name: 'CXGG - PICANHA (B) BOV CONG (BOSCATTI)', weightKg: 21.845, boxesCount: 1, unitPrice: 45.00, totalPrice: 983.02, yieldActualPct: 0.14, yieldExpectedPct: 0.15, category: 'NOBRE' },
      { id: 'tr24', code: '01010020292-0', name: 'CXGG - PICANHA BOV RESF (BOSCATTI)', weightKg: 11.250, boxesCount: 1, unitPrice: 88.00, totalPrice: 990.00, yieldActualPct: 0.07, yieldExpectedPct: 0.08, category: 'NOBRE' },
      { id: 'tr25', code: '01010020239-0', name: 'CXGG - PICANHA BOV RESF (DIMEZA)', weightKg: 161.980, boxesCount: 11, unitPrice: 58.00, totalPrice: 9394.84, yieldActualPct: 1.00, yieldExpectedPct: 1.05, category: 'NOBRE' },
      { id: 'tr26', code: '01010020259-0', name: 'CXGG - PICANHA GRILL BOV RESF (DIMEZA)', weightKg: 53.990, boxesCount: 4, unitPrice: 80.00, totalPrice: 4319.20, yieldActualPct: 0.33, yieldExpectedPct: 0.35, category: 'NOBRE' },
      { id: 'tr27', code: '01010020287-0', name: 'CXGG - PICANHA STEAK BOV RESF (BOSCATTI)', weightKg: 28.950, boxesCount: 2, unitPrice: 42.00, totalPrice: 1215.90, yieldActualPct: 0.18, yieldExpectedPct: 0.20, category: 'NOBRE' },
      { id: 'tr28', code: '01020020311-0', name: 'CXGG - RECORTE CONTRA FILE (BANANINHA) BOV', weightKg: 141.555, boxesCount: 9, unitPrice: 30.00, totalPrice: 4246.65, yieldActualPct: 0.88, yieldExpectedPct: 0.90, category: 'RECORTE' },
      { id: 'tr29', code: '01010990015-0', name: 'MP - CONTRA FILE - BOV - RESF', weightKg: 567.500, boxesCount: 9, unitPrice: 37.00, totalPrice: 20997.50, yieldActualPct: 3.52, yieldExpectedPct: 3.50, category: 'NOBRE' },
      { id: 'tr30', code: '01010990012-0', name: 'MP - COXAO DURO - BOV - RESF', weightKg: 319.900, boxesCount: 6, unitPrice: 31.00, totalPrice: 9916.90, yieldActualPct: 1.98, yieldExpectedPct: 2.00, category: 'TRASEIRO' },
      { id: 'tr31', code: '01010990011-0', name: 'MP - COXAO MOLE - BOV - RESF', weightKg: 375.500, boxesCount: 4, unitPrice: 33.00, totalPrice: 12391.50, yieldActualPct: 2.33, yieldExpectedPct: 2.35, category: 'TRASEIRO' },
      { id: 'tr32', code: '01010990043-0', name: 'MP - MUSCULO TRASEIRO BOV - RESF', weightKg: 975.000, boxesCount: 6, unitPrice: 29.00, totalPrice: 28275.00, yieldActualPct: 6.05, yieldExpectedPct: 6.00, category: 'TRASEIRO' },
      { id: 'tr33', code: '01010990014-0', name: 'MP - PATINHO BOV RESF', weightKg: 648.000, boxesCount: 9, unitPrice: 33.00, totalPrice: 21384.00, yieldActualPct: 4.02, yieldExpectedPct: 4.00, category: 'TRASEIRO' },
      { id: 'tr34', code: '01010990019-0', name: 'W-MP - RECORTE DO TRASEIRO - BOV - RESF', weightKg: 498.500, boxesCount: 9, unitPrice: 12.00, totalPrice: 5982.00, yieldActualPct: 3.09, yieldExpectedPct: 3.10, category: 'RECORTE' },
      // Subprodutos não vendáveis (Osso e Sebo)
      { id: 'tr35', code: '01010990022-0', name: 'X-MP - OSSO DO TRASEIRO - BOV - RESF', weightKg: 3164.000, boxesCount: 34, unitPrice: 0.77, totalPrice: 2436.28, yieldActualPct: 19.62, yieldExpectedPct: 19.50, isNonSaleable: true, category: 'SUBPRODUTO_OSSO' },
      { id: 'tr36', code: '01010990023-0', name: 'X-MP - SEBO DO TRASEIRO - BOV - RESF', weightKg: 355.000, boxesCount: 5, unitPrice: 1.40, totalPrice: 497.00, yieldActualPct: 2.20, yieldExpectedPct: 2.10, isNonSaleable: true, category: 'SUBPRODUTO_SEBO' },
    ],
    lossKg: 228.705,
    lossPct: 1.4184,
    saleableCutsWeightKg: 15895.695 - (3164.000 + 355.000 + 150.335), // 12.226,36 kg
    nonSaleableWeightKg: 3164.000 + 355.000 + 150.335, // 3.669,335 kg
    boneWeightKg: 3164.000 + 150.335, // 3.314,335 kg
    fatWeightKg: 355.000,
    nonSaleablePct: ((3164.000 + 355.000 + 150.335) / 16124.400) * 100, // 22.76%
    bonePct: ((3164.000 + 150.335) / 16124.400) * 100, // 20.55%
    fatPct: (355.000 / 16124.400) * 100, // 2.20%
    deboningYieldNetPct: (12226.360 / 16124.400) * 100, // 75.83% rendimento da desossa (carnes vendáveis / peso total carcaça)
    totalYieldPct: (15895.695 / 16124.400) * 100, // 98.58%
    productivityKgPerPerson: 16124.400 / 22, // 732.93 kg/pessoa
    grossProfitValue: 448200.04 - (16124.400 * 21.80), // R$ 96.688,12
    profitMarginPct: ((448200.04 - (16124.400 * 21.80)) / 448200.04) * 100, // 21.57%
    notes: 'Alto aproveitamento de Picanha e Contra-Filé Ancho. Quebra de 1,41% decorrente de descongelação de lote auxiliar.'
  },

  // 2b. DIANTEIRO - 28/08/2026 (Processado no MESMO DIA 28/08 na Linha de Desossa Dianteira)
  {
    id: 'rec_dt_20260828',
    date: '2026-08-28',
    periodStart: '2026-08-28',
    periodEnd: '2026-08-28',
    companyName: 'BH FOODS COMERCIO E INDUSTRIA LTDA',
    emissionTime: '28/08/2026 15:30 h',
    type: 'DIANTEIRO',
    shift: 'Turno 1',
    responsibleOperator: 'Marcos Silveira',
    operatorCount: 20,
    rawMaterialCode: '1110002-0',
    rawMaterialDesc: 'DIANTEIRO BOVINO C/ OSSO',
    rawMaterialWeightKg: 16380.000,
    rawMaterialBoxes: 304,
    rawMaterialAvgWeightKg: 53.881,
    carcassCostPerKg: 15.20,
    totalCarcassCost: 16380.000 * 15.20, // R$ 248.976,00
    finishedProductWeightKg: 16290.500,
    finishedProductBoxes: 118,
    finishedProductTotalValue: 319563.35,
    cuts: [
      { id: 'c1_28dt', code: '01010990004-0', name: 'MP - ACEM COMPLETO C/ PEITO - RESF', weightKg: 5010.000, boxesCount: 3, unitPrice: 27.00, totalPrice: 135270.00, yieldActualPct: 30.59, yieldExpectedPct: 30.00, category: 'DIANTEIRO' },
      { id: 'c2_28dt', code: '01010990005-0', name: 'MP - PALETA BOV - RESF', weightKg: 3790.000, boxesCount: 5, unitPrice: 27.00, totalPrice: 102330.00, yieldActualPct: 23.14, yieldExpectedPct: 23.50, category: 'DIANTEIRO' },
      { id: 'c3_28dt', code: '01010990051-0', name: 'MP - MUSCULO DIANTEIRO BOV - RESF', weightKg: 1285.000, boxesCount: 4, unitPrice: 27.00, totalPrice: 34695.00, yieldActualPct: 7.84, yieldExpectedPct: 7.80, category: 'DIANTEIRO' },
      { id: 'c4_28dt', code: '01010020257-0', name: 'CXGG - PEITO BOV RESF (DIMEZA)', weightKg: 735.000, boxesCount: 27, unitPrice: 29.00, totalPrice: 21315.00, yieldActualPct: 4.49, yieldExpectedPct: 4.50, category: 'DIANTEIRO' },
      { id: 'c5_28dt', code: '01020020378-0', name: 'CXGG - RECORTE DIANTEIRO BOV CONG (BOSCATTI)', weightKg: 705.000, boxesCount: 33, unitPrice: 12.50, totalPrice: 8812.50, yieldActualPct: 4.30, yieldExpectedPct: 4.20, category: 'RECORTE' },
      { id: 'c6_28dt', code: '01010990063-0', name: 'MP - MACA PEITO BOV - RESF', weightKg: 490.000, boxesCount: 2, unitPrice: 14.00, totalPrice: 6860.00, yieldActualPct: 2.99, yieldExpectedPct: 3.00, category: 'DIANTEIRO' },
      { id: 'c7_28dt', code: '01010990009-0', name: 'MP - RECORTE DO DIANTEIRO BOV - RESF', weightKg: 500.000, boxesCount: 7, unitPrice: 12.00, totalPrice: 6000.00, yieldActualPct: 3.05, yieldExpectedPct: 3.10, category: 'RECORTE' },
      { id: 'c8_28dt', code: '01010990025-0', name: 'X-MP - OSSO DO DIANTEIRO - RESF', weightKg: 3465.000, boxesCount: 16, unitPrice: 0.77, totalPrice: 2668.05, yieldActualPct: 21.15, yieldExpectedPct: 21.00, isNonSaleable: true, category: 'SUBPRODUTO_OSSO' },
      { id: 'c9_28dt', code: '01010990008-0', name: 'X-MP - SEBO DO DIANTEIRO BOV - RESF', weightKg: 132.000, boxesCount: 7, unitPrice: 1.40, totalPrice: 184.80, yieldActualPct: 0.81, yieldExpectedPct: 0.85, isNonSaleable: true, category: 'SUBPRODUTO_SEBO' },
      { id: 'c10_28dt', code: '01020020192-0', name: 'CXGG - GORDURA BOV CONG (TOP CARNES)', weightKg: 178.500, boxesCount: 10, unitPrice: 8.00, totalPrice: 1428.00, yieldActualPct: 1.09, yieldExpectedPct: 1.00, category: 'RECORTE' },
    ],
    lossKg: 89.500,
    lossPct: 0.546,
    saleableCutsWeightKg: 16290.500 - (3465.000 + 132.000), // 12.693,50 kg
    nonSaleableWeightKg: 3465.000 + 132.000, // 3.597,00 kg
    boneWeightKg: 3465.000,
    fatWeightKg: 132.000,
    nonSaleablePct: ((3465.000 + 132.000) / 16380.000) * 100, // 21.96%
    bonePct: (3465.000 / 16380.000) * 100, // 21.15%
    fatPct: (132.000 / 16380.000) * 100, // 0.81%
    deboningYieldNetPct: (12693.500 / 16380.000) * 100, // 77.49%
    totalYieldPct: (16290.500 / 16380.000) * 100, // 99.45%
    productivityKgPerPerson: 16380.000 / 20, // 819.00 kg/pessoa
    grossProfitValue: 319563.35 - (16380.000 * 15.20), // R$ 70.587,35
    profitMarginPct: ((319563.35 - (16380.000 * 15.20)) / 319563.35) * 100, // 22.09%
    notes: 'Linha Dianteira do dia 28/08 operando simultaneamente com a Linha Traseira no mesmo dia.'
  },

  // 3. DIANTEIRO - 24/08/2026 (Segunda-feira)
  {
    id: 'rec_dt_20260824',
    date: '2026-08-24',
    periodStart: '2026-08-24',
    periodEnd: '2026-08-24',
    companyName: 'BH FOODS COMERCIO E INDUSTRIA LTDA',
    emissionTime: '25/08/2026 09:30 h',
    type: 'DIANTEIRO',
    shift: 'Turno 1',
    responsibleOperator: 'Marcos Silveira',
    operatorCount: 20,
    rawMaterialCode: '1110002-0',
    rawMaterialDesc: 'DIANTEIRO BOVINO C/ OSSO',
    rawMaterialWeightKg: 15820.000,
    rawMaterialBoxes: 295,
    rawMaterialAvgWeightKg: 53.627,
    carcassCostPerKg: 15.20,
    totalCarcassCost: 15820.000 * 15.20,
    finishedProductWeightKg: 15725.100,
    finishedProductBoxes: 112,
    finishedProductTotalValue: 301290.00,
    cuts: [
      { id: 'rec_dt_20260824_1', code: '01020020192-0', name: 'CXGG - GORDURA BOV CONG (TOP CARNES)', weightKg: 165.332, boxesCount: 10, unitPrice: 7.83, totalPrice: 1294.24, yieldActualPct: 1.05, yieldExpectedPct: 1.00, category: 'RECORTE' },
      { id: 'rec_dt_20260824_2', code: '01020020187-0', name: 'CXGG - NERVO BOV CONG (TOP CARNES)', weightKg: 22.487, boxesCount: 1, unitPrice: 1.37, totalPrice: 30.81, yieldActualPct: 0.14, yieldExpectedPct: 0.15, category: 'RECORTE' },
      { id: 'rec_dt_20260824_3', code: '01010020257-0', name: 'CXGG - PEITO BOV RESF (DIMEZA)', weightKg: 707.707, boxesCount: 27, unitPrice: 28.38, totalPrice: 20082.55, yieldActualPct: 4.47, yieldExpectedPct: 4.50, category: 'DIANTEIRO' },
      { id: 'rec_dt_20260824_4', code: '01020020378-0', name: 'CXGG - RECORTE DIANTEIRO BOV CONG (BOSCATTI)', weightKg: 678.970, boxesCount: 33, unitPrice: 12.23, totalPrice: 8304.77, yieldActualPct: 4.29, yieldExpectedPct: 4.20, category: 'RECORTE' },
      { id: 'rec_dt_20260824_5', code: '01010990004-0', name: 'MP - ACEM COMPLETO C/ PEITO - RESF', weightKg: 4824.690, boxesCount: 3, unitPrice: 26.42, totalPrice: 127467.74, yieldActualPct: 30.50, yieldExpectedPct: 30.00, category: 'DIANTEIRO' },
      { id: 'rec_dt_20260824_6', code: '01010990063-0', name: 'MP - MACA PEITO BOV - RESF', weightKg: 472.513, boxesCount: 2, unitPrice: 13.70, totalPrice: 6473.05, yieldActualPct: 2.99, yieldExpectedPct: 3.00, category: 'DIANTEIRO' },
      { id: 'rec_dt_20260824_7', code: '01010990051-0', name: 'MP - MUSCULO DIANTEIRO BOV - RESF', weightKg: 1241.592, boxesCount: 4, unitPrice: 26.42, totalPrice: 32802.71, yieldActualPct: 7.85, yieldExpectedPct: 7.80, category: 'DIANTEIRO' },
      { id: 'rec_dt_20260824_8', code: '01010990005-0', name: 'MP - PALETA BOV - RESF', weightKg: 3647.714, boxesCount: 5, unitPrice: 26.42, totalPrice: 96372.19, yieldActualPct: 23.06, yieldExpectedPct: 23.50, category: 'DIANTEIRO' },
      { id: 'rec_dt_20260824_9', code: '01010990009-0', name: 'MP - RECORTE DO DIANTEIRO BOV - RESF', weightKg: 491.084, boxesCount: 7, unitPrice: 11.74, totalPrice: 5766.40, yieldActualPct: 3.10, yieldExpectedPct: 3.10, category: 'RECORTE' },
      { id: 'rec_dt_20260824_10', code: '01010990025-0', name: 'X-MP - OSSO DO DIANTEIRO - RESF', weightKg: 3345.214, boxesCount: 15, unitPrice: 0.75, totalPrice: 2520.47, yieldActualPct: 21.15, yieldExpectedPct: 21.00, isNonSaleable: true, category: 'SUBPRODUTO_OSSO' },
      { id: 'rec_dt_20260824_11', code: '01010990008-0', name: 'X-MP - SEBO DO DIANTEIRO BOV - RESF', weightKg: 127.797, boxesCount: 7, unitPrice: 1.37, totalPrice: 175.07, yieldActualPct: 0.81, yieldExpectedPct: 0.85, isNonSaleable: true, category: 'SUBPRODUTO_SEBO' }
    ],
    lossKg: 94.900,
    lossPct: 0.600,
    saleableCutsWeightKg: 12285.100,
    nonSaleableWeightKg: 3440.000,
    boneWeightKg: 3310.000,
    fatWeightKg: 130.000,
    nonSaleablePct: 21.74,
    bonePct: 20.92,
    fatPct: 0.82,
    deboningYieldNetPct: (12285.100 / 15820.000) * 100, // 77.66%
    totalYieldPct: 99.40,
    productivityKgPerPerson: 791.0,
    grossProfitValue: 60826.00,
    profitMarginPct: 20.19,
    notes: 'Início de semana com ritmo padrão.'
  },

  // 4. TRASEIRO - 26/08/2026 (Quarta-feira)
  {
    id: 'rec_tr_20260826',
    date: '2026-08-26',
    periodStart: '2026-08-26',
    periodEnd: '2026-08-26',
    companyName: 'BH FOODS COMERCIO E INDUSTRIA LTDA',
    emissionTime: '27/08/2026 08:45 h',
    type: 'TRASEIRO',
    shift: 'Turno 1',
    responsibleOperator: 'Valdemar Nogueira',
    operatorCount: 22,
    rawMaterialCode: '1110001-0',
    rawMaterialDesc: 'TRASEIRO BOVINO C/ OSSO',
    rawMaterialWeightKg: 16400.000,
    rawMaterialBoxes: 258,
    rawMaterialAvgWeightKg: 63.565,
    carcassCostPerKg: 21.80,
    totalCarcassCost: 16400.000 * 21.80,
    finishedProductWeightKg: 16220.000,
    finishedProductBoxes: 498,
    finishedProductTotalValue: 456000.00,
    cuts: [
      { id: 'rec_tr_20260826_1', code: '01010020250-0', name: 'CXGG - ALCATRA C/MAMINHA BOV RESF (DIMEZA)', weightKg: 449.303, boxesCount: 16, unitPrice: 38.89, totalPrice: 17471.33, yieldActualPct: 2.74, yieldExpectedPct: 2.75, category: 'TRASEIRO' },
      { id: 'rec_tr_20260826_2', code: '01010020252-0', name: 'CXGG - ALCATRA COMPLETA GRILL BOV RESF (DIMEZA)', weightKg: 384.559, boxesCount: 14, unitPrice: 45.86, totalPrice: 17637.72, yieldActualPct: 2.34, yieldExpectedPct: 2.30, category: 'NOBRE' },
      { id: 'rec_tr_20260826_3', code: '01010020247-0', name: 'CXGG - CAPA FILE BOV RESF (DIMEZA)', weightKg: 287.111, boxesCount: 11, unitPrice: 28.91, totalPrice: 8301.73, yieldActualPct: 1.75, yieldExpectedPct: 1.75, category: 'TRASEIRO' },
      { id: 'rec_tr_20260826_4', code: '01010020258-0', name: 'CXGG - CONTRA FILE ANCHO BOV RESF (DIMEZA)', weightKg: 590.701, boxesCount: 38, unitPrice: 39.88, totalPrice: 23558.57, yieldActualPct: 3.60, yieldExpectedPct: 3.60, category: 'NOBRE' },
      { id: 'rec_tr_20260826_5', code: '01010020255-0', name: 'CXGG - CONTRA FILE S/NOIX BOV RESF (DIMEZA)', weightKg: 660.700, boxesCount: 24, unitPrice: 41.88, totalPrice: 27667.84, yieldActualPct: 4.03, yieldExpectedPct: 4.10, category: 'NOBRE' },
      { id: 'rec_tr_20260826_6', code: '01010020256-0', name: 'CXGG - CONTRA FILE S/NOIX GRILL BOV RESF (DIMEZA)', weightKg: 225.958, boxesCount: 8, unitPrice: 45.86, totalPrice: 10363.51, yieldActualPct: 1.38, yieldExpectedPct: 1.35, category: 'NOBRE' },
      { id: 'rec_tr_20260826_7', code: '01020020280-0', name: 'CXGG - CORACAO ALCATRA BOV CONG (TOP CARNES)', weightKg: 172.555, boxesCount: 7, unitPrice: 36.89, totalPrice: 6365.78, yieldActualPct: 1.05, yieldExpectedPct: 1.05, category: 'NOBRE' },
      { id: 'rec_tr_20260826_8', code: '01020020085-0', name: 'CXGG - COXAO DURO BOV CONG (TOP CARNES)', weightKg: 340.927, boxesCount: 14, unitPrice: 30.91, totalPrice: 10537.66, yieldActualPct: 2.08, yieldExpectedPct: 2.10, category: 'TRASEIRO' },
      { id: 'rec_tr_20260826_9', code: '01010020238-0', name: 'CXGG - COXAO DURO BOV RESF (DIMEZA)', weightKg: 47.969, boxesCount: 2, unitPrice: 30.91, totalPrice: 1482.67, yieldActualPct: 0.29, yieldExpectedPct: 0.29, category: 'TRASEIRO' },
      { id: 'rec_tr_20260826_10', code: '01010020078-0', name: 'CXGG - COXAO DURO BOV RESF (TOP CARNES)', weightKg: 765.807, boxesCount: 30, unitPrice: 30.91, totalPrice: 23670.23, yieldActualPct: 4.67, yieldExpectedPct: 4.70, category: 'TRASEIRO' },
      { id: 'rec_tr_20260826_11', code: '01010020237-0', name: 'CXGG - COXAO MOLE BOV RESF (DIMEZA)', weightKg: 461.803, boxesCount: 17, unitPrice: 32.90, totalPrice: 15194.72, yieldActualPct: 2.82, yieldExpectedPct: 2.85, category: 'TRASEIRO' },
      { id: 'rec_tr_20260826_12', code: '01020020253-0', name: 'CXGG - COXAO MOLE BOV SEM CAPA CONG (TOP CARNES)', weightKg: 1297.604, boxesCount: 48, unitPrice: 35.89, totalPrice: 46576.46, yieldActualPct: 7.91, yieldExpectedPct: 7.80, category: 'TRASEIRO' },
      { id: 'rec_tr_20260826_13', code: '01020020250-0', name: 'CXGG - FILE MIGNON BOV S/CORDAO CONG (BOSCATTI)', weightKg: 57.056, boxesCount: 2, unitPrice: 69.79, totalPrice: 3982.17, yieldActualPct: 0.35, yieldExpectedPct: 0.35, category: 'NOBRE' },
      { id: 'rec_tr_20260826_14', code: '01010020243-0', name: 'CXGG - FILE MIGNON BOV S/CORDAO RESF (DIMEZA)', weightKg: 373.324, boxesCount: 27, unitPrice: 81.76, totalPrice: 30522.61, yieldActualPct: 2.28, yieldExpectedPct: 2.30, category: 'NOBRE' },
      { id: 'rec_tr_20260826_15', code: '01010020260-0', name: 'CXGG - FRALDINHA BOV RESF (DIMEZA)', weightKg: 310.335, boxesCount: 20, unitPrice: 32.90, totalPrice: 10210.95, yieldActualPct: 1.89, yieldExpectedPct: 1.90, category: 'NOBRE' },
      { id: 'rec_tr_20260826_16', code: '01010020261-0', name: 'CXGG - FRALDINHA GRILL BOV RESF (DIMEZA)', weightKg: 89.622, boxesCount: 6, unitPrice: 35.89, totalPrice: 3216.91, yieldActualPct: 0.55, yieldExpectedPct: 0.55, category: 'NOBRE' },
      { id: 'rec_tr_20260826_17', code: '01010020307-0', name: 'CXGG - FRALDINHA RED BOV RESF (DIMEZA)', weightKg: 46.071, boxesCount: 3, unitPrice: 43.87, totalPrice: 2021.17, yieldActualPct: 0.28, yieldExpectedPct: 0.30, category: 'NOBRE' },
      { id: 'rec_tr_20260826_18', code: '01020020141-0', name: 'CXGG - LAGARTO BOV CONG (TOP CARNES)', weightKg: 531.119, boxesCount: 20, unitPrice: 30.91, totalPrice: 16416.30, yieldActualPct: 3.24, yieldExpectedPct: 3.20, category: 'TRASEIRO' },
      { id: 'rec_tr_20260826_19', code: '01020020353-0', name: 'CXGG - MAMINHA BOV CONG (BOSCATTI)', weightKg: 189.331, boxesCount: 8, unitPrice: 37.89, totalPrice: 7173.41, yieldActualPct: 1.15, yieldExpectedPct: 1.20, category: 'NOBRE' },
      { id: 'rec_tr_20260826_20', code: '01010020240-0', name: 'CXGG - MIOLO ALCATRA BOV RESF (DIMEZA)', weightKg: 565.629, boxesCount: 38, unitPrice: 40.88, totalPrice: 23122.64, yieldActualPct: 3.45, yieldExpectedPct: 3.40, category: 'NOBRE' },
      { id: 'rec_tr_20260826_21', code: '01020010043-0', name: 'CXGG - OSSO PATINHO BOV CONG (TOP CARNES)', weightKg: 153.402, boxesCount: 7, unitPrice: 4.99, totalPrice: 764.75, yieldActualPct: 0.94, yieldExpectedPct: 0.90, isNonSaleable: true, category: 'SUBPRODUTO_OSSO' },
      { id: 'rec_tr_20260826_22', code: '01010020246-0', name: 'CXGG - PATINHO BOV RESF (DIMEZA)', weightKg: 746.740, boxesCount: 29, unitPrice: 32.90, totalPrice: 24570.00, yieldActualPct: 4.55, yieldExpectedPct: 4.50, category: 'TRASEIRO' },
      { id: 'rec_tr_20260826_23', code: '01020020395-0', name: 'CXGG - PICANHA (B) BOV CONG (BOSCATTI)', weightKg: 22.291, boxesCount: 1, unitPrice: 44.87, totalPrice: 1000.13, yieldActualPct: 0.14, yieldExpectedPct: 0.15, category: 'NOBRE' },
      { id: 'rec_tr_20260826_24', code: '01010020292-0', name: 'CXGG - PICANHA BOV RESF (BOSCATTI)', weightKg: 11.480, boxesCount: 1, unitPrice: 87.74, totalPrice: 1007.23, yieldActualPct: 0.07, yieldExpectedPct: 0.08, category: 'NOBRE' },
      { id: 'rec_tr_20260826_25', code: '01010020239-0', name: 'CXGG - PICANHA BOV RESF (DIMEZA)', weightKg: 165.285, boxesCount: 11, unitPrice: 57.83, totalPrice: 9558.34, yieldActualPct: 1.01, yieldExpectedPct: 1.05, category: 'NOBRE' },
      { id: 'rec_tr_20260826_26', code: '01010020259-0', name: 'CXGG - PICANHA GRILL BOV RESF (DIMEZA)', weightKg: 55.092, boxesCount: 4, unitPrice: 79.76, totalPrice: 4394.37, yieldActualPct: 0.34, yieldExpectedPct: 0.35, category: 'NOBRE' },
      { id: 'rec_tr_20260826_27', code: '01010020287-0', name: 'CXGG - PICANHA STEAK BOV RESF (BOSCATTI)', weightKg: 29.541, boxesCount: 2, unitPrice: 41.88, totalPrice: 1237.06, yieldActualPct: 0.18, yieldExpectedPct: 0.20, category: 'NOBRE' },
      { id: 'rec_tr_20260826_28', code: '01020020311-0', name: 'CXGG - RECORTE CONTRA FILE (BANANINHA) BOV', weightKg: 144.443, boxesCount: 9, unitPrice: 29.91, totalPrice: 4320.55, yieldActualPct: 0.88, yieldExpectedPct: 0.90, category: 'RECORTE' },
      { id: 'rec_tr_20260826_29', code: '01010990015-0', name: 'MP - CONTRA FILE - BOV - RESF', weightKg: 579.078, boxesCount: 9, unitPrice: 36.89, totalPrice: 21362.92, yieldActualPct: 3.53, yieldExpectedPct: 3.50, category: 'NOBRE' },
      { id: 'rec_tr_20260826_30', code: '01010990012-0', name: 'MP - COXAO DURO - BOV - RESF', weightKg: 326.427, boxesCount: 6, unitPrice: 30.91, totalPrice: 10089.48, yieldActualPct: 1.99, yieldExpectedPct: 2.00, category: 'TRASEIRO' },
      { id: 'rec_tr_20260826_31', code: '01010990011-0', name: 'MP - COXAO MOLE - BOV - RESF', weightKg: 383.161, boxesCount: 4, unitPrice: 32.90, totalPrice: 12607.15, yieldActualPct: 2.34, yieldExpectedPct: 2.35, category: 'TRASEIRO' },
      { id: 'rec_tr_20260826_32', code: '01010990043-0', name: 'MP - MUSCULO TRASEIRO BOV - RESF', weightKg: 994.892, boxesCount: 6, unitPrice: 28.91, totalPrice: 28767.07, yieldActualPct: 6.07, yieldExpectedPct: 6.00, category: 'TRASEIRO' },
      { id: 'rec_tr_20260826_33', code: '01010990014-0', name: 'MP - PATINHO BOV RESF', weightKg: 661.221, boxesCount: 9, unitPrice: 32.90, totalPrice: 21756.14, yieldActualPct: 4.03, yieldExpectedPct: 4.00, category: 'TRASEIRO' },
      { id: 'rec_tr_20260826_34', code: '01010990019-0', name: 'W-MP - RECORTE DO TRASEIRO - BOV - RESF', weightKg: 508.670, boxesCount: 9, unitPrice: 11.96, totalPrice: 6086.10, yieldActualPct: 3.10, yieldExpectedPct: 3.10, category: 'RECORTE' },
      { id: 'rec_tr_20260826_35', code: '01010990022-0', name: 'X-MP - OSSO DO TRASEIRO - BOV - RESF', weightKg: 3228.552, boxesCount: 35, unitPrice: 0.77, totalPrice: 2478.68, yieldActualPct: 19.69, yieldExpectedPct: 19.50, isNonSaleable: true, category: 'SUBPRODUTO_OSSO' },
      { id: 'rec_tr_20260826_36', code: '01010990023-0', name: 'X-MP - SEBO DO TRASEIRO - BOV - RESF', weightKg: 362.241, boxesCount: 5, unitPrice: 1.40, totalPrice: 505.65, yieldActualPct: 2.21, yieldExpectedPct: 2.10, isNonSaleable: true, category: 'SUBPRODUTO_SEBO' }
    ],
    lossKg: 180.000,
    lossPct: 1.097,
    saleableCutsWeightKg: 12630.000,
    nonSaleableWeightKg: 3590.000,
    boneWeightKg: 3240.000,
    fatWeightKg: 350.000,
    nonSaleablePct: 21.89,
    bonePct: 19.75,
    fatPct: 2.13,
    deboningYieldNetPct: (12630.000 / 16400.000) * 100, // 77.01%
    totalYieldPct: 98.90,
    productivityKgPerPerson: 745.45,
    grossProfitValue: 98480.00,
    profitMarginPct: 21.60,
    notes: 'Operação de alta rentabilidade e corte nobre consistente.'
  },

  // 5. DIANTEIRO - 27/08/2026 (Quinta-feira)
  {
    id: 'rec_dt_20260827',
    date: '2026-08-27',
    periodStart: '2026-08-27',
    periodEnd: '2026-08-27',
    companyName: 'BH FOODS COMERCIO E INDUSTRIA LTDA',
    emissionTime: '28/08/2026 09:15 h',
    type: 'DIANTEIRO',
    shift: 'Turno 2',
    responsibleOperator: 'Tiago Bernardes',
    operatorCount: 19,
    rawMaterialCode: '1110002-0',
    rawMaterialDesc: 'DIANTEIRO BOVINO C/ OSSO',
    rawMaterialWeightKg: 16250.000,
    rawMaterialBoxes: 302,
    rawMaterialAvgWeightKg: 53.807,
    carcassCostPerKg: 15.20,
    totalCarcassCost: 16250.000 * 15.20,
    finishedProductWeightKg: 16140.000,
    finishedProductBoxes: 115,
    finishedProductTotalValue: 309850.00,
    cuts: [
      { id: 'rec_dt_20260827_1', code: '01020020192-0', name: 'CXGG - GORDURA BOV CONG (TOP CARNES)', weightKg: 169.694, boxesCount: 10, unitPrice: 7.84, totalPrice: 1331.01, yieldActualPct: 1.04, yieldExpectedPct: 1.00, category: 'RECORTE' },
      { id: 'rec_dt_20260827_2', code: '01020020187-0', name: 'CXGG - NERVO BOV CONG (TOP CARNES)', weightKg: 23.080, boxesCount: 1, unitPrice: 1.37, totalPrice: 31.68, yieldActualPct: 0.14, yieldExpectedPct: 0.15, category: 'RECORTE' },
      { id: 'rec_dt_20260827_3', code: '01010020257-0', name: 'CXGG - PEITO BOV RESF (DIMEZA)', weightKg: 726.380, boxesCount: 28, unitPrice: 28.43, totalPrice: 20653.12, yieldActualPct: 4.47, yieldExpectedPct: 4.50, category: 'DIANTEIRO' },
      { id: 'rec_dt_20260827_4', code: '01020020378-0', name: 'CXGG - RECORTE DIANTEIRO BOV CONG (BOSCATTI)', weightKg: 696.884, boxesCount: 33, unitPrice: 12.26, totalPrice: 8540.72, yieldActualPct: 4.29, yieldExpectedPct: 4.20, category: 'RECORTE' },
      { id: 'rec_dt_20260827_5', code: '01010990004-0', name: 'MP - ACEM COMPLETO C/ PEITO - RESF', weightKg: 4951.987, boxesCount: 3, unitPrice: 26.47, totalPrice: 131089.25, yieldActualPct: 30.47, yieldExpectedPct: 30.00, category: 'DIANTEIRO' },
      { id: 'rec_dt_20260827_6', code: '01010990063-0', name: 'MP - MACA PEITO BOV - RESF', weightKg: 484.980, boxesCount: 2, unitPrice: 13.73, totalPrice: 6656.96, yieldActualPct: 2.98, yieldExpectedPct: 3.00, category: 'DIANTEIRO' },
      { id: 'rec_dt_20260827_7', code: '01010990051-0', name: 'MP - MUSCULO DIANTEIRO BOV - RESF', weightKg: 1274.351, boxesCount: 4, unitPrice: 26.47, totalPrice: 33734.67, yieldActualPct: 7.84, yieldExpectedPct: 7.80, category: 'DIANTEIRO' },
      { id: 'rec_dt_20260827_8', code: '01010990005-0', name: 'MP - PALETA BOV - RESF', weightKg: 3743.958, boxesCount: 5, unitPrice: 26.47, totalPrice: 99110.24, yieldActualPct: 23.04, yieldExpectedPct: 23.50, category: 'DIANTEIRO' },
      { id: 'rec_dt_20260827_9', code: '01010990009-0', name: 'MP - RECORTE DO DIANTEIRO BOV - RESF', weightKg: 504.042, boxesCount: 7, unitPrice: 11.77, totalPrice: 5930.23, yieldActualPct: 3.10, yieldExpectedPct: 3.10, category: 'RECORTE' },
      { id: 'rec_dt_20260827_10', code: '01010990025-0', name: 'X-MP - OSSO DO DIANTEIRO - RESF', weightKg: 3433.476, boxesCount: 16, unitPrice: 0.75, totalPrice: 2592.08, yieldActualPct: 21.13, yieldExpectedPct: 21.00, isNonSaleable: true, category: 'SUBPRODUTO_OSSO' },
      { id: 'rec_dt_20260827_11', code: '01010990008-0', name: 'X-MP - SEBO DO DIANTEIRO BOV - RESF', weightKg: 131.168, boxesCount: 7, unitPrice: 1.37, totalPrice: 180.04, yieldActualPct: 0.81, yieldExpectedPct: 0.85, isNonSaleable: true, category: 'SUBPRODUTO_SEBO' }
    ],
    lossKg: 110.000,
    lossPct: 0.676,
    saleableCutsWeightKg: 12555.000,
    nonSaleableWeightKg: 3585.000,
    boneWeightKg: 3450.000,
    fatWeightKg: 135.000,
    nonSaleablePct: 22.06,
    bonePct: 21.23,
    fatPct: 0.83,
    deboningYieldNetPct: (12555.000 / 16250.000) * 100, // 77.26%
    totalYieldPct: 99.32,
    productivityKgPerPerson: 855.26,
    grossProfitValue: 62850.00,
    profitMarginPct: 20.28,
    notes: 'Turno 2 com bom índice de refile.'
  },

  // 6. TRASEIRO - 29/08/2026 (Sábado)
  {
    id: 'rec_tr_20260829',
    date: '2026-08-29',
    periodStart: '2026-08-29',
    periodEnd: '2026-08-29',
    companyName: 'BH FOODS COMERCIO E INDUSTRIA LTDA',
    emissionTime: '30/08/2026 10:00 h',
    type: 'TRASEIRO',
    shift: 'Turno 1',
    responsibleOperator: 'Alexandre Souza',
    operatorCount: 21,
    rawMaterialCode: '1110001-0',
    rawMaterialDesc: 'TRASEIRO BOVINO C/ OSSO',
    rawMaterialWeightKg: 15980.000,
    rawMaterialBoxes: 250,
    rawMaterialAvgWeightKg: 63.920,
    carcassCostPerKg: 21.80,
    totalCarcassCost: 15980.000 * 21.80,
    finishedProductWeightKg: 15790.000,
    finishedProductBoxes: 485,
    finishedProductTotalValue: 442600.00,
    cuts: [
      { id: 'rec_tr_20260829_1', code: '01010020250-0', name: 'CXGG - ALCATRA C/MAMINHA BOV RESF (DIMEZA)', weightKg: 437.392, boxesCount: 16, unitPrice: 38.77, totalPrice: 16957.92, yieldActualPct: 2.74, yieldExpectedPct: 2.75, category: 'TRASEIRO' },
      { id: 'rec_tr_20260829_2', code: '01010020252-0', name: 'CXGG - ALCATRA COMPLETA GRILL BOV RESF (DIMEZA)', weightKg: 374.364, boxesCount: 14, unitPrice: 45.73, totalPrice: 17119.41, yieldActualPct: 2.34, yieldExpectedPct: 2.30, category: 'NOBRE' },
      { id: 'rec_tr_20260829_3', code: '01010020247-0', name: 'CXGG - CAPA FILE BOV RESF (DIMEZA)', weightKg: 279.499, boxesCount: 11, unitPrice: 28.83, totalPrice: 8057.78, yieldActualPct: 1.75, yieldExpectedPct: 1.75, category: 'TRASEIRO' },
      { id: 'rec_tr_20260829_4', code: '01010020258-0', name: 'CXGG - CONTRA FILE ANCHO BOV RESF (DIMEZA)', weightKg: 575.041, boxesCount: 37, unitPrice: 39.76, totalPrice: 22866.28, yieldActualPct: 3.60, yieldExpectedPct: 3.60, category: 'NOBRE' },
      { id: 'rec_tr_20260829_5', code: '01010020255-0', name: 'CXGG - CONTRA FILE S/NOIX BOV RESF (DIMEZA)', weightKg: 643.185, boxesCount: 24, unitPrice: 41.75, totalPrice: 26854.80, yieldActualPct: 4.02, yieldExpectedPct: 4.10, category: 'NOBRE' },
      { id: 'rec_tr_20260829_6', code: '01010020256-0', name: 'CXGG - CONTRA FILE S/NOIX GRILL BOV RESF (DIMEZA)', weightKg: 219.968, boxesCount: 8, unitPrice: 45.73, totalPrice: 10058.97, yieldActualPct: 1.38, yieldExpectedPct: 1.35, category: 'NOBRE' },
      { id: 'rec_tr_20260829_7', code: '01020020280-0', name: 'CXGG - CORACAO ALCATRA BOV CONG (TOP CARNES)', weightKg: 167.981, boxesCount: 7, unitPrice: 36.78, totalPrice: 6178.71, yieldActualPct: 1.05, yieldExpectedPct: 1.05, category: 'NOBRE' },
      { id: 'rec_tr_20260829_8', code: '01020020085-0', name: 'CXGG - COXAO DURO BOV CONG (TOP CARNES)', weightKg: 331.888, boxesCount: 14, unitPrice: 30.82, totalPrice: 10228.00, yieldActualPct: 2.08, yieldExpectedPct: 2.10, category: 'TRASEIRO' },
      { id: 'rec_tr_20260829_9', code: '01010020238-0', name: 'CXGG - COXAO DURO BOV RESF (DIMEZA)', weightKg: 46.697, boxesCount: 2, unitPrice: 30.82, totalPrice: 1439.10, yieldActualPct: 0.29, yieldExpectedPct: 0.29, category: 'TRASEIRO' },
      { id: 'rec_tr_20260829_10', code: '01010020078-0', name: 'CXGG - COXAO DURO BOV RESF (TOP CARNES)', weightKg: 745.505, boxesCount: 29, unitPrice: 30.82, totalPrice: 22974.66, yieldActualPct: 4.67, yieldExpectedPct: 4.70, category: 'TRASEIRO' },
      { id: 'rec_tr_20260829_11', code: '01010020237-0', name: 'CXGG - COXAO MOLE BOV RESF (DIMEZA)', weightKg: 449.561, boxesCount: 17, unitPrice: 32.81, totalPrice: 14748.21, yieldActualPct: 2.81, yieldExpectedPct: 2.85, category: 'TRASEIRO' },
      { id: 'rec_tr_20260829_12', code: '01020020253-0', name: 'CXGG - COXAO MOLE BOV SEM CAPA CONG (TOP CARNES)', weightKg: 1263.204, boxesCount: 47, unitPrice: 35.79, totalPrice: 45207.76, yieldActualPct: 7.90, yieldExpectedPct: 7.80, category: 'TRASEIRO' },
      { id: 'rec_tr_20260829_13', code: '01020020250-0', name: 'CXGG - FILE MIGNON BOV S/CORDAO CONG (BOSCATTI)', weightKg: 55.543, boxesCount: 2, unitPrice: 69.59, totalPrice: 3865.15, yieldActualPct: 0.35, yieldExpectedPct: 0.35, category: 'NOBRE' },
      { id: 'rec_tr_20260829_14', code: '01010020243-0', name: 'CXGG - FILE MIGNON BOV S/CORDAO RESF (DIMEZA)', weightKg: 363.427, boxesCount: 26, unitPrice: 81.52, totalPrice: 29625.68, yieldActualPct: 2.27, yieldExpectedPct: 2.30, category: 'NOBRE' },
      { id: 'rec_tr_20260829_15', code: '01010020260-0', name: 'CXGG - FRALDINHA BOV RESF (DIMEZA)', weightKg: 302.108, boxesCount: 20, unitPrice: 32.81, totalPrice: 9910.89, yieldActualPct: 1.89, yieldExpectedPct: 1.90, category: 'NOBRE' },
      { id: 'rec_tr_20260829_16', code: '01010020261-0', name: 'CXGG - FRALDINHA GRILL BOV RESF (DIMEZA)', weightKg: 87.246, boxesCount: 6, unitPrice: 35.79, totalPrice: 3122.37, yieldActualPct: 0.55, yieldExpectedPct: 0.55, category: 'NOBRE' },
      { id: 'rec_tr_20260829_17', code: '01010020307-0', name: 'CXGG - FRALDINHA RED BOV RESF (DIMEZA)', weightKg: 44.850, boxesCount: 3, unitPrice: 43.74, totalPrice: 1961.78, yieldActualPct: 0.28, yieldExpectedPct: 0.30, category: 'NOBRE' },
      { id: 'rec_tr_20260829_18', code: '01020020141-0', name: 'CXGG - LAGARTO BOV CONG (TOP CARNES)', weightKg: 517.039, boxesCount: 20, unitPrice: 30.82, totalPrice: 15933.89, yieldActualPct: 3.24, yieldExpectedPct: 3.20, category: 'TRASEIRO' },
      { id: 'rec_tr_20260829_19', code: '01020020353-0', name: 'CXGG - MAMINHA BOV CONG (BOSCATTI)', weightKg: 184.311, boxesCount: 8, unitPrice: 37.78, totalPrice: 6962.61, yieldActualPct: 1.15, yieldExpectedPct: 1.20, category: 'NOBRE' },
      { id: 'rec_tr_20260829_20', code: '01010020240-0', name: 'CXGG - MIOLO ALCATRA BOV RESF (DIMEZA)', weightKg: 550.634, boxesCount: 37, unitPrice: 40.76, totalPrice: 22443.16, yieldActualPct: 3.45, yieldExpectedPct: 3.40, category: 'NOBRE' },
      { id: 'rec_tr_20260829_21', code: '01020010043-0', name: 'CXGG - OSSO PATINHO BOV CONG (TOP CARNES)', weightKg: 149.335, boxesCount: 7, unitPrice: 4.97, totalPrice: 742.28, yieldActualPct: 0.93, yieldExpectedPct: 0.90, isNonSaleable: true, category: 'SUBPRODUTO_OSSO' },
      { id: 'rec_tr_20260829_22', code: '01010020246-0', name: 'CXGG - PATINHO BOV RESF (DIMEZA)', weightKg: 726.944, boxesCount: 28, unitPrice: 32.81, totalPrice: 23847.99, yieldActualPct: 4.55, yieldExpectedPct: 4.50, category: 'TRASEIRO' },
      { id: 'rec_tr_20260829_23', code: '01020020395-0', name: 'CXGG - PICANHA (B) BOV CONG (BOSCATTI)', weightKg: 21.700, boxesCount: 1, unitPrice: 44.73, totalPrice: 970.74, yieldActualPct: 0.14, yieldExpectedPct: 0.15, category: 'NOBRE' },
      { id: 'rec_tr_20260829_24', code: '01010020292-0', name: 'CXGG - PICANHA BOV RESF (BOSCATTI)', weightKg: 11.175, boxesCount: 1, unitPrice: 87.48, totalPrice: 977.63, yieldActualPct: 0.07, yieldExpectedPct: 0.08, category: 'NOBRE' },
      { id: 'rec_tr_20260829_25', code: '01010020239-0', name: 'CXGG - PICANHA BOV RESF (DIMEZA)', weightKg: 160.903, boxesCount: 11, unitPrice: 57.66, totalPrice: 9277.46, yieldActualPct: 1.01, yieldExpectedPct: 1.05, category: 'NOBRE' },
      { id: 'rec_tr_20260829_26', code: '01010020259-0', name: 'CXGG - PICANHA GRILL BOV RESF (DIMEZA)', weightKg: 53.631, boxesCount: 4, unitPrice: 79.53, totalPrice: 4265.23, yieldActualPct: 0.34, yieldExpectedPct: 0.35, category: 'NOBRE' },
      { id: 'rec_tr_20260829_27', code: '01010020287-0', name: 'CXGG - PICANHA STEAK BOV RESF (BOSCATTI)', weightKg: 28.758, boxesCount: 2, unitPrice: 41.75, totalPrice: 1200.71, yieldActualPct: 0.18, yieldExpectedPct: 0.20, category: 'NOBRE' },
      { id: 'rec_tr_20260829_28', code: '01020020311-0', name: 'CXGG - RECORTE CONTRA FILE (BANANINHA) BOV', weightKg: 140.614, boxesCount: 9, unitPrice: 29.82, totalPrice: 4193.59, yieldActualPct: 0.88, yieldExpectedPct: 0.90, category: 'RECORTE' },
      { id: 'rec_tr_20260829_29', code: '01010990015-0', name: 'MP - CONTRA FILE - BOV - RESF', weightKg: 563.727, boxesCount: 9, unitPrice: 36.78, totalPrice: 20735.15, yieldActualPct: 3.53, yieldExpectedPct: 3.50, category: 'NOBRE' },
      { id: 'rec_tr_20260829_30', code: '01010990012-0', name: 'MP - COXAO DURO - BOV - RESF', weightKg: 317.773, boxesCount: 6, unitPrice: 30.82, totalPrice: 9792.99, yieldActualPct: 1.99, yieldExpectedPct: 2.00, category: 'TRASEIRO' },
      { id: 'rec_tr_20260829_31', code: '01010990011-0', name: 'MP - COXAO MOLE - BOV - RESF', weightKg: 373.003, boxesCount: 4, unitPrice: 32.81, totalPrice: 12236.67, yieldActualPct: 2.33, yieldExpectedPct: 2.35, category: 'TRASEIRO' },
      { id: 'rec_tr_20260829_32', code: '01010990043-0', name: 'MP - MUSCULO TRASEIRO BOV - RESF', weightKg: 968.517, boxesCount: 6, unitPrice: 28.83, totalPrice: 27921.72, yieldActualPct: 6.06, yieldExpectedPct: 6.00, category: 'TRASEIRO' },
      { id: 'rec_tr_20260829_33', code: '01010990014-0', name: 'MP - PATINHO BOV RESF', weightKg: 643.691, boxesCount: 9, unitPrice: 32.81, totalPrice: 21116.82, yieldActualPct: 4.03, yieldExpectedPct: 4.00, category: 'TRASEIRO' },
      { id: 'rec_tr_20260829_34', code: '01010990019-0', name: 'W-MP - RECORTE DO TRASEIRO - BOV - RESF', weightKg: 495.185, boxesCount: 9, unitPrice: 11.93, totalPrice: 5907.26, yieldActualPct: 3.10, yieldExpectedPct: 3.10, category: 'RECORTE' },
      { id: 'rec_tr_20260829_35', code: '01010990022-0', name: 'X-MP - OSSO DO TRASEIRO - BOV - RESF', weightKg: 3142.962, boxesCount: 34, unitPrice: 0.77, totalPrice: 2405.84, yieldActualPct: 19.67, yieldExpectedPct: 19.50, isNonSaleable: true, category: 'SUBPRODUTO_OSSO' },
      { id: 'rec_tr_20260829_36', code: '01010990023-0', name: 'X-MP - SEBO DO TRASEIRO - BOV - RESF', weightKg: 352.639, boxesCount: 5, unitPrice: 1.39, totalPrice: 490.79, yieldActualPct: 2.21, yieldExpectedPct: 2.10, isNonSaleable: true, category: 'SUBPRODUTO_SEBO' }
    ],
    lossKg: 190.000,
    lossPct: 1.188,
    saleableCutsWeightKg: 12305.000,
    nonSaleableWeightKg: 3485.000,
    boneWeightKg: 3140.000,
    fatWeightKg: 345.000,
    nonSaleablePct: 21.80,
    bonePct: 19.65,
    fatPct: 2.16,
    deboningYieldNetPct: (12305.000 / 15980.000) * 100, // 77.00%
    totalYieldPct: 98.81,
    productivityKgPerPerson: 760.95,
    grossProfitValue: 94236.00,
    profitMarginPct: 21.29,
    notes: 'Fechamento de produção semanal no sábado com meta alcançada.'
  }
];

export const RAW_SAMPLE_SISATAK_DT = `SisAtak - Sistema de Administracao Integrada de Negocios
RETQ010 - Relatório de Produção - Desossa por Data Emissão: 26/08/2026 14:09 h Página : 0001/ 0001
BH FOODS COMERCIO E INDUSTRIA LTDA
MATÉRIA-PRIMA
Produto/Ref Descrição Produto Qtde UN Qtde UN Media Vlr Un Total Produto M
GRUPO DE RENDIMENTO : DT - DIANTEIRO
1110002-0 DIANTEIRO BOVINO C/ OSSO 16.513,600KG 308,000CX 53,616KG 0,00 0,00 R$
Total Grupo: DT 16.513,600 308,000 0,000
Total Matéria Prima : 16.513,600 308,000
PRODUTO ACABADO
Produto/Ref Descrição Produto Qtde UN Qtde UN Interna Rend. Apurado Rend. Esperado Valor Unit. Total Produto M
GRUPO RENDIMENTO : DT - DIANTEIRO
01020020192-0 CXGG - GORDURA BOV CONG (TOP CARNES) 172,710 KG 10,000 CX 010 1,05 % 0,00 % 8,00 1.381,68 R$
01020020187-0 CXGG - NERVO BOV CONG (TOP CARNES) 23,490 KG 1,000 CX 001 0,14 % 0,00 % 1,40 32,89 R$
01010020257-0 CXGG - PEITO BOV RESF (DIMEZA) 739,290 KG 28,000 CX 160 4,48 % 0,00 % 29,00 21.439,41 R$
01020020378-0 CXGG - RECORTE DIANTEIRO BOV CONG (BOSCATTI) 709,270 KG 34,000 CX 034 4,30 % 0,00 % 12,50 8.865,88 R$
01010990004-0 MP - ACEM COMPLETO C/ PEITO - RESF 5.040,000 KG 3,000 CX 000 30,52 % 0,00 % 27,00 136.080,00 R$
01010990063-0 MP - MACA PEITO BOV - RESF 493,600 KG 2,000 CX 000 2,99 % 0,00 % 14,00 6.910,40 R$
01010990051-0 MP - MUSCULO DIANTEIRO BOV - RESF 1.297,000 KG 4,000 CX 003 7,85 % 0,00 % 27,00 35.019,00 R$
01010990005-0 MP - PALETA BOV - RESF 3.810,500 KG 5,000 CX 004 23,07 % 0,00 % 27,00 102.883,50 R$
01010990009-0 MP - RECORTE DO DIANTEIRO BOV - RESF 513,000 KG 7,000 CX 003 3,11 % 0,00 % 12,00 6.156,00 R$
01010990025-0 X-MP - OSSO DO DIANTEIRO - RESF 3.494,500 KG 16,000 CX 012 21,16 % 0,00 % 0,77 2.690,76 R$
01010990008-0 X-MP - SEBO DO DIANTEIRO BOV - RESF 133,500 KG 7,000 CX 005 0,81 % 0,00 % 1,40 186,90 R$
Total: DT 16.426,860 117,000 99,47 % 19,16 314.736,02
RESUMO
Grupo Rendimento Matéria-Prima (kg) Produto Acabado (kg) Rendimento Valor MP (R$) Valor PA (R$) Quebra (R$) M
DT - DIANTEIRO 16.513,600 16.426,860 99,47 % 0,00 314.736,02 314.736,02 R$
TOTALIZAÇÃO: 16.513,600 16.426,860 99,47 % 0,00 314.736,02 314.736,02
QUEBRA: 86,740 0,5253 %
Filtros Utilizados: Empresa: 021 Período: 25/08/2026 a 25/08/2026`;

export const RAW_SAMPLE_SISATAK_TR = `SisAtak - Sistema de Administracao Integrada de Negocios
RETQ010 - Relatório de Produção - Desossa por Data Emissão: 31/08/2026 11:08 h Página : 0001/ 0002
BH FOODS COMERCIO E INDUSTRIA LTDA
MATÉRIA-PRIMA
Produto/Ref Descrição Produto Qtde UN Qtde UN Media Vlr Un Total Produto M
GRUPO DE RENDIMENTO : TR - TRASEIRO
1110001-0 TRASEIRO BOVINO C/ OSSO 16.124,400KG 254,000CX 63,482KG 0,00 0,00 R$
Total Grupo: TR 16.124,400 254,000 0,000
Total Matéria Prima : 16.124,400 254,000
PRODUTO ACABADO
Produto/Ref Descrição Produto Qtde UN Qtde UN Interna Rend. Apurado Rend. Esperado Valor Unit. Total Produto M
GRUPO RENDIMENTO : TR - TRASEIRO
01010020250-0 CXGG - ALCATRA C/MAMINHA BOV RESF (DIMEZA) 440,320 KG 16,000 CX 081 2,73 % 0,00 % 39,00 17.172,48 R$
01010020252-0 CXGG - ALCATRA COMPLETA GRILL BOV RESF (DIM 376,870 KG 14,000 CX 039 2,34 % 0,00 % 46,00 17.336,02 R$
01010020247-0 CXGG - CAPA FILE BOV RESF (DIMEZA) 281,370 KG 11,000 CX 176 1,74 % 0,00 % 29,00 8.159,73 R$
01010020258-0 CXGG - CONTRA FILE ANCHO BOV RESF (DIMEZA) 578,890 KG 37,000 CX 559 3,59 % 0,00 % 40,00 23.155,60 R$
01010020255-0 CXGG - CONTRA FILE S/NOIX BOV RESF (DIMEZA) 647,490 KG 24,000 CX 150 4,02 % 0,00 % 42,00 27.194,58 R$
01010020256-0 CXGG - CONTRA FILE S/NOIX GRILL BOV RESF (DIM 221,440 KG 8,000 CX 049 1,37 % 0,00 % 46,00 10.186,24 R$
01020020280-0 CXGG - CORACAO ALCATRA BOV CONG (TOP CARN 169,105 KG 7,000 CX 093 1,05 % 0,00 % 37,00 6.256,89 R$
01020020085-0 CXGG - COXAO DURO BOV CONG (TOP CARNES) 334,110 KG 14,000 CX 080 2,07 % 0,00 % 31,00 10.357,41 R$
01010020238-0 CXGG - COXAO DURO BOV RESF (DIMEZA) 47,010 KG 2,000 CX 010 0,29 % 0,00 % 31,00 1.457,31 R$
01010020078-0 CXGG - COXAO DURO BOV RESF (TOP CARNES) 750,495 KG 29,000 CX 171 4,65 % 0,00 % 31,00 23.265,35 R$
01010020237-0 CXGG - COXAO MOLE BOV RESF (DIMEZA) 452,570 KG 17,000 CX 057 2,81 % 0,00 % 33,00 14.934,81 R$
01020020253-0 CXGG - COXAO MOLE BOV SEM CAPA CONG (TOP 1.271,660 KG 47,000 CX 168 7,89 % 0,00 % 36,00 45.779,76 R$
01020020250-0 CXGG - FILE MIGNON BOV S/CORDAO CONG (BOSCA 55,915 KG 2,000 CX 021 0,35 % 0,00 % 70,00 3.914,05 R$
01010020243-0 CXGG - FILE MIGNON BOV S/CORDAO RESF (DIMEZA 365,860 KG 26,000 CX 208 2,27 % 0,00 % 82,00 30.000,52 R$
01010020260-0 CXGG - FRALDINHA BOV RESF (DIMEZA) 304,130 KG 20,000 CX 308 1,89 % 0,00 % 33,00 10.036,29 R$
01010020261-0 CXGG - FRALDINHA GRILL BOV RESF (DIMEZA) 87,830 KG 6,000 CX 078 0,54 % 0,00 % 36,00 3.161,88 R$
01010020307-0 CXGG - FRALDINHA RED BOV RESF (DIMEZA) 45,150 KG 3,000 CX 038 0,28 % 0,00 % 44,00 1.986,60 R$
01020020141-0 CXGG - LAGARTO BOV CONG (TOP CARNES) 520,500 KG 20,000 CX 236 3,23 % 0,00 % 31,00 16.135,50 R$
01020020353-0 CXGG - MAMINHA BOV CONG (BOSCATTI) 185,545 KG 8,000 CX 149 1,15 % 0,00 % 38,00 7.050,71 R$
01010020240-0 CXGG - MIOLO ALCATRA BOV RESF (DIMEZA) 554,320 KG 37,000 CX 150 3,44 % 0,00 % 41,00 22.727,12 R$
01020010043-0 CXGG - OSSO PATINHO BOV CONG (TOP CARNES) 150,335 KG 7,000 CX 073 0,93 % 0,00 % 5,00 751,67 R$
01010020246-0 CXGG - PATINHO BOV RESF (DIMEZA) 731,810 KG 28,000 CX 143 4,54 % 0,00 % 33,00 24.149,73 R$
01020020395-0 CXGG - PICANHA (B) BOV CONG (BOSCATTI) 21,845 KG 1,000 CX 019 0,14 % 0,00 % 45,00 983,02 R$
01010020292-0 CXGG - PICANHA BOV RESF (BOSCATTI) 11,250 KG 1,000 CX 009 0,07 % 0,00 % 88,00 990,00 R$
01010020239-0 CXGG - PICANHA BOV RESF (DIMEZA) 161,980 KG 11,000 CX 140 1,00 % 0,00 % 58,00 9.394,84 R$
01010020259-0 CXGG - PICANHA GRILL BOV RESF (DIMEZA) 53,990 KG 4,000 CX 044 0,33 % 0,00 % 80,00 4.319,20 R$
01010020287-0 CXGG - PICANHA STEAK BOV RESF (BOSCATTI) 28,950 KG 2,000 CX 033 0,18 % 0,00 % 42,00 1.215,90 R$
01020020311-0 CXGG - RECORTE CONTRA FILE (BANANINHA) BOV 141,555 KG 9,000 CX 139 0,88 % 0,00 % 30,00 4.246,65 R$
01010990015-0 MP - CONTRA FILE - BOV - RESF 567,500 KG 9,000 CX 009 3,52 % 0,00 % 37,00 20.997,50 R$
01010990012-0 MP - COXAO DURO - BOV - RESF 319,900 KG 6,000 CX 020 1,98 % 0,00 % 31,00 9.916,90 R$
01010990011-0 MP - COXAO MOLE - BOV - RESF 375,500 KG 4,000 CX 004 2,33 % 0,00 % 33,00 12.391,50 R$
01010990043-0 MP - MUSCULO TRASEIRO BOV - RESF 975,000 KG 6,000 CX 006 6,05 % 0,00 % 29,00 28.275,00 R$
01010990014-0 MP - PATINHO BOV RESF 648,000 KG 9,000 CX 009 4,02 % 0,00 % 33,00 21.384,00 R$
01010990019-0 W-MP - RECORTE DO TRASEIRO - BOV - RESF 498,500 KG 9,000 CX 009 3,09 % 0,00 % 12,00 5.982,00 R$
01010990022-0 X-MP - OSSO DO TRASEIRO - BOV - RESF 3.164,000 KG 34,000 CX 030 19,62 % 0,00 % 0,77 2.436,28 R$
01010990023-0 X-MP - SEBO DO TRASEIRO - BOV - RESF 355,000 KG 5,000 CX 005 2,20 % 0,00 % 1,40 497,00 R$
Total: TR 15.895,695 493,000 98,58 % 28,20 448.200,04
RESUMO
Grupo Rendimento Matéria-Prima (kg) Produto Acabado (kg) Rendimento Valor MP (R$) Valor PA (R$) Quebra (R$) M
TR - TRASEIRO 16.124,400 15.895,695 98,58 % 0,00 448.200,04 448.200,04 R$
TOTALIZAÇÃO: 16.124,400 15.895,695 98,58 % 0,00 448.200,04 448.200,04
QUEBRA: 228,705 1,4184 %
Filtros Utilizados: Empresa: 021 Período: 28/08/2026 a 28/08/2026`;
