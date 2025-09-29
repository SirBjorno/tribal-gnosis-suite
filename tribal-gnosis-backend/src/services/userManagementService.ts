import crypto from 'crypto';
import { UserInvitation, UserProfile, UserPermission, ROLE_PERMISSIONS, ONBOARDING_STEPS, IUserProfile, IUserPermission } from '../models/userManagement';
import { User, Tenant } from '../models/index';
import { sendInvitationEmail } from './emailService';

export class UserManagementService {
  
  // User invitation functions
  async inviteUser(inviterUserId: string, tenantId: string, email: string, role: 'admin' | 'analyst' | 'user') {
    try {
      // Check if inviter has permission
      const inviter = await User.findById(inviterUserId);
      if (!inviter || inviter.tenantId.toString() !== tenantId) {
        throw new Error('Unauthorized: Cannot invite users to this tenant');
      }

      // Check if user already exists in this tenant
      const existingUser = await User.findOne({ email, tenantId });
      if (existingUser) {
        throw new Error('User already exists in this organization');
      }

      // Check for existing pending invitation
      const existingInvitation = await UserInvitation.findOne({ 
        email, 
        tenantId, 
        status: 'pending' 
      });
      if (existingInvitation) {
        throw new Error('User already has a pending invitation');
      }

      // Check subscription limits
      const tenant = await Tenant.findById(tenantId);
      if (!tenant) {
        throw new Error('Tenant not found');
      }

      const currentUserCount = await User.countDocuments({ tenantId });
      const tierLimits = await this.getSubscriptionLimits(tenant.subscription.tier);
      
      if (tierLimits.maxUsers !== -1 && currentUserCount >= tierLimits.maxUsers) {
        throw new Error(`User limit reached. Your plan allows ${tierLimits.maxUsers} users. Please upgrade to add more users.`);
      }

      // Generate invitation token
      const token = crypto.randomBytes(32).toString('hex');

      // Create invitation
      const invitation = new UserInvitation({
        tenantId,
        email: email.toLowerCase(),
        role,
        invitedBy: inviterUserId,
        token,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
      });

      await invitation.save();

      // Send invitation email
      await sendInvitationEmail(email, token, tenant.name, inviter.name, role);

      return {
        success: true,
        invitation: {
          id: invitation._id,
          email: invitation.email,
          role: invitation.role,
          expiresAt: invitation.expiresAt,
          invitedBy: inviter.name
        }
      };

    } catch (error: any) {
      throw new Error(`Failed to invite user: ${error.message}`);
    }
  }

  async acceptInvitation(token: string, userData: { name: string; password: string }) {
    try {
      // Find and validate invitation
      const invitation = await UserInvitation.findOne({ 
        token, 
        status: 'pending',
        expiresAt: { $gt: new Date() }
      }).populate('tenantId');

      if (!invitation) {
        throw new Error('Invalid or expired invitation token');
      }

      // Check if user already exists globally
      const existingUser = await User.findOne({ email: invitation.email });
      if (existingUser) {
        throw new Error('User already exists with this email');
      }

      // Create new user
      const user = new User({
        name: userData.name,
        email: invitation.email,
        password: userData.password, // This will be hashed by the User schema pre-save hook
        role: invitation.role,
        tenantId: invitation.tenantId,
        isActive: true
      });

      await user.save();

      // Create user profile with defaults
      const profile = new UserProfile({
        userId: user._id,
        displayName: userData.name,
        onboardingCompleted: false,
        onboardingStep: 1
      });

      await profile.save();

      // Create user permissions based on role
      const permissions = new UserPermission({
        userId: user._id,
        tenantId: invitation.tenantId,
        permissions: ROLE_PERMISSIONS[invitation.role],
        grantedBy: invitation.invitedBy
      });

      await permissions.save();

      // Mark invitation as accepted
      invitation.status = 'accepted';
      invitation.acceptedAt = new Date();
      await invitation.save();

      return {
        success: true,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          tenant: invitation.tenantId
        },
        profile: {
          onboardingRequired: true,
          onboardingStep: 1
        }
      };

    } catch (error: any) {
      throw new Error(`Failed to accept invitation: ${error.message}`);
    }
  }

  async revokeInvitation(invitationId: string, revokerUserId: string) {
    try {
      const invitation = await UserInvitation.findById(invitationId);
      if (!invitation) {
        throw new Error('Invitation not found');
      }

      // Check permission to revoke
      const revoker = await User.findById(revokerUserId);
      if (!revoker || revoker.tenantId.toString() !== invitation.tenantId.toString()) {
        throw new Error('Unauthorized: Cannot revoke this invitation');
      }

      invitation.status = 'revoked';
      await invitation.save();

      return { success: true };

    } catch (error: any) {
      throw new Error(`Failed to revoke invitation: ${error.message}`);
    }
  }

  async getInvitations(tenantId: string, userId: string) {
    try {
      // Verify user has permission to view invitations
      const user = await User.findById(userId);
      if (!user || user.tenantId.toString() !== tenantId) {
        throw new Error('Unauthorized');
      }

      const invitations = await UserInvitation.find({ tenantId })
        .populate('invitedBy', 'name email')
        .sort({ createdAt: -1 });

      return invitations.map(inv => ({
        id: inv._id,
        email: inv.email,
        role: inv.role,
        status: inv.status,
        createdAt: inv.createdAt,
        expiresAt: inv.expiresAt,
        invitedBy: inv.invitedBy,
        acceptedAt: inv.acceptedAt
      }));

    } catch (error: any) {
      throw new Error(`Failed to get invitations: ${error.message}`);
    }
  }

  // User profile management
  async updateUserProfile(userId: string, updates: Partial<IUserProfile>) {
    try {
      const profile = await UserProfile.findOneAndUpdate(
        { userId },
        { $set: updates },
        { new: true, upsert: true }
      );

      return profile;

    } catch (error: any) {
      throw new Error(`Failed to update profile: ${error.message}`);
    }
  }

  async getUserProfile(userId: string) {
    try {
      const profile = await UserProfile.findOne({ userId });
      if (!profile) {
        // Create default profile if it doesn't exist
        const user = await User.findById(userId);
        if (!user) {
          throw new Error('User not found');
        }

        const defaultProfile = new UserProfile({
          userId,
          displayName: user.name,
          onboardingCompleted: false,
          onboardingStep: 1
        });

        await defaultProfile.save();
        return defaultProfile;
      }

      return profile;

    } catch (error: any) {
      throw new Error(`Failed to get profile: ${error.message}`);
    }
  }

  async updateOnboardingProgress(userId: string, step: number, completed: boolean = false) {
    try {
      const updates: any = { onboardingStep: step };
      if (completed) {
        updates.onboardingCompleted = true;
      }

      const profile = await UserProfile.findOneAndUpdate(
        { userId },
        { $set: updates },
        { new: true, upsert: true }
      );

      return profile;

    } catch (error: any) {
      throw new Error(`Failed to update onboarding: ${error.message}`);
    }
  }

  // Permission management
  async getUserPermissions(userId: string, tenantId: string) {
    try {
      let permissions = await UserPermission.findOne({ userId, tenantId });
      
      if (!permissions) {
        // Create default permissions based on user role
        const user = await User.findById(userId);
        if (!user) {
          throw new Error('User not found');
        }

        permissions = new UserPermission({
          userId,
          tenantId,
          permissions: ROLE_PERMISSIONS[user.role as keyof typeof ROLE_PERMISSIONS],
          grantedBy: userId // Self-granted for existing users
        });

        await permissions.save();
      }

      return permissions;

    } catch (error: any) {
      throw new Error(`Failed to get permissions: ${error.message}`);
    }
  }

  async updateUserPermissions(
    targetUserId: string, 
    tenantId: string, 
    newPermissions: Partial<IUserPermission['permissions']>,
    updaterUserId: string
  ) {
    try {
      // Check if updater has permission to modify permissions
      const updaterPermissions = await this.getUserPermissions(updaterUserId, tenantId);
      if (!updaterPermissions.permissions.manageUsers) {
        throw new Error('Unauthorized: Cannot modify user permissions');
      }

      const permissions = await UserPermission.findOneAndUpdate(
        { userId: targetUserId, tenantId },
        { 
          $set: { 
            permissions: newPermissions,
            grantedBy: updaterUserId,
            grantedAt: new Date()
          }
        },
        { new: true, upsert: true }
      );

      return permissions;

    } catch (error: any) {
      throw new Error(`Failed to update permissions: ${error.message}`);
    }
  }

  async hasPermission(userId: string, tenantId: string, permission: string): Promise<boolean> {
    try {
      const userPermissions = await this.getUserPermissions(userId, tenantId);
      return userPermissions.permissions[permission as keyof typeof userPermissions.permissions] || false;

    } catch (error) {
      return false;
    }
  }

  // User management
  async getTenantUsers(tenantId: string, requesterId: string) {
    try {
      // Check if requester has permission
      const hasPermission = await this.hasPermission(requesterId, tenantId, 'viewUsers');
      if (!hasPermission) {
        throw new Error('Unauthorized: Cannot view users');
      }

      const users = await User.find({ tenantId, isActive: true })
        .select('name email role createdAt lastLoginAt')
        .sort({ createdAt: -1 });

      // Get profiles for additional info
      const userIds: string[] = [];
      for (const user of users) {
        userIds.push(user._id.toString());
      }
      const userProfiles = await UserProfile.find({ 
        userId: { $in: userIds } 
      });

      const profileMap = userProfiles.reduce((acc, profile) => {
        acc[profile.userId.toString()] = profile;
        return acc;
      }, {} as any);

      return users.map((user: any) => ({
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
        lastLoginAt: profileMap[user._id.toString()]?.lastLoginAt,
        onboardingCompleted: profileMap[user._id.toString()]?.onboardingCompleted || false,
        avatar: profileMap[user._id.toString()]?.avatar
      }));

    } catch (error: any) {
      throw new Error(`Failed to get tenant users: ${error.message}`);
    }
  }

  async updateUserRole(targetUserId: string, tenantId: string, newRole: string, updaterUserId: string) {
    try {
      // Check permission
      const hasPermission = await this.hasPermission(updaterUserId, tenantId, 'manageUsers');
      if (!hasPermission) {
        throw new Error('Unauthorized: Cannot modify user roles');
      }

      // Update user role
      const user = await User.findByIdAndUpdate(
        targetUserId,
        { role: newRole },
        { new: true }
      );

      if (!user) {
        throw new Error('User not found');
      }

      // Update permissions based on new role
      await UserPermission.findOneAndUpdate(
        { userId: targetUserId, tenantId },
        { 
          permissions: ROLE_PERMISSIONS[newRole as keyof typeof ROLE_PERMISSIONS],
          grantedBy: updaterUserId,
          grantedAt: new Date()
        }
      );

      return user;

    } catch (error: any) {
      throw new Error(`Failed to update user role: ${error.message}`);
    }
  }

  async deactivateUser(targetUserId: string, tenantId: string, deactivatorUserId: string) {
    try {
      // Check permission
      const hasPermission = await this.hasPermission(deactivatorUserId, tenantId, 'manageUsers');
      if (!hasPermission) {
        throw new Error('Unauthorized: Cannot deactivate users');
      }

      // Prevent self-deactivation
      if (targetUserId === deactivatorUserId) {
        throw new Error('Cannot deactivate your own account');
      }

      const user = await User.findByIdAndUpdate(
        targetUserId,
        { isActive: false },
        { new: true }
      );

      return user;

    } catch (error: any) {
      throw new Error(`Failed to deactivate user: ${error.message}`);
    }
  }

  // Helper functions
  private async getSubscriptionLimits(tier: string) {
    // This would typically be imported from subscription service
    const { SUBSCRIPTION_TIERS } = await import('../models/index');
    return SUBSCRIPTION_TIERS[tier] || SUBSCRIPTION_TIERS.STARTER;
  }
}

export const userManagementService = new UserManagementService();
export default userManagementService;