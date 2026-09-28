import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { Alert, Severity, AlertStatus } from '../types';
import { SeverityBadge } from '../components/SeverityBadge';
import { RiskScoreBadge } from '../components/RiskScoreBadge';
import { EmptyState, LoadingSkeleton } from '../components/EmptyState';
import { useAuth } from '../context/AuthContext';
import {
  AlertTriangle, Filter, Search, ShieldAlert, CheckCircle,
  Eye, X, ArrowUpRight, Check
} from 'lucide-react';

export const AlertsPage: React.FC = () => {
  const navigate = useNavigate();
  const { hasRole } = useAuth();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  // Filters
  const [severityFilter, setSeverityFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [detectionTypeFilter, setDetectionTypeFilter] = useState<string>('');
  const [sourceIpFilter, setSourceIpFilter] = useState<string>('');

  // Selected Alert for inspection modal
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const canModify = hasRole(['ADMIN', 'ANALYST']);

  const fetchAlerts = async () => {
    setLoading(true);
    try {
      const params: Record<string, any> = { page, limit: 20 };
      if (severityFilter) params.severity = severityFilter;
      if (statusFilter) params.status = statusFilter;
      if (detectionTypeFilter) params.detection_type = detectionTypeFilter;
      if (sourceIpFilter) params.source_ip = sourceIpFilter;

      const res = await api.listAlerts(params);
      setAlerts(res.items);
      setTotal(res.total);
    } catch (err) {
      console.error('Failed to load alerts', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, [page, severityFilter, statusFilter, detectionTypeFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchAlerts();
  };

  const handleUpdateStatus = async (alertId: string, newStatus: AlertStatus) => {
    if (!canModify) return;
    try {
      const updated = await api.updateAlertStatus(alertId, newStatus);
      setAlerts(prev => prev.map(a => a.id === alertId ? updated : a));
      if (selectedAlert?.id === alertId) setSelectedAlert(updated);
      setActionSuccess(`Alert marked as ${newStatus}`);
      setTimeout(() => setActionSuccess(null), 4000);
    } catch (err: any) {
      alert(err.message || 'Failed to update alert');
    }
  };

  const handleEscalate = async (alertId: string) => {
    if (!canModify) return;
    try {
      const res = await api.escalateAlert(alertId);
      setActionSuccess(`Escalated to Incident ${res.incident_number}`);
      setTimeout(() => setActionSuccess(null), 5000);
      setSelectedAlert(null);
      fetchAlerts();
      navigate(`/incidents/${res.incident_id}`);
    } catch (err: any) {
      alert(err.message || 'Failed to escalate alert');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800/80">
        <div>
          <h2 className="text-xl font-bold font-mono text-slate-100 flex items-center gap-2">
            SECURITY ALERTS
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">Triaged detection alerts with ML, anomaly, and rule correlation</p>
        </div>

        {actionSuccess && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono">
            <CheckCircle className="w-4 h-4" />
            <span>{actionSuccess}</span>
          </div>
        )}
      </div>

      {/* Filter Bar */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 shadow-xl">
        <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
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
            <option value="NEW">NEW</option>
            <option value="ACKNOWLEDGED">ACKNOWLEDGED</option>
            <option value="INVESTIGATING">INVESTIGATING</option>
            <option value="RESOLVED">RESOLVED</option>
            <option value="FALSE_POSITIVE">FALSE POSITIVE</option>
          </select>

          <select
            value={detectionTypeFilter}
            onChange={(e) => { setDetectionTypeFilter(e.target.value); setPage(1); }}
            className="px-3 py-2 bg-slate-950/70 border border-slate-700/80 rounded-lg text-xs font-mono text-slate-200 focus:outline-none focus:border-cyan-500"
          >
            <option value="">All Detection Types</option>
            <option value="ML_SUPERVISED">ML Supervised</option>
            <option value="ANOMALY_DETECTION">Anomaly Detection</option>
            <option value="RULE_MATCH">Rule Match</option>
            <option value="CORRELATED">Correlated Sequence</option>
          </select>

          <button
            type="submit"
            className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold rounded-lg shadow-sm transition"
          >
            Filter Alerts
          </button>
        </form>
      </div>

      {/* Alerts Table */}
      {loading ? (
        <LoadingSkeleton rows={8} />
      ) : alerts.length === 0 ? (
        <EmptyState
          title="No Alerts Found"
          description="No security alerts match the selected filter criteria. Trigger an attack simulation or ingest log files to generate alerts."
          actionLabel="Execute Simulation"
          onAction={() => navigate('/simulations')}
        />
      ) : (
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/70 border-b border-slate-800 text-[11px] font-mono uppercase text-slate-400">
                <tr>
                  <th className="py-3 px-4">Severity</th>
                  <th className="py-3 px-4">Alert Title</th>
                  <th className="py-3 px-4">Detection Engine</th>
                  <th className="py-3 px-4">Source IP</th>
                  <th className="py-3 px-4">Target Asset</th>
                  <th className="py-3 px-4">Risk</th>
                  <th className="py-3 px-4">Confidence</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 font-sans">
                {alerts.map((alert) => (
                  <tr
                    key={alert.id}
                    className="hover:bg-slate-800/40 transition cursor-pointer"
                    onClick={() => setSelectedAlert(alert)}
                  >
                    <td className="py-3 px-4">
                      <SeverityBadge severity={alert.severity} />
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-200">
                      {alert.title}
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700/60">
                        {alert.detection_type}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-cyan-400">
                      {alert.source_ip || 'Internal'}
                    </td>
                    <td className="py-3 px-4 text-slate-300">
                      {alert.asset_name || 'Unassigned'}
                    </td>
                    <td className="py-3 px-4">
                      <RiskScoreBadge score={alert.risk_score} />
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-300">
                      {Math.round(alert.confidence * 100)}%
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-mono text-[10px] uppercase font-bold text-slate-300 px-2 py-0.5 rounded bg-slate-800/80 border border-slate-700/60">
                        {alert.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-400 text-[11px]">
                      {new Date(alert.created_at).toLocaleTimeString()}
                    </td>
                    <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => setSelectedAlert(alert)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-cyan-400 hover:bg-cyan-500/10 transition"
                        title="View Alert Inspection"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="p-3 bg-slate-950/60 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400 font-mono">
            <span>Total alerts: {total}</span>
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

      {/* Alert Inspection Modal */}
      {selectedAlert && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setSelectedAlert(null)}
              className="absolute right-5 top-5 p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <SeverityBadge severity={selectedAlert.severity} size="md" />
              <h3 className="text-base font-bold text-slate-100">{selectedAlert.title}</h3>
            </div>

            <p className="text-xs text-slate-300 bg-slate-950/70 p-3 rounded-lg border border-slate-800 font-mono mb-4 leading-relaxed">
              {selectedAlert.description || 'No raw description provided.'}
            </p>

            <div className="grid grid-cols-2 gap-4 text-xs font-mono mb-6">
              <div className="p-3 bg-slate-950/40 rounded-lg border border-slate-800">
                <span className="text-slate-500 block">Source IP</span>
                <span className="text-cyan-400 font-bold">{selectedAlert.source_ip || 'N/A'}</span>
              </div>
              <div className="p-3 bg-slate-950/40 rounded-lg border border-slate-800">
                <span className="text-slate-500 block">Target Asset</span>
                <span className="text-slate-200">{selectedAlert.asset_name || 'Unassigned'}</span>
              </div>
              <div className="p-3 bg-slate-950/40 rounded-lg border border-slate-800">
                <span className="text-slate-500 block">Detection Type</span>
                <span className="text-slate-200">{selectedAlert.detection_type}</span>
              </div>
              <div className="p-3 bg-slate-950/40 rounded-lg border border-slate-800">
                <span className="text-slate-500 block">Risk Score / Confidence</span>
                <span className="text-slate-200 font-bold">{selectedAlert.risk_score}/100 ({Math.round(selectedAlert.confidence * 100)}%)</span>
              </div>
            </div>

            {/* Quick Actions */}
            {canModify && (
              <div className="pt-4 border-t border-slate-800 flex flex-wrap gap-2 justify-end">
                <button
                  onClick={() => handleUpdateStatus(selectedAlert.id, 'ACKNOWLEDGED')}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-medium transition"
                >
                  Acknowledge
                </button>
                <button
                  onClick={() => handleUpdateStatus(selectedAlert.id, 'RESOLVED')}
                  className="px-3 py-1.5 bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-600/30 rounded-lg text-xs font-medium transition"
                >
                  Mark Resolved
                </button>
                <button
                  onClick={() => handleUpdateStatus(selectedAlert.id, 'FALSE_POSITIVE')}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 border border-slate-700 rounded-lg text-xs font-medium transition"
                >
                  False Positive
                </button>
                <button
                  onClick={() => handleEscalate(selectedAlert.id)}
                  className="px-3.5 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-bold font-mono transition flex items-center gap-1.5 shadow-md shadow-cyan-950/50"
                >
                  <ArrowUpRight className="w-3.5 h-3.5" />
                  <span>Escalate to Incident</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
