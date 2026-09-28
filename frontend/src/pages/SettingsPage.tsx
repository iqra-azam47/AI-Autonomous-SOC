import React, { useState, useEffect } from 'react';
import {
  Settings, Shield, Cpu, Key, Database, RefreshCw, CheckCircle2,
  XCircle, AlertTriangle, Radio, Server, Sliders
} from 'lucide-react';
import { api } from '../services/api';
import { SystemSettings } from '../types';

export const SettingsPage: React.FC = () => {
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSettings = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getSettings();
      setSettings(data);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to load system settings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-100 flex items-center gap-2.5 font-mono">
          <Settings className="w-6 h-6 text-cyan-400" />
          SYSTEM CONFIGURATION & INTEGRATIONS
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Inspect SOC engine parameters, operational risk thresholds, external threat intelligence APIs, and ML runtime environment.
        </p>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-950/40 border border-red-800/60 text-red-300 text-sm font-mono flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="py-20 text-center text-slate-500 font-mono text-sm">
          <RefreshCw className="w-8 h-8 text-cyan-400 animate-spin mx-auto mb-3" />
          Loading platform configuration...
        </div>
      ) : settings ? (
        <div className="space-y-6">
          {/* External Integrations Status */}
          <div className="bg-[#0e1424] border border-slate-800 rounded-xl p-6 shadow space-y-4">
            <h3 className="text-sm font-bold text-slate-200 font-mono flex items-center gap-2">
              <Key className="w-4 h-4 text-cyan-400" />
              Intelligence & AI API Integrations
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-mono text-xs">
              {/* Google Gemini */}
              <div className="p-4 bg-slate-900/60 rounded-xl border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-200">Google Gemini API</span>
                  {settings.gemini_configured ? (
                    <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-400">
                      <CheckCircle2 className="w-3.5 h-3.5" /> ACTIVE
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-[11px] font-bold text-slate-500">
                      <XCircle className="w-3.5 h-3.5" /> UNCONFIGURED
                    </span>
                  )}
                </div>
                <p className="text-slate-400 text-[11px]">
                  Autonomous incident investigation dossier generation and natural language SOC telemetry chat.
                </p>
                <div className="text-[10px] text-slate-500 pt-1">Model: gemini-2.5-flash</div>
              </div>

              {/* AbuseIPDB */}
              <div className="p-4 bg-slate-900/60 rounded-xl border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-200">AbuseIPDB</span>
                  {settings.abuseipdb_configured ? (
                    <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-400">
                      <CheckCircle2 className="w-3.5 h-3.5" /> ONLINE
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-[11px] font-bold text-slate-500">
                      <XCircle className="w-3.5 h-3.5" /> MOCK FALLBACK
                    </span>
                  )}
                </div>
                <p className="text-slate-400 text-[11px]">
                  IP reputation confidence scoring, abuse confidence percentages, and reported attack categories.
                </p>
                <div className="text-[10px] text-slate-500 pt-1">Cache: 24h Local TTL</div>
              </div>

              {/* VirusTotal */}
              <div className="p-4 bg-slate-900/60 rounded-xl border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-200">VirusTotal v3</span>
                  {settings.virustotal_configured ? (
                    <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-400">
                      <CheckCircle2 className="w-3.5 h-3.5" /> ONLINE
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-[11px] font-bold text-slate-500">
                      <XCircle className="w-3.5 h-3.5" /> MOCK FALLBACK
                    </span>
                  )}
                </div>
                <p className="text-slate-400 text-[11px]">
                  Multi-engine antivirus telemetry, domain analysis, file hash hashes, and community flags.
                </p>
                <div className="text-[10px] text-slate-500 pt-1">Cache: 24h Local TTL</div>
              </div>
            </div>
          </div>

          {/* Risk Engine Thresholds */}
          <div className="bg-[#0e1424] border border-slate-800 rounded-xl p-6 shadow space-y-4">
            <h3 className="text-sm font-bold text-slate-200 font-mono flex items-center gap-2">
              <Sliders className="w-4 h-4 text-cyan-400" />
              Deterministic Risk Threshold Cutoffs
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 font-mono text-xs">
              <div className="p-4 bg-slate-900/60 rounded-xl border border-slate-800">
                <span className="text-slate-500 block uppercase">Low Severity Cutoff</span>
                <span className="text-2xl font-bold text-cyan-400 mt-1 block">
                  &lt; {settings.risk_threshold_low || 40} pts
                </span>
                <span className="text-[11px] text-slate-400 mt-1 block">Standard audit log retention</span>
              </div>

              <div className="p-4 bg-slate-900/60 rounded-xl border border-slate-800">
                <span className="text-slate-500 block uppercase">Medium Severity Cutoff</span>
                <span className="text-2xl font-bold text-amber-400 mt-1 block">
                  {settings.risk_threshold_low || 40} - {settings.risk_threshold_medium || 60} pts
                </span>
                <span className="text-[11px] text-slate-400 mt-1 block">Standard alert triage required</span>
              </div>

              <div className="p-4 bg-slate-900/60 rounded-xl border border-slate-800">
                <span className="text-slate-500 block uppercase">High / Critical Threshold</span>
                <span className="text-2xl font-bold text-red-400 mt-1 block">
                  &ge; {settings.risk_threshold_high || 80} pts
                </span>
                <span className="text-[11px] text-slate-400 mt-1 block">Immediate incident escalation</span>
              </div>
            </div>
          </div>

          {/* System Runtime & Storage */}
          <div className="bg-[#0e1424] border border-slate-800 rounded-xl p-6 shadow space-y-4">
            <h3 className="text-sm font-bold text-slate-200 font-mono flex items-center gap-2">
              <Server className="w-4 h-4 text-cyan-400" />
              Runtime Architecture & Storage Policy
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 font-mono text-xs">
              <div className="p-4 bg-slate-900/60 rounded-xl border border-slate-800 space-y-2">
                <span className="text-slate-500 block uppercase">Database Backend</span>
                <div className="text-sm font-bold text-slate-100">
                  SQLAlchemy 2.0 (PostgreSQL / SQLite)
                </div>
                <div className="text-slate-400 text-[11px]">
                  Connection pool with thread-safe session scoping and automatic Alembic schema migrations.
                </div>
              </div>

              <div className="p-4 bg-slate-900/60 rounded-xl border border-slate-800 space-y-2">
                <span className="text-slate-500 block uppercase">Telemetry Retention Policy</span>
                <div className="text-sm font-bold text-slate-100">
                  {settings.data_retention_days || 90} Days Rolling Retention
                </div>
                <div className="text-slate-400 text-[11px]">
                  Automated background pruning for raw flows older than the configured compliance window.
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};
