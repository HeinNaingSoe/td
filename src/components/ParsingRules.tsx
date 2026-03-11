import React, { useState, useEffect } from 'react';
import { ParsingRule } from '../types';
import { getParsingRules, createParsingRule, updateParsingRule, deleteParsingRule } from '../services/api';

export const ParsingRules: React.FC = () => {
  const [rules, setRules] = useState<ParsingRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingRule, setEditingRule] = useState<ParsingRule | null>(null);
  const [formData, setFormData] = useState({ name: '', numbers: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadRules();
  }, []);

  const loadRules = async () => {
    try {
      setLoading(true);
      const data = await getParsingRules();
      setRules(data || []);
    } catch (error) {
      console.error('Failed to load rules:', error);
      setRules([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.numbers.trim()) {
      alert('Please fill in both name and numbers');
      return;
    }

    // Parse numbers from comma-separated string
    const numbersArray = formData.numbers
      .split(',')
      .map(n => n.trim())
      .filter(n => n)
      .map(n => n.padStart(2, '0')); // Ensure 2-digit format

    if (numbersArray.length === 0) {
      alert('Please enter at least one number');
      return;
    }

    setSaving(true);
    try {
      if (editingRule?._id) {
        // Update existing rule
        await updateParsingRule(editingRule._id, {
          name: formData.name.trim(),
          numbers: numbersArray,
        });
      } else {
        // Create new rule
        await createParsingRule({
          name: formData.name.trim(),
          numbers: numbersArray,
        });
      }
      await loadRules();
      setFormData({ name: '', numbers: '' });
      setEditingRule(null);
    } catch (error: any) {
      alert(error.message || 'Failed to save rule');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (rule: ParsingRule) => {
    setEditingRule(rule);
    setFormData({
      name: rule.name,
      numbers: rule.numbers.join(', '),
    });
  };

  const handleDelete = async (ruleId: string) => {
    if (!confirm('Are you sure you want to delete this rule?')) return;
    try {
      await deleteParsingRule(ruleId);
      await loadRules();
    } catch (error) {
      alert('Failed to delete rule');
    }
  };

  const handleCancel = () => {
    setFormData({ name: '', numbers: '' });
    setEditingRule(null);
  };

  if (loading) {
    return <div className="loading-state">Loading parsing rules...</div>;
  }

  return (
    <div className="parsing-rules">
      <div className="rules-form-section">
        <h3>{editingRule ? 'Edit Rule' : 'Add New Rule'}</h3>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Rule Name:</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., ၁ပတ်"
              className="input-field"
              required
            />
          </div>
          <div className="form-group">
            <label>Numbers (comma-separated):</label>
            <textarea
              value={formData.numbers}
              onChange={(e) => setFormData({ ...formData, numbers: e.target.value })}
              placeholder="e.g., 10,11,12,13,14,15,16,17,18,19,21,31,41,51,61,71,81,91,01"
              className="textarea-field"
              rows={3}
              required
            />
            <p className="help-text">
              Enter numbers separated by commas. They will be automatically formatted to 2 digits (e.g., 1 becomes 01).
            </p>
          </div>
          <div className="button-group">
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving...' : editingRule ? 'Update Rule' : '➕ Add Rule'}
            </button>
            {editingRule && (
              <button type="button" className="btn btn-secondary" onClick={handleCancel}>
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>

      <div className="rules-list-section">
        <h3>Parsing Rules ({rules.length} total)</h3>
        {rules.length === 0 ? (
          <p className="info-text">No rules yet. Add a rule above to get started.</p>
        ) : (
          <div className="table-container">
            <table className="data-grid">
              <thead>
                <tr>
                  <th>No</th>
                  <th>Rule Name</th>
                  <th>Numbers</th>
                  <th>Count</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {rules.map((rule, idx) => (
                  <tr key={rule._id}>
                    <td>{idx + 1}</td>
                    <td className="editable">{rule.name}</td>
                    <td>
                      <div style={{ maxWidth: '400px', overflow: 'auto' }}>
                        {rule.numbers.join(', ')}
                      </div>
                    </td>
                    <td>{rule.numbers.length}</td>
                    <td>
                      <div className="action-buttons">
                        <button
                          className="btn btn-secondary btn-small"
                          onClick={() => handleEdit(rule)}
                          title="Edit rule"
                        >
                          ✏️
                        </button>
                        <button
                          className="btn btn-danger btn-small"
                          onClick={() => rule._id && handleDelete(rule._id)}
                          title="Delete rule"
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
