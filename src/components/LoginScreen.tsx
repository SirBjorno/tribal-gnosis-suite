import React, { useState } from 'react';
import { validateCompanyCode, loginUser } from '../services/apiService';
import ErrorMessage from './ErrorMessage';
import type { User } from '../types';

interface LoginScreenProps {
  onLogin: (user: User) => void;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin }) => {
  const [step, setStep] = useState<'company' | 'credentials'>('company');
  const [companyCode, setCompanyCode] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleCompanySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const tenantInfo = await validateCompanyCode(companyCode);
      if (tenantInfo) {
        setStep('credentials');
      } else {
        setError('Invalid company code. Please try again.');
      }
    } catch (err) {
      setError('Failed to validate company code. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const user = await loginUser({ email, password, companyCode });
      if (user) {
        onLogin(user);
      } else {
        setError('Invalid credentials. Please try again.');
      }
    } catch (err) {
      setError('Login failed. Please check your credentials and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const CompanyCodeForm = (
    <form onSubmit={handleCompanySubmit} className="space-y-6">
      <div>
        <label htmlFor="companyCode" className="block text-sm font-medium text-slate-700">
          Company Code
        </label>
        <input
          id="companyCode"
          type="text"
          value={companyCode}
          onChange={(e) => setCompanyCode(e.target.value)}
          required
          className="mt-1 block w-full rounded-md border border-slate-300 py-2 px-3 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
          placeholder="Enter your company code"
        />
      </div>
      <button
        type="submit"
        disabled={isLoading || !companyCode}
        className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
          isLoading || !companyCode
            ? 'bg-sky-400 cursor-not-allowed'
            : 'bg-sky-600 hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500'
        }`}
      >
        {isLoading ? 'Validating...' : 'Continue'}
      </button>
    </form>
  );

  const LoginForm = (
    <form onSubmit={handleLogin} className="space-y-6">
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-slate-700">
          Email Address
        </label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="mt-1 block w-full rounded-md border border-slate-300 py-2 px-3 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
          placeholder="Enter your email"
        />
      </div>
      <div>
        <label htmlFor="password" className="block text-sm font-medium text-slate-700">
          Password
        </label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="mt-1 block w-full rounded-md border border-slate-300 py-2 px-3 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
          placeholder="Enter your password"
        />
      </div>
      <button
        type="submit"
        disabled={isLoading || !email || !password}
        className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
          isLoading || !email || !password
            ? 'bg-sky-400 cursor-not-allowed'
            : 'bg-sky-600 hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500'
        }`}
      >
        {isLoading ? 'Logging in...' : 'Log In'}
      </button>
    </form>
  );

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-slate-900">
            {step === 'company' ? 'Welcome to Tribal Gnosis' : 'Sign in to your account'}
          </h2>
          <p className="mt-2 text-center text-sm text-slate-600">
            {step === 'company'
              ? 'Enter your company code to continue'
              : `Using company code: ${companyCode}`}
          </p>
        </div>
        {error && <ErrorMessage message={error} />}
        {step === 'company' ? CompanyCodeForm : LoginForm}
      </div>
    </div>
  );
};

export default LoginScreen;
