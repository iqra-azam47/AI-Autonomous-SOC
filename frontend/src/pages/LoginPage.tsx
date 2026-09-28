import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Shield, Eye, EyeOff, Lock, User, AlertCircle, ArrowRight } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [usernameOrEmail, setUsernameOrEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!usernameOrEmail.trim() || !password) {
      setError('Please provide your username/email and password.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await login({ username_or_email: usernameOrEmail, password });
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  const fillDemoCreds = (user: string, pass: string) => {
    setUsernameOrEmail(user);
    setPassword(pass);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-[#070b14] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background glow graphics */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[350px] bg-cyan-500/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/3 w-[400px] h-[300px] bg-blue-600/10 blur-[100px] rounded-full pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-600 to-blue-600 text-white shadow-xl shadow-cyan-950/60 mb-4 border border-cyan-400/30">
            <Shield className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-bold font-mono tracking-tight text-slate-100">
            AI AUTONOMOUS <span className="text-cyan-400">SOC</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1.5 font-mono">Enterprise Security Operations Command Console</p>
        </div>

        {/* Card */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-7 backdrop-blur-xl shadow-2xl">
          {error && (
            <div className="mb-5 p-3 rounded-lg bg-red-500/10 border border-red-500/30 flex items-start gap-2.5 text-red-400 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5 font-mono">
                Operator ID or Email
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={usernameOrEmail}
                  onChange={(e) => setUsernameOrEmail(e.target.value)}
                  placeholder="admin or analyst@soc.corp"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-950/70 border border-slate-700/80 rounded-lg text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 font-mono transition"
                  disabled={loading}
                  autoComplete="username"
                  required
                />
                <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider font-mono">
                  Access Key / Password
                </label>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-10 pr-10 py-2.5 bg-slate-950/70 border border-slate-700/80 rounded-lg text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 font-mono transition"
                  disabled={loading}
                  autoComplete="current-password"
                  required
                />
                <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-slate-500 hover:text-slate-300 focus:outline-none"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 px-4 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-bold font-mono uppercase tracking-wider rounded-lg shadow-lg shadow-cyan-950/50 transition-all duration-150 flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Authenticating...</span>
                </>
              ) : (
                <>
                  <span>Initialize Console Session</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Access Roles */}
          <div className="mt-6 pt-5 border-t border-slate-800">
            <p className="text-[10px] font-mono uppercase tracking-wider text-slate-500 mb-2.5 text-center">
              Quick Load Certified Demo Roles
            </p>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => fillDemoCreds('admin', 'AdminPass123!')}
                className="py-1.5 px-2 rounded bg-slate-800/80 hover:bg-slate-800 text-[11px] font-mono text-cyan-400 border border-slate-700/60 hover:border-cyan-500/40 transition text-center"
              >
                ADMIN
              </button>
              <button
                type="button"
                onClick={() => fillDemoCreds('analyst', 'AnalystPass123!')}
                className="py-1.5 px-2 rounded bg-slate-800/80 hover:bg-slate-800 text-[11px] font-mono text-emerald-400 border border-slate-700/60 hover:border-emerald-500/40 transition text-center"
              >
                ANALYST
              </button>
              <button
                type="button"
                onClick={() => fillDemoCreds('viewer', 'ViewerPass123!')}
                className="py-1.5 px-2 rounded bg-slate-800/80 hover:bg-slate-800 text-[11px] font-mono text-blue-400 border border-slate-700/60 hover:border-blue-500/40 transition text-center"
              >
                VIEWER
              </button>
            </div>
          </div>
        </div>

        {/* Security Notice Footer */}
        <p className="text-[11px] text-slate-500 text-center mt-6 font-mono">
          Authorized enterprise personnel only. All access attempts are cryptographically audited.
        </p>
      </div>
    </div>
  );
};
