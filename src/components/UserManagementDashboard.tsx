import React, { useState, useEffect } from 'react';
import { 
    Users, 
    UserPlus, 
    Mail, 
    Shield, 
    MoreVertical, 
    Edit,
    Trash2,
    CheckCircle,
    XCircle,
    Clock,
    Search,
    Filter
} from 'lucide-react';
import ErrorMessage from './ErrorMessage';
import InfoMessage from './InfoMessage';
import Loader from './Loader';

interface User {
    id: string;
    name: string;
    email: string;
    role: string;
    status: 'active' | 'inactive' | 'pending';
    lastLogin?: string;
    createdAt: string;
    permissions: string[];
}

interface Invitation {
    id: string;
    email: string;
    role: string;
    inviterName: string;
    status: 'pending' | 'accepted' | 'expired';
    createdAt: string;
    expiresAt: string;
}

interface UserManagementDashboardProps {
    tenantId: string;
    currentUser: any;
}

export const UserManagementDashboard: React.FC<UserManagementDashboardProps> = ({ 
    tenantId, 
    currentUser 
}) => {
    const [users, setUsers] = useState<User[]>([]);
    const [invitations, setInvitations] = useState<Invitation[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string>('');
    const [success, setSuccess] = useState<string>('');
    const [activeTab, setActiveTab] = useState<'users' | 'invitations'>('users');
    const [searchTerm, setSearchTerm] = useState('');
    const [roleFilter, setRoleFilter] = useState('');
    const [showInviteModal, setShowInviteModal] = useState(false);
    const [inviteForm, setInviteForm] = useState({
        email: '',
        role: 'member',
        message: ''
    });
    const [isInviting, setIsInviting] = useState(false);

    useEffect(() => {
        loadData();
    }, [tenantId]);

    const loadData = async () => {
        try {
            setIsLoading(true);
            setError('');

            const authToken = localStorage.getItem('auth_token');
            const headers = {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            };

            const [usersResponse, invitationsResponse] = await Promise.all([
                fetch(`/api/users`, { headers }),
                fetch(`/api/users/invitations`, { headers })
            ]);

            if (!usersResponse.ok || !invitationsResponse.ok) {
                throw new Error('Failed to load user data');
            }

            const usersData = await usersResponse.json();
            const invitationsData = await invitationsResponse.json();

            setUsers(usersData.users || []);
            setInvitations(invitationsData.invitations || []);

        } catch (error) {
            console.error('Error loading user data:', error);
            setError(error instanceof Error ? error.message : 'Failed to load user data');
        } finally {
            setIsLoading(false);
        }
    };

    const handleInviteUser = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!inviteForm.email || !inviteForm.role) {
            setError('Email and role are required');
            return;
        }

        try {
            setIsInviting(true);
            setError('');

            const authToken = localStorage.getItem('auth_token');
            const response = await fetch('/api/users/invite', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(inviteForm)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to send invitation');
            }

            setSuccess('Invitation sent successfully!');
            setShowInviteModal(false);
            setInviteForm({ email: '', role: 'member', message: '' });
            await loadData(); // Refresh the data

            setTimeout(() => setSuccess(''), 3000);

        } catch (error) {
            console.error('Error inviting user:', error);
            setError(error instanceof Error ? error.message : 'Failed to send invitation');
        } finally {
            setIsInviting(false);
        }
    };

    const handleUpdateUserRole = async (userId: string, newRole: string) => {
        try {
            setError('');

            const authToken = localStorage.getItem('auth_token');
            const response = await fetch(`/api/users/${userId}/role`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ role: newRole })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to update user role');
            }

            setSuccess('User role updated successfully!');
            await loadData(); // Refresh the data

            setTimeout(() => setSuccess(''), 3000);

        } catch (error) {
            console.error('Error updating user role:', error);
            setError(error instanceof Error ? error.message : 'Failed to update user role');
        }
    };

    const handleResendInvitation = async (invitationId: string) => {
        try {
            setError('');

            const authToken = localStorage.getItem('auth_token');
            const response = await fetch(`/api/users/invitations/${invitationId}/resend`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to resend invitation');
            }

            setSuccess('Invitation resent successfully!');
            await loadData(); // Refresh the data

            setTimeout(() => setSuccess(''), 3000);

        } catch (error) {
            console.error('Error resending invitation:', error);
            setError(error instanceof Error ? error.message : 'Failed to resend invitation');
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'active':
                return <CheckCircle className="h-4 w-4 text-green-500" />;
            case 'inactive':
                return <XCircle className="h-4 w-4 text-red-500" />;
            case 'pending':
                return <Clock className="h-4 w-4 text-yellow-500" />;
            default:
                return <Clock className="h-4 w-4 text-gray-500" />;
        }
    };

    const getRoleBadgeColor = (role: string) => {
        switch (role) {
            case 'admin':
                return 'bg-red-100 text-red-800';
            case 'manager':
                return 'bg-blue-100 text-blue-800';
            case 'member':
                return 'bg-green-100 text-green-800';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    };

    const filteredUsers = users.filter(user =>
        (user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
         user.email.toLowerCase().includes(searchTerm.toLowerCase())) &&
        (roleFilter === '' || user.role === roleFilter)
    );

    const filteredInvitations = invitations.filter(invitation =>
        invitation.email.toLowerCase().includes(searchTerm.toLowerCase()) &&
        (roleFilter === '' || invitation.role === roleFilter)
    );

    if (isLoading) {
        return (
            <div className="p-6">
                <div className="flex items-center justify-center h-64">
                    <Loader />
                </div>
            </div>
        );
    }

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
                    <p className="text-gray-600">Manage users and team invitations</p>
                </div>
                <button
                    onClick={() => setShowInviteModal(true)}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2 hover:bg-blue-700 transition-colors"
                >
                    <UserPlus className="h-4 w-4" />
                    <span>Invite User</span>
                </button>
            </div>

            {error && <ErrorMessage message={error} />}
            {success && <InfoMessage message={success} onDismiss={() => setSuccess('')} />}

            {/* Tabs */}
            <div className="flex space-x-1 mb-6 bg-gray-100 rounded-lg p-1">
                <button
                    onClick={() => setActiveTab('users')}
                    className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                        activeTab === 'users'
                            ? 'bg-white text-blue-600 shadow-sm'
                            : 'text-gray-500 hover:text-gray-700'
                    }`}
                >
                    <div className="flex items-center justify-center space-x-2">
                        <Users className="h-4 w-4" />
                        <span>Users ({users.length})</span>
                    </div>
                </button>
                <button
                    onClick={() => setActiveTab('invitations')}
                    className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                        activeTab === 'invitations'
                            ? 'bg-white text-blue-600 shadow-sm'
                            : 'text-gray-500 hover:text-gray-700'
                    }`}
                >
                    <div className="flex items-center justify-center space-x-2">
                        <Mail className="h-4 w-4" />
                        <span>Invitations ({invitations.length})</span>
                    </div>
                </button>
            </div>

            {/* Search and Filter */}
            <div className="flex space-x-4 mb-6">
                <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search by name or email..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                </div>
                <div className="relative">
                    <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <select
                        value={roleFilter}
                        onChange={(e) => setRoleFilter(e.target.value)}
                        className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                        <option value="">All Roles</option>
                        <option value="admin">Admin</option>
                        <option value="manager">Manager</option>
                        <option value="member">Member</option>
                    </select>
                </div>
            </div>

            {/* Content */}
            {activeTab === 'users' ? (
                <div className="bg-white rounded-lg shadow overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        User
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Role
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Status
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Last Login
                                    </th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {filteredUsers.map((user) => (
                                    <tr key={user.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div>
                                                <div className="text-sm font-medium text-gray-900">{user.name}</div>
                                                <div className="text-sm text-gray-500">{user.email}</div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getRoleBadgeColor(user.role)}`}>
                                                {user.role}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center space-x-2">
                                                {getStatusIcon(user.status)}
                                                <span className="text-sm text-gray-900 capitalize">{user.status}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : 'Never'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <button className="text-gray-400 hover:text-gray-600">
                                                <MoreVertical className="h-4 w-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    
                    {filteredUsers.length === 0 && (
                        <div className="text-center py-12">
                            <Users className="mx-auto h-12 w-12 text-gray-400" />
                            <h3 className="mt-2 text-sm font-medium text-gray-900">No users found</h3>
                            <p className="mt-1 text-sm text-gray-500">
                                {searchTerm || roleFilter ? 'Try adjusting your search or filters.' : 'Get started by inviting team members.'}
                            </p>
                        </div>
                    )}
                </div>
            ) : (
                <div className="bg-white rounded-lg shadow overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Email
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Role
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Status
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Invited By
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Expires
                                    </th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {filteredInvitations.map((invitation) => (
                                    <tr key={invitation.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm font-medium text-gray-900">{invitation.email}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getRoleBadgeColor(invitation.role)}`}>
                                                {invitation.role}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center space-x-2">
                                                {getStatusIcon(invitation.status)}
                                                <span className="text-sm text-gray-900 capitalize">{invitation.status}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {invitation.inviterName}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {new Date(invitation.expiresAt).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            {invitation.status === 'pending' && (
                                                <button
                                                    onClick={() => handleResendInvitation(invitation.id)}
                                                    className="text-blue-600 hover:text-blue-900 mr-4"
                                                >
                                                    Resend
                                                </button>
                                            )}
                                            <button className="text-gray-400 hover:text-gray-600">
                                                <MoreVertical className="h-4 w-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    
                    {filteredInvitations.length === 0 && (
                        <div className="text-center py-12">
                            <Mail className="mx-auto h-12 w-12 text-gray-400" />
                            <h3 className="mt-2 text-sm font-medium text-gray-900">No invitations found</h3>
                            <p className="mt-1 text-sm text-gray-500">
                                {searchTerm || roleFilter ? 'Try adjusting your search or filters.' : 'Pending invitations will appear here.'}
                            </p>
                        </div>
                    )}
                </div>
            )}

            {/* Invite Modal */}
            {showInviteModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
                        <h3 className="text-lg font-medium text-gray-900 mb-4">Invite Team Member</h3>
                        
                        <form onSubmit={handleInviteUser} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Email Address
                                </label>
                                <input
                                    type="email"
                                    value={inviteForm.email}
                                    onChange={(e) => setInviteForm({...inviteForm, email: e.target.value})}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    placeholder="colleague@company.com"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Role
                                </label>
                                <select
                                    value={inviteForm.role}
                                    onChange={(e) => setInviteForm({...inviteForm, role: e.target.value})}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                >
                                    <option value="member">Member</option>
                                    <option value="manager">Manager</option>
                                    <option value="admin">Admin</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Personal Message (Optional)
                                </label>
                                <textarea
                                    value={inviteForm.message}
                                    onChange={(e) => setInviteForm({...inviteForm, message: e.target.value})}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    rows={3}
                                    placeholder="Welcome to our team!"
                                />
                            </div>

                            <div className="flex space-x-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setShowInviteModal(false)}
                                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isInviting}
                                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    {isInviting ? (
                                        <div className="flex items-center justify-center space-x-2">
                                            <Loader />
                                            <span>Inviting...</span>
                                        </div>
                                    ) : (
                                        'Send Invitation'
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};