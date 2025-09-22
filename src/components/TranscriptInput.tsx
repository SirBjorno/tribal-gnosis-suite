import React from 'react';
import type { ReviewItem, ReviewStatus } from '';
import { QueueIcon, ProcessingIcon, ApproveIcon, RejectIcon } from '';

interface TranscriptInputProps {
  items: ReviewItem[];
  onSelectItem: (item: ReviewItem) => void;
  isProcessing: boolean;
}

const statusConfig: Record<ReviewStatus, { text: string; color: string; icon?: React.ReactNode }> = {
    pending_transcript: { text: 'Pending Review', color: 'bg-blue-100 text-blue-800' },
    summarizing: { text: 'Summarizing...', color: 'bg-purple-100 text-purple-800', icon: <ProcessingIcon /> },
    pending_summary: { text: 'Pending Approval', color: 'bg-amber-100 text-amber-800' },
    approved: { text: 'Approved', color: 'bg-green-100 text-green-800', icon: <ApproveIcon /> },
    rejected: { text: 'Rejected', color: 'bg-red-100 text-red-800', icon: <RejectIcon /> },
};


const Ticket: React.FC<{ item: ReviewItem; onSelect: () => void; }> = ({ item, onSelect }) => {
    const config = statusConfig[item.status];
    const isActionable = item.status === 'pending_transcript' || item.status === 'pending_summary';
    
    return (
        <li className="p-4 bg-white rounded-lg shadow-sm border border-slate-200/80 hover:shadow-md hover:border-sky-300 transition-all duration-200">
            <div className="flex justify-between items-center">
                <div>
                    <p className="font-semibold text-slate-800 truncate">{item.id.replace(/_/g, ' ')}</p>
                    <div className={`inline-flex items-center gap-1.5 mt-1 text-xs font-medium px-2 py-0.5 rounded-full ${config.color}`}>
                       {config.icon} {config.text}
                    </div>
                </div>
                {isActionable && (
                    <button 
                        onClick={onSelect}
                        className="px-4 py-2 text-sm font-semibold text-sky-700 bg-sky-100 rounded-md hover:bg-sky-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 transition-colors"
                    >
                        Review
                    </button>
                )}
            </div>
        </li>
    );
};

const ReviewQueue: React.FC<{ title: string; items: ReviewItem[]; onSelectItem: (item: ReviewItem) => void; }> = ({ title, items, onSelectItem }) => (
    <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-200/80 flex-1 min-w-[300px]">
        <div className="flex items-center gap-3 mb-4 px-2">
            <QueueIcon />
            <h2 className="text-xl font-bold text-slate-800">{title}</h2>
            <span className="text-sm font-bold bg-slate-200 text-slate-600 w-6 h-6 flex items-center justify-center rounded-full">{items.length}</span>
        </div>
        {items.length > 0 ? (
            <ul className="space-y-3">
                {items.map(item => <Ticket key={item.id} item={item} onSelect={() => onSelectItem(item)} />)}
            </ul>
        ) : (
            <div className="text-center py-12 px-4">
                <p className="text-slate-500">The queue is empty.</p>
            </div>
        )}
    </div>
);

const TranscriptInput: React.FC<TranscriptInputProps> = ({ items, onSelectItem, isProcessing }) => {
  const transcriptsForReview = items.filter(i => i.status === 'pending_transcript' || (i.status === 'summarizing' && isProcessing));
  const summariesForApproval = items.filter(i => i.status === 'pending_summary');

  return (
    <div className={`bg-white p-6 rounded-xl shadow-lg border border-slate-200/80 mb-8 transition-opacity duration-300`}>
        <div className="flex flex-col lg:flex-row gap-6">
            <ReviewQueue title="Transcripts for Review" items={transcriptsForReview} onSelectItem={onSelectItem} />
            <ReviewQueue title="Summaries for Approval" items={summariesForApproval} onSelectItem={onSelectItem} />
        </div>
    </div>
  );
};

export default TranscriptInput;
