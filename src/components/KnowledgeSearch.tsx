import React, { useState } from 'react';
import type { KnowledgeBankItem } from '';
import { BankIcon, CustomerProfileIcon, ProblemIcon, ChevronDownIcon } from '';

interface KnowledgeSearchProps {
    approvedSummaries: KnowledgeBankItem[];
}

const BankItem: React.FC<{ item: KnowledgeBankItem }> = ({ item }) => {
    const [isOpen, setIsOpen] = useState(false);
    const { summary } = item;

    return (
        <div className="bg-white rounded-lg shadow-sm border border-slate-200/80">
            <button 
                className="w-full flex justify-between items-center p-4 text-left"
                onClick={() => setIsOpen(!isOpen)}
                aria-expanded={isOpen}
            >
                <div className="flex items-center gap-4">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                        <CustomerProfileIcon />
                    </div>
                    <div>
                        <p className="font-semibold text-slate-800">{summary.customerProfile.name}</p>
                        <p className="text-sm text-slate-500">{summary.problem}</p>
                    </div>
                </div>
                <ChevronDownIcon className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>
            {isOpen && (
                <div className="p-4 border-t border-slate-200/80">
                    <div className="space-y-3 text-sm">
                        <div>
                            <h4 className="font-semibold text-slate-700">Product</h4>
                            <p className="text-slate-600 whitespace-pre-wrap">{summary.productInformation}</p>
                        </div>
                        <div>
                            <h4 className="font-semibold text-slate-700">Solution</h4>
                            <p className="text-slate-600 whitespace-pre-wrap">{summary.solution}</p>
                        </div>
                         <div>
                            <h4 className="font-semibold text-slate-700">Resolution</h4>
                            <p className="text-slate-600 whitespace-pre-wrap">{summary.resolution}</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const KnowledgeSearch: React.FC<KnowledgeSearchProps> = ({ approvedSummaries }) => {
    return (
        <div className="bg-white p-6 rounded-xl shadow-lg border border-slate-200/80">
            <div className="flex items-center gap-4 mb-4">
                <BankIcon />
                <div>
                    <h2 className="text-2xl font-bold text-slate-900">Knowledge Bank</h2>
                    <p className="text-slate-600">
                        {approvedSummaries.length} approved entr{approvedSummaries.length === 1 ? 'y' : 'ies'}.
                    </p>
                </div>
            </div>

            {approvedSummaries.length > 0 ? (
                <div className="space-y-3">
                    {approvedSummaries.map((item) => (
                        <BankItem key={item.id} item={item} />
                    ))}
                </div>
            ) : (
                <div className="text-center py-16 px-4">
                    <p className="text-slate-500 font-semibold">The knowledge bank is empty.</p>
                    <p className="text-sm text-slate-400 mt-1">Approve summaries to add them here.</p>
                </div>
            )}
        </div>
    );
};

export default KnowledgeSearch;
