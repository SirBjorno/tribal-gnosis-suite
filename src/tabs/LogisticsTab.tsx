import React, { useMemo } from 'react';
import type { KnowledgeBankItem } from '../types';
import { LogisticsIcon, ProblemIcon } from '../components/Icons';

interface LogisticsTabProps {
  knowledgeBank: KnowledgeBankItem[];
}

interface ProblemFrequency {
  problem: string;
  count: number;
}

const LogisticsTab: React.FC<LogisticsTabProps> = ({ knowledgeBank }) => {
  const problemFrequencies = useMemo<ProblemFrequency[]>(() => {
    const frequencyMap: Record<string, number> = {};
    
    knowledgeBank.forEach(item => {
      const problem = item.summary.problem.trim();
      if (problem) {
        frequencyMap[problem] = (frequencyMap[problem] || 0) + 1;
      }
    });

    return Object.entries(frequencyMap)
      .map(([problem, count]) => ({ problem, count }))
      .sort((a, b) => b.count - a.count); // Sort by count descending
  }, [knowledgeBank]);
  
  const totalProblems = problemFrequencies.reduce((sum, item) => sum + item.count, 0);
  const maxCount = Math.max(...problemFrequencies.map(p => p.count), 0);

  return (
    <div className="bg-white p-6 rounded-xl shadow-lg border border-slate-200/80">
      <div className="flex items-center gap-4 mb-6">
        <LogisticsIcon className="h-8 w-8 text-slate-500" />
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Logistics & Problem Trends</h2>
          <p className="text-slate-600">
            Analyzing {totalProblems} logged problems from the knowledge bank.
          </p>
        </div>
      </div>

      {problemFrequencies.length > 0 ? (
        <div className="space-y-4">
          {problemFrequencies.map((item, index) => (
            <div key={index} className="bg-slate-50/70 p-4 rounded-lg border border-slate-200/80">
                <div className="flex justify-between items-center mb-2">
                    <p className="font-semibold text-slate-800">{item.problem}</p>
                    <span className="text-sm font-bold bg-sky-100 text-sky-800 px-2 py-0.5 rounded-full">
                       {item.count} entr{item.count === 1 ? 'y' : 'ies'}
                    </span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-2.5">
                    <div 
                        className="bg-sky-500 h-2.5 rounded-full" 
                        style={{ width: `${maxCount > 0 ? (item.count / maxCount) * 100 : 0}%` }}
                    ></div>
                </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-16 px-4">
          <p className="text-slate-500 font-semibold">No problem data to analyze.</p>
          <p className="text-sm text-slate-400 mt-1">Approve summaries in the Workflow tab to populate this report.</p>
        </div>
      )}
    </div>
  );
};

export default LogisticsTab;
