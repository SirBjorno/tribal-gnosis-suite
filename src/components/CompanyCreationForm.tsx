import React, { useState } from 'react';

interface CompanyCreationFormProps {
  isOpen: boolean;
  onClose: () => void;
  onCompanyCreated: (company: any) => void;
}

interface CompanyFormData {
  name: string;
  domain: string;
  companyCode: string;
  maxUsers: number;
  maxStorage: number; // in GB
  features: {
    transcription: boolean;
    analysis: boolean;
    knowledgeBase: boolean;
  };
  adminUser: {
    name: string;
    email: string;
    password: string;
  };
}

const CompanyCreationForm: React.FC<CompanyCreationFormProps> = ({
  isOpen,
  onClose,
  onCompanyCreated,
}) => {
  const [formData, setFormData] = useState<CompanyFormData>({
    name: '',
    domain: '',
    companyCode: '',
    maxUsers: 10,
    maxStorage: 5, // 5GB default
    features: {
      transcription: true,
      analysis: true,
      knowledgeBase: true,
    },
    adminUser: {
      name: '',
      email: '',
      password: '',
    },
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const generateCompanyCode = () => {
    const code = formData.name
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '')
      .substring(0, 8) + '-' + Date.now().toString().slice(-4);
    
    setFormData(prev => ({ ...prev, companyCode: code }));
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) newErrors.name = 'Company name is required';
    if (!formData.domain.trim()) newErrors.domain = 'Domain is required';
    if (!formData.companyCode.trim()) newErrors.companyCode = 'Company code is required';
    if (!formData.adminUser.name.trim()) newErrors.adminName = 'Admin name is required';
    if (!formData.adminUser.email.trim()) newErrors.adminEmail = 'Admin email is required';
    if (!formData.adminUser.password.trim()) newErrors.adminPassword = 'Admin password is required';
    
    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (formData.adminUser.email && !emailRegex.test(formData.adminUser.email)) {
      newErrors.adminEmail = 'Invalid email format';
    }

    // Password validation
    if (formData.adminUser.password && formData.adminUser.password.length < 8) {
      newErrors.adminPassword = 'Password must be at least 8 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setIsSubmitting(true);
    
    try {
      // TODO: Replace with actual API call
      const response = await fetch('/api/companies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error('Failed to create company');
      }

      const newCompany = await response.json();
      onCompanyCreated(newCompany);
      onClose();
      
      // Reset form
      setFormData({
        name: '',
        domain: '',
        companyCode: '',
        maxUsers: 10,
        maxStorage: 5,
        features: {
          transcription: true,
          analysis: true,
          knowledgeBase: true,
        },
        adminUser: {
          name: '',
          email: '',
          password: '',
        },
      });
    } catch (error) {
      console.error('Error creating company:', error);
      setErrors({ submit: 'Failed to create company. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-slate-200">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-slate-800">Create New Company</h2>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Company Information */}
          <div>
            <h3 className="text-lg font-semibold text-slate-800 mb-4">Company Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Company Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Acme Corporation"
                />
                {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Domain
                </label>
                <input
                  type="text"
                  value={formData.domain}
                  onChange={(e) => setFormData(prev => ({ ...prev, domain: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="acme.com"
                />
                {errors.domain && <p className="text-red-500 text-sm mt-1">{errors.domain}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Company Code *
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={formData.companyCode}
                    onChange={(e) => setFormData(prev => ({ ...prev, companyCode: e.target.value.toUpperCase() }))}
                    className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="ACME-2025"
                  />
                  <button
                    type="button"
                    onClick={generateCompanyCode}
                    className="px-3 py-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition-colors"
                  >
                    Generate
                  </button>
                </div>
                {errors.companyCode && <p className="text-red-500 text-sm mt-1">{errors.companyCode}</p>}
              </div>
            </div>
          </div>

          {/* Settings */}
          <div>
            <h3 className="text-lg font-semibold text-slate-800 mb-4">Settings</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Max Users
                </label>
                <input
                  type="number"
                  value={formData.maxUsers}
                  onChange={(e) => setFormData(prev => ({ ...prev, maxUsers: parseInt(e.target.value) || 0 }))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min="1"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Max Storage (GB)
                </label>
                <input
                  type="number"
                  value={formData.maxStorage}
                  onChange={(e) => setFormData(prev => ({ ...prev, maxStorage: parseInt(e.target.value) || 0 }))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min="1"
                />
              </div>
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium text-slate-700 mb-2">Features</label>
              <div className="space-y-2">
                {Object.entries(formData.features).map(([key, value]) => (
                  <label key={key} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={value}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        features: { ...prev.features, [key]: e.target.checked }
                      }))}
                      className="mr-2"
                    />
                    <span className="text-sm text-slate-700 capitalize">
                      {key === 'knowledgeBase' ? 'Knowledge Base' : key}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Admin User */}
          <div>
            <h3 className="text-lg font-semibold text-slate-800 mb-4">Admin User</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Full Name *
                </label>
                <input
                  type="text"
                  value={formData.adminUser.name}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    adminUser: { ...prev.adminUser, name: e.target.value }
                  }))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="John Smith"
                />
                {errors.adminName && <p className="text-red-500 text-sm mt-1">{errors.adminName}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Email *
                </label>
                <input
                  type="email"
                  value={formData.adminUser.email}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    adminUser: { ...prev.adminUser, email: e.target.value }
                  }))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="john@acme.com"
                />
                {errors.adminEmail && <p className="text-red-500 text-sm mt-1">{errors.adminEmail}</p>}
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Password *
                </label>
                <input
                  type="password"
                  value={formData.adminUser.password}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    adminUser: { ...prev.adminUser, password: e.target.value }
                  }))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Minimum 8 characters"
                />
                {errors.adminPassword && <p className="text-red-500 text-sm mt-1">{errors.adminPassword}</p>}
              </div>
            </div>
          </div>

          {errors.submit && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-700">{errors.submit}</p>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSubmitting ? 'Creating...' : 'Create Company'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CompanyCreationForm;