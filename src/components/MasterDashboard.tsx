import React, { useState } from 'react';
import type { User } from '../types';
import { TribalGnosisLogo } from './Icons';

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
  const { name: userName } = currentUser;

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
          <button
            onClick={onEnterDemoMode}
            className="w-full px-6 py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors"
          >
            Enter Demo Mode
          </button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="mt-12 bg-white rounded-xl shadow-sm border border-slate-200 p-8">
        <h3 className="text-xl font-bold text-slate-800 mb-6">Platform Overview</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="text-3xl font-bold text-blue-600 mb-2">0</div>
            <div className="text-slate-600">Active Companies</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-green-600 mb-2">1</div>
            <div className="text-slate-600">Total Users</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-purple-600 mb-2">0</div>
            <div className="text-slate-600">Knowledge Items</div>
          </div>
        </div>
      </div>
    </div>
  );

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
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
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
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-slate-800 mb-2">No Companies Yet</h3>
            <p className="text-slate-600 mb-4">Create your first company to get started</p>
            <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
              Create First Company
            </button>
          </div>
        </div>
      </div>
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