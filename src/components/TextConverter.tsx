import React, { useState, useEffect } from 'react';

interface ConversionRule {
  id: string;
  from: string;
  to: string;
  enabled: boolean;
}

export const TextConverter: React.FC = () => {
  const [rules, setRules] = useState<ConversionRule[]>([]);
  const [inputText, setInputText] = useState('');
  const [outputText, setOutputText] = useState('');
  const [newRuleFrom, setNewRuleFrom] = useState('');
  const [newRuleTo, setNewRuleTo] = useState('');

  // Load rules from localStorage on mount
  useEffect(() => {
    const savedRules = localStorage.getItem('textConverterRules');
    if (savedRules) {
      try {
        setRules(JSON.parse(savedRules));
      } catch (error) {
        console.error('Failed to load conversion rules:', error);
      }
    }
  }, []);

  // Save rules to localStorage whenever rules change
  useEffect(() => {
    if (rules.length > 0) {
      localStorage.setItem('textConverterRules', JSON.stringify(rules));
    }
  }, [rules]);

  // Apply conversions whenever input or rules change
  useEffect(() => {
    applyConversions();
  }, [inputText, rules]);

  const applyConversions = () => {
    let result = inputText;
    
    // Apply enabled rules in order
    const enabledRules = rules.filter(rule => rule.enabled);
    for (const rule of enabledRules) {
      if (rule.from) {
        // Use global replace to replace all occurrences
        result = result.replace(new RegExp(escapeRegex(rule.from), 'g'), rule.to);
      }
    }
    
    setOutputText(result);
  };

  // Escape special regex characters
  const escapeRegex = (str: string): string => {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  };

  const handleAddRule = () => {
    if (!newRuleFrom.trim()) {
      alert('Please enter a "From" string');
      return;
    }

    const newRule: ConversionRule = {
      id: Date.now().toString(),
      from: newRuleFrom.trim(),
      to: newRuleTo.trim(),
      enabled: true,
    };

    setRules([...rules, newRule]);
    setNewRuleFrom('');
    setNewRuleTo('');
  };

  const handleDeleteRule = (id: string) => {
    if (confirm('Are you sure you want to delete this conversion rule?')) {
      setRules(rules.filter(rule => rule.id !== id));
    }
  };

  const handleToggleRule = (id: string) => {
    setRules(
      rules.map(rule =>
        rule.id === id ? { ...rule, enabled: !rule.enabled } : rule
      )
    );
  };

  const handleUpdateRule = (id: string, field: 'from' | 'to', value: string) => {
    setRules(
      rules.map(rule =>
        rule.id === id ? { ...rule, [field]: value } : rule
      )
    );
  };

  const handleCopyOutput = () => {
    navigator.clipboard.writeText(outputText);
    alert('Copied to clipboard!');
  };

  const handleClearInput = () => {
    setInputText('');
    setOutputText('');
  };

  const handleClearRules = () => {
    if (confirm('Are you sure you want to clear all conversion rules?')) {
      setRules([]);
      localStorage.removeItem('textConverterRules');
    }
  };

  return (
    <div className="text-converter">
      <div className="converter-rules-section">
        <div className="section-header">
          <h3>Conversion Rules</h3>
          <button className="btn btn-danger btn-small" onClick={handleClearRules}>
            🗑️ Clear All
          </button>
        </div>

        <div className="add-rule-form">
          <div className="rule-input-group">
            <label>From:</label>
            <input
              type="text"
              value={newRuleFrom}
              onChange={(e) => setNewRuleFrom(e.target.value)}
              placeholder="String to find..."
              className="input-field"
              onKeyPress={(e) => e.key === 'Enter' && handleAddRule()}
            />
          </div>
          <div className="rule-input-group">
            <label>To:</label>
            <input
              type="text"
              value={newRuleTo}
              onChange={(e) => setNewRuleTo(e.target.value)}
              placeholder="String to replace with..."
              className="input-field"
              onKeyPress={(e) => e.key === 'Enter' && handleAddRule()}
            />
          </div>
          <button className="btn btn-primary" onClick={handleAddRule}>
            ➕ Add Rule
          </button>
        </div>

        {rules.length === 0 ? (
          <p className="info-text">No conversion rules yet. Add a rule above to get started.</p>
        ) : (
          <div className="rules-list">
            {rules.map((rule, index) => (
              <div key={rule.id} className="rule-item">
                <div className="rule-number">{index + 1}</div>
                <div className="rule-content">
                  <div className="rule-from-to">
                    <span className="rule-label">From:</span>
                    <input
                      type="text"
                      value={rule.from}
                      onChange={(e) => handleUpdateRule(rule.id, 'from', e.target.value)}
                      className="rule-input"
                      placeholder="From..."
                    />
                  </div>
                  <div className="rule-arrow">→</div>
                  <div className="rule-from-to">
                    <span className="rule-label">To:</span>
                    <input
                      type="text"
                      value={rule.to}
                      onChange={(e) => handleUpdateRule(rule.id, 'to', e.target.value)}
                      className="rule-input"
                      placeholder="To..."
                    />
                  </div>
                </div>
                <div className="rule-actions">
                  <button
                    className={`btn btn-small ${rule.enabled ? 'btn-success' : 'btn-secondary'}`}
                    onClick={() => handleToggleRule(rule.id)}
                    title={rule.enabled ? 'Disable rule' : 'Enable rule'}
                  >
                    {rule.enabled ? '✓' : '○'}
                  </button>
                  <button
                    className="btn btn-danger btn-small"
                    onClick={() => handleDeleteRule(rule.id)}
                    title="Delete rule"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="converter-input-section">
        <h3>Input Text</h3>
        <div className="text-area-controls">
          <button className="btn btn-secondary btn-small" onClick={handleClearInput}>
            🗑️ Clear
          </button>
        </div>
        <textarea
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Paste or type your text here..."
          className="textarea-field"
          rows={8}
        />
      </div>

      <div className="converter-output-section">
        <h3>Converted Output</h3>
        <div className="text-area-controls">
          <button className="btn btn-primary btn-small" onClick={handleCopyOutput}>
            📋 Copy
          </button>
        </div>
        <textarea
          value={outputText}
          readOnly
          placeholder="Converted text will appear here..."
          className="textarea-field output-textarea"
          rows={8}
        />
        {outputText && (
          <p className="info-text">
            {outputText.length} characters • {outputText.split('\n').length} lines
          </p>
        )}
      </div>
    </div>
  );
};
