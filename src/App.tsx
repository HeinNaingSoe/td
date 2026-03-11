import { useState, useEffect } from 'react';
import { User, ParsedBet } from './types';
import { UserManager } from './components/UserManager';
import { MessageParser } from './components/MessageParser';
import { SummaryView } from './components/SummaryView';
import { ParsingRules } from './components/ParsingRules';
import { TextConverter } from './components/TextConverter';
import { getUsers, createUser, deleteUser, addBetsToUser } from './services/api';

function App() {
  console.log('App component rendering...');
  const [activeTab, setActiveTab] = useState<'define' | 'parsing' | 'summary' | 'rules' | 'convert'>('define');
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [loading, setLoading] = useState(true);

  console.log('App state:', { loading, usersCount: users.length });

  // Load users on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        // Add timeout to prevent hanging
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Request timeout')), 5000)
        );

        const dataPromise = getUsers();
        const data = await Promise.race([dataPromise, timeoutPromise]) as User[];
        setUsers(data || []);
      } catch (error: any) {
        console.error('Failed to load users:', error);
        // Continue with empty users array so app can still render
        setUsers([]);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const loadUsers = async () => {
    try {
      const data = await getUsers();
      setUsers(data || []);
    } catch (error: any) {
      console.error('Failed to load users:', error);
      setUsers([]);
    }
  };

  const handleAddUser = async (name: string) => {
    const newUser = await createUser(name);
    setUsers([...users, newUser]);
  };

  const handleDeleteUser = async (userId: string) => {
    await deleteUser(userId);
    setUsers(users.filter(u => u._id !== userId));
    if (selectedUserId === userId) {
      setSelectedUserId('');
    }
  };

  const handleAddBets = async (userId: string, bets: ParsedBet[]) => {
    await addBetsToUser(userId, bets);
    // Reload users to get updated data
    await loadUsers();
  };

  if (loading) {
    return (
      <div className="app" style={{ minHeight: '100vh', background: '#0f172a', color: '#f1f5f9' }}>
        <div className="main-content" style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '100vh',
          padding: '2rem'
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>⏳</div>
            <div style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>Loading data from database...</div>
            <div style={{ marginTop: '1rem', fontSize: '0.875rem', color: '#94a3b8' }}>
              If this takes too long, make sure the backend server is running on http://localhost:3001
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app" style={{ minHeight: '100vh', width: '100%', background: '#0f172a', color: '#f1f5f9' }}>
      <div className="main-content" style={{ minHeight: '100vh', padding: '2rem' }}>
        <header className="main-header" style={{ marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '3rem', fontWeight: 800, margin: 0, color: '#f1f5f9' }}>📊 00–99 Betting Table</h1>
          {users.length === 0 && !loading && (
            <div style={{
              marginTop: '1rem',
              padding: '1rem',
              background: 'rgba(245, 158, 11, 0.1)',
              border: '1px solid rgba(245, 158, 11, 0.3)',
              borderRadius: '8px',
              fontSize: '0.875rem',
              color: 'var(--warning)'
            }}>
              ⚠️ No users found. Add a user to get started. Make sure the backend server is running on http://localhost:3001
            </div>
          )}
        </header>

        {/* Tabs */}
        <div className="tabs-container">
          <div className="tabs-header">
            <button
              className={`tab-button ${activeTab === 'define' ? 'active' : ''}`}
              onClick={() => setActiveTab('define')}
            >
              👥 Define User
            </button>
            <button
              className={`tab-button ${activeTab === 'parsing' ? 'active' : ''}`}
              onClick={() => setActiveTab('parsing')}
            >
              💬 Message Parsing
            </button>
            <button
              className={`tab-button ${activeTab === 'summary' ? 'active' : ''}`}
              onClick={() => setActiveTab('summary')}
            >
              📋 စာရင်းပေါင်းချုပ်
            </button>
            <button
              className={`tab-button ${activeTab === 'rules' ? 'active' : ''}`}
              onClick={() => setActiveTab('rules')}
            >
              ⚙️ Parsing Rules
            </button>
            <button
              className={`tab-button ${activeTab === 'convert' ? 'active' : ''}`}
              onClick={() => setActiveTab('convert')}
            >
              🔄 Text Convert
            </button>
          </div>

          <div className="tab-content">
            {activeTab === 'define' && (
              <UserManager
                users={users}
                onAddUser={handleAddUser}
                onDeleteUser={handleDeleteUser}
              />
            )}

            {activeTab === 'parsing' && (
              <MessageParser
                users={users}
                selectedUserId={selectedUserId}
                onUserIdChange={setSelectedUserId}
                onAddBets={handleAddBets}
              />
            )}

            {activeTab === 'summary' && (
              <SummaryView users={users} />
            )}

            {activeTab === 'rules' && (
              <ParsingRules />
            )}

            {activeTab === 'convert' && (
              <TextConverter />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
