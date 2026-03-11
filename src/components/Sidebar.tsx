import React from 'react';

interface SidebarProps {
  totalRows: number;
  namesCount: number;
  minAmount: number;
  onMinAmountChange: (amount: number) => void;
  onReset: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  totalRows,
  namesCount,
  minAmount,
  onMinAmountChange,
  onReset,
}) => {
  return (
    <div className="sidebar">
      <h2>⚙️ Settings</h2>
      
      <div className="settings-section">
        <h3>Parsing Settings</h3>
        <label>
          Minimum Amount
          <input
            type="number"
            value={minAmount}
            onChange={(e) => onMinAmountChange(parseInt(e.target.value, 10) || 0)}
            min="0"
            step="50"
            className="input-field"
          />
        </label>
        <p className="help-text">Only amounts ≥ this value will be recorded from messages</p>
      </div>

      <div className="divider" />

      <div className="info-section">
        <h3>📊 Quick Info</h3>
        <ul>
          <li><strong>Total Rows:</strong> {totalRows}</li>
          <li><strong>Names in List:</strong> {namesCount}</li>
          <li><strong>Min Amount:</strong> {minAmount.toLocaleString()}</li>
        </ul>
      </div>

      <div className="divider" />

      <div className="help-section">
        <h3>💡 How to Use</h3>
        <ol>
          <li><strong>Add Names</strong> - Add player names in Step 1</li>
          <li><strong>Select Name</strong> - Choose a name for message entry</li>
          <li><strong>Paste Messages</strong> - Format: <code>number amount</code> (e.g., <code>00 500</code>)</li>
          <li><strong>Parse</strong> - Click "Parse Messages" to extract data</li>
          <li><strong>Edit</strong> - Modify names/messages directly in the table</li>
          <li><strong>Download</strong> - Export your data as CSV</li>
        </ol>
      </div>

      <div className="divider" />

      <button className="btn btn-secondary" onClick={onReset}>
        🔄 Reset All Data
      </button>
    </div>
  );
};
