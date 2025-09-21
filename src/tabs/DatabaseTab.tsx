import React, { useState, useMemo, useEffect } from 'react';
import type { KnowledgeBankItem } from '../types';
import { DatabaseIcon, SearchIcon, CustomerProfileIcon, ChevronDownIcon } from '../components/Icons';
import InfoMessage from '../components/InfoMessage';
import DataManager from '../components/DataManager';
import { getKnowledgeBankFromCloud } from '../services/apiService';
import ErrorMessage from '../components/ErrorMessage';

interface DatabaseTabProps {
  knowledgeBank: KnowledgeBankItem[];
  tenantId: string;
  setKnowledgeBank: React.Dispatch<React.SetStateAction<KnowledgeBankItem[]>>;
}

const BankItem: React.FC<{ item: KnowledgeBankItem }> = ({ item }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [showTranscript, setShowTranscript] = useState(false);
    const { summary, detailedTranscript } = item;

    return (
        <div className="bg-white rounded-lg shadow-sm border border-slate-200/80 transition-shadow hover:shadow-md">
            <button 
                className="w-full flex justify-between items-center p-4 text-left"
                onClick={() => setIsOpen(!isOpen)}
                aria-expanded={isOpen}
            >
                <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                        <CustomerProfileIcon />
                    </div>
                    <div className="min-w-0">
                        <p className="font-semibold text-slate-800 truncate" title={summary.customerProfile.name}>{summary.customerProfile.name}</p>
                        <p className="text-sm text-slate-500 truncate" title={summary.problem}>{summary.problem}</p>
                    </div>
                </div>
                <ChevronDownIcon className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>
            {isOpen && (
                <div className="p-4 border-t border-slate-200/80 bg-slate-50/50">
                    <div className="space-y-4 text-sm">
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
                         <div className="border-t pt-4">
                             <button onClick={() => setShowTranscript(!showTranscript)} className="text-sm font-semibold text-sky-600 hover:text-sky-800">
                                {showTranscript ? 'Hide' : 'Show'} Full Transcript
                             </button>
                             {showTranscript && (
                                <div className="mt-2 bg-white p-3 border rounded-md max-h-48 overflow-y-auto">
                                    {detailedTranscript.dialogue.map((line, index) => (
                                        <p key={index} className="text-xs font-mono text-slate-600">
                                           <span className="font-bold">{line.speaker}:</span> {line.text}
                                        </p>
                                    ))}
                                </div>
                             )}
                         </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const DatabaseTab: React.FC<DatabaseTabProps> = ({ knowledgeBank, tenantId, setKnowledgeBank }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [infoDismissed, setInfoDismissed] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [syncSuccessMessage, setSyncSuccessMessage] = useState<string | null>(null);
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

  const handleSync = async () => {
    setIsSyncing(true);
    setSyncError(null);
    setSyncSuccessMessage(null);

    try {
      // Artificial delay to ensure loading state is visible to the user
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const cloudBank = await getKnowledgeBankFromCloud(tenantId);
      
      if (!Array.isArray(cloudBank)) {
        console.error("Received non-array data from backend during sync.", cloudBank);
        setSyncError("Received malformed data from the server. Data has been cleared.");
        setKnowledgeBank([]);
        return;
      }
      
      const validatedBank = cloudBank.filter(item => 
        item && typeof item === 'object' && item.summary && item.summary.problem
      );

      if (validatedBank.length !== cloudBank.length) {
        console.warn("Filtered out invalid items from knowledge bank during sync.");
      }
      
      setKnowledgeBank(validatedBank);
      setSyncSuccessMessage(`Sync complete. Found ${validatedBank.length} items in the cloud.`);
      setTimeout(() => setSyncSuccessMessage(null), 4000); // Clear message after 4 seconds

    } catch (error) {
        console.error("Sync failed", error);
        setSyncError("Failed to sync with the cloud. Please check your connection and try again.");
    } finally {
        setIsSyncing(false);
    }
  };

  const handleExport = () => {
    const blob = new Blob([JSON.stringify(knowledgeBank, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${tenantId}_knowledge_bank_${new Date().toISOString()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };
  
  const handleImport = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const content = JSON.parse(e.target?.result as string);
            if (Array.isArray(content) && content.every(item => 'id' in item && 'summary' in item)) {
                setKnowledgeBank(content);
                setSyncError(null);
                setSyncSuccessMessage("Successfully imported data from file.");
                setTimeout(() => setSyncSuccessMessage(null), 4000);
            } else {
                throw new Error("Invalid file format.");
            }
        } catch (err) {
            setSyncError("Failed to import file. Make sure it is a valid JSON export from this application.");
        }
    };
    reader.readAsText(file);
  };

  const filteredBank = useMemo(() => {
    if (!searchTerm.trim()) {
      return knowledgeBank;
    }
    const lowercasedTerm = searchTerm.toLowerCase();
    return knowledgeBank.filter(item => {
        const s = item.summary;
        return s.problem.toLowerCase().includes(lowercasedTerm) ||
            s.solution.toLowerCase().includes(lowercasedTerm) ||
            s.resolution.toLowerCase().includes(lowercasedTerm) ||
            s.productInformation.toLowerCase().includes(lowercasedTerm) ||
            s.customerProfile.name.toLowerCase().includes(lowercasedTerm)
    });
  }, [searchTerm, knowledgeBank]);

  return (
    <div className="space-y-8">
        <div className="bg-white p-6 rounded-xl shadow-lg border border-slate-200/80">
            <div className="flex items-center gap-4 mb-4">
                <DatabaseIcon className="h-8 w-8 text-slate-500" />
                <div>
                <h2 className="text-2xl font-bold text-slate-900">Knowledge Database</h2>
                <p className="text-slate-600">
                    Search through {knowledgeBank.length} approved summaries.
                </p>
                </div>
            </div>

            {!infoDismissed && (
                <InfoMessage
                message={`This knowledge base is specific to ${tenantId.replace('-', ' ')}. Use the Data Management section below to sync with the cloud.`}
                onDismiss={() => setInfoDismissed(true)}
                />
            )}

            <div className="relative my-6">
                <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search by problem, solution, customer, product..."
                    className="w-full p-3 pl-10 border border-slate-300 rounded-md focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-shadow"
                />
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <SearchIcon />
                </div>
            </div>
            
            {filteredBank.length > 0 ? (
                <div className="space-y-3">
                {filteredBank.map((item) => (
                    <BankItem key={item.id} item={item} />
                ))}
                </div>
            ) : (
                <div className="text-center py-16 px-4">
                <p className="text-slate-500 font-semibold">No entries found.</p>
                {knowledgeBank.length > 0 && searchTerm && <p className="text-sm text-slate-400 mt-1">Try a different search term.</p>}
                {knowledgeBank.length === 0 && <p className="text-sm text-slate-400 mt-1">The knowledge bank is empty. Sync with the cloud or approve items in the Workflow tab.</p>}
                </div>
            )}
        </div>
        
        <DataManager 
            onImport={handleImport}
            onExport={handleExport}
            onSync={handleSync}
            isSyncing={isSyncing}
            isOnline={isOnline}
            transcriptCount={knowledgeBank.length}
        />
        <div className="max-w-xl mx-auto -mt-4">
          {syncSuccessMessage && <InfoMessage message={syncSuccessMessage} onDismiss={() => setSyncSuccessMessage(null)} />}
          {syncError && <ErrorMessage message={syncError} />}
        </div>
    </div>
  );
};

export default DatabaseTab;