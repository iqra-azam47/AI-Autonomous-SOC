import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  variant?: 'default' | 'danger' | 'warning' | 'info' | 'success';
  trend?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  variant = 'default',
  trend
}) => {
  const getVariantStyles = () => {
    switch (variant) {
      case 'danger':
        return {
          iconBg: 'bg-red-500/10 text-red-400 border border-red-500/20',
          border: 'border-slate-800 hover:border-red-500/40',
          glow: 'group-hover:shadow-[0_0_20px_-5px_rgba(239,68,68,0.25)]'
        };
      case 'warning':
        return {
          iconBg: 'bg-orange-500/10 text-orange-400 border border-orange-500/20',
          border: 'border-slate-800 hover:border-orange-500/40',
          glow: 'group-hover:shadow-[0_0_20px_-5px_rgba(249,115,22,0.25)]'
        };
      case 'info':
        return {
          iconBg: 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20',
          border: 'border-slate-800 hover:border-cyan-500/40',
          glow: 'group-hover:shadow-[0_0_20px_-5px_rgba(6,182,212,0.25)]'
        };
      case 'success':
        return {
          iconBg: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
          border: 'border-slate-800 hover:border-emerald-500/40',
          glow: 'group-hover:shadow-[0_0_20px_-5px_rgba(16,185,129,0.25)]'
        };
      default:
        return {
          iconBg: 'bg-slate-800 text-slate-300 border border-slate-700/50',
          border: 'border-slate-800 hover:border-slate-700',
          glow: ''
        };
    }
  };

  const styles = getVariantStyles();

  return (
    <div className={`group relative bg-slate-900/80 rounded-xl p-5 border ${styles.border} backdrop-blur-sm transition-all duration-200 ${styles.glow}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">{title}</p>
          <p className="text-2xl font-bold font-mono text-slate-100 mt-1 tracking-tight">{value}</p>
          {subtitle && <p className="text-xs text-slate-500 mt-1">{subtitle}</p>}
        </div>
        <div className={`p-3 rounded-lg ${styles.iconBg}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      {trend && (
        <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center text-xs text-slate-400">
          <span className="font-mono text-emerald-400 mr-1.5">{trend}</span>
          <span>vs previous window</span>
        </div>
      )}
    </div>
  );
};
