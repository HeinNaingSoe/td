import React, { useState, useEffect, useMemo } from 'react';
import { User, SummaryItem, Bet } from '../types';
import { getSummary } from '../services/api';

interface SummaryViewProps {
  users: User[];
}

interface NumberSummary {
  number: string;
  totalAmount: number;
  betCount: number;
  users: string[];
}

type SortField = 'userId' | 'total' | 'betCount' | 'average';
type SortDirection = 'asc' | 'desc';
type NumberSortField = 'number' | 'totalAmount' | 'betCount';
type Operator = '=' | '>' | '>=' | '<' | '<=';

interface NumericFilter {
  operator: Operator;
  value: string;
}

export const SummaryView: React.FC<SummaryViewProps> = ({ users }) => {
  const [selectedUserId, setSelectedUserId] = useState<string>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [summary, setSummary] = useState<SummaryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'users' | 'numbers'>('users');
  
  // User Summary table state
  const [userSearch, setUserSearch] = useState('');
  const [userSortField, setUserSortField] = useState<SortField>('total');
  const [userSortDirection, setUserSortDirection] = useState<SortDirection>('desc');
  const [userBetCountFilter, setUserBetCountFilter] = useState<NumericFilter>({ operator: '=', value: '' });
  const [userTotalFilter, setUserTotalFilter] = useState<NumericFilter>({ operator: '=', value: '' });
  const [userAverageFilter, setUserAverageFilter] = useState<NumericFilter>({ operator: '=', value: '' });
  
  // Number Summary table state
  const [numberSearch, setNumberSearch] = useState('');
  const [numberUserSearch, setNumberUserSearch] = useState('');
  const [numberSortField, setNumberSortField] = useState<NumberSortField>('totalAmount');
  const [numberSortDirection, setNumberSortDirection] = useState<SortDirection>('desc');
  const [numberBetCountFilter, setNumberBetCountFilter] = useState<NumericFilter>({ operator: '=', value: '' });
  const [numberTotalAmountFilter, setNumberTotalAmountFilter] = useState<NumericFilter>({ operator: '=', value: '' });

  useEffect(() => {
    loadSummary();
  }, [selectedUserId, startDate, endDate]);

  const loadSummary = async () => {
    setLoading(true);
    try {
      const data = await getSummary(
        selectedUserId === 'all' ? undefined : selectedUserId,
        startDate || undefined,
        endDate || undefined
      );
      setSummary(data || []);
    } catch (error) {
      console.error('Failed to load summary:', error);
      setSummary([]);
    } finally {
      setLoading(false);
    }
  };

  // Set default date range (current month)
  useEffect(() => {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    setStartDate(firstDay.toISOString().split('T')[0]);
    setEndDate(lastDay.toISOString().split('T')[0]);
  }, []);

  // Calculate number summary from bets
  const numberSummary = useMemo(() => {
    const numberMap = new Map<string, { totalAmount: number; betCount: number; users: Set<string> }>();
    
    summary.forEach((item) => {
      (item.bets || []).forEach((bet: Bet) => {
        const num = bet.number.padStart(2, '0');
        const existing = numberMap.get(num) || { totalAmount: 0, betCount: 0, users: new Set<string>() };
        existing.totalAmount += bet.amount || 0;
        existing.betCount += 1;
        existing.users.add(item.userId);
        numberMap.set(num, existing);
      });
    });

    const result: NumberSummary[] = [];
    for (let i = 0; i <= 99; i++) {
      const num = i.toString().padStart(2, '0');
      const data = numberMap.get(num) || { totalAmount: 0, betCount: 0, users: new Set<string>() };
      result.push({
        number: num,
        totalAmount: data.totalAmount,
        betCount: data.betCount,
        users: Array.from(data.users),
      });
    }
    
    return result;
  }, [summary]);

  // Helper function to apply numeric filter
  const applyNumericFilter = (value: number, filter: NumericFilter): boolean => {
    if (!filter.value.trim()) return true;
    const filterValue = parseFloat(filter.value);
    if (isNaN(filterValue)) return true;
    
    switch (filter.operator) {
      case '=':
        return value === filterValue;
      case '>':
        return value > filterValue;
      case '>=':
        return value >= filterValue;
      case '<':
        return value < filterValue;
      case '<=':
        return value <= filterValue;
      default:
        return true;
    }
  };

  // Filtered and sorted user summary
  const filteredUserSummary = useMemo(() => {
    let filtered = [...summary];
    
    // Apply string search filter (User Name)
    if (userSearch.trim()) {
      const searchLower = userSearch.toLowerCase();
      filtered = filtered.filter(item => 
        item.userId.toLowerCase().includes(searchLower)
      );
    }
    
    // Apply numeric filters
    filtered = filtered.filter(item => {
      const betCount = item.betCount || 0;
      const total = item.total || 0;
      const avgBet = betCount > 0 ? total / betCount : 0;
      
      return (
        applyNumericFilter(betCount, userBetCountFilter) &&
        applyNumericFilter(total, userTotalFilter) &&
        applyNumericFilter(avgBet, userAverageFilter)
      );
    });
    
    // Apply sorting
    filtered.sort((a, b) => {
      let aVal: any, bVal: any;
      
      switch (userSortField) {
        case 'userId':
          aVal = a.userId;
          bVal = b.userId;
          break;
        case 'total':
          aVal = a.total || 0;
          bVal = b.total || 0;
          break;
        case 'betCount':
          aVal = a.betCount || 0;
          bVal = b.betCount || 0;
          break;
        case 'average':
          aVal = (a.betCount || 0) > 0 ? (a.total || 0) / (a.betCount || 1) : 0;
          bVal = (b.betCount || 0) > 0 ? (b.total || 0) / (b.betCount || 1) : 0;
          break;
        default:
          return 0;
      }
      
      if (typeof aVal === 'string') {
        return userSortDirection === 'asc' 
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }
      
      return userSortDirection === 'asc' ? aVal - bVal : bVal - aVal;
    });
    
    return filtered;
  }, [summary, userSearch, userSortField, userSortDirection, userBetCountFilter, userTotalFilter, userAverageFilter]);

  // Filtered and sorted number summary
  const filteredNumberSummary = useMemo(() => {
    let filtered = [...numberSummary];
    
    // Apply string search filter (Number)
    if (numberSearch.trim()) {
      const searchLower = numberSearch.toLowerCase();
      filtered = filtered.filter(item => 
        item.number.includes(searchLower)
      );
    }
    
    // Apply string search filter (Users)
    if (numberUserSearch.trim()) {
      const searchLower = numberUserSearch.toLowerCase();
      filtered = filtered.filter(item => 
        item.users.some(u => u.toLowerCase().includes(searchLower))
      );
    }
    
    // Apply numeric filters
    filtered = filtered.filter(item => {
      return (
        applyNumericFilter(item.betCount, numberBetCountFilter) &&
        applyNumericFilter(item.totalAmount, numberTotalAmountFilter)
      );
    });
    
    // Apply sorting
    filtered.sort((a, b) => {
      let aVal: any, bVal: any;
      
      switch (numberSortField) {
        case 'number':
          aVal = parseInt(a.number, 10);
          bVal = parseInt(b.number, 10);
          break;
        case 'totalAmount':
          aVal = a.totalAmount;
          bVal = b.totalAmount;
          break;
        case 'betCount':
          aVal = a.betCount;
          bVal = b.betCount;
          break;
        default:
          return 0;
      }
      
      return numberSortDirection === 'asc' ? aVal - bVal : bVal - aVal;
    });
    
    return filtered;
  }, [numberSummary, numberSearch, numberUserSearch, numberSortField, numberSortDirection, numberBetCountFilter, numberTotalAmountFilter]);

  const handleUserSort = (field: SortField) => {
    if (userSortField === field) {
      setUserSortDirection(userSortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setUserSortField(field);
      setUserSortDirection('desc');
    }
  };

  const handleNumberSort = (field: NumberSortField) => {
    if (numberSortField === field) {
      setNumberSortDirection(numberSortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setNumberSortField(field);
      setNumberSortDirection('desc');
    }
  };

  const downloadUserCSV = () => {
    const headers = ['No', 'User Name', 'Total Bets', 'Total Amount', 'Average Bet'];
    const rows = filteredUserSummary.map((item, idx) => {
      const avgBet = (item.betCount || 0) > 0 ? (item.total || 0) / (item.betCount || 1) : 0;
      return [
        (idx + 1).toString(),
        item.userId,
        (item.betCount || 0).toString(),
        (item.total || 0).toString(),
        avgBet.toFixed(2),
      ];
    });
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `user-summary-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadNumberCSV = () => {
    const headers = ['Number', 'Total Amount', 'Bet Count', 'Users'];
    const rows = filteredNumberSummary
      .filter(item => item.totalAmount > 0 || item.betCount > 0)
      .map(item => [
        item.number,
        item.totalAmount.toString(),
        item.betCount.toString(),
        item.users.join('; '),
      ]);
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `number-summary-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const grandTotal = (summary || []).reduce((sum, item) => sum + (item.total || 0), 0);
  const totalBets = (summary || []).reduce((sum, item) => sum + (item.betCount || 0), 0);
  const numberGrandTotal = numberSummary.reduce((sum, item) => sum + item.totalAmount, 0);
  const numberTotalBets = numberSummary.reduce((sum, item) => sum + item.betCount, 0);

  const SortIcon: React.FC<{ field: SortField | NumberSortField; currentField: SortField | NumberSortField; direction: SortDirection }> = ({ field, currentField, direction }) => {
    if (field !== currentField) return <span style={{ opacity: 0.3 }}>⇅</span>;
    return direction === 'asc' ? <span>↑</span> : <span>↓</span>;
  };

  // Filter input component for numerical columns
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
    <div className="summary-view">
      <div className="summary-filters">
        <div className="filter-group">
          <label>User:</label>
          <select
            value={selectedUserId}
            onChange={(e) => setSelectedUserId(e.target.value)}
            className="select-field"
          >
            <option value="all">All Users</option>
            {users.map((user) => (
              <option key={user._id} value={user._id}>
                {user._id}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label>Start Date:</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="input-field"
          />
        </div>

        <div className="filter-group">
          <label>End Date:</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="input-field"
          />
        </div>
      </div>

      {loading ? (
        <div className="loading-state">Loading summary...</div>
      ) : (
        <>
          <div className="summary-stats">
            <div className="stat-card">
              <div className="stat-label">Total Users</div>
              <div className="stat-value">{summary.length}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Total Bets</div>
              <div className="stat-value">{activeTab === 'users' ? totalBets : numberTotalBets}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Grand Total</div>
              <div className="stat-value">{(activeTab === 'users' ? grandTotal : numberGrandTotal).toLocaleString()}</div>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="summary-tabs">
            <button
              className={`summary-tab-button ${activeTab === 'users' ? 'active' : ''}`}
              onClick={() => setActiveTab('users')}
            >
              👥 User Summary
            </button>
            <button
              className={`summary-tab-button ${activeTab === 'numbers' ? 'active' : ''}`}
              onClick={() => setActiveTab('numbers')}
            >
              🔢 Bet Number Summary
            </button>
          </div>

          {/* User Summary Tab */}
          {activeTab === 'users' && (
            <div className="summary-table-section">
              <div className="table-header">
                <h3>User Summary</h3>
                <div className="table-controls">
                  <button className="btn btn-secondary" onClick={downloadUserCSV}>
                    📥 Download CSV
                  </button>
                </div>
              </div>
              
              {filteredUserSummary.length === 0 ? (
                <p className="info-text">No data found for the selected filters.</p>
              ) : (
                <div className="table-container">
                  <table className="data-grid interactive-table">
                    <thead>
                      <tr>
                        <th onClick={() => handleUserSort('userId')} className="sortable">
                          No <SortIcon field="userId" currentField={userSortField} direction={userSortDirection} />
                        </th>
                        <th onClick={() => handleUserSort('userId')} className="sortable">
                          User Name <SortIcon field="userId" currentField={userSortField} direction={userSortDirection} />
                        </th>
                        <th onClick={() => handleUserSort('betCount')} className="sortable">
                          Total Bets <SortIcon field="betCount" currentField={userSortField} direction={userSortDirection} />
                        </th>
                        <th onClick={() => handleUserSort('total')} className="sortable">
                          Total Amount <SortIcon field="total" currentField={userSortField} direction={userSortDirection} />
                        </th>
                        <th onClick={() => handleUserSort('average')} className="sortable">
                          Average Bet <SortIcon field="average" currentField={userSortField} direction={userSortDirection} />
                        </th>
                      </tr>
                      <tr className="filter-row">
                        <th></th>
                        <th>
                          <input
                            type="text"
                            placeholder="🔍 Filter..."
                            value={userSearch}
                            onChange={(e) => setUserSearch(e.target.value)}
                            className="column-filter-input"
                          />
                        </th>
                        <th>
                          <NumericFilterInput
                            filter={userBetCountFilter}
                            onChange={setUserBetCountFilter}
                            placeholder="Count..."
                          />
                        </th>
                        <th>
                          <NumericFilterInput
                            filter={userTotalFilter}
                            onChange={setUserTotalFilter}
                            placeholder="Amount..."
                          />
                        </th>
                        <th>
                          <NumericFilterInput
                            filter={userAverageFilter}
                            onChange={setUserAverageFilter}
                            placeholder="Average..."
                          />
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredUserSummary.map((item, idx) => {
                        const avgBet = (item.betCount || 0) > 0 ? (item.total || 0) / (item.betCount || 1) : 0;
                        return (
                          <tr key={item.userId}>
                            <td>{idx + 1}</td>
                            <td>{item.userId}</td>
                            <td>{(item.betCount || 0).toLocaleString()}</td>
                            <td>{(item.total || 0).toLocaleString()}</td>
                            <td>{avgBet.toFixed(0).toLocaleString()}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Number Summary Tab */}
          {activeTab === 'numbers' && (
            <div className="summary-table-section">
              <div className="table-header">
                <h3>Bet Number Summary (00-99)</h3>
                <div className="table-controls">
                  <button className="btn btn-secondary" onClick={downloadNumberCSV}>
                    📥 Download CSV
                  </button>
                </div>
              </div>
              
              {filteredNumberSummary.filter(item => item.totalAmount > 0 || item.betCount > 0).length === 0 ? (
                <p className="info-text">No bets found for the selected filters.</p>
              ) : (
                <div className="table-container">
                  <table className="data-grid interactive-table">
                    <thead>
                      <tr>
                        <th onClick={() => handleNumberSort('number')} className="sortable">
                          Number <SortIcon field="number" currentField={numberSortField} direction={numberSortDirection} />
                        </th>
                        <th onClick={() => handleNumberSort('betCount')} className="sortable">
                          Bet Count <SortIcon field="betCount" currentField={numberSortField} direction={numberSortDirection} />
                        </th>
                        <th onClick={() => handleNumberSort('totalAmount')} className="sortable">
                          Total Amount <SortIcon field="totalAmount" currentField={numberSortField} direction={numberSortDirection} />
                        </th>
                        <th>Users</th>
                      </tr>
                      <tr className="filter-row">
                        <th>
                          <input
                            type="text"
                            placeholder="🔍 Filter..."
                            value={numberSearch}
                            onChange={(e) => setNumberSearch(e.target.value)}
                            className="column-filter-input"
                          />
                        </th>
                        <th>
                          <NumericFilterInput
                            filter={numberBetCountFilter}
                            onChange={setNumberBetCountFilter}
                            placeholder="Count..."
                          />
                        </th>
                        <th>
                          <NumericFilterInput
                            filter={numberTotalAmountFilter}
                            onChange={setNumberTotalAmountFilter}
                            placeholder="Amount..."
                          />
                        </th>
                        <th>
                          <input
                            type="text"
                            placeholder="🔍 Filter users..."
                            value={numberUserSearch}
                            onChange={(e) => setNumberUserSearch(e.target.value)}
                            className="column-filter-input"
                          />
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredNumberSummary
                        .filter(item => item.totalAmount > 0 || item.betCount > 0)
                        .map((item) => (
                          <tr key={item.number}>
                            <td><strong>{item.number}</strong></td>
                            <td>{item.betCount.toLocaleString()}</td>
                            <td>{item.totalAmount.toLocaleString()}</td>
                            <td>{item.users.length > 0 ? item.users.join(', ') : '-'}</td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};
