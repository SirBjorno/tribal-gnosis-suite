import { SUBSCRIPTION_TIERS } from '../models/index';

// Get subscription tier configuration
export const getSubscriptionTier = (tierName: string) => {
  return SUBSCRIPTION_TIERS[tierName as keyof typeof SUBSCRIPTION_TIERS];
};

// Check if tenant has exceeded usage limits
export const checkUsageLimits = (tenant: any) => {
  const tier = getSubscriptionTier(tenant.subscription.tier);
  if (!tier) return { valid: false, message: 'Invalid subscription tier' };

  const usage = tenant.usage.currentPeriod;
  const limits = {
    minutes: tier.minutesPerMonth,
    storage: tier.storageGB * 1024, // Convert GB to MB
    users: tier.maxUsers,
    companies: tier.maxCompanies
  };

  // Check transcription minutes
  if (usage.transcriptionMinutes >= limits.minutes) {
    return {
      valid: false,
      message: `Monthly transcription limit of ${limits.minutes} minutes exceeded`,
      limitType: 'minutes'
    };
  }

  // Check storage
  if (usage.storageUsedMB >= limits.storage) {
    return {
      valid: false,
      message: `Storage limit of ${tier.storageGB}GB exceeded`,
      limitType: 'storage'
    };
  }

  return { valid: true };
};

// Check if feature is available for tenant's subscription
export const hasFeatureAccess = (tenant: any, featureName: string) => {
  const tier = getSubscriptionTier(tenant.subscription.tier);
  if (!tier) return false;

  return tier.features[featureName as keyof typeof tier.features] || false;
};

// Calculate prorated cost for usage
export const calculateUsageCost = (minutes: number, tierName: string) => {
  const tier = getSubscriptionTier(tierName);
  if (!tier) return 0;

  // Base cost per minute (rough estimate)
  const costPerMinute = 0.006; // $0.006 per minute (OpenAI Whisper pricing)
  
  return Math.round(minutes * costPerMinute * 100); // Return in cents
};

// Check if subscription needs renewal
export const isSubscriptionActive = (tenant: any) => {
  const subscription = tenant.subscription;
  
  if (!subscription || subscription.status !== 'active') {
    return false;
  }

  // Check if subscription has expired
  if (subscription.currentPeriodEnd && new Date() > new Date(subscription.currentPeriodEnd)) {
    return false;
  }

  return true;
};

// Get usage percentage for a specific limit
export const getUsagePercentage = (tenant: any, limitType: 'minutes' | 'storage') => {
  const tier = getSubscriptionTier(tenant.subscription.tier);
  if (!tier) return 0;

  const usage = tenant.usage.currentPeriod;
  
  switch (limitType) {
    case 'minutes':
      return Math.round((usage.transcriptionMinutes / tier.minutesPerMonth) * 100);
    case 'storage':
      const storageLimitMB = tier.storageGB * 1024;
      return Math.round((usage.storageUsedMB / storageLimitMB) * 100);
    default:
      return 0;
  }
};

// Reset usage for new billing period
export const resetUsageForNewPeriod = async (tenant: any) => {
  tenant.usage.currentPeriod = {
    transcriptionMinutes: 0,
    apiCalls: 0,
    storageUsedMB: tenant.usage.currentPeriod.storageUsedMB // Storage carries over
  };
  tenant.usage.lastResetDate = new Date();
  
  await tenant.save();
  return tenant;
};

// Get tier recommendations based on usage
export const getTierRecommendations = (tenant: any) => {
  const currentUsage = tenant.usage.currentPeriod;
  const currentTier = getSubscriptionTier(tenant.subscription.tier);
  
  const recommendations = [];
  
  // If usage is consistently high, recommend upgrade
  if (currentUsage.transcriptionMinutes > currentTier.minutesPerMonth * 0.8) {
    const nextTier = getNextTier(tenant.subscription.tier);
    if (nextTier) {
      recommendations.push({
        type: 'upgrade',
        tier: nextTier,
        reason: 'High transcription usage detected'
      });
    }
  }
  
  // If usage is consistently low, recommend downgrade
  if (currentUsage.transcriptionMinutes < currentTier.minutesPerMonth * 0.2) {
    const previousTier = getPreviousTier(tenant.subscription.tier);
    if (previousTier) {
      recommendations.push({
        type: 'downgrade',
        tier: previousTier,
        reason: 'Low usage detected - save money with lower tier'
      });
    }
  }
  
  return recommendations;
};

// Helper functions for tier navigation
const getNextTier = (currentTier: string) => {
  const tiers = ['STARTER', 'GROWTH', 'PROFESSIONAL', 'ENTERPRISE', 'ENTERPRISE_PLUS'];
  const currentIndex = tiers.indexOf(currentTier);
  return currentIndex < tiers.length - 1 ? tiers[currentIndex + 1] : null;
};

const getPreviousTier = (currentTier: string) => {
  const tiers = ['STARTER', 'GROWTH', 'PROFESSIONAL', 'ENTERPRISE', 'ENTERPRISE_PLUS'];
  const currentIndex = tiers.indexOf(currentTier);
  return currentIndex > 0 ? tiers[currentIndex - 1] : null;
};

export {
  getNextTier,
  getPreviousTier
};