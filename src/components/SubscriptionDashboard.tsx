import React, { useState, useEffect } from 'react';

interface UsageStats {
  minutesUsed: number;
  minutesLimit: number;
  apiCallsUsed: number;
  apiCallsLimit: number;
  currentPeriodStart: string;
  currentPeriodEnd: string;
}

interface SubscriptionInfo {
  tier: string;
  status: 'active' | 'past_due' | 'canceled' | 'trialing';
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  nextBillAmount?: number;
  nextBillDate?: string;
}

interface BillingEvent {
  type: 'subscription_created' | 'subscription_updated' | 'payment_succeeded' | 'payment_failed' | 'invoice_created';
  amount: number;
  currency: string;
  createdAt: string;
  description?: string;
  status?: string;
}

interface SubscriptionDashboardProps {
  onUpgrade: () => void;
  onManageBilling: () => void;
}

const SubscriptionDashboard: React.FC<SubscriptionDashboardProps> = ({
  onUpgrade,
  onManageBilling
}) => {
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
  const [usage, setUsage] = useState<UsageStats | null>(null);
  const [billingHistory, setBillingHistory] = useState<BillingEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [recommendations, setRecommendations] = useState<any[]>([]);

  useEffect(() => {
    fetchSubscriptionData();
  }, []);

  const fetchSubscriptionData = async () => {
    try {
      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';
      const token = localStorage.getItem('token');
      
      // Fetch subscription info
      const subResponse = await fetch(`${API_BASE_URL}/api/subscription/current`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (subResponse.ok) {
        const subData = await subResponse.json();
        setSubscription(subData);
      }

      // Fetch usage stats
      const usageResponse = await fetch(`${API_BASE_URL}/api/subscription/usage`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (usageResponse.ok) {
        const usageData = await usageResponse.json();
        setUsage(usageData);
      }

      // Fetch billing history
      const billingResponse = await fetch(`${API_BASE_URL}/api/subscription/billing-history`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (billingResponse.ok) {
        const billingData = await billingResponse.json();
        setBillingHistory(billingData);
      }

      // Fetch recommendations
      const recResponse = await fetch(`${API_BASE_URL}/api/subscription/recommendations`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (recResponse.ok) {
        const recData = await recResponse.json();
        setRecommendations(recData);
      }

    } catch (error) {
      console.error('Failed to fetch subscription data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getUsagePercentage = (used: number, limit: number) => {
    if (limit === -1) return 0; // Unlimited
    return Math.min((used / limit) * 100, 100);
  };

  const getUsageColor = (percentage: number) => {
    if (percentage >= 90) return 'text-red-600';
    if (percentage >= 75) return 'text-yellow-600';
    return 'text-green-600';
  };

  const getProgressBarColor = (percentage: number) => {
    if (percentage >= 90) return 'bg-red-500';
    if (percentage >= 75) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'trialing': return 'bg-blue-100 text-blue-800';
      case 'past_due': return 'bg-yellow-100 text-yellow-800';
      case 'canceled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-slate-600">Loading subscription data...</span>
      </div>
    );
  }

  if (!subscription) {
    return (
      <div className="text-center py-12">
        <div className="bg-slate-50 rounded-xl p-8 max-w-md mx-auto">
          <h3 className="text-lg font-semibold text-slate-900 mb-2">No Active Subscription</h3>
          <p className="text-slate-600 mb-4">Start your subscription to unlock all features.</p>
          <button
            onClick={onUpgrade}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Choose a Plan
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Subscription Dashboard</h1>
          <p className="text-slate-600 mt-1">Manage your plan and monitor usage</p>
        </div>
        <div className="mt-4 sm:mt-0 flex space-x-3">
          <button
            onClick={onUpgrade}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm"
          >
            Upgrade Plan
          </button>
          <button
            onClick={onManageBilling}
            className="bg-slate-100 text-slate-700 px-4 py-2 rounded-lg hover:bg-slate-200 transition-colors text-sm"
          >
            Manage Billing
          </button>
        </div>
      </div>

      {/* Current Plan Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-xl font-semibold text-slate-900 mb-1">Current Plan</h2>
              <div className="flex items-center space-x-3">
                <span className="text-2xl font-bold text-slate-900">{subscription.tier}</span>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadgeColor(subscription.status)}`}>
                  {subscription.status.charAt(0).toUpperCase() + subscription.status.slice(1)}
                </span>
              </div>
            </div>
            {subscription.cancelAtPeriodEnd && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <div className="flex items-center">
                  <svg className="w-4 h-4 text-yellow-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  <span className="text-sm text-yellow-800">Cancels on {formatDate(subscription.currentPeriodEnd)}</span>
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-slate-500">Billing Period</span>
              <p className="font-medium text-slate-900">
                {formatDate(subscription.currentPeriodStart)} - {formatDate(subscription.currentPeriodEnd)}
              </p>
            </div>
            {subscription.nextBillDate && (
              <div>
                <span className="text-slate-500">Next Bill Date</span>
                <p className="font-medium text-slate-900">{formatDate(subscription.nextBillDate)}</p>
                {subscription.nextBillAmount && (
                  <p className="text-sm text-slate-600">${subscription.nextBillAmount}</p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Quick Stats */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Quick Stats</h3>
          <div className="space-y-4">
            {usage && (
              <>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-slate-600">Minutes Used</span>
                    <span className={`font-medium ${getUsageColor(getUsagePercentage(usage.minutesUsed, usage.minutesLimit))}`}>
                      {usage.minutesUsed.toLocaleString()} / {usage.minutesLimit === -1 ? '∞' : usage.minutesLimit.toLocaleString()}
                    </span>
                  </div>
                  {usage.minutesLimit !== -1 && (
                    <div className="w-full bg-slate-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full transition-all duration-300 ${getProgressBarColor(getUsagePercentage(usage.minutesUsed, usage.minutesLimit))}`}
                        style={{ width: `${getUsagePercentage(usage.minutesUsed, usage.minutesLimit)}%` }}
                      ></div>
                    </div>
                  )}
                </div>

                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-slate-600">API Calls</span>
                    <span className={`font-medium ${getUsageColor(getUsagePercentage(usage.apiCallsUsed, usage.apiCallsLimit))}`}>
                      {usage.apiCallsUsed.toLocaleString()} / {usage.apiCallsLimit === -1 ? '∞' : usage.apiCallsLimit.toLocaleString()}
                    </span>
                  </div>
                  {usage.apiCallsLimit !== -1 && (
                    <div className="w-full bg-slate-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full transition-all duration-300 ${getProgressBarColor(getUsagePercentage(usage.apiCallsUsed, usage.apiCallsLimit))}`}
                        style={{ width: `${getUsagePercentage(usage.apiCallsUsed, usage.apiCallsLimit)}%` }}
                      ></div>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 mb-8">
          <h3 className="text-lg font-semibold text-blue-900 mb-3">Recommendations</h3>
          <div className="space-y-2">
            {recommendations.map((rec, index) => (
              <div key={index} className="flex items-start">
                <svg className="w-4 h-4 text-blue-600 mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
                <p className="text-blue-800 text-sm">{rec.message}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Billing History */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Recent Activity</h3>
        {billingHistory.length > 0 ? (
          <div className="space-y-3">
            {billingHistory.slice(0, 10).map((event, index) => (
              <div key={index} className="flex items-center justify-between py-3 border-b border-slate-100 last:border-0">
                <div>
                  <p className="font-medium text-slate-900 text-sm">
                    {event.type.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                  </p>
                  {event.description && (
                    <p className="text-sm text-slate-600">{event.description}</p>
                  )}
                  <p className="text-xs text-slate-500">{formatDate(event.createdAt)}</p>
                </div>
                <div className="text-right">
                  <p className="font-medium text-slate-900 text-sm">
                    ${event.amount} {event.currency.toUpperCase()}
                  </p>
                  {event.status && (
                    <span className={`inline-block px-2 py-1 rounded text-xs ${
                      event.status === 'succeeded' ? 'bg-green-100 text-green-800' : 
                      event.status === 'failed' ? 'bg-red-100 text-red-800' : 
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {event.status}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-slate-600 text-sm">No billing activity yet.</p>
        )}
      </div>
    </div>
  );
};

export default SubscriptionDashboard;