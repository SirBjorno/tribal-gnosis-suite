import React, { useState, useEffect } from 'react';
import type { User, ReviewItem, LiveCall, KnowledgeBankItem } from './types.ts';
import LoginScreen from './components/LoginScreen.tsx';
import MainApplication from './components/MainApplication.tsx';
import { getKnowledgeBankFromCloud } from './services/apiService.ts';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [knowledgeBank, setKnowledgeBank] = useState<KnowledgeBankItem[]>([]);
  // Start with a clean slate, no sample data.
  const [reviewItems, setReviewItems] = useState<ReviewItem[]>([]); 
  const [liveCall, setLiveCall] = useState<LiveCall | null>(null);

  // Effect to load data from the cloud when a user logs in
  useEffect(() => {
    if (!currentUser) return;

    const tenantId = currentUser.tenantId;
    let isMounted = true;
    
    const loadKnowledgeBank = async () => {
      try {
        console.log(`Fetching knowledge bank for tenant: ${tenantId}`);
        const cloudBank = await getKnowledgeBankFromCloud(tenantId);

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
  }, [currentUser]);
  
  const handleLogin = (user: User) => {
    setCurrentUser(user);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setLiveCall(null);
    setKnowledgeBank([]); // Clear knowledge bank on logout
    setReviewItems([]); // Clear review items on logout
  };

  if (!currentUser) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  return (
    <MainApplication 
      currentUser={currentUser}
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