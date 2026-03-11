import React, { useState, useEffect, useRef } from 'react';
import { ConversionRule } from '../types';
import {
  getStringConversionRules,
  createStringConversionRule,
  updateStringConversionRule,
  deleteStringConversionRule,
} from '../services/api';

export const TextConverter: React.FC = () => {
  const [rules, setRules] = useState<ConversionRule[]>([]);
  const [inputText, setInputText] = useState('');
  const [outputText, setOutputText] = useState('');
  const [newRuleFrom, setNewRuleFrom] = useState('');
  const [newRuleTo, setNewRuleTo] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const updateTimeoutRef = useRef<Record<string, number>>({});

  // Load rules from MongoDB on mount
  useEffect(() => {
    loadRules();
  }, []);

  const loadRules = async () => {
    try {
      setLoading(true);
      const data = await getStringConversionRules();
      setRules(data || []);
    } catch (error) {
      console.error('Failed to load conversion rules:', error);
      alert('Failed to load conversion rules. Please check if the backend server is running.');
    } finally {
      setLoading(false);
    }
  };

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

  const handleAddRule = async () => {
    if (!newRuleFrom.trim()) {
      alert('Please enter a "From" string');
      return;
    }

    setSaving(true);
    try {
      const newRule = await createStringConversionRule({
        from: newRuleFrom.trim(),
        to: newRuleTo.trim(),
        enabled: true,
      });
      setRules([...rules, newRule]);
      setNewRuleFrom('');
      setNewRuleTo('');
    } catch (error: any) {
      alert(error.message || 'Failed to add conversion rule');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteRule = async (ruleId: string) => {
    if (!ruleId || !confirm('Are you sure you want to delete this conversion rule?')) {
      return;
    }

    try {
      await deleteStringConversionRule(ruleId);
      setRules(rules.filter(rule => rule._id !== ruleId));
    } catch (error: any) {
      alert(error.message || 'Failed to delete conversion rule');
    }
  };

  const handleToggleRule = async (ruleId: string) => {
    if (!ruleId) return;

    const rule = rules.find(r => r._id === ruleId);
    if (!rule) return;

    try {
      const updatedRule = await updateStringConversionRule(ruleId, {
        enabled: !rule.enabled,
      });
      setRules(
        rules.map(r => (r._id === ruleId ? updatedRule : r))
      );
    } catch (error: any) {
      alert(error.message || 'Failed to update conversion rule');
    }
  };

  const handleUpdateRule = (ruleId: string, field: 'from' | 'to', value: string) => {
    if (!ruleId) return;

    // Update local state immediately for responsive UI
    setRules(
      rules.map(rule => 
        rule._id === ruleId ? { ...rule, [field]: value } : rule
      )
    );

    // Clear existing timeout for this rule
    if (updateTimeoutRef.current[ruleId]) {
      clearTimeout(updateTimeoutRef.current[ruleId]);
    }

    // Debounce the API call (wait 1 second after last keystroke)
    updateTimeoutRef.current[ruleId] = setTimeout(async () => {
      try {
        const updatedRule = await updateStringConversionRule(ruleId, {
          [field]: value,
        });
        setRules(
          rules.map(rule => (rule._id === ruleId ? updatedRule : rule))
        );
      } catch (error: any) {
        alert(error.message || 'Failed to update conversion rule');
        // Reload rules on error to restore correct state
        loadRules();
      }
      delete updateTimeoutRef.current[ruleId];
    }, 1000);
  };

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      Object.values(updateTimeoutRef.current).forEach(timeout => clearTimeout(timeout));
    };
  }, []);

  const handleCopyOutput = () => {
    navigator.clipboard.writeText(outputText);
    alert('Copied to clipboard!');
  };

  const handleClearInput = () => {
    setInputText('');
    setOutputText('');
  };

  const handleClearRules = async () => {
    if (!confirm('Are you sure you want to clear all conversion rules?')) {
      return;
    }

    try {
      // Delete all rules one by one
      const deletePromises = rules.map(rule => 
        rule._id ? deleteStringConversionRule(rule._id) : Promise.resolve()
      );
      await Promise.all(deletePromises);
      setRules([]);
    } catch (error: any) {
      alert(error.message || 'Failed to clear conversion rules');
    }
  };

  if (loading) {
    return <div className="loading-state">Loading conversion rules...</div>;
  }

  return (
    <div className="text-converter">
      <div className="converter-rules-section">
        <div className="section-header">
          <h3>Conversion Rules</h3>
          <button 
            className="btn btn-danger btn-small" 
            onClick={handleClearRules}
            disabled={rules.length === 0 || saving}
          >
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
              onKeyPress={(e) => e.key === 'Enter' && !saving && handleAddRule()}
              disabled={saving}
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
              onKeyPress={(e) => e.key === 'Enter' && !saving && handleAddRule()}
              disabled={saving}
            />
          </div>
          <button 
            className="btn btn-primary" 
            onClick={handleAddRule}
            disabled={saving}
          >
            {saving ? '⏳ Adding...' : '➕ Add Rule'}
          </button>
        </div>

        {rules.length === 0 ? (
          <p className="info-text">No conversion rules yet. Add a rule above to get started.</p>
        ) : (
          <div className="rules-list">
            {rules.map((rule, index) => (
              <div key={rule._id || index} className="rule-item">
                <div className="rule-number">{index + 1}</div>
                <div className="rule-content">
                  <div className="rule-from-to">
                    <span className="rule-label">From:</span>
                    <input
                      type="text"
                      value={rule.from}
                      onChange={(e) => handleUpdateRule(rule._id || '', 'from', e.target.value)}
                      className="rule-input"
                      placeholder="From..."
                      disabled={saving}
                    />
                  </div>
                  <div className="rule-arrow">→</div>
                  <div className="rule-from-to">
                    <span className="rule-label">To:</span>
                    <input
                      type="text"
                      value={rule.to}
                      onChange={(e) => handleUpdateRule(rule._id || '', 'to', e.target.value)}
                      className="rule-input"
                      placeholder="To..."
                      disabled={saving}
                    />
                  </div>
                </div>
                <div className="rule-actions">
                  <button
                    className={`btn btn-small ${rule.enabled ? 'btn-success' : 'btn-secondary'}`}
                    onClick={() => handleToggleRule(rule._id || '')}
                    title={rule.enabled ? 'Disable rule' : 'Enable rule'}
                    disabled={saving || !rule._id}
                  >
                    {rule.enabled ? '✓' : '○'}
                  </button>
                  <button
                    className="btn btn-danger btn-small"
                    onClick={() => handleDeleteRule(rule._id || '')}
                    title="Delete rule"
                    disabled={saving || !rule._id}
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
