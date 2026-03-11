import React, { useState } from 'react';

interface MessageInputProps {
  names: string[];
  activeName: string;
  onActiveNameChange: (name: string) => void;
  onAddMessages: (messages: string[]) => void;
  onAddEmptyRow: () => void;
  onAutoParse: () => void;
}

export const MessageInput: React.FC<MessageInputProps> = ({
  names,
  activeName,
  onActiveNameChange,
  onAddMessages,
  onAddEmptyRow,
  onAutoParse,
}) => {
  const [messages, setMessages] = useState('');

  const handleAddMessages = () => {
    if (!activeName || activeName === '(Select a name)') {
      alert('❌ Please select a name first!');
      return;
    }

    const lines = messages
      .split('\n')
      .map(ln => ln.trim())
      .filter(ln => ln);

    if (lines.length === 0) {
      alert('❌ Please paste at least one message line.');
      return;
    }

    onAddMessages(lines);
    setMessages('');
  };

  return (
    <div className="message-input">
      {names.length === 0 ? (
        <div className="warning-box">
          ⚠️ Please add at least one name in Step 1 before adding messages.
        </div>
      ) : (
        <>
          <div className="two-columns">
            <div className="column">
              <label>
                <strong>👤 Select Name for Messages</strong>
              </label>
              <select
                value={activeName}
                onChange={(e) => onActiveNameChange(e.target.value)}
                className="select-field"
              >
                <option>(Select a name)</option>
                {names.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="column">
              <button className="btn btn-secondary" onClick={onAddEmptyRow}>
                ➕ Add Empty Row
              </button>
            </div>
          </div>

          <div className="message-textarea-section">
            <label>
              <strong>Paste Messages</strong> (one message per line)
            </label>
            <textarea
              value={messages}
              onChange={(e) => setMessages(e.target.value)}
              placeholder="Example:&#10;၀၀ ၅၀၀ 19 ၂၀၀ ထိုးပါမည်&#10;01 200 11 500&#10;22 1000ဖိုး"
              className="textarea-field"
              rows={6}
            />
            <p className="help-text">
              Each line will become a separate row. Format: number amount (e.g., '00 500' or '19 200')
            </p>
          </div>

          <div className="button-group">
            <button className="btn btn-primary" onClick={handleAddMessages}>
              ✅ Add Messages for Selected Name
            </button>
            <button className="btn btn-secondary" onClick={onAutoParse}>
              🔄 Auto-Parse All Messages
            </button>
          </div>
        </>
      )}
    </div>
  );
};
