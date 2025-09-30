import bcrypt from 'bcryptjs';
import { Request } from 'express';

// Password strength validation
export const validatePasswordStrength = (password: string): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }
  
  if (password.length > 128) {
    errors.push('Password must not exceed 128 characters');
  }
  
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  
  if (!/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  
  if (!/[@$!%*?&]/.test(password)) {
    errors.push('Password must contain at least one special character (@$!%*?&)');
  }
  
  // Check for common patterns
  if (/(.)\1{2,}/.test(password)) {
    errors.push('Password must not contain repeated characters (3+ consecutive)');
  }
  
  // Common password patterns
  const commonPatterns = [
    /123456/,
    /password/i,
    /qwerty/i,
    /abc123/i,
    /admin/i,
    /letmein/i,
  ];
  
  for (const pattern of commonPatterns) {
    if (pattern.test(password)) {
      errors.push('Password contains common patterns that are not secure');
      break;
    }
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
};

// Enhanced password hashing with configurable rounds
export const hashPassword = async (password: string, rounds = 12): Promise<string> => {
  return bcrypt.hash(password, rounds);
};

// Secure password comparison
export const comparePassword = async (password: string, hash: string): Promise<boolean> => {
  return bcrypt.compare(password, hash);
};

// Account lockout tracking (in-memory for demo, use Redis/DB in production)
interface LockoutAttempt {
  attempts: number;
  lockedUntil?: Date;
  lastAttempt: Date;
}

const lockoutAttempts = new Map<string, LockoutAttempt>();

export const trackFailedLogin = (identifier: string): { locked: boolean; attemptsLeft: number } => {
  const maxAttempts = 5;
  const lockoutDuration = 30 * 60 * 1000; // 30 minutes
  
  const current = lockoutAttempts.get(identifier) || {
    attempts: 0,
    lastAttempt: new Date(),
  };
  
  // Check if currently locked
  if (current.lockedUntil && current.lockedUntil > new Date()) {
    return { locked: true, attemptsLeft: 0 };
  }
  
  // Increment attempts
  current.attempts += 1;
  current.lastAttempt = new Date();
  
  // Lock if max attempts reached
  if (current.attempts >= maxAttempts) {
    current.lockedUntil = new Date(Date.now() + lockoutDuration);
    lockoutAttempts.set(identifier, current);
    return { locked: true, attemptsLeft: 0 };
  }
  
  lockoutAttempts.set(identifier, current);
  return { locked: false, attemptsLeft: maxAttempts - current.attempts };
};

export const clearFailedLogins = (identifier: string): void => {
  lockoutAttempts.delete(identifier);
};

export const isAccountLocked = (identifier: string): boolean => {
  const current = lockoutAttempts.get(identifier);
  if (!current) return false;
  
  return current.lockedUntil ? current.lockedUntil > new Date() : false;
};

// Security monitoring
interface SecurityEvent {
  type: 'LOGIN_FAILURE' | 'LOGIN_SUCCESS' | 'ACCOUNT_LOCKED' | 'SUSPICIOUS_ACTIVITY' | 'PASSWORD_CHANGE';
  userId?: string;
  email?: string;
  tenantId?: string;
  reason?: string;
  ip: string;
  userAgent: string;
  timestamp: Date;
  details?: any;
}

const securityEvents: SecurityEvent[] = [];

export const logSecurityEvent = (
  type: SecurityEvent['type'],
  req: Request,
  details: Partial<SecurityEvent> = {}
): void => {
  const event: SecurityEvent = {
    type,
    ip: req.ip || req.connection.remoteAddress || 'unknown',
    userAgent: req.get('User-Agent') || 'unknown',
    timestamp: new Date(),
    ...details,
  };
  
  securityEvents.push(event);
  
  // Keep only last 1000 events in memory
  if (securityEvents.length > 1000) {
    securityEvents.shift();
  }
  
  // Log critical events
  if (['ACCOUNT_LOCKED', 'SUSPICIOUS_ACTIVITY'].includes(type)) {
    console.warn('🚨 SECURITY ALERT:', JSON.stringify(event, null, 2));
  } else {
    console.log('🔒 Security Event:', JSON.stringify(event, null, 2));
  }
};

export const getSecurityEvents = (limit = 100): SecurityEvent[] => {
  return securityEvents.slice(-limit);
};

// Detect suspicious activity
export const detectSuspiciousActivity = (req: Request, email?: string): boolean => {
  const ip = req.ip || req.connection.remoteAddress || 'unknown';
  const recentEvents = securityEvents
    .filter(event => event.ip === ip || (email && event.email === email))
    .filter(event => {
      const timeDiff = Date.now() - event.timestamp.getTime();
      return timeDiff < 10 * 60 * 1000; // Last 10 minutes
    });
  
  // Check for rapid login attempts
  const loginAttempts = recentEvents.filter(event => 
    event.type === 'LOGIN_FAILURE' || event.type === 'LOGIN_SUCCESS'
  );
  
  if (loginAttempts.length > 10) {
    return true;
  }
  
  // Check for multiple different email attempts from same IP
  const uniqueEmails = new Set(recentEvents.map(event => event.email).filter(Boolean));
  if (uniqueEmails.size > 5) {
    return true;
  }
  
  return false;
};

// JWT token security enhancement
export const generateSecureToken = (): string => {
  const crypto = require('crypto');
  return crypto.randomBytes(32).toString('hex');
};

// Environment-specific security settings
export const getSecurityConfig = () => {
  const isProduction = process.env.NODE_ENV === 'production';
  
  return {
    bcryptRounds: isProduction ? 14 : 12,
    jwtExpiresIn: isProduction ? '1h' : '24h',
    maxLoginAttempts: isProduction ? 3 : 5,
    lockoutDuration: isProduction ? 60 * 60 * 1000 : 30 * 60 * 1000, // 1h prod, 30min dev
    requireHTTPS: isProduction,
    sessionCookieSecure: isProduction,
    sessionCookieMaxAge: isProduction ? 60 * 60 * 1000 : 24 * 60 * 60 * 1000, // 1h prod, 24h dev
  };
};