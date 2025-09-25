import React, { useState, useEffect } from 'react';
import type { Analysis, KnowledgeSearchResults, ReviewItem, LiveCall, Tab } from '../types';
import {
  analyzeTranscript,
  searchSessionSolutions,
  generateDetailedTranscript,
} from '../services/apiService';

import DataManager from '../components/DataManager';
import ErrorMessage from '../components/ErrorMessage';
import Loader from '../components/Loader';
import SearchResults from '../components/SearchResults';
import {
  UploadIcon,
  SearchIcon,
  CustomerProfileIcon,
  ProblemIcon,
  LightbulbIcon,
  MicrophoneIcon,
} from '../components/Icons';
import RealTimeTranscriber from '../components/RealTimeTranscriber';

// Sub-component for displaying analysis
const AnalysisDisplay: React.FC<{ analysis: Analysis }> = ({ analysis }) => (
  <div className="space-y-6">
    <div className="flex items-start gap-4">
      <div className="flex-shrink-0 w-10 h-10 rounded-full bg-sky-100 flex items-center justify-center text-sky-600 mt-1">
        <CustomerProfileIcon className="w-6 h-6" />
      </div>
      <div>
        <h3 className="text-lg font-semibold text-slate-800">Customer Profile</h3>
        <p className="text-slate-600">Name: {analysis.customerProfile.name}</p>
        <p className="text-slate-600">Account: {analysis.customerProfile.accountNumber}</p>
      </div>
    </div>
    <div className="flex items-start gap-4">
      <div className="flex-shrink-0 w-10 h-10 rounded-full bg-red-100 flex items-center justify-center text-red-600 mt-1">
        <ProblemIcon className="w-6 h-6" />
      </div>
      <div>
        <h3 className="text-lg font-semibold text-slate-800">Problem</h3>
        <p className="text-slate-600">{analysis.problem}</p>
      </div>
    </div>
    <div className="flex items-start gap-4">
      <div className="flex-shrink-0 w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-green-600 mt-1">
        <LightbulbIcon className="w-6 h-6" />
      </div>
      <div>
        <h3 className="text-lg font-semibold text-slate-800">Solution & Resolution</h3>
        <p className="text-slate-600">
          <span className="font-semibold">Action Taken:</span> {analysis.solution}
        </p>
        <p className="text-slate-600">
          <span className="font-semibold">Outcome:</span> {analysis.resolution}
        </p>
      </div>
    </div>
  </div>
);

// New component for Audio Processing
const AudioProcessor: React.FC<{
  onProcess: (file: File) => void;
  isTranscribing: boolean;
  isOnline: boolean;
}> = ({ onProcess, isTranscribing, isOnline }) => {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };
  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('audio/')) {
      onProcess(file);
    }
  };

  const handleClick = () => fileInputRef.current?.click();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('audio/')) {
      onProcess(file);
    }
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-lg border border-slate-200/80">
      <div
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={handleClick}
        className={`relative bg-slate-50 p-6 rounded-lg border-2 ${isDragging ? 'border-sky-500 ring-2 ring-sky-200' : 'border-dashed border-slate-300'} transition-all cursor-pointer hover:border-sky-400`}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept="audio/*"
          className="hidden"
        />
        <div className="flex items-center gap-4 mb-3 pointer-events-none">
          <MicrophoneIcon />
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Process Audio Call</h2>
            <p className="text-sm text-slate-500">Submit an audio file to the review workflow.</p>
          </div>
        </div>
        {isTranscribing ? (
          <Loader text="Processing job started..." />
        ) : (
          <div className="text-center py-6 pointer-events-none">
            <UploadIcon className="mx-auto h-12 w-12 text-slate-400" />
            <p className="mt-2 text-sm font-semibold text-slate-700">
              Drag & drop or click to upload
            </p>
            <p className="text-xs text-slate-500">(MP3, WAV, etc)</p>
            {!isOnline && (
              <p className="text-xs text-amber-600 mt-2">
                Internet connection required for processing.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// Main Tab Component
interface AnalyzerTabProps {
  setReviewItems: React.Dispatch<React.SetStateAction<ReviewItem[]>>;
  setActiveTab: (tab: Tab) => void;
  tenantId: string;
  liveCall: LiveCall | null;
  setLiveCall: React.Dispatch<React.SetStateAction<LiveCall | null>>;
}

const AnalyzerTab: React.FC<AnalyzerTabProps> = ({
  setReviewItems,
  setActiveTab,
  tenantId,
  liveCall,
  setLiveCall,
}) => {
  const [transcript, setTranscript] = useState('');
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  const [sessionKnowledgeBank, setSessionKnowledgeBank] = useState<Analysis[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<KnowledgeSearchResults>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const [isTranscribing, setIsTranscribing] = useState(false);

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

  const handleAudioProcess = (file: File) => {
    if (!isOnline) {
      setError('Audio processing requires an internet connection.');
      return;
    }
    setError(null);
    setIsTranscribing(true); // Show loader briefly

    // 1. Create a unique ID and a placeholder item
    const placeholderId = `log_${Date.now()}`;
    const audioUrl = URL.createObjectURL(file);
    const placeholderItem: ReviewItem = {
      id: placeholderId,
      audioUrl,
      status: 'summarizing', // This status has a spinner icon, indicating processing
      detailedTranscript: {
        confidenceScore: 0,
        dialogue: [{ speaker: 'Unknown', timestamp: '00:00', text: `Processing ${file.name}...` }],
      },
      summary: null,
    };

    // 2. Add placeholder to the main review queue and navigate immediately for a non-blocking UX
    setReviewItems((prev) => [placeholderItem, ...prev]);
    setActiveTab('workflow');

    // Reset local state after a short delay
    setTimeout(() => setIsTranscribing(false), 500);

    // 3. Start the "background" API call to generate the detailed transcript
    const simulatedRawTranscript = `(Transcript from ${file.name})\nAgent: Hello, this is Tech Support, how can I help?\nCustomer: Hi, I'm calling because my new smart thermostat isn't connecting to my Wi-Fi. My name is John Doe, account number is 555-9876.\nAgent: I can definitely help with that, Mr. Doe. Let's walk through the setup process again.`;

    generateDetailedTranscript(simulatedRawTranscript)
      .then((detailedTranscript) => {
        // 4. On success, find the placeholder and update it with the real data
        const finalReviewItem: ReviewItem = {
          ...placeholderItem,
          detailedTranscript,
          status: 'pending_transcript',
        };
        setReviewItems((prev) =>
          prev.map((item) => (item.id === placeholderId ? finalReviewItem : item))
        );
      })
      .catch((err) => {
        // 5. On failure, update the placeholder to show an error status
        console.error(err);
        const errorItem: ReviewItem = {
          ...placeholderItem,
          status: 'rejected',
          detailedTranscript: {
            ...placeholderItem.detailedTranscript,
            dialogue: [
              {
                speaker: 'Unknown',
                timestamp: '00:00',
                text: `Failed to process ${file.name}. Please try again.`,
              },
            ],
          },
        };
        setReviewItems((prev) =>
          prev.map((item) => (item.id === placeholderId ? errorItem : item))
        );
      });
  };

  const handleAnalyze = async () => {
    if (!transcript.trim() || !isOnline) {
      if (!isOnline) setError('Analysis requires an internet connection.');
      return;
    }
    setIsLoading(true);
    setError(null);
    setAnalysis(null);
    try {
      const result = await analyzeTranscript(transcript);
      setAnalysis(result);
      setSessionKnowledgeBank((prev) => [...prev, result]);
      if (liveCall) {
        setLiveCall(null); // End the live call session after analysis
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim() || !isOnline) {
      if (!isOnline) setSearchError('Search requires an internet connection.');
      return;
    }
    setIsSearching(true);
    setSearchError(null);
    setSearchResults([]);
    try {
      const results = await searchSessionSolutions(searchQuery, sessionKnowledgeBank);
      setSearchResults(results);
    } catch (err) {
      setSearchError(err instanceof Error ? err.message : 'An unknown search error occurred.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleExport = () => {
    const blob = new Blob([JSON.stringify(sessionKnowledgeBank, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${tenantId}_session_knowledge_bank_${new Date().toISOString()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = JSON.parse(e.target?.result as string);
        if (
          Array.isArray(content) &&
          content.every((item) => 'problem' in item && 'solution' in item)
        ) {
          setSessionKnowledgeBank(content);
        } else {
          throw new Error('Invalid file format.');
        }
      } catch (err) {
        setError('Failed to import file. Make sure it is a valid JSON export.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-8">
      {error && <ErrorMessage message={error} />}

      {!liveCall && (
        <>
          <AudioProcessor
            onProcess={handleAudioProcess}
            isTranscribing={isTranscribing}
            isOnline={isOnline}
          />
          <hr className="border-slate-200/80" />
          <div className="text-center">
            <h2 className="text-2xl font-bold text-slate-900">Private Session Analyzer</h2>
            <p className="text-slate-500">
              Use this tool for temporary, in-session analysis that is not sent to the workflow.
            </p>
          </div>
        </>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-6">
          <RealTimeTranscriber
            onTranscriptReady={setTranscript}
            onAnalyze={handleAnalyze}
            isAnalyzing={isLoading}
            isOnline={isOnline}
            liveCall={liveCall}
          />
          {!liveCall && (
            <DataManager
              onImport={handleImport}
              onExport={handleExport}
              isOnline={isOnline}
              transcriptCount={sessionKnowledgeBank.length}
            />
          )}
        </div>

        <div className="bg-white p-6 md:p-8 rounded-xl shadow-lg border border-slate-200/80">
          <h2 className="text-2xl font-bold text-slate-900 mb-6">Analysis Results</h2>
          {isLoading && <Loader text="Analyzing..." />}
          {analysis && !isLoading && <AnalysisDisplay analysis={analysis} />}
          {!isLoading && !analysis && (
            <div className="text-center py-16">
              <p className="text-slate-500">Analysis will appear here.</p>
            </div>
          )}
        </div>
      </div>

      {!liveCall && (
        <div className="bg-white p-6 rounded-xl shadow-lg border border-slate-200/80">
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Search Session Knowledge</h2>
          <p className="text-sm text-slate-500 mb-4">
            Find solutions from the <span className="font-bold">{sessionKnowledgeBank.length}</span>{' '}
            transcript{sessionKnowledgeBank.length !== 1 && 's'} analyzed in this session.
          </p>
          <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Enter a customer problem (e.g., 'internet dropping')"
              disabled={sessionKnowledgeBank.length === 0 || !isOnline}
              className="flex-grow p-3 border border-slate-300 rounded-md focus:ring-2 focus:ring-sky-500 focus:border-sky-500 disabled:bg-slate-100 transition-shadow"
            />
            <button
              type="submit"
              disabled={isSearching || sessionKnowledgeBank.length === 0 || !isOnline}
              title={
                !isOnline
                  ? 'Cannot search: internet is offline'
                  : sessionKnowledgeBank.length === 0
                    ? 'Analyze a transcript to enable search'
                    : 'Search for solutions'
              }
              className="inline-flex items-center justify-center gap-2 px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-sky-600 hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 disabled:bg-slate-400 disabled:cursor-not-allowed transition-colors"
            >
              <SearchIcon className="w-5 h-5" /> {isSearching ? 'Searching...' : 'Search'}
            </button>
          </form>
          {searchError && <ErrorMessage message={searchError} />}
          {isSearching && <Loader text="Searching..." />}
          {!isSearching && searchResults.length > 0 && (
            <div className="mt-6">
              <SearchResults results={searchResults} />
            </div>
          )}
          {!isSearching && !searchError && searchResults.length === 0 && searchQuery && (
            <div className="mt-6">
              <p className="text-center text-slate-500">
                No solutions found in this session for your query.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AnalyzerTab;
