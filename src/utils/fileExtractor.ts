import * as XLSX from 'xlsx';
import * as pdfjsLib from 'pdfjs-dist';

// Configure PDF.js worker
if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
}

/**
 * Extracts raw text from an uploaded file (.txt, .pdf, .xlsx, .xls, .csv).
 */
export async function extractTextFromFile(file: File): Promise<{ text: string; fileType: string }> {
  const extension = file.name.split('.').pop()?.toLowerCase() || '';

  if (extension === 'pdf') {
    const text = await extractTextFromPdf(file);
    return { text, fileType: 'pdf' };
  }

  if (extension === 'xlsx' || extension === 'xls') {
    const text = await extractTextFromExcel(file);
    return { text, fileType: 'excel' };
  }

  // Text, CSV, or other plain text files
  const text = await file.text();
  return { text, fileType: extension || 'text' };
}

/**
 * Extracts text from PDF with layout awareness (groups by vertical line coordinates).
 */
export async function extractTextFromPdf(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({
    data: new Uint8Array(arrayBuffer),
    useSystemFonts: true,
  });

  const pdf = await loadingTask.promise;
  let fullText = '';

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const textContent = await page.getTextContent();
    const items = textContent.items as Array<{ str?: string; transform?: number[] }>;

    if (!items || items.length === 0) continue;

    // Group items by vertical line position (transform[5] is Y coordinate)
    // We quantize Y to ~3 units to capture items that belong on the same line
    const linesMap = new Map<number, Array<{ x: number; text: string }>>();

    for (const item of items) {
      if (!item.str || !item.transform) continue;
      const text = item.str;
      const x = item.transform[4] || 0;
      const y = Math.round((item.transform[5] || 0) / 3) * 3;

      if (!linesMap.has(y)) {
        linesMap.set(y, []);
      }
      linesMap.get(y)!.push({ x, text });
    }

    // Sort lines from top of page to bottom (descending Y in PDF coordinates)
    const sortedY = Array.from(linesMap.keys()).sort((a, b) => b - a);

    for (const y of sortedY) {
      const row = linesMap.get(y)!.sort((a, b) => a.x - b.x);
      // Join items with single space if needed
      const lineText = row.map((r) => r.text).join('   ').trim();
      if (lineText) {
        fullText += lineText + '\n';
      }
    }

    fullText += '\n'; // Page separator
  }

  return fullText;
}

/**
 * Extracts text from Excel spreadsheets (.xlsx, .xls).
 */
export async function extractTextFromExcel(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer, { type: 'array' });
  let combinedText = '';

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) continue;
    const csv = XLSX.utils.sheet_to_csv(sheet, { FS: '   ' });
    if (csv && csv.trim()) {
      combinedText += `=== PLANILHA: ${sheetName} ===\n${csv}\n\n`;
    }
  }

  return combinedText;
}
