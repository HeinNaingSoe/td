import { useState } from 'react';

interface NameManagerProps {
  names: string[];
  onAddName: (name: string) => void;
  onAddNames: (names: string[]) => void;
  onRemoveName: (name: string) => void;
}

export const NameManager: React.FC<NameManagerProps> = ({
  names,
  onAddName,
  onAddNames,
  onRemoveName,
}) => {
  const [nameInput, setNameInput] = useState('');
  const [removeName, setRemoveName] = useState('');

  const handleAddNames = () => {
    const lines = nameInput
      .split('\n')
      .map(ln => ln.trim())
      .filter(ln => ln);
    
    if (lines.length === 0) return;
    
    const newNames = lines.filter(nm => !names.includes(nm));
    if (newNames.length > 0) {
      if (newNames.length === 1) {
        onAddName(newNames[0]);
      } else {
        onAddNames(newNames);
      }
      setNameInput('');
    }
  };

  const handleRemove = () => {
    if (removeName) {
      onRemoveName(removeName);
      setRemoveName('');
    }
  };

  return (
    <div className="name-manager">
      <div className="name-input-section">
        <div className="column">
          <h3>Add Names</h3>
          <p className="help-text">
            Enter a single name or multiple names (one per line)
          </p>
          <textarea
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            placeholder="Enter a single name:&#10;Mg Mg&#10;&#10;Or multiple names (one per line):&#10;Aye Aye&#10;Ko Ko&#10;Hnin Ei Ei"
            className="textarea-field"
            rows={6}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                handleAddNames();
              }
            }}
          />
          <button className="btn btn-primary" onClick={handleAddNames}>
            ➕ Add Name(s)
          </button>
          <p className="help-text" style={{ marginTop: '0.5rem', fontSize: '0.8rem' }}>
            Tip: Press Ctrl+Enter (or Cmd+Enter on Mac) to quickly add names
          </p>
        </div>
      </div>

      <div className="names-list">
        <h3>📝 Names List ({names.length} total)</h3>
        {names.length > 0 ? (
          <>
            <div className="names-grid">
              {names.map((name, idx) => (
                <div key={idx} className="name-item">
                  <strong>{idx + 1}.</strong> {name}
                </div>
              ))}
            </div>
            
            <div className="remove-section">
              <select
                value={removeName}
                onChange={(e) => setRemoveName(e.target.value)}
                className="select-field"
              >
                <option value="">(select to remove)</option>
                {names.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
              <button
                className="btn btn-secondary"
                onClick={handleRemove}
                disabled={!removeName}
              >
                🗑️ Remove Selected Name
              </button>
            </div>
          </>
        ) : (
          <p className="info-text">👆 No names yet. Add names above.</p>
        )}
      </div>
    </div>
  );
};
