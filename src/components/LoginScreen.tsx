import React, { useState } from 'react';
import type { UserRole } from '../types';
import { TribalGnosisLogo } from './Icons';

interface LoginScreenProps {
  onLogin: (role: UserRole, tenantId: string) => void;
}

const tenants = [
  { id: 'acme-corp', name: 'Acme Corporation', description: "Global leader in innovative solutions." },
  { id: 'globex-inc', name: 'Globex Inc.', description: "Pioneering the future of technology." },
];

const RoleButton: React.FC<{ role: NonNullable<UserRole>; onLogin: () => void; description: string }> = ({ role, onLogin, description }) => (
    <button
        onClick={onLogin}
        className="w-full text-left p-4 bg-white rounded-lg shadow-sm border border-slate-200 hover:bg-sky-50 hover:border-sky-300 focus:outline-none focus:ring-2 focus:ring-sky-500 transition-all duration-200"
    >
        <h3 className="text-lg font-semibold text-slate-800 capitalize">{role}</h3>
        <p className="text-sm text-slate-600">{description}</p>
    </button>
);

const TenantCard: React.FC<{ name: string; description: string; onSelect: () => void; }> = ({ name, description, onSelect }) => (
  <button
    onClick={onSelect}
    className="w-full text-left p-6 bg-white rounded-xl shadow-lg border border-slate-200/80 hover:shadow-xl hover:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-500 transition-all duration-300 transform hover:-translate-y-1"
  >
    <h3 className="text-2xl font-bold text-slate-900">{name}</h3>
    <p className="text-slate-500 mt-1">{description}</p>
  </button>
);

const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin }) => {
  const [selectedTenant, setSelectedTenant] = useState<(typeof tenants)[0] | null>(null);

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-200 p-4">
      <div className="w-full max-w-lg mx-auto">
        <header className="text-center mb-10">
            <TribalGnosisLogo className="h-20 w-20 text-sky-600 mx-auto" />
            <h1 className="text-4xl font-bold text-slate-900 mt-4 tracking-tight">Tribal Gnosis</h1>
            <p className="text-slate-600 mt-1">Call Center Intelligence Suite</p>
        </header>

        <main className="space-y-6">
            {!selectedTenant ? (
              <>
                <h2 className="text-center text-xl font-semibold text-slate-700">Select Your Organization</h2>
                {tenants.map(tenant => (
                  <TenantCard 
                    key={tenant.id}
                    name={tenant.name}
                    description={tenant.description}
                    onSelect={() => setSelectedTenant(tenant)}
                  />
                ))}
              </>
            ) : (
              <div className="p-6 bg-white/70 backdrop-blur-sm rounded-xl border border-slate-200/80 shadow-2xl">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <p className="text-sm text-slate-500">Signing in to</p>
                        <h2 className="text-2xl font-bold text-slate-900">{selectedTenant.name}</h2>
                    </div>
                    <button onClick={() => setSelectedTenant(null)} className="text-sm font-semibold text-sky-600 hover:text-sky-800 transition-colors">
                        Change
                    </button>
                </div>
                <h3 className="text-center text-lg font-semibold text-slate-700 mb-4">Select Your Role</h3>
                <div className="space-y-4">
                    <RoleButton role="analyst" onLogin={() => onLogin('analyst', selectedTenant.id)} description="Access workflows, analyze transcripts, and view the knowledge base." />
                    <RoleButton role="admin" onLogin={() => onLogin('admin', selectedTenant.id)} description="Full access to all application features." />
                </div>
              </div>
            )}
        </main>
        
        <footer className="text-center mt-12 text-sm text-slate-500">
            <p>&copy; {new Date().getFullYear()} Tribal Gnosis. All rights reserved.</p>
        </footer>
      </div>
    </div>
  );
};

export default LoginScreen;
