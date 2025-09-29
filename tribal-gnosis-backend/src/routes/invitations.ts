import express from 'express';
import { userManagementService } from '../services/userManagementService';
import { UserInvitation } from '../models/userManagement';

const router = express.Router();

// Accept invitation - no auth required
router.post('/accept-invitation', async (req, res) => {
  try {
    const { token, name, password } = req.body;

    if (!token || !name || !password) {
      return res.status(400).json({ 
        error: 'Token, name, and password are required' 
      });
    }

    if (password.length < 8) {
      return res.status(400).json({ 
        error: 'Password must be at least 8 characters long' 
      });
    }

    const result = await userManagementService.acceptInvitation(token, {
      name,
      password
    });

    res.json(result);

  } catch (error: any) {
    console.error('Accept invitation error:', error);
    res.status(400).json({ error: error.message });
  }
});

// Get invitation details - no auth required
router.get('/invitation/:token', async (req, res) => {
  try {
    const { token } = req.params;

    const invitation = await UserInvitation.findOne({ 
      token, 
      status: 'pending',
      expiresAt: { $gt: new Date() }
    }).populate('tenantId', 'name');

    if (!invitation) {
      return res.status(404).json({ error: 'Invalid or expired invitation' });
    }

    res.json({
      email: invitation.email,
      role: invitation.role,
      companyName: (invitation.tenantId as any).name,
      expiresAt: invitation.expiresAt
    });

  } catch (error: any) {
    console.error('Get invitation error:', error);
    res.status(400).json({ error: error.message });
  }
});

export default router;