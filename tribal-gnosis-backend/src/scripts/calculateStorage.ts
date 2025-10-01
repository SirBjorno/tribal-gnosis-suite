import { Tenant, KnowledgeItem } from '../models';
import { connectDB } from '../config/database';

/**
 * Simple storage calculation script for immediate testing
 * Run this directly to get storage usage data
 */

async function calculateStorageUsage() {
  try {
    await connectDB();
    console.log('🔍 Calculating storage usage for all tenants...\n');

    const tenants = await Tenant.find({});
    
    if (tenants.length === 0) {
      console.log('No tenants found.');
      return;
    }

    for (const tenant of tenants) {
      console.log(`📊 Tenant: ${tenant.name} (${tenant._id})`);
      console.log(`   Company Code: ${tenant.companyCode}`);
      
      // Get all knowledge items for this tenant
      const items = await KnowledgeItem.find({ tenantId: tenant._id });
      console.log(`   Knowledge Items: ${items.length}`);
      
      // Calculate total storage
      let totalBytes = 0;
      let contentBytes = 0;
      let transcriptionBytes = 0;
      let analysisBytes = 0;
      
      for (const item of items) {
        // Calculate content size
        if (item.content) {
          const itemContentSize = Buffer.byteLength(item.content, 'utf8');
          contentBytes += itemContentSize;
          totalBytes += itemContentSize;
        }
        
        // Calculate transcription size
        if (item.transcription?.text) {
          const itemTranscriptionSize = Buffer.byteLength(item.transcription.text, 'utf8');
          transcriptionBytes += itemTranscriptionSize;
          totalBytes += itemTranscriptionSize;
        }
        
        // Calculate analysis size
        if (item.analysis) {
          let itemAnalysisSize = 0;
          if (item.analysis.summary) {
            itemAnalysisSize += Buffer.byteLength(item.analysis.summary, 'utf8');
          }
          if (item.analysis.keyPoints) {
            itemAnalysisSize += item.analysis.keyPoints.join(' ').length;
          }
          analysisBytes += itemAnalysisSize;
          totalBytes += itemAnalysisSize;
        }
        
        // Add base metadata overhead
        totalBytes += 200; // Estimated metadata overhead per item
      }
      
      const totalMB = totalBytes / 1024 / 1024;
      const totalGB = totalMB / 1024;
      
      console.log(`   📁 Content: ${Math.round(contentBytes / 1024)} KB`);
      console.log(`   📝 Transcriptions: ${Math.round(transcriptionBytes / 1024)} KB`);
      console.log(`   🧠 Analysis: ${Math.round(analysisBytes / 1024)} KB`);
      console.log(`   💾 Total Storage: ${totalMB.toFixed(2)} MB (${totalGB.toFixed(3)} GB)`);
      
      // Get subscription tier and limits
      const tier = tenant.subscription?.tier || 'STARTER';
      const limits = getTierLimits(tier);
      const usagePercent = (totalMB / (limits.storageGB * 1024)) * 100;
      
      console.log(`   📋 Subscription: ${tier}`);
      console.log(`   🎯 Storage Limit: ${limits.storageGB} GB`);
      console.log(`   📊 Usage: ${usagePercent.toFixed(1)}%`);
      
      if (usagePercent > 100) {
        const overageGB = totalGB - limits.storageGB;
        const overageCost = overageGB * 0.10; // $0.10 per GB overage
        console.log(`   ⚠️  OVERAGE: ${overageGB.toFixed(3)} GB ($${overageCost.toFixed(2)})`);
      }
      
      console.log(''); // Empty line for readability
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error calculating storage:', error);
    process.exit(1);
  }
}

function getTierLimits(tier: string) {
  const limits: Record<string, { storageGB: number }> = {
    STARTER: { storageGB: 1 },
    GROWTH: { storageGB: 10 },
    PROFESSIONAL: { storageGB: 50 },
    ENTERPRISE: { storageGB: 200 },
    ENTERPRISE_PLUS: { storageGB: 500 }
  };
  return limits[tier] || limits.STARTER;
}

// Run the calculation
calculateStorageUsage();