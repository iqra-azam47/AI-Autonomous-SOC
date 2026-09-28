import React from 'react';
import { LucideIcon, ShieldAlert } from 'lucide-react';

interface EmptyStateProps {
  title: string;
  description: string;
  icon?: LucideIcon;
  actionLabel?: string;
  onAction?: () => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  icon: Icon = ShieldAlert,
  actionLabel,
  onAction,
  secondaryActionLabel,
  onSecondaryAction
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center rounded-xl border border-dashed border-slate-800 bg-slate-900/40">
      <div className="w-14 h-14 rounded-2xl bg-slate-800/80 border border-slate-700/50 flex items-center justify-center text-slate-400 mb-4 shadow-inner">
        <Icon className="w-7 h-7 text-cyan-400" />
      </div>
      <h3 className="text-base font-semibold text-slate-200">{title}</h3>
      <p className="text-sm text-slate-400 max-w-md mt-1.5 leading-relaxed">{description}</p>
      
      {(actionLabel || secondaryActionLabel) && (
        <div className="mt-6 flex flex-wrap gap-3">
          {actionLabel && onAction && (
            <button
              onClick={onAction}
              className="px-4 py-2 text-xs font-semibold rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white transition-all duration-150 shadow-md shadow-cyan-900/30 flex items-center gap-2"
            >
              {actionLabel}
            </button>
          )}
          {secondaryActionLabel && onSecondaryAction && (
            <button
              onClick={onSecondaryAction}
              className="px-4 py-2 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-all duration-150"
            >
              {secondaryActionLabel}
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export const LoadingSkeleton: React.FC<{ rows?: number }> = ({ rows = 5 }) => {
  return (
    <div className="space-y-3 animate-pulse">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-12 bg-slate-800/50 border border-slate-800/80 rounded-lg w-full" />
      ))}
    </div>
  );
};
