import React from 'react';
import type { KnowledgeSearchResults, CommonSolution } from '../types';
import { LightbulbIcon, PuzzleIcon } from './Icons';

interface SearchResultsProps {
  results: KnowledgeSearchResults;
}

const SolutionCard: React.FC<{ item: CommonSolution }> = ({ item }) => (
  <div className="p-1">
    <div className="flex items-start gap-4">
      <div className="flex-shrink-0 w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 mt-1">
        <LightbulbIcon className="w-6 h-6" />
      </div>
      <div>
        <h4 className="text-lg font-semibold text-slate-800">{item.solution}</h4>
        <p className="text-slate-600 whitespace-pre-wrap leading-relaxed">{item.description}</p>
      </div>
    </div>
  </div>
);

const SearchResults: React.FC<SearchResultsProps> = ({ results }) => {
  if (results.length === 0) {
    return (
      <div className="bg-white p-6 rounded-xl shadow-lg border border-slate-200/80 text-center animate-content-fade-in">
        <div className="mx-auto bg-slate-100 rounded-full w-16 h-16 flex items-center justify-center">
          <PuzzleIcon />
        </div>
        <h3 className="text-xl font-bold text-slate-900 mt-4">No Solutions Found</h3>
        <p className="text-slate-600 mt-1">
          Your search returned no results. Please try a different or more general query.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 md:p-8 rounded-xl shadow-lg border border-slate-200/80 animate-content-fade-in">
      <h3 className="text-2xl font-bold text-slate-900 mb-6 border-b pb-4 border-slate-200/80">
        Common Solutions
      </h3>
      <div className="space-y-6">
        {results.map((item, index) => (
          <SolutionCard key={index} item={item} />
        ))}
      </div>
    </div>
  );
};

export default SearchResults;
