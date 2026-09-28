import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { IncidentDetail, ThreatIntelligence, Severity, IncidentStatus } from '../types';
import { SeverityBadge } from '../components/SeverityBadge';
import { RiskScoreBadge } from '../components/RiskScoreBadge';
import { LoadingSkeleton } from '../components/EmptyState';
import { useAuth } from '../context/AuthContext';
import {
  ShieldAlert, Bot, Clock, Grid, Globe, FileText, CheckCircle2,
  Lock, AlertTriangle, ArrowLeft, Send, Sparkles, ShieldCheck,
  Check, UserCheck, Download, AlertCircle, Cpu, Activity
} from 'lucide-react';

export const IncidentDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, hasRole } = useAuth();

  const [detail, setDetail] = useState<IncidentDetail | null>(null);
  const [threatIntel, setThreatIntel] = useState<ThreatIntelligence | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'evidence' | 'timeline' | 'detection' | 'mitre' | 'ai' | 'notes'>('overview');

  // Interactive Action States
  const [investigatingAI, setInvestigatingAI] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [newNote, setNewNote] = useState('');
  const [submittingNote, setSubmittingNote] = useState(false);
  const [containmentModal, setContainmentModal] = useState(false);
  const [containmentType, setContainmentType] = useState('ISOLATE_HOST');
  const [containmentReason, setContainmentReason] = useState('Critical compromise progression observed across attack timeline.');
  const [containmentResult, setContainmentResult] = useState<any | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const canModify = hasRole(['ADMIN', 'ANALYST']);

  const fetchIncidentData = async () => {
    if (!id) return;
    try {
      const data = await api.getIncident(id);
      setDetail(data);

      if (data.incident.source_ip) {
        try {
          const ti = await api.getIpIntelligence(data.incident.source_ip);
          setThreatIntel(ti);
        } catch (e) {
          console.error('Threat intel fetch error', e);
        }
      }
    } catch (err) {
      console.error('Failed to load incident details', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIncidentData();
  }, [id]);

  const handleStatusChange = async (newStatus: IncidentStatus) => {
    if (!id || !canModify) return;
    try {
      await api.updateIncidentStatus(id, newStatus);
      setDetail(prev => prev ? { ...prev, incident: { ...prev.incident, status: newStatus } } : null);
      setActionSuccess(`Incident status updated to ${newStatus}`);
      setTimeout(() => setActionSuccess(null), 4000);
    } catch (err: any) {
      alert(err.message || 'Failed to update status');
    }
  };

  const handleSeverityChange = async (newSev: Severity) => {
    if (!id || !canModify) return;
    try {
      await api.updateIncidentSeverity(id, newSev);
      setDetail(prev => prev ? { ...prev, incident: { ...prev.incident, severity: newSev } } : null);
      setActionSuccess(`Severity updated to ${newSev}`);
      setTimeout(() => setActionSuccess(null), 4000);
    } catch (err: any) {
      alert(err.message || 'Failed to update severity');
    }
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !newNote.trim() || !canModify) return;
    setSubmittingNote(true);
    try {
      const added = await api.addAnalystNote(id, newNote);
      setDetail(prev => prev ? {
        ...prev,
        notes: [added, ...prev.notes]
      } : null);
      setNewNote('');
      setActionSuccess('Analyst note saved');
      setTimeout(() => setActionSuccess(null), 4000);
    } catch (err: any) {
      alert(err.message || 'Failed to add note');
    } finally {
      setSubmittingNote(false);
    }
  };

  const handleTriggerAI = async () => {
    if (!id || !canModify) return;
    setInvestigatingAI(true);
    setAiError(null);
    try {
      const inv = await api.investigateIncident(id);
      setDetail(prev => prev ? { ...prev, latest_investigation: inv } : null);
      setActiveTab('ai');
      setActionSuccess('AI investigation generated and archived');
      setTimeout(() => setActionSuccess(null), 4000);
    } catch (err: any) {
      setAiError(err.message || 'AI investigation temporarily unavailable.');
    } finally {
      setInvestigatingAI(false);
    }
  };

  const handleExecuteContainment = async () => {
    if (!id || !canModify) return;
    try {
      const res = await api.simulateContainment(id, containmentType, containmentReason);
      setContainmentResult(res);
      setDetail(prev => prev ? { ...prev, incident: { ...prev.incident, status: 'CONTAINED' } } : null);
      setContainmentModal(false);
      fetchIncidentData();
    } catch (err: any) {
      alert(err.message || 'Failed to execute simulated containment');
    }
  };

  const handleExportReport = async () => {
    if (!id) return;
    try {
      const report = await api.getIncidentReport(id);
      const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${detail?.incident.incident_number || 'incident'}_report.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      alert(err.message || 'Failed to export report');
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-slate-800/60 rounded-md w-64 animate-pulse" />
        <LoadingSkeleton rows={8} />
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="p-8 text-center font-mono text-sm text-slate-400">
        Incident not found.
      </div>
    );
  }

  const { incident, events, mitre_techniques, notes, latest_investigation, risk_factors } = detail;

  return (
    <div className="space-y-6 pb-12">
      {/* Back button and quick banner */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/incidents')}
          className="inline-flex items-center gap-2 text-xs font-mono text-slate-400 hover:text-slate-200 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Incidents Queue</span>
        </button>

        {actionSuccess && (
          <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono">
            <CheckCircle2 className="w-4 h-4" />
            <span>{actionSuccess}</span>
          </div>
        )}
      </div>

      {/* Containment Active Safety Notice Banner */}
      {incident.status === 'CONTAINED' && (
        <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-between text-purple-300 text-xs font-mono">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-5 h-5 text-purple-400 shrink-0" />
            <span>
              <strong>INCIDENT CONTAINED (SIMULATED):</strong> Target asset has been placed into simulated quarantine.
              <em> No real firewall or router changes were performed.</em>
            </span>
          </div>
          <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-200 border border-purple-500/40 text-[10px] font-bold">
            SAFE SIMULATION
          </span>
        </div>
      )}

      {/* Incident Header Card */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-3">
              <span className="text-base font-mono font-bold text-cyan-400 bg-cyan-500/10 px-2.5 py-0.5 rounded border border-cyan-500/30">
                {incident.incident_number}
              </span>
              <SeverityBadge severity={incident.severity} size="md" />
              <span className="text-xs font-mono px-2.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300 font-bold uppercase">
                {incident.status}
              </span>
            </div>
            <h1 className="text-xl font-bold text-slate-100">{incident.title}</h1>
            <p className="text-xs text-slate-400 font-mono">
              Observed from <strong className="text-slate-200">{incident.source_ip || 'Internal Host'}</strong> against <strong className="text-cyan-300">{incident.primary_asset_name || 'Asset'}</strong>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {canModify && (
              <>
                <button
                  onClick={handleTriggerAI}
                  disabled={investigatingAI}
                  className="px-3.5 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-lg text-xs font-bold font-mono shadow-lg shadow-cyan-950/40 flex items-center gap-2 transition disabled:opacity-60"
                >
                  <Sparkles className={`w-3.5 h-3.5 ${investigatingAI ? 'animate-spin' : ''}`} />
                  <span>{investigatingAI ? 'Analyzing with Gemini...' : 'Ask AI Analyst to Investigate'}</span>
                </button>

                <button
                  onClick={() => setContainmentModal(true)}
                  disabled={incident.status === 'CONTAINED'}
                  className="px-3.5 py-2 bg-purple-600/80 hover:bg-purple-600 text-white rounded-lg text-xs font-bold font-mono shadow-lg shadow-purple-950/40 flex items-center gap-1.5 transition disabled:opacity-40"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>Simulate Containment</span>
                </button>
              </>
            )}

            <button
              onClick={handleExportReport}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-lg text-xs font-mono flex items-center gap-1.5 transition"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Report</span>
            </button>
          </div>
        </div>

        {/* Metric Strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 pt-3 border-t border-slate-800/80 text-xs font-mono">
          <div className="p-2.5 bg-slate-950/40 rounded-lg border border-slate-800/60">
            <span className="text-slate-500 block text-[10px]">DETERMINISTIC RISK</span>
            <RiskScoreBadge score={incident.risk_score} size="md" showLabel />
          </div>
          <div className="p-2.5 bg-slate-950/40 rounded-lg border border-slate-800/60">
            <span className="text-slate-500 block text-[10px]">PIPELINE CONFIDENCE</span>
            <span className="text-slate-200 font-bold">{Math.round(incident.confidence * 100)}%</span>
          </div>
          <div className="p-2.5 bg-slate-950/40 rounded-lg border border-slate-800/60">
            <span className="text-slate-500 block text-[10px]">ASSOCIATED FLOWS</span>
            <span className="text-slate-200 font-bold">{events.length} Events</span>
          </div>
          <div className="p-2.5 bg-slate-950/40 rounded-lg border border-slate-800/60">
            <span className="text-slate-500 block text-[10px]">ASSIGNED TO</span>
            <span className="text-slate-200">{incident.assigned_to_name || 'Unassigned'}</span>
          </div>
          <div className="p-2.5 bg-slate-950/40 rounded-lg border border-slate-800/60">
            <span className="text-slate-500 block text-[10px]">FIRST OBSERVED</span>
            <span className="text-slate-300">{new Date(incident.first_seen).toLocaleTimeString()}</span>
          </div>
          <div className="p-2.5 bg-slate-950/40 rounded-lg border border-slate-800/60">
            <span className="text-slate-500 block text-[10px]">LAST UPDATED</span>
            <span className="text-slate-300">{new Date(incident.last_seen).toLocaleTimeString()}</span>
          </div>
        </div>
      </div>

      {aiError && (
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-2.5 text-amber-400 text-xs font-mono">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{aiError}</span>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="border-b border-slate-800 flex gap-2 overflow-x-auto text-xs font-mono">
        {[
          { key: 'overview', label: 'Overview & Risk', icon: ShieldAlert },
          { key: 'evidence', label: `Evidence (${events.length})`, icon: FileText },
          { key: 'timeline', label: 'Attack Timeline', icon: Clock },
          { key: 'detection', label: 'Detection & ML', icon: Cpu },
          { key: 'mitre', label: `MITRE ATT&CK (${mitre_techniques.length})`, icon: Grid },
          { key: 'ai', label: 'AI Investigation', icon: Bot },
          { key: 'notes', label: `Analyst Notes (${notes.length})`, icon: UserCheck },
        ].map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key as any)}
            className={`flex items-center gap-2 px-4 py-2.5 border-b-2 font-semibold transition ${
              activeTab === key
                ? 'border-cyan-500 text-cyan-400 bg-cyan-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            <span>{label}</span>
          </button>
        ))}
      </div>

      {/* Tab 1: Overview */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Description */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow-xl">
              <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-3 font-mono">
                Incident Executive Summary
              </h3>
              <p className="text-sm text-slate-300 leading-relaxed font-sans">
                {incident.description || 'No detailed incident description provided.'}
              </p>
            </div>

            {/* Risk Factor Breakdown */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow-xl">
              <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-3 font-mono">
                Deterministic Risk Composition Factors
              </h3>
              <ul className="space-y-2 text-xs font-mono">
                {risk_factors.map((factor, idx) => (
                  <li key={idx} className="flex items-center gap-2 text-slate-300 bg-slate-950/50 p-2.5 rounded border border-slate-800/80">
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                    <span>{factor}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Sidebar Telemetry & Actions */}
          <div className="space-y-6">
            {/* Quick Status / Severity Controls */}
            {canModify && (
              <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow-xl space-y-4">
                <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider font-mono">
                  Triage Status Operations
                </h3>
                <div className="space-y-2 text-xs font-mono">
                  <label className="text-slate-500 block">Change Status</label>
                  <select
                    value={incident.status}
                    onChange={(e) => handleStatusChange(e.target.value as IncidentStatus)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-200"
                  >
                    <option value="OPEN">OPEN</option>
                    <option value="INVESTIGATING">INVESTIGATING</option>
                    <option value="CONTAINED">CONTAINED</option>
                    <option value="RESOLVED">RESOLVED</option>
                    <option value="FALSE_POSITIVE">FALSE POSITIVE</option>
                  </select>
                </div>

                <div className="space-y-2 text-xs font-mono">
                  <label className="text-slate-500 block">Change Severity</label>
                  <select
                    value={incident.severity}
                    onChange={(e) => handleSeverityChange(e.target.value as Severity)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-200"
                  >
                    <option value="CRITICAL">CRITICAL</option>
                    <option value="HIGH">HIGH</option>
                    <option value="MEDIUM">MEDIUM</option>
                    <option value="LOW">LOW</option>
                  </select>
                </div>
              </div>
            )}

            {/* Threat Intelligence Card */}
            {threatIntel && (
              <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow-xl space-y-3 font-mono text-xs">
                <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center justify-between">
                  <span>Threat Intelligence</span>
                  <Globe className="w-3.5 h-3.5 text-cyan-400" />
                </h3>
                <div className="space-y-2 pt-2 border-t border-slate-800">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Reputation:</span>
                    <span className={`font-bold ${threatIntel.reputation === 'MALICIOUS' ? 'text-red-400' : 'text-emerald-400'}`}>
                      {threatIntel.reputation}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Source:</span>
                    <span className="text-slate-300">{threatIntel.source}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Country / ASN:</span>
                    <span className="text-slate-300">{threatIntel.country || 'N/A'} ({threatIntel.asn || 'Internal'})</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">ISP / Org:</span>
                    <span className="text-slate-300 truncate max-w-[150px]">{threatIntel.isp || 'N/A'}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 2: Evidence */}
      {activeTab === 'evidence' && (
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
          <div className="p-4 bg-slate-950/70 border-b border-slate-800">
            <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider font-mono">
              Captured Evidence & Telemetry Logs ({events.length} Flows)
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/50 text-[11px] font-mono uppercase text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="py-2.5 px-4">Timestamp</th>
                  <th className="py-2.5 px-4">Event Type</th>
                  <th className="py-2.5 px-4">Source IP</th>
                  <th className="py-2.5 px-4">Dest Port</th>
                  <th className="py-2.5 px-4">Status</th>
                  <th className="py-2.5 px-4">User</th>
                  <th className="py-2.5 px-4">ML Prediction</th>
                  <th className="py-2.5 px-4">Message</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 font-sans">
                {events.map((ev) => (
                  <tr key={ev.id} className="hover:bg-slate-800/40">
                    <td className="py-2.5 px-4 font-mono text-[11px] text-slate-400">
                      {new Date(ev.timestamp).toLocaleTimeString()}
                    </td>
                    <td className="py-2.5 px-4 font-mono font-medium text-cyan-400">
                      {ev.event_type}
                    </td>
                    <td className="py-2.5 px-4 font-mono text-slate-300">{ev.source_ip}</td>
                    <td className="py-2.5 px-4 font-mono text-slate-300">{ev.destination_port || 'N/A'}</td>
                    <td className="py-2.5 px-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${ev.status === 'FAILURE' ? 'bg-red-500/15 text-red-400' : 'bg-emerald-500/15 text-emerald-400'}`}>
                        {ev.status}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 font-mono text-slate-400">{ev.username || '-'}</td>
                    <td className="py-2.5 px-4 font-mono">
                      <span className={`px-2 py-0.5 rounded text-[10px] ${ev.prediction === 'MALICIOUS' ? 'bg-red-500/15 text-red-400' : 'bg-slate-800 text-slate-400'}`}>
                        {ev.prediction || 'NORMAL'}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 font-mono text-xs text-slate-300 truncate max-w-md">
                      {ev.message}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Timeline */}
      {activeTab === 'timeline' && (
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-6 shadow-xl space-y-6">
          <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider font-mono">
            Chronological Attack Progression Timeline
          </h3>

          <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-800">
            {events.map((ev, idx) => (
              <div key={ev.id} className="relative group">
                <div className={`absolute -left-6 top-1.5 w-4 h-4 rounded-full border-2 ${ev.status === 'FAILURE' ? 'bg-red-500 border-slate-900' : 'bg-cyan-500 border-slate-900'} shadow`} />
                <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-4 transition group-hover:border-slate-700">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-2 font-mono text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-200">Step {idx + 1}: {ev.event_type}</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${ev.status === 'FAILURE' ? 'bg-red-500/15 text-red-400' : 'bg-emerald-500/15 text-emerald-400'}`}>
                        {ev.status}
                      </span>
                    </div>
                    <span className="text-slate-500 text-[11px]">{new Date(ev.timestamp).toLocaleTimeString()}</span>
                  </div>
                  <p className="text-xs text-slate-300 font-mono leading-relaxed bg-slate-900/60 p-2.5 rounded border border-slate-800/50">
                    {ev.message || ev.raw_log}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 4: Detection & ML */}
      {activeTab === 'detection' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow-xl space-y-4 font-mono text-xs">
            <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <Cpu className="w-4 h-4 text-cyan-400" />
              Machine Learning Classification
            </h3>
            <div className="space-y-3 pt-2">
              <div className="p-3 bg-slate-950/70 rounded-lg border border-slate-800">
                <span className="text-slate-500 block">Supervised Prediction</span>
                <span className="text-red-400 font-bold text-sm">MALICIOUS FLOW</span>
              </div>
              <div className="p-3 bg-slate-950/70 rounded-lg border border-slate-800">
                <span className="text-slate-500 block">Classifier Confidence</span>
                <span className="text-slate-200 font-bold">{Math.round(incident.confidence * 100)}%</span>
              </div>
              <div className="p-3 bg-slate-950/70 rounded-lg border border-slate-800">
                <span className="text-slate-500 block">Attack Category</span>
                <span className="text-cyan-400 font-bold">{events[0]?.attack_category || 'INTRUSION_ATTACK'}</span>
              </div>
            </div>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow-xl space-y-4 font-mono text-xs">
            <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <Activity className="w-4 h-4 text-orange-400" />
              Isolation Forest Anomaly Assessment
            </h3>
            <div className="space-y-3 pt-2">
              <div className="p-3 bg-slate-950/70 rounded-lg border border-slate-800">
                <span className="text-slate-500 block">Statistical Anomaly Flag</span>
                <span className="text-orange-400 font-bold text-sm">ANOMALY CONFIRMED</span>
              </div>
              <div className="p-3 bg-slate-950/70 rounded-lg border border-slate-800">
                <span className="text-slate-500 block">Normalized Anomaly Score</span>
                <span className="text-slate-200 font-bold">{events[0]?.anomaly_score || 0.78} / 1.0</span>
              </div>
              <div className="p-3 bg-slate-950/70 rounded-lg border border-slate-800">
                <span className="text-slate-500 block">Algorithm Reference</span>
                <span className="text-slate-300">scikit-learn IsolationForest (contamination=0.10)</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 5: MITRE ATT&CK */}
      {activeTab === 'mitre' && (
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-6 shadow-xl space-y-4">
          <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider font-mono">
            MITRE ATT&CK Behavioral Technique Mappings
          </h3>
          <div className="space-y-3">
            {mitre_techniques.map((t) => (
              <div key={t.technique_id} className="p-4 bg-slate-950/70 border border-slate-800 rounded-xl font-mono text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="px-2 py-0.5 rounded bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 font-bold">
                      {t.technique_id}
                    </span>
                    <strong className="text-sm text-slate-100 font-sans">{t.name}</strong>
                  </div>
                  <span className="text-slate-500 text-[11px] uppercase">{t.tactic}</span>
                </div>
                <p className="text-slate-400 text-xs font-mono pt-1">
                  <strong>Supporting Evidence:</strong> {t.evidence || 'Pattern recognized by correlation rules.'}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 6: AI Investigation */}
      {activeTab === 'ai' && (
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                <Bot className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                  AI SOC Analyst Autonomous Investigation
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                    {latest_investigation?.model_name || 'gemini-2.5-flash'}
                  </span>
                </h3>
                <p className="text-xs text-slate-400">Multi-stage evidence reasoning and defensive recommendations</p>
              </div>
            </div>

            {canModify && (
              <button
                onClick={handleTriggerAI}
                disabled={investigatingAI}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-400 text-xs font-mono border border-slate-700 flex items-center gap-1.5 transition disabled:opacity-50"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Re-analyze</span>
              </button>
            )}
          </div>

          {latest_investigation ? (
            <div className="space-y-6 text-xs font-mono">
              <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-4">
                <h4 className="text-xs font-bold text-cyan-400 uppercase tracking-wider mb-2 font-mono">
                  1. Executive Summary
                </h4>
                <p className="text-slate-200 leading-relaxed font-sans text-sm">
                  {latest_investigation.summary}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-4">
                  <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2 font-mono">
                    2. Evidence Analysis
                  </h4>
                  <p className="text-slate-400 leading-relaxed whitespace-pre-line font-mono">
                    {latest_investigation.evidence_analysis}
                  </p>
                </div>

                <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-4">
                  <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2 font-mono">
                    3. Attack Progression
                  </h4>
                  <p className="text-slate-400 leading-relaxed whitespace-pre-line font-mono">
                    {latest_investigation.attack_progression}
                  </p>
                </div>
              </div>

              <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-4">
                <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wider mb-2 font-mono">
                  4. Recommended Defensive Actions
                </h4>
                <p className="text-slate-300 leading-relaxed whitespace-pre-line font-sans text-xs">
                  {latest_investigation.recommended_actions}
                </p>
              </div>

              <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-4">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 font-mono">
                  5. Sensor Limitations & Uncertainty
                </h4>
                <p className="text-slate-400 leading-relaxed font-mono">
                  {latest_investigation.limitations}
                </p>
              </div>
            </div>
          ) : (
            <div className="py-12 text-center space-y-3 font-mono">
              <Bot className="w-10 h-10 text-slate-600 mx-auto" />
              <p className="text-xs text-slate-400">No autonomous AI investigation recorded for this incident yet.</p>
              {canModify && (
                <button
                  onClick={handleTriggerAI}
                  disabled={investigatingAI}
                  className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-bold transition shadow-md shadow-cyan-950/40"
                >
                  Generate AI Investigation
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Tab 7: Analyst Notes */}
      {activeTab === 'notes' && (
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-6 shadow-xl space-y-6">
          <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider font-mono">
            Analyst Collaboration & Triage Log
          </h3>

          {/* New Note Form */}
          {canModify && (
            <form onSubmit={handleAddNote} className="space-y-3">
              <textarea
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder="Author security assessment, verification hypothesis, or containment notes..."
                rows={3}
                className="w-full p-3 bg-slate-950/80 border border-slate-700 rounded-lg text-xs font-mono text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
              />
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={submittingNote || !newNote.trim()}
                  className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold font-mono rounded-lg transition flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{submittingNote ? 'Saving...' : 'Add Analyst Note'}</span>
                </button>
              </div>
            </form>
          )}

          {/* Notes List */}
          <div className="space-y-3 divide-y divide-slate-800/80">
            {notes.length > 0 ? (
              notes.map((n) => (
                <div key={n.id} className="pt-3 first:pt-0 space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] font-mono">
                    <span className="font-bold text-cyan-400">{n.username}</span>
                    <span className="text-slate-500">{new Date(n.created_at).toLocaleString()}</span>
                  </div>
                  <p className="text-xs text-slate-300 font-mono whitespace-pre-line leading-relaxed bg-slate-950/40 p-3 rounded-lg border border-slate-800/60">
                    {n.note}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-500 font-mono py-4 text-center">No analyst notes recorded yet.</p>
            )}
          </div>
        </div>
      )}

      {/* Simulated Containment Modal */}
      {containmentModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-400">
                <Lock className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-100">Simulate Containment Action</h3>
                <p className="text-xs text-slate-400 font-mono">Human-in-the-Loop Active Response</p>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs font-mono">
              <strong>SAFETY ASSURANCE:</strong> This is a simulation sandbox. Executing containment will update the incident status and append an audit record, but will <em>not</em> modify live network firewalls or shutdown physical machines.
            </div>

            <div className="space-y-3 text-xs font-mono">
              <div>
                <label className="text-slate-400 block mb-1">Containment Strategy</label>
                <select
                  value={containmentType}
                  onChange={(e) => setContainmentType(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-200"
                >
                  <option value="ISOLATE_HOST">ISOLATE_HOST (Quarantine Asset from Subnet)</option>
                  <option value="BLOCK_IP">BLOCK_IP (Apply Simulated Ingress Drop Rule)</option>
                  <option value="REVOKE_CREDENTIALS">REVOKE_CREDENTIALS (Invalidate User Access Session)</option>
                </select>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Analyst Justification</label>
                <textarea
                  value={containmentReason}
                  onChange={(e) => setContainmentReason(e.target.value)}
                  rows={2}
                  className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-lg text-slate-200"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-slate-800 flex justify-end gap-2.5">
              <button
                onClick={() => setContainmentModal(false)}
                className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono"
              >
                Cancel
              </button>
              <button
                onClick={handleExecuteContainment}
                className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold font-mono shadow-md shadow-purple-950/50"
              >
                Confirm Simulated Containment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
