import React, { useState, useEffect } from 'react';
import type { UserRole, ReviewItem, LiveCall, KnowledgeBankItem } from './types';
import LoginScreen from './components/LoginScreen';
import MainApplication from './components/MainApplication';
import { getKnowledgeBankFromCloud } from './services/apiService';

const sampleData: ReviewItem[] = [
    { 
      id: "log_001_transcript", 
      detailedTranscript: {
        confidenceScore: 0.95,
        dialogue: [
            { speaker: 'Agent', timestamp: '00:02', text: 'Hello, this is Tech Support. How can I help?' },
            { speaker: 'Customer', timestamp: '00:05', text: 'Hi, my internet is not working. I\'ve tried restarting the router.' },
            { speaker: 'Agent', timestamp: '00:10', text: 'I see. Can you tell me the model of your router?' },
            { speaker: 'Customer', timestamp: '00:14', text: 'It\'s a Speedster 5000.' },
            { speaker: 'Agent', timestamp: '00:18', text: 'Okay, let\'s try a factory reset. There\'s a small pinhole on the back...' },
            { speaker: 'Customer', timestamp: '00:25', text: 'It\'s working now! Thanks!' },
        ]
      },
      status: 'pending_transcript', 
      summary: null,
      audioUrl: null,
    },
    { 
      id: "log_002_transcript", 
      detailedTranscript: {
        confidenceScore: 0.98,
        dialogue: [
            { speaker: 'Customer', timestamp: '00:03', text: 'I\'d like to dispute a charge on my account.' },
            { speaker: 'Agent', timestamp: '00:06', text: 'I can help with that. What is the charge for?' },
            { speaker: 'Customer', timestamp: '00:11', text: 'It\'s for \'Web Services\' for $49.99. I never signed up for that.' },
            { speaker: 'Agent', timestamp: '00:17', text: 'I apologize for the inconvenience. I\'m removing the charge now. It will reflect on your next statement.' },
        ]
      },
      status: 'pending_transcript', 
      summary: null,
      audioUrl: null,
    },
];

const App: React.FC = () => {
  const [userRole, setUserRole] = useState<UserRole>(null);
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [knowledgeBank, setKnowledgeBank] = useState<KnowledgeBankItem[]>([]);
  const [reviewItems, setReviewItems] = useState<ReviewItem[]>(sampleData);
  const [liveCall, setLiveCall] = useState<LiveCall | null>(null);

  // Effect to load data from the cloud when a user logs in (tenantId is set)
  useEffect(() => {
    if (!tenantId) return;

    let isMounted = true;
    const loadKnowledgeBank = async () => {
      try {
        console.log(`Fetching knowledge bank for tenant: ${tenantId}`);
        const cloudBank = await getKnowledgeBankFromCloud(tenantId);

        // Client-side validation to prevent crashes from malformed data
        if (!Array.isArray(cloudBank)) {
          console.error("Received non-array data from backend, correcting to empty array.", cloudBank);
          if (isMounted) setKnowledgeBank([]);
          return;
        }

        const validatedBank = cloudBank.filter(item => 
          item && typeof item === 'object' && item.summary && item.summary.problem
        );

        if (validatedBank.length !== cloudBank.length) {
          console.warn("Filtered out invalid items from knowledge bank.", {
              originalCount: cloudBank.length,
              validatedCount: validatedBank.length,
          });
        }
        
        if (isMounted) {
          setKnowledgeBank(validatedBank);
        }

      } catch (error) {
        console.error("Failed to load knowledge bank from cloud", error);
        if (isMounted) {
          setKnowledgeBank([]);
        }
      }
    };

    loadKnowledgeBank();

    return () => {
      isMounted = false;
    };
  }, [tenantId]);
  
  const handleLogin = (role: UserRole, tenant: string) => {
    setUserRole(role);
    setTenantId(tenant);
  };

  const handleLogout = () => {
    setUserRole(null);
    setTenantId(null);
    setLiveCall(null);
    setKnowledgeBank([]); // Clear knowledge bank on logout
  };

  if (!userRole || !tenantId) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  return (
    <MainApplication 
      userRole={userRole} 
      tenantId={tenantId}
      onLogout={handleLogout}
      knowledgeBank={knowledgeBank}
      setKnowledgeBank={setKnowledgeBank}
      reviewItems={reviewItems}
      setReviewItems={setReviewItems}
      liveCall={liveCall}
      setLiveCall={setLiveCall}
    />
  );
};

export default App;
