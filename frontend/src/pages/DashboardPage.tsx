import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShieldAlert, AlertTriangle, Activity, Calendar,
  Layers, Server, Globe, Play, UploadCloud, RefreshCw
} from 'lucide-react';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip,
  BarChart, Bar, Cell, PieChart, Pie
} from 'recharts';
import { api } from '../services/api';
import { DashboardMetrics, DashboardCharts, ActivityFeedItem } from '../types';
import { StatCard } from '../components/StatCard';
import { SeverityBadge } from '../components/SeverityBadge';
import { EmptyState, LoadingSkeleton } from '../components/EmptyState';
import { useAuth } from '../context/AuthContext';

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { hasRole } = useAuth();
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [charts, setCharts] = useState<DashboardCharts | null>(null);
  const [activity, setActivity] = useState<ActivityFeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    try {
      const [m, c, a] = await Promise.all([
        api.getDashboardMetrics(),
        api.getDashboardCharts(),
        api.getLiveActivity()
      ]);
      setMetrics(m);
      setCharts(c);
      setActivity(a);
    } catch (err) {
      console.error('Failed to load dashboard telemetry', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000); // 10s auto-refresh for live telemetry
    return () => clearInterval(interval);
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-slate-800/60 rounded-md w-64 animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-28 bg-slate-800/40 rounded-xl animate-pulse" />
          ))}
        </div>
        <LoadingSkeleton rows={6} />
      </div>
    );
  }

  const isDataEmpty = (metrics?.total_events || 0) === 0;

  const SEVERITY_COLORS: Record<string, string> = {
    CRITICAL: '#ef4444',
    HIGH: '#f97316',
    MEDIUM: '#f59e0b',
    LOW: '#3b82f6',
  };

  const PREDICTION_COLORS: Record<string, string> = {
    MALICIOUS: '#ef4444',
    SUSPICIOUS: '#f59e0b',
    NORMAL: '#10b981',
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-800/80">
        <div>
          <h2 className="text-xl font-bold font-mono text-slate-100 flex items-center gap-2">
            SOC COMMAND CENTER
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">Real-time threat detection, ML inference, and correlation stream</p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleRefresh}
            className={`p-2 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700/80 text-xs flex items-center gap-1.5 transition ${refreshing ? 'animate-spin' : ''}`}
            title="Refresh Live Telemetry"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>

          {hasRole(['ADMIN', 'ANALYST']) && (
            <>
              <button
                onClick={() => navigate('/ingestion')}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium flex items-center gap-1.5 transition"
              >
                <UploadCloud className="w-3.5 h-3.5 text-cyan-400" />
                <span>Upload Logs</span>
              </button>

              <button
                onClick={() => navigate('/simulations')}
                className="px-3.5 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold shadow-md shadow-cyan-950/40 flex items-center gap-1.5 transition"
              >
                <Play className="w-3.5 h-3.5" />
                <span>Simulate Attack</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Zero State if no logs or events have been ingested */}
      {isDataEmpty ? (
        <EmptyState
          title="No Security Telemetry Recorded"
          description="The detection engine is active and waiting for log streams. Upload log files (CSV, JSON, syslog) or run an attack scenario to observe real ML inference, anomaly detection, correlation, and risk scoring in action."
          actionLabel="Run Attack Simulation"
          onAction={() => navigate('/simulations')}
          secondaryActionLabel="Upload Security Logs"
          onSecondaryAction={() => navigate('/ingestion')}
        />
      ) : (
        <>
          {/* Top 7 Metric Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
            <StatCard
              title="Critical"
              value={metrics?.critical_incidents || 0}
              icon={ShieldAlert}
              variant="danger"
            />
            <StatCard
              title="Active Incidents"
              value={metrics?.active_incidents || 0}
              icon={Layers}
              variant="warning"
            />
            <StatCard
              title="High Risk Alerts"
              value={metrics?.high_risk_alerts || 0}
              icon={AlertTriangle}
              variant="warning"
            />
            <StatCard
              title="Suspicious Events"
              value={metrics?.suspicious_events || 0}
              icon={Activity}
              variant="info"
            />
            <StatCard
              title="Events Today"
              value={metrics?.events_today || 0}
              icon={Calendar}
            />
            <StatCard
              title="Affected Assets"
              value={metrics?.affected_assets || 0}
              icon={Server}
            />
            <StatCard
              title="Suspicious IPs"
              value={metrics?.suspicious_ips || 0}
              icon={Globe}
              variant="danger"
            />
          </div>

          {/* Charts Row 1: Events Timeline + Severity Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Events Over Time */}
            <div className="lg:col-span-2 bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider font-mono">
                  Security Events Ingestion Stream
                </h3>
                <span className="text-[10px] text-cyan-400 font-mono">Active Influx</span>
              </div>
              <div className="h-64">
                {charts?.events_over_time && charts.events_over_time.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={charts.events_over_time}>
                      <defs>
                        <linearGradient id="eventGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="time" stroke="#475569" fontSize={11} tickLine={false} />
                      <YAxis stroke="#475569" fontSize={11} tickLine={false} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '12px' }}
                      />
                      <Area type="monotone" dataKey="events" stroke="#06b6d4" strokeWidth={2} fillOpacity={1} fill="url(#eventGradient)" />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-xs text-slate-500 font-mono">
                    Awaiting additional event samples
                  </div>
                )}
              </div>
            </div>

            {/* Alerts by Severity */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow-xl">
              <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-4 font-mono">
                Alerts by Severity
              </h3>
              <div className="h-64">
                {charts?.alerts_by_severity && charts.alerts_by_severity.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={charts.alerts_by_severity} layout="vertical">
                      <XAxis type="number" stroke="#475569" fontSize={11} tickLine={false} />
                      <YAxis dataKey="severity" type="category" stroke="#94a3b8" fontSize={11} tickLine={false} width={75} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '12px' }}
                      />
                      <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                        {charts.alerts_by_severity.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={SEVERITY_COLORS[entry.severity] || '#3b82f6'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-xs text-slate-500 font-mono">
                    No active alerts
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Charts Row 2: Attack Categories & ML Distribution */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {/* Attack Categories */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow-xl">
              <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-4 font-mono">
                Identified Attack Categories
              </h3>
              <div className="h-56">
                {charts?.attack_categories && charts.attack_categories.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={charts.attack_categories}>
                      <XAxis dataKey="category" stroke="#475569" fontSize={10} tickLine={false} interval={0} angle={-15} textAnchor="end" height={40} />
                      <YAxis stroke="#475569" fontSize={11} tickLine={false} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '12px' }}
                      />
                      <Bar dataKey="count" fill="#38bdf8" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-xs text-slate-500 font-mono">
                    No malicious categories identified
                  </div>
                )}
              </div>
            </div>

            {/* Normal vs Suspicious vs Malicious */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow-xl">
              <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-4 font-mono">
                ML Classification Breakdown
              </h3>
              <div className="h-56 flex items-center justify-center">
                {charts?.prediction_breakdown && charts.prediction_breakdown.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={charts.prediction_breakdown}
                        dataKey="count"
                        nameKey="label"
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={75}
                        paddingAngle={4}
                      >
                        {charts.prediction_breakdown.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={PREDICTION_COLORS[entry.label] || '#94a3b8'} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '12px' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="text-xs text-slate-500 font-mono">No predictions logged</div>
                )}
              </div>
            </div>

            {/* Top Threat Actors Table */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow-xl">
              <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-3 font-mono">
                Top Attacker Source IPs
              </h3>
              <div className="divide-y divide-slate-800/80">
                {charts?.top_suspicious_ips && charts.top_suspicious_ips.length > 0 ? (
                  charts.top_suspicious_ips.map((item, idx) => (
                    <div key={idx} className="py-2.5 flex items-center justify-between text-xs">
                      <button
                        onClick={() => navigate(`/intelligence/ip/${item.ip}`)}
                        className="font-mono text-cyan-400 hover:underline flex items-center gap-1.5"
                      >
                        <Globe className="w-3.5 h-3.5 text-slate-400" />
                        <span>{item.ip}</span>
                      </button>
                      <span className="font-mono px-2 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/20 font-semibold">
                        {item.count} alerts
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="py-6 text-center text-xs text-slate-500 font-mono">No suspicious IPs recorded</div>
                )}
              </div>
            </div>
          </div>

          {/* Live Activity Stream Console */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider font-mono flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                Live Security Activity Stream
              </h3>
              <button
                onClick={() => navigate('/events')}
                className="text-xs font-mono text-cyan-400 hover:underline"
              >
                View all security events &rarr;
              </button>
            </div>

            <div className="space-y-2 font-mono text-xs">
              {activity.length > 0 ? (
                activity.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => navigate('/alerts')}
                    className="p-3 rounded-lg bg-slate-950/60 border border-slate-800/80 hover:border-slate-700 flex flex-col md:flex-row md:items-center justify-between gap-3 cursor-pointer transition"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-slate-500 text-[11px] shrink-0">{item.time_str}</span>
                      <SeverityBadge severity={item.severity} />
                      <span className="text-slate-200 font-sans font-medium">{item.title}</span>
                    </div>

                    <div className="flex items-center gap-4 text-[11px] text-slate-400">
                      <span>Source: <strong className="text-slate-300">{item.source_ip || 'N/A'}</strong></span>
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                        {item.detection_type}
                      </span>
                      <span>Risk: <strong className="text-cyan-400 font-bold">{item.risk_score}</strong></span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center text-slate-500">Live stream listening for sensor telemetry...</div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
