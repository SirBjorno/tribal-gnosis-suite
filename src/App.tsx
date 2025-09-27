import React, { useState, useEffect } from 'react';
import type { User, ReviewItem, LiveCall, KnowledgeBankItem } from './types';
import LoginScreen from './components/LoginScreen';
import MainApplication from './components/MainApplication';
import MasterDashboard from './components/MasterDashboard';
import { getKnowledgeBankFromCloud } from './services/apiService';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [knowledgeBank, setKnowledgeBank] = useState<KnowledgeBankItem[]>([]);
  // Start with a clean slate, no sample data.
  const [reviewItems, setReviewItems] = useState<ReviewItem[]>([]);
  const [liveCall, setLiveCall] = useState<LiveCall | null>(null);
  const [isDemoMode, setIsDemoMode] = useState<boolean>(false);

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
          console.error(
            'Received non-array data from backend, correcting to empty array.',
            cloudBank
          );
          if (isMounted) setKnowledgeBank([]);
          return;
        }

        const validatedBank = cloudBank.filter(
          (item) => item && typeof item === 'object' && item.summary && item.summary.problem
        );

        if (validatedBank.length !== cloudBank.length) {
          console.warn('Filtered out invalid items from knowledge bank.', {
            originalCount: cloudBank.length,
            validatedCount: validatedBank.length,
          });
        }

        if (isMounted) {
          setKnowledgeBank(validatedBank);
        }
      } catch (error) {
        console.error('Failed to load knowledge bank from cloud', error);
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
    setIsDemoMode(false); // Exit demo mode on logout
  };

  const handleEnterDemoMode = () => {
    // Create a demo admin user context
    const demoUser: User = {
      ...currentUser!,
      role: 'admin',
      name: 'Demo Admin',
      tenantId: 'demo-tenant-id', // We'll create this demo tenant
    };
    setCurrentUser(demoUser);
    setIsDemoMode(true);
  };

  const handleExitDemoMode = () => {
    // Return to master user
    if (currentUser && isDemoMode) {
      const masterUser: User = {
        ...currentUser,
        role: 'master',
        name: 'Master Admin',
        tenantId: currentUser.tenant?.id || currentUser.tenantId,
      };
      setCurrentUser(masterUser);
      setIsDemoMode(false);
      setKnowledgeBank([]); // Clear demo data
      setReviewItems([]);
    }
  };

  if (!currentUser) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  // Show Master Dashboard for master role (unless in demo mode)
  if (currentUser.role === 'master' && !isDemoMode) {
    return (
      <MasterDashboard
        currentUser={currentUser}
        onLogout={handleLogout}
        onEnterDemoMode={handleEnterDemoMode}
      />
    );
  }

  // Show Main Application for admin/analyst roles or when in demo mode
  return (
    <MainApplication
      currentUser={currentUser}
      onLogout={isDemoMode ? handleExitDemoMode : handleLogout}
      knowledgeBank={knowledgeBank}
      setKnowledgeBank={setKnowledgeBank}
      reviewItems={reviewItems}
      setReviewItems={setReviewItems}
      liveCall={liveCall}
      setLiveCall={setLiveCall}
      isDemoMode={isDemoMode}
    />
  );
};

export default App;
