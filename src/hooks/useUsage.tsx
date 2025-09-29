import { useState, useEffect, useContext, createContext } from 'react';
import subscriptionService from '../services/subscriptionService';

interface UsageContextType {
  minutesUsed: number;
  minutesLimit: number;
  apiCallsUsed: number;
  apiCallsLimit: number;
  currentTier: string;
  subscription: any;
  loading: boolean;
  error: string | null;
  refreshUsage: () => Promise<void>;
  canUseFeature: (feature: string) => boolean;
  canUseMinutes: (minutes: number) => boolean;
  canMakeApiCall: () => boolean;
  getUsagePercentage: (type: 'minutes' | 'apiCalls') => number;
}

const UsageContext = createContext<UsageContextType | undefined>(undefined);

export const useUsage = () => {
  const context = useContext(UsageContext);
  if (!context) {
    throw new Error('useUsage must be used within a UsageProvider');
  }
  return context;
};

interface UsageProviderProps {
  children: React.ReactNode;
}

export const UsageProvider: React.FC<UsageProviderProps> = ({ children }) => {
  const [usage, setUsage] = useState({
    minutesUsed: 0,
    minutesLimit: -1,
    apiCallsUsed: 0,
    apiCallsLimit: -1,
  });
  const [subscription, setSubscription] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshUsage = async () => {
    try {
      setError(null);
      const [usageData, subscriptionData] = await Promise.all([
        subscriptionService.getUsageStats(),
        subscriptionService.getCurrentSubscription()
      ]);
      
      setUsage({
        minutesUsed: usageData.minutesUsed || 0,
        minutesLimit: usageData.minutesLimit || -1,
        apiCallsUsed: usageData.apiCallsUsed || 0,
        apiCallsLimit: usageData.apiCallsLimit || -1,
      });
      
      setSubscription(subscriptionData);
    } catch (err: any) {
      console.error('Failed to refresh usage:', err);
      setError(err.message || 'Failed to load usage data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshUsage();
    
    // Refresh usage every 5 minutes
    const interval = setInterval(refreshUsage, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const canUseFeature = (feature: string): boolean => {
    if (!subscription) return false;
    return subscription.features?.[feature] || false;
  };

  const canUseMinutes = (minutes: number): boolean => {
    if (usage.minutesLimit === -1) return true; // Unlimited
    return (usage.minutesUsed + minutes) <= usage.minutesLimit;
  };

  const canMakeApiCall = (): boolean => {
    if (usage.apiCallsLimit === -1) return true; // Unlimited
    return usage.apiCallsUsed < usage.apiCallsLimit;
  };

  const getUsagePercentage = (type: 'minutes' | 'apiCalls'): number => {
    if (type === 'minutes') {
      if (usage.minutesLimit === -1) return 0;
      return Math.min((usage.minutesUsed / usage.minutesLimit) * 100, 100);
    } else {
      if (usage.apiCallsLimit === -1) return 0;
      return Math.min((usage.apiCallsUsed / usage.apiCallsLimit) * 100, 100);
    }
  };

  const contextValue: UsageContextType = {
    minutesUsed: usage.minutesUsed,
    minutesLimit: usage.minutesLimit,
    apiCallsUsed: usage.apiCallsUsed,
    apiCallsLimit: usage.apiCallsLimit,
    currentTier: subscription?.tier || 'STARTER',
    subscription,
    loading,
    error,
    refreshUsage,
    canUseFeature,
    canUseMinutes,
    canMakeApiCall,
    getUsagePercentage,
  };

  return (
    <UsageContext.Provider value={contextValue}>
      {children}
    </UsageContext.Provider>
  );
};

// Hook for tracking usage in components
export const useUsageTracker = () => {
  const { refreshUsage, canUseMinutes, canMakeApiCall, canUseFeature } = useUsage();

  const trackTranscription = async (duration: number) => {
    // Check if user can use the transcription feature and has enough minutes
    if (!canUseFeature('transcription')) {
      throw new Error('Transcription not available in your current plan');
    }
    
    if (!canUseMinutes(duration)) {
      throw new Error('Insufficient transcription minutes remaining');
    }

    // In a real implementation, you would make an API call here to track the usage
    // For now, we'll just refresh the usage after a delay
    setTimeout(refreshUsage, 1000);
  };

  const trackApiCall = async () => {
    if (!canMakeApiCall()) {
      throw new Error('API call limit reached');
    }

    // Track the API call
    setTimeout(refreshUsage, 1000);
  };

  const checkFeatureAccess = (feature: string): boolean => {
    return canUseFeature(feature);
  };

  return {
    trackTranscription,
    trackApiCall,
    checkFeatureAccess,
  };
};

export default UsageProvider;