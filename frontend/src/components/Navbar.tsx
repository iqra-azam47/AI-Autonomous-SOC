import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Play, LogOut, Cpu, Radio, ChevronDown, CheckCircle2 } from 'lucide-react';
import { api } from '../services/api';

export const Navbar: React.FC = () => {
  const { user, logout, hasRole } = useAuth();
  const navigate = useNavigate();
  const [simulating, setSimulating] = useState(false);
  const [simSuccess, setSimSuccess] = useState<string | null>(null);

  const canSimulate = hasRole(['ADMIN', 'ANALYST']);

  const handleQuickSimulation = async (scenario: string = 'BRUTE_FORCE') => {
    if (!canSimulate) return;
    setSimulating(true);
    setSimSuccess(null);
    try {
      const res = await api.runSimulation(scenario);
      setSimSuccess(`Simulation ${scenario} completed! Generated ${res.events_generated} events & ${res.incidents_generated} incident.`);
      setTimeout(() => setSimSuccess(null), 5000);
      navigate('/incidents');
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Simulation execution failed');
    } finally {
      setSimulating(false);
    }
  };

  return (
    <header className="h-16 bg-[#0a0f1d]/90 backdrop-blur-md border-b border-slate-800/80 px-6 flex items-center justify-between sticky top-0 z-30">
      {/* Left: SOC Status & Engine Info */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-mono">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="font-semibold">SOC ENGINE ONLINE</span>
        </div>
        <div className="hidden md:flex items-center gap-1.5 text-xs text-slate-400 font-mono">
          <Cpu className="w-3.5 h-3.5 text-cyan-400" />
          <span>Active ML: <strong className="text-slate-200">v1.0.0 (Ensemble)</strong></span>
        </div>
      </div>

      {/* Right: Actions & User Info */}
      <div className="flex items-center gap-3">
        {simSuccess && (
          <div className="hidden lg:flex items-center gap-1.5 px-3 py-1 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-mono">
            <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <span className="truncate max-w-xs">{simSuccess}</span>
          </div>
        )}

        {canSimulate && (
          <button
            onClick={() => handleQuickSimulation('BRUTE_FORCE')}
            disabled={simulating}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 text-white shadow-md shadow-red-950/40 transition-all duration-150 disabled:opacity-50"
            title="Execute Instant Brute-Force Attack Simulation"
          >
            <Play className={`w-3.5 h-3.5 ${simulating ? 'animate-spin' : ''}`} />
            <span>{simulating ? 'Simulating Pipeline...' : 'Run Simulation'}</span>
          </button>
        )}

        <div className="h-6 w-px bg-slate-800 mx-1" />

        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <p className="text-xs font-semibold text-slate-200">{user?.username}</p>
            <span className="text-[10px] font-mono text-cyan-400 uppercase font-bold">{user?.role_name}</span>
          </div>
          <button
            onClick={logout}
            className="p-2 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition-all duration-150"
            title="Log out of SOC console"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
