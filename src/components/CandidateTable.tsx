import { useState, useMemo } from 'react';
import type { Candidate } from '../types';
import { StatusBadge } from './StatusBadge';

interface CandidateTableProps {
  candidates: Candidate[];
}

type SortField = 'hours' | 'name' | 'priority' | 'role' | 'dateAdded';
type SortDirection = 'asc' | 'desc';

const priorityOrder: Record<string, number> = { '1st': 1, '2nd': 2, '3rd': 3 };

/**
 * Format date to a readable string
 */
function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

/**
 * Table component for displaying candidates with sorting
 */
export function CandidateTable({ candidates }: CandidateTableProps) {
  const [sortField, setSortField] = useState<SortField>('hours');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const sortedCandidates = useMemo(() => {
    return [...candidates].sort((a, b) => {
      let comparison = 0;
      
      switch (sortField) {
        case 'hours':
          comparison = (a.hoursSinceLastActivity ?? 0) - (b.hoursSinceLastActivity ?? 0);
          break;
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'priority':
          const aPrio = a.priority ? priorityOrder[a.priority] ?? 99 : 99;
          const bPrio = b.priority ? priorityOrder[b.priority] ?? 99 : 99;
          comparison = aPrio - bPrio;
          break;
        case 'role':
          comparison = (a.role ?? '').localeCompare(b.role ?? '');
          break;
        case 'dateAdded':
          comparison = (a.dateAdded ?? '').localeCompare(b.dateAdded ?? '');
          break;
      }
      
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [candidates, sortField, sortDirection]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const SortHeader = ({ field, children }: { field: SortField; children: React.ReactNode }) => (
    <th
      className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-900 transition-colors select-none"
      onClick={() => handleSort(field)}
    >
      <div className="flex items-center gap-1">
        {children}
        {sortField === field && (
          <svg className={`w-3 h-3 transition-transform ${sortDirection === 'asc' ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        )}
      </div>
    </th>
  );

  const getUrgencyClass = (hours: number | null): string => {
    if (hours === null) return 'text-gray-400';
    if (hours > 72) return 'text-red-600 font-bold';
    if (hours > 48) return 'text-red-500 font-semibold';
    if (hours > 24) return 'text-amber-500';
    return 'text-green-500';
  };

  const handleCopyLinkedIn = async (url: string) => {
    await navigator.clipboard.writeText(url);
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr>
            <SortHeader field="name">Candidate</SortHeader>
            <SortHeader field="role">Role</SortHeader>
            <SortHeader field="dateAdded">Applied</SortHeader>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
            <SortHeader field="priority">Priority</SortHeader>
            <SortHeader field="hours">Hours Overdue</SortHeader>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Scores</th>
            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {sortedCandidates.map((candidate) => (
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
                {formatDate(candidate.dateAdded)}
              </td>
              <td className="px-4 py-3">
                <div className="flex flex-wrap gap-1">
                  <StatusBadge status={candidate.status} />
                  {candidate.interviewStatus && (
                    <StatusBadge status={candidate.interviewStatus} />
                  )}
                </div>
              </td>
              <td className="px-4 py-3">
                <StatusBadge status={candidate.priority} variant="priority" />
              </td>
              <td className="px-4 py-3">
                <span className={`font-medium text-lg ${getUrgencyClass(candidate.hoursSinceLastActivity)}`}>
                  {candidate.hoursSinceLastActivity !== null 
                    ? `${Math.round(candidate.hoursSinceLastActivity)}h`
                    : '—'}
                </span>
              </td>
              <td className="px-4 py-3 text-sm text-gray-500">
                {candidate.aiScore !== null && <span className="mr-3">AI: {candidate.aiScore}</span>}
                {candidate.humanScore !== null && <span>H: {candidate.humanScore}</span>}
                {candidate.aiScore === null && candidate.humanScore === null && '—'}
              </td>
              <td className="px-4 py-3 text-right">
                <div className="flex items-center justify-end gap-2">
                  <a
                    href={candidate.notionUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 text-gray-400 hover:text-gray-900 hover:bg-gray-100 transition-colors"
                    title="Open in Notion"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/>
                    </svg>
                  </a>
                  {candidate.linkedinProfile && (
                    <button
                      onClick={() => handleCopyLinkedIn(candidate.linkedinProfile!)}
                      className="p-1.5 text-blue-500 hover:text-blue-700 hover:bg-blue-50 transition-colors"
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
      
      {sortedCandidates.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <p className="text-lg">No overdue high-value candidates</p>
          <p className="text-sm mt-1">All HVCs have been followed up within 24 hours ✓</p>
        </div>
      )}
    </div>
  );
}
