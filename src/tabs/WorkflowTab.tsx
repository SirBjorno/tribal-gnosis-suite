import React, { useState, useEffect } from 'react';
import type { Analysis, ReviewItem, KnowledgeBankItem, DetailedTranscript } from '../types';
import { analyzeTranscript, addKnowledgeBankItemToCloud } from '../services/apiService';
import TranscriptInput from '../components/TranscriptInput';
import AnalysisOutput from '../components/AnalysisOutput';
import KnowledgeSearch from '../components/KnowledgeSearch';
import ErrorMessage from '../components/ErrorMessage';

interface WorkflowTabProps {
  knowledgeBank: KnowledgeBankItem[];
  setKnowledgeBank: React.Dispatch<React.SetStateAction<KnowledgeBankItem[]>>;
  reviewItems: ReviewItem[];
  setReviewItems: React.Dispatch<React.SetStateAction<ReviewItem[]>>;
  tenantId: string;
}

const WorkflowTab: React.FC<WorkflowTabProps> = ({ knowledgeBank, setKnowledgeBank, reviewItems, setReviewItems, tenantId }) => {
  const [selectedItem, setSelectedItem] = useState<ReviewItem | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleApproveTranscript = async (item: ReviewItem, editedTranscript: DetailedTranscript) => {
    setError(null);
    setIsProcessing(true);
    // First, update the item with the edited transcript and set status to summarizing
    setReviewItems(prev => prev.map(i => i.id === item.id ? { ...i, status: 'summarizing', detailedTranscript: editedTranscript } : i));
    setSelectedItem(null);

    try {
      // Concatenate the *edited* dialogue to form a single transcript string
      const fullTranscript = editedTranscript.dialogue
        .map(d => `${d.speaker}: ${d.text}`)
        .join('\n');
      
      const summary = await analyzeTranscript(fullTranscript);
      // Update the item with the new summary and set status to pending_summary
      setReviewItems(prev => prev.map(i => i.id === item.id ? { ...i, status: 'pending_summary', summary } : i));
    } catch (err) {
      setError("Failed to summarize the transcript. Please try again.");
      // Revert status on failure
      setReviewItems(prev => prev.map(i => i.id === item.id ? { ...i, status: 'pending_transcript' } : i));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleApproveSummary = async (item: ReviewItem, editedSummary: Analysis) => {
    const newKnowledgeBankEntry: KnowledgeBankItem = {
      id: item.id,
      audioUrl: item.audioUrl,
      detailedTranscript: item.detailedTranscript,
      summary: editedSummary,
    };
    
    // Optimistic UI Update: Update the local state immediately for a fast UX.
    setKnowledgeBank(prev => [...prev, newKnowledgeBankEntry]);
    setReviewItems(prev => prev.map(i => i.id === item.id ? { ...i, status: 'approved', summary: editedSummary } : i));
    setSelectedItem(null);

    // Asynchronously save the new entry to the backend.
    try {
      await addKnowledgeBankItemToCloud(tenantId, newKnowledgeBankEntry);
      console.log("Successfully saved new knowledge item to the cloud.");
    } catch (err) {
      setError("Failed to save the approved summary to the cloud. It is saved locally for this session, please sync later.");
      // In a real app, you might add a flag to the item indicating it needs to be synced.
    }
  };
  
  const handleReject = (item: ReviewItem) => {
    setReviewItems(prev => prev.map(i => i.id === item.id ? { ...i, status: 'rejected' } : i));
    setSelectedItem(null);
  };
  
  return (
    <div className="space-y-8">
      {error && <ErrorMessage message={error} />}
      <TranscriptInput items={reviewItems} onSelectItem={setSelectedItem} isProcessing={isProcessing} />
      <KnowledgeSearch approvedSummaries={knowledgeBank} />
      
      {selectedItem && (
        <AnalysisOutput
          item={selectedItem}
          onClose={() => setSelectedItem(null)}
          onApproveTranscript={handleApproveTranscript}
          onApproveSummary={handleApproveSummary}
          onReject={handleReject}
          isOnline={isOnline}
        />
      )}
    </div>
  );
};

export default WorkflowTab;
