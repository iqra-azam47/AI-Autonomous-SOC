import React, { useState, useEffect } from 'react';
import {
  Users, UserPlus, RefreshCw, AlertTriangle, CheckCircle2,
  XCircle, Shield, Key, X, Lock
} from 'lucide-react';
import { api } from '../services/api';
import { User, Role } from '../types';
import { useAuth } from '../context/AuthContext';

export const AdminUsersPage: React.FC = () => {
  const { user: currentUser } = useAuth();

  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Create User Modal
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [creating, setCreating] = useState<boolean>(false);
  const [newUser, setNewUser] = useState({
    username: '',
    email: '',
    full_name: '',
    password: '',
    role_name: 'ANALYST' as Role,
  });

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.listUsers();
      setUsers(data);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to fetch operators list');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      await api.createUser(newUser);
      setShowCreateModal(false);
      setNewUser({
        username: '',
        email: '',
        full_name: '',
        password: '',
        role_name: 'ANALYST',
      });
      fetchUsers();
    } catch (err: any) {
      alert(err.message || 'Failed to create operator');
    } finally {
      setCreating(false);
    }
  };

  const handleToggleStatus = async (user: User) => {
    if (user.id === currentUser?.id) {
      alert('You cannot deactivate your own active session account.');
      return;
    }
    const newStatus = !user.is_active;
    try {
      await api.updateUser(user.id, { is_active: newStatus });
      fetchUsers();
    } catch (err: any) {
      alert(err.message || 'Failed to update user status');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-100 flex items-center gap-2.5 font-mono">
            <Users className="w-6 h-6 text-cyan-400" />
            OPERATOR MANAGEMENT & RBAC
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Manage authenticated security operations personnel and role-based access control assignments.
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-semibold font-mono shadow transition-colors self-start sm:self-auto"
        >
          <UserPlus className="w-4 h-4" />
          Add Operator
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-950/40 border border-red-800/60 text-red-300 text-sm font-mono flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Users Table */}
      <div className="bg-[#0e1424] border border-slate-800 rounded-xl overflow-hidden shadow">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <span className="text-xs font-mono uppercase tracking-wider text-slate-400">
            Registered SecOps Operators ({users.length})
          </span>
          <button
            onClick={fetchUsers}
            className="text-xs font-mono text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        <table className="w-full text-left text-xs font-mono">
          <thead className="bg-slate-900/80 text-slate-400 uppercase tracking-wider border-b border-slate-800">
            <tr>
              <th className="py-3 px-4">Operator</th>
              <th className="py-3 px-4">Email</th>
              <th className="py-3 px-4">Role</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4">Last Login</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/80 text-slate-300">
            {loading ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-slate-500">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-cyan-400" />
                  Loading operators...
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-slate-500">
                  No operators found.
                </td>
              </tr>
            ) : (
              users.map((u) => (
                <tr key={u.id} className="hover:bg-slate-800/40">
                  <td className="py-3 px-4">
                    <div className="font-bold text-slate-100 flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-[10px] text-cyan-300">
                        {u.username.slice(0, 2).toUpperCase()}
                      </div>
                      <span>{u.username}</span>
                      {u.id === currentUser?.id && (
                        <span className="text-[10px] text-cyan-400 font-semibold">(You)</span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-500">{u.full_name || 'No full name'}</div>
                  </td>
                  <td className="py-3 px-4 text-slate-400">{u.email}</td>
                  <td className="py-3 px-4">
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                        u.role_name === 'ADMIN'
                          ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                          : u.role_name === 'ANALYST'
                          ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                          : 'bg-slate-500/10 text-slate-400 border border-slate-500/20'
                      }`}
                    >
                      {u.role_name}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-semibold ${
                        u.is_active
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : 'bg-red-500/10 text-red-400 border border-red-500/20'
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${u.is_active ? 'bg-emerald-400' : 'bg-red-400'}`}
                      />
                      {u.is_active ? 'ACTIVE' : 'DEACTIVATED'}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-slate-500">
                    {u.last_login ? new Date(u.last_login).toLocaleString() : 'Never'}
                  </td>
                  <td className="py-3 px-4 text-right">
                    {u.id !== currentUser?.id && (
                      <button
                        onClick={() => handleToggleStatus(u)}
                        className={`px-2.5 py-1 rounded text-[11px] border transition-colors ${
                          u.is_active
                            ? 'text-red-400 border-red-500/30 hover:bg-red-500/10'
                            : 'text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10'
                        }`}
                      >
                        {u.is_active ? 'Deactivate' : 'Activate'}
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Create Operator Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0e1424] border border-slate-700/80 rounded-xl w-full max-w-md shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2 font-mono">
                <UserPlus className="w-4 h-4 text-cyan-400" />
                Register New SecOps Operator
              </h3>
              <button onClick={() => setShowCreateModal(false)} className="p-1 text-slate-400 hover:text-slate-200">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-3 text-xs font-mono">
              <div>
                <label className="text-slate-400 block mb-1">Username *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. jsmith"
                  value={newUser.username}
                  onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded text-slate-200 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Email Address *</label>
                <input
                  type="email"
                  required
                  placeholder="e.g. jsmith@soc.enterprise.local"
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded text-slate-200 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Full Name</label>
                <input
                  type="text"
                  placeholder="e.g. John Smith"
                  value={newUser.full_name}
                  onChange={(e) => setNewUser({ ...newUser, full_name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded text-slate-200 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Temporary Password *</label>
                <input
                  type="password"
                  required
                  placeholder="Min 8 characters"
                  value={newUser.password}
                  onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded text-slate-200 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Role Assignment</label>
                <select
                  value={newUser.role_name}
                  onChange={(e) => setNewUser({ ...newUser, role_name: e.target.value as Role })}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded text-slate-200 focus:outline-none focus:border-cyan-500"
                >
                  <option value="ANALYST">Analyst (Triage, Notes, Containment)</option>
                  <option value="VIEWER">Viewer (Read-only)</option>
                  <option value="ADMIN">Admin (Full Control, User Management)</option>
                </select>
              </div>

              <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded font-mono text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded font-mono text-xs font-semibold disabled:opacity-50"
                >
                  {creating ? 'Creating...' : 'Register Operator'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
