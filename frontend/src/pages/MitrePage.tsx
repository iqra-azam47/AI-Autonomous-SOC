import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Grid, Shield, AlertTriangle, ExternalLink, RefreshCw, X,
  Layers, ChevronRight, Hash, Activity
} from 'lucide-react';
import { api } from '../services/api';
import { MitreTechnique } from '../types';
import { SeverityBadge } from '../components/SeverityBadge';

export const MitrePage: React.FC = () => {
  const navigate = useNavigate();

  const [techniques, setTechniques] = useState<MitreTechnique[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Selected technique for details drawer
  const [selectedTechnique, setSelectedTechnique] = useState<MitreTechnique | null>(null);
  const [techniqueDetails, setTechniqueDetails] = useState<{ technique: MitreTechnique; associated_incidents: any[] } | null>(null);
  const [loadingDetail, setLoadingDetail] = useState<boolean>(false);

  // Tactics in MITRE ATT&CK Enterprise Matrix order
  const tacticsOrder = [
    'Reconnaissance',
    'Resource Development',
    'Initial Access',
    'Execution',
    'Persistence',
    'Privilege Escalation',
    'Defense Evasion',
    'Credential Access',
    'Discovery',
    'Lateral Movement',
    'Collection',
    'Command and Control',
    'Exfiltration',
    'Impact'
  ];

  const fetchTechniques = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.listMitreTechniques();
      setTechniques(data);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to fetch MITRE ATT&CK mapping');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTechniques();
  }, []);

  const handleSelectTechnique = async (tech: MitreTechnique) => {
    setSelectedTechnique(tech);
    setLoadingDetail(true);
    try {
      const data = await api.getMitreTechnique(tech.id);
      setTechniqueDetails(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingDetail(false);
    }
  };

  // Group techniques by tactic
  const groupedByTactic: Record<string, MitreTechnique[]> = {};
  techniques.forEach((t) => {
    const tacticName = t.tactic || 'Other';
    if (!groupedByTactic[tacticName]) {
      groupedByTactic[tacticName] = [];
    }
    groupedByTactic[tacticName].push(t);
  });

  const totalTechniques = techniques.length;
  const activeDetectedTechniques = techniques.filter((t) => (t.associated_incidents_count || 0) > 0).length;
  const coveredTactics = Object.keys(groupedByTactic).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-100 flex items-center gap-2.5 font-mono">
            <Grid className="w-6 h-6 text-cyan-400" />
            MITRE ATT&CK® MATRIX
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Enterprise adversary tactics and techniques mapped against active telemetry and incident detections.
          </p>
        </div>
        <button
          onClick={fetchTechniques}
          className="p-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 rounded-lg text-xs font-mono self-start sm:self-auto flex items-center gap-2"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh Matrix
        </button>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-[#0e1424] border border-slate-800 rounded-xl p-5 shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono uppercase text-slate-400">Tactics Monitored</span>
            <Layers className="w-5 h-5 text-cyan-400" />
          </div>
          <div className="text-3xl font-bold font-mono text-slate-100 mt-2">{coveredTactics}</div>
          <span className="text-[11px] text-slate-400 font-mono mt-1 block">Kill chain phases represented</span>
        </div>

        <div className="bg-[#0e1424] border border-slate-800 rounded-xl p-5 shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono uppercase text-slate-400">Mapped Techniques</span>
            <Hash className="w-5 h-5 text-cyan-400" />
          </div>
          <div className="text-3xl font-bold font-mono text-slate-100 mt-2">{totalTechniques}</div>
          <span className="text-[11px] text-slate-400 font-mono mt-1 block">Normalized detection coverage</span>
        </div>

        <div className="bg-[#0e1424] border border-slate-800 rounded-xl p-5 shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono uppercase text-slate-400">Techniques With Detections</span>
            <Activity className="w-5 h-5 text-red-400" />
          </div>
          <div className="text-3xl font-bold font-mono text-red-400 mt-2">{activeDetectedTechniques}</div>
          <span className="text-[11px] text-slate-400 font-mono mt-1 block">Triggered in confirmed incidents</span>
        </div>
      </div>

      {/* Matrix Board */}
      <div className="bg-[#0e1424] border border-slate-800 rounded-xl p-5 shadow overflow-hidden">
        <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-3">
          <span className="text-xs font-mono uppercase tracking-wider text-slate-400">
            Adversary Tactic Columns & Active Techniques
          </span>
          <span className="text-[11px] font-mono text-cyan-400/90">
            Click any technique to inspect incident evidence
          </span>
        </div>

        {loading ? (
          <div className="py-16 text-center text-slate-500 font-mono text-sm">
            <RefreshCw className="w-8 h-8 text-cyan-400 animate-spin mx-auto mb-3" />
            Rendering MITRE ATT&CK Matrix...
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {Object.keys(groupedByTactic).map((tactic) => {
              const techList = groupedByTactic[tactic];
              return (
                <div key={tactic} className="bg-slate-900/70 border border-slate-800 rounded-lg p-3 flex flex-col">
                  <div className="border-b border-slate-800/80 pb-2 mb-3">
                    <h3 className="text-xs font-bold font-mono text-cyan-300 uppercase tracking-wide">
                      {tactic}
                    </h3>
                    <span className="text-[10px] font-mono text-slate-500">
                      {techList.length} technique{techList.length !== 1 ? 's' : ''}
                    </span>
                  </div>

                  <div className="space-y-2 flex-1">
                    {techList.map((t) => {
                      const hasIncidents = (t.associated_incidents_count || 0) > 0;
                      return (
                        <div
                          key={t.id}
                          onClick={() => handleSelectTechnique(t)}
                          className={`p-2.5 rounded-lg border cursor-pointer transition-all duration-150 ${
                            hasIncidents
                              ? 'bg-red-950/20 border-red-500/40 hover:bg-red-950/40 shadow-sm shadow-red-950/30'
                              : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 hover:bg-slate-800/40'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-mono font-bold text-cyan-400">
                              {t.technique_id}
                            </span>
                            {hasIncidents && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-red-500/20 text-red-300 border border-red-500/30">
                                {t.associated_incidents_count} hits
                              </span>
                            )}
                          </div>
                          <div className="text-xs font-semibold text-slate-200 mt-1 line-clamp-1">
                            {t.name}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Technique Detail Drawer */}
      {selectedTechnique && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0e1424] border border-slate-700/80 rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-mono font-bold">
                    {selectedTechnique.technique_id}
                  </span>
                  <span className="text-xs font-mono text-slate-400 uppercase tracking-wider">
                    {selectedTechnique.tactic}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-slate-100 mt-1">
                  {selectedTechnique.name}
                </h3>
              </div>
              <button
                onClick={() => setSelectedTechnique(null)}
                className="p-1 text-slate-400 hover:text-slate-200 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 font-mono">
                Technique Description
              </h4>
              <p className="text-xs text-slate-300 leading-relaxed bg-slate-900/60 p-3.5 rounded-lg border border-slate-800">
                {selectedTechnique.description || 'MITRE ATT&CK technique catalog entry.'}
              </p>
            </div>

            <div>
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 font-mono flex items-center justify-between">
                <span>Associated SOC Incidents ({techniqueDetails?.associated_incidents?.length || 0})</span>
                <span className="text-[10px] text-slate-500 lowercase">click to investigate</span>
              </h4>

              {loadingDetail ? (
                <div className="py-6 text-center text-slate-500 text-xs font-mono">
                  Loading incident evidence...
                </div>
              ) : techniqueDetails?.associated_incidents && techniqueDetails.associated_incidents.length > 0 ? (
                <div className="space-y-2 max-h-56 overflow-y-auto">
                  {techniqueDetails.associated_incidents.map((inc: any) => (
                    <div
                      key={inc.id}
                      onClick={() => navigate(`/incidents/${inc.id}`)}
                      className="p-3 rounded-lg bg-slate-900/80 hover:bg-slate-800 border border-slate-800 cursor-pointer flex items-center justify-between transition-colors"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono font-bold text-cyan-400">{inc.incident_number}</span>
                          <SeverityBadge severity={inc.severity} />
                        </div>
                        <div className="text-xs text-slate-200 font-medium mt-1">{inc.title}</div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-500" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 bg-slate-900/50 rounded-lg text-slate-500 text-xs font-mono text-center">
                  No active incidents currently mapped to this technique.
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-slate-800 flex justify-between items-center">
              <a
                href={`https://attack.mitre.org/techniques/${selectedTechnique.technique_id.replace('.', '/')}`}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1.5 font-mono"
              >
                View on MITRE ATT&CK Official <ExternalLink className="w-3.5 h-3.5" />
              </a>
              <button
                onClick={() => setSelectedTechnique(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-mono transition-colors"
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
