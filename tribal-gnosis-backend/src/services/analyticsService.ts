import { Request, Response } from 'express';
import { Tenant, User, UsageRecord } from '../models';

export interface AnalyticsData {
    userMetrics: {
        totalUsers: number;
        activeUsers: number;
        newUsers: number;
        userGrowthRate: number;
        usersByRole: { role: string; count: number; color: string }[];
        dailyActiveUsers: { date: string; users: number }[];
    };
    subscriptionMetrics: {
        totalRevenue: number;
        monthlyRecurringRevenue: number;
        subscriptionsByTier: { tier: string; count: number; revenue: number; color: string }[];
        churnRate: number;
        revenueGrowth: number;
        revenueOverTime: { date: string; revenue: number; subscriptions: number }[];
    };
    usageMetrics: {
        totalMinutesProcessed: number;
        totalStorageUsed: number;
        averageSessionDuration: number;
        usageByFeature: { feature: string; usage: number; color: string }[];
        usageOverTime: { date: string; minutes: number; storage: number }[];
    };
    engagementMetrics: {
        averageSessionsPerUser: number;
        bounceRate: number;
        retentionRate: number;
        topFeatures: { feature: string; usage: number; growth: number }[];
        engagementOverTime: { date: string; sessions: number; duration: number }[];
    };
}

export class AnalyticsService {
    private static readonly ROLE_COLORS = {
        admin: '#ef4444',
        manager: '#3b82f6',
        member: '#10b981',
        viewer: '#6b7280'
    };

    private static readonly TIER_COLORS = {
        free: '#6b7280',
        professional: '#3b82f6',
        enterprise: '#8b5cf6'
    };

    private static readonly FEATURE_COLORS = {
        transcription: '#8884d8',
        analysis: '#82ca9d',
        search: '#ffc658',
        knowledgeBase: '#ff7c7c',
        realTime: '#8dd1e1'
    };

    static async getAnalytics(tenantId?: string, dateRange: string = '30d'): Promise<AnalyticsData> {
        const days = this.parseDateRange(dateRange);
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);
        
        const previousStartDate = new Date(startDate);
        previousStartDate.setDate(previousStartDate.getDate() - days);

        try {
            const [userMetrics, subscriptionMetrics, usageMetrics, engagementMetrics] = await Promise.all([
                this.getUserMetrics(startDate, previousStartDate, tenantId),
                this.getSubscriptionMetrics(startDate, previousStartDate, tenantId),
                this.getUsageMetrics(startDate, tenantId),
                this.getEngagementMetrics(startDate, tenantId)
            ]);

            return {
                userMetrics,
                subscriptionMetrics,
                usageMetrics,
                engagementMetrics
            };
        } catch (error) {
            console.error('Error getting analytics:', error);
            throw new Error('Failed to generate analytics data');
        }
    }

    private static async getUserMetrics(startDate: Date, previousStartDate: Date, tenantId?: string) {
        const userFilter = tenantId ? { tenantId } : {};
        
        // Current period users
        const totalUsers = await User.countDocuments({
            ...userFilter,
            createdAt: { $gte: startDate }
        });

        const activeUsers = await User.countDocuments({
            ...userFilter,
            lastLogin: { $gte: startDate },
            status: 'active'
        });

        const newUsers = await User.countDocuments({
            ...userFilter,
            createdAt: { $gte: startDate }
        });

        // Previous period for growth calculation
        const previousTotalUsers = await User.countDocuments({
            ...userFilter,
            createdAt: { $gte: previousStartDate, $lt: startDate }
        });

        const userGrowthRate = previousTotalUsers > 0 
            ? ((totalUsers - previousTotalUsers) / previousTotalUsers) * 100 
            : 0;

        // Users by role
        const usersByRoleData = await User.aggregate([
            { $match: userFilter },
            { $group: { _id: '$role', count: { $sum: 1 } } },
            { $sort: { count: -1 } }
        ]);

        const usersByRole = usersByRoleData.map(item => ({
            role: item._id || 'unknown',
            count: item.count,
            color: this.ROLE_COLORS[item._id as keyof typeof this.ROLE_COLORS] || '#6b7280'
        }));

        // Daily active users for the period
        const dailyActiveUsers = await this.getDailyActiveUsers(startDate, tenantId);

        return {
            totalUsers,
            activeUsers,
            newUsers,
            userGrowthRate,
            usersByRole,
            dailyActiveUsers
        };
    }

    private static async getSubscriptionMetrics(startDate: Date, previousStartDate: Date, tenantId?: string) {
        const tenantFilter = tenantId ? { _id: tenantId } : {};
        
        // Get tenant subscription data
        const tenants = await Tenant.find({
            ...tenantFilter,
            'subscription.status': { $in: ['active', 'trialing'] }
        });

        const totalRevenue: number = tenants.reduce((sum: number, tenant: any) => {
            // Calculate revenue based on tier pricing
            const subscription = tenant.subscription;
            if (subscription?.tier) {
                const { SUBSCRIPTION_TIERS } = require('../models');
                const tierData = SUBSCRIPTION_TIERS[subscription.tier];
                return sum + (tierData?.price || 0);
            }
            return sum;
        }, 0);

        // Calculate MRR (Monthly Recurring Revenue)
        const monthlyRecurringRevenue: number = tenants.reduce((sum: number, tenant: any) => {
            const subscription = tenant.subscription;
            if (subscription?.tier) {
                const { SUBSCRIPTION_TIERS } = require('../models');
                const tierData = SUBSCRIPTION_TIERS[subscription.tier];
                return sum + (tierData?.price || 0); // Assuming monthly pricing
            }
            return sum;
        }, 0);

        // Subscriptions by tier
        const subscriptionsByTierData = await Tenant.aggregate([
            { $match: { ...tenantFilter, 'subscription.tier': { $exists: true } } },
            { 
                $group: { 
                    _id: '$subscription.tier', 
                    count: { $sum: 1 }
                } 
            },
            { $sort: { count: -1 } }
        ]);

        const subscriptionsByTier = subscriptionsByTierData.map(item => {
            const { SUBSCRIPTION_TIERS } = require('../models');
            const tierData = SUBSCRIPTION_TIERS[item._id];
            return {
                tier: item._id || 'unknown',
                count: item.count,
                revenue: (tierData?.price || 0) * item.count,
                color: this.TIER_COLORS[item._id as keyof typeof this.TIER_COLORS] || '#6b7280'
            };
        });

        // Calculate churn rate (simplified)
        const totalSubscriptions = tenants.length;
        const canceledSubscriptions = await Tenant.countDocuments({
            ...tenantFilter,
            'subscription.status': 'canceled',
            'subscription.canceledAt': { $gte: startDate }
        });

        const churnRate = totalSubscriptions > 0 ? (canceledSubscriptions / totalSubscriptions) * 100 : 0;

        // Revenue growth (simplified - comparing current to previous period)
        const previousRevenue = await this.getPreviousPeriodRevenue(previousStartDate, startDate, tenantId);
        const revenueGrowth = previousRevenue > 0 ? ((totalRevenue - previousRevenue) / previousRevenue) * 100 : 0;

        // Revenue over time
        const revenueOverTime = await this.getRevenueOverTime(startDate, tenantId);

        return {
            totalRevenue,
            monthlyRecurringRevenue,
            subscriptionsByTier,
            churnRate,
            revenueGrowth,
            revenueOverTime
        };
    }

    private static async getUsageMetrics(startDate: Date, tenantId?: string) {
        const usageFilter = tenantId ? { tenantId } : {};
        
        // Usage records for the period
        const usageRecords = await UsageRecord.find({
            ...usageFilter,
            date: { $gte: startDate }
        });

        const totalMinutesProcessed = usageRecords.reduce((sum, record) => sum + (record.minutes || 0), 0);
        const totalStorageUsed = usageRecords.reduce((sum, record) => sum + (record.storage || 0), 0);

        // Calculate average session duration (mock data - you'd track this separately)
        const averageSessionDuration = 15; // minutes

        // Usage by feature (mock data - you'd track this in your app)
        const usageByFeature = [
            { feature: 'Transcription', usage: totalMinutesProcessed * 0.4, color: this.FEATURE_COLORS.transcription },
            { feature: 'Analysis', usage: totalMinutesProcessed * 0.3, color: this.FEATURE_COLORS.analysis },
            { feature: 'Search', usage: totalMinutesProcessed * 0.15, color: this.FEATURE_COLORS.search },
            { feature: 'Knowledge Base', usage: totalMinutesProcessed * 0.1, color: this.FEATURE_COLORS.knowledgeBase },
            { feature: 'Real-time', usage: totalMinutesProcessed * 0.05, color: this.FEATURE_COLORS.realTime }
        ].filter(item => item.usage > 0);

        // Usage over time
        const usageOverTime = await this.getUsageOverTime(startDate, tenantId);

        return {
            totalMinutesProcessed,
            totalStorageUsed,
            averageSessionDuration,
            usageByFeature,
            usageOverTime
        };
    }

    private static async getEngagementMetrics(startDate: Date, tenantId?: string) {
        const userFilter = tenantId ? { tenantId } : {};
        
        // Get active users
        const activeUsers = await User.find({
            ...userFilter,
            lastLogin: { $gte: startDate },
            status: 'active'
        });

        // Calculate average sessions per user (mock - you'd track this)
        const averageSessionsPerUser = 3.2;

        // Calculate bounce rate (mock - based on single-session users)
        const bounceRate = 15.5;

        // Calculate retention rate
        const totalUsers = await User.countDocuments(userFilter);
        const retentionRate = totalUsers > 0 ? (activeUsers.length / totalUsers) * 100 : 0;

        // Top features with growth
        const topFeatures = [
            { feature: 'Transcription', usage: 1250, growth: 12.5 },
            { feature: 'Analysis', usage: 890, growth: 8.3 },
            { feature: 'Search', usage: 650, growth: -2.1 },
            { feature: 'Knowledge Base', usage: 420, growth: 15.7 },
            { feature: 'Real-time', usage: 180, growth: 25.4 }
        ];

        // Engagement over time
        const engagementOverTime = await this.getEngagementOverTime(startDate, tenantId);

        return {
            averageSessionsPerUser,
            bounceRate,
            retentionRate,
            topFeatures,
            engagementOverTime
        };
    }

    private static async getDailyActiveUsers(startDate: Date, tenantId?: string) {
        const userFilter = tenantId ? { tenantId } : {};
        const days = [];
        const currentDate = new Date(startDate);
        
        for (let i = 0; i < 30; i++) {
            const dayStart = new Date(currentDate);
            const dayEnd = new Date(currentDate);
            dayEnd.setDate(dayEnd.getDate() + 1);
            
            const activeUsers = await User.countDocuments({
                ...userFilter,
                lastLogin: { $gte: dayStart, $lt: dayEnd }
            });
            
            days.push({
                date: dayStart.toISOString().split('T')[0],
                users: activeUsers
            });
            
            currentDate.setDate(currentDate.getDate() + 1);
        }
        
        return days;
    }

    private static async getPreviousPeriodRevenue(startDate: Date, endDate: Date, tenantId?: string): Promise<number> {
        const tenantFilter = tenantId ? { _id: tenantId } : {};
        
        const tenants = await Tenant.find({
            ...tenantFilter,
            'subscription.status': { $in: ['active', 'trialing'] },
            'subscription.createdAt': { $gte: startDate, $lt: endDate }
        });

        return tenants.reduce((sum: number, tenant: any) => {
            if (tenant.subscription?.tier) {
                const { SUBSCRIPTION_TIERS } = require('../models');
                const tierData = SUBSCRIPTION_TIERS[tenant.subscription.tier];
                return sum + (tierData?.price || 0);
            }
            return sum;
        }, 0);
    }

    private static async getRevenueOverTime(startDate: Date, tenantId?: string) {
        // Mock data - you'd implement proper revenue tracking
        const days = [];
        const currentDate = new Date(startDate);
        
        for (let i = 0; i < 30; i++) {
            days.push({
                date: currentDate.toISOString().split('T')[0],
                revenue: Math.random() * 5000 + 1000, // Mock data
                subscriptions: Math.floor(Math.random() * 10) + 5 // Mock data
            });
            
            currentDate.setDate(currentDate.getDate() + 1);
        }
        
        return days;
    }

    private static async getUsageOverTime(startDate: Date, tenantId?: string) {
        const usageFilter = tenantId ? { tenantId } : {};
        
        const usageByDay = await UsageRecord.aggregate([
            {
                $match: {
                    ...usageFilter,
                    date: { $gte: startDate }
                }
            },
            {
                $group: {
                    _id: {
                        $dateToString: { format: "%Y-%m-%d", date: "$date" }
                    },
                    minutes: { $sum: "$minutes" },
                    storage: { $sum: "$storage" }
                }
            },
            {
                $sort: { "_id": 1 }
            }
        ]);

        return usageByDay.map(day => ({
            date: day._id,
            minutes: day.minutes || 0,
            storage: day.storage || 0
        }));
    }

    private static async getEngagementOverTime(startDate: Date, tenantId?: string) {
        // Mock data - you'd implement proper engagement tracking
        const days = [];
        const currentDate = new Date(startDate);
        
        for (let i = 0; i < 30; i++) {
            days.push({
                date: currentDate.toISOString().split('T')[0],
                sessions: Math.floor(Math.random() * 100) + 50, // Mock data
                duration: Math.floor(Math.random() * 30) + 10 // Mock data
            });
            
            currentDate.setDate(currentDate.getDate() + 1);
        }
        
        return days;
    }

    private static parseDateRange(range: string): number {
        switch (range) {
            case '7d': return 7;
            case '30d': return 30;
            case '90d': return 90;
            case '1y': return 365;
            default: return 30;
        }
    }
}

// Express route handlers
export const getAnalytics = async (req: Request, res: Response) => {
    try {
        const { tenantId } = req.params;
        const { range = '30d' } = req.query;
        
        // Verify user has access to this tenant's analytics
        const user = (req as any).user;
        if (tenantId && user.tenantId !== tenantId && user.role !== 'admin') {
            return res.status(403).json({ message: 'Unauthorized access to tenant analytics' });
        }
        
        const analytics = await AnalyticsService.getAnalytics(tenantId, range as string);
        
        res.status(200).json(analytics);
        
    } catch (error) {
        console.error('Error getting analytics:', error);
        res.status(500).json({ 
            message: 'Failed to retrieve analytics data',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};

export const getGlobalAnalytics = async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;
        
        // Only admins can access global analytics
        if (user.role !== 'admin') {
            return res.status(403).json({ message: 'Admin access required for global analytics' });
        }
        
        const { range = '30d' } = req.query;
        const analytics = await AnalyticsService.getAnalytics(undefined, range as string);
        
        res.status(200).json(analytics);
        
    } catch (error) {
        console.error('Error getting global analytics:', error);
        res.status(500).json({ 
            message: 'Failed to retrieve global analytics data',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};