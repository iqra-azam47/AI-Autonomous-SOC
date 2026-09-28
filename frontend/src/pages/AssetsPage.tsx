import React, { useState, useEffect } from 'react';
import {
  Server, Shield, AlertTriangle, Plus, Search, Filter,
  RefreshCw, CheckCircle2, XCircle, HardDrive, Eye, ExternalLink, X
} from 'lucide-react';
import { api } from '../services/api';
import { Asset } from '../types';
import { useAuth } from '../context/AuthContext';
import { SeverityBadge } from '../components/SeverityBadge';

export const AssetsPage: React.FC = () => {
  const { hasRole } = useAuth();
  const canEdit = hasRole(['ADMIN', 'ANALYST']);

  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState<string>('');
  const [criticalityFilter, setCriticalityFilter] = useState<string>('ALL');

  // Detail Modal
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [assetDetails, setAssetDetails] = useState<{ asset: Asset; recent_events: any[] } | null>(null);
  const [loadingDetail, setLoadingDetail] = useState<boolean>(false);

  // Create Modal
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [creating, setCreating] = useState<boolean>(false);
  const [newAsset, setNewAsset] = useState({
    asset_name: '',
    ip_address: '',
    hostname: '',
    os: 'Linux Ubuntu 22.04',
    asset_type: 'SERVER',
    criticality: 'HIGH',
    owner: 'SecOps Team',
  });

  const fetchAssets = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.listAssets();
      setAssets(data);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to fetch enterprise assets');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssets();
  }, []);

  const handleOpenDetail = async (asset: Asset) => {
    setSelectedAsset(asset);
    setLoadingDetail(true);
    try {
      const data = await api.getAsset(asset.id);
      setAssetDetails(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAsset.asset_name || !newAsset.ip_address) return;
    setCreating(true);
    try {
      await api.createAsset(newAsset as any);
      setShowCreateModal(false);
      setNewAsset({
        asset_name: '',
        ip_address: '',
        hostname: '',
        os: 'Linux Ubuntu 22.04',
        asset_type: 'SERVER',
        criticality: 'HIGH',
        owner: 'SecOps Team',
      });
      fetchAssets();
    } catch (err: any) {
      alert(err.message || 'Failed to create asset');
    } finally {
      setCreating(false);
    }
  };

  const filteredAssets = assets.filter((a) => {
    const matchesSearch =
      a.asset_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.ip_address.includes(searchTerm) ||
      (a.hostname && a.hostname.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCrit = criticalityFilter === 'ALL' || a.criticality === criticalityFilter;
    return matchesSearch && matchesCrit;
  });

  const totalAssets = assets.length;
  const criticalAssets = assets.filter((a) => a.criticality === 'CRITICAL').length;
  const activeIncidents = assets.reduce((sum, a) => sum + (a.incident_count || 0), 0);

  return (
    <div className="space-y-6">
      {/* Page Title & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-100 flex items-center gap-2.5 font-mono">
            <Server className="w-6 h-6 text-cyan-400" />
            ASSET INVENTORY
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Protected enterprise infrastructure, criticality classifications, and threat exposure telemetry.
          </p>
        </div>
        {canEdit && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-semibold font-mono shadow-md transition-colors"
          >
            <Plus className="w-4 h-4" />
            Register Asset
          </button>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-[#0e1424] border border-slate-800 rounded-xl p-5 shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono uppercase text-slate-400">Total Monitored Assets</span>
            <Server className="w-5 h-5 text-cyan-400" />
          </div>
          <div className="text-3xl font-bold font-mono text-slate-100 mt-2">{totalAssets}</div>
          <span className="text-[11px] text-slate-400 font-mono mt-1 block">Active on telemetry pipelines</span>
        </div>

        <div className="bg-[#0e1424] border border-slate-800 rounded-xl p-5 shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono uppercase text-slate-400">Tier-1 Critical Infrastructure</span>
            <Shield className="w-5 h-5 text-red-400" />
          </div>
          <div className="text-3xl font-bold font-mono text-red-400 mt-2">{criticalAssets}</div>
          <span className="text-[11px] text-slate-400 font-mono mt-1 block">Domain Controllers, DBs, Vaults</span>
        </div>

        <div className="bg-[#0e1424] border border-slate-800 rounded-xl p-5 shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono uppercase text-slate-400">Linked Threat Incidents</span>
            <AlertTriangle className="w-5 h-5 text-amber-400" />
          </div>
          <div className="text-3xl font-bold font-mono text-amber-400 mt-2">{activeIncidents}</div>
          <span className="text-[11px] text-slate-400 font-mono mt-1 block">Associated across security events</span>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by asset name, IP, or hostname..."
            className="w-full pl-9 pr-4 py-2 bg-slate-900 border border-slate-700/80 rounded-lg text-slate-200 placeholder-slate-500 text-xs font-mono focus:outline-none focus:border-cyan-500"
          />
        </div>
        <select
          value={criticalityFilter}
          onChange={(e) => setCriticalityFilter(e.target.value)}
          className="px-3 py-2 bg-slate-900 border border-slate-700/80 rounded-lg text-slate-200 text-xs font-mono focus:outline-none focus:border-cyan-500"
        >
          <option value="ALL">All Criticalities</option>
          <option value="CRITICAL">Critical</option>
          <option value="HIGH">High</option>
          <option value="MEDIUM">Medium</option>
          <option value="LOW">Low</option>
        </select>
        <button
          onClick={fetchAssets}
          className="p-2 bg-slate-900 hover:bg-slate-800 border border-slate-700/80 text-slate-300 rounded-lg transition-colors"
          title="Refresh Assets"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Asset Table */}
      <div className="bg-[#0e1424] border border-slate-800 rounded-xl overflow-hidden shadow">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-slate-900/80 text-slate-400 uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Asset Details</th>
                <th className="py-3 px-4">IP Address</th>
                <th className="py-3 px-4">Type / OS</th>
                <th className="py-3 px-4">Criticality</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-center">Events</th>
                <th className="py-3 px-4 text-center">Alerts</th>
                <th className="py-3 px-4 text-center">Incidents</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 text-slate-300">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-500">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-cyan-400" />
                    Loading assets...
                  </td>
                </tr>
              ) : filteredAssets.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-500">
                    No enterprise assets found matching filter criteria.
                  </td>
                </tr>
              ) : (
                filteredAssets.map((asset) => (
                  <tr key={asset.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-100">{asset.asset_name}</div>
                      <div className="text-[11px] text-slate-500">{asset.hostname || 'No DNS hostname'}</div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-cyan-400 font-semibold">{asset.ip_address}</span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-slate-200">{asset.asset_type || 'SERVER'}</div>
                      <div className="text-[11px] text-slate-500">{asset.os || 'Linux'}</div>
                    </td>
                    <td className="py-3 px-4">
                      <SeverityBadge severity={asset.criticality as any} />
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                        {asset.status || 'ACTIVE'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center text-slate-400">{asset.event_count || 0}</td>
                    <td className="py-3 px-4 text-center text-amber-400 font-semibold">{asset.alert_count || 0}</td>
                    <td className="py-3 px-4 text-center text-red-400 font-bold">{asset.incident_count || 0}</td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => handleOpenDetail(asset)}
                        className="p-1.5 text-slate-400 hover:text-cyan-400 hover:bg-slate-800 rounded transition-colors"
                        title="View Asset Telemetry"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Asset Detail Drawer / Modal */}
      {selectedAsset && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0e1424] border border-slate-700/80 rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2 font-mono">
                  <Server className="w-5 h-5 text-cyan-400" />
                  {selectedAsset.asset_name}
                </h3>
                <span className="text-xs text-slate-400 font-mono">{selectedAsset.ip_address}</span>
              </div>
              <button
                onClick={() => setSelectedAsset(null)}
                className="p-1 text-slate-400 hover:text-slate-200 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs font-mono">
              <div className="bg-slate-900/80 p-3 rounded border border-slate-800">
                <span className="text-slate-500">Criticality</span>
                <div className="mt-1"><SeverityBadge severity={selectedAsset.criticality as any} /></div>
              </div>
              <div className="bg-slate-900/80 p-3 rounded border border-slate-800">
                <span className="text-slate-500">Operating System</span>
                <div className="text-slate-200 mt-1">{selectedAsset.os || 'Linux'}</div>
              </div>
              <div className="bg-slate-900/80 p-3 rounded border border-slate-800">
                <span className="text-slate-500">Asset Type</span>
                <div className="text-slate-200 mt-1">{selectedAsset.asset_type || 'SERVER'}</div>
              </div>
              <div className="bg-slate-900/80 p-3 rounded border border-slate-800">
                <span className="text-slate-500">Assigned Owner</span>
                <div className="text-slate-200 mt-1">{selectedAsset.owner || 'SecOps Team'}</div>
              </div>
            </div>

            <div>
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2 font-mono">
                Recent Security Events on this Host
              </h4>
              {loadingDetail ? (
                <div className="py-6 text-center text-slate-500 text-xs font-mono">
                  Loading host telemetry...
                </div>
              ) : assetDetails?.recent_events && assetDetails.recent_events.length > 0 ? (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {assetDetails.recent_events.map((ev: any) => (
                    <div key={ev.id} className="p-2.5 rounded bg-slate-900/80 border border-slate-800 text-xs font-mono flex items-center justify-between">
                      <div>
                        <span className="text-cyan-400 font-semibold">{ev.event_type}</span>
                        <span className="text-slate-400 ml-2">from {ev.source_ip}</span>
                      </div>
                      <span className="text-slate-500 text-[10px]">{new Date(ev.timestamp).toLocaleTimeString()}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 bg-slate-900/50 rounded text-slate-500 text-xs font-mono text-center">
                  No recent events recorded for this host.
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-slate-800 flex justify-end">
              <button
                onClick={() => setSelectedAsset(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-mono transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Register Asset Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0e1424] border border-slate-700/80 rounded-xl w-full max-w-md shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2 font-mono">
                <Plus className="w-4 h-4 text-cyan-400" />
                Register Enterprise Asset
              </h3>
              <button onClick={() => setShowCreateModal(false)} className="p-1 text-slate-400 hover:text-slate-200">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-3 text-xs font-mono">
              <div>
                <label className="text-slate-400 block mb-1">Asset Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. DC-PRIMARY-01"
                  value={newAsset.asset_name}
                  onChange={(e) => setNewAsset({ ...newAsset, asset_name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded text-slate-200 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">IP Address *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 10.0.0.50"
                  value={newAsset.ip_address}
                  onChange={(e) => setNewAsset({ ...newAsset, ip_address: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded text-slate-200 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">Criticality</label>
                  <select
                    value={newAsset.criticality}
                    onChange={(e) => setNewAsset({ ...newAsset, criticality: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded text-slate-200 focus:outline-none focus:border-cyan-500"
                  >
                    <option value="CRITICAL">Critical</option>
                    <option value="HIGH">High</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="LOW">Low</option>
                  </select>
                </div>

                <div>
                  <label className="text-slate-400 block mb-1">Asset Type</label>
                  <select
                    value={newAsset.asset_type}
                    onChange={(e) => setNewAsset({ ...newAsset, asset_type: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded text-slate-200 focus:outline-none focus:border-cyan-500"
                  >
                    <option value="DOMAIN_CONTROLLER">Domain Controller</option>
                    <option value="DATABASE_SERVER">Database Server</option>
                    <option value="WEB_SERVER">Web Server</option>
                    <option value="SERVER">Server</option>
                    <option value="WORKSTATION">Workstation</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Operating System</label>
                <input
                  type="text"
                  value={newAsset.os}
                  onChange={(e) => setNewAsset({ ...newAsset, os: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded text-slate-200 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Owner / Custodian</label>
                <input
                  type="text"
                  value={newAsset.owner}
                  onChange={(e) => setNewAsset({ ...newAsset, owner: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded text-slate-200 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded font-mono text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded font-mono text-xs font-semibold disabled:opacity-50"
                >
                  {creating ? 'Saving...' : 'Register'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
