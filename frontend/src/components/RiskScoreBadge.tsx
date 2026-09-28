import React from 'react';

interface RiskScoreBadgeProps {
  score: number;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

export const RiskScoreBadge: React.FC<RiskScoreBadgeProps> = ({ score, size = 'sm', showLabel = false }) => {
  const normalized = Math.min(100, Math.max(0, Math.round(score)));

  const getColor = () => {
    if (normalized >= 75) return { text: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/30', bar: 'bg-red-500' };
    if (normalized >= 50) return { text: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/30', bar: 'bg-orange-500' };
    if (normalized >= 25) return { text: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/30', bar: 'bg-amber-500' };
    return { text: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/30', bar: 'bg-blue-500' };
  };

  const colors = getColor();

  return (
    <div className="inline-flex items-center gap-2">
      <span
        className={`font-mono font-bold rounded border ${colors.bg} ${colors.text} ${colors.border} ${
          size === 'lg' ? 'text-lg px-3 py-1' : size === 'md' ? 'text-sm px-2.5 py-0.5' : 'text-xs px-2 py-0.5'
        }`}
      >
        {normalized}
        <span className="text-[10px] text-slate-500 font-normal">/100</span>
      </span>
      {showLabel && (
        <span className={`text-xs font-semibold ${colors.text}`}>
          {normalized >= 75 ? 'CRITICAL' : normalized >= 50 ? 'HIGH' : normalized >= 25 ? 'MEDIUM' : 'LOW'}
        </span>
      )}
    </div>
  );
};
