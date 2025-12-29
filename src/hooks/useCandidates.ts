import { useState, useEffect, useCallback } from 'react';
import type { Candidate, CandidatesResponse } from '../types';

interface UseCandidatesReturn {
  candidates: Candidate[];
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  refetch: () => Promise<void>;
}

/**
 * Hook to fetch and manage high-value candidates data
 * @param autoRefreshInterval - Interval in ms for auto-refresh (default: 5 minutes)
 */
export function useCandidates(autoRefreshInterval = 5 * 60 * 1000): UseCandidatesReturn {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchCandidates = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/candidates');
      const data: CandidatesResponse = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch candidates');
      }
      
      setCandidates(data.data);
      setLastUpdated(new Date(data.timestamp));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCandidates();
    
    const interval = setInterval(fetchCandidates, autoRefreshInterval);
    return () => clearInterval(interval);
  }, [fetchCandidates, autoRefreshInterval]);

  return {
    candidates,
    loading,
    error,
    lastUpdated,
    refetch: fetchCandidates,
  };
}

