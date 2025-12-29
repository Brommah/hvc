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
  const urgencyBorder = hours !== null && hours > 48 
    ? 'border-l-red-500' 
    : hours !== null && hours > 24 
      ? 'border-l-amber-500' 
      : 'border-l-green-500';

  const handleCopyLinkedIn = async () => {
    if (candidate.linkedinProfile) {
      await navigator.clipboard.writeText(candidate.linkedinProfile);
    }
  };

  return (
    <div className={`bg-white border border-gray-200 p-4 border-l-4 ${urgencyBorder} hover:shadow-sm transition-shadow`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-sm font-semibold text-gray-900 truncate">
              {candidate.name}
            </h3>
            {candidate.hotCandidate && (
              <span className="text-sm" title="Hot Candidate">🔥</span>
            )}
          </div>
          
          <p className="text-xs text-gray-500 mt-0.5 truncate">
            {candidate.role || 'No role specified'}
          </p>
          <p className="text-xs text-gray-400 mt-1">
            Applied: {formatDate(candidate.dateAdded)}
          </p>
          
          <div className="flex flex-wrap gap-1 mt-2">
            <StatusBadge status={candidate.status} />
            {candidate.priority && (
              <StatusBadge status={candidate.priority} variant="priority" />
            )}
          </div>
        </div>

        <div className="text-right shrink-0">
          <div className={`text-xl font-semibold ${hours !== null && hours > 48 ? 'text-red-600' : hours !== null && hours > 24 ? 'text-amber-600' : 'text-gray-900'}`}>
            {hours !== null ? `${Math.round(hours)}h` : '—'}
          </div>
          <div className="text-xs text-gray-400 uppercase tracking-wide">
            overdue
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 mt-4 pt-3 border-t border-gray-100">
        <a
          href={candidate.notionUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 border border-gray-200 transition-colors"
        >
          Open in Notion
        </a>
        
        {candidate.linkedinProfile && (
          <button
            onClick={handleCopyLinkedIn}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 transition-colors"
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
        <div className="flex gap-4 mt-3 pt-3 border-t border-gray-100 text-xs text-gray-500">
          {candidate.aiScore !== null && (
            <span>AI: <span className="text-gray-900 font-medium">{candidate.aiScore}</span></span>
          )}
          {candidate.humanScore !== null && (
            <span>Human: <span className="text-gray-900 font-medium">{candidate.humanScore}</span></span>
          )}
        </div>
      )}
    </div>
  );
}
