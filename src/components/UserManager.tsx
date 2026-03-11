import React, { useState } from 'react';
import { User } from '../types';

interface UserManagerProps {
  users: User[];
  onAddUser: (name: string) => Promise<void>;
  onDeleteUser: (userId: string) => Promise<void>;
}

export const UserManager: React.FC<UserManagerProps> = ({
  users,
  onAddUser,
  onDeleteUser,
}) => {
  const [newUserName, setNewUserName] = useState('');
  const [adding, setAdding] = useState(false);

  const handleAddUser = async () => {
    const trimmed = newUserName.trim();
    if (!trimmed) return;

    setAdding(true);
    try {
      await onAddUser(trimmed);
      setNewUserName('');
    } catch (error: any) {
      alert(error.message || 'Failed to add user');
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async (userId: string) => {
    if (!confirm(`Are you sure you want to delete user "${userId}"?`)) return;
    try {
      await onDeleteUser(userId);
    } catch (error) {
      alert('Failed to delete user');
    }
  };

  return (
    <div className="user-manager">
      <div className="add-user-section">
        <h3>Add New User</h3>
        <div className="input-group">
          <input
            type="text"
            value={newUserName}
            onChange={(e) => setNewUserName(e.target.value)}
            placeholder="Enter user name"
            className="input-field"
            onKeyPress={(e) => e.key === 'Enter' && !adding && handleAddUser()}
            disabled={adding}
          />
          <button
            className="btn btn-primary"
            onClick={handleAddUser}
            disabled={adding || !newUserName.trim()}
          >
            {adding ? 'Adding...' : '➕ Add User'}
          </button>
        </div>
      </div>

      <div className="users-table-section">
        <h3>Users List ({users.length} total)</h3>
        {users.length === 0 ? (
          <p className="info-text">No users yet. Add a user above to get started.</p>
        ) : (
          <div className="table-container">
            <table className="data-grid">
              <thead>
                <tr>
                  <th>No</th>
                  <th>User Name</th>
                  <th>Total Bets</th>
                  <th>Total Amount</th>
                  <th>Created At</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user, idx) => {
                  const bets = user.bets || [];
                  const totalAmount = bets.reduce((sum, bet) => sum + (bet.amount || 0), 0);
                  const createdAt = user.createdAt || new Date().toISOString();
                  return (
                    <tr key={user._id}>
                      <td>{idx + 1}</td>
                      <td className="editable">{user._id}</td>
                      <td>{bets.length}</td>
                      <td>{totalAmount.toLocaleString()}</td>
                      <td>{new Date(createdAt).toLocaleDateString()}</td>
                      <td>
                        <button
                          className="btn btn-danger btn-small"
                          onClick={() => handleDelete(user._id)}
                          title="Delete user"
                        >
                          🗑️
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
