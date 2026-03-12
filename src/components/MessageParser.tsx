import React, { useEffect, useState, useMemo } from 'react';
import { User, ParsedBet, ParsingRule, ConversionRule, EventType } from '../types';
import { parseMessageWithRulesAndSteps } from '../utils/parser';
import { getParsingRules, getStringConversionRules } from '../services/api';

type BetSortField = 'number' | 'amount';
type SortDirection = 'asc' | 'desc';
type Operator = '=' | '>' | '>=' | '<' | '<=';

interface NumericFilter {
  operator: Operator;
  value: string;
}

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

  // Parsed bets table state
  const [betSortField, setBetSortField] = useState<BetSortField>('number');
  const [betSortDirection, setBetSortDirection] = useState<SortDirection>('asc');
  const [betNumberFilter, setBetNumberFilter] = useState('');
  const [betAmountFilter, setBetAmountFilter] = useState<NumericFilter>({ operator: '=', value: '' });

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

  // Filtered and sorted parsed bets
  const filteredParsedBets = useMemo(() => {
    let filtered = [...parsedBets];

    // Apply number filter
    if (betNumberFilter.trim()) {
      const searchLower = betNumberFilter.toLowerCase();
      filtered = filtered.filter(bet => bet.number.includes(searchLower));
    }

    // Apply amount filter
    if (betAmountFilter.value.trim()) {
      const filterValue = parseFloat(betAmountFilter.value);
      if (!isNaN(filterValue)) {
        filtered = filtered.filter(bet => {
          switch (betAmountFilter.operator) {
            case '=':
              return bet.amount === filterValue;
            case '>':
              return bet.amount > filterValue;
            case '>=':
              return bet.amount >= filterValue;
            case '<':
              return bet.amount < filterValue;
            case '<=':
              return bet.amount <= filterValue;
            default:
              return true;
          }
        });
      }
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aVal: any, bVal: any;
      if (betSortField === 'number') {
        aVal = parseInt(a.number, 10);
        bVal = parseInt(b.number, 10);
      } else {
        aVal = a.amount;
        bVal = b.amount;
      }
      return betSortDirection === 'asc' ? aVal - bVal : bVal - aVal;
    });

    return filtered;
  }, [parsedBets, betNumberFilter, betAmountFilter, betSortField, betSortDirection]);

  const handleBetChange = (betNumber: string, betAmount: number, field: 'number' | 'amount', value: string | number) => {
    const updated = parsedBets.map(bet => {
      // Find the bet by matching both number and amount (to handle duplicates)
      if (bet.number === betNumber && bet.amount === betAmount) {
        return { ...bet, [field]: value };
      }
      return bet;
    });
    setParsedBets(updated);
  };

  const handleDeleteBet = (betNumber: string, betAmount: number) => {
    // Remove the first matching bet (in case of duplicates)
    const index = parsedBets.findIndex(bet => bet.number === betNumber && bet.amount === betAmount);
    if (index !== -1) {
      const updated = [...parsedBets];
      updated.splice(index, 1);
      setParsedBets(updated);
    }
  };

  const handleBetSort = (field: BetSortField) => {
    if (betSortField === field) {
      setBetSortDirection(betSortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setBetSortField(field);
      setBetSortDirection('asc');
    }
  };

  const handleUserSelect = (userId: string) => {
    onUserIdChange(userId);
    setUserSearch(userId);
    setShowUserDropdown(false);
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
      setPreprocessedText(null);
      alert('Bets added successfully!');
    } catch (error) {
      alert('Failed to add bets');
    } finally {
      setAdding(false);
    }
  };

  const SortIcon: React.FC<{ field: BetSortField; currentField: BetSortField; direction: SortDirection }> = ({ field, currentField, direction }) => {
    if (field !== currentField) return <span style={{ opacity: 0.3 }}>⇅</span>;
    return direction === 'asc' ? <span>↑</span> : <span>↓</span>;
  };

  const NumericFilterInput: React.FC<{
    filter: NumericFilter;
    onChange: (filter: NumericFilter) => void;
    placeholder?: string;
  }> = ({ filter, onChange, placeholder = 'Value...' }) => {
    return (
      <div className="numeric-filter">
        <select
          value={filter.operator}
          onChange={(e) => onChange({ ...filter, operator: e.target.value as Operator })}
          className="operator-select"
        >
          <option value="=">=</option>
          <option value=">">&gt;</option>
          <option value=">=">&gt;=</option>
          <option value="<">&lt;</option>
          <option value="<=">&lt;=</option>
        </select>
        <input
          type="number"
          value={filter.value}
          onChange={(e) => onChange({ ...filter, value: e.target.value })}
          placeholder={placeholder}
          className="numeric-filter-input"
        />
      </div>
    );
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
          </div>
          <div className="table-container">
            <table className="data-grid interactive-table">
              <thead>
                <tr>
                  <th onClick={() => handleBetSort('number')} className="sortable">
                    Bet Number <SortIcon field="number" currentField={betSortField} direction={betSortDirection} />
                  </th>
                  <th onClick={() => handleBetSort('amount')} className="sortable">
                    Amount <SortIcon field="amount" currentField={betSortField} direction={betSortDirection} />
                  </th>
                  <th>Actions</th>
                </tr>
                <tr className="filter-row">
                  <th>
                    <input
                      type="text"
                      placeholder="🔍 Filter..."
                      value={betNumberFilter}
                      onChange={(e) => setBetNumberFilter(e.target.value)}
                      className="column-filter-input"
                    />
                  </th>
                  <th>
                    <NumericFilterInput
                      filter={betAmountFilter}
                      onChange={setBetAmountFilter}
                      placeholder="Amount..."
                    />
                  </th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filteredParsedBets.map((bet, idx) => (
                  <tr key={`${bet.number}-${bet.amount}-${idx}`}>
                    <td>
                      <input
                        type="text"
                        value={bet.number}
                        onChange={(e) => handleBetChange(bet.number, bet.amount, 'number', e.target.value)}
                        className="cell-input"
                        maxLength={2}
                        style={{ width: '80px' }}
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        value={bet.amount}
                        onChange={(e) => handleBetChange(bet.number, bet.amount, 'amount', parseInt(e.target.value) || 0)}
                        className="cell-input"
                        style={{ width: '120px' }}
                      />
                    </td>
                    <td>
                      <button
                        className="btn btn-danger btn-small"
                        onClick={() => handleDeleteBet(bet.number, bet.amount)}
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
