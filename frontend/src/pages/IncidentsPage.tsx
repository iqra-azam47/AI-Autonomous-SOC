import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { Incident } from '../types';
import { SeverityBadge } from '../components/SeverityBadge';
import { RiskScoreBadge } from '../components/RiskScoreBadge';
import { EmptyState, LoadingSkeleton } from '../components/EmptyState';
import { ShieldAlert, Search, ArrowRight, UserCheck, Flame } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const IncidentsPage: React.FC = () => {
  const navigate = useNavigate();
  const { hasRole } = useAuth();
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  // Filters
  const [severityFilter, setSeverityFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sourceIpFilter, setSourceIpFilter] = useState('');

  const fetchIncidents = async () => {
    setLoading(true);
    try {
      const params: Record<string, any> = { page, limit: 20 };
      if (severityFilter) params.severity = severityFilter;
      if (statusFilter) params.status = statusFilter;
      if (sourceIpFilter) params.source_ip = sourceIpFilter;

      const res = await api.listIncidents(params);
      setIncidents(res.items);
      setTotal(res.total);
    } catch (err) {
      console.error('Failed to load incidents', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIncidents();
  }, [page, severityFilter, statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchIncidents();
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'OPEN':
        return 'bg-red-500/15 text-red-400 border-red-500/30';
      case 'INVESTIGATING':
        return 'bg-amber-500/15 text-amber-400 border-amber-500/30';
      case 'CONTAINED':
        return 'bg-purple-500/15 text-purple-400 border-purple-500/30';
      case 'RESOLVED':
        return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
      case 'FALSE_POSITIVE':
      default:
        return 'bg-slate-800 text-slate-400 border-slate-700';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800/80">
        <div>
          <h2 className="text-xl font-bold font-mono text-slate-100 flex items-center gap-2">
            SECURITY INCIDENTS
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">Correlated security attack campaigns requiring investigation</p>
        </div>

        {hasRole(['ADMIN', 'ANALYST']) && (
          <button
            onClick={() => navigate('/simulations')}
            className="px-3.5 py-1.5 bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 text-white rounded-lg text-xs font-semibold font-mono flex items-center gap-1.5 shadow-md shadow-red-950/40 transition"
          >
            <Flame className="w-3.5 h-3.5" />
            <span>Simulate New Attack Campaign</span>
          </button>
        )}
      </div>

      {/* Filter Bar */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 shadow-xl">
        <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="relative">
            <input
              type="text"
              placeholder="Search Source IP..."
              value={sourceIpFilter}
              onChange={(e) => setSourceIpFilter(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-950/70 border border-slate-700/80 rounded-lg text-xs font-mono text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
            />
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
          </div>

          <select
            value={severityFilter}
            onChange={(e) => { setSeverityFilter(e.target.value); setPage(1); }}
            className="px-3 py-2 bg-slate-950/70 border border-slate-700/80 rounded-lg text-xs font-mono text-slate-200 focus:outline-none focus:border-cyan-500"
          >
            <option value="">All Severities</option>
            <option value="CRITICAL">CRITICAL</option>
            <option value="HIGH">HIGH</option>
            <option value="MEDIUM">MEDIUM</option>
            <option value="LOW">LOW</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="px-3 py-2 bg-slate-950/70 border border-slate-700/80 rounded-lg text-xs font-mono text-slate-200 focus:outline-none focus:border-cyan-500"
          >
            <option value="">All Statuses</option>
            <option value="OPEN">OPEN</option>
            <option value="INVESTIGATING">INVESTIGATING</option>
            <option value="CONTAINED">CONTAINED</option>
            <option value="RESOLVED">RESOLVED</option>
            <option value="FALSE_POSITIVE">FALSE POSITIVE</option>
          </select>

          <button
            type="submit"
            className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold rounded-lg shadow-sm transition"
          >
            Apply Filters
          </button>
        </form>
      </div>

      {/* Incidents Table */}
      {loading ? (
        <LoadingSkeleton rows={6} />
      ) : incidents.length === 0 ? (
        <EmptyState
          title="No Incidents Reported"
          description="There are currently no active or closed incidents matching your filters. Run an attack scenario to observe multi-event correlation and incident escalation."
          actionLabel="Run Attack Simulation"
          onAction={() => navigate('/simulations')}
        />
      ) : (
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/70 border-b border-slate-800 text-[11px] font-mono uppercase text-slate-400">
                <tr>
                  <th className="py-3 px-4">Incident ID</th>
                  <th className="py-3 px-4">Severity</th>
                  <th className="py-3 px-4">Incident Title</th>
                  <th className="py-3 px-4">Risk Score</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Source IP</th>
                  <th className="py-3 px-4">Target Asset</th>
                  <th className="py-3 px-4">Assigned Analyst</th>
                  <th className="py-3 px-4">Events</th>
                  <th className="py-3 px-4">First / Last Seen</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 font-sans">
                {incidents.map((inc) => (
                  <tr
                    key={inc.id}
                    onClick={() => navigate(`/incidents/${inc.id}`)}
                    className="hover:bg-slate-800/40 transition cursor-pointer"
                  >
                    <td className="py-3 px-4 font-mono font-bold text-cyan-400">
                      {inc.incident_number}
                    </td>
                    <td className="py-3 px-4">
                      <SeverityBadge severity={inc.severity} />
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-200 max-w-xs truncate">
                      {inc.title}
                    </td>
                    <td className="py-3 px-4">
                      <RiskScoreBadge score={inc.risk_score} />
                    </td>
                    <td className="py-3 px-4">
                      <span className={`font-mono text-[10px] uppercase font-bold px-2 py-0.5 rounded border ${getStatusBadge(inc.status)}`}>
                        {inc.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-300">
                      {inc.source_ip || 'Internal'}
                    </td>
                    <td className="py-3 px-4 text-slate-300">
                      {inc.primary_asset_name || 'Unassigned'}
                    </td>
                    <td className="py-3 px-4 text-slate-400">
                      <span className="flex items-center gap-1.5">
                        <UserCheck className="w-3.5 h-3.5 text-slate-500" />
                        <span>{inc.assigned_to_name || 'Unassigned'}</span>
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-400">
                      {inc.events_count} flows
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-400">
                      {new Date(inc.last_seen).toLocaleTimeString()}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={(e) => { e.stopPropagation(); navigate(`/incidents/${inc.id}`); }}
                        className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-cyan-400 font-mono text-[11px] border border-slate-700 transition inline-flex items-center gap-1"
                      >
                        <span>Investigate</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="p-3 bg-slate-950/60 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400 font-mono">
            <span>Total incidents: {total}</span>
            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage(p => p - 1)}
                className="px-2.5 py-1 rounded bg-slate-800 border border-slate-700 disabled:opacity-40"
              >
                Previous
              </button>
              <span>Page {page} of {Math.ceil(total / 20) || 1}</span>
              <button
                disabled={page >= Math.ceil(total / 20)}
                onClick={() => setPage(p => p + 1)}
                className="px-2.5 py-1 rounded bg-slate-800 border border-slate-700 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
