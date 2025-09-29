import React, { useState, useEffect } from 'react';

interface SubscriptionTier {
  name: string;
  price: number;
  minutesPerMonth: number;
  maxCompanies: number;
  maxUsers: number;
  storageGB: number;
  features: {
    transcription: boolean;
    analysis: boolean;
    knowledgeBase: boolean;
    apiAccess: boolean;
    customModels: boolean;
    whiteLabel: boolean;
  };
}

interface PricingPageProps {
  currentTier?: string;
  onSelectTier: (tier: string) => void;
  isUpgrade?: boolean;
}

const PricingPage: React.FC<PricingPageProps> = ({
  currentTier = 'STARTER',
  onSelectTier,
  isUpgrade = false
}) => {
  const [tiers, setTiers] = useState<Record<string, SubscriptionTier>>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchTiers();
  }, []);

  const fetchTiers = async () => {
    try {
      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';
      const response = await fetch(`${API_BASE_URL}/api/subscription/tiers`);
      if (response.ok) {
        const data = await response.json();
        setTiers(data);
      }
    } catch (error) {
      console.error('Failed to fetch pricing tiers:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatNumber = (num: number) => {
    if (num === -1) return 'Unlimited';
    return num.toLocaleString();
  };

  const isCurrentTier = (tierKey: string) => tierKey === currentTier;
  const isDowngrade = (tierKey: string) => {
    const tierOrder = ['STARTER', 'GROWTH', 'PROFESSIONAL', 'ENTERPRISE', 'ENTERPRISE_PLUS'];
    return tierOrder.indexOf(tierKey) < tierOrder.indexOf(currentTier);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-slate-600">Loading pricing...</span>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-slate-900 mb-4">
          {isUpgrade ? 'Upgrade Your Plan' : 'Choose Your Plan'}
        </h1>
        <p className="text-xl text-slate-600 max-w-2xl mx-auto">
          Select the perfect plan for your transcription and knowledge management needs. 
          Pay only for what you use with our minute-based pricing.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
        {Object.entries(tiers).map(([key, tier]) => (
          <div
            key={key}
            className={`relative bg-white rounded-2xl shadow-lg border-2 transition-all duration-200 hover:shadow-xl ${
              isCurrentTier(key)
                ? 'border-blue-500 ring-2 ring-blue-200'
                : 'border-slate-200 hover:border-blue-300'
            } ${
              key === 'PROFESSIONAL' ? 'lg:scale-105 lg:shadow-xl' : ''
            }`}
          >
            {/* Popular Badge */}
            {key === 'PROFESSIONAL' && (
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                <span className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-1 rounded-full text-sm font-medium">
                  Most Popular
                </span>
              </div>
            )}

            {/* Current Plan Badge */}
            {isCurrentTier(key) && (
              <div className="absolute -top-4 right-4">
                <span className="bg-green-500 text-white px-3 py-1 rounded-full text-xs font-medium">
                  Current Plan
                </span>
              </div>
            )}

            <div className="p-6">
              {/* Tier Name & Price */}
              <div className="text-center mb-6">
                <h3 className="text-xl font-bold text-slate-900 mb-2">{tier.name}</h3>
                <div className="mb-4">
                  <span className="text-4xl font-bold text-slate-900">
                    ${tier.price}
                  </span>
                  {tier.price > 0 && (
                    <span className="text-slate-600 text-sm">/month</span>
                  )}
                </div>
              </div>

              {/* Key Features */}
              <div className="space-y-3 mb-6">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">Minutes/month</span>
                  <span className="text-sm font-semibold">
                    {formatNumber(tier.minutesPerMonth)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">Companies</span>
                  <span className="text-sm font-semibold">
                    {formatNumber(tier.maxCompanies)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">Users</span>
                  <span className="text-sm font-semibold">
                    {formatNumber(tier.maxUsers)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">Storage</span>
                  <span className="text-sm font-semibold">{tier.storageGB}GB</span>
                </div>
              </div>

              {/* Feature List */}
              <div className="space-y-2 mb-6">
                {Object.entries(tier.features).map(([feature, enabled]) => (
                  <div key={feature} className="flex items-center">
                    <div className={`w-4 h-4 rounded-full mr-2 flex items-center justify-center ${
                      enabled ? 'bg-green-100' : 'bg-slate-100'
                    }`}>
                      {enabled ? (
                        <svg className="w-2.5 h-2.5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      ) : (
                        <svg className="w-2.5 h-2.5 text-slate-400" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                    <span className={`text-xs ${enabled ? 'text-slate-700' : 'text-slate-400'}`}>
                      {feature.charAt(0).toUpperCase() + feature.slice(1).replace(/([A-Z])/g, ' $1')}
                    </span>
                  </div>
                ))}
              </div>

              {/* Action Button */}
              <button
                onClick={() => onSelectTier(key)}
                disabled={isCurrentTier(key)}
                className={`w-full py-3 px-4 rounded-lg font-semibold text-sm transition-colors ${
                  isCurrentTier(key)
                    ? 'bg-slate-100 text-slate-500 cursor-not-allowed'
                    : isDowngrade(key)
                    ? 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    : key === 'PROFESSIONAL'
                    ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                {isCurrentTier(key)
                  ? 'Current Plan'
                  : isDowngrade(key)
                  ? 'Downgrade'
                  : tier.price === 0
                  ? 'Get Started Free'
                  : 'Upgrade Now'
                }
              </button>

              {/* Value Proposition */}
              <div className="mt-3 text-center">
                <p className="text-xs text-slate-500">
                  {key === 'STARTER' && 'Perfect for trying out the platform'}
                  {key === 'GROWTH' && 'Great for small teams and growing companies'}
                  {key === 'PROFESSIONAL' && 'Best value for most businesses'}
                  {key === 'ENTERPRISE' && 'Comprehensive solution for large organizations'}
                  {key === 'ENTERPRISE_PLUS' && 'Maximum capacity and custom features'}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* FAQ or Additional Info */}
      <div className="mt-16 text-center">
        <div className="bg-slate-50 rounded-xl p-8 max-w-4xl mx-auto">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">
            Why Choose Minute-Based Pricing?
          </h3>
          <div className="grid md:grid-cols-3 gap-6 text-sm text-slate-600">
            <div>
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-2">
                <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" />
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd" />
                </svg>
              </div>
              <h4 className="font-medium text-slate-900 mb-1">Fair & Transparent</h4>
              <p>Pay only for what you actually use. No hidden fees or surprise charges.</p>
            </div>
            <div>
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
                <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <h4 className="font-medium text-slate-900 mb-1">Scalable</h4>
              <p>Start small and grow. Upgrade seamlessly as your needs increase.</p>
            </div>
            <div>
              <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-2">
                <svg className="w-4 h-4 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h4 className="font-medium text-slate-900 mb-1">Value-Added</h4>
              <p>Get AI analysis, knowledge management, and team collaboration included.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PricingPage;