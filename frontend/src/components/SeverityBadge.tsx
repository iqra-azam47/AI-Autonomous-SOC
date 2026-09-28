import React from 'react';
import { Severity } from '../types';

interface SeverityBadgeProps {
  severity: Severity | string;
  size?: 'sm' | 'md' | 'lg';
}

export const SeverityBadge: React.FC<SeverityBadgeProps> = ({ severity, size = 'sm' }) => {
  const sev = (severity || 'LOW').toUpperCase();

  const getStyles = () => {
    switch (sev) {
      case 'CRITICAL':
        return 'bg-red-500/15 text-red-400 border-red-500/30';
      case 'HIGH':
        return 'bg-orange-500/15 text-orange-400 border-orange-500/30';
      case 'MEDIUM':
        return 'bg-amber-500/15 text-amber-400 border-amber-500/30';
      case 'LOW':
      default:
        return 'bg-blue-500/15 text-blue-400 border-blue-500/30';
    }
  };

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-xs px-2.5 py-1 font-medium',
    lg: 'text-sm px-3 py-1.5 font-semibold',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-mono uppercase tracking-wider rounded border ${getStyles()} ${sizeClasses[size]}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${
        sev === 'CRITICAL' ? 'bg-red-400 animate-pulse' :
        sev === 'HIGH' ? 'bg-orange-400' :
        sev === 'MEDIUM' ? 'bg-amber-400' : 'bg-blue-400'
      }`} />
      {sev}
    </span>
  );
};
