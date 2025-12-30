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
  if (hours === null) return 'text-gray-400';
  if (hours > 72) return 'text-red-600 font-bold';
  if (hours > 48) return 'text-red-500 font-semibold';
  if (hours > 24) return 'text-amber-500';
  return 'text-green-500';
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
    <div className="min-h-screen bg-gray-50 text-gray-900">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-xl font-semibold text-gray-900">
                Screening Backlog
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                Candidates in HR Screening & HM Screening stages
              </p>
            </div>
            
            <div className="flex items-center gap-4 text-sm">
              <a
                href="/"
                className="text-gray-500 hover:text-gray-900 transition-colors"
              >
                ← HVC Dashboard
              </a>
              <a
                href="/ceo"
                className="text-gray-500 hover:text-gray-900 transition-colors"
              >
                CEO Insights
              </a>
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
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white border border-gray-200 p-4">
            <div className="text-3xl font-semibold text-gray-900">{stats.total}</div>
            <div className="text-xs text-gray-500 uppercase tracking-wide mt-1">In Screening</div>
          </div>
          <div className="bg-white border border-red-200 p-4">
            <div className="text-3xl font-semibold text-red-600">{stats.critical}</div>
            <div className="text-xs text-red-500 uppercase tracking-wide mt-1">Critical (&gt;48h)</div>
          </div>
          <div className="bg-white border border-amber-200 p-4">
            <div className="text-3xl font-semibold text-amber-600">{formatDuration(stats.avgHours)}</div>
            <div className="text-xs text-amber-500 uppercase tracking-wide mt-1">Avg. Time in Pipeline</div>
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
          </div>
        )}

        {/* Loading State */}
        {loading && candidates.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16">
            <svg className="w-12 h-12 text-gray-400 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <p className="text-gray-500 mt-4">Loading pending reviews...</p>
          </div>
        )}

        {/* Table */}
        {!loading || candidates.length > 0 ? (
          <div className="bg-white border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Candidate</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">AI Reviewed</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Waiting</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">AI Score</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {candidates.map((candidate) => (
                    <tr key={candidate.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="text-gray-900 font-medium">{candidate.name}</span>
                          {candidate.hotCandidate && <span title="Hot Candidate">🔥</span>}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {candidate.role || '—'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">
                        {formatDate(candidate.aiProcessedAt)}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`font-medium text-lg ${getUrgencyClass(candidate.hoursSinceAiReview)}`}>
                          {formatDuration(candidate.hoursSinceAiReview)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {candidate.aiScore !== null ? (
                          <span className="text-gray-900 font-medium">{candidate.aiScore}</span>
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
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 transition-colors"
                            title="Review in Notion"
                          >
                            Review
                            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/>
                            </svg>
                          </a>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              
              {candidates.length === 0 && !loading && (
                <div className="text-center py-12 text-gray-500">
                  <p className="text-lg">No candidates pending human review</p>
                  <p className="text-sm mt-1">All AI-reviewed candidates have been verified ✓</p>
                </div>
              )}
            </div>
          </div>
        ) : null}

        {/* Footer */}
        <footer className="mt-8 text-center text-xs text-gray-400">
          <p>Sorted by time waiting (longest first) • Auto-refreshes every 5 minutes</p>
        </footer>
      </main>
    </div>
  );
}
