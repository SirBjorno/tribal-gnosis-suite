import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User } from '../models';

export interface AuthenticatedRequest extends Request {
  user: {
    userId: string;
    email: string;
    role: string;
    tenantId: string;
  };
}

export const authenticateToken = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ message: 'Access token required' });
    }

    const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
    
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    
    // Get user details from database
    const user = await User.findById(decoded.userId).populate('tenantId');
    
    if (!user || !user.active) {
      return res.status(403).json({ message: 'User not found or inactive' });
    }

    // Add user info to request
    (req as AuthenticatedRequest).user = {
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
      tenantId: user.tenantId.toString()
    };

    next();
  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(403).json({ message: 'Invalid or expired token' });
  }
};

export const requireRole = (roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as AuthenticatedRequest).user;
    
    if (!user || !roles.includes(user.role)) {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }
    
    next();
  };
};

export const requirePermission = (permission: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = (req as AuthenticatedRequest).user;
      
      if (!user) {
        return res.status(401).json({ message: 'Authentication required' });
      }

      // Import here to avoid circular dependency
      const { UserPermission } = await import('../models/userManagement');
      
      const userPermissions = await UserPermission.findOne({
        userId: user.userId,
        tenantId: user.tenantId
      });

      if (!userPermissions || !userPermissions.permissions[permission as keyof typeof userPermissions.permissions]) {
        return res.status(403).json({ message: `Permission '${permission}' required` });
      }
      
      next();
    } catch (error) {
      console.error('Permission check error:', error);
      return res.status(500).json({ message: 'Permission check failed' });
    }
  };
};