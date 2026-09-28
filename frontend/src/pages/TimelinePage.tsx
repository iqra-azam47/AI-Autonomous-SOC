import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { Incident, SecurityEvent } from '../types';
import { LoadingSkeleton, EmptyState } from '../components/EmptyState';
import { Clock, ShieldAlert, ArrowRight, Activity, Terminal } from 'lucide-react';
import { SeverityBadge } from '../components/SeverityBadge';

export const TimelinePage: React.FC = () => {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [selectedIncidentId, setSelectedIncidentId] = useState<string>('');
  const [timelineEvents, setTimelineEvents] = useState<SecurityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [eventsLoading, setEventsLoading] = useState(false);

  useEffect(() => {
    const fetchIncidents = async () => {
      try {
        const res = await api.listIncidents({ limit: 50 });
        setIncidents(res.items);
        if (res.items.length > 0) {
          setSelectedIncidentId(res.items[0].id);
        }
      } catch (err) {
        console.error('Failed to load incidents for timeline', err);
      } finally {
        setLoading(false);
      }
    };
    fetchIncidents();
  }, []);

  useEffect(() => {
    if (!selectedIncidentId) return;
    const fetchDetail = async () => {
      setEventsLoading(true);
      try {
        const detail = await api.getIncident(selectedIncidentId);
        setTimelineEvents(detail.events);
      } catch (err) {
        console.error('Failed to load incident events', err);
      } finally {
        setEventsLoading(false);
      }
    };
    fetchDetail();
  }, [selectedIncidentId]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-slate-800/60 rounded-md w-64 animate-pulse" />
        <LoadingSkeleton rows={6} />
      </div>
    );
  }

  if (incidents.length === 0) {
    return (
      <EmptyState
        title="No Incidents Available for Timeline"
        description="Run an attack simulation to generate correlated multi-stage events and view the attack progression timeline."
      />
    );
  }

  const selectedIncident = incidents.find(i => i.id === selectedIncidentId);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800/80">
        <div>
          <h2 className="text-xl font-bold font-mono text-slate-100 flex items-center gap-2">
            <Clock className="w-5 h-5 text-cyan-400" />
            ATTACK RECONSTRUCTION TIMELINE
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">Chronological kill-chain progression across correlated attack vectors</p>
        </div>

        {/* Incident Selector */}
        <div className="flex items-center gap-2 text-xs font-mono">
          <span className="text-slate-400">Select Incident:</span>
          <select
            value={selectedIncidentId}
            onChange={(e) => setSelectedIncidentId(e.target.value)}
            className="px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-slate-100 font-bold focus:outline-none focus:border-cyan-500"
          >
            {incidents.map((inc) => (
              <option key={inc.id} value={inc.id}>
                {inc.incident_number}: {inc.title.slice(0, 35)}...
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Selected Incident Header Strip */}
      {selectedIncident && (
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4 shadow-xl">
          <div className="flex items-center gap-3">
            <span className="text-sm font-bold font-mono text-cyan-400">{selectedIncident.incident_number}</span>
            <SeverityBadge severity={selectedIncident.severity} />
            <h3 className="text-sm font-semibold text-slate-200">{selectedIncident.title}</h3>
          </div>
          <div className="flex items-center gap-4 text-xs font-mono text-slate-400">
            <span>Attacker: <strong className="text-slate-200">{selectedIncident.source_ip}</strong></span>
            <span>Target: <strong className="text-cyan-300">{selectedIncident.primary_asset_name || 'Asset'}</strong></span>
            <span>Risk: <strong className="text-red-400">{selectedIncident.risk_score}/100</strong></span>
          </div>
        </div>
      )}

      {/* Timeline Stream */}
      {eventsLoading ? (
        <LoadingSkeleton rows={5} />
      ) : timelineEvents.length === 0 ? (
        <div className="p-8 text-center text-xs font-mono text-slate-500 bg-slate-900/40 rounded-xl border border-slate-800">
          No correlated events found for this incident.
        </div>
      ) : (
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-7 shadow-xl">
          <div className="relative pl-8 space-y-8 before:absolute before:left-3 before:top-3 before:bottom-3 before:w-0.5 before:bg-gradient-to-b before:from-cyan-500 before:via-blue-600 before:to-purple-600">
            {timelineEvents.map((ev, idx) => {
              const isCrit = ev.event_type.includes('PRIVILEGE') || ev.event_type.includes('EXFIL');
              const isFail = ev.status === 'FAILURE';

              return (
                <div key={ev.id} className="relative group">
                  {/* Glowing Node */}
                  <div
                    className={`absolute -left-8 top-1 w-6 h-6 rounded-full border-2 flex items-center justify-center font-mono text-[10px] font-bold shadow-lg ${
                      isCrit ? 'bg-red-500 border-slate-900 text-white shadow-red-500/50' :
                      isFail ? 'bg-amber-500 border-slate-900 text-black shadow-amber-500/50' :
                      'bg-cyan-500 border-slate-900 text-black shadow-cyan-500/50'
                    }`}
                  >
                    {idx + 1}
                  </div>

                  <div className="bg-slate-950/80 border border-slate-800/90 rounded-xl p-4 transition duration-150 group-hover:border-cyan-500/40 group-hover:bg-slate-950">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2 font-mono text-xs">
                      <div className="flex items-center gap-2">
                        <span className="text-cyan-400 font-bold">{ev.event_type}</span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          ev.status === 'FAILURE' ? 'bg-red-500/15 text-red-400' : 'bg-emerald-500/15 text-emerald-400'
                        }`}>
                          {ev.status}
                        </span>
                        {ev.prediction && (
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            ev.prediction === 'MALICIOUS' ? 'bg-red-500/20 text-red-400' : 'bg-slate-800 text-slate-300'
                          }`}>
                            ML: {ev.prediction}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-3 text-[11px] text-slate-400">
                        <span>{new Date(ev.timestamp).toLocaleTimeString()}</span>
                        <span>{ev.source_ip} &rarr; port {ev.destination_port || 'N/A'}</span>
                      </div>
                    </div>

                    <p className="text-xs font-mono text-slate-300 bg-slate-900/70 p-3 rounded-lg border border-slate-800/60 leading-relaxed">
                      {ev.message || ev.raw_log}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
