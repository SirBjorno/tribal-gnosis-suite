/**
 * STORAGE MANAGEMENT API ENDPOINTS
 * Add these to your main index.ts file
 */

import StorageUsageService from './services/storageUsageService';

// Initialize storage service
const storageService = new StorageUsageService();

// Get storage usage for specific tenant
app.get('/api/storage/:tenantId', async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.params;
    const usage = await storageService.calculateTenantUsage(tenantId);
    res.status(200).json(usage);
  } catch (error) {
    console.error('Storage usage fetch error:', error);
    res.status(500).json({ message: 'Failed to fetch storage usage' });
  }
});

// Update storage usage for all tenants (admin only)
app.post('/api/storage/update-all', async (req: Request, res: Response) => {
  try {
    const results = await storageService.updateAllTenantUsage();
    res.status(200).json({
      message: 'Storage usage updated for all tenants',
      tenantsUpdated: results.length,
      totalStorageGB: results.reduce((sum, r) => sum + r.totalSizeGB, 0),
      results
    });
  } catch (error) {
    console.error('Bulk storage update error:', error);
    res.status(500).json({ message: 'Failed to update storage usage' });
  }
});

// Check storage limit violations (admin only)
app.get('/api/storage/violations', async (req: Request, res: Response) => {
  try {
    const violations = await storageService.checkStorageLimits();
    res.status(200).json({
      violationCount: violations.length,
      totalOverageRevenue: violations.reduce((sum, v) => sum + v.billingImpact, 0),
      violations
    });
  } catch (error) {
    console.error('Storage violations check error:', error);
    res.status(500).json({ message: 'Failed to check storage violations' });
  }
});

// Get storage analytics (admin dashboard)
app.get('/api/storage/analytics', async (req: Request, res: Response) => {
  try {
    const tenants = await Tenant.find({});
    const analytics = await Promise.all(
      tenants.map(async (tenant) => {
        const usage = await storageService.calculateTenantUsage(tenant._id.toString());
        const tierLimits = storageService.getTierLimits(tenant.subscription?.tier);
        return {
          tenantId: tenant._id,
          tenantName: tenant.name,
          tier: tenant.subscription?.tier,
          usage: usage.totalSizeGB,
          limit: tierLimits.storageGB,
          utilizationPercent: Math.round((usage.totalSizeGB / tierLimits.storageGB) * 100),
          potentialOverageRevenue: usage.totalSizeGB > tierLimits.storageGB ? 
            (usage.totalSizeGB - tierLimits.storageGB) * tierLimits.pricePerGB : 0
        };
      })
    );

    const summary = {
      totalTenants: tenants.length,
      totalStorageUsedGB: analytics.reduce((sum, a) => sum + a.usage, 0),
      averageUtilization: analytics.reduce((sum, a) => sum + a.utilizationPercent, 0) / analytics.length,
      overageRevenue: analytics.reduce((sum, a) => sum + a.potentialOverageRevenue, 0),
      tenantsOverLimit: analytics.filter(a => a.utilizationPercent > 100).length
    };

    res.status(200).json({ summary, tenants: analytics });
  } catch (error) {
    console.error('Storage analytics error:', error);
    res.status(500).json({ message: 'Failed to generate storage analytics' });
  }
});