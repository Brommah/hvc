import { useMemo } from 'react';
import { usePendingReview } from '../hooks/usePendingReview';
import { StatusBadge } from '../components/StatusBadge';

/**
 * Format date to a readable string
 */
function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

/**
 * Format hours to a human-readable duration
 */
function formatDuration(hours: number | null): string {
  if (hours === null) return '—';
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;
  if (days === 1) return `${days}d ${remainingHours}h`;
  return `${days}d`;
}

/**
 * Get urgency class based on hours waiting
 */
function getUrgencyClass(hours: number | null): string {
  if (hours === null) return 'text-slate-400';
  if (hours > 72) return 'text-red-400 font-bold animate-pulse';
  if (hours > 48) return 'text-red-400 font-semibold';
  if (hours > 24) return 'text-amber-400';
  return 'text-emerald-400';
}

/**
 * Pending Human Review Dashboard
 * Shows candidates that have been AI reviewed but awaiting human review
 */
export function PendingReview() {
  const { candidates, loading, error, lastUpdated, refetch } = usePendingReview();

  // Calculate stats
  const stats = useMemo(() => {
    const total = candidates.length;
    const critical = candidates.filter(c => (c.hoursSinceAiReview ?? 0) > 48).length;
    const avgHours = total > 0
      ? Math.round(candidates.reduce((sum, c) => sum + (c.hoursSinceAiReview ?? 0), 0) / total)
      : 0;
    return { total, critical, avgHours };
  }, [candidates]);

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
                <span className="text-2xl">🔍</span>
                Pending Human Review
              </h1>
              <p className="text-sm text-slate-400 mt-1">
                Candidates reviewed by AI, awaiting human verification
              </p>
            </div>
            
            <div className="flex items-center gap-4 text-sm">
              <a
                href="/"
                className="text-indigo-400 hover:text-indigo-300 transition-colors"
              >
                ← Back to HVC Dashboard
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
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Stats Bar */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-4">
            <div className="text-3xl font-bold text-slate-100">{stats.total}</div>
            <div className="text-sm text-slate-400 uppercase tracking-wide">Pending Review</div>
          </div>
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
            <div className="text-3xl font-bold text-red-400">{stats.critical}</div>
            <div className="text-sm text-red-400/70 uppercase tracking-wide">Critical (&gt;48h)</div>
          </div>
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4">
            <div className="text-3xl font-bold text-amber-400">{formatDuration(stats.avgHours)}</div>
            <div className="text-sm text-amber-400/70 uppercase tracking-wide">Avg. Wait Time</div>
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
          </div>
        )}

        {/* Loading State */}
        {loading && candidates.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16">
            <svg className="w-12 h-12 text-indigo-400 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <p className="text-slate-400 mt-4">Loading pending reviews...</p>
          </div>
        )}

        {/* Table */}
        {!loading || candidates.length > 0 ? (
          <div className="bg-slate-800/30 border border-slate-700/50 rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-800/50 border-b border-slate-700/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Candidate</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Role</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">AI Reviewed</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Waiting</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">AI Score</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Status</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-slate-400 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/30">
                  {candidates.map((candidate) => (
                    <tr key={candidate.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="text-slate-100 font-medium">{candidate.name}</span>
                          {candidate.hotCandidate && <span title="Hot Candidate">🔥</span>}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-400">
                        {candidate.role || '—'}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-400 whitespace-nowrap">
                        {formatDate(candidate.aiProcessedAt)}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`font-mono text-lg ${getUrgencyClass(candidate.hoursSinceAiReview)}`}>
                          {formatDuration(candidate.hoursSinceAiReview)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {candidate.aiScore !== null ? (
                          <span className="text-slate-200 font-medium">{candidate.aiScore}</span>
                        ) : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={candidate.status} />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <a
                            href={candidate.notionUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 bg-slate-700/50 hover:bg-slate-700 rounded transition-colors"
                            title="Review in Notion"
                          >
                            Review
                            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/>
                            </svg>
                          </a>
                          {candidate.linkedinProfile && (
                            <button
                              onClick={() => navigator.clipboard.writeText(candidate.linkedinProfile!)}
                              className="p-1.5 text-sky-400 hover:text-sky-300 hover:bg-sky-500/10 rounded transition-colors"
                              title="Copy LinkedIn URL"
                            >
                              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
                              </svg>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              
              {candidates.length === 0 && !loading && (
                <div className="text-center py-12 text-slate-400">
                  <p className="text-lg">No candidates pending human review</p>
                  <p className="text-sm mt-1">All AI-reviewed candidates have been verified ✓</p>
                </div>
              )}
            </div>
          </div>
        ) : null}

        {/* Footer */}
        <footer className="mt-8 text-center text-xs text-slate-500">
          <p>Sorted by time waiting (longest first) • Auto-refreshes every 5 minutes</p>
        </footer>
      </main>
    </div>
  );
}

