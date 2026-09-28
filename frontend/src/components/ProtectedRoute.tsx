import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Role } from '../types';
import { ShieldX } from 'lucide-react';

interface ProtectedRouteProps {
  allowedRoles?: Role[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ allowedRoles }) => {
  const { user, token, loading, hasRole } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#090d16] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-mono text-slate-400">Verifying SOC credentials...</span>
        </div>
      </div>
    );
  }

  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !hasRole(allowedRoles)) {
    return (
      <div className="p-8 flex flex-col items-center justify-center text-center">
        <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400 mb-4">
          <ShieldX className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-100">Access Restricted</h2>
        <p className="text-sm text-slate-400 max-w-md mt-2">
          Your assigned role (<span className="font-mono text-cyan-400">{user.role_name}</span>) does not hold authorization to access this security console.
        </p>
      </div>
    );
  }

  return <Outlet />;
};
