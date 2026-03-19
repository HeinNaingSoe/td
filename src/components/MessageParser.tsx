import React, { useEffect, useState, useMemo } from 'react';
import { User, ParsedBet, ParsingRule, ConversionRule, EventType } from '../types';
import { parseMessageWithRulesAndSteps } from '../utils/parser';
import { getParsingRules, getStringConversionRules } from '../services/api';

interface MessageParserProps {
  users: User[];
  selectedUserId: string;
  onUserIdChange: (userId: string) => void;
  onAddBets: (userId: string, bets: ParsedBet[]) => Promise<void>;
  onShowToast: (message: string, type: 'success' | 'error' | 'info') => void;
}

export const MessageParser: React.FC<MessageParserProps> = ({
  users,
  selectedUserId,
  onUserIdChange,
  onAddBets,
  onShowToast,
}) => {
  const [rawMessage, setRawMessage] = useState('');
  const [parsedBets, setParsedBets] = useState<(ParsedBet & { id: string })[]>([]);
  const [adding, setAdding] = useState(false);
  const [rules, setRules] = useState<ParsingRule[]>([]);
  const [rulesLoading, setRulesLoading] = useState(false);
  const [conversionRules, setConversionRules] = useState<ConversionRule[]>([]);
  const [preprocessedText, setPreprocessedText] = useState<{ step1: string; step2: string; step3: string; step4: string } | null>(null);
  
  // Event state - default based on current time
  const getDefaultEvent = (): EventType => {
    const hour = new Date().getHours();
    return hour < 12 ? 'Morning' : 'Afternoon';
  };
  const [event, setEvent] = useState<EventType>(getDefaultEvent());

  // User search state
  const [userSearch, setUserSearch] = useState(selectedUserId);
  const [showUserDropdown, setShowUserDropdown] = useState(false);

  // Sync userSearch with selectedUserId when it changes externally
  useEffect(() => {
    if (selectedUserId) {
      setUserSearch(selectedUserId);
    }
  }, [selectedUserId]);

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
      onShowToast('Please enter a message to parse', 'error');
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
      onShowToast(errorMsg, 'error');
      return;
    }

    const bets: (ParsedBet & { id: string })[] = Object.entries(mapping)
      .filter(([_, amount]) => amount > 0)
      .map(([number, amount]) => ({
        id: `${Date.now()}-${Math.random()}`,
        number: number.padStart(2, '0'),
        amount: amount as number,
        message: rawMessage,
        event: event,
      }))
      .sort((a, b) => a.number.localeCompare(b.number));

    setParsedBets(bets);
  };


  // Filtered and sorted users for searchable select
  const filteredUsers = useMemo(() => {
    if (!userSearch.trim()) return users;
    const searchLower = userSearch.toLowerCase();
    return users.filter(user => user._id.toLowerCase().includes(searchLower));
  }, [users, userSearch]);


  const handleBetChange = (betId: string, field: 'number' | 'amount', value: string | number) => {
    const updated = parsedBets.map(bet => {
      if (bet.id === betId) {
        return { ...bet, [field]: value };
      }
      return bet;
    });
    setParsedBets(updated);
  };

  const handleDeleteBet = (betId: string) => {
    const updated = parsedBets.filter(bet => bet.id !== betId);
    setParsedBets(updated);
  };

  const handleAddRow = () => {
    const newBet: ParsedBet & { id: string } = {
      id: `${Date.now()}-${Math.random()}`,
      number: '00',
      amount: 0,
      message: '',
      event: event,
    };
    setParsedBets([...parsedBets, newBet]);
  };

  const handleUserSelect = (userId: string) => {
    onUserIdChange(userId);
    setUserSearch(userId);
    setShowUserDropdown(false);
  };

  const handleAddBets = async () => {
    if (!selectedUserId || selectedUserId === '') {
      onShowToast('Please select a user first', 'error');
      return;
    }

    if (parsedBets.length === 0) {
      onShowToast('No bets to add. Please parse a message first.', 'error');
      return;
    }

    setAdding(true);
    try {
      // Remove the id field before sending to API
      const betsToAdd: ParsedBet[] = parsedBets.map(({ id, ...bet }) => bet);
      await onAddBets(selectedUserId, betsToAdd);
      setRawMessage('');
      setParsedBets([]);
      setPreprocessedText(null);
      onShowToast('Bets added successfully!', 'success');
    } catch (error) {
      onShowToast('Failed to add bets', 'error');
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="message-parser">
      <div className="event-selector-section">
        <h3>Event</h3>
        <select
          value={event}
          onChange={(e) => setEvent(e.target.value as EventType)}
          className="select-field"
        >
          <option value="Morning">Morning</option>
          <option value="Afternoon">Afternoon</option>
        </select>
      </div>

      <div className="user-selector-section">
        <h3>Select User</h3>
        {rulesLoading && (
          <p className="help-text">Loading parsing rules...</p>
        )}
        <div className="searchable-select-container">
          <input
            type="text"
            value={userSearch}
            onChange={(e) => {
              setUserSearch(e.target.value);
              setShowUserDropdown(true);
            }}
            onFocus={() => setShowUserDropdown(true)}
            onBlur={() => setTimeout(() => setShowUserDropdown(false), 200)}
            placeholder="Type to search user..."
            className="input-field searchable-select-input"
          />
          {showUserDropdown && filteredUsers.length > 0 && (
            <div className="searchable-select-dropdown">
              {filteredUsers.map((user) => (
                <div
                  key={user._id}
                  className={`searchable-select-option ${selectedUserId === user._id ? 'selected' : ''}`}
                  onClick={() => handleUserSelect(user._id)}
                >
                  {user._id}
                </div>
              ))}
            </div>
          )}
        </div>
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
          <div className="table-header">
            <h3>
              Parsed Bets ({parsedBets.length}) - Total: {parsedBets.reduce((sum, bet) => sum + bet.amount, 0).toLocaleString()}
            </h3>
            <button
              className="btn btn-secondary"
              onClick={handleAddRow}
              title="Add new bet row"
            >
              ➕ Add Row
            </button>
          </div>
          <div className="table-container">
            <table className="data-grid interactive-table">
              <thead>
                <tr>
                  <th>Bet Number</th>
                  <th>Amount</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {parsedBets.map((bet) => (
                  <tr key={bet.id}>
                    <td>
                      <input
                        type="text"
                        value={bet.number}
                        onChange={(e) => handleBetChange(bet.id, 'number', e.target.value)}
                        className="cell-input"
                        maxLength={2}
                        style={{ width: '80px' }}
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        value={bet.amount === 0 ? '' : bet.amount}
                        onChange={(e) => {
                          const raw = e.target.value || '';
                          const normalized = raw.replace(/^0+(?=\d)/, '');
                          const amt = normalized === '' ? 0 : parseInt(normalized, 10);
                          handleBetChange(bet.id, 'amount', isNaN(amt) ? 0 : amt);
                        }}
                        className="cell-input"
                        style={{ width: '120px' }}
                        placeholder="Amount..."
                      />
                    </td>
                    <td>
                      <button
                        className="btn btn-danger btn-small"
                        onClick={() => handleDeleteBet(bet.id)}
                        title="Remove bet"
                      >
                        🗑️
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button
            className="btn btn-primary"
            onClick={handleAddBets}
            disabled={adding || !selectedUserId}
            style={{ marginTop: '1rem' }}
          >
            {adding ? 'Adding...' : '✅ Add Bets to User'}
          </button>
        </div>
      )}
    </div>
  );
};
