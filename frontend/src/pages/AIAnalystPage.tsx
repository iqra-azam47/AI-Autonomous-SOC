import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { Incident, AIInvestigation } from '../types';
import { SeverityBadge } from '../components/SeverityBadge';
import { LoadingSkeleton, EmptyState } from '../components/EmptyState';
import { Bot, Sparkles, AlertCircle, Clock, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const AIAnalystPage: React.FC = () => {
  const { hasRole } = useAuth();
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [selectedIncidentId, setSelectedIncidentId] = useState<string>('');
  const [investigation, setInvestigation] = useState<AIInvestigation | null>(null);
  const [loading, setLoading] = useState(true);
  const [investigating, setInvestigating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canInvestigate = hasRole(['ADMIN', 'ANALYST']);

  useEffect(() => {
    const fetchIncidents = async () => {
      try {
        const res = await api.listIncidents({ limit: 50 });
        setIncidents(res.items);
        if (res.items.length > 0) {
          setSelectedIncidentId(res.items[0].id);
        }
      } catch (err) {
        console.error('Failed to load incidents', err);
      } finally {
        setLoading(false);
      }
    };
    fetchIncidents();
  }, []);

  const handleRunInvestigation = async () => {
    if (!selectedIncidentId || !canInvestigate) return;
    setInvestigating(true);
    setError(null);
    try {
      const inv = await api.investigateIncident(selectedIncidentId);
      setInvestigation(inv);
    } catch (err: any) {
      setError(err.message || 'AI investigation temporarily unavailable.');
    } finally {
      setInvestigating(false);
    }
  };

  const selectedIncident = incidents.find(i => i.id === selectedIncidentId);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="pb-2 border-b border-slate-800/80">
        <h2 className="text-xl font-bold font-mono text-slate-100 flex items-center gap-2.5">
          <Bot className="w-6 h-6 text-cyan-400" />
          AUTONOMOUS AI SOC ANALYST
        </h2>
        <p className="text-xs text-slate-400 mt-0.5">
          Agentic incident investigation powered by Google Gemini with controlled telemetry retrieval
        </p>
      </div>

      {/* Target Incident Selection Strip */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider font-mono">
            Select Investigation Target
          </span>
          <select
            value={selectedIncidentId}
            onChange={(e) => {
              setSelectedIncidentId(e.target.value);
              setInvestigation(null);
              setError(null);
            }}
            className="w-full md:w-96 px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs font-mono text-slate-100 font-bold focus:outline-none focus:border-cyan-500"
          >
            {incidents.map((inc) => (
              <option key={inc.id} value={inc.id}>
                {inc.incident_number}: {inc.title.slice(0, 45)}... ({inc.severity})
              </option>
            ))}
          </select>
        </div>

        {canInvestigate && (
          <button
            onClick={handleRunInvestigation}
            disabled={investigating || !selectedIncidentId}
            className="px-5 py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-lg text-xs font-bold font-mono uppercase tracking-wider shadow-lg shadow-cyan-950/40 flex items-center gap-2 transition disabled:opacity-60"
          >
            <Sparkles className={`w-4 h-4 ${investigating ? 'animate-spin' : ''}`} />
            <span>{investigating ? 'Gathering Telemetry & Analyzing...' : 'Execute Agentic Investigation'}</span>
          </button>
        )}
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3 text-amber-300 text-xs font-mono">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <strong className="block text-amber-200">AI Service Notice</strong>
            <span>{error}</span>
          </div>
        </div>
      )}

      {/* Investigation Results */}
      {investigating ? (
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-12 text-center space-y-4">
          <div className="w-12 h-12 border-3 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <h3 className="text-sm font-bold text-slate-200 font-mono">AI Agent Conducting Autonomous Investigation...</h3>
          <p className="text-xs text-slate-400 font-mono max-w-md mx-auto">
            Retrieving incident records &rarr; gathering correlated telemetry flows &rarr; looking up threat intelligence &rarr; evaluating MITRE techniques &rarr; generating defensive synthesis.
          </p>
        </div>
      ) : investigation ? (
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-800">
            <div>
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2 font-mono">
                Investigation Assessment: {selectedIncident?.incident_number}
              </h3>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                Model: <strong className="text-cyan-400">{investigation.model_name}</strong> | Generated: {new Date(investigation.created_at).toLocaleString()}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono px-2.5 py-1 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-bold flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                VERIFIED TELEMETRY GROUNDED
              </span>
            </div>
          </div>

          <div className="space-y-6 text-xs font-mono">
            {/* Section 1 */}
            <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-5">
              <h4 className="text-xs font-bold text-cyan-400 uppercase tracking-wider mb-2 font-mono">
                1. Executive Summary
              </h4>
              <p className="text-slate-200 leading-relaxed font-sans text-sm">
                {investigation.summary}
              </p>
            </div>

            {/* Sections 2 & 3 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-5">
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2 font-mono">
                  2. Evidence Considered
                </h4>
                <p className="text-slate-400 leading-relaxed whitespace-pre-line font-mono">
                  {investigation.evidence_analysis}
                </p>
              </div>

              <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-5">
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2 font-mono">
                  3. Attack Progression & Kill Chain
                </h4>
                <p className="text-slate-400 leading-relaxed whitespace-pre-line font-mono">
                  {investigation.attack_progression}
                </p>
              </div>
            </div>

            {/* Section 4 */}
            <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-5">
              <h4 className="text-xs font-bold text-cyan-300 uppercase tracking-wider mb-2 font-mono">
                4. Potential MITRE ATT&CK Techniques
              </h4>
              <p className="text-slate-300 leading-relaxed whitespace-pre-line font-mono">
                {investigation.mitre_analysis}
              </p>
            </div>

            {/* Section 5 */}
            <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-5">
              <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wider mb-2 font-mono">
                5. Recommended Investigation & Containment Steps
              </h4>
              <p className="text-slate-200 leading-relaxed whitespace-pre-line font-sans text-xs">
                {investigation.recommended_actions}
              </p>
            </div>

            {/* Section 6 */}
            <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-5">
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 font-mono">
                6. Sensor Limitations & Uncertainty
              </h4>
              <p className="text-slate-400 leading-relaxed font-mono">
                {investigation.limitations}
              </p>
            </div>
          </div>
        </div>
      ) : (
        <EmptyState
          title="Ready for Autonomous AI Investigation"
          description="Select an incident above and click 'Execute Agentic Investigation'. The AI will retrieve concrete telemetry through safe backend tools, analyze the attack kill chain, and generate an actionable defensive dossier."
          actionLabel="Execute Agentic Investigation"
          onAction={handleRunInvestigation}
        />
      )}
    </div>
  );
};
