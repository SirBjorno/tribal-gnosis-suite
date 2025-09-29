import React, { useState, useEffect } from 'react';
import PricingPage from '../components/PricingPage';
import SubscriptionDashboard from '../components/SubscriptionDashboard';
import subscriptionService from '../services/subscriptionService';

import type { UserRole } from '../types';

interface BillingTabProps {
  userRole?: UserRole;
}

const BillingTab: React.FC<BillingTabProps> = ({ userRole = 'admin' }) => {
  const [view, setView] = useState<'dashboard' | 'pricing' | 'loading'>('loading');
  const [hasSubscription, setHasSubscription] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    checkSubscriptionStatus();
  }, []);

  const checkSubscriptionStatus = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const subscription = await subscriptionService.getCurrentSubscription();
      setHasSubscription(!!subscription && subscription.status === 'active');
      setView(hasSubscription ? 'dashboard' : 'pricing');
    } catch (err: any) {
      console.error('Failed to check subscription:', err);
      // If no subscription found, show pricing
      if (err.message?.includes('subscription') || err.message?.includes('404')) {
        setHasSubscription(false);
        setView('pricing');
      } else {
        setError(err.message || 'Failed to load billing information');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectTier = async (tierKey: string) => {
    try {
      setIsLoading(true);
      setError(null);

      // Get tier information
      const tiers = await subscriptionService.getTiers();
      const selectedTier = tiers[tierKey];
      
      if (!selectedTier) {
        throw new Error('Invalid tier selected');
      }

      // If it's the free tier, we might not need Stripe
      if (selectedTier.price === 0) {
        // Handle free tier signup
        console.log('Free tier selected');
        await checkSubscriptionStatus(); // Refresh
        return;
      }

      // For paid tiers, we'll need to integrate with Stripe
      // This is a simplified version - in production you'd:
      // 1. Create payment method collection
      // 2. Create subscription with Stripe
      // 3. Handle payment confirmation
      
      alert(`Selected tier: ${selectedTier.name} - $${selectedTier.price}/month\n\nStripe integration would handle payment here.`);
      
    } catch (err: any) {
      setError(err.message || 'Failed to select tier');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpgrade = () => {
    setView('pricing');
  };

  const handleManageBilling = async () => {
    try {
      setIsLoading(true);
      const { url } = await subscriptionService.createBillingPortalSession();
      window.open(url, '_blank');
    } catch (err: any) {
      setError(err.message || 'Failed to open billing portal');
    } finally {
      setIsLoading(false);
    }
  };

  if (userRole !== 'admin' && userRole !== 'master') {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12">
        <div className="bg-slate-50 rounded-xl p-8 text-center">
          <div className="w-12 h-12 bg-slate-200 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-slate-900 mb-2">Admin Access Required</h3>
          <p className="text-slate-600">Only administrators can manage billing and subscription settings.</p>
        </div>
      </div>
    );
  }

  if (isLoading && view === 'loading') {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-slate-600">Loading billing information...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6">
          <div className="flex items-center">
            <svg className="w-5 h-5 text-red-600 mr-3" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <div>
              <h3 className="font-medium text-red-900">Error Loading Billing</h3>
              <p className="text-red-700 text-sm mt-1">{error}</p>
            </div>
          </div>
          <div className="mt-4">
            <button
              onClick={checkSubscriptionStatus}
              className="bg-red-100 text-red-800 px-4 py-2 rounded-lg hover:bg-red-200 transition-colors text-sm"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Navigation Tabs */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4">
          <nav className="flex space-x-8">
            <button
              onClick={() => setView('dashboard')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                view === 'dashboard'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              }`}
              disabled={!hasSubscription}
            >
              Dashboard
            </button>
            <button
              onClick={() => setView('pricing')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                view === 'pricing'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              }`}
            >
              {hasSubscription ? 'Change Plan' : 'Choose Plan'}
            </button>
          </nav>
        </div>
      </div>

      {/* Content */}
      <div className="py-6">
        {view === 'dashboard' && hasSubscription && (
          <SubscriptionDashboard
            onUpgrade={handleUpgrade}
            onManageBilling={handleManageBilling}
          />
        )}
        
        {view === 'pricing' && (
          <PricingPage
            currentTier={hasSubscription ? 'STARTER' : undefined} // You'd get this from subscription data
            onSelectTier={handleSelectTier}
            isUpgrade={hasSubscription}
          />
        )}
      </div>

      {/* Loading Overlay */}
      {isLoading && view !== 'loading' && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 flex items-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mr-3"></div>
            <span className="text-slate-700">Processing...</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default BillingTab;