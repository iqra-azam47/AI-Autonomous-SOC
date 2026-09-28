import React from 'react';
import {
  User as UserIcon, Shield, Key, Clock, CheckCircle2,
  XCircle, Lock, Mail, BadgeCheck
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const ProfilePage: React.FC = () => {
  const { user } = useAuth();

  const permissions = [
    { name: 'View Telemetry & Dashboard', admin: true, analyst: true, viewer: true },
    { name: 'Investigate Alerts & Incidents', admin: true, analyst: true, viewer: true },
    { name: 'Interact with AI Analyst & Chat', admin: true, analyst: true, viewer: false },
    { name: 'Add Analyst Investigation Notes', admin: true, analyst: true, viewer: false },
    { name: 'Execute Simulated Containment', admin: true, analyst: true, viewer: false },
    { name: 'Trigger Attack Simulations', admin: true, analyst: true, viewer: false },
    { name: 'Upload & Ingest Log Files', admin: true, analyst: true, viewer: false },
    { name: 'Manage Operator Accounts', admin: true, analyst: false, viewer: false },
    { name: 'Modify System Configurations', admin: true, analyst: false, viewer: false },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-100 flex items-center gap-2.5 font-mono">
          <UserIcon className="w-6 h-6 text-cyan-400" />
          OPERATOR PROFILE & CAPABILITIES
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Active session identity, role-based authorization scopes, and platform operational privileges.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* User Card */}
        <div className="bg-[#0e1424] border border-slate-800 rounded-xl p-6 shadow space-y-6">
          <div className="flex flex-col items-center text-center">
            <div className="w-20 h-20 rounded-full bg-cyan-950 border-2 border-cyan-500/40 flex items-center justify-center text-2xl font-bold font-mono text-cyan-300 shadow-lg shadow-cyan-950/50 mb-3">
              {user?.username.slice(0, 2).toUpperCase() || 'OP'}
            </div>
            <h2 className="text-lg font-bold text-slate-100 font-mono">{user?.full_name || user?.username}</h2>
            <span className="text-xs font-mono text-cyan-400 font-semibold uppercase tracking-wider mt-0.5">
              @{user?.username}
            </span>
            <div className="mt-3">
              <span className={`inline-block px-3 py-1 rounded text-xs font-mono font-bold ${
                user?.role_name === 'ADMIN'
                  ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                  : user?.role_name === 'ANALYST'
                  ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                  : 'bg-slate-500/10 text-slate-400 border border-slate-500/20'
              }`}>
                ROLE: {user?.role_name}
              </span>
            </div>
          </div>

          <div className="space-y-3 pt-4 border-t border-slate-800 text-xs font-mono">
            <div className="flex items-center justify-between text-slate-400">
              <span className="flex items-center gap-2"><Mail className="w-3.5 h-3.5 text-slate-500" /> Email:</span>
              <span className="text-slate-200">{user?.email}</span>
            </div>
            <div className="flex items-center justify-between text-slate-400">
              <span className="flex items-center gap-2"><Lock className="w-3.5 h-3.5 text-slate-500" /> Status:</span>
              <span className="text-emerald-400 font-semibold">{user?.is_active ? 'Active' : 'Inactive'}</span>
            </div>
            <div className="flex items-center justify-between text-slate-400">
              <span className="flex items-center gap-2"><Clock className="w-3.5 h-3.5 text-slate-500" /> Last Login:</span>
              <span className="text-slate-200">{user?.last_login ? new Date(user.last_login).toLocaleTimeString() : 'Now'}</span>
            </div>
          </div>
        </div>

        {/* RBAC Matrix Card */}
        <div className="lg:col-span-2 bg-[#0e1424] border border-slate-800 rounded-xl p-6 shadow space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-sm font-bold text-slate-100 font-mono flex items-center gap-2">
              <Shield className="w-4 h-4 text-cyan-400" />
              Role-Based Access Control (RBAC) Entitlements
            </h3>
            <span className="text-[11px] font-mono text-slate-400">
              Current Tier: <strong className="text-cyan-300">{user?.role_name}</strong>
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-slate-900/80 text-slate-400 uppercase tracking-wider">
                <tr>
                  <th className="py-2.5 px-3">Operation / Capability</th>
                  <th className="py-2.5 px-3 text-center">Admin</th>
                  <th className="py-2.5 px-3 text-center">Analyst</th>
                  <th className="py-2.5 px-3 text-center">Viewer</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 text-slate-300">
                {permissions.map((p) => (
                  <tr key={p.name} className="hover:bg-slate-800/30">
                    <td className="py-2.5 px-3 font-semibold text-slate-200">{p.name}</td>
                    <td className="py-2.5 px-3 text-center">
                      {p.admin ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 mx-auto" />
                      ) : (
                        <XCircle className="w-4 h-4 text-slate-600 mx-auto" />
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      {p.analyst ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 mx-auto" />
                      ) : (
                        <XCircle className="w-4 h-4 text-slate-600 mx-auto" />
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      {p.viewer ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 mx-auto" />
                      ) : (
                        <XCircle className="w-4 h-4 text-slate-600 mx-auto" />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
