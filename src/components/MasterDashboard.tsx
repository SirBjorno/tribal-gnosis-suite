import React, { useState, useEffect } from 'react';
import type { User } from '../types';
import { TribalGnosisLogo } from './Icons';
import CompanyCreationForm from './CompanyCreationForm';
import CompanyList from './CompanyList';

interface MasterDashboardProps {
  currentUser: User;
  onLogout: () => void;
  onEnterDemoMode: () => void;
}

type MasterView = 'overview' | 'company-management' | 'demo-mode';

const MasterDashboard: React.FC<MasterDashboardProps> = ({
  currentUser,
  onLogout,
  onEnterDemoMode,
}) => {
  const [activeView, setActiveView] = useState<MasterView>('overview');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [platformStats, setPlatformStats] = useState({
    totalCompanies: 0,
    activeCompanies: 0,
    totalUsers: 0,
    totalKnowledgeItems: 0
  });
  const { name: userName } = currentUser;

  // Fetch platform statistics
  const fetchPlatformStats = async () => {
    try {
      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';
      const response = await fetch(`${API_BASE_URL}/api/platform/stats`);
      if (response.ok) {
        const stats = await response.json();
        setPlatformStats(stats);
      }
    } catch (error) {
      console.error('Failed to fetch platform stats:', error);
    }
  };

  // Fetch stats on component mount and when refreshTrigger changes
  useEffect(() => {
    fetchPlatformStats();
  }, [refreshTrigger]);

  const renderOverview = () => (
    <div className="max-w-4xl mx-auto">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-slate-800 mb-4">
          Welcome to Tribal Gnosis Master Console
        </h1>
        <p className="text-xl text-slate-600 max-w-2xl mx-auto">
          Manage companies, create new organizations, and showcase the platform capabilities.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        {/* Company Management Card */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 hover:shadow-md transition-shadow">
          <div className="flex items-center mb-6">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mr-4">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-slate-800">Company Management</h2>
          </div>
          <p className="text-slate-600 mb-6 leading-relaxed">
            Create new companies, set up admin users, configure organizational settings, and manage existing tenants.
          </p>
          <button
            onClick={() => setActiveView('company-management')}
            className="w-full px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
          >
            Manage Companies
          </button>
        </div>

        {/* Demo Environment Card */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 hover:shadow-md transition-shadow">
          <div className="flex items-center mb-6">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mr-4">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-slate-800">Demo Environment</h2>
          </div>
          <p className="text-slate-600 mb-6 leading-relaxed">
            Experience the full platform functionality in a demo environment. Perfect for demonstrations and testing features.
          </p>
          <div className="space-y-3">
            <button
              onClick={onEnterDemoMode}
              className="w-full px-6 py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors"
            >
              Enter Demo Mode
            </button>
            <button
              onClick={handleCreateDemo}
              className="w-full px-6 py-3 bg-green-100 text-green-700 font-semibold rounded-lg hover:bg-green-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors"
            >
              Create New Demo Company
            </button>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="mt-12 bg-white rounded-xl shadow-sm border border-slate-200 p-8">
        <h3 className="text-xl font-bold text-slate-800 mb-6">Platform Overview</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="text-center">
            <div className="text-3xl font-bold text-blue-600 mb-2">{platformStats.totalCompanies}</div>
            <div className="text-slate-600">Total Companies</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-green-600 mb-2">{platformStats.activeCompanies}</div>
            <div className="text-slate-600">Active Companies</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-purple-600 mb-2">{platformStats.totalUsers}</div>
            <div className="text-slate-600">Total Users</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-orange-600 mb-2">{platformStats.totalKnowledgeItems}</div>
            <div className="text-slate-600">Knowledge Items</div>
          </div>
        </div>
      </div>
    </div>
  );

  const handleCompanyCreated = (newCompany: any) => {
    setRefreshTrigger(prev => prev + 1);
    setShowCreateForm(false);
  };

  const handleEditCompany = (company: any) => {
    setSelectedCompany(company);
    setShowCreateForm(true);
  };

  const handleCreateDemo = async () => {
    try {
      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';
      const response = await fetch(`${API_BASE_URL}/api/companies/create-demo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (response.ok) {
        const result = await response.json();
        alert(`Demo company created!\nCompany Code: ${result.company.companyCode}\nAdmin Email: ${result.company.adminCredentials.email}\nPassword: ${result.company.adminCredentials.password}`);
        setRefreshTrigger(prev => prev + 1); // This will also refresh platform stats
      } else {
        alert('Failed to create demo company');
      }
    } catch (error) {
      console.error('Error creating demo company:', error);
      alert('Failed to create demo company');
    }
  };

  const renderCompanyManagement = () => (
    <div className="max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Company Management</h1>
          <p className="text-slate-600 mt-2">Create and manage organizational tenants</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setActiveView('overview')}
            className="px-4 py-2 text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
          >
            Back to Overview
          </button>
          <button
            onClick={() => setShowCreateForm(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Create New Company
          </button>
        </div>
      </div>

      {/* Companies List */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200">
        <div className="p-6 border-b border-slate-200">
          <h2 className="text-xl font-semibold text-slate-800">Existing Companies</h2>
        </div>
        <div className="p-6">
          <CompanyList 
            onEditCompany={handleEditCompany}
            refreshTrigger={refreshTrigger}
          />
        </div>
      </div>

      {/* Company Creation Form Modal */}
      <CompanyCreationForm
        isOpen={showCreateForm}
        onClose={() => {
          setShowCreateForm(false);
          setSelectedCompany(null);
        }}
        onCompanyCreated={handleCompanyCreated}
      />
    </div>
  );

  const renderContent = () => {
    switch (activeView) {
      case 'overview':
        return renderOverview();
      case 'company-management':
        return renderCompanyManagement();
      default:
        return renderOverview();
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center gap-4">
              <TribalGnosisLogo className="h-10 w-10 text-sky-600" />
              <div>
                <h1 className="text-xl font-bold text-slate-800 tracking-tight">
                  Tribal Gnosis
                </h1>
                <p className="text-xs text-slate-500">Master Console</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <span className="text-xs text-slate-500 font-semibold">USER</span>
                <p className="text-sm font-semibold text-slate-700">{userName}</p>
              </div>
              <div className="h-8 w-px bg-slate-200"></div>
              <div className="text-right">
                <span className="text-xs text-slate-500 font-semibold">ROLE</span>
                <p className="text-sm font-bold text-sky-600">Master</p>
              </div>
              <button
                onClick={onLogout}
                className="px-4 py-2 text-sm font-semibold text-slate-700 bg-slate-100 rounded-md hover:bg-slate-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow py-12">
        {renderContent()}
      </main>
    </div>
  );
};

export default MasterDashboard;