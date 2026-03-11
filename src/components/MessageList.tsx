import React from 'react';
import { DataRow } from '../types';

interface MessageListProps {
  rows: DataRow[];
  onUpdateRow: (index: number, row: DataRow) => void;
  onDeleteRow: (index: number) => void;
  onParseMessages: () => void;
}

export const MessageList: React.FC<MessageListProps> = ({
  rows,
  onUpdateRow,
  onDeleteRow,
  onParseMessages,
}) => {
  const handleNameChange = (index: number, value: string) => {
    const updated = { ...rows[index], Name: value };
    onUpdateRow(index, updated);
  };

  const handleMessageChange = (index: number, value: string) => {
    const updated = { ...rows[index], Message: value };
    onUpdateRow(index, updated);
  };

  if (rows.length === 0) {
    return (
      <div className="message-list">
        <p className="info-text">📝 No messages yet. Add messages above to get started.</p>
      </div>
    );
  }

  return (
    <div className="message-list">
      <div className="message-list-header">
        <h3>Messages ({rows.length} total)</h3>
        <button className="btn btn-primary" onClick={onParseMessages}>
          🔍 Parse All Messages
        </button>
      </div>

      <div className="messages-container">
        {rows.map((row, idx) => (
          <div key={idx} className="message-item">
            <div className="message-item-header">
              <span className="message-number">#{row.No || idx + 1}</span>
              <button
                className="btn btn-danger btn-small"
                onClick={() => onDeleteRow(idx)}
                title="Delete row"
              >
                🗑️
              </button>
            </div>
            <div className="message-item-content">
              <div className="message-field">
                <label>Name:</label>
                <input
                  type="text"
                  value={row.Name || ''}
                  onChange={(e) => handleNameChange(idx, e.target.value)}
                  className="input-field"
                  placeholder="Enter name"
                />
              </div>
              <div className="message-field">
                <label>Message:</label>
                <textarea
                  value={row.Message || ''}
                  onChange={(e) => handleMessageChange(idx, e.target.value)}
                  className="textarea-field"
                  rows={2}
                  placeholder="e.g., 00 500 19 200"
                />
              </div>
              {row.Total && row.Total > 0 && (
                <div className="message-total">
                  <strong>Total: {row.Total.toLocaleString()}</strong>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
