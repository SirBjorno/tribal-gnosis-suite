import express from 'express';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';
import { userManagementService } from '../services/userManagementService';
import { UserProfile, ONBOARDING_STEPS } from '../models/userManagement';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// User invitation routes
router.post('/invite', async (req, res) => {
  try {
    const { email, role = 'user' } = req.body;
    const authReq = req as AuthenticatedRequest;
    const inviterUserId = authReq.user.userId;
    const tenantId = authReq.user.tenantId;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    if (!['admin', 'analyst', 'user'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role specified' });
    }

    const result = await userManagementService.inviteUser(
      inviterUserId,
      tenantId,
      email,
      role
    );

    res.json(result);

  } catch (error: any) {
    console.error('Invite user error:', error);
    res.status(400).json({ error: error.message });
  }
});

router.get('/invitations', async (req, res) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const userId = authReq.user.userId;
    const tenantId = authReq.user.tenantId;

    const invitations = await userManagementService.getInvitations(tenantId, userId);
    res.json(invitations);

  } catch (error: any) {
    console.error('Get invitations error:', error);
    res.status(400).json({ error: error.message });
  }
});

router.delete('/invitations/:invitationId', async (req, res) => {
  try {
    const { invitationId } = req.params;
    const authReq = req as unknown as AuthenticatedRequest;
    const revokerUserId = authReq.user.userId;

    const result = await userManagementService.revokeInvitation(invitationId, revokerUserId);
    res.json(result);

  } catch (error: any) {
    console.error('Revoke invitation error:', error);
    res.status(400).json({ error: error.message });
  }
});

// User profile routes
router.get('/profile', async (req, res) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const userId = authReq.user.userId;
    const profile = await userManagementService.getUserProfile(userId);
    res.json(profile);

  } catch (error: any) {
    console.error('Get profile error:', error);
    res.status(400).json({ error: error.message });
  }
});

router.put('/profile', async (req, res) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const userId = authReq.user.userId;
    const updates = req.body;

    // Remove sensitive fields that shouldn't be updated via this endpoint
    delete updates.userId;
    delete updates._id;
    delete updates.__v;

    const profile = await userManagementService.updateUserProfile(userId, updates);
    res.json(profile);

  } catch (error: any) {
    console.error('Update profile error:', error);
    res.status(400).json({ error: error.message });
  }
});

// Onboarding routes
router.get('/onboarding/steps', async (req, res) => {
  try {
    res.json(ONBOARDING_STEPS);
  } catch (error: any) {
    console.error('Get onboarding steps error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.put('/onboarding/progress', async (req, res) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const userId = authReq.user.userId;
    const { step, completed = false } = req.body;

    if (typeof step !== 'number') {
      return res.status(400).json({ error: 'Step must be a number' });
    }

    const profile = await userManagementService.updateOnboardingProgress(userId, step, completed);
    res.json(profile);

  } catch (error: any) {
    console.error('Update onboarding progress error:', error);
    res.status(400).json({ error: error.message });
  }
});

// Permission routes
router.get('/permissions', async (req, res) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const userId = authReq.user.userId;
    const tenantId = authReq.user.tenantId;

    const permissions = await userManagementService.getUserPermissions(userId, tenantId);
    res.json(permissions);

  } catch (error: any) {
    console.error('Get permissions error:', error);
    res.status(400).json({ error: error.message });
  }
});

router.put('/permissions/:targetUserId', async (req, res) => {
  try {
    const authReq = req as unknown as AuthenticatedRequest;
    const { targetUserId } = req.params;
    const updaterUserId = authReq.user.userId;
    const tenantId = authReq.user.tenantId;
    const { permissions } = req.body;

    if (!permissions || typeof permissions !== 'object') {
      return res.status(400).json({ error: 'Permissions object is required' });
    }

    const result = await userManagementService.updateUserPermissions(
      targetUserId,
      tenantId,
      permissions,
      updaterUserId
    );

    res.json(result);

  } catch (error: any) {
    console.error('Update permissions error:', error);
    res.status(400).json({ error: error.message });
  }
});

// User management routes
router.get('/users', async (req, res) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const requesterId = authReq.user.userId;
    const tenantId = authReq.user.tenantId;

    const users = await userManagementService.getTenantUsers(tenantId, requesterId);
    res.json(users);

  } catch (error: any) {
    console.error('Get users error:', error);
    res.status(400).json({ error: error.message });
  }
});

router.put('/users/:targetUserId/role', async (req, res) => {
  try {
    const authReq = req as unknown as AuthenticatedRequest;
    const { targetUserId } = req.params;
    const { role } = req.body;
    const updaterUserId = authReq.user.userId;
    const tenantId = authReq.user.tenantId;

    if (!role || !['admin', 'analyst', 'user'].includes(role)) {
      return res.status(400).json({ error: 'Valid role is required' });
    }

    const result = await userManagementService.updateUserRole(
      targetUserId,
      tenantId,
      role,
      updaterUserId
    );

    res.json(result);

  } catch (error: any) {
    console.error('Update user role error:', error);
    res.status(400).json({ error: error.message });
  }
});

router.put('/users/:targetUserId/deactivate', async (req, res) => {
  try {
    const authReq = req as unknown as AuthenticatedRequest;
    const { targetUserId } = req.params;
    const deactivatorUserId = authReq.user.userId;
    const tenantId = authReq.user.tenantId;

    const result = await userManagementService.deactivateUser(
      targetUserId,
      tenantId,
      deactivatorUserId
    );

    res.json(result);

  } catch (error: any) {
    console.error('Deactivate user error:', error);
    res.status(400).json({ error: error.message });
  }
});

// Permission check helper endpoint
router.post('/check-permission', async (req, res) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const userId = authReq.user.userId;
    const tenantId = authReq.user.tenantId;
    const { permission } = req.body;

    if (!permission) {
      return res.status(400).json({ error: 'Permission name is required' });
    }

    const hasPermission = await userManagementService.hasPermission(userId, tenantId, permission);
    res.json({ hasPermission });

  } catch (error: any) {
    console.error('Check permission error:', error);
    res.status(400).json({ error: error.message });
  }
});

export default router;