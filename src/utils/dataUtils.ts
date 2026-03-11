import { DataRow } from '../types';
import { parseMessage, getNumberColumns } from './parser';

const NUM_COLS = getNumberColumns();

/**
 * Create an empty data row
 */
export function createEmptyRow(): DataRow {
  const row: DataRow = {
    No: 0,
    Name: '',
    Message: '',
    Total: 0,
  };
  NUM_COLS.forEach(col => {
    row[col] = 0;
  });
  return row;
}

/**
 * Normalize and validate data row
 */
export function normalizeRow(row: DataRow): DataRow {
  const normalized: DataRow = {
    No: typeof row.No === 'number' ? row.No : 0,
    Name: (row.Name || '').toString().trim(),
    Message: (row.Message || '').toString(),
    Total: 0,
  };
  
  NUM_COLS.forEach(col => {
    const val = row[col];
    normalized[col] = typeof val === 'number' ? val : 0;
  });
  
  return normalized;
}

/**
 * Recalculate row based on message parsing
 */
export function recalcRow(row: DataRow, minAmount: number): DataRow {
  const normalized = normalizeRow(row);
  const mapping = parseMessage(normalized.Message, minAmount);
  
  // Reset all number columns
  NUM_COLS.forEach(col => {
    normalized[col] = 0;
  });
  
  // Set parsed values
  Object.entries(mapping).forEach(([key, value]) => {
    if (NUM_COLS.includes(key)) {
      normalized[key] = value;
    }
  });
  
  // Calculate total
  normalized.Total = Object.values(mapping).reduce((sum, val) => sum + val, 0);
  
  return normalized;
}

/**
 * Renumber rows based on unique names
 */
export function renumberRows(rows: DataRow[]): DataRow[] {
  const nameToNo: Map<string, number> = new Map();
  let nextNo = 1;
  
  const result = rows.map(row => {
    const normalized = normalizeRow(row);
    const name = normalized.Name;
    
    if (name && !nameToNo.has(name)) {
      nameToNo.set(name, nextNo);
      nextNo++;
    }
    
    normalized.No = nameToNo.get(name) || 0;
    return normalized;
  });
  
  return result;
}

/**
 * Recalculate totals from number columns
 */
export function recalcTotals(rows: DataRow[]): DataRow[] {
  return rows.map(row => {
    const normalized = normalizeRow(row);
    const total = NUM_COLS.reduce((sum, col) => {
      return sum + (typeof normalized[col] === 'number' ? normalized[col] : 0);
    }, 0);
    normalized.Total = total;
    return normalized;
  });
}

/**
 * Convert data to CSV string
 */
export function toCSV(rows: DataRow[]): string {
  if (rows.length === 0) return '';
  
  const headers = ['No', 'Name', 'Message', ...NUM_COLS, 'Total'];
  const lines = [headers.join(',')];
  
  rows.forEach(row => {
    const values = headers.map(header => {
      const val = row[header] ?? '';
      // Escape commas and quotes in CSV
      if (typeof val === 'string' && (val.includes(',') || val.includes('"'))) {
        return `"${val.replace(/"/g, '""')}"`;
      }
      return val;
    });
    lines.push(values.join(','));
  });
  
  return lines.join('\n');
}

/**
 * Download CSV file
 */
export function downloadCSV(rows: DataRow[], filename: string = 'betting_table.csv'): void {
  const csv = toCSV(rows);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
