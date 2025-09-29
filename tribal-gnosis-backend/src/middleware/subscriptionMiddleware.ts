import { Request, Response, NextFunction } from 'express';
import { Tenant, UsageRecord } from '../models/index';
import { checkUsageLimits, hasFeatureAccess, calculateUsageCost } from '../utils/subscriptionUtils';

// Extend Request interface to include tenant information
interface AuthenticatedRequest extends Request {
  tenant?: any;
  user?: any;
}

// Middleware to load tenant subscription information
export const loadTenantSubscription = async (
  req: AuthenticatedRequest, 
  res: Response, 
  next: NextFunction
) => {
  try {
    const tenantId = req.headers['x-tenant-id'] || req.body.tenantId || req.params.tenantId;
    
    if (!tenantId) {
      return res.status(400).json({ message: 'Tenant ID is required' });
    }

    const tenant = await Tenant.findById(tenantId);
    if (!tenant) {
      return res.status(404).json({ message: 'Tenant not found' });
    }

    req.tenant = tenant;
    next();
  } catch (error) {
    console.error('Error loading tenant subscription:', error);
    res.status(500).json({ message: 'Failed to load subscription information' });
  }
};

// Middleware to check feature access
export const requireFeature = (featureName: string) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.tenant) {
      return res.status(400).json({ message: 'Tenant information not loaded' });
    }

    if (!hasFeatureAccess(req.tenant, featureName)) {
      return res.status(403).json({ 
        message: `Feature '${featureName}' not available in your subscription tier`,
        upgradeRequired: true,
        currentTier: req.tenant.subscription.tier
      });
    }

    next();
  };
};

// Middleware to check usage limits before processing
export const checkUsageLimit = (limitType: 'minutes' | 'storage' | 'api') => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.tenant) {
      return res.status(400).json({ message: 'Tenant information not loaded' });
    }

    const limitsCheck = checkUsageLimits(req.tenant);
    
    if (!limitsCheck.valid && limitsCheck.limitType === limitType) {
      return res.status(429).json({
        message: limitsCheck.message,
        limitType: limitsCheck.limitType,
        upgradeRequired: true,
        currentUsage: req.tenant.usage.currentPeriod,
        currentTier: req.tenant.subscription.tier
      });
    }

    next();
  };
};

// Middleware to track transcription usage
export const trackTranscriptionUsage = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  // Store original res.json to intercept response
  const originalJson = res.json;
  
  res.json = function(data: any) {
    // Track usage after successful transcription
    if (res.statusCode === 200 && req.tenant) {
      trackTranscriptionMinutes(req, data).catch(console.error);
    }
    return originalJson.call(this, data);
  };
  
  next();
};

// Function to track transcription minutes
const trackTranscriptionMinutes = async (req: AuthenticatedRequest, responseData: any) => {
  try {
    if (!req.tenant) return;

    // Estimate minutes from transcript length or use provided duration
    const estimatedMinutes = req.body.duration || estimateMinutesFromText(responseData.transcript || '');
    
    // Update tenant usage
    req.tenant.usage.currentPeriod.transcriptionMinutes += estimatedMinutes;
    await req.tenant.save();

    // Create detailed usage record
    const usageRecord = new UsageRecord({
      tenantId: req.tenant._id,
      type: 'transcription',
      details: {
        minutes: estimatedMinutes,
        metadata: {
          endpoint: req.path,
          textLength: (responseData.transcript || '').length
        }
      },
      cost: calculateUsageCost(estimatedMinutes, req.tenant.subscription.tier)
    });
    
    await usageRecord.save();
    
    console.log(`Tracked ${estimatedMinutes} transcription minutes for tenant ${req.tenant._id}`);
  } catch (error) {
    console.error('Error tracking transcription usage:', error);
  }
};

// Function to track API calls
export const trackApiUsage = (endpoint: string) => {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (req.tenant) {
        // Update tenant usage
        req.tenant.usage.currentPeriod.apiCalls += 1;
        await req.tenant.save();

        // Create usage record
        const usageRecord = new UsageRecord({
          tenantId: req.tenant._id,
          type: 'api_call',
          details: {
            apiEndpoint: endpoint,
            metadata: {
              method: req.method,
              userAgent: req.get('User-Agent')
            }
          },
          cost: 1 // 1 cent per API call
        });
        
        await usageRecord.save();
      }
    } catch (error) {
      console.error('Error tracking API usage:', error);
    }
    
    next();
  };
};

// Function to track storage usage
export const trackStorageUsage = async (tenantId: string, storageDelta: number) => {
  try {
    const tenant = await Tenant.findById(tenantId);
    if (!tenant) return;

    // Update storage usage
    tenant.usage.currentPeriod.storageUsedMB += storageDelta;
    await tenant.save();

    // Create usage record
    const usageRecord = new UsageRecord({
      tenantId: tenant._id,
      type: 'storage_update',
      details: {
        storageDelta,
        metadata: {
          newTotal: tenant.usage.currentPeriod.storageUsedMB
        }
      },
      cost: Math.max(0, storageDelta * 0.1) // 0.1 cents per MB
    });
    
    await usageRecord.save();
  } catch (error) {
    console.error('Error tracking storage usage:', error);
  }
};

// Helper function to estimate minutes from text length
const estimateMinutesFromText = (text: string): number => {
  // Rough estimate: 150-180 words per minute of speech
  const words = text.split(' ').length;
  const estimatedMinutes = Math.ceil(words / 160);
  return Math.max(1, estimatedMinutes); // Minimum 1 minute
};

// Middleware to check subscription status
export const requireActiveSubscription = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  if (!req.tenant) {
    return res.status(400).json({ message: 'Tenant information not loaded' });
  }

  const subscription = req.tenant.subscription;
  
  if (subscription.status !== 'active') {
    return res.status(403).json({
      message: 'Subscription is not active',
      subscriptionStatus: subscription.status,
      subscriptionRequired: true
    });
  }

  // Check if subscription has expired
  if (subscription.currentPeriodEnd && new Date() > new Date(subscription.currentPeriodEnd)) {
    return res.status(403).json({
      message: 'Subscription has expired',
      subscriptionStatus: 'expired',
      subscriptionRequired: true
    });
  }

  next();
};