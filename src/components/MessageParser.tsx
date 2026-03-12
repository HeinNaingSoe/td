import React, { useEffect, useState } from 'react';
import { User, ParsedBet, ParsingRule, ConversionRule } from '../types';
import { parseMessageWithRulesAndSteps } from '../utils/parser';
import { getParsingRules, getStringConversionRules } from '../services/api';

interface MessageParserProps {
  users: User[];
  selectedUserId: string;
  onUserIdChange: (userId: string) => void;
  onAddBets: (userId: string, bets: ParsedBet[]) => Promise<void>;
}

export const MessageParser: React.FC<MessageParserProps> = ({
  users,
  selectedUserId,
  onUserIdChange,
  onAddBets,
}) => {
  const [rawMessage, setRawMessage] = useState('');
  const [parsedBets, setParsedBets] = useState<ParsedBet[]>([]);
  const [adding, setAdding] = useState(false);
  const [rules, setRules] = useState<ParsingRule[]>([]);
  const [rulesLoading, setRulesLoading] = useState(false);
  const [conversionRules, setConversionRules] = useState<ConversionRule[]>([]);
  const [preprocessedText, setPreprocessedText] = useState<{ step1: string; step2: string; step3: string; step4: string } | null>(null);

  useEffect(() => {
    const loadRules = async () => {
      try {
        setRulesLoading(true);
        const [parsingRulesData, conversionRulesData] = await Promise.all([
          getParsingRules(),
          getStringConversionRules(),
        ]);
        setRules(parsingRulesData || []);
        setConversionRules(conversionRulesData || []);
      } catch (error) {
        console.error('Failed to load rules:', error);
        setRules([]);
        setConversionRules([]);
      } finally {
        setRulesLoading(false);
      }
    };

    loadRules();
  }, []);

  const handleParse = () => {
    if (!rawMessage.trim()) {
      alert('Please enter a message to parse');
      return;
    }

    const minAmount = 100;

    // Prepare rules (ensure numbers array exists)
    const preparedRules = rules
      .filter(r => r.name && r.numbers && r.numbers.length > 0)
      .map(r => ({
        name: r.name,
        numbers: r.numbers || []
      }));

    // Prepare conversion rules (only enabled ones)
    const preparedConversionRules = conversionRules
      .filter(r => r.enabled && r.from)
      .map(r => ({
        from: r.from,
        to: r.to || '',
        enabled: r.enabled,
      }));

    const { bets: mapping, step1, step2, step3, step4 } = parseMessageWithRulesAndSteps(
      rawMessage,
      preparedRules,
      minAmount,
      preparedConversionRules,
    );

    // Set preprocessed text for display
    setPreprocessedText({ step1, step2, step3, step4 });

    if (Object.keys(mapping).length === 0) {
      const hasRules = preparedRules.length > 0;
      const errorMsg = hasRules
        ? 'No valid bets found. Try: "RuleName Amount" (e.g., "၁ပတ် 200") or "00 500"'
        : 'No valid bets found. Add parsing rules first, or use format: "00 500" or "19 200"';
      alert(errorMsg);
      return;
    }

    const bets: ParsedBet[] = Object.entries(mapping)
      .filter(([_, amount]) => amount > 0)
      .map(([number, amount]) => ({
        number: number.padStart(2, '0'),
        amount: amount as number,
        message: rawMessage,
      }))
      .sort((a, b) => a.number.localeCompare(b.number));

    setParsedBets(bets);
  };

  const handleBetChange = (index: number, field: 'number' | 'amount', value: string | number) => {
    const updated = [...parsedBets];
    updated[index] = { ...updated[index], [field]: value };
    setParsedBets(updated);
  };

  const handleDeleteBet = (index: number) => {
    setParsedBets(parsedBets.filter((_, i) => i !== index));
  };

  const handleAddBets = async () => {
    if (!selectedUserId || selectedUserId === '') {
      alert('Please select a user first');
      return;
    }

    if (parsedBets.length === 0) {
      alert('No bets to add. Please parse a message first.');
      return;
    }

    setAdding(true);
    try {
      await onAddBets(selectedUserId, parsedBets);
      setRawMessage('');
      setParsedBets([]);
      alert('Bets added successfully!');
    } catch (error) {
      alert('Failed to add bets');
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="message-parser">
      <div className="user-selector-section">
        <h3>Select User</h3>
        {rulesLoading && (
          <p className="help-text">Loading parsing rules...</p>
        )}
        <select
          value={selectedUserId}
          onChange={(e) => onUserIdChange(e.target.value)}
          className="select-field"
        >
          <option value="">(Select a user)</option>
          {users.map((user) => (
            <option key={user._id} value={user._id}>
              {user._id}
            </option>
          ))}
        </select>
      </div>

      <div className="raw-message-section">
        <h3>Paste Raw Message</h3>
        <textarea
          value={rawMessage}
          onChange={(e) => setRawMessage(e.target.value)}
          placeholder="Paste your message here, e.g.:&#10;၀၀ ၅၀၀ 19 ၂၀၀ ထိုးပါမည်&#10;01 200 11 500"
          className="textarea-field"
          rows={6}
        />
        <button className="btn btn-primary" onClick={handleParse}>
          🔍 Parse Message
        </button>
      </div>

      {preprocessedText && (
        <div className="preprocessed-text-section">
          <h3>Preprocessed Text</h3>
          <div className="preprocessed-steps">
            <div className="preprocessed-step">
              <label>Step 1 (Cleaned):</label>
              <textarea
                value={preprocessedText.step1}
                readOnly
                className="textarea-field preprocessed-textarea"
                rows={3}
              />
            </div>
            <div className="preprocessed-step">
              <label>Step 2 (After String Conversion):</label>
              <textarea
                value={preprocessedText.step2}
                readOnly
                className="textarea-field preprocessed-textarea"
                rows={3}
              />
            </div>
            <div className="preprocessed-step">
              <label>Step 3 (After Parsing Rules):</label>
              <textarea
                value={preprocessedText.step3}
                readOnly
                className="textarea-field preprocessed-textarea"
                rows={3}
              />
            </div>
            <div className="preprocessed-step">
              <label>Step 4 (Keep Only Digits, Commas, Hyphens):</label>
              <textarea
                value={preprocessedText.step4}
                readOnly
                className="textarea-field preprocessed-textarea"
                rows={3}
              />
            </div>
          </div>
        </div>
      )}

      {parsedBets.length > 0 && (
        <div className="parsed-bets-section">
          <h3>Parsed Bets ({parsedBets.length})</h3>
          <p className="help-text">Edit the bets below before adding to user</p>
          <div className="parsed-bets-list">
            {parsedBets.map((bet, idx) => (
              <div key={idx} className="parsed-bet-item">
                <div className="bet-input-group">
                  <label>Number:</label>
                  <input
                    type="text"
                    value={bet.number}
                    onChange={(e) => handleBetChange(idx, 'number', e.target.value)}
                    className="input-field bet-input"
                    placeholder="00"
                    maxLength={2}
                  />
                </div>
                <div className="bet-input-group">
                  <label>Bet:</label>
                  <input
                    type="number"
                    value={bet.amount}
                    onChange={(e) => handleBetChange(idx, 'amount', parseInt(e.target.value) || 0)}
                    className="input-field bet-input"
                    placeholder="200"
                  />
                </div>
                <button
                  className="btn btn-danger btn-small"
                  onClick={() => handleDeleteBet(idx)}
                  title="Remove bet"
                >
                  🗑️
                </button>
              </div>
            ))}
          </div>
          <button
            className="btn btn-primary"
            onClick={handleAddBets}
            disabled={adding || !selectedUserId}
          >
            {adding ? 'Adding...' : '✅ Add Bets to User'}
          </button>
        </div>
      )}
    </div>
  );
};
