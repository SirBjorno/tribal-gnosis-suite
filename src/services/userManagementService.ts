export interface UserInvitation {
    id: string;
    email: string;
    role: string;
    inviterName: string;
    organizationName: string;
    status: 'pending' | 'accepted' | 'expired';
    createdAt: string;
    expiresAt: string;
}

export interface User {
    id: string;
    name: string;
    email: string;
    role: string;
    status: 'active' | 'inactive' | 'pending';
    lastLogin?: string;
    createdAt: string;
    permissions: string[];
}

export interface UserProfile {
    id: string;
    userId: string;
    fullName: string;
    title?: string;
    department?: string;
    phone?: string;
    bio?: string;
    avatarUrl?: string;
    preferences: {
        notifications: {
            email: boolean;
            inApp: boolean;
            digest: boolean;
        };
        privacy: {
            profileVisible: boolean;
            activityVisible: boolean;
        };
        ui: {
            theme: 'light' | 'dark' | 'auto';
            language: string;
        };
    };
    onboardingCompleted: boolean;
    onboardingProgress: {
        step: string;
        completedSteps: string[];
        completedAt?: string;
    };
}

export interface InviteUserRequest {
    email: string;
    role: string;
    message?: string;
}

export interface AcceptInvitationRequest {
    token: string;
    fullName: string;
    password: string;
}

class UserManagementService {
    private baseUrl = '/api';
    
    private getAuthHeaders(): HeadersInit {
        const token = localStorage.getItem('auth_token');
        return {
            'Content-Type': 'application/json',
            ...(token && { 'Authorization': `Bearer ${token}` })
        };
    }

    // User Management
    async getUsers(): Promise<{ users: User[] }> {
        const response = await fetch(`${this.baseUrl}/users`, {
            headers: this.getAuthHeaders()
        });

        if (!response.ok) {
            throw new Error('Failed to fetch users');
        }

        return response.json();
    }

    async getUserProfile(userId?: string): Promise<{ profile: UserProfile }> {
        const endpoint = userId 
            ? `${this.baseUrl}/users/${userId}/profile`
            : `${this.baseUrl}/users/profile`;
            
        const response = await fetch(endpoint, {
            headers: this.getAuthHeaders()
        });

        if (!response.ok) {
            throw new Error('Failed to fetch user profile');
        }

        return response.json();
    }

    async updateUserProfile(profile: Partial<UserProfile>): Promise<{ profile: UserProfile }> {
        const response = await fetch(`${this.baseUrl}/users/profile`, {
            method: 'PUT',
            headers: this.getAuthHeaders(),
            body: JSON.stringify(profile)
        });

        if (!response.ok) {
            throw new Error('Failed to update user profile');
        }

        return response.json();
    }

    async updateUserRole(userId: string, role: string): Promise<{ user: User }> {
        const response = await fetch(`${this.baseUrl}/users/${userId}/role`, {
            method: 'PUT',
            headers: this.getAuthHeaders(),
            body: JSON.stringify({ role })
        });

        if (!response.ok) {
            throw new Error('Failed to update user role');
        }

        return response.json();
    }

    async updateUserPermissions(userId: string, permissions: string[]): Promise<{ permissions: string[] }> {
        const response = await fetch(`${this.baseUrl}/users/permissions/${userId}`, {
            method: 'PUT',
            headers: this.getAuthHeaders(),
            body: JSON.stringify({ permissions })
        });

        if (!response.ok) {
            throw new Error('Failed to update user permissions');
        }

        return response.json();
    }

    async deactivateUser(userId: string): Promise<{ user: User }> {
        const response = await fetch(`${this.baseUrl}/users/${userId}/deactivate`, {
            method: 'PUT',
            headers: this.getAuthHeaders()
        });

        if (!response.ok) {
            throw new Error('Failed to deactivate user');
        }

        return response.json();
    }

    async reactivateUser(userId: string): Promise<{ user: User }> {
        const response = await fetch(`${this.baseUrl}/users/${userId}/reactivate`, {
            method: 'PUT',
            headers: this.getAuthHeaders()
        });

        if (!response.ok) {
            throw new Error('Failed to reactivate user');
        }

        return response.json();
    }

    // Invitation Management
    async inviteUser(inviteData: InviteUserRequest): Promise<{ invitation: UserInvitation }> {
        const response = await fetch(`${this.baseUrl}/users/invite`, {
            method: 'POST',
            headers: this.getAuthHeaders(),
            body: JSON.stringify(inviteData)
        });

        if (!response.ok) {
            throw new Error('Failed to send invitation');
        }

        return response.json();
    }

    async getInvitations(): Promise<{ invitations: UserInvitation[] }> {
        const response = await fetch(`${this.baseUrl}/users/invitations`, {
            headers: this.getAuthHeaders()
        });

        if (!response.ok) {
            throw new Error('Failed to fetch invitations');
        }

        return response.json();
    }

    async resendInvitation(invitationId: string): Promise<{ invitation: UserInvitation }> {
        const response = await fetch(`${this.baseUrl}/users/invitations/${invitationId}/resend`, {
            method: 'POST',
            headers: this.getAuthHeaders()
        });

        if (!response.ok) {
            throw new Error('Failed to resend invitation');
        }

        return response.json();
    }

    async cancelInvitation(invitationId: string): Promise<void> {
        const response = await fetch(`${this.baseUrl}/users/invitations/${invitationId}/cancel`, {
            method: 'DELETE',
            headers: this.getAuthHeaders()
        });

        if (!response.ok) {
            throw new Error('Failed to cancel invitation');
        }
    }

    // Public invitation methods (no auth required)
    async getInvitationDetails(token: string): Promise<{ invitation: UserInvitation }> {
        const response = await fetch(`${this.baseUrl}/invitations/invitation/${token}`);

        if (!response.ok) {
            throw new Error('Failed to fetch invitation details');
        }

        return response.json();
    }

    async acceptInvitation(acceptData: AcceptInvitationRequest): Promise<{ user: User; token: string }> {
        const response = await fetch(`${this.baseUrl}/invitations/accept-invitation`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(acceptData)
        });

        if (!response.ok) {
            throw new Error('Failed to accept invitation');
        }

        return response.json();
    }

    // Onboarding
    async updateOnboardingProgress(step: string, completed: boolean = true): Promise<{ profile: UserProfile }> {
        const response = await fetch(`${this.baseUrl}/users/onboarding/progress`, {
            method: 'PUT',
            headers: this.getAuthHeaders(),
            body: JSON.stringify({ step, completed })
        });

        if (!response.ok) {
            throw new Error('Failed to update onboarding progress');
        }

        return response.json();
    }

    async completeOnboarding(): Promise<{ profile: UserProfile }> {
        const response = await fetch(`${this.baseUrl}/users/onboarding/complete`, {
            method: 'PUT',
            headers: this.getAuthHeaders()
        });

        if (!response.ok) {
            throw new Error('Failed to complete onboarding');
        }

        return response.json();
    }

    // User Search and Filtering
    async searchUsers(query: string, filters?: {
        role?: string;
        status?: string;
        department?: string;
    }): Promise<{ users: User[] }> {
        const params = new URLSearchParams({
            q: query,
            ...filters
        });

        const response = await fetch(`${this.baseUrl}/users/search?${params}`, {
            headers: this.getAuthHeaders()
        });

        if (!response.ok) {
            throw new Error('Failed to search users');
        }

        return response.json();
    }

    // Permissions
    async getUserPermissions(userId?: string): Promise<{ permissions: string[] }> {
        const endpoint = userId 
            ? `${this.baseUrl}/users/permissions/${userId}`
            : `${this.baseUrl}/users/permissions`;
            
        const response = await fetch(endpoint, {
            headers: this.getAuthHeaders()
        });

        if (!response.ok) {
            throw new Error('Failed to fetch user permissions');
        }

        return response.json();
    }

    async checkPermission(permission: string): Promise<boolean> {
        try {
            const { permissions } = await this.getUserPermissions();
            return permissions.includes(permission);
        } catch (error) {
            console.error('Error checking permission:', error);
            return false;
        }
    }

    // Utility methods
    getRoleBadgeColor(role: string): string {
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
    }

    formatUserStatus(status: string): string {
        return status.charAt(0).toUpperCase() + status.slice(1);
    }

    isInvitationExpired(expiresAt: string): boolean {
        return new Date(expiresAt) < new Date();
    }

    formatLastLogin(lastLogin?: string): string {
        if (!lastLogin) return 'Never';
        
        const date = new Date(lastLogin);
        const now = new Date();
        const diffInDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
        
        if (diffInDays === 0) return 'Today';
        if (diffInDays === 1) return 'Yesterday';
        if (diffInDays < 7) return `${diffInDays} days ago`;
        
        return date.toLocaleDateString();
    }
}

export const userManagementService = new UserManagementService();