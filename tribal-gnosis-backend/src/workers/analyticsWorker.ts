import { Tenant, User, KnowledgeItem } from '../models';
import { connectDB } from '../config/database';

/**
 * PRIORITY WORKER #2: Analytics & Usage Intelligence
 * 
 * This worker:
 * - Tracks user engagement patterns
 * - Generates usage insights for pricing optimization
 * - Identifies churn risk and upsell opportunities
 * - Creates automated reports for stakeholders
 */

interface UsageAnalytics {
  tenantId: string;
  activeUsers: number;
  transcriptionMinutes: number;
  analysisRequests: number;
  storageGrowthRate: number;
  engagementScore: number;
  churnRisk: 'low' | 'medium' | 'high';
  upsellOpportunity: boolean;
  generatedAt: Date;
}

export class AnalyticsWorker {
  
  async generateTenantAnalytics(tenantId: string): Promise<UsageAnalytics> {
    try {
      const tenant = await Tenant.findById(tenantId);
      if (!tenant) throw new Error(`Tenant ${tenantId} not found`);
      
      // Get active users (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const activeUsers = await User.countDocuments({
        tenantId,
        lastLogin: { $gte: thirtyDaysAgo }
      });
      
      // Get knowledge items created this month
      const monthStart = new Date();
      monthStart.setDate(1);
      monthStart.setHours(0, 0, 0, 0);
      
      const monthlyItems = await KnowledgeItem.countDocuments({
        tenantId,
        createdAt: { $gte: monthStart }
      });
      
      // Calculate engagement score (0-100)
      const totalUsers = await User.countDocuments({ tenantId });
      const engagementRate = totalUsers > 0 ? (activeUsers / totalUsers) : 0;
      const usageRate = tenant.usage?.currentPeriod?.transcriptionMinutes || 0;
      const tierLimits = this.getTierLimits(tenant.subscription?.tier);
      
      const engagementScore = Math.round(
        (engagementRate * 50) + 
        ((usageRate / tierLimits.minutes) * 30) +
        (monthlyItems > 10 ? 20 : (monthlyItems * 2))
      );
      
      // Determine churn risk
      const churnRisk = this.calculateChurnRisk(engagementScore, activeUsers, usageRate);
      
      // Identify upsell opportunities
      const upsellOpportunity = this.identifyUpsellOpportunity(tenant, usageRate, engagementScore);
      
      return {
        tenantId,
        activeUsers,
        transcriptionMinutes: usageRate,
        analysisRequests: monthlyItems,
        storageGrowthRate: 0, // Calculate based on historical data
        engagementScore,
        churnRisk,
        upsellOpportunity,
        generatedAt: new Date()
      };
      
    } catch (error) {
      console.error(`Analytics generation error for tenant ${tenantId}:`, error);
      throw error;
    }
  }
  
  private getTierLimits(tier: string) {
    const limits: Record<string, { minutes: number; storage: number }> = {
      STARTER: { minutes: 100, storage: 1024 },
      GROWTH: { minutes: 1000, storage: 10240 },
      PROFESSIONAL: { minutes: 5000, storage: 51200 },
      ENTERPRISE: { minutes: 15000, storage: 204800 }
    };
    return limits[tier] || limits.STARTER;
  }
  
  private calculateChurnRisk(engagementScore: number, activeUsers: number, usage: number): 'low' | 'medium' | 'high' {
    if (engagementScore < 30 || activeUsers === 0 || usage < 10) return 'high';
    if (engagementScore < 60 || activeUsers < 2) return 'medium';
    return 'low';
  }
  
  private identifyUpsellOpportunity(tenant: any, usage: number, engagementScore: number): boolean {
    const currentLimits = this.getTierLimits(tenant.subscription?.tier);
    const usagePercentage = (usage / currentLimits.minutes) * 100;
    
    return usagePercentage > 80 && engagementScore > 70;
  }
  
  async generatePlatformReport(): Promise<void> {
    try {
      const tenants = await Tenant.find({});
      const analytics = await Promise.all(
        tenants.map(tenant => this.generateTenantAnalytics(tenant._id.toString()))
      );
      
      const summary = {
        totalTenants: tenants.length,
        activeTenantsRate: analytics.filter(a => a.activeUsers > 0).length / tenants.length,
        averageEngagement: analytics.reduce((sum, a) => sum + a.engagementScore, 0) / analytics.length,
        churnRiskCount: analytics.filter(a => a.churnRisk === 'high').length,
        upsellOpportunities: analytics.filter(a => a.upsellOpportunity).length,
        generatedAt: new Date()
      };
      
      console.log('Platform Analytics Summary:', summary);
      
      // Here you could send this to Slack, email, or save to database
      
    } catch (error) {
      console.error('Platform report generation error:', error);
    }
  }
}

// Background job runner
export const runAnalyticsWorker = async () => {
  const worker = new AnalyticsWorker();
  
  // Generate platform reports daily
  setInterval(async () => {
    console.log('Generating daily platform analytics...');
    await worker.generatePlatformReport();
  }, 24 * 60 * 60 * 1000); // 24 hours
};

if (require.main === module) {
  runAnalyticsWorker();
}