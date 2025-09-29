// Frontend service for subscription management
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

export interface SubscriptionTier {
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

export interface CreateSubscriptionRequest {
  priceId: string;
  paymentMethodId?: string;
}

export interface UpdateSubscriptionRequest {
  priceId: string;
}

export interface SubscriptionResponse {
  subscription: any;
  clientSecret?: string; // For payment confirmation
}

class SubscriptionService {
  private getAuthHeaders(): HeadersInit {
    const token = localStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };
  }

  async getTiers(): Promise<Record<string, SubscriptionTier>> {
    const response = await fetch(`${API_BASE_URL}/api/subscription/tiers`);
    if (!response.ok) {
      throw new Error('Failed to fetch subscription tiers');
    }
    return response.json();
  }

  async getCurrentSubscription(): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/api/subscription/current`, {
      headers: this.getAuthHeaders()
    });
    if (!response.ok) {
      throw new Error('Failed to fetch current subscription');
    }
    return response.json();
  }

  async getUsageStats(): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/api/subscription/usage`, {
      headers: this.getAuthHeaders()
    });
    if (!response.ok) {
      throw new Error('Failed to fetch usage statistics');
    }
    return response.json();
  }

  async getBillingHistory(): Promise<any[]> {
    const response = await fetch(`${API_BASE_URL}/api/subscription/billing-history`, {
      headers: this.getAuthHeaders()
    });
    if (!response.ok) {
      throw new Error('Failed to fetch billing history');
    }
    return response.json();
  }

  async getRecommendations(): Promise<any[]> {
    const response = await fetch(`${API_BASE_URL}/api/subscription/recommendations`, {
      headers: this.getAuthHeaders()
    });
    if (!response.ok) {
      throw new Error('Failed to fetch recommendations');
    }
    return response.json();
  }

  async createSubscription(request: CreateSubscriptionRequest): Promise<SubscriptionResponse> {
    const response = await fetch(`${API_BASE_URL}/api/subscription/create`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(request)
    });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Failed to create subscription' }));
      throw new Error(error.message || 'Failed to create subscription');
    }
    
    return response.json();
  }

  async updateSubscription(request: UpdateSubscriptionRequest): Promise<SubscriptionResponse> {
    const response = await fetch(`${API_BASE_URL}/api/subscription/update`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(request)
    });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Failed to update subscription' }));
      throw new Error(error.message || 'Failed to update subscription');
    }
    
    return response.json();
  }

  async cancelSubscription(): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/api/subscription/cancel`, {
      method: 'POST',
      headers: this.getAuthHeaders()
    });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Failed to cancel subscription' }));
      throw new Error(error.message || 'Failed to cancel subscription');
    }
  }

  async createBillingPortalSession(): Promise<{ url: string }> {
    const response = await fetch(`${API_BASE_URL}/api/subscription/billing-portal`, {
      method: 'POST',
      headers: this.getAuthHeaders()
    });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Failed to create billing portal session' }));
      throw new Error(error.message || 'Failed to create billing portal session');
    }
    
    return response.json();
  }

  // Utility methods for frontend usage
  async checkFeatureAccess(feature: string): Promise<boolean> {
    try {
      const subscription = await this.getCurrentSubscription();
      return subscription?.features?.[feature] || false;
    } catch {
      return false;
    }
  }

  async checkUsageLimit(type: 'minutes' | 'apiCalls'): Promise<{ hasLimit: boolean; used: number; limit: number; percentage: number }> {
    try {
      const usage = await this.getUsageStats();
      const used = type === 'minutes' ? usage.minutesUsed : usage.apiCallsUsed;
      const limit = type === 'minutes' ? usage.minutesLimit : usage.apiCallsLimit;
      
      return {
        hasLimit: limit !== -1,
        used,
        limit,
        percentage: limit === -1 ? 0 : (used / limit) * 100
      };
    } catch {
      return { hasLimit: true, used: 0, limit: 0, percentage: 0 };
    }
  }

  // Format tier names for display
  formatTierName(tierKey: string): string {
    return tierKey
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }

  // Calculate cost estimates
  calculateEstimatedCost(minutesPerMonth: number, tier: SubscriptionTier): number {
    if (tier.price === 0 || minutesPerMonth <= tier.minutesPerMonth) {
      return tier.price;
    }
    
    // This is a simplified calculation - in reality you'd need overage rates
    return tier.price;
  }

  // Get upgrade recommendations based on usage
  getUpgradeRecommendation(usage: any, tiers: Record<string, SubscriptionTier>, currentTier: string): string | null {
    const tierOrder = ['STARTER', 'GROWTH', 'PROFESSIONAL', 'ENTERPRISE', 'ENTERPRISE_PLUS'];
    const currentIndex = tierOrder.indexOf(currentTier);
    
    if (currentIndex === -1) return null;
    
    // Check if user is approaching limits
    const current = tiers[currentTier];
    if (!current) return null;
    
    const minutesPercentage = current.minutesPerMonth === -1 ? 0 : (usage.minutesUsed / current.minutesPerMonth) * 100;
    const apiCallsPercentage = current.maxUsers === -1 ? 0 : (usage.apiCallsUsed / (current.maxUsers * 1000)) * 100; // Rough estimate
    
    if (minutesPercentage > 80 || apiCallsPercentage > 80) {
      const nextTierIndex = currentIndex + 1;
      if (nextTierIndex < tierOrder.length) {
        return tierOrder[nextTierIndex];
      }
    }
    
    return null;
  }
}

export const subscriptionService = new SubscriptionService();
export default subscriptionService;