import React, { useState, useEffect } from 'react';

interface Company {
  _id: string;
  name: string;
  domain: string;
  companyCode: string;
  maxUsers: number;
  maxStorage: number;
  currentUsers: number;
  currentStorage: number;
  features: {
    transcription: boolean;
    analysis: boolean;
    knowledgeBase: boolean;
  };
  createdAt: string;
  isActive: boolean;
}

interface CompanyListProps {
  onEditCompany: (company: Company) => void;
  refreshTrigger?: number;
}

const CompanyList: React.FC<CompanyListProps> = ({ onEditCompany, refreshTrigger }) => {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'createdAt' | 'users'>('name');
  const [filterActive, setFilterActive] = useState<'all' | 'active' | 'inactive'>('all');

  useEffect(() => {
    fetchCompanies();
  }, [refreshTrigger]);

  const fetchCompanies = async () => {
    try {
      setIsLoading(true);
      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';
      const response = await fetch(`${API_BASE_URL}/api/companies`);
      if (response.ok) {
        const data = await response.json();
        setCompanies(data);
      }
    } catch (error) {
      console.error('Failed to fetch companies:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleCompanyStatus = async (companyId: string, currentStatus: boolean) => {
    try {
      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';
      const response = await fetch(`${API_BASE_URL}/api/companies/${companyId}/toggle-status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !currentStatus }),
      });

      if (response.ok) {
        setCompanies(prev => prev.map(company => 
          company._id === companyId 
            ? { ...company, isActive: !currentStatus }
            : company
        ));
      }
    } catch (error) {
      console.error('Failed to toggle company status:', error);
    }
  };

  const filteredCompanies = companies
    .filter(company => {
      const matchesSearch = company.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           company.domain.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           company.companyCode.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesFilter = filterActive === 'all' || 
                           (filterActive === 'active' && company.isActive) ||
                           (filterActive === 'inactive' && !company.isActive);

      return matchesSearch && matchesFilter;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'createdAt':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case 'users':
          return b.currentUsers - a.currentUsers;
        default:
          return 0;
      }
    });

  const getUsagePercentage = (current: number, max: number) => {
    return Math.round((current / max) * 100);
  };

  const getUsageColor = (percentage: number) => {
    if (percentage >= 90) return 'bg-red-500';
    if (percentage >= 75) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-slate-600">Loading companies...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex-1 max-w-md">
          <input
            type="text"
            placeholder="Search companies..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        
        <div className="flex gap-2">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="name">Sort by Name</option>
            <option value="createdAt">Sort by Date</option>
            <option value="users">Sort by Users</option>
          </select>
          
          <select
            value={filterActive}
            onChange={(e) => setFilterActive(e.target.value as any)}
            className="px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Companies</option>
            <option value="active">Active Only</option>
            <option value="inactive">Inactive Only</option>
          </select>
        </div>
      </div>

      {/* Companies Grid */}
      {filteredCompanies.length === 0 ? (
        <div className="text-center py-8 text-slate-500">
          {companies.length === 0 ? 'No companies created yet.' : 'No companies match your search.'}
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredCompanies.map((company) => (
            <div
              key={company._id}
              className={`bg-white rounded-lg border p-6 transition-all hover:shadow-md ${
                !company.isActive ? 'opacity-75 bg-slate-50' : ''
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-slate-800">{company.name}</h3>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      company.isActive 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {company.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  
                  <div className="text-sm text-slate-600 space-y-1">
                    <p><span className="font-medium">Domain:</span> {company.domain}</p>
                    <p><span className="font-medium">Code:</span> {company.companyCode}</p>
                    <p><span className="font-medium">Created:</span> {new Date(company.createdAt).toLocaleDateString()}</p>
                  </div>

                  {/* Features */}
                  <div className="mt-3">
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(company.features).map(([feature, enabled]) => (
                        <span
                          key={feature}
                          className={`px-2 py-1 rounded text-xs ${
                            enabled 
                              ? 'bg-blue-100 text-blue-800' 
                              : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          {feature === 'knowledgeBase' ? 'Knowledge Base' : 
                           feature.charAt(0).toUpperCase() + feature.slice(1)}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Usage Stats */}
                <div className="ml-6 space-y-3">
                  <div className="text-right">
                    <div className="text-sm font-medium text-slate-700 mb-1">Users</div>
                    <div className="text-xs text-slate-500 mb-2">
                      {company.currentUsers} / {company.maxUsers}
                    </div>
                    <div className="w-24 bg-slate-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${getUsageColor(getUsagePercentage(company.currentUsers, company.maxUsers))}`}
                        style={{ width: `${Math.min(getUsagePercentage(company.currentUsers, company.maxUsers), 100)}%` }}
                      ></div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-sm font-medium text-slate-700 mb-1">Storage</div>
                    <div className="text-xs text-slate-500 mb-2">
                      {company.currentStorage}GB / {company.maxStorage}GB
                    </div>
                    <div className="w-24 bg-slate-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${getUsageColor(getUsagePercentage(company.currentStorage, company.maxStorage))}`}
                        style={{ width: `${Math.min(getUsagePercentage(company.currentStorage, company.maxStorage), 100)}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-slate-200">
                <button
                  onClick={() => onEditCompany(company)}
                  className="px-3 py-1 text-sm bg-slate-100 text-slate-700 rounded hover:bg-slate-200 transition-colors"
                >
                  Edit
                </button>
                <button
                  onClick={() => toggleCompanyStatus(company._id, company.isActive)}
                  className={`px-3 py-1 text-sm rounded transition-colors ${
                    company.isActive
                      ? 'bg-red-100 text-red-700 hover:bg-red-200'
                      : 'bg-green-100 text-green-700 hover:bg-green-200'
                  }`}
                >
                  {company.isActive ? 'Deactivate' : 'Activate'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Summary Stats */}
      <div className="bg-slate-50 rounded-lg p-4 mt-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-slate-800">{companies.length}</div>
            <div className="text-sm text-slate-600">Total Companies</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-green-600">
              {companies.filter(c => c.isActive).length}
            </div>
            <div className="text-sm text-slate-600">Active</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-blue-600">
              {companies.reduce((sum, c) => sum + c.currentUsers, 0)}
            </div>
            <div className="text-sm text-slate-600">Total Users</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-purple-600">
              {companies.reduce((sum, c) => sum + c.currentStorage, 0)}GB
            </div>
            <div className="text-sm text-slate-600">Total Storage</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CompanyList;