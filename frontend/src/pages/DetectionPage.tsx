import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Cpu, Activity, GitFork, Gauge, Shield, AlertTriangle,
  RefreshCw, CheckCircle2, ChevronRight, Sliders, Info, Zap
} from 'lucide-react';
import { api } from '../services/api';
import { SeverityBadge } from '../components/SeverityBadge';
import { RiskScoreBadge } from '../components/RiskScoreBadge';

export const DetectionPage: React.FC = () => {
  const { tab: paramTab } = useParams<{ tab?: string }>();
  const navigate = useNavigate();

  // Map subroutes like /detection/ml, /detection/anomalies, etc.
  const activeTab = paramTab === 'ml' ? 'rules' : (paramTab || 'rules');

  const [loading, setLoading] = useState<boolean>(true);
  const [rules, setRules] = useState<any[]>([]);
  const [correlations, setCorrelations] = useState<any[]>([]);
  const [anomalies, setAnomalies] = useState<any[]>([]);
  const [riskEngineParams, setRiskEngineParams] = useState<any>(null);

  // Interactive Risk Score Simulator state
  const [simMlScore, setSimMlScore] = useState<number>(85);
  const [simAnomalyScore, setSimAnomalyScore] = useState<number>(75);
  const [simRuleCount, setSimRuleCount] = useState<number>(2);
  const [simCorrelated, setSimCorrelated] = useState<boolean>(true);
  const [simAssetCrit, setSimAssetCrit] = useState<string>('HIGH');
  const [simThreatIntel, setSimThreatIntel] = useState<string>('MALICIOUS');

  const fetchData = async () => {
    setLoading(true);
    try {
      const [r, c, a, p] = await Promise.all([
        api.getDetectionRules().catch(() => []),
        api.getCorrelationPatterns().catch(() => []),
        api.getAnomalies().catch(() => []),
        api.getRiskEngineParameters().catch(() => null),
      ]);
      setRules(r);
      setCorrelations(c);
      setAnomalies(a);
      setRiskEngineParams(p);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const calculateSimulatedRisk = () => {
    // Exact replica of backend deterministic risk formula:
    // ml (30%) + anomaly (20%) + rules (25%) + correlation (15%) + asset (10%)
    let base =
      (simMlScore * 0.3) +
      (simAnomalyScore * 0.2) +
      (Math.min(simRuleCount * 12.5, 25)) +
      (simCorrelated ? 15 : 0);

    const assetWeights: Record<string, number> = {
      CRITICAL: 10,
      HIGH: 8,
      MEDIUM: 5,
      LOW: 2
    };
    base += (assetWeights[simAssetCrit] || 5);

    let multiplier = 1.0;
    if (simThreatIntel === 'MALICIOUS') multiplier = 1.15;
    else if (simThreatIntel === 'SUSPICIOUS') multiplier = 1.05;

    const finalScore = Math.min(Math.round(base * multiplier), 100);
    let severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'LOW';
    if (finalScore >= 80) severity = 'CRITICAL';
    else if (finalScore >= 60) severity = 'HIGH';
    else if (finalScore >= 40) severity = 'MEDIUM';

    return { score: finalScore, severity };
  };

  const simResult = calculateSimulatedRisk();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-100 flex items-center gap-2.5 font-mono">
          <Cpu className="w-6 h-6 text-cyan-400" />
          DETECTION & CORRELATION ENGINE
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Rule-based signatures, sliding-window event correlation, Isolation Forest anomalies, and deterministic risk scoring.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-800 space-x-1">
        {[
          { id: 'rules', label: 'Detection Rules', icon: Shield },
          { id: 'correlation', label: 'Correlation Patterns', icon: GitFork },
          { id: 'anomalies', label: 'Isolation Forest Anomalies', icon: Activity },
          { id: 'risk', label: 'Deterministic Risk Formula', icon: Gauge },
        ].map((t) => {
          const Icon = t.icon;
          const isActive = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => navigate(`/detection/${t.id}`)}
              className={`flex items-center gap-2 px-4 py-3 text-xs font-mono font-medium border-b-2 transition-all ${
                isActive
                  ? 'border-cyan-400 text-cyan-400 bg-cyan-500/5'
                  : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="py-16 text-center text-slate-500 font-mono text-sm">
          <RefreshCw className="w-8 h-8 text-cyan-400 animate-spin mx-auto mb-3" />
          Querying detection engine telemetry...
        </div>
      ) : (
        <>
          {/* TAB 1: RULES */}
          {activeTab === 'rules' && (
            <div className="space-y-4">
              <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-xl flex items-center justify-between">
                <span className="text-xs text-slate-400 font-mono">
                  Active Signature & Heuristic Rules: <strong className="text-cyan-400">{rules.length} deployed</strong>
                </span>
                <span className="text-[11px] font-mono text-emerald-400 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" /> Real-time Ingestion Evaluator Online
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {rules.map((rule) => (
                  <div key={rule.rule_id} className="bg-[#0e1424] border border-slate-800 rounded-xl p-5 shadow space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
                        {rule.rule_id}
                      </span>
                      <SeverityBadge severity={rule.severity} />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-100 font-mono">{rule.name}</h4>
                      <p className="text-xs text-slate-400 mt-1 leading-relaxed">{rule.description}</p>
                    </div>
                    <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] font-mono text-slate-500">
                      <span>MITRE: <strong className="text-slate-300">{rule.mitre_technique || 'T1110'}</strong></span>
                      <span>Category: <strong className="text-slate-300">{rule.category || 'BRUTE_FORCE'}</strong></span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 2: CORRELATION */}
          {activeTab === 'correlation' && (
            <div className="space-y-4">
              <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-xl flex items-center justify-between">
                <span className="text-xs text-slate-400 font-mono">
                  Multi-Stage Attack Correlation Window: <strong className="text-cyan-400">15 Minutes Sliding Window</strong>
                </span>
                <span className="text-[11px] font-mono text-cyan-400">
                  Stateful In-Memory Tracker
                </span>
              </div>

              <div className="space-y-4">
                {correlations.map((c) => (
                  <div key={c.pattern_id} className="bg-[#0e1424] border border-slate-800 rounded-xl p-5 shadow space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <GitFork className="w-4 h-4 text-cyan-400" />
                        <span className="text-xs font-mono font-bold text-cyan-300">{c.pattern_id}</span>
                        <span className="text-xs font-semibold text-slate-200">{c.name}</span>
                      </div>
                      <SeverityBadge severity={c.severity} />
                    </div>
                    <p className="text-xs text-slate-400">{c.description}</p>

                    <div className="p-3 bg-slate-950/60 rounded-lg border border-slate-800/80 font-mono text-xs text-slate-300">
                      <span className="text-slate-500 block mb-1">Correlation Chain Progression:</span>
                      <div className="flex flex-wrap items-center gap-2 text-cyan-400">
                        {c.stages?.map((stage: string, idx: number) => (
                          <React.Fragment key={idx}>
                            <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-[11px]">
                              {stage}
                            </span>
                            {idx < c.stages.length - 1 && <ChevronRight className="w-3.5 h-3.5 text-slate-500" />}
                          </React.Fragment>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: ANOMALIES */}
          {activeTab === 'anomalies' && (
            <div className="space-y-4">
              <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-xs text-slate-400 font-mono">
                    Model: <strong className="text-cyan-400">Isolation Forest (Unsupervised)</strong>
                  </span>
                  <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                    Trained on baseline flow features (duration, packet rates, byte ratios, port entropy).
                  </p>
                </div>
                <span className="text-xs font-mono text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded">
                  Contamination: 0.05
                </span>
              </div>

              <div className="bg-[#0e1424] border border-slate-800 rounded-xl overflow-hidden shadow">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-slate-900/80 text-slate-400 uppercase tracking-wider border-b border-slate-800">
                    <tr>
                      <th className="py-3 px-4">Event ID / Type</th>
                      <th className="py-3 px-4">Source IP</th>
                      <th className="py-3 px-4">Destination</th>
                      <th className="py-3 px-4 text-center">Anomaly Score</th>
                      <th className="py-3 px-4 text-center">Classification</th>
                      <th className="py-3 px-4 text-right">Timestamp</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80 text-slate-300">
                    {anomalies.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-slate-500">
                          No recent anomaly events detected. Run an attack simulation to generate live outliers.
                        </td>
                      </tr>
                    ) : (
                      anomalies.map((anom) => (
                        <tr key={anom.id} className="hover:bg-slate-800/40">
                          <td className="py-3 px-4">
                            <span className="text-cyan-400 font-bold">{anom.event_type}</span>
                            <span className="text-[10px] text-slate-500 block">{anom.id.slice(0, 8)}...</span>
                          </td>
                          <td className="py-3 px-4 text-slate-300">{anom.source_ip}</td>
                          <td className="py-3 px-4 text-slate-400">{anom.destination_ip}:{anom.destination_port}</td>
                          <td className="py-3 px-4 text-center font-bold text-amber-400">
                            {anom.anomaly_score?.toFixed(3)}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30">
                              OUTLIER
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right text-slate-500">
                            {new Date(anom.timestamp).toLocaleTimeString()}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 4: RISK ENGINE */}
          {activeTab === 'risk' && (
            <div className="space-y-6">
              {/* Formula Blueprint Card */}
              <div className="bg-[#0e1424] border border-slate-800 rounded-xl p-6 shadow space-y-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                    <Gauge className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-100 font-mono">
                      DETERMINISTIC MULTI-FACTOR RISK SCORING ALGORITHM
                    </h3>
                    <p className="text-xs text-slate-400">
                      Zero halluncinations: Risk scores are strictly calculated by backend deterministic mathematics (0–100).
                    </p>
                  </div>
                </div>

                <div className="p-4 bg-slate-950/80 rounded-lg border border-slate-800 font-mono text-xs text-slate-300 space-y-2">
                  <span className="text-cyan-400 font-bold block">
                    RiskScore = [ (ML_Conf × 0.30) + (AnomalyScore × 0.20) + (RulesScore × 0.25) + (CorrelationScore × 0.15) + (AssetCritScore × 0.10) ] × ThreatIntelMultiplier
                  </span>
                  <div className="text-[11px] text-slate-400 grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-slate-800/80">
                    <div>• <strong>ML Confidence (30%)</strong>: Random Forest probability of malicious behavior</div>
                    <div>• <strong>Anomaly Outlier (20%)</strong>: Isolation forest deviance score</div>
                    <div>• <strong>Signature Rules (25%)</strong>: Matched heuristic detection signatures</div>
                    <div>• <strong>Correlation (15%)</strong>: Multi-stage kill chain pattern presence</div>
                    <div>• <strong>Asset Criticality (10%)</strong>: Criticality weight of target asset</div>
                    <div>• <strong>Threat Intel Multiplier</strong>: 1.15x for verified malicious external indicators</div>
                  </div>
                </div>
              </div>

              {/* Interactive Risk Simulator */}
              <div className="bg-[#0e1424] border border-slate-800 rounded-xl p-6 shadow space-y-6">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <h4 className="text-sm font-bold text-slate-200 flex items-center gap-2 font-mono">
                    <Sliders className="w-4 h-4 text-cyan-400" />
                    Interactive Risk Engine Simulator
                  </h4>
                  <span className="text-[11px] text-slate-400 font-mono">Test the backend mathematical model</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Left: Input Controls */}
                  <div className="space-y-4 text-xs font-mono">
                    <div>
                      <div className="flex justify-between text-slate-300 mb-1">
                        <span>ML Supervised Confidence</span>
                        <span className="text-cyan-400 font-bold">{simMlScore}%</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={simMlScore}
                        onChange={(e) => setSimMlScore(Number(e.target.value))}
                        className="w-full accent-cyan-400"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between text-slate-300 mb-1">
                        <span>Isolation Forest Anomaly Score</span>
                        <span className="text-amber-400 font-bold">{simAnomalyScore}%</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={simAnomalyScore}
                        onChange={(e) => setSimAnomalyScore(Number(e.target.value))}
                        className="w-full accent-amber-400"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between text-slate-300 mb-1">
                        <span>Matched Detection Rules</span>
                        <span className="text-slate-200 font-bold">{simRuleCount} rules</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="4"
                        value={simRuleCount}
                        onChange={(e) => setSimRuleCount(Number(e.target.value))}
                        className="w-full accent-slate-300"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-2">
                      <div>
                        <label className="text-slate-400 block mb-1">Asset Criticality</label>
                        <select
                          value={simAssetCrit}
                          onChange={(e) => setSimAssetCrit(e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded text-slate-200 text-xs"
                        >
                          <option value="CRITICAL">Critical (10 pts)</option>
                          <option value="HIGH">High (8 pts)</option>
                          <option value="MEDIUM">Medium (5 pts)</option>
                          <option value="LOW">Low (2 pts)</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-slate-400 block mb-1">Threat Intel</label>
                        <select
                          value={simThreatIntel}
                          onChange={(e) => setSimThreatIntel(e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded text-slate-200 text-xs"
                        >
                          <option value="MALICIOUS">Malicious (1.15x)</option>
                          <option value="SUSPICIOUS">Suspicious (1.05x)</option>
                          <option value="CLEAN">Clean (1.00x)</option>
                        </select>
                      </div>
                    </div>

                    <div className="pt-2 flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="simCorr"
                        checked={simCorrelated}
                        onChange={(e) => setSimCorrelated(e.target.checked)}
                        className="accent-cyan-400 rounded"
                      />
                      <label htmlFor="simCorr" className="text-slate-300 cursor-pointer">
                        Multi-Stage Correlation Pattern Triggered (+15 pts)
                      </label>
                    </div>
                  </div>

                  {/* Right: Output Score Card */}
                  <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-6 flex flex-col items-center justify-center text-center">
                    <span className="text-xs font-mono uppercase text-slate-400 mb-2">Simulated Outcome</span>
                    <div className="text-5xl font-extrabold font-mono text-cyan-400 my-2">
                      {simResult.score} <span className="text-lg text-slate-500">/ 100</span>
                    </div>
                    <div className="mt-2">
                      <SeverityBadge severity={simResult.severity} />
                    </div>
                    <p className="text-xs text-slate-400 mt-4 max-w-xs leading-relaxed">
                      {simResult.score >= 80
                        ? 'Requires immediate automated containment recommendation and P1 Incident ticket.'
                        : simResult.score >= 60
                        ? 'High-priority alert requiring immediate analyst triage and investigation.'
                        : 'Routine security telemetry tracked under normal monitoring thresholds.'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
