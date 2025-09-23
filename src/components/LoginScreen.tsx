import React, { useState } from 'react';
import type { User } from '../types';
import { TribalGnosisLogo } from './Icons';
import { loginUser, signupUser } from '../services/apiService';

interface LoginScreenProps {
  onLogin: (user: User) => void;
}

type AuthMode = 'signin' | 'signup';

const FormInput: React.FC<React.InputHTMLAttributes<HTMLInputElement> & { label: string }> = ({ label, id, ...props }) => (
    <div>
        <label htmlFor={id} className="block text-sm font-semibold text-slate-700 mb-1">{label}</label>
        <input
            id={id}
            {...props}
            className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-shadow"
        />
    </div>
);

const AuthForm: React.FC<{ mode: AuthMode; setMode: (mode: AuthMode) => void; onLogin: (user: User) => void }> = ({ mode, setMode, onLogin }) => {
    const [formData, setFormData] = useState({ name: '', email: '', password: '', companyCode: '' });
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const isSignIn = mode === 'signin';

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setSuccess(null);
        setIsLoading(true);

        try {
            if (isSignIn) {
                const user = await loginUser({ email: formData.email, password: formData.password });
                onLogin(user);
            } else {
                const result = await signupUser(formData);
                setSuccess(result.message);
                // Switch to sign-in tab after successful sign-up
                setTimeout(() => setMode('signin'), 1000); 
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="p-8 bg-white/80 backdrop-blur-md rounded-xl border border-slate-200/80 shadow-2xl">
            <div className="flex border-b border-slate-200 mb-6">
                <button 
                    onClick={() => setMode('signin')}
                    className={`flex-1 py-3 text-center font-semibold transition-colors ${isSignIn ? 'text-sky-600 border-b-2 border-sky-600' : 'text-slate-500 hover:text-slate-800'}`}
                >
                    Sign In
                </button>
                <button 
                    onClick={() => setMode('signup')}
                    className={`flex-1 py-3 text-center font-semibold transition-colors ${!isSignIn ? 'text-sky-600 border-b-2 border-sky-600' : 'text-slate-500 hover:text-slate-800'}`}
                >
                    Sign Up
                </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
                {error && <div className="bg-red-100 border border-red-200 text-red-700 text-sm p-3 rounded-md">{error}</div>}
                {success && <div className="bg-green-100 border border-green-200 text-green-700 text-sm p-3 rounded-md">{success}</div>}
                
                {!isSignIn && <FormInput label="Full Name" id="name" name="name" type="text" value={formData.name} onChange={handleInputChange} required />}
                <FormInput label="Email Address" id="email" name="email" type="email" value={formData.email} onChange={handleInputChange} required autoComplete="email" />
                <FormInput label="Password" id="password" name="password" type="password" value={formData.password} onChange={handleInputChange} required autoComplete={isSignIn ? "current-password" : "new-password"} />
                {!isSignIn && <FormInput label="Company Code" id="companyCode" name="companyCode" type="text" value={formData.companyCode} onChange={handleInputChange} required placeholder="e.g., ACME-2025" />}
                
                <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full inline-flex items-center justify-center px-4 py-2.5 border border-transparent text-sm font-semibold rounded-md shadow-sm text-white bg-sky-600 hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 disabled:bg-slate-400 disabled:cursor-wait transition-colors"
                >
                    {isLoading ? 'Processing...' : (isSignIn ? 'Sign In' : 'Create Account')}
                </button>
            </form>
        </div>
    );
};

const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin }) => {
  const [mode, setMode] = useState<AuthMode>('signin');

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-200 p-4">
      <div className="w-full max-w-md mx-auto">
        <header className="text-center mb-8">
            <TribalGnosisLogo className="h-20 w-20 text-sky-600 mx-auto" />
            <h1 className="text-4xl font-bold text-slate-900 mt-4 tracking-tight">Tribal Gnosis</h1>
            <p className="text-slate-600 mt-1">Call Center Intelligence Suite</p>
        </header>

        <main>
            <AuthForm mode={mode} setMode={setMode} onLogin={onLogin} />
        </main>
        
        <footer className="text-center mt-10 text-sm text-slate-500">
            <p>&copy; {new Date().getFullYear()} Tribal Gnosis. All rights reserved.</p>
        </footer>
      </div>
    </div>
  );
};

export default LoginScreen;