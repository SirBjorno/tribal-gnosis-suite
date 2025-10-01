import express from 'express';
import type { Request, Response } from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { body, validationResult } from 'express-validator';
import * as dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import { readFile, writeFile } from 'fs/promises';
import * as path from 'path';
import multer from 'multer';
import { Tenant, User, KnowledgeItem } from './models';
import { cloudStorageService } from './services/cloudStorageService';

// Configure multer for file uploads
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { 
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 1 // Only one file at a time
  }
});
import { connectDB } from './config/database';
import { 
  validatePasswordStrength, 
  hashPassword, 
  comparePassword, 
  trackFailedLogin, 
  clearFailedLogins, 
  isAccountLocked,
  logSecurityEvent as logSec,
  detectSuspiciousActivity,
  getSecurityConfig 
} from './utils/security';

// A simple type for our knowledge bank items for type safety on the backend
interface KnowledgeBankItem {
  id: string;
  [key: string]: unknown;
}

// Type for company response data
interface CompanyResponse {
  _id: string;
  name: string;
  domain: string;
  companyCode: string;
  maxUsers: number;
  maxStorage: number;
  currentUsers: number;
  currentStorage: number;
  features: Record<string, boolean>;
  createdAt: Date;
  isActive: boolean;
}

// --- Legacy JSON File Types (for backward compatibility) ---
interface LegacyUser {
    name: string;
    email: string;
    password?: string; // Will be removed before sending to client
    role: 'analyst' | 'admin';
    tenantId: string;
}

interface LegacyTenant {
    name: string;
    signupCode: string;
}

interface Database {
    tenants: Record<string, LegacyTenant>;
    users: Record<string, LegacyUser>;
    knowledgeBank: Record<string, KnowledgeBankItem[]>;
}

dotenv.config();

// FIX: Use the imported Express type for the app instance.
const app = express();
const port = process.env.PORT || 3001;
const DB_PATH = path.join(__dirname, '..', 'db.json');

// --- Database Helper Functions ---
const readDatabase = async (): Promise<Database> => {
    try {
        const fileContent = await readFile(DB_PATH, 'utf-8');
        return JSON.parse(fileContent);
    } catch (error: any) {
        if (error.code === 'ENOENT') {
            console.warn("Database file not found, this is not expected for an auth system.");
            // In a real scenario, we wouldn't want to create a default DB for auth.
            // This is a fallback for development.
            const defaultData: Database = { tenants: {}, users: {}, knowledgeBank: {} };
            await writeDatabase(defaultData);
            return defaultData;
        }
        console.error("Error reading database file:", error);
        throw new Error("Could not read database.");
    }
};

const writeDatabase = async (data: Database): Promise<void> => {
    try {
        await writeFile(DB_PATH, JSON.stringify(data, null, 2), 'utf-8');
    } catch (error) {
        console.error("Error writing to database file:", error);
        throw new Error("Could not write to database.");
    }
};

// Security Middleware
app.set('trust proxy', 1); // Trust first proxy for rate limiting

// Security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'", 'https://api.stripe.com'],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false, // Allows embedding for Stripe
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
}));

// Rate limiting for general API endpoints
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Strict rate limiting for authentication endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 requests per windowMs for auth
  message: {
    error: 'Too many login attempts from this IP, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
});

// Input sanitization middleware
const sanitizeInput = (req: Request, res: Response, next: Function) => {
  const sanitize = (obj: any): any => {
    if (typeof obj === 'string') {
      return obj
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/javascript:/gi, '')
        .replace(/on\w+\s*=/gi, '')
        .trim();
    }
    if (typeof obj === 'object' && obj !== null) {
      const sanitized: any = {};
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          sanitized[key] = sanitize(obj[key]);
        }
      }
      return sanitized;
    }
    return obj;
  };

  if (req.body) req.body = sanitize(req.body);
  if (req.query) req.query = sanitize(req.query);
  if (req.params) req.params = sanitize(req.params);
  
  next();
};

// Validation middleware
const handleValidationErrors = (req: Request, res: Response, next: Function) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array(),
    });
  }
  next();
};

// Security event logger
const logSecurityEvent = (event: string, details: any, req: Request) => {
  const securityLog = {
    timestamp: new Date().toISOString(),
    event,
    ip: req.ip || req.connection.remoteAddress,
    userAgent: req.get('User-Agent'),
    path: req.path,
    method: req.method,
    details,
  };
  console.warn('SECURITY EVENT:', JSON.stringify(securityLog, null, 2));
};

// HTTPS enforcement for production
if (process.env.NODE_ENV === 'production') {
  app.use((req: Request, res: Response, next: Function) => {
    if (req.header('x-forwarded-proto') !== 'https') {
      res.redirect(`https://${req.header('host')}${req.url}`);
    } else {
      next();
    }
  });
}

// Apply general middleware
app.use(generalLimiter);
app.use(sanitizeInput);

// Middlewares
app.use(cors({
  origin: ['https://tribal-gnosis-frontend.onrender.com', 'http://localhost:3000'],
  credentials: true
}));
// FIX: Corrected express import resolves type error for app.use(express.json(...))
app.use(express.json({ limit: '10mb' })); 

// Add a test GET endpoint
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', message: 'Backend is running' });
});

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// --- Schemas ---
const analysisSchema = { /* ... Omitted for brevity ... */ };
const detailedTranscriptSchema = { /* ... Omitted for brevity ... */ };
const knowledgeSearchSchema = { /* ... Omitted for brevity ... */ };


// --- NEW Authentication Endpoints ---

app.post('/api/auth/validate-company', authLimiter, async (req: Request, res: Response) => {
  try {

    const { companyCode } = req.body;
    
    if (!companyCode) {
      return res.status(400).json({ message: "Company code is required." });
    }

    const tenant = await Tenant.findOne({ companyCode });
    if (!tenant) {
      return res.status(404).json({ message: "Invalid company code." });
    }


    res.status(200).json({
      id: tenant._id,
      name: tenant.name,
      domain: tenant.domain,
      companyCode: tenant.companyCode
    });
  } catch (error) {
    console.error('Company code validation error:', error);
    res.status(500).json({ message: "Failed to validate company code." });
  }
});

// FIX: Use direct `Request` and `Response` types from Express to fix type errors.
app.post('/api/auth/signup', authLimiter, async (req: Request, res: Response) => {
    const { name, email, password, companyCode } = req.body;

    if (!name || !email || !password || !companyCode) {
        return res.status(400).json({ message: "All fields are required." });
    }

    const db = await readDatabase();

    // 1. Check if user already exists
    if (db.users[email.toLowerCase()]) {
        return res.status(409).json({ message: "User with this email already exists." });
    }

    // 2. Find tenant by company code
    const tenantEntry = Object.entries(db.tenants).find(([, tenant]) => tenant.signupCode === companyCode);
    if (!tenantEntry) {
        return res.status(400).json({ message: "Invalid company code." });
    }
    const [tenantId] = tenantEntry;
    
    // 3. Create new user (default role is 'analyst')
    const newUser: LegacyUser = {
        name,
        email: email.toLowerCase(),
        password, // In a real app, this should be hashed!
        role: 'analyst',
        tenantId,
    };
    db.users[newUser.email] = newUser;

    // 4. Ensure a knowledge bank exists for this new user's tenant
    if (!db.knowledgeBank[tenantId]) {
        db.knowledgeBank[tenantId] = [];
    }

    await writeDatabase(db);

    res.status(201).json({ message: "Account created successfully. Please sign in." });
});


app.post('/api/auth/login', 
    authLimiter,
    [
        body('email').isEmail().withMessage('Must be a valid email address'),
        body('password').notEmpty().withMessage('Password is required'),
    ],
    handleValidationErrors,
    async (req: Request, res: Response) => {
    try {
        const { email, password } = req.body;
        const lowercaseEmail = email.toLowerCase();
        const clientIP = req.ip || req.connection.remoteAddress || 'unknown';

        // Check for suspicious activity
        if (detectSuspiciousActivity(req, lowercaseEmail)) {
            logSec('SUSPICIOUS_ACTIVITY', req, { email: lowercaseEmail });
            return res.status(429).json({ 
                message: "Suspicious activity detected. Please try again later." 
            });
        }

        // Check if account is locked
        if (isAccountLocked(lowercaseEmail) || isAccountLocked(clientIP)) {
            logSec('LOGIN_FAILURE', req, { email: lowercaseEmail, reason: 'Account locked' });
            return res.status(423).json({ 
                message: "Account temporarily locked due to multiple failed login attempts. Please try again later." 
            });
        }

        const user = await User.findOne({ email: lowercaseEmail });
        if (!user) {
            const lockoutInfo = trackFailedLogin(lowercaseEmail);
            trackFailedLogin(clientIP);
            logSec('LOGIN_FAILURE', req, { email: lowercaseEmail, reason: 'User not found' });
            
            return res.status(401).json({ 
                message: "Invalid credentials.",
                ...(lockoutInfo.attemptsLeft <= 2 && {
                    warning: `${lockoutInfo.attemptsLeft} attempts remaining before account lockout.`
                })
            });
        }

        // Use enhanced password comparison
        const isValidPassword = await comparePassword(password, user.password);
        
        if (!isValidPassword) {
            const lockoutInfo = trackFailedLogin(lowercaseEmail);
            trackFailedLogin(clientIP);
            logSec('LOGIN_FAILURE', req, { 
                email: lowercaseEmail, 
                userId: user._id.toString(),
                reason: 'Invalid password' 
            });
            
            return res.status(401).json({ 
                message: "Invalid credentials.",
                ...(lockoutInfo.attemptsLeft <= 2 && {
                    warning: `${lockoutInfo.attemptsLeft} attempts remaining before account lockout.`
                })
            });
        }

        // Clear failed login attempts on successful login
        clearFailedLogins(lowercaseEmail);
        clearFailedLogins(clientIP);

        // Get tenant info
        const tenant = await Tenant.findById(user.tenantId);
        if (!tenant) {
            return res.status(500).json({ message: "User tenant not found." });
        }

        // Generate secure JWT token
        const jwt = require('jsonwebtoken');
        const config = getSecurityConfig();
        const token = jwt.sign(
            { 
                userId: user._id,
                email: user.email,
                role: user.role,
                tenantId: user.tenantId 
            },
            process.env.JWT_SECRET || 'your-secret-key',
            { expiresIn: config.jwtExpiresIn }
        );

        // Log successful login
        logSec('LOGIN_SUCCESS', req, { 
            email: lowercaseEmail, 
            userId: user._id.toString(),
            tenantId: tenant._id.toString() 
        });

        // Return user without password
        const { password: _, ...userWithoutPassword } = user.toObject();
        res.status(200).json({ 
            ...userWithoutPassword, 
            token,
            tenant: {
                id: tenant._id,
                name: tenant.name,
                domain: tenant.domain,
                companyCode: tenant.companyCode
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: "Failed to login." });
    }
});

// --- Company Management API Endpoints ---

// Get all companies (Master user only)
app.get('/api/companies', async (req: Request, res: Response) => {
    try {
        const companies = await Tenant.find({}).select('-__v').sort({ createdAt: -1 });
        
        // Get user counts for each company
        const companiesWithStats: CompanyResponse[] = await Promise.all(
            companies.map(async (company: any): Promise<CompanyResponse> => {
                const userCount = await User.countDocuments({ tenantId: company._id });
                const knowledgeItemCount = await KnowledgeItem.countDocuments({ tenantId: company._id });
                
                return {
                    _id: company._id.toString(),
                    name: company.name,
                    domain: company.domain || '',
                    companyCode: company.companyCode,
                    maxUsers: company.settings?.maxUsers || 10,
                    maxStorage: company.settings?.maxStorage || 5,
                    currentUsers: userCount,
                    currentStorage: 0, // TODO: Calculate actual storage usage
                    features: company.settings?.features || {},
                    createdAt: company.createdAt,
                    isActive: true // TODO: Add active status to schema
                };
            })
        );
        
        res.status(200).json(companiesWithStats);
    } catch (error) {
        console.error('Error fetching companies:', error);
        res.status(500).json({ message: 'Failed to fetch companies' });
    }
});

// Get platform statistics (Master user only)
app.get('/api/platform/stats', async (req: Request, res: Response) => {
    try {
        // Get total counts across all tenants
        const totalCompanies = await Tenant.countDocuments({});
        const totalUsers = await User.countDocuments({});
        const totalKnowledgeItems = await KnowledgeItem.countDocuments({});
        
        // Get active companies (users with active status)
        const activeCompanies = await Tenant.aggregate([
            {
                $lookup: {
                    from: 'users',
                    localField: '_id',
                    foreignField: 'tenantId',
                    as: 'users'
                }
            },
            {
                $match: {
                    'users.active': true
                }
            },
            {
                $count: 'activeCount'
            }
        ]);

        const activeCompanyCount = activeCompanies.length > 0 ? activeCompanies[0].activeCount : 0;

        res.status(200).json({
            totalCompanies,
            activeCompanies: activeCompanyCount,
            totalUsers,
            totalKnowledgeItems
        });
    } catch (error) {
        console.error('Error fetching platform stats:', error);
        res.status(500).json({ message: 'Failed to fetch platform statistics' });
    }
});

// Create new company (Master user only)
app.post('/api/companies', async (req: Request, res: Response) => {
    try {
        const { name, domain, companyCode, maxUsers, maxStorage, features, adminUser } = req.body;
        
        // Validate required fields
        if (!name || !companyCode || !adminUser.name || !adminUser.email || !adminUser.password) {
            return res.status(400).json({ message: 'Missing required fields' });
        }
        
        // Check if company code already exists
        const existingTenant = await Tenant.findOne({ companyCode });
        if (existingTenant) {
            return res.status(409).json({ message: 'Company code already exists' });
        }
        
        // Check if admin email already exists
        const existingUser = await User.findOne({ email: adminUser.email.toLowerCase() });
        if (existingUser) {
            return res.status(409).json({ message: 'Admin email already exists' });
        }
        
        // Create tenant
        const newTenant = new Tenant({
            name,
            domain: domain || '',
            companyCode: companyCode.toUpperCase(),
            settings: {
                maxUsers: maxUsers || 10,
                maxStorage: maxStorage || 5,
                features: features || {
                    transcription: true,
                    analysis: true,
                    knowledgeBase: true
                }
            }
        });
        
        const savedTenant = await newTenant.save();
        
        // Create admin user with hashed password
        const bcrypt = require('bcryptjs');
        const hashedPassword = await bcrypt.hash(adminUser.password, 10);
        
        const newAdminUser = new User({
            name: adminUser.name,
            email: adminUser.email.toLowerCase(),
            password: hashedPassword,
            role: 'admin',
            tenantId: savedTenant._id
        });
        
        await newAdminUser.save();
        
        res.status(201).json({
            _id: savedTenant._id,
            name: savedTenant.name,
            domain: savedTenant.domain,
            companyCode: savedTenant.companyCode,
            maxUsers: savedTenant.settings.maxUsers,
            maxStorage: savedTenant.settings.maxStorage,
            features: savedTenant.settings.features,
            createdAt: savedTenant.createdAt,
            currentUsers: 1,
            currentStorage: 0,
            isActive: true
        });
    } catch (error) {
        console.error('Error creating company:', error);
        res.status(500).json({ message: 'Failed to create company' });
    }
});

// Update company status (activate/deactivate)
app.patch('/api/companies/:id/toggle-status', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { isActive } = req.body;
        
        // For now, we'll update users' active status instead of tenant
        // since we don't have an isActive field on Tenant yet
        await User.updateMany(
            { tenantId: id },
            { active: isActive }
        );
        
        res.status(200).json({ message: 'Company status updated successfully' });
    } catch (error) {
        console.error('Error updating company status:', error);
        res.status(500).json({ message: 'Failed to update company status' });
    }
});

// Get company details
app.get('/api/companies/:id', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const company = await Tenant.findById(id);
        
        if (!company) {
            return res.status(404).json({ message: 'Company not found' });
        }
        
        const userCount = await User.countDocuments({ tenantId: id });
        const knowledgeItemCount = await KnowledgeItem.countDocuments({ tenantId: id });
        
        res.status(200).json({
            _id: company._id,
            name: company.name,
            domain: company.domain,
            companyCode: company.companyCode,
            maxUsers: company.settings.maxUsers,
            maxStorage: company.settings.maxStorage,
            currentUsers: userCount,
            currentStorage: 0, // TODO: Calculate actual storage
            features: company.settings.features,
            createdAt: company.createdAt,
            isActive: true,
            knowledgeItemCount
        });
    } catch (error) {
        console.error('Error fetching company details:', error);
        res.status(500).json({ message: 'Failed to fetch company details' });
    }
});

// Create demo company with sample data
app.post('/api/companies/create-demo', async (req: Request, res: Response) => {
    try {
        const demoCompanyCode = 'DEMO-' + Date.now().toString().slice(-4);
        
        // Create demo tenant
        const demoTenant = new Tenant({
            name: 'Demo Corporation',
            domain: 'demo.tribal-gnosis.com',
            companyCode: demoCompanyCode,
            settings: {
                maxUsers: 50,
                maxStorage: 10,
                features: {
                    transcription: true,
                    analysis: true,
                    knowledgeBase: true
                }
            }
        });
        
        const savedTenant = await demoTenant.save();
        
        // Create demo admin user
        const bcrypt = require('bcryptjs');
        const hashedPassword = await bcrypt.hash('demo123', 10);
        
        const demoAdmin = new User({
            name: 'Demo Administrator',
            email: 'admin@demo.tribal-gnosis.com',
            password: hashedPassword,
            role: 'admin',
            tenantId: savedTenant._id
        });
        
        await demoAdmin.save();
        
        // Create sample users
        const sampleUsers = [
            { name: 'John Analyst', email: 'john@demo.tribal-gnosis.com', role: 'analyst' },
            { name: 'Jane Analyst', email: 'jane@demo.tribal-gnosis.com', role: 'analyst' },
        ];
        
        for (const userData of sampleUsers) {
            const user = new User({
                ...userData,
                email: userData.email,
                password: hashedPassword,
                tenantId: savedTenant._id
            });
            await user.save();
        }
        
        // Create sample knowledge items
        const sampleKnowledgeItems = [
            {
                tenantId: savedTenant._id,
                title: 'Product Strategy Meeting Notes',
                content: 'Discussion of Q1 2024 product roadmap including new feature prioritization...',
                tags: ['strategy', 'product', 'roadmap'],
                category: 'meetings',
                createdBy: demoAdmin._id,
                analysis: {
                    summary: 'Strategic planning session covering product priorities and resource allocation.',
                    keyPoints: ['Feature prioritization', 'Resource allocation', 'Timeline planning'],
                    sentiment: 'positive'
                }
            },
            {
                tenantId: savedTenant._id,
                title: 'Customer Feedback Analysis',
                content: 'Analysis of customer feedback from Q4 2023, identifying key improvement areas...',
                tags: ['customer', 'feedback', 'analysis'],
                category: 'research',
                createdBy: demoAdmin._id,
                analysis: {
                    summary: 'Comprehensive analysis of customer satisfaction and improvement opportunities.',
                    keyPoints: ['UI improvements needed', 'Performance optimization', 'Feature requests'],
                    sentiment: 'constructive'
                }
            }
        ];
        
        for (const itemData of sampleKnowledgeItems) {
            const knowledgeItem = new KnowledgeItem(itemData);
            await knowledgeItem.save();
        }
        
        res.status(201).json({
            message: 'Demo company created successfully',
            company: {
                _id: savedTenant._id,
                name: savedTenant.name,
                companyCode: savedTenant.companyCode,
                adminCredentials: {
                    email: 'admin@demo.tribal-gnosis.com',
                    password: 'demo123'
                }
            }
        });
    } catch (error) {
        console.error('Error creating demo company:', error);
        res.status(500).json({ message: 'Failed to create demo company' });
    }
});

// --- Subscription & Billing API Endpoints ---

// Get subscription tiers and pricing
app.get('/api/subscription/tiers', async (req: Request, res: Response) => {
    try {
        const { SUBSCRIPTION_TIERS } = require('./models/index');
        res.status(200).json(SUBSCRIPTION_TIERS);
    } catch (error) {
        console.error('Error fetching subscription tiers:', error);
        res.status(500).json({ message: 'Failed to fetch subscription tiers' });
    }
});

// Get tenant subscription details
app.get('/api/subscription/:tenantId', async (req: Request, res: Response) => {
    try {
        const { getSubscriptionDetails } = require('./services/stripeService');
        const { tenantId } = req.params;
        
        const details = await getSubscriptionDetails(tenantId);
        res.status(200).json(details);
    } catch (error) {
        console.error('Error fetching subscription details:', error);
        res.status(500).json({ message: 'Failed to fetch subscription details' });
    }
});

// Create subscription for tenant
app.post('/api/subscription/create', async (req: Request, res: Response) => {
    try {
        const { createSubscription, STRIPE_PRICE_IDS } = require('./services/stripeService');
        const { tenantId, tier } = req.body;
        
        if (!tenantId || !tier) {
            return res.status(400).json({ message: 'Tenant ID and tier are required' });
        }
        
        const priceId = STRIPE_PRICE_IDS[tier];
        if (!priceId) {
            return res.status(400).json({ message: 'Invalid subscription tier' });
        }
        
        const result = await createSubscription(tenantId, priceId);
        res.status(201).json(result);
    } catch (error) {
        console.error('Error creating subscription:', error);
        res.status(500).json({ message: 'Failed to create subscription' });
    }
});

// Update subscription tier
app.patch('/api/subscription/:tenantId/tier', async (req: Request, res: Response) => {
    try {
        const { updateSubscription } = require('./services/stripeService');
        const { tenantId } = req.params;
        const { tier } = req.body;
        
        if (!tier) {
            return res.status(400).json({ message: 'New tier is required' });
        }
        
        const result = await updateSubscription(tenantId, tier);
        res.status(200).json(result);
    } catch (error) {
        console.error('Error updating subscription:', error);
        res.status(500).json({ message: 'Failed to update subscription' });
    }
});

// Cancel subscription
app.delete('/api/subscription/:tenantId', async (req: Request, res: Response) => {
    try {
        const { cancelSubscription } = require('./services/stripeService');
        const { tenantId } = req.params;
        const { immediate = false } = req.body;
        
        const result = await cancelSubscription(tenantId, immediate);
        res.status(200).json(result);
    } catch (error) {
        console.error('Error canceling subscription:', error);
        res.status(500).json({ message: 'Failed to cancel subscription' });
    }
});

// --- ADMIN DASHBOARD ENDPOINTS ---

// Admin: Get comprehensive storage overview across all tenants
app.get('/api/admin/storage/overview', async (req: Request, res: Response) => {
  try {
    const tenants = await Tenant.find({}).populate('subscription');
    const storageAnalytics = [];
    let totalStorageUsed = 0;
    let totalRevenue = 0;
    let totalOverages = 0;

    for (const tenant of tenants) {
      // Calculate storage for each tenant (both MongoDB and legacy)
      const mongoItems = await KnowledgeItem.find({ tenantId: tenant._id });
      const legacyData = await readDatabase();
      const legacyItems = legacyData.knowledgeBank[tenant._id.toString()] || [];
      
      let totalBytes = 0;
      
      // Calculate MongoDB storage
      for (const item of mongoItems) {
        if (item.content) totalBytes += Buffer.byteLength(item.content, 'utf8');
        if (item.transcription?.text) totalBytes += Buffer.byteLength(item.transcription.text, 'utf8');
        if (item.analysis?.summary) totalBytes += Buffer.byteLength(item.analysis.summary, 'utf8');
        totalBytes += 200; // metadata overhead
      }
      
      // Calculate legacy storage
      for (const item of legacyItems) {
        if (item.content) totalBytes += Buffer.byteLength(JSON.stringify(item.content), 'utf8');
        totalBytes += 150; // metadata overhead
      }
      
      const storageMB = totalBytes / 1024 / 1024;
      const storageGB = storageMB / 1024;
      
      // Get tier limits
      const { SUBSCRIPTION_TIERS } = require('./models/index');
      const tierData = SUBSCRIPTION_TIERS[tenant.subscription?.tier || 'STARTER'];
      const usagePercent = (storageMB / (tierData.storageGB * 1024)) * 100;
      const overageGB = storageGB > tierData.storageGB ? storageGB - tierData.storageGB : 0;
      const overageRevenue = overageGB * 0.10; // $0.10 per GB overage
      
      totalStorageUsed += storageGB;
      totalRevenue += overageRevenue;
      if (overageGB > 0) totalOverages++;
      
      const analyticsItem = {
        tenantId: tenant._id.toString(),
        tenantName: tenant.name,
        companyCode: tenant.companyCode,
        subscription: {
          tier: tenant.subscription?.tier || 'STARTER',
          status: tenant.subscription?.status || 'active'
        },
        storage: {
          usedGB: Math.round(storageGB * 1000) / 1000,
          limitGB: tierData.storageGB,
          usagePercent: Math.round(usagePercent),
          overageGB: Math.round(overageGB * 1000) / 1000,
          overageRevenue: Math.round(overageRevenue * 100) / 100
        },
        items: {
          mongodb: mongoItems.length,
          legacy: legacyItems.length,
          total: mongoItems.length + legacyItems.length
        },
        lastUpdated: new Date().toISOString()
      };
      storageAnalytics.push(analyticsItem);
    }

    // Sort by usage percentage (highest first)
    storageAnalytics.sort((a, b) => b.storage.usagePercent - a.storage.usagePercent);

    const summary = {
      totalTenants: tenants.length,
      totalStorageGB: Math.round(totalStorageUsed * 1000) / 1000,
      averageUsagePercent: Math.round(storageAnalytics.reduce((sum, t) => sum + t.storage.usagePercent, 0) / tenants.length),
      tenantsOverLimit: totalOverages,
      totalOverageRevenue: Math.round(totalRevenue * 100) / 100,
      generatedAt: new Date()
    };

    res.status(200).json({
      summary,
      tenants: storageAnalytics
    });
  } catch (error) {
    console.error('Admin storage overview error:', error);
    res.status(500).json({ message: 'Failed to generate storage overview' });
  }
});

// Admin: Get detailed tenant storage breakdown
app.get('/api/admin/storage/tenant/:tenantId', async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.params;
    const tenant = await Tenant.findById(tenantId);
    if (!tenant) {
      return res.status(404).json({ message: 'Tenant not found' });
    }

    // Get MongoDB items
    const mongoItems = await KnowledgeItem.find({ tenantId }).sort({ createdAt: -1 });
    
    // Get legacy items
    const legacyData = await readDatabase();
    const legacyItems = legacyData.knowledgeBank[tenantId] || [];

    const itemDetails = [];
    
    // Process MongoDB items
    for (const item of mongoItems) {
      const contentSize = item.content ? Buffer.byteLength(item.content, 'utf8') : 0;
      const transcriptionSize = item.transcription?.text ? Buffer.byteLength(item.transcription.text, 'utf8') : 0;
      const analysisSize = item.analysis?.summary ? Buffer.byteLength(item.analysis.summary, 'utf8') : 0;
      const totalSize = contentSize + transcriptionSize + analysisSize + 200;

      itemDetails.push({
        id: item._id,
        title: item.title,
        source: 'mongodb',
        size: {
          totalBytes: totalSize,
          totalKB: Math.round(totalSize / 1024 * 100) / 100,
          breakdown: {
            content: Math.round(contentSize / 1024 * 100) / 100,
            transcription: Math.round(transcriptionSize / 1024 * 100) / 100,
            analysis: Math.round(analysisSize / 1024 * 100) / 100,
            metadata: 0.2
          }
        },
        createdAt: item.createdAt,
        category: item.category || 'general'
      });
    }

    // Process legacy items
    for (const item of legacyItems) {
      const itemSize = Buffer.byteLength(JSON.stringify(item), 'utf8') + 150;
      itemDetails.push({
        id: item.id,
        title: item.title || 'Untitled',
        source: 'legacy',
        size: {
          totalBytes: itemSize,
          totalKB: Math.round(itemSize / 1024 * 100) / 100,
          breakdown: {
            content: Math.round(itemSize / 1024 * 100) / 100,
            transcription: 0,
            analysis: 0,
            metadata: 0.15
          }
        },
        createdAt: new Date(), // Legacy items don't have timestamps
        category: 'legacy'
      });
    }

    // Sort by size (largest first)
    itemDetails.sort((a, b) => b.size.totalBytes - a.size.totalBytes);

    const totalSize = itemDetails.reduce((sum, item) => sum + item.size.totalBytes, 0);
    const { SUBSCRIPTION_TIERS } = require('./models/index');
    const tierData = SUBSCRIPTION_TIERS[tenant.subscription?.tier || 'STARTER'];

    res.status(200).json({
      tenant: {
        id: tenant._id,
        name: tenant.name,
        companyCode: tenant.companyCode,
        tier: tenant.subscription?.tier || 'STARTER'
      },
      storage: {
        totalBytes: totalSize,
        totalMB: Math.round(totalSize / 1024 / 1024 * 100) / 100,
        totalGB: Math.round(totalSize / 1024 / 1024 / 1024 * 1000) / 1000,
        limitGB: tierData.storageGB,
        usagePercent: Math.round((totalSize / 1024 / 1024) / (tierData.storageGB * 1024) * 100)
      },
      itemCount: {
        total: itemDetails.length,
        mongodb: mongoItems.length,
        legacy: legacyItems.length
      },
      items: itemDetails.slice(0, 50) // Limit to top 50 items for performance
    });
  } catch (error) {
    console.error('Tenant storage details error:', error);
    res.status(500).json({ message: 'Failed to get tenant storage details' });
  }
});

// Admin: Storage cleanup and optimization
app.post('/api/admin/storage/cleanup', async (req: Request, res: Response) => {
  try {
    const { tenantId, action } = req.body; // action: 'analyze' | 'cleanup' | 'migrate'
    
    if (action === 'analyze') {
      // Analyze potential savings
      const tenant = await Tenant.findById(tenantId);
      const mongoItems = await KnowledgeItem.find({ tenantId });
      
      let duplicates = 0;
      let emptyItems = 0;
      let potentialSavings = 0;
      
      // Simple duplicate detection by title
      const titleSet = new Set<string>();
      let totalTitles = 0;
      mongoItems.forEach(item => {
        if (item.title) {
          titleSet.add(String(item.title));
          totalTitles++;
        }
      });
      duplicates = totalTitles - titleSet.size;
      
      // Count empty items
      mongoItems.forEach(item => {
        const content = String(item.content || '');
        if (!content || content.trim().length < 10) {
          emptyItems++;
        }
      });
      
      // Estimate potential savings (rough calculation)
      potentialSavings = (duplicates + emptyItems) * 1024; // Bytes
      
      res.status(200).json({
        analysis: {
          totalItems: mongoItems.length,
          duplicates,
          emptyItems,
          potentialSavingsBytes: potentialSavings,
          potentialSavingsKB: Math.round(potentialSavings / 1024)
        },
        recommendations: [
          duplicates > 0 ? `Remove ${duplicates} duplicate items` : null,
          emptyItems > 0 ? `Clean up ${emptyItems} empty items` : null,
          'Consider migrating to Google Cloud Storage for better performance'
        ].filter(Boolean)
      });
    }
    
    res.status(200).json({ message: 'Storage analysis completed' });
  } catch (error) {
    console.error('Storage cleanup error:', error);
    res.status(500).json({ message: 'Failed to perform storage cleanup' });
  }
});

// --- FILE UPLOAD ENDPOINTS ---

// Enhanced file upload endpoint with Google Cloud Storage support
app.post('/api/files/upload/:tenantId', 
  upload.single('file'),
  async (req: Request, res: Response) => {
    try {
      const { tenantId } = req.params;
      const file = req.file;
      
      if (!file) {
        return res.status(400).json({ message: 'No file provided' });
      }

      let fileResult;
      let storageLocation = 'mongodb'; // fallback storage
      
      // Try Google Cloud Storage first if configured
      if (process.env.GOOGLE_CLOUD_PROJECT_ID && process.env.GOOGLE_CLOUD_STORAGE_BUCKET) {
        try {
          fileResult = await cloudStorageService.uploadFile(
            file.buffer,
            file.originalname,
            file.mimetype,
            tenantId,
            'documents'
          );
          storageLocation = 'gcs';
        } catch (error: any) {
          console.warn('Google Cloud Storage upload failed, using MongoDB fallback:', error.message);
        }
      }
      
      // Create knowledge item with storage location info
      const newItem = new KnowledgeItem({
        tenantId,
        title: file.originalname,
        content: fileResult?.publicUrl || 'File content stored in Google Cloud Storage',
        category: 'uploaded-file',
        createdBy: req.body.userId || null,
        metadata: {
          source: 'file-upload',
          contentType: file.mimetype,
          size: file.size,
          storageLocation,
          ...(fileResult && {
            gcsPath: fileResult.filePath,
            publicUrl: fileResult.publicUrl
          })
        }
      });
    
    await newItem.save();
    
    res.status(201).json({
      message: 'File uploaded successfully',
      file: {
        id: newItem._id,
        name: file.originalname,
        size: file.size,
        contentType: file.mimetype,
        storageLocation,
        uploadedAt: newItem.createdAt,
        ...(fileResult && {
          publicUrl: fileResult.publicUrl,
          gcsPath: fileResult.filePath
        })
      }
    });
  } catch (error) {
    console.error('File upload error:', error);
    res.status(500).json({ message: 'Failed to upload file' });
  }
});

// List files for tenant
app.get('/api/files/:tenantId', async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.params;
    
    // Get files from knowledge items (temporary until cloud storage migration)
    const fileItems = await KnowledgeItem.find({
      tenantId,
      category: 'uploaded-file'
    }).select('title createdAt metadata').sort({ createdAt: -1 });

    const files: any[] = [];
    fileItems.forEach(item => {
      const metadata = item.metadata as any;
      files.push({
        id: item._id,
        name: item.title,
        size: metadata?.size || 0,
        contentType: metadata?.contentType || 'text/plain',
        uploadedAt: item.createdAt,
        category: 'documents'
      });
    });

    res.status(200).json({ files });
  } catch (error) {
    console.error('File list error:', error);
    res.status(500).json({ message: 'Failed to list files' });
  }
});

// Get usage statistics for tenant
app.get('/api/usage/:tenantId', async (req: Request, res: Response) => {
    try {
        const { tenantId } = req.params;
        const { UsageRecord } = require('./models/index');
        const { getUsagePercentage } = require('./utils/subscriptionUtils');
        
        const tenant = await Tenant.findById(tenantId);
        if (!tenant) {
            return res.status(404).json({ message: 'Tenant not found' });
        }
        
        // Get current period usage
        const currentUsage = tenant.usage.currentPeriod;
        
        // Get usage history for last 30 days
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        const usageHistory = await UsageRecord.find({
            tenantId,
            date: { $gte: thirtyDaysAgo }
        }).sort({ date: -1 }).limit(100);
        
        // Calculate real-time storage usage (MongoDB + Legacy JSON)
        const knowledgeItems = await KnowledgeItem.find({ tenantId });
        
        // Also check legacy JSON storage
        const db = await readDatabase();
        const legacyItems = db.knowledgeBank[tenantId] || [];
        
        let totalBytes = 0;
        let contentBytes = 0;
        let transcriptionBytes = 0;
        let analysisBytes = 0;
        let totalItemCount = 0;
        
        // Process MongoDB items
        for (const item of knowledgeItems) {
            totalItemCount++;
            if (item.content) {
                const size = Buffer.byteLength(item.content, 'utf8');
                contentBytes += size;
                totalBytes += size;
            }
            if (item.transcription?.text) {
                const size = Buffer.byteLength(item.transcription.text, 'utf8');
                transcriptionBytes += size;
                totalBytes += size;
            }
            if (item.analysis?.summary) {
                const size = Buffer.byteLength(item.analysis.summary, 'utf8');
                analysisBytes += size;
                totalBytes += size;
            }
            if (item.analysis?.keyPoints) {
                const size = Buffer.byteLength(item.analysis.keyPoints.join(' '), 'utf8');
                analysisBytes += size;
                totalBytes += size;
            }
            totalBytes += 200; // metadata overhead
        }
        
        // Process legacy JSON items
        for (const item of legacyItems) {
            totalItemCount++;
            const itemString = JSON.stringify(item);
            const itemSize = Buffer.byteLength(itemString, 'utf8');
            contentBytes += itemSize;
            totalBytes += itemSize;
            totalBytes += 150; // metadata overhead for legacy items
        }
        
        const storageMB = totalBytes / 1024 / 1024;
        const storageGB = storageMB / 1024;
        
        // Get tier limits
        const { SUBSCRIPTION_TIERS } = require('./models/index');
        const tierData = SUBSCRIPTION_TIERS[tenant.subscription?.tier || 'STARTER'];
        const storagePercentage = Math.round((storageMB / (tierData.storageGB * 1024)) * 100);
        
        // Calculate usage percentages
        const minutesPercentage = getUsagePercentage(tenant, 'minutes');
        
        res.status(200).json({
            currentPeriod: currentUsage,
            usagePercentages: {
                minutes: minutesPercentage,
                storage: storagePercentage
            },
            storageDetails: {
                totalMB: Math.round(storageMB * 100) / 100,
                totalGB: Math.round(storageGB * 1000) / 1000,
                breakdown: {
                    contentMB: Math.round((contentBytes / 1024 / 1024) * 100) / 100,
                    transcriptionMB: Math.round((transcriptionBytes / 1024 / 1024) * 100) / 100,
                    analysisMB: Math.round((analysisBytes / 1024 / 1024) * 100) / 100
                },
                itemCount: totalItemCount,
                limitGB: tierData.storageGB,
                overageGB: storageGB > tierData.storageGB ? Math.round((storageGB - tierData.storageGB) * 1000) / 1000 : 0
            },
            history: usageHistory,
            subscription: {
                tier: tenant.subscription.tier,
                status: tenant.subscription.status
            }
        });
    } catch (error) {
        console.error('Error fetching usage statistics:', error);
        res.status(500).json({ message: 'Failed to fetch usage statistics' });
    }
});

// Stripe webhook endpoint
app.post('/api/webhooks/stripe', express.raw({ type: 'application/json' }), async (req: Request, res: Response) => {
    try {
        const { handleWebhook, stripe } = require('./services/stripeService');
        const sig = req.headers['stripe-signature'];
        const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
        
        let event;
        try {
            event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
        } catch (err: any) {
            console.error('Webhook signature verification failed:', err.message);
            return res.status(400).send(`Webhook Error: ${err.message}`);
        }
        
        await handleWebhook(event);
        res.status(200).json({ received: true });
    } catch (error) {
        console.error('Error handling Stripe webhook:', error);
        res.status(500).json({ message: 'Webhook processing failed' });
    }
});


// --- Knowledge Bank API Endpoints (Updated) ---

// FIX: Use direct `Request` and `Response` types from Express to fix type errors.
app.get('/api/knowledge-bank/:tenantId', async (req: Request, res: Response) => {
    const { tenantId } = req.params;
    console.log(`[GET /api/knowledge-bank/${tenantId}] - Request received.`);
    const db = await readDatabase();
    // Access knowledge bank via the top-level key
    let knowledgeBank = db.knowledgeBank[tenantId];
    if (!knowledgeBank || !Array.isArray(knowledgeBank)) {
        console.warn(`[server]: Data for tenant '${tenantId}' is missing or malformed. Self-healing and returning empty array.`);
        db.knowledgeBank[tenantId] = [];
        await writeDatabase(db);
        return res.status(200).json([]);
    }
    res.status(200).json(knowledgeBank);
});

// FIX: Use direct `Request` and `Response` types from Express to fix type errors.
app.post('/api/knowledge-bank/:tenantId', async (req: Request, res: Response) => {
    const { tenantId } = req.params;
    const newItem = req.body as KnowledgeBankItem;
    console.log(`[POST /api/knowledge-bank/${tenantId}] - Request to add item: ${newItem.id}`);
    
    const db = await readDatabase();

    if (!db.knowledgeBank[tenantId] || !Array.isArray(db.knowledgeBank[tenantId])) {
        db.knowledgeBank[tenantId] = [];
    }
    
    if (db.knowledgeBank[tenantId].find((item: KnowledgeBankItem) => item.id === newItem.id)) {
        return res.status(200).json(newItem);
    }

    db.knowledgeBank[tenantId].push(newItem);
    await writeDatabase(db);
    
    res.status(201).json(newItem);
});


// --- Secure Gemini API Endpoints (Unchanged) ---
// FIX: Use direct `Request` and `Response` types from Express to fix type errors.
app.post('/api/analyze', async (req: Request, res: Response) => { /* ... Omitted for brevity ... */ });
// FIX: Use direct `Request` and `Response` types from Express to fix type errors.
app.post('/api/generate-detailed-transcript', async (req: Request, res: Response) => { /* ... Omitted for brevity ... */ });
// FIX: Use direct `Request` and `Response` types from Express to fix type errors.
app.post('/api/search-public-solutions', async (req: Request, res: Response) => { /* ... Omitted for brevity ... */ });

// --- User Management API Endpoints ---
const userManagementRoutes = require('./routes/userManagement').default;
const invitationRoutes = require('./routes/invitations').default;

app.use('/api/users', userManagementRoutes);
app.use('/api/invitations', invitationRoutes);

// --- Analytics API Endpoints ---
const { getAnalytics, getGlobalAnalytics } = require('./services/analyticsService');

// Get tenant-specific analytics
app.get('/api/analytics/:tenantId', async (req: Request, res: Response) => {
    await getAnalytics(req, res);
});

// Get global analytics (admin only)
app.get('/api/analytics', async (req: Request, res: Response) => {
    await getGlobalAnalytics(req, res);
});

app.listen(port, async () => {
    console.log(`[server]: Tribal Gnosis backend is running at http://localhost:${port}`);
    try {
        await connectDB();
        console.log('✅ Database connected successfully');
        
        // Initialize Google Cloud Storage if configured
        if (process.env.GOOGLE_CLOUD_PROJECT_ID && process.env.GOOGLE_CLOUD_STORAGE_BUCKET) {
          try {
            await cloudStorageService.initializeBucket();
            console.log('✅ Google Cloud Storage initialized successfully');
          } catch (error: any) {
            console.warn('⚠️  Google Cloud Storage initialization failed:', error.message);
            console.log('📁 File uploads will use local storage fallback');
          }
        } else {
          console.log('📁 Google Cloud Storage not configured - using local storage fallback');
        }
    } catch (error) {
        console.error('❌ Failed to connect to database:', error);
        process.exit(1);
    }
});
