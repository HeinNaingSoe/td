import React, { useState } from 'react';
import { DataRow } from '../types';
import { getNumberColumns } from '../utils/parser';
import { downloadCSV } from '../utils/dataUtils';

interface DataTableProps {
  rows: DataRow[];
  onUpdateRows: (rows: DataRow[]) => void;
  onParseMessages: () => void;
  onRecalcTotals: () => void;
  onRenumber: () => void;
  onClear: () => void;
}

export const DataTable: React.FC<DataTableProps> = ({
  rows,
  onUpdateRows,
  onParseMessages,
  onRecalcTotals,
  onRenumber,
  onClear,
}) => {
  const [editingCell, setEditingCell] = useState<{ row: number; col: string } | null>(null);
  const [editValue, setEditValue] = useState('');

  const NUM_COLS = getNumberColumns();
  const allColumns = ['No', 'Name', 'Message', ...NUM_COLS, 'Total'];

  const handleCellClick = (rowIdx: number, col: string) => {
    if (col === 'No' || col === 'Total' || NUM_COLS.includes(col)) {
      return; // Disabled columns
    }
    setEditingCell({ row: rowIdx, col });
    setEditValue(String(rows[rowIdx][col] || ''));
  };

  const handleCellBlur = () => {
    if (editingCell) {
      const newRows = [...rows];
      const { row, col } = editingCell;
      
      if (col === 'Name' || col === 'Message') {
        newRows[row][col] = editValue;
      }
      
      onUpdateRows(newRows);
      setEditingCell(null);
      setEditValue('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleCellBlur();
    } else if (e.key === 'Escape') {
      setEditingCell(null);
      setEditValue('');
    }
  };

  const handleDownload = () => {
    downloadCSV(rows);
  };

  if (rows.length === 0) {
    return (
      <div className="data-table">
        <h2 className="section-header">📋 Data Table</h2>
        <p className="info-text">📝 No data yet. Add names and messages above to get started.</p>
      </div>
    );
  }

  return (
    <div className="data-table">
      <h2 className="section-header">📋 Data Table</h2>
      
      <button className="btn btn-primary" onClick={handleDownload}>
        📥 Download CSV
      </button>

      <div className="table-container">
        <table className="data-grid">
          <thead>
            <tr>
              {allColumns.map((col) => (
                <th key={col} className={NUM_COLS.includes(col) ? 'num-col' : ''}>
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIdx) => (
              <tr key={rowIdx}>
                {allColumns.map((col) => {
                  const isEditing = editingCell?.row === rowIdx && editingCell?.col === col;
                  const isDisabled = col === 'No' || col === 'Total' || NUM_COLS.includes(col);
                  const value = row[col] ?? '';

                  return (
                    <td
                      key={col}
                      className={`${isDisabled ? 'disabled' : 'editable'} ${NUM_COLS.includes(col) ? 'num-col' : ''}`}
                      onClick={() => !isDisabled && handleCellClick(rowIdx, col)}
                    >
                      {isEditing ? (
                        <input
                          type="text"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onBlur={handleCellBlur}
                          onKeyDown={handleKeyPress}
                          autoFocus
                          className="cell-input"
                        />
                      ) : (
                        <span>{value}</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="button-group">
        <button className="btn btn-primary" onClick={onParseMessages}>
          🔍 Parse Messages
        </button>
        <button className="btn btn-secondary" onClick={onRecalcTotals}>
          🧮 Recalculate Totals
        </button>
        <button className="btn btn-secondary" onClick={onRenumber}>
          🔄 Renumber Rows
        </button>
        <button className="btn btn-danger" onClick={onClear}>
          🗑️ Clear All
        </button>
      </div>
    </div>
  );
};
