import type { Candidate } from '../types';
import { StatusBadge } from './StatusBadge';

interface CandidateCardProps {
  candidate: Candidate;
}

/**
 * Format date to a readable string
 */
function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/**
 * Card component for displaying a single candidate
 */
export function CandidateCard({ candidate }: CandidateCardProps) {
  const hours = candidate.hoursSinceLastActivity;
  const urgencyClass = hours !== null && hours > 48 
    ? 'border-l-red-500' 
    : hours !== null && hours > 24 
      ? 'border-l-amber-500' 
      : 'border-l-emerald-500';

  const handleCopyLinkedIn = async () => {
    if (candidate.linkedinProfile) {
      await navigator.clipboard.writeText(candidate.linkedinProfile);
    }
  };

  return (
    <div className={`bg-slate-800/50 border border-slate-700/50 rounded-lg p-4 border-l-4 ${urgencyClass} hover:bg-slate-800/70 transition-colors`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-base font-semibold text-slate-100 truncate">
              {candidate.name}
            </h3>
            {candidate.hotCandidate && (
              <span className="text-orange-400 text-sm" title="Hot Candidate">🔥</span>
            )}
          </div>
          
          <p className="text-sm text-slate-400 mt-0.5 truncate">
            {candidate.role || 'No role specified'}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            Applied: {formatDate(candidate.dateAdded)}
          </p>
          
          <div className="flex flex-wrap gap-1.5 mt-2">
            <StatusBadge status={candidate.status} />
            {candidate.priority && (
              <StatusBadge status={candidate.priority} variant="priority" />
            )}
            {candidate.interviewStatus && (
              <StatusBadge status={candidate.interviewStatus} />
            )}
          </div>
        </div>

        <div className="text-right shrink-0">
          <div className="text-2xl font-bold text-slate-100 font-mono">
            {hours !== null ? `${Math.round(hours)}h` : '—'}
          </div>
          <div className="text-xs text-slate-500 uppercase tracking-wide">
            overdue
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 mt-4 pt-3 border-t border-slate-700/50">
        <a
          href={candidate.notionUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 bg-slate-700/50 hover:bg-slate-700 rounded transition-colors"
        >
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M4 4.5A1.5 1.5 0 0 1 5.5 3h13A1.5 1.5 0 0 1 20 4.5v15a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 19.5v-15zm2 0v2h2v-2H6zm4 0v2h8v-2h-8zm-4 4v2h2v-2H6zm4 0v2h8v-2h-8zm-4 4v2h2v-2H6zm4 0v2h8v-2h-8z"/>
          </svg>
          Open in Notion
        </a>
        
        {candidate.linkedinProfile && (
          <button
            onClick={handleCopyLinkedIn}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium text-sky-300 bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/30 rounded transition-colors"
            title="Copy LinkedIn URL"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
            </svg>
            Copy
          </button>
        )}
      </div>

      {(candidate.aiScore !== null || candidate.humanScore !== null) && (
        <div className="flex gap-4 mt-3 pt-3 border-t border-slate-700/30 text-xs text-slate-400">
          {candidate.aiScore !== null && (
            <span>AI: <span className="text-slate-200 font-medium">{candidate.aiScore}</span></span>
          )}
          {candidate.humanScore !== null && (
            <span>Human: <span className="text-slate-200 font-medium">{candidate.humanScore}</span></span>
          )}
        </div>
      )}
    </div>
  );
}

