import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard, ShieldAlert, AlertTriangle, FileText, Clock,
  Bot, MessageSquare, Search, Server, Grid,
  Cpu, Activity, GitFork, Gauge,
  UploadCloud, Compass, Flame, History,
  Database, PlayCircle, BarChart3, Layers,
  FileCheck, Users, ScrollText, Settings, Shield
} from 'lucide-react';
import { Role } from '../types';

interface NavItem {
  name: string;
  path: string;
  icon: React.ElementType;
  roles: Role[];
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

export const Sidebar: React.FC = () => {
  const { user } = useAuth();
  const userRole = user?.role_name || 'VIEWER';

  const groups: NavGroup[] = [
    {
      title: 'OVERVIEW',
      items: [
        { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard, roles: ['ADMIN', 'ANALYST', 'VIEWER'] },
      ]
    },
    {
      title: 'SECURITY OPERATIONS',
      items: [
        { name: 'Alerts', path: '/alerts', icon: AlertTriangle, roles: ['ADMIN', 'ANALYST', 'VIEWER'] },
        { name: 'Incidents', path: '/incidents', icon: ShieldAlert, roles: ['ADMIN', 'ANALYST', 'VIEWER'] },
        { name: 'Events', path: '/events', icon: FileText, roles: ['ADMIN', 'ANALYST', 'VIEWER'] },
        { name: 'Attack Timeline', path: '/timeline', icon: Clock, roles: ['ADMIN', 'ANALYST', 'VIEWER'] },
      ]
    },
    {
      title: 'INVESTIGATION',
      items: [
        { name: 'AI Analyst', path: '/ai-analyst', icon: Bot, roles: ['ADMIN', 'ANALYST'] },
        { name: 'AI Chat', path: '/ai-chat', icon: MessageSquare, roles: ['ADMIN', 'ANALYST'] },
        { name: 'IP Intelligence', path: '/intelligence/ip/198.51.100.45', icon: Search, roles: ['ADMIN', 'ANALYST', 'VIEWER'] },
        { name: 'Asset Intelligence', path: '/assets', icon: Server, roles: ['ADMIN', 'ANALYST', 'VIEWER'] },
        { name: 'MITRE ATT&CK', path: '/mitre', icon: Grid, roles: ['ADMIN', 'ANALYST', 'VIEWER'] },
      ]
    },
    {
      title: 'DETECTION',
      items: [
        { name: 'ML Detection', path: '/detection/ml', icon: Cpu, roles: ['ADMIN', 'ANALYST', 'VIEWER'] },
        { name: 'Anomalies', path: '/detection/anomalies', icon: Activity, roles: ['ADMIN', 'ANALYST', 'VIEWER'] },
        { name: 'Correlation', path: '/detection/correlation', icon: GitFork, roles: ['ADMIN', 'ANALYST', 'VIEWER'] },
        { name: 'Risk Engine', path: '/detection/risk', icon: Gauge, roles: ['ADMIN', 'ANALYST', 'VIEWER'] },
      ]
    },
    {
      title: 'DATA',
      items: [
        { name: 'Log Ingestion', path: '/ingestion', icon: UploadCloud, roles: ['ADMIN', 'ANALYST'] },
        { name: 'Event Explorer', path: '/event-explorer', icon: Compass, roles: ['ADMIN', 'ANALYST', 'VIEWER'] },
      ]
    },
    {
      title: 'SOC LAB',
      items: [
        { name: 'Attack Simulations', path: '/simulations', icon: Flame, roles: ['ADMIN', 'ANALYST'] },
        { name: 'Simulation History', path: '/simulations/history', icon: History, roles: ['ADMIN', 'ANALYST', 'VIEWER'] },
      ]
    },
    {
      title: 'ML LAB',
      items: [
        { name: 'Dataset', path: '/ml-lab/dataset', icon: Database, roles: ['ADMIN', 'ANALYST'] },
        { name: 'Training', path: '/ml-lab/training', icon: PlayCircle, roles: ['ADMIN', 'ANALYST'] },
        { name: 'Evaluation', path: '/ml-lab/evaluation', icon: BarChart3, roles: ['ADMIN', 'ANALYST'] },
        { name: 'Model Versions', path: '/ml-lab/models', icon: Layers, roles: ['ADMIN', 'ANALYST'] },
      ]
    },
    {
      title: 'REPORTS',
      items: [
        { name: 'Security Reports', path: '/reports', icon: FileCheck, roles: ['ADMIN', 'ANALYST', 'VIEWER'] },
      ]
    },
    {
      title: 'ADMIN',
      items: [
        { name: 'Users', path: '/admin/users', icon: Users, roles: ['ADMIN'] },
        { name: 'Audit Logs', path: '/admin/audit-logs', icon: ScrollText, roles: ['ADMIN', 'VIEWER'] },
        { name: 'Settings', path: '/admin/settings', icon: Settings, roles: ['ADMIN'] },
      ]
    }
  ];

  return (
    <aside className="w-64 bg-[#0a0f1d] border-r border-slate-800/80 flex flex-col h-screen fixed left-0 top-0 z-40 select-none">
      {/* Brand Header */}
      <div className="h-16 flex items-center gap-3 px-5 border-b border-slate-800/80">
        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white shadow-lg shadow-cyan-950/40">
          <Shield className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-sm font-bold tracking-tight text-slate-100 flex items-center gap-1.5 font-mono">
            AUTONOMOUS<span className="text-cyan-400">SOC</span>
          </h1>
          <span className="text-[10px] text-slate-400 font-mono tracking-widest uppercase">SecOps Center v1.0</span>
        </div>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        {groups.map((group) => {
          const authorizedItems = group.items.filter(item => item.roles.includes(userRole));
          if (authorizedItems.length === 0) return null;

          return (
            <div key={group.title}>
              <h4 className="text-[10px] font-bold text-slate-400 px-3 tracking-wider uppercase mb-1.5 font-mono">
                {group.title}
              </h4>
              <nav className="space-y-0.5">
                {authorizedItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      className={({ isActive }) =>
                        `flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-150 ${
                          isActive
                            ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 shadow-sm font-semibold'
                            : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                        }`
                      }
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                      <span>{item.name}</span>
                    </NavLink>
                  );
                })}
              </nav>
            </div>
          );
        })}
      </div>

      {/* User Status Footer */}
      <div className="p-3 border-t border-slate-800/80 bg-slate-950/40">
        <div className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg">
          <div className="w-7 h-7 rounded-full bg-cyan-950 border border-cyan-500/30 flex items-center justify-center font-mono text-xs text-cyan-300 font-bold">
            {user?.username?.slice(0, 2).toUpperCase() || 'SO'}
          </div>
          <div className="overflow-hidden">
            <p className="text-xs font-semibold text-slate-200 truncate">{user?.username || 'Guest'}</p>
            <p className="text-[10px] font-mono text-cyan-400/90 tracking-wide uppercase">{userRole}</p>
          </div>
        </div>
      </div>
    </aside>
  );
};
