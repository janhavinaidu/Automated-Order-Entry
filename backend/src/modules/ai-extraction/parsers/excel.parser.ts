import XLSX from 'xlsx';

/**
 * Reads an Excel/XLSX/CSV file and converts all sheets to a CSV-formatted string.
 * Each sheet is prefixed with its name for context.
 * @param filePath - Absolute path to the spreadsheet file
 * @returns Multi-sheet text representation
 */
export const extractTextFromExcel = (filePath: string): string => {
  const workbook = XLSX.readFile(filePath);
  const lines: string[] = [];

  workbook.SheetNames.forEach((sheetName) => {
    lines.push(`=== Sheet: ${sheetName} ===`);
    const sheet = workbook.Sheets[sheetName];
    const csv = XLSX.utils.sheet_to_csv(sheet);
    lines.push(csv);
  });

  return lines.join('\n');
};
