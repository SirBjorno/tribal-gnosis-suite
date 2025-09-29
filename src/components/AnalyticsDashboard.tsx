import React, { useState, useEffect } from 'react';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    LineChart,
    Line,
    PieChart,
    Pie,
    Cell,
    AreaChart,
    Area,
    ResponsiveContainer
} from 'recharts';
import {
    Users,
    TrendingUp,
    DollarSign,
    Activity,
    Calendar,
    Download,
    Filter,
    RefreshCw,
    BarChart3,
    PieChart as PieChartIcon,
    LineChart as LineChartIcon
} from 'lucide-react';
import ErrorMessage from './ErrorMessage';
import Loader from './Loader';

interface AnalyticsData {
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

interface AnalyticsDashboardProps {
    tenantId?: string;
}

const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7c7c', '#8dd1e1', '#d084d0'];

export const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({ tenantId }) => {
    const [data, setData] = useState<AnalyticsData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string>('');
    const [dateRange, setDateRange] = useState('30d');
    const [selectedMetric, setSelectedMetric] = useState<'users' | 'revenue' | 'usage' | 'engagement'>('users');
    const [isRefreshing, setIsRefreshing] = useState(false);

    useEffect(() => {
        loadAnalyticsData();
    }, [tenantId, dateRange]);

    const loadAnalyticsData = async () => {
        try {
            setIsLoading(true);
            setError('');

            const authToken = localStorage.getItem('auth_token');
            const headers = {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            };

            const endpoint = tenantId 
                ? `/api/analytics/${tenantId}?range=${dateRange}`
                : `/api/analytics?range=${dateRange}`;

            const response = await fetch(endpoint, { headers });

            if (!response.ok) {
                throw new Error('Failed to load analytics data');
            }

            const analyticsData = await response.json();
            setData(analyticsData);

        } catch (error) {
            console.error('Error loading analytics:', error);
            setError(error instanceof Error ? error.message : 'Failed to load analytics data');
        } finally {
            setIsLoading(false);
        }
    };

    const handleRefresh = async () => {
        setIsRefreshing(true);
        await loadAnalyticsData();
        setIsRefreshing(false);
    };

    const exportData = () => {
        if (!data) return;
        
        const exportData = {
            generatedAt: new Date().toISOString(),
            dateRange,
            ...data
        };
        
        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `tribal-gnosis-analytics-${dateRange}-${Date.now()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(amount);
    };

    const formatNumber = (num: number) => {
        return new Intl.NumberFormat('en-US').format(num);
    };

    const formatPercentage = (num: number) => {
        return `${num.toFixed(1)}%`;
    };

    if (isLoading) {
        return (
            <div className="p-6">
                <div className="flex items-center justify-center h-64">
                    <Loader />
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-6">
                <ErrorMessage message={error} />
                <button
                    onClick={loadAnalyticsData}
                    className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                    Try Again
                </button>
            </div>
        );
    }

    if (!data) {
        return (
            <div className="p-6">
                <div className="text-center py-12">
                    <BarChart3 className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No analytics data</h3>
                    <p className="mt-1 text-sm text-gray-500">Analytics data will appear here once available.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h1>
                    <p className="text-gray-600">Comprehensive insights into your platform performance</p>
                </div>
                <div className="flex space-x-3">
                    <select
                        value={dateRange}
                        onChange={(e) => setDateRange(e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                        <option value="7d">Last 7 days</option>
                        <option value="30d">Last 30 days</option>
                        <option value="90d">Last 90 days</option>
                        <option value="1y">Last year</option>
                    </select>
                    <button
                        onClick={handleRefresh}
                        disabled={isRefreshing}
                        className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
                    >
                        <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                    </button>
                    <button
                        onClick={exportData}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
                    >
                        <Download className="h-4 w-4" />
                        <span>Export</span>
                    </button>
                </div>
            </div>

            {/* Metric Selector */}
            <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
                {[
                    { key: 'users', label: 'Users', icon: Users },
                    { key: 'revenue', label: 'Revenue', icon: DollarSign },
                    { key: 'usage', label: 'Usage', icon: Activity },
                    { key: 'engagement', label: 'Engagement', icon: TrendingUp }
                ].map(({ key, label, icon: Icon }) => (
                    <button
                        key={key}
                        onClick={() => setSelectedMetric(key as any)}
                        className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                            selectedMetric === key
                                ? 'bg-white text-blue-600 shadow-sm'
                                : 'text-gray-500 hover:text-gray-700'
                        }`}
                    >
                        <div className="flex items-center justify-center space-x-2">
                            <Icon className="h-4 w-4" />
                            <span>{label}</span>
                        </div>
                    </button>
                ))}
            </div>

            {/* Key Metrics Cards */}
            {selectedMetric === 'users' && (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <div className="bg-white p-6 rounded-lg shadow">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-gray-600">Total Users</p>
                                    <p className="text-2xl font-bold text-gray-900">{formatNumber(data.userMetrics.totalUsers)}</p>
                                </div>
                                <Users className="h-8 w-8 text-blue-500" />
                            </div>
                            <div className="mt-2">
                                <span className={`text-sm ${data.userMetrics.userGrowthRate >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                    {data.userMetrics.userGrowthRate >= 0 ? '+' : ''}{formatPercentage(data.userMetrics.userGrowthRate)} from last period
                                </span>
                            </div>
                        </div>

                        <div className="bg-white p-6 rounded-lg shadow">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-gray-600">Active Users</p>
                                    <p className="text-2xl font-bold text-gray-900">{formatNumber(data.userMetrics.activeUsers)}</p>
                                </div>
                                <Activity className="h-8 w-8 text-green-500" />
                            </div>
                        </div>

                        <div className="bg-white p-6 rounded-lg shadow">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-gray-600">New Users</p>
                                    <p className="text-2xl font-bold text-gray-900">{formatNumber(data.userMetrics.newUsers)}</p>
                                </div>
                                <TrendingUp className="h-8 w-8 text-purple-500" />
                            </div>
                        </div>

                        <div className="bg-white p-6 rounded-lg shadow">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-gray-600">User Growth</p>
                                    <p className="text-2xl font-bold text-gray-900">{formatPercentage(data.userMetrics.userGrowthRate)}</p>
                                </div>
                                <BarChart3 className="h-8 w-8 text-orange-500" />
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="bg-white p-6 rounded-lg shadow">
                            <h3 className="text-lg font-semibold text-gray-900 mb-4">Daily Active Users</h3>
                            <ResponsiveContainer width="100%" height={300}>
                                <LineChart data={data.userMetrics.dailyActiveUsers}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="date" />
                                    <YAxis />
                                    <Tooltip />
                                    <Legend />
                                    <Line type="monotone" dataKey="users" stroke="#8884d8" strokeWidth={2} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>

                        <div className="bg-white p-6 rounded-lg shadow">
                            <h3 className="text-lg font-semibold text-gray-900 mb-4">Users by Role</h3>
                            <ResponsiveContainer width="100%" height={300}>
                                <PieChart>
                                    <Pie
                                        data={data.userMetrics.usersByRole}
                                        cx="50%"
                                        cy="50%"
                                        labelLine={false}
                                        label={({ role, percent }) => `${role} ${((percent as number) * 100).toFixed(0)}%`}
                                        outerRadius={80}
                                        fill="#8884d8"
                                        dataKey="count"
                                    >
                                        {data.userMetrics.usersByRole.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color || COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </>
            )}

            {selectedMetric === 'revenue' && (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <div className="bg-white p-6 rounded-lg shadow">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                                    <p className="text-2xl font-bold text-gray-900">{formatCurrency(data.subscriptionMetrics.totalRevenue)}</p>
                                </div>
                                <DollarSign className="h-8 w-8 text-green-500" />
                            </div>
                        </div>

                        <div className="bg-white p-6 rounded-lg shadow">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-gray-600">Monthly Recurring Revenue</p>
                                    <p className="text-2xl font-bold text-gray-900">{formatCurrency(data.subscriptionMetrics.monthlyRecurringRevenue)}</p>
                                </div>
                                <TrendingUp className="h-8 w-8 text-blue-500" />
                            </div>
                        </div>

                        <div className="bg-white p-6 rounded-lg shadow">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-gray-600">Revenue Growth</p>
                                    <p className="text-2xl font-bold text-gray-900">{formatPercentage(data.subscriptionMetrics.revenueGrowth)}</p>
                                </div>
                                <BarChart3 className="h-8 w-8 text-purple-500" />
                            </div>
                        </div>

                        <div className="bg-white p-6 rounded-lg shadow">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-gray-600">Churn Rate</p>
                                    <p className="text-2xl font-bold text-gray-900">{formatPercentage(data.subscriptionMetrics.churnRate)}</p>
                                </div>
                                <Activity className="h-8 w-8 text-red-500" />
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="bg-white p-6 rounded-lg shadow">
                            <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenue Over Time</h3>
                            <ResponsiveContainer width="100%" height={300}>
                                <AreaChart data={data.subscriptionMetrics.revenueOverTime}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="date" />
                                    <YAxis />
                                    <Tooltip formatter={(value) => formatCurrency(value as number)} />
                                    <Legend />
                                    <Area type="monotone" dataKey="revenue" stackId="1" stroke="#8884d8" fill="#8884d8" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>

                        <div className="bg-white p-6 rounded-lg shadow">
                            <h3 className="text-lg font-semibold text-gray-900 mb-4">Subscriptions by Tier</h3>
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={data.subscriptionMetrics.subscriptionsByTier}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="tier" />
                                    <YAxis />
                                    <Tooltip formatter={(value) => formatNumber(value as number)} />
                                    <Legend />
                                    <Bar dataKey="count" fill="#8884d8" />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </>
            )}

            {selectedMetric === 'usage' && (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <div className="bg-white p-6 rounded-lg shadow">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-gray-600">Total Minutes Processed</p>
                                    <p className="text-2xl font-bold text-gray-900">{formatNumber(data.usageMetrics.totalMinutesProcessed)}</p>
                                </div>
                                <Activity className="h-8 w-8 text-blue-500" />
                            </div>
                        </div>

                        <div className="bg-white p-6 rounded-lg shadow">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-gray-600">Total Storage Used</p>
                                    <p className="text-2xl font-bold text-gray-900">{(data.usageMetrics.totalStorageUsed / 1024 / 1024).toFixed(2)} GB</p>
                                </div>
                                <BarChart3 className="h-8 w-8 text-green-500" />
                            </div>
                        </div>

                        <div className="bg-white p-6 rounded-lg shadow">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-gray-600">Avg. Session Duration</p>
                                    <p className="text-2xl font-bold text-gray-900">{Math.round(data.usageMetrics.averageSessionDuration)} min</p>
                                </div>
                                <TrendingUp className="h-8 w-8 text-purple-500" />
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="bg-white p-6 rounded-lg shadow">
                            <h3 className="text-lg font-semibold text-gray-900 mb-4">Usage Over Time</h3>
                            <ResponsiveContainer width="100%" height={300}>
                                <LineChart data={data.usageMetrics.usageOverTime}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="date" />
                                    <YAxis />
                                    <Tooltip />
                                    <Legend />
                                    <Line type="monotone" dataKey="minutes" stroke="#8884d8" strokeWidth={2} />
                                    <Line type="monotone" dataKey="storage" stroke="#82ca9d" strokeWidth={2} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>

                        <div className="bg-white p-6 rounded-lg shadow">
                            <h3 className="text-lg font-semibold text-gray-900 mb-4">Usage by Feature</h3>
                            <ResponsiveContainer width="100%" height={300}>
                                <PieChart>
                                    <Pie
                                        data={data.usageMetrics.usageByFeature}
                                        cx="50%"
                                        cy="50%"
                                        labelLine={false}
                                        label={({ feature, percent }) => `${feature} ${((percent as number) * 100).toFixed(0)}%`}
                                        outerRadius={80}
                                        fill="#8884d8"
                                        dataKey="usage"
                                    >
                                        {data.usageMetrics.usageByFeature.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color || COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </>
            )}

            {selectedMetric === 'engagement' && (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <div className="bg-white p-6 rounded-lg shadow">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-gray-600">Avg. Sessions per User</p>
                                    <p className="text-2xl font-bold text-gray-900">{data.engagementMetrics.averageSessionsPerUser.toFixed(1)}</p>
                                </div>
                                <Users className="h-8 w-8 text-blue-500" />
                            </div>
                        </div>

                        <div className="bg-white p-6 rounded-lg shadow">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-gray-600">Bounce Rate</p>
                                    <p className="text-2xl font-bold text-gray-900">{formatPercentage(data.engagementMetrics.bounceRate)}</p>
                                </div>
                                <Activity className="h-8 w-8 text-red-500" />
                            </div>
                        </div>

                        <div className="bg-white p-6 rounded-lg shadow">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-gray-600">Retention Rate</p>
                                    <p className="text-2xl font-bold text-gray-900">{formatPercentage(data.engagementMetrics.retentionRate)}</p>
                                </div>
                                <TrendingUp className="h-8 w-8 text-green-500" />
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="bg-white p-6 rounded-lg shadow">
                            <h3 className="text-lg font-semibold text-gray-900 mb-4">Engagement Over Time</h3>
                            <ResponsiveContainer width="100%" height={300}>
                                <LineChart data={data.engagementMetrics.engagementOverTime}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="date" />
                                    <YAxis />
                                    <Tooltip />
                                    <Legend />
                                    <Line type="monotone" dataKey="sessions" stroke="#8884d8" strokeWidth={2} />
                                    <Line type="monotone" dataKey="duration" stroke="#82ca9d" strokeWidth={2} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>

                        <div className="bg-white p-6 rounded-lg shadow">
                            <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Features</h3>
                            <div className="space-y-4">
                                {data.engagementMetrics.topFeatures.map((feature, index) => (
                                    <div key={feature.feature} className="flex items-center justify-between">
                                        <div className="flex items-center space-x-3">
                                            <div className={`w-3 h-3 rounded-full`} style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                                            <span className="text-sm font-medium text-gray-900">{feature.feature}</span>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-sm font-semibold text-gray-900">{formatNumber(feature.usage)}</div>
                                            <div className={`text-xs ${feature.growth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                {feature.growth >= 0 ? '+' : ''}{formatPercentage(feature.growth)}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};