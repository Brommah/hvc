interface StatusBadgeProps {
  status: string | null;
  variant?: 'status' | 'priority' | 'urgency';
}

/**
 * Badge component for displaying status, priority, or urgency levels
 */
export function StatusBadge({ status, variant = 'status' }: StatusBadgeProps) {
  if (!status) return null;

  const getStyles = (): string => {
    const base = 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium';
    
    if (variant === 'priority') {
      switch (status) {
        case '1st':
          return `${base} bg-red-500/20 text-red-300 border border-red-500/30`;
        case '2nd':
          return `${base} bg-amber-500/20 text-amber-300 border border-amber-500/30`;
        case '3rd':
          return `${base} bg-sky-500/20 text-sky-300 border border-sky-500/30`;
        default:
          return `${base} bg-slate-500/20 text-slate-300 border border-slate-500/30`;
      }
    }
    
    if (variant === 'urgency') {
      const hours = parseFloat(status);
      if (hours > 72) {
        return `${base} bg-red-600/30 text-red-200 border border-red-500/50 animate-pulse`;
      } else if (hours > 48) {
        return `${base} bg-red-500/20 text-red-300 border border-red-500/30`;
      } else if (hours > 24) {
        return `${base} bg-amber-500/20 text-amber-300 border border-amber-500/30`;
      }
      return `${base} bg-emerald-500/20 text-emerald-300 border border-emerald-500/30`;
    }
    
    // Default status variant
    const statusLower = status.toLowerCase();
    if (statusLower.includes('accept') || statusLower.includes('pass')) {
      return `${base} bg-emerald-500/20 text-emerald-300 border border-emerald-500/30`;
    }
    if (statusLower.includes('reject') || statusLower.includes('fail')) {
      return `${base} bg-red-500/20 text-red-300 border border-red-500/30`;
    }
    if (statusLower.includes('screen') || statusLower.includes('interview')) {
      return `${base} bg-sky-500/20 text-sky-300 border border-sky-500/30`;
    }
    return `${base} bg-slate-500/20 text-slate-300 border border-slate-500/30`;
  };

  return <span className={getStyles()}>{status}</span>;
}

