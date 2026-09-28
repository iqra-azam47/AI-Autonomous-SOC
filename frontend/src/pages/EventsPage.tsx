import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { SecurityEvent } from '../types';
import { LoadingSkeleton, EmptyState } from '../components/EmptyState';
import { Search, Eye, X, Filter, Code } from 'lucide-react';

export const EventsPage: React.FC = () => {
  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<SecurityEvent | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [eventTypeFilter, setEventTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [predictionFilter, setPredictionFilter] = useState('');

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const params: Record<string, any> = { page, limit: 25 };
      if (search) params.search = search;
      if (eventTypeFilter) params.event_type = eventTypeFilter;
      if (statusFilter) params.status = statusFilter;
      if (predictionFilter) params.prediction = predictionFilter;

      const res = await api.listEvents(params);
      setEvents(res.items);
      setTotal(res.total);
    } catch (err) {
      console.error('Failed to load events', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, [page, eventTypeFilter, statusFilter, predictionFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchEvents();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="pb-2 border-b border-slate-800/80">
        <h2 className="text-xl font-bold font-mono text-slate-100">SECURITY EVENT EXPLORER</h2>
        <p className="text-xs text-slate-400 mt-0.5">Normalized telemetry events stream across enterprise sensors</p>
      </div>

      {/* Filter Bar */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 shadow-xl">
        <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="relative">
            <input
              type="text"
              placeholder="Search Message / IP / User..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-950/70 border border-slate-700/80 rounded-lg text-xs font-mono text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
            />
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
          </div>

          <select
            value={eventTypeFilter}
            onChange={(e) => { setEventTypeFilter(e.target.value); setPage(1); }}
            className="px-3 py-2 bg-slate-950/70 border border-slate-700/80 rounded-lg text-xs font-mono text-slate-200 focus:outline-none focus:border-cyan-500"
          >
            <option value="">All Event Types</option>
            <option value="AUTH_FAILURE">AUTH_FAILURE</option>
            <option value="AUTH_SUCCESS">AUTH_SUCCESS</option>
            <option value="PORT_SCAN">PORT_SCAN</option>
            <option value="WEB_REQUEST">WEB_REQUEST</option>
            <option value="PRIVILEGE_ACCESS">PRIVILEGE_ACCESS</option>
            <option value="OUTBOUND_CONNECTION">OUTBOUND_CONNECTION</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="px-3 py-2 bg-slate-950/70 border border-slate-700/80 rounded-lg text-xs font-mono text-slate-200 focus:outline-none focus:border-cyan-500"
          >
            <option value="">All Statuses</option>
            <option value="SUCCESS">SUCCESS / ALLOWED</option>
            <option value="FAILURE">FAILURE / BLOCKED</option>
          </select>

          <select
            value={predictionFilter}
            onChange={(e) => { setPredictionFilter(e.target.value); setPage(1); }}
            className="px-3 py-2 bg-slate-950/70 border border-slate-700/80 rounded-lg text-xs font-mono text-slate-200 focus:outline-none focus:border-cyan-500"
          >
            <option value="">All ML Classifications</option>
            <option value="MALICIOUS">MALICIOUS</option>
            <option value="SUSPICIOUS">SUSPICIOUS</option>
            <option value="NORMAL">NORMAL</option>
          </select>

          <button
            type="submit"
            className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold rounded-lg shadow-sm transition"
          >
            Search Events
          </button>
        </form>
      </div>

      {/* Events Table */}
      {loading ? (
        <LoadingSkeleton rows={10} />
      ) : events.length === 0 ? (
        <EmptyState
          title="No Events Found"
          description="No security events match the current search filters."
        />
      ) : (
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/70 border-b border-slate-800 text-[11px] font-mono uppercase text-slate-400">
                <tr>
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Source IP</th>
                  <th className="py-3 px-4">Destination IP:Port</th>
                  <th className="py-3 px-4">Event Type</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">User</th>
                  <th className="py-3 px-4">ML Prediction</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Source Type</th>
                  <th className="py-3 px-4 text-right">Inspect</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 font-sans">
                {events.map((ev) => (
                  <tr
                    key={ev.id}
                    onClick={() => setSelectedEvent(ev)}
                    className="hover:bg-slate-800/40 transition cursor-pointer"
                  >
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-400">
                      {new Date(ev.timestamp).toLocaleTimeString()}
                    </td>
                    <td className="py-3 px-4 font-mono text-cyan-400">{ev.source_ip}</td>
                    <td className="py-3 px-4 font-mono text-slate-300">
                      {ev.destination_ip ? `${ev.destination_ip}:${ev.destination_port || '-'}` : '-'}
                    </td>
                    <td className="py-3 px-4 font-mono font-medium text-slate-200">{ev.event_type}</td>
                    <td className="py-3 px-4 font-mono">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${ev.status === 'FAILURE' ? 'bg-red-500/15 text-red-400' : 'bg-emerald-500/15 text-emerald-400'}`}>
                        {ev.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-400">{ev.username || '-'}</td>
                    <td className="py-3 px-4 font-mono">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        ev.prediction === 'MALICIOUS' ? 'bg-red-500/15 text-red-400' :
                        ev.prediction === 'SUSPICIOUS' ? 'bg-amber-500/15 text-amber-400' : 'bg-emerald-500/10 text-emerald-400'
                      }`}>
                        {ev.prediction || 'NORMAL'}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-300 text-[11px]">
                      {ev.attack_category || '-'}
                    </td>
                    <td className="py-3 px-4 font-mono text-[10px] text-slate-500">
                      {ev.source_type}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={(e) => { e.stopPropagation(); setSelectedEvent(ev); }}
                        className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-cyan-400 transition"
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
            <span>Total records: {total}</span>
            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage(p => p - 1)}
                className="px-2.5 py-1 rounded bg-slate-800 border border-slate-700 disabled:opacity-40"
              >
                Previous
              </button>
              <span>Page {page} of {Math.ceil(total / 25) || 1}</span>
              <button
                disabled={page >= Math.ceil(total / 25)}
                onClick={() => setPage(p => p + 1)}
                className="px-2.5 py-1 rounded bg-slate-800 border border-slate-700 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Raw vs Normalized Event Detail Modal */}
      {selectedEvent && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto space-y-4">
            <button
              onClick={() => setSelectedEvent(null)}
              className="absolute right-5 top-5 p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-base font-bold font-mono text-slate-100 flex items-center gap-2">
              <Code className="w-4 h-4 text-cyan-400" />
              Event Telemetry Inspection
            </h3>

            {/* Structured Telemetry */}
            <div className="grid grid-cols-2 gap-3 text-xs font-mono">
              <div className="p-2.5 bg-slate-950 rounded border border-slate-800">
                <span className="text-slate-500 block">Event Type</span>
                <span className="text-cyan-400 font-bold">{selectedEvent.event_type}</span>
              </div>
              <div className="p-2.5 bg-slate-950 rounded border border-slate-800">
                <span className="text-slate-500 block">Status / Action</span>
                <span className="text-slate-200">{selectedEvent.status} / {selectedEvent.action}</span>
              </div>
              <div className="p-2.5 bg-slate-950 rounded border border-slate-800">
                <span className="text-slate-500 block">Source IP</span>
                <span className="text-slate-200 font-bold">{selectedEvent.source_ip}</span>
              </div>
              <div className="p-2.5 bg-slate-950 rounded border border-slate-800">
                <span className="text-slate-500 block">Destination</span>
                <span className="text-slate-200">{selectedEvent.destination_ip}:{selectedEvent.destination_port || '-'}</span>
              </div>
            </div>

            {/* Message */}
            <div>
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1 font-mono">
                Normalized Message
              </label>
              <p className="text-xs font-mono text-slate-200 bg-slate-950 p-3 rounded-lg border border-slate-800">
                {selectedEvent.message || 'No normalized message'}
              </p>
            </div>

            {/* Raw Log */}
            <div>
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1 font-mono">
                Original Raw Log Payload
              </label>
              <pre className="text-xs font-mono text-cyan-300 bg-slate-950 p-3 rounded-lg border border-slate-800 overflow-x-auto whitespace-pre-wrap leading-relaxed">
                {selectedEvent.raw_log || 'N/A'}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
