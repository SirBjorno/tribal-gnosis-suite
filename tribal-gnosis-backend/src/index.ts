/// <reference types="node" />

// FIX: Import Express types with proper type support
import express from 'express';
import type { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from "@google/genai";
import { promises as fs } from 'fs';
import path from 'path';

// A simple type for our knowledge bank items for type safety on the backend
interface KnowledgeBankItem {
  id: string;
  [key: string]: any;
}

// --- New Types for Auth ---
interface User {
    name: string;
    email: string;
    password?: string; // Will be removed before sending to client
    role: 'analyst' | 'admin';
    tenantId: string;
}

interface Tenant {
    name: string;
    signupCode: string;
}

interface Database {
    tenants: Record<string, Tenant>;
    users: Record<string, User>;
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
        const fileContent = await fs.readFile(DB_PATH, 'utf-8');
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
        await fs.writeFile(DB_PATH, JSON.stringify(data, null, 2), 'utf-8');
    } catch (error) {
        console.error("Error writing to database file:", error);
        throw new Error("Could not write to database.");
    }
};

// Middlewares
app.use(cors());
// FIX: Corrected express import resolves type error for app.use(express.json(...))
app.use(express.json({ limit: '10mb' })); 

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// --- Schemas ---
const analysisSchema = { /* ... Omitted for brevity ... */ };
const detailedTranscriptSchema = { /* ... Omitted for brevity ... */ };
const knowledgeSearchSchema = { /* ... Omitted for brevity ... */ };


// --- NEW Authentication Endpoints ---

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
    const newUser: User = {
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


// FIX: Use direct `Request` and `Response` types from Express to fix type errors.
app.post('/api/auth/login', async (req: Request, res: Response) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ message: "Email and password are required." });
    }

    const db = await readDatabase();
    const user = db.users[email.toLowerCase()];

    if (!user || user.password !== password) {
        return res.status(401).json({ message: "Invalid credentials." });
    }

    // IMPORTANT: Never send the password back to the client.
    const { password: _, ...userWithoutPassword } = user;

    res.status(200).json(userWithoutPassword);
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


app.listen(port, () => {
    console.log(`[server]: Tribal Gnosis backend is running at http://localhost:${port}`);
});
