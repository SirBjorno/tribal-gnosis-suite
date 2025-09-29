import React, { useState, useEffect } from 'react';
import { AnalyticsDashboard } from './AnalyticsDashboard';
import { UserManagementDashboard } from './UserManagementDashboard';
import { 
    BarChart3, 
    Users, 
    Settings, 
    Database, 
    Search,
    Workflow,
    Truck,
    Zap
} from 'lucide-react';

interface TabConfig {
    id: string;
    label: string;
    icon: React.ComponentType<any>;
    component: React.ComponentType<any>;
    adminOnly?: boolean;
}

interface EnhancedMainApplicationProps {
    user: any;
    tenantId: string;
}

export const EnhancedMainApplication: React.FC<EnhancedMainApplicationProps> = ({ 
    user, 
    tenantId 
}) => {
    const [activeTab, setActiveTab] = useState('analytics');
    const [hasAnalyticsAccess, setHasAnalyticsAccess] = useState(false);

    useEffect(() => {
        // Check if user has analytics access
        const checkAnalyticsAccess = () => {
            if (user.role === 'admin' || user.role === 'manager') {
                setHasAnalyticsAccess(true);
            }
        };

        checkAnalyticsAccess();
    }, [user]);

    const tabs: TabConfig[] = [
        {
            id: 'analytics',
            label: 'Analytics',
            icon: BarChart3,
            component: () => <AnalyticsDashboard tenantId={tenantId} />,
            adminOnly: false
        },
        {
            id: 'users',
            label: 'User Management',
            icon: Users,
            component: () => <UserManagementDashboard tenantId={tenantId} currentUser={user} />,
            adminOnly: false
        },
        {
            id: 'analyzer',
            label: 'Analyzer',
            icon: BarChart3,
            component: () => <div className="p-6">Analyzer Tab - Coming Soon</div>,
            adminOnly: false
        },
        {
            id: 'consumer-search',
            label: 'Consumer Search',
            icon: Search,
            component: () => <div className="p-6">Consumer Search Tab - Coming Soon</div>,
            adminOnly: false
        },
        {
            id: 'database',
            label: 'Database',
            icon: Database,
            component: () => <div className="p-6">Database Tab - Coming Soon</div>,
            adminOnly: false
        },
        {
            id: 'integrations',
            label: 'Integrations',
            icon: Zap,
            component: () => <div className="p-6">Integrations Tab - Coming Soon</div>,
            adminOnly: true
        },
        {
            id: 'logistics',
            label: 'Logistics',
            icon: Truck,
            component: () => <div className="p-6">Logistics Tab - Coming Soon</div>,
            adminOnly: true
        },
        {
            id: 'workflow',
            label: 'Workflow',
            icon: Workflow,
            component: () => <div className="p-6">Workflow Tab - Coming Soon</div>,
            adminOnly: false
        }
    ];

    // Filter tabs based on user role and access
    const availableTabs = tabs.filter(tab => {
        if (tab.adminOnly && user.role !== 'admin') {
            return false;
        }
        if (tab.id === 'analytics' && !hasAnalyticsAccess) {
            return false;
        }
        return true;
    });

    // Set default tab if current tab is not available
    useEffect(() => {
        if (!availableTabs.some(tab => tab.id === activeTab)) {
            setActiveTab(availableTabs[0]?.id || 'analyzer');
        }
    }, [availableTabs, activeTab]);

    const renderTabContent = () => {
        const currentTab = availableTabs.find(tab => tab.id === activeTab);
        if (!currentTab) {
            return <div className="p-6">Tab not found</div>;
        }

        const TabComponent = currentTab.component;
        return <TabComponent />;
    };

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="bg-white shadow-sm border-b">
                <div className="px-6 py-4">
                    <div className="flex justify-between items-center">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">Tribal Gnosis</h1>
                            <p className="text-gray-600">Intelligent Knowledge Management Platform</p>
                        </div>
                        <div className="flex items-center space-x-4">
                            <span className="text-sm text-gray-600">Welcome, {user.name}</span>
                            <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-medium">
                                {user.name?.charAt(0)?.toUpperCase()}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Navigation Tabs */}
            <div className="bg-white border-b">
                <div className="px-6">
                    <div className="flex space-x-8 overflow-x-auto">
                        {availableTabs.map((tab) => {
                            const Icon = tab.icon;
                            const isActive = activeTab === tab.id;
                            
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap transition-colors ${
                                        isActive
                                            ? 'border-blue-500 text-blue-600'
                                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                    }`}
                                >
                                    <Icon className="h-4 w-4" />
                                    <span>{tab.label}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Tab Content */}
            <main className="flex-1">
                {renderTabContent()}
            </main>

            {/* Footer */}
            <footer className="bg-white border-t mt-auto">
                <div className="px-6 py-4">
                    <div className="flex justify-between items-center text-sm text-gray-500">
                        <div>
                            © 2025 Tribal Gnosis. All rights reserved.
                        </div>
                        <div className="flex space-x-4">
                            <span>Tenant: {tenantId}</span>
                            <span>Role: {user.role}</span>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
};