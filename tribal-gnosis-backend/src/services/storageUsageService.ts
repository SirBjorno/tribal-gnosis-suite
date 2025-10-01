import { Tenant } from '../models';
import { connectDB } from '../config/database';

/**
 * IMMEDIATE IMPLEMENTATION: Storage Usage Tracker
 * 
 * This service calculates and tracks storage usage per tenant
 * for accurate billing and usage monitoring.
 */

export interface StorageUsageResult {
  tenantId: string;
  totalSizeBytes: number;
  totalSizeMB: number;
  totalSizeGB: number;
  itemCount: number;
  breakdown: {
    knowledgeItems: number;
    transcriptions: number;
    analyses: number;
    metadata: number;
  };
  lastCalculated: Date;
}

export class StorageUsageService {
  
  /**
   * Calculate accurate storage usage for a tenant
   */
  async calculateTenantUsage(tenantId: string): Promise<StorageUsageResult> {
    try {
      await connectDB();
      
      // Use MongoDB aggregation for accurate size calculation
      const pipeline = [
        { $match: { tenantId: tenantId } },
        {
          $project: {
            contentSize: { $strLenBytes: { $ifNull: ["$content", ""] } },
            titleSize: { $strLenBytes: { $ifNull: ["$title", ""] } },
            transcriptionSize: { 
              $strLenBytes: { $ifNull: ["$transcription.text", ""] } 
            },
            analysisSize: {
              $add: [
                { $strLenBytes: { $ifNull: ["$analysis.summary", ""] } },
                { 
                  $multiply: [
                    { $size: { $ifNull: ["$analysis.keyPoints", []] } },
                    20 // Average key point length
                  ]
                }
              ]
            },
            metadataSize: {
              $add: [
                { $strLenBytes: { $ifNull: ["$metadata.source", ""] } },
                { $strLenBytes: { $ifNull: ["$metadata.languageCode", ""] } },
                50 // Base metadata overhead
              ]
            }
          }
        },
        {
          $group: {
            _id: null,
            totalContentSize: { $sum: "$contentSize" },
            totalTranscriptionSize: { $sum: "$transcriptionSize" },
            totalAnalysisSize: { $sum: "$analysisSize" },
            totalMetadataSize: { $sum: "$metadataSize" },
            itemCount: { $sum: 1 }
          }
        }
      ];

      const KnowledgeItem = require('../models').KnowledgeItem;
      const results = await KnowledgeItem.aggregate(pipeline);
      
      if (!results || results.length === 0) {
        return {
          tenantId,
          totalSizeBytes: 0,
          totalSizeMB: 0,
          totalSizeGB: 0,
          itemCount: 0,
          breakdown: {
            knowledgeItems: 0,
            transcriptions: 0,
            analyses: 0,
            metadata: 0
          },
          lastCalculated: new Date()
        };
      }

      const result = results[0];
      const totalBytes = 
        (result.totalContentSize || 0) +
        (result.totalTranscriptionSize || 0) +
        (result.totalAnalysisSize || 0) +
        (result.totalMetadataSize || 0);

      return {
        tenantId,
        totalSizeBytes: totalBytes,
        totalSizeMB: Math.round((totalBytes / 1024 / 1024) * 100) / 100,
        totalSizeGB: Math.round((totalBytes / 1024 / 1024 / 1024) * 100) / 100,
        itemCount: result.itemCount || 0,
        breakdown: {
          knowledgeItems: Math.round((result.totalContentSize || 0) / 1024 / 1024 * 100) / 100,
          transcriptions: Math.round((result.totalTranscriptionSize || 0) / 1024 / 1024 * 100) / 100,
          analyses: Math.round((result.totalAnalysisSize || 0) / 1024 / 1024 * 100) / 100,
          metadata: Math.round((result.totalMetadataSize || 0) / 1024 / 1024 * 100) / 100
        },
        lastCalculated: new Date()
      };

    } catch (error) {
      console.error(`Storage calculation error for tenant ${tenantId}:`, error);
      throw new Error(`Failed to calculate storage usage: ${error}`);
    }
  }

  /**
   * Update storage usage for all tenants
   */
  async updateAllTenantUsage(): Promise<StorageUsageResult[]> {
    try {
      const tenants = await Tenant.find({});
      const results: StorageUsageResult[] = [];

      for (const tenant of tenants) {
        const usage = await this.calculateTenantUsage(tenant._id.toString());
        
        // Update tenant document with current usage
        await Tenant.findByIdAndUpdate(tenant._id, {
          'usage.currentPeriod.storageUsedMB': usage.totalSizeMB,
          'usage.lastUpdated': new Date(),
          'usage.storageBreakdown': usage.breakdown
        });

        results.push(usage);
        console.log(`Updated storage for ${tenant.name}: ${usage.totalSizeMB}MB`);
      }

      return results;
    } catch (error) {
      console.error('Bulk storage update error:', error);
      throw error;
    }
  }

  /**
   * Check for storage limit violations and generate billing alerts
   */
  async checkStorageLimits(): Promise<any[]> {
    try {
      const tenants = await Tenant.find({});
      const violations = [];

      for (const tenant of tenants) {
        const usage = tenant.usage?.currentPeriod?.storageUsedMB || 0;
        const tierLimits = this.getTierLimits(tenant.subscription?.tier);
        const usagePercent = (usage / tierLimits.storageGB / 1024) * 100;

        if (usagePercent >= 80) {
          violations.push({
            tenantId: tenant._id,
            tenantName: tenant.name,
            currentUsageMB: usage,
            limitMB: tierLimits.storageGB * 1024,
            usagePercent: Math.round(usagePercent),
            overageAmount: usage > (tierLimits.storageGB * 1024) ? 
              usage - (tierLimits.storageGB * 1024) : 0,
            billingImpact: this.calculateOverageCost(usage, tierLimits.storageGB * 1024)
          });
        }
      }

      return violations;
    } catch (error) {
      console.error('Storage limits check error:', error);
      return [];
    }
  }

  public getTierLimits(tier: string) {
    const limits: Record<string, { storageGB: number; pricePerGB: number }> = {
      STARTER: { storageGB: 1, pricePerGB: 0.10 },
      GROWTH: { storageGB: 10, pricePerGB: 0.10 },
      PROFESSIONAL: { storageGB: 50, pricePerGB: 0.08 },
      ENTERPRISE: { storageGB: 200, pricePerGB: 0.05 },
      ENTERPRISE_PLUS: { storageGB: 500, pricePerGB: 0.05 }
    };
    return limits[tier] || limits.STARTER;
  }

  private calculateOverageCost(usageMB: number, limitMB: number): number {
    if (usageMB <= limitMB) return 0;
    
    const overageMB = usageMB - limitMB;
    const overageGB = overageMB / 1024;
    return Math.round(overageGB * 0.10 * 100) / 100; // $0.10 per GB overage
  }
}

export default StorageUsageService;