import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Search, Globe, Shield, ShieldAlert, ShieldCheck, MapPin, Network,
  Building, AlertTriangle, ExternalLink, RefreshCw, Lock, Radio
} from 'lucide-react';
import { api } from '../services/api';
import { ThreatIntelligence } from '../types';
import { RiskScoreBadge } from '../components/RiskScoreBadge';

export const IntelligencePage: React.FC = () => {
  const { ip: paramIp } = useParams<{ ip?: string }>();
  const navigate = useNavigate();

  const [searchIp, setSearchIp] = useState<string>(paramIp || '198.51.100.45');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [intel, setIntel] = useState<ThreatIntelligence | null>(null);

  const sampleIps = [
    { label: 'Simulated Attacker (Malicious)', ip: '198.51.100.45' },
    { label: 'Tor Exit Node (Suspicious)', ip: '185.220.101.5' },
    { label: 'Corporate Gateway (Private RFC 1918)', ip: '10.0.0.10' },
    { label: 'Public DNS (Clean)', ip: '8.8.8.8' },
  ];

  const fetchIntel = async (ipToLookup: string) => {
    if (!ipToLookup.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const data = await api.getIpIntelligence(ipToLookup.trim());
      setIntel(data);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to retrieve threat intelligence for this indicator.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (paramIp) {
      setSearchIp(paramIp);
      fetchIntel(paramIp);
    } else {
      fetchIntel('198.51.100.45');
    }
  }, [paramIp]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchIp) {
      navigate(`/intelligence/ip/${encodeURIComponent(searchIp.trim())}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-100 flex items-center gap-2.5 font-mono">
          <Globe className="w-6 h-6 text-cyan-400" />
          THREAT INTELLIGENCE
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Indicator reputation lookup, ASN attribution, geolocation, and local SOC event correlation.
        </p>
      </div>

      {/* Search Bar & Sample IP Buttons */}
      <div className="bg-[#0e1424] border border-slate-800 rounded-xl p-5 shadow-lg space-y-4">
        <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-5 h-5 text-slate-500 absolute left-3.5 top-3" />
            <input
              type="text"
              value={searchIp}
              onChange={(e) => setSearchIp(e.target.value)}
              placeholder="Enter IP address (e.g. 198.51.100.45, 10.0.0.10)..."
              className="w-full pl-11 pr-4 py-2.5 bg-slate-900/90 border border-slate-700/80 rounded-lg text-slate-200 placeholder-slate-500 font-mono text-sm focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="px-5 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-colors disabled:opacity-50 font-mono"
          >
            {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            Lookup Indicator
          </button>
        </form>

        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-800/80">
          <span className="text-xs text-slate-400 font-mono">Quick Samples:</span>
          {sampleIps.map((s) => (
            <button
              key={s.ip}
              onClick={() => {
                setSearchIp(s.ip);
                navigate(`/intelligence/ip/${encodeURIComponent(s.ip)}`);
              }}
              className="px-2.5 py-1 rounded bg-slate-800/70 hover:bg-slate-700/80 border border-slate-700/60 text-xs font-mono text-slate-300 hover:text-cyan-300 transition-colors"
            >
              {s.label} ({s.ip})
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-950/40 border border-red-800/60 text-red-300 text-sm flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading && (
        <div className="p-12 text-center bg-[#0e1424] border border-slate-800 rounded-xl">
          <RefreshCw className="w-8 h-8 text-cyan-400 animate-spin mx-auto mb-3" />
          <p className="text-slate-300 font-mono text-sm">Querying threat intelligence providers & local cache...</p>
        </div>
      )}

      {!loading && intel && (
        <div className="space-y-6">
          {/* Private IP Protection Banner if applicable */}
          {intel.is_private_ip && (
            <div className="p-4 rounded-xl bg-blue-950/40 border border-blue-800/60 flex items-start gap-3">
              <Lock className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-semibold text-blue-200">RFC 1918 Private IP Address Detected</h4>
                <p className="text-xs text-blue-300/80 mt-0.5">
                  This IP address ({intel.indicator_value}) belongs to an internal private network range. To protect internal infrastructure confidentiality, external threat intelligence providers (AbuseIPDB, VirusTotal) were bypassed. Reputation is analyzed strictly from internal SOC telemetry.
                </p>
              </div>
            </div>
          )}

          {/* Top Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Reputation Card */}
            <div className="bg-[#0e1424] border border-slate-800 rounded-xl p-5 shadow">
              <span className="text-xs font-mono uppercase text-slate-400">Reputation Assessment</span>
              <div className="flex items-center gap-3 mt-3">
                {intel.reputation === 'MALICIOUS' ? (
                  <ShieldAlert className="w-8 h-8 text-red-400" />
                ) : intel.reputation === 'SUSPICIOUS' ? (
                  <AlertTriangle className="w-8 h-8 text-amber-400" />
                ) : (
                  <ShieldCheck className="w-8 h-8 text-emerald-400" />
                )}
                <div>
                  <span
                    className={`inline-block px-2.5 py-1 rounded text-xs font-bold font-mono ${
                      intel.reputation === 'MALICIOUS'
                        ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                        : intel.reputation === 'SUSPICIOUS'
                        ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                        : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    }`}
                  >
                    {intel.reputation}
                  </span>
                  <div className="text-[11px] text-slate-400 font-mono mt-1">
                    Confidence: {(intel.confidence * 100).toFixed(0)}%
                  </div>
                </div>
              </div>
            </div>

            {/* Geolocation */}
            <div className="bg-[#0e1424] border border-slate-800 rounded-xl p-5 shadow">
              <span className="text-xs font-mono uppercase text-slate-400">Country & Geolocation</span>
              <div className="flex items-center gap-3 mt-3">
                <MapPin className="w-6 h-6 text-cyan-400" />
                <div>
                  <div className="text-base font-semibold text-slate-200">
                    {intel.country || (intel.is_private_ip ? 'Local Subnet' : 'Unknown')}
                  </div>
                  <div className="text-xs text-slate-400 font-mono">
                    {intel.is_private_ip ? 'Private Enterprise LAN' : 'Public Internet'}
                  </div>
                </div>
              </div>
            </div>

            {/* ISP & ASN */}
            <div className="bg-[#0e1424] border border-slate-800 rounded-xl p-5 shadow">
              <span className="text-xs font-mono uppercase text-slate-400">Autonomous System (ASN)</span>
              <div className="flex items-center gap-3 mt-3">
                <Network className="w-6 h-6 text-cyan-400" />
                <div className="overflow-hidden">
                  <div className="text-base font-semibold text-slate-200 truncate font-mono">
                    {intel.asn || 'N/A'}
                  </div>
                  <div className="text-xs text-slate-400 truncate">
                    {intel.isp || 'Enterprise Gateway'}
                  </div>
                </div>
              </div>
            </div>

            {/* Intel Source */}
            <div className="bg-[#0e1424] border border-slate-800 rounded-xl p-5 shadow">
              <span className="text-xs font-mono uppercase text-slate-400">Data Source & Provider</span>
              <div className="flex items-center gap-3 mt-3">
                <Radio className="w-6 h-6 text-cyan-400" />
                <div>
                  <div className="text-sm font-semibold text-slate-200 font-mono">
                    {intel.source}
                  </div>
                  <div className="text-xs text-slate-400">
                    {intel.checked_at ? `Cached ${new Date(intel.checked_at).toLocaleTimeString()}` : 'Real-time query'}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Local SOC Correlation Matrix */}
          <div className="bg-[#0e1424] border border-slate-800 rounded-xl p-6 shadow">
            <h3 className="text-base font-bold text-slate-200 flex items-center gap-2 mb-4 font-mono">
              <Building className="w-5 h-5 text-cyan-400" />
              LOCAL SOC CORRELATION FOOTPRINT
            </h3>
            <p className="text-xs text-slate-400 mb-6">
              Telemetry matches for IP <code className="text-cyan-300 font-mono">{intel.indicator_value}</code> across our internal security logs and incident records:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-lg bg-slate-900/80 border border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-xs text-slate-400 font-mono">Events Recorded</span>
                  <div className="text-2xl font-bold font-mono text-slate-100 mt-1">{intel.total_events}</div>
                </div>
                <div className="p-2.5 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 font-mono text-xs">
                  LOGS
                </div>
              </div>

              <div className="p-4 rounded-lg bg-slate-900/80 border border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-xs text-slate-400 font-mono">Alerts Triggered</span>
                  <div className="text-2xl font-bold font-mono text-amber-400 mt-1">{intel.total_alerts}</div>
                </div>
                <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 font-mono text-xs">
                  ALERTS
                </div>
              </div>

              <div className="p-4 rounded-lg bg-slate-900/80 border border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-xs text-slate-400 font-mono">Incidents Linked</span>
                  <div className="text-2xl font-bold font-mono text-red-400 mt-1">{intel.total_incidents}</div>
                </div>
                <div className="p-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 font-mono text-xs">
                  INCIDENTS
                </div>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-between pt-4 border-t border-slate-800">
              <span className="text-xs text-slate-400 font-mono">
                API Integration Status: {intel.integration_configured ? 'Online (Real API Key active)' : 'Mock Fallback / Local DB Cache'}
              </span>
              <button
                onClick={() => navigate('/events')}
                className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-mono transition-colors"
              >
                Inspect in Event Explorer <ExternalLink className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
