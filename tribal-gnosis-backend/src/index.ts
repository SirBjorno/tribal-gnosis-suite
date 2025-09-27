import express from 'express';
import type { Request, Response } from 'express';
import cors from 'cors';
import * as dotenv from 'dotenv';
import { GoogleGenAI } from "@google/genai";
import { readFile, writeFile } from 'fs/promises';
import * as path from 'path';
import { Tenant, User, KnowledgeItem } from './models';
import { connectDB } from './config/database';

// A simple type for our knowledge bank items for type safety on the backend
interface KnowledgeBankItem {
  id: string;
  [key: string]: any;
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
  features: any;
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

app.post('/api/auth/validate-company', async (req: Request, res: Response) => {
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
app.post('/api/auth/signup', async (req: Request, res: Response) => {
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


app.post('/api/auth/login', async (req: Request, res: Response) => {
    try {

        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: "Email and password are required." });
        }

        const user = await User.findOne({ email: email.toLowerCase() });
        if (!user) {
            return res.status(401).json({ message: "Invalid credentials." });
        }

        // Compare hashed password
        const bcrypt = require('bcryptjs');
        const isValidPassword = await bcrypt.compare(password, user.password);
        
        if (!isValidPassword) {
            return res.status(401).json({ message: "Invalid credentials." });
        }

        // Get tenant info
        const tenant = await Tenant.findById(user.tenantId);
        if (!tenant) {
            return res.status(500).json({ message: "User tenant not found." });
        }

        // Return user without password
        const { password: _, ...userWithoutPassword } = user.toObject();
        res.status(200).json({ 
            ...userWithoutPassword, 
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

app.listen(port, async () => {
    console.log(`[server]: Tribal Gnosis backend is running at http://localhost:${port}`);
    try {
        await connectDB();
    } catch (error) {
        console.error('Failed to connect to database:', error);
    }
});
