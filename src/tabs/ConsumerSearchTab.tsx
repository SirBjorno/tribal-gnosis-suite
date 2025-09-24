import React, { useState } from 'react';
import type { KnowledgeBankItem, KnowledgeSearchResults } from '../types';
import { searchPublicSolutions } from '../services/apiService';
import { ConsumerIcon, SearchIcon } from '../components/Icons';
import Loader from '../components/Loader';
import ErrorMessage from '../components/ErrorMessage';
import SearchResults from '../components/SearchResults';

interface ConsumerSearchTabProps {
  knowledgeBank: KnowledgeBankItem[];
}

const ConsumerSearchTab: React.FC<ConsumerSearchTabProps> = ({ knowledgeBank }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<KnowledgeSearchResults>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

   React.useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || !isOnline) {
       if (!isOnline) setError("Search requires an internet connection.");
      return;
    }
    setIsLoading(true);
    setError(null);
    setResults([]);
    setHasSearched(true);
    try {
      const searchResults = await searchPublicSolutions(query, knowledgeBank);
      setResults(searchResults);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown search error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="bg-white p-6 rounded-xl shadow-lg border border-slate-200/80 text-center">
        <div className="flex items-center justify-center gap-3 mb-2">
            <ConsumerIcon className="w-8 h-8 text-slate-500" />
            <h2 className="text-2xl font-bold text-slate-900">Find a Solution</h2>
        </div>
        <p className="text-slate-600 mb-6">
            Describe your problem below to search our knowledge base for a solution.
        </p>
        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-2">
           <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="e.g., 'My internet is slow' or 'dispute a charge'"
              disabled={knowledgeBank.length === 0 || !isOnline}
              className="flex-grow p-3 border border-slate-300 rounded-md focus:ring-2 focus:ring-sky-500 focus:border-sky-500 disabled:bg-slate-100 transition-shadow"
           />
           <button
                type="submit"
                disabled={isLoading || knowledgeBank.length === 0 || !isOnline}
                title={!isOnline ? "Cannot search: internet is offline" : (knowledgeBank.length === 0 ? "Knowledge base is empty" : "Search for solutions")}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-sky-600 hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 disabled:bg-slate-400 disabled:cursor-not-allowed transition-colors"
            >
                <SearchIcon className="w-5 h-5" /> {isLoading ? 'Searching...' : 'Search'}
           </button>
        </form>
        {!isOnline && <p className="text-sm text-amber-700 mt-2">Internet connection is required to search.</p>}
        {knowledgeBank.length === 0 && <p className="text-sm text-slate-500 mt-2">The knowledge base is currently empty. Please check back later.</p>}
      </div>

      <div className="mt-8">
        {error && <ErrorMessage message={error} />}
        {isLoading && <Loader text="Searching for solutions..." />}
        {hasSearched && !isLoading && <SearchResults results={results} />}
      </div>
    </div>
  );
};

export default ConsumerSearchTab;
