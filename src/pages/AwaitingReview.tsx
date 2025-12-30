import { useState, useEffect } from 'react';

interface Candidate {
  id: string;
  name: string;
  role: string | null;
  aiScore: number | null;
  dateAdded: string | null;
  notionUrl: string;
}

export function AwaitingReviewPage() {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'hvc'>('hvc');

  useEffect(() => {
    async function fetch() {
      setLoading(true);
      try {
        const response = await window.fetch('/api/awaiting-review');
        const data = await response.json();
        if (data.success) {
          setCandidates(data.data);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    fetch();
  }, []);

  const filtered = filter === 'hvc' 
    ? candidates.filter(c => c.aiScore !== null && c.aiScore >= 7)
    : candidates;

  const formatDate = (d: string | null) => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-gray-100 px-8 py-6">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Awaiting Review</h1>
            <p className="text-sm text-gray-400 mt-1">
              Candidates without CV Verified by Lynn
            </p>
          </div>
          <div className="flex items-center gap-4">
            <a href="/ceo" className="text-sm text-gray-400 hover:text-gray-900">← CEO Insights</a>
            <a href="/" className="text-sm text-gray-400 hover:text-gray-900">Dashboard</a>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-8 py-8">
        {/* Filter Toggle */}
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => setFilter('hvc')}
            className={`px-4 py-2 text-sm border ${filter === 'hvc' ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-600 border-gray-200'}`}
          >
            HVCs Only (AI ≥ 7)
          </button>
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 text-sm border ${filter === 'all' ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-600 border-gray-200'}`}
          >
            All Candidates
          </button>
          <span className="text-sm text-gray-400 ml-4">
            Showing {filtered.length} candidates
          </span>
        </div>

        {loading ? (
          <div className="text-gray-400 py-12 text-center">Loading...</div>
        ) : (
          <div className="border border-gray-100">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase px-4 py-3">Name</th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase px-4 py-3">Role</th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase px-4 py-3">AI Score</th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase px-4 py-3">Added</th>
                  <th className="text-right text-xs font-medium text-gray-500 uppercase px-4 py-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-900 font-medium">{c.name}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{c.role || '—'}</td>
                    <td className="px-4 py-3 text-sm">
                      {c.aiScore !== null ? (
                        <span className={c.aiScore >= 7 ? 'text-green-600 font-medium' : 'text-gray-400'}>
                          {c.aiScore}
                        </span>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">{formatDate(c.dateAdded)}</td>
                    <td className="px-4 py-3 text-right">
                      <a
                        href={c.notionUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-gray-900 hover:underline"
                      >
                        Review →
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length === 0 && (
              <div className="text-gray-400 py-12 text-center">
                No candidates awaiting review
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

