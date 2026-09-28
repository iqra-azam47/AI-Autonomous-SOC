import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Flame, Play, History, CheckCircle2, AlertTriangle, ShieldAlert,
  Terminal, ArrowRight, RefreshCw, Zap, Clock, Shield
} from 'lucide-react';
import { api } from '../services/api';
import { SimulationRun } from '../types';
import { useAuth } from '../context/AuthContext';

export const SimulationsPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { hasRole } = useAuth();
  const canSimulate = hasRole(['ADMIN', 'ANALYST']);

  const isHistoryView = location.pathname.includes('/history');
  const [activeTab, setActiveTab] = useState<'scenarios' | 'history'>(isHistoryView ? 'history' : 'scenarios');

  const [simulatingScenario, setSimulatingScenario] = useState<string | null>(null);
  const [lastRun, setLastRun] = useState<SimulationRun | null>(null);
  const [history, setHistory] = useState<SimulationRun[]>([]);
  const [loadingHistory, setLoadingHistory] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const scenarios = [
    {
      id: 'BRUTE_FORCE',
      title: 'SSH & RDP Password Spray Attack',
      description: 'Simulates a distributed adversary conducting brute-force authentication attempts against DC-PRIMARY-01 (10.0.0.10) followed by unauthorized credential access.',
      tactic: 'Credential Access',
      mitre: 'T1110 (Brute Force)',
      target: '10.0.0.10 (Domain Controller)',
      attackerIp: '198.51.100.45',
      eventCount: 8,
      severity: 'HIGH',
    },
    {
      id: 'PORT_SCAN',
      title: 'Subnet Reconnaissance & Port Sweep',
      description: 'Simulates horizontal port scanning across corporate subnet (10.0.0.0/24) targeting ports 22, 80, 443, 445, and 3389 to map exposed listening services.',
      tactic: 'Discovery',
      mitre: 'T1046 (Network Service Discovery)',
      target: '10.0.0.0/24 (Subnet Wide)',
      attackerIp: '185.220.101.5',
      eventCount: 15,
      severity: 'MEDIUM',
    },
    {
      id: 'WEB_ATTACK',
      title: 'SQL Injection & Path Traversal Probe',
      description: 'Simulates malicious HTTP payloads containing SQL injection patterns (\' OR 1=1--) and path traversal strings (/etc/passwd) against the web application tier.',
      tactic: 'Initial Access',
      mitre: 'T1190 (Exploit Public-Facing Application)',
      target: '10.0.0.20 (Web Application)',
      attackerIp: '203.0.113.19',
      eventCount: 6,
      severity: 'HIGH',
    },
    {
      id: 'SUSPICIOUS_LOGIN',
      title: 'Anomalous After-Hours Operator Login',
      description: 'Simulates an employee credential being authenticated at 03:15 AM from an anomalous external Tor exit node with immediate sensitive file access.',
      tactic: 'Initial Access',
      mitre: 'T1078 (Valid Accounts)',
      target: '10.0.0.30 (Workstation-Finance)',
      attackerIp: '185.220.101.5',
      eventCount: 4,
      severity: 'HIGH',
    },
    {
      id: 'PRIVILEGE_ESCALATION',
      title: 'Local Sudo & Token Impersonation',
      description: 'Simulates an unauthorized local escalation attempt abusing sudo permissions and Windows access tokens to gain root/SYSTEM privilege.',
      tactic: 'Privilege Escalation',
      mitre: 'T1068 (Exploitation for Privilege Escalation)',
      target: '10.0.0.15 (Database Server)',
      attackerIp: '10.0.0.15 (Internal Host)',
      eventCount: 5,
      severity: 'CRITICAL',
    },
    {
      id: 'DATA_EXFILTRATION',
      title: 'High-Volume Outbound Data Exfiltration',
      description: 'Simulates an adversary packaging internal records and transmitting high-volume byte streams over DNS tunneling and encrypted outbound HTTPS.',
      tactic: 'Exfiltration',
      mitre: 'T1048 (Exfiltration Over Alternative Protocol)',
      target: '10.0.0.15 (Database Server)',
      attackerIp: '198.51.100.45',
      eventCount: 7,
      severity: 'CRITICAL',
    },
  ];

  const fetchHistory = async () => {
    setLoadingHistory(true);
    try {
      const data = await api.getSimulationHistory();
      setHistory(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'history') {
      fetchHistory();
    }
  }, [activeTab]);

  const handleRunSimulation = async (scenarioId: string) => {
    if (!canSimulate) return;
    setSimulatingScenario(scenarioId);
    setError(null);
    setLastRun(null);
    try {
      const res = await api.runSimulation(scenarioId);
      setLastRun(res);
      fetchHistory();
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Simulation execution failed');
    } finally {
      setSimulatingScenario(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-100 flex items-center gap-2.5 font-mono">
          <Flame className="w-6 h-6 text-red-400" />
          ATTACK SIMULATION LAB
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Execute multi-stage attack scenarios to validate real-time ingestion, ML inference, heuristic rules, correlation chains, and alert creation.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-800 space-x-1">
        <button
          onClick={() => { setActiveTab('scenarios'); navigate('/simulations'); }}
          className={`flex items-center gap-2 px-4 py-3 text-xs font-mono font-medium border-b-2 transition-all ${
            activeTab === 'scenarios'
              ? 'border-red-500 text-red-400 bg-red-500/5'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Play className="w-4 h-4" />
          <span>Attack Scenarios</span>
        </button>
        <button
          onClick={() => { setActiveTab('history'); navigate('/simulations/history'); }}
          className={`flex items-center gap-2 px-4 py-3 text-xs font-mono font-medium border-b-2 transition-all ${
            activeTab === 'history'
              ? 'border-red-500 text-red-400 bg-red-500/5'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <History className="w-4 h-4" />
          <span>Simulation History</span>
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-950/40 border border-red-800/60 text-red-300 text-sm flex items-center gap-3 font-mono">
          <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Last Run Success Card */}
      {lastRun && (
        <div className="bg-emerald-950/20 border border-emerald-500/30 rounded-xl p-5 shadow-lg space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              <h3 className="text-sm font-bold text-emerald-200 font-mono">
                SIMULATION COMPLETED SUCCESSFULLY: {lastRun.scenario}
              </h3>
            </div>
            <span className="text-xs font-mono text-emerald-400/80">
              Execution Finished
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
            <div className="p-2.5 bg-slate-900/60 rounded border border-slate-800">
              <span className="text-slate-400 block">Events Ingested</span>
              <span className="text-lg font-bold text-slate-100">{lastRun.events_generated}</span>
            </div>
            <div className="p-2.5 bg-slate-900/60 rounded border border-slate-800">
              <span className="text-slate-400 block">Alerts Generated</span>
              <span className="text-lg font-bold text-amber-400">{lastRun.alerts_generated}</span>
            </div>
            <div className="p-2.5 bg-slate-900/60 rounded border border-slate-800">
              <span className="text-slate-400 block">Incidents Escalated</span>
              <span className="text-lg font-bold text-red-400">{lastRun.incidents_generated}</span>
            </div>
            <div className="p-2.5 bg-slate-900/60 rounded border border-slate-800 flex items-center justify-center">
              <button
                onClick={() => navigate('/incidents')}
                className="w-full h-full py-1 bg-red-600 hover:bg-red-500 text-white rounded text-xs font-bold font-mono flex items-center justify-center gap-1 transition-colors"
              >
                <span>View Incident</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 1: SCENARIOS */}
      {activeTab === 'scenarios' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {scenarios.map((sc) => {
            const isRunning = simulatingScenario === sc.id;
            return (
              <div
                key={sc.id}
                className="bg-[#0e1424] border border-slate-800 rounded-xl p-5 shadow flex flex-col justify-between space-y-4 hover:border-slate-700 transition-colors"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-red-500/10 text-red-400 border border-red-500/30">
                      {sc.tactic}
                    </span>
                    <span className="text-xs font-mono text-cyan-400 font-semibold">{sc.mitre}</span>
                  </div>

                  <div>
                    <h3 className="text-sm font-bold text-slate-100 font-mono">{sc.title}</h3>
                    <p className="text-xs text-slate-400 mt-1 leading-relaxed">{sc.description}</p>
                  </div>

                  <div className="p-2.5 bg-slate-900/80 rounded border border-slate-800 text-[11px] font-mono space-y-1 text-slate-400">
                    <div>Target: <strong className="text-slate-200">{sc.target}</strong></div>
                    <div>Source: <strong className="text-cyan-400">{sc.attackerIp}</strong></div>
                    <div>Payload: <strong className="text-slate-200">{sc.eventCount} sequential flow events</strong></div>
                  </div>
                </div>

                <button
                  onClick={() => handleRunSimulation(sc.id)}
                  disabled={isRunning || !canSimulate}
                  className="w-full py-2.5 bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 text-white rounded-lg text-xs font-mono font-bold flex items-center justify-center gap-2 shadow-md transition-all disabled:opacity-50"
                >
                  {isRunning ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Ingesting & Detecting...</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5" />
                      <span>Launch Attack Simulation</span>
                    </>
                  )}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* TAB 2: HISTORY */}
      {activeTab === 'history' && (
        <div className="bg-[#0e1424] border border-slate-800 rounded-xl overflow-hidden shadow">
          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            <span className="text-xs font-mono uppercase tracking-wider text-slate-400">
              Audit Trail of Executed Simulations
            </span>
            <button
              onClick={fetchHistory}
              className="text-xs font-mono text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingHistory ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>

          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-slate-900/80 text-slate-400 uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Scenario</th>
                <th className="py-3 px-4">Triggered By</th>
                <th className="py-3 px-4 text-center">Events</th>
                <th className="py-3 px-4 text-center">Alerts</th>
                <th className="py-3 px-4 text-center">Incidents</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 text-slate-300">
              {loadingHistory ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-cyan-400" />
                    Loading simulation history...
                  </td>
                </tr>
              ) : history.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500">
                    No simulation runs logged yet. Launch an attack above to verify the pipeline.
                  </td>
                </tr>
              ) : (
                history.map((run) => (
                  <tr key={run.id} className="hover:bg-slate-800/40">
                    <td className="py-3 px-4 font-bold text-slate-100">{run.scenario}</td>
                    <td className="py-3 px-4 text-slate-400">{run.started_by_name || 'System Operator'}</td>
                    <td className="py-3 px-4 text-center text-cyan-400">{run.events_generated}</td>
                    <td className="py-3 px-4 text-center text-amber-400">{run.alerts_generated}</td>
                    <td className="py-3 px-4 text-center text-red-400 font-bold">{run.incidents_generated}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        {run.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right text-slate-500">
                      {new Date(run.started_at).toLocaleString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
