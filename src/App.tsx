import { useState, useMemo } from 'react';
import { useCandidates } from './hooks/useCandidates';
import { CandidateTable } from './components/CandidateTable';
import { CandidateCard } from './components/CandidateCard';
import './index.css';

type ViewMode = 'table' | 'cards';
type RoleFilter = string | null;

/**
 * HVC Follow-up Dashboard
 * Displays high-value candidates that need follow-up (24+ hours since last activity)
 */
function App() {
  const { candidates, loading, error, lastUpdated, refetch } = useCandidates();
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [roleFilter, setRoleFilter] = useState<RoleFilter>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Get unique roles for filter dropdown
  const roles = useMemo(() => {
    const uniqueRoles = new Set(candidates.map(c => c.role).filter(Boolean));
    return Array.from(uniqueRoles).sort() as string[];
  }, [candidates]);

  // Filter candidates by role
  const filteredCandidates = useMemo(() => {
    if (!roleFilter) return candidates;
    return candidates.filter(c => c.role === roleFilter);
  }, [candidates, roleFilter]);

  // Calculate stats
  const stats = useMemo(() => {
    const total = filteredCandidates.length;
    const critical = filteredCandidates.filter(c => (c.hoursSinceLastActivity ?? 0) > 48).length;
    const avgHours = total > 0
      ? Math.round(filteredCandidates.reduce((sum, c) => sum + (c.hoursSinceLastActivity ?? 0), 0) / total)
      : 0;
    const hotCount = filteredCandidates.filter(c => c.hotCandidate).length;
    return { total, critical, avgHours, hotCount };
  }, [filteredCandidates]);

  const formatLastUpdated = (date: Date | null) => {
    if (!date) return '—';
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit'
    });
  };

  return (
    <div className="min-h-screen text-slate-100">
      {/* Header */}
      <header className="border-b border-slate-700/50 bg-slate-900/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-100 flex items-center gap-3">
                <span className="text-2xl">⚡</span>
                HVC Follow-up Dashboard
              </h1>
              <p className="text-sm text-slate-400 mt-1">
                High-value candidates requiring immediate attention
              </p>
            </div>
            
            <div className="flex items-center gap-4 text-sm">
              <a
                href="/pending-review"
                className="text-indigo-400 hover:text-indigo-300 transition-colors"
              >
                Pending Review →
              </a>
              <div className="flex items-center gap-2">
                <span className="text-slate-500">Last sync:</span>
                <span className="text-slate-300 font-mono">{formatLastUpdated(lastUpdated)}</span>
              </div>
              
              <button
                onClick={() => refetch()}
                disabled={loading}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-slate-300 bg-slate-700/50 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed rounded transition-colors"
              >
                <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Refresh
              </button>
              
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoRefresh}
                  onChange={(e) => setAutoRefresh(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-indigo-500 focus:ring-indigo-500 focus:ring-offset-slate-900"
                />
                <span className="text-slate-400">Auto (5m)</span>
              </label>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Stats Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-4">
            <div className="text-3xl font-bold text-slate-100">{stats.total}</div>
            <div className="text-sm text-slate-400 uppercase tracking-wide">Overdue HVCs</div>
          </div>
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
            <div className="text-3xl font-bold text-red-400">{stats.critical}</div>
            <div className="text-sm text-red-400/70 uppercase tracking-wide">Critical (&gt;48h)</div>
          </div>
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4">
            <div className="text-3xl font-bold text-amber-400">{stats.avgHours}h</div>
            <div className="text-sm text-amber-400/70 uppercase tracking-wide">Avg. Overdue</div>
          </div>
          <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-4">
            <div className="text-3xl font-bold text-orange-400">{stats.hotCount}</div>
            <div className="text-sm text-orange-400/70 uppercase tracking-wide">Hot 🔥</div>
          </div>
        </div>

        {/* Filters & View Toggle */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <label className="text-sm text-slate-400">Role:</label>
            <select
              value={roleFilter || ''}
              onChange={(e) => setRoleFilter(e.target.value || null)}
              className="px-3 py-1.5 text-sm bg-slate-800 border border-slate-700 rounded text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">All Roles</option>
              {roles.map(role => (
                <option key={role} value={role}>{role}</option>
              ))}
            </select>
            
            {roleFilter && (
              <button
                onClick={() => setRoleFilter(null)}
                className="text-xs text-slate-400 hover:text-slate-200"
              >
                Clear
              </button>
            )}
          </div>

          <div className="flex items-center gap-1 bg-slate-800/50 border border-slate-700/50 rounded-lg p-1">
            <button
              onClick={() => setViewMode('table')}
              className={`px-3 py-1.5 text-sm rounded transition-colors ${
                viewMode === 'table'
                  ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 10h18M3 14h18M3 6h18M3 18h18" />
              </svg>
            </button>
            <button
              onClick={() => setViewMode('cards')}
              className={`px-3 py-1.5 text-sm rounded transition-colors ${
                viewMode === 'cards'
                  ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="7" height="7" rx="1" />
                <rect x="14" y="3" width="7" height="7" rx="1" />
                <rect x="3" y="14" width="7" height="7" rx="1" />
                <rect x="14" y="14" width="7" height="7" rx="1" />
              </svg>
            </button>
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-2 text-red-400">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <span className="font-medium">Error loading candidates</span>
            </div>
            <p className="text-sm text-red-400/70 mt-1">{error}</p>
            <button
              onClick={() => refetch()}
              className="mt-3 text-sm text-red-300 hover:text-red-200 underline"
            >
              Try again
            </button>
          </div>
        )}

        {/* Loading State */}
        {loading && candidates.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16">
            <svg className="w-12 h-12 text-indigo-400 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <p className="text-slate-400 mt-4">Loading candidates from Notion...</p>
          </div>
        )}

        {/* Content */}
        {!loading || candidates.length > 0 ? (
          <div className="bg-slate-800/30 border border-slate-700/50 rounded-lg overflow-hidden">
            {viewMode === 'table' ? (
              <CandidateTable candidates={filteredCandidates} />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
                {filteredCandidates.map(candidate => (
                  <CandidateCard key={candidate.id} candidate={candidate} />
                ))}
                {filteredCandidates.length === 0 && (
                  <div className="col-span-full text-center py-12 text-slate-400">
                    <p className="text-lg">No overdue high-value candidates</p>
                    <p className="text-sm mt-1">All HVCs have been followed up within 24 hours ✓</p>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : null}

        {/* Footer */}
        <footer className="mt-8 text-center text-xs text-slate-500">
          <p>Data sourced from Notion Candidate Board • Auto-refreshes every 5 minutes</p>
        </footer>
      </main>
    </div>
  );
}

export default App;
