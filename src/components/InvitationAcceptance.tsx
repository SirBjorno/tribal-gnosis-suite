import React, { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle2, Users, Mail, Lock, User } from 'lucide-react';
import ErrorMessage from './ErrorMessage';
import InfoMessage from './InfoMessage';
import Loader from './Loader';

interface InvitationDetails {
    id: string;
    email: string;
    role: string;
    inviterName: string;
    organizationName: string;
    status: string;
    expiresAt: string;
}

interface InvitationAcceptanceProps {
    token: string;
    onSuccess?: () => void;
}

export const InvitationAcceptance: React.FC<InvitationAcceptanceProps> = ({ token, onSuccess }) => {
    const [invitation, setInvitation] = useState<InvitationDetails | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isAccepting, setIsAccepting] = useState(false);
    const [error, setError] = useState<string>('');
    const [success, setSuccess] = useState<string>('');
    const [formData, setFormData] = useState({
        fullName: '',
        password: '',
        confirmPassword: ''
    });

    useEffect(() => {
        loadInvitationDetails();
    }, [token]);

    const loadInvitationDetails = async () => {
        try {
            setIsLoading(true);
            const response = await fetch(`/api/invitations/invitation/${token}`);
            
            if (!response.ok) {
                if (response.status === 404) {
                    throw new Error('Invitation not found or has expired');
                } else {
                    throw new Error('Failed to load invitation details');
                }
            }

            const data = await response.json();
            setInvitation(data.invitation);
        } catch (error) {
            console.error('Error loading invitation:', error);
            setError(error instanceof Error ? error.message : 'Failed to load invitation');
        } finally {
            setIsLoading(false);
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const validateForm = () => {
        if (!formData.fullName.trim()) {
            setError('Full name is required');
            return false;
        }

        if (!formData.password) {
            setError('Password is required');
            return false;
        }

        if (formData.password.length < 8) {
            setError('Password must be at least 8 characters long');
            return false;
        }

        if (formData.password !== formData.confirmPassword) {
            setError('Passwords do not match');
            return false;
        }

        return true;
    };

    const handleAcceptInvitation = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!validateForm()) {
            return;
        }

        try {
            setIsAccepting(true);
            setError('');

            const response = await fetch('/api/invitations/accept-invitation', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    token,
                    fullName: formData.fullName,
                    password: formData.password
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to accept invitation');
            }

            const data = await response.json();
            setSuccess('Account created successfully! Redirecting to login...');
            
            // Store auth token if provided
            if (data.token) {
                localStorage.setItem('auth_token', data.token);
                localStorage.setItem('user_data', JSON.stringify(data.user));
            }

            setTimeout(() => {
                if (onSuccess) {
                    onSuccess();
                } else {
                    window.location.href = '/login';
                }
            }, 2000);

        } catch (error) {
            console.error('Error accepting invitation:', error);
            setError(error instanceof Error ? error.message : 'Failed to accept invitation');
        } finally {
            setIsAccepting(false);
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
                <div className="bg-white rounded-xl shadow-lg p-8 w-full max-w-md">
                    <div className="text-center">
                        <Loader />
                        <p className="mt-4 text-gray-600">Loading invitation details...</p>
                    </div>
                </div>
            </div>
        );
    }

    if (error && !invitation) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
                <div className="bg-white rounded-xl shadow-lg p-8 w-full max-w-md">
                    <div className="text-center">
                        <AlertCircle className="mx-auto h-16 w-16 text-red-500 mb-4" />
                        <h2 className="text-2xl font-bold text-gray-900 mb-4">Invalid Invitation</h2>
                        <ErrorMessage message={error} />
                        <button
                            onClick={() => window.location.href = '/login'}
                            className="mt-4 w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
                        >
                            Go to Login
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    if (success) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
                <div className="bg-white rounded-xl shadow-lg p-8 w-full max-w-md">
                    <div className="text-center">
                        <CheckCircle2 className="mx-auto h-16 w-16 text-green-500 mb-4" />
                        <h2 className="text-2xl font-bold text-gray-900 mb-4">Welcome aboard!</h2>
                        <InfoMessage message={success} onDismiss={() => setSuccess('')} />
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-lg p-8 w-full max-w-md">
                <div className="text-center mb-6">
                    <Users className="mx-auto h-12 w-12 text-blue-600 mb-4" />
                    <h2 className="text-2xl font-bold text-gray-900">Join {invitation?.organizationName}</h2>
                    <p className="text-gray-600 mt-2">
                        You've been invited by {invitation?.inviterName} to join as a {invitation?.role}
                    </p>
                </div>

                <div className="bg-blue-50 rounded-lg p-4 mb-6">
                    <div className="flex items-center space-x-2 text-sm text-blue-800">
                        <Mail className="h-4 w-4" />
                        <span>Invitation for: {invitation?.email}</span>
                    </div>
                </div>

                {error && <ErrorMessage message={error} />}

                <form onSubmit={handleAcceptInvitation} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Full Name
                        </label>
                        <div className="relative">
                            <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <input
                                type="text"
                                name="fullName"
                                value={formData.fullName}
                                onChange={handleInputChange}
                                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                placeholder="Enter your full name"
                                required
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Password
                        </label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <input
                                type="password"
                                name="password"
                                value={formData.password}
                                onChange={handleInputChange}
                                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                placeholder="Create a secure password"
                                minLength={8}
                                required
                            />
                        </div>
                        <p className="text-xs text-gray-500 mt-1">Minimum 8 characters</p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Confirm Password
                        </label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <input
                                type="password"
                                name="confirmPassword"
                                value={formData.confirmPassword}
                                onChange={handleInputChange}
                                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                placeholder="Confirm your password"
                                required
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={isAccepting}
                        className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        {isAccepting ? (
                            <div className="flex items-center justify-center space-x-2">
                                <Loader />
                                <span>Creating Account...</span>
                            </div>
                        ) : (
                            'Accept Invitation & Create Account'
                        )}
                    </button>
                </form>

                <div className="mt-6 text-center">
                    <p className="text-sm text-gray-500">
                        Already have an account?{' '}
                        <a href="/login" className="text-blue-600 hover:text-blue-700 font-medium">
                            Sign in instead
                        </a>
                    </p>
                </div>
            </div>
        </div>
    );
};