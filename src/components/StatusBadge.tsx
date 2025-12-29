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
    const base = 'inline-flex items-center px-2 py-0.5 text-xs font-medium';
    
    if (variant === 'priority') {
      switch (status) {
        case '1st':
          return `${base} bg-red-50 text-red-700 border border-red-200`;
        case '2nd':
          return `${base} bg-amber-50 text-amber-700 border border-amber-200`;
        case '3rd':
          return `${base} bg-blue-50 text-blue-700 border border-blue-200`;
        default:
          return `${base} bg-gray-50 text-gray-600 border border-gray-200`;
      }
    }
    
    if (variant === 'urgency') {
      const hours = parseFloat(status);
      if (hours > 72) {
        return `${base} bg-red-100 text-red-800 border border-red-300`;
      } else if (hours > 48) {
        return `${base} bg-red-50 text-red-700 border border-red-200`;
      } else if (hours > 24) {
        return `${base} bg-amber-50 text-amber-700 border border-amber-200`;
      }
      return `${base} bg-green-50 text-green-700 border border-green-200`;
    }
    
    // Default status variant
    const statusLower = status.toLowerCase();
    if (statusLower.includes('accept') || statusLower.includes('pass')) {
      return `${base} bg-green-50 text-green-700 border border-green-200`;
    }
    if (statusLower.includes('reject') || statusLower.includes('fail')) {
      return `${base} bg-red-50 text-red-700 border border-red-200`;
    }
    if (statusLower.includes('screen') || statusLower.includes('interview')) {
      return `${base} bg-blue-50 text-blue-700 border border-blue-200`;
    }
    if (statusLower.includes('promising') || statusLower.includes('pool')) {
      return `${base} bg-purple-50 text-purple-700 border border-purple-200`;
    }
    return `${base} bg-gray-50 text-gray-600 border border-gray-200`;
  };

  return <span className={getStyles()}>{status}</span>;
}
