import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
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
    <div className="min-h-screen bg-gray-50 text-gray-900">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
              <h1 className="text-xl font-semibold text-gray-900">
                HVC Follow-up Dashboard
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                High-value candidates requiring immediate attention
        </p>
      </div>
            
            <div className="flex items-center gap-4 text-sm">
              <Link
                to="/"
                className="text-gray-500 hover:text-gray-900 transition-colors"
              >
                ← Dashboard
              </Link>
              <Link
                to="/pending-review"
                className="text-gray-500 hover:text-gray-900 transition-colors"
              >
                Pending Review
              </Link>
              <div className="flex items-center gap-2 text-gray-400">
                <span>Last sync:</span>
                <span className="text-gray-600 font-medium">{formatLastUpdated(lastUpdated)}</span>
              </div>
              
              <button
                onClick={() => refetch()}
                disabled={loading}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Refresh
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-6">
        {/* Stats Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          <div className="bg-white border border-gray-200 p-4">
            <div className="text-3xl font-semibold text-gray-900">{stats.total}</div>
            <div className="text-xs text-gray-500 uppercase tracking-wide mt-1">Overdue HVCs</div>
          </div>
          <div className="bg-white border border-red-200 p-4">
            <div className="text-3xl font-semibold text-red-600">{stats.critical}</div>
            <div className="text-xs text-red-500 uppercase tracking-wide mt-1">Critical (&gt;48h)</div>
          </div>
          <div className="bg-white border border-amber-200 p-4">
            <div className="text-3xl font-semibold text-amber-600">{stats.avgHours}h</div>
            <div className="text-xs text-amber-500 uppercase tracking-wide mt-1">Avg. Overdue</div>
          </div>
          <div className="bg-white border border-orange-200 p-4">
            <div className="text-3xl font-semibold text-orange-600">{stats.hotCount}</div>
            <div className="text-xs text-orange-500 uppercase tracking-wide mt-1">Hot 🔥</div>
          </div>
        </div>

        {/* Metrics Callout */}
        <div className="bg-blue-50 border border-blue-200 px-4 py-3 mb-6 flex items-start gap-3">
          <svg className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 16v-4M12 8h.01" />
          </svg>
          <div className="text-sm text-blue-800">
            <span className="font-medium">Hours Overdue</span> is calculated from the Notion field "Hours Since Last Activity" — 
            time elapsed since the candidate's last recorded communication or status update. 
            Candidates shown here are <span className="font-medium">Hot 🔥</span>, <span className="font-medium">1st Priority</span>, or <span className="font-medium">H Stratification</span> with &gt;24h since last activity.
          </div>
        </div>

        {/* Filters & View Toggle */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <label className="text-sm text-gray-500">Role:</label>
            <select
              value={roleFilter || ''}
              onChange={(e) => setRoleFilter(e.target.value || null)}
              className="px-3 py-1.5 text-sm bg-white border border-gray-300 text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900"
            >
              <option value="">All Roles</option>
              {roles.map(role => (
                <option key={role} value={role}>{role}</option>
              ))}
            </select>
            
            {roleFilter && (
              <button
                onClick={() => setRoleFilter(null)}
                className="text-xs text-gray-500 hover:text-gray-900"
              >
                Clear
              </button>
            )}
          </div>

          <div className="flex items-center gap-1 bg-white border border-gray-200 p-1">
            <button
              onClick={() => setViewMode('table')}
              className={`px-3 py-1.5 text-sm transition-colors ${
                viewMode === 'table'
                  ? 'bg-gray-900 text-white'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 10h18M3 14h18M3 6h18M3 18h18" />
              </svg>
            </button>
            <button
              onClick={() => setViewMode('cards')}
              className={`px-3 py-1.5 text-sm transition-colors ${
                viewMode === 'cards'
                  ? 'bg-gray-900 text-white'
                  : 'text-gray-500 hover:text-gray-900'
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
          <div className="bg-red-50 border border-red-200 p-4 mb-6">
            <div className="flex items-center gap-2 text-red-600">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <span className="font-medium">Error loading candidates</span>
            </div>
            <p className="text-sm text-red-500 mt-1">{error}</p>
            <button
              onClick={() => refetch()}
              className="mt-3 text-sm text-red-600 hover:text-red-800 underline"
            >
              Try again
            </button>
          </div>
        )}

        {/* Loading State */}
        {loading && candidates.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16">
            <svg className="w-12 h-12 text-gray-400 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <p className="text-gray-500 mt-4">Loading candidates from Notion...</p>
          </div>
        )}

        {/* Content */}
        {!loading || candidates.length > 0 ? (
          <div className="bg-white border border-gray-200 overflow-hidden">
            {viewMode === 'table' ? (
              <CandidateTable candidates={filteredCandidates} />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
                {filteredCandidates.map(candidate => (
                  <CandidateCard key={candidate.id} candidate={candidate} />
                ))}
                {filteredCandidates.length === 0 && (
                  <div className="col-span-full text-center py-12 text-gray-500">
                    <p className="text-lg">No overdue high-value candidates</p>
                    <p className="text-sm mt-1">All HVCs have been followed up within 24 hours ✓</p>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : null}

        {/* Footer */}
        <footer className="mt-8 text-center text-xs text-gray-400">
          <p>Data sourced from Notion Candidate Board • Auto-refreshes every 5 minutes</p>
        </footer>
      </main>
    </div>
  );
}

export default App;
