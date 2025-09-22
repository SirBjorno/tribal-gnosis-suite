import React, { useState } from 'react';
import type { ReviewItem, Analysis, DialogueEntry, DetailedTranscript, CustomerProfile } from '';
import { ApproveIcon, RejectIcon, CompareIcon, CloseIcon, ProblemIcon, LightbulbIcon, CustomerProfileIcon } from '';

interface AnalysisOutputProps {
  item: ReviewItem;
  onClose: () => void;
  onApproveTranscript: (item: ReviewItem, editedTranscript: DetailedTranscript) => void;
  onApproveSummary: (item: ReviewItem, editedSummary: Analysis) => void;
  onReject: (item: ReviewItem) => void;
  isOnline: boolean;
}

const EditableSummaryField: React.FC<{ label: string; value: string; onChange: (value: string) => void; icon: React.ReactNode; isTextarea?: boolean }> = ({ label, value, onChange, icon, isTextarea = false }) => (
    <div className="flex items-start gap-3">
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 mt-1">{icon}</div>
        <div className="flex-1">
            <label className="block text-sm font-bold text-slate-800 mb-1">{label}</label>
            {isTextarea ? (
                <textarea
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-shadow text-sm"
                    rows={3}
                />
            ) : (
                <input
                    type="text"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-shadow text-sm"
                />
            )}
        </div>
    </div>
);

const SummaryEditor: React.FC<{ summary: Analysis; onSummaryChange: (newSummary: Analysis) => void; }> = ({ summary, onSummaryChange }) => {
    const handleChange = (field: keyof Analysis | keyof CustomerProfile, value: string) => {
        if (field === 'name' || field === 'accountNumber') {
            onSummaryChange({ ...summary, customerProfile: { ...summary.customerProfile, [field]: value }});
        } else {
            onSummaryChange({ ...summary, [field]: value });
        }
    };

    return (
        <div className="space-y-4">
            <EditableSummaryField label="Customer Name" value={summary.customerProfile.name} onChange={val => handleChange('name', val)} icon={<CustomerProfileIcon />} />
            <EditableSummaryField label="Account Number" value={summary.customerProfile.accountNumber} onChange={val => handleChange('accountNumber', val)} icon={<CustomerProfileIcon />} />
            <EditableSummaryField label="Product Information" value={summary.productInformation} onChange={val => handleChange('productInformation', val)} icon={<LightbulbIcon />} />
            <EditableSummaryField label="Problem" value={summary.problem} onChange={val => handleChange('problem', val)} icon={<ProblemIcon />} isTextarea />
            <EditableSummaryField label="Solution" value={summary.solution} onChange={val => handleChange('solution', val)} icon={<LightbulbIcon />} isTextarea />
            <EditableSummaryField label="Resolution" value={summary.resolution} onChange={val => handleChange('resolution', val)} icon={<ApproveIcon />} isTextarea />
        </div>
    );
};


const EditableDialogueLine: React.FC<{ entry: DialogueEntry; onTextChange: (newText: string) => void; }> = ({ entry, onTextChange }) => {
    const isAgent = entry.speaker === 'Agent';
    return (
        <div className={`flex gap-3 text-sm p-2.5 rounded-md ${isAgent ? 'bg-sky-50/70' : 'bg-slate-50/70'}`}>
            <div className="font-mono text-slate-400 text-xs pt-2.5">{entry.timestamp}</div>
            <div className="flex-1">
                <p className={`font-semibold ${isAgent ? 'text-sky-800' : 'text-slate-800'}`}>{entry.speaker}</p>
                <textarea
                    value={entry.text}
                    onChange={(e) => onTextChange(e.target.value)}
                    className="w-full p-1.5 border border-slate-300 rounded-md focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-shadow text-slate-700 leading-relaxed bg-white"
                    rows={2}
                />
            </div>
        </div>
    );
};

const TranscriptEditor: React.FC<{ transcript: DetailedTranscript; onTranscriptChange: (newTranscript: DetailedTranscript) => void; audioUrl: string | null; }> = ({ transcript, onTranscriptChange, audioUrl }) => {
    const confidenceColor = transcript.confidenceScore > 0.9 ? 'text-green-600' : 'text-amber-600';

    const handleDialogueChange = (index: number, newText: string) => {
        const newDialogue = [...transcript.dialogue];
        newDialogue[index] = { ...newDialogue[index], text: newText };
        onTranscriptChange({ ...transcript, dialogue: newDialogue });
    };

    return (
        <div>
            {audioUrl && (
                <div className="mb-4">
                    <h3 className="text-lg font-semibold text-slate-800 mb-2">Audio Player</h3>
                    <audio controls src={audioUrl} className="w-full">
                        Your browser does not support the audio element.
                    </audio>
                </div>
            )}
            <div className="flex justify-between items-center mb-2">
                <h3 className="text-lg font-semibold text-slate-800">Edit Transcript</h3>
                <p className="text-sm font-medium text-slate-600">
                    Confidence: <span className={`font-bold ${confidenceColor}`}>{(transcript.confidenceScore * 100).toFixed(0)}%</span>
                </p>
            </div>
            <div className="bg-white p-3 border border-slate-200/80 rounded-md max-h-[50vh] overflow-y-auto space-y-2">
                {transcript.dialogue.map((entry, index) => (
                    <EditableDialogueLine key={index} entry={entry} onTextChange={(newText) => handleDialogueChange(index, newText)} />
                ))}
            </div>
        </div>
    );
};


const AnalysisOutput: React.FC<AnalysisOutputProps> = ({ item, onClose, onApproveTranscript, onApproveSummary, onReject, isOnline }) => {
  const [editedTranscript, setEditedTranscript] = useState<DetailedTranscript>(() => JSON.parse(JSON.stringify(item.detailedTranscript)));
  const [editedSummary, setEditedSummary] = useState<Analysis | null>(() => item.summary ? JSON.parse(JSON.stringify(item.summary)) : null);

  const handleApprove = () => {
    if (item.status === 'pending_transcript') {
      onApproveTranscript(item, editedTranscript);
    } else if (item.status === 'pending_summary' && editedSummary) {
      onApproveSummary(item, editedSummary);
    }
  };

  const isTranscriptReview = item.status === 'pending_transcript';
  const isSummaryReview = item.status === 'pending_summary';
  const isApproveDisabled = isTranscriptReview && !isOnline;
  
  return (
    <div 
      className="fixed inset-0 bg-black/60 z-50 flex justify-center items-center p-4 animate-fade-in-fast"
      onClick={onClose}
    >
      <div 
        className="bg-slate-50 rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col border border-slate-200/80"
        onClick={e => e.stopPropagation()}
      >
        <header className="flex justify-between items-center p-4 border-b border-slate-200/80">
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              {isTranscriptReview ? 'Review & Edit Transcript' : 'Review & Edit Summary'}
            </h2>
            <p className="text-sm text-slate-500">{item.id}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-full text-slate-500 hover:bg-slate-200 transition-colors">
            <CloseIcon />
          </button>
        </header>
        
        <main className="p-6 overflow-y-auto flex-grow">
          {isTranscriptReview && (
            <TranscriptEditor transcript={editedTranscript} onTranscriptChange={setEditedTranscript} audioUrl={item.audioUrl} />
          )}
          
          {isSummaryReview && editedSummary && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-semibold text-slate-800 mb-2">Final Transcript</h3>
                <div className="bg-white p-4 border border-slate-200/80 rounded-md h-[60vh] overflow-y-auto">
                   <div className="space-y-2">
                     {item.detailedTranscript.dialogue.map((entry, index) => (
                        <p key={index} className="text-slate-700 font-mono text-xs">
                          <span className="font-semibold">{entry.speaker}:</span> {entry.text}
                        </p>
                     ))}
                   </div>
                </div>
              </div>
              <div>
                <h3 className="flex items-center gap-2 text-lg font-semibold text-slate-800 mb-2">
                    <CompareIcon /> Edit AI Summary
                </h3>
                <div className="bg-white p-4 border border-slate-200/80 rounded-md h-[60vh] overflow-y-auto">
                    <SummaryEditor summary={editedSummary} onSummaryChange={setEditedSummary} />
                </div>
              </div>
            </div>
          )}
        </main>
        
        <footer className="flex justify-between items-center p-4 bg-slate-100 border-t border-slate-200/80 rounded-b-xl">
          <div className="text-sm">
            {isApproveDisabled && <p className="text-amber-700">Internet connection is required to approve & summarize.</p>}
          </div>
          <div className="flex gap-3">
            <button
                onClick={() => onReject(item)}
                className="inline-flex items-center justify-center gap-2 px-5 py-2 border border-slate-300 text-sm font-semibold rounded-md shadow-sm text-slate-700 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 transition-colors"
            >
                <RejectIcon /> Reject
            </button>
            <button
                onClick={handleApprove}
                disabled={isApproveDisabled}
                title={isApproveDisabled ? "Cannot approve: internet is offline" : ""}
                className="inline-flex items-center justify-center gap-2 px-5 py-2 border border-transparent text-sm font-semibold rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:bg-slate-400 disabled:cursor-not-allowed transition-colors"
            >
                <ApproveIcon /> {isTranscriptReview ? 'Approve & Summarize' : 'Approve Summary'}
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
};

const style = document.createElement('style');
style.innerHTML = `
@keyframes fadeInFast {
  from { opacity: 0; transform: scale(0.98); }
  to { opacity: 1; transform: scale(1); }
}
.animate-fade-in-fast {
  animation: fadeInFast 0.2s ease-out forwards;
}
`;
document.head.appendChild(style);


export default AnalysisOutput;
