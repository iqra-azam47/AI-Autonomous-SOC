import React, { useState, useEffect } from 'react';
import {
  ScrollText, Filter, RefreshCw, CheckCircle2, XCircle,
  Search, Shield, ChevronLeft, ChevronRight, Eye, X
} from 'lucide-react';
import { api } from '../services/api';
import { AuditLogItem } from '../types';

export const AuditLogsPage: React.FC = () => {
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [total, setTotal] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const [limit] = useState<number>(20);
  const [pages, setPages] = useState<number>(1);

  const [actionFilter, setActionFilter] = useState<string>('ALL');
  const [selectedLog, setSelectedLog] = useState<AuditLogItem | null>(null);

  const fetchLogs = async (currentPage: number = page) => {
    setLoading(true);
    try {
      const params: Record<string, any> = { page: currentPage, limit };
      if (actionFilter !== 'ALL') {
        params.action = actionFilter;
      }
      const data = await api.listAuditLogs(params);
      setLogs(data.items);
      setTotal(data.total);
      setPage(data.page);
      setPages(data.pages);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs(1);
  }, [actionFilter]);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= pages) {
      setPage(newPage);
      fetchLogs(newPage);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-100 flex items-center gap-2.5 font-mono">
          <ScrollText className="w-6 h-6 text-cyan-400" />
          SYSTEM AUDIT LOGS
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Immutable audit trail recording all operator actions, containment commands, auth attempts, and AI agent queries.
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-200 text-xs font-mono focus:outline-none focus:border-cyan-500 w-full sm:w-auto"
          >
            <option value="ALL">All Actions</option>
            <option value="SIMULATED_CONTAINMENT">Simulated Containment</option>
            <option value="USER_LOGIN">User Login</option>
            <option value="ALERT_ESCALATED">Alert Escalated</option>
            <option value="INCIDENT_STATUS_UPDATED">Incident Status Changed</option>
            <option value="SIMULATION_RUN">Simulation Executed</option>
            <option value="AI_INVESTIGATION">AI Investigation</option>
          </select>

          <button
            onClick={() => fetchLogs(page)}
            className="p-2 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 rounded-lg transition-colors"
            title="Refresh Audit Trail"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        <span className="text-xs font-mono text-slate-400">
          Showing {logs.length} of {total} total logged events
        </span>
      </div>

      {/* Audit Table */}
      <div className="bg-[#0e1424] border border-slate-800 rounded-xl overflow-hidden shadow">
        <table className="w-full text-left text-xs font-mono">
          <thead className="bg-slate-900/80 text-slate-400 uppercase tracking-wider border-b border-slate-800">
            <tr>
              <th className="py-3 px-4">Timestamp</th>
              <th className="py-3 px-4">Operator</th>
              <th className="py-3 px-4">Action</th>
              <th className="py-3 px-4">Target Resource</th>
              <th className="py-3 px-4">IP Origin</th>
              <th className="py-3 px-4 text-center">Result</th>
              <th className="py-3 px-4 text-right">Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/80 text-slate-300">
            {loading ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-slate-500">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-cyan-400" />
                  Loading audit logs...
                </td>
              </tr>
            ) : logs.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-slate-500">
                  No audit log entries matching criteria.
                </td>
              </tr>
            ) : (
              logs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-800/40">
                  <td className="py-3 px-4 text-slate-400 whitespace-nowrap">
                    {new Date(log.created_at).toLocaleString()}
                  </td>
                  <td className="py-3 px-4 font-bold text-slate-200">
                    {log.username || 'System Engine'}
                  </td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                      {log.action}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-slate-400">
                    {log.resource_type} {log.resource_id ? `(${log.resource_id.slice(0, 8)}...)` : ''}
                  </td>
                  <td className="py-3 px-4 text-slate-400">
                    {log.ip_address || '127.0.0.1'}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                        log.result === 'SUCCESS'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : 'bg-red-500/10 text-red-400 border border-red-500/20'
                      }`}
                    >
                      {log.result}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={() => setSelectedLog(log)}
                      className="p-1 text-slate-400 hover:text-cyan-400 hover:bg-slate-800 rounded transition-colors"
                      title="Inspect Log Entry"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Pagination Controls */}
        <div className="p-3 bg-slate-900/60 border-t border-slate-800 flex items-center justify-between font-mono text-xs text-slate-400">
          <span>Page {page} of {pages || 1}</span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => handlePageChange(page - 1)}
              disabled={page <= 1}
              className="p-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-40 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => handlePageChange(page + 1)}
              disabled={page >= pages}
              className="p-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-40 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Detail Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0e1424] border border-slate-700/80 rounded-xl w-full max-w-lg shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2 font-mono">
                <ScrollText className="w-4 h-4 text-cyan-400" />
                Audit Record Details
              </h3>
              <button onClick={() => setSelectedLog(null)} className="p-1 text-slate-400 hover:text-slate-200">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2 text-xs font-mono text-slate-300">
              <div className="flex justify-between py-1 border-b border-slate-800">
                <span className="text-slate-500">Record ID:</span>
                <span>{selectedLog.id}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800">
                <span className="text-slate-500">Operator:</span>
                <span className="font-bold text-cyan-300">{selectedLog.username || 'System Engine'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800">
                <span className="text-slate-500">Action:</span>
                <span>{selectedLog.action}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800">
                <span className="text-slate-500">Target:</span>
                <span>{selectedLog.resource_type} ({selectedLog.resource_id || 'N/A'})</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800">
                <span className="text-slate-500">Timestamp:</span>
                <span>{new Date(selectedLog.created_at).toISOString()}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800">
                <span className="text-slate-500">Result:</span>
                <span className="text-emerald-400 font-bold">{selectedLog.result}</span>
              </div>

              <div className="pt-2">
                <span className="text-slate-500 block mb-1">Payload / Details:</span>
                <pre className="p-3 bg-slate-950 rounded border border-slate-800 text-[11px] text-slate-300 whitespace-pre-wrap overflow-x-auto">
                  {selectedLog.details || 'No additional parameters logged.'}
                </pre>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setSelectedLog(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded font-mono text-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
