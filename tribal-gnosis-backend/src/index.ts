/// <reference types="node" />

// FIX: Refactor express import to use default and named imports with aliasing to fix type resolution issues and avoid DOM conflicts.
import express, { Request as ExpressRequestType, Response as ExpressResponseType, Express } from 'express';
// FIX: Import Request and Response types from express with aliases to avoid conflicts with global DOM types.
import cors from 'cors';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from "@google/genai";
import { promises as fs } from 'fs';
import path from 'path';

// Aliases for Express types to avoid conflicts with global DOM types.
type ExpressRequest = ExpressRequestType;
type ExpressResponse = ExpressResponseType;


// A simple type for our knowledge bank items for type safety on the backend
interface KnowledgeBankItem {
  id: string;
  [key: string]: any;
}

dotenv.config();

// FIX: Use the imported Express type for the app instance.
const app: Express = express();
const port = process.env.PORT || 3001;

// Path to our JSON database file. `__dirname` is the `dist` folder after compilation, so `..` goes up to the project root.
const DB_PATH = path.join(__dirname, '..', 'db.json');

// --- Database Helper Functions ---
// Reads the entire database from the JSON file
const readDatabase = async (): Promise<Record<string, any>> => {
    try {
        const fileContent = await fs.readFile(DB_PATH, 'utf-8');
        return JSON.parse(fileContent);
    } catch (error: any) {
        // If the file doesn't exist, create it with a default structure.
        if (error.code === 'ENOENT') {
            console.warn("Database file not found, creating a new one.");
            const defaultData = { 'acme-corp': [], 'globex-inc': [] };
            await writeDatabase(defaultData);
            return defaultData;
        }
        console.error("Error reading database file:", error);
        // Fallback to an empty object in case of other errors like JSON parsing failure
        return {}; 
    }
};

// Writes the entire database object to the JSON file
const writeDatabase = async (data: Record<string, any>): Promise<void> => {
    try {
        await fs.writeFile(DB_PATH, JSON.stringify(data, null, 2), 'utf-8');
    } catch (error) {
        console.error("Error writing to database file:", error);
    }
};

// Middlewares
app.use(cors());
// FIX: Corrected express import resolves type error for app.use(express.json(...))
app.use(express.json({ limit: '10mb' })); 

// Initialize Gemini AI Client securely on the backend
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// --- Gemini Schemas (moved from frontend) ---
const analysisSchema = {
  type: Type.OBJECT,
  properties: {
    customerProfile: {
      type: Type.OBJECT,
      properties: {
        name: { type: Type.STRING, description: "The customer's full name, extracted from the transcript. Default to 'Unknown' if not found." },
        accountNumber: { type: Type.STRING, description: "The customer's account number, if mentioned. Default to 'N/A' if not found." },
      },
      required: ["name", "accountNumber"],
    },
    introduction: { type: Type.STRING, description: "A brief, one-sentence summary of the call's introduction and purpose." },
    problem: { type: Type.STRING, description: "A concise description of the customer's main problem or query." },
    solution: { type: Type.STRING, description: "The primary action or set of steps the agent took to resolve the problem." },
    resolution: { type: Type.STRING, description: "The final outcome of the call, indicating whether the problem was resolved successfully." },
    productInformation: { type: Type.STRING, description: "Any specific products, services, or models mentioned during the call. Default to 'N/A' if none are mentioned." },
  },
  required: ["customerProfile", "introduction", "problem", "solution", "resolution", "productInformation"],
};

const detailedTranscriptSchema = {
    type: Type.OBJECT,
    properties: {
        confidenceScore: { type: Type.NUMBER, description: "A score from 0.0 to 1.0 representing the AI's confidence in the transcript's accuracy." },
        dialogue: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    speaker: { type: Type.STRING, description: "The speaker of the line, either 'Agent' or 'Customer'." },
                    timestamp: { type: Type.STRING, description: "The timestamp of when the line was spoken, in 'MM:SS' format." },
                    text: { type: Type.STRING, description: "The transcribed text of what the speaker said." },
                },
                required: ["speaker", "timestamp", "text"],
            },
        },
    },
    required: ["confidenceScore", "dialogue"],
};

const knowledgeSearchSchema = {
    type: Type.ARRAY,
    items: {
        type: Type.OBJECT,
        properties: {
            solution: { type: Type.STRING, description: "A brief, actionable title for the solution." },
            description: { type: Type.STRING, description: "A one or two-sentence description of how to implement the solution, phrased for a customer to understand." },
        },
        required: ["solution", "description"],
    },
};

// --- Knowledge Bank API Endpoints ---
// FIX: Correctly typed the req and res parameters to use aliased express types to avoid type conflicts.
app.get('/api/knowledge-bank/:tenantId', async (req: ExpressRequest, res: ExpressResponse) => {
    const { tenantId } = req.params;
    console.log(`[GET /api/knowledge-bank/${tenantId}] - Request received.`);
    const db = await readDatabase();
    let knowledgeBank = db[tenantId];
    if (!knowledgeBank || !Array.isArray(knowledgeBank)) {
        console.warn(`[server]: Data for tenant '${tenantId}' is missing or malformed. Self-healing and returning empty array.`);
        db[tenantId] = [];
        await writeDatabase(db); // Persist the self-healed state
        return res.status(200).json([]);
    }
    res.status(200).json(knowledgeBank);
});

// FIX: Correctly typed the req and res parameters to use aliased express types to avoid type conflicts.
app.post('/api/knowledge-bank/:tenantId', async (req: ExpressRequest, res: ExpressResponse) => {
    const { tenantId } = req.params;
    const newItem = req.body as KnowledgeBankItem;
    console.log(`[POST /api/knowledge-bank/${tenantId}] - Request to add item: ${newItem.id}`);
    
    const db = await readDatabase();

    if (!db[tenantId] || !Array.isArray(db[tenantId])) {
        db[tenantId] = [];
    }
    
    // Avoid adding duplicate items
    if (db[tenantId].find((item: KnowledgeBankItem) => item.id === newItem.id)) {
        return res.status(200).json(newItem);
    }

    db[tenantId].push(newItem);
    await writeDatabase(db); // Persist the new data
    
    res.status(201).json(newItem);
});

// --- Secure Gemini API Endpoints ---

// FIX: Correctly typed the req and res parameters to use aliased express types to avoid type conflicts.
app.post('/api/analyze', async (req: ExpressRequest, res: ExpressResponse) => {
    try {
        const { transcript } = req.body;
        if (!transcript) return res.status(400).send('Transcript is required.');

        const prompt = `You are an expert call center analyst... Transcript: --- ${transcript} ---`;
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: { responseMimeType: "application/json", responseSchema: analysisSchema },
        });

        const text = response.text;
        if (!text) {
            console.error('[server] /api/analyze error: No text in Gemini response.', response);
            throw new Error('Received an empty text response from the AI model.');
        }

        res.json(JSON.parse(text.trim()));
    } catch (error) {
        console.error('[server] /api/analyze error:', error);
        res.status(500).send('Failed to analyze transcript.');
    }
});

// FIX: Correctly typed the req and res parameters to use aliased express types to avoid type conflicts.
app.post('/api/generate-detailed-transcript', async (req: ExpressRequest, res: ExpressResponse) => {
    try {
        const { rawTranscript } = req.body;
        if (!rawTranscript) return res.status(400).send('Raw transcript is required.');
        
        const prompt = `You are a highly accurate transcription service... Raw Text: --- ${rawTranscript} ---`;
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: { responseMimeType: "application/json", responseSchema: detailedTranscriptSchema }
        });

        const text = response.text;
        if (!text) {
            console.error('[server] /api/generate-detailed-transcript error: No text in Gemini response.', response);
            throw new Error('Received an empty text response from the AI model.');
        }

        res.json(JSON.parse(text.trim()));
    } catch (error) {
        console.error('[server] /api/generate-detailed-transcript error:', error);
        res.status(500).send('Failed to generate detailed transcript.');
    }
});

// FIX: Correctly typed the req and res parameters to use aliased express types to avoid type conflicts.
app.post('/api/search-public-solutions', async (req: ExpressRequest, res: ExpressResponse) => {
    try {
        const { query, knowledgeBank } = req.body;
        if (!query || !knowledgeBank) return res.status(400).send('Query and knowledge bank are required.');

        const knowledgeContext = knowledgeBank.map((item: any) => ({
            problem: item.summary.problem,
            solution: item.summary.solution,
        }));
        const prompt = `You are a helpful AI assistant... A customer has the following problem: "${query}". Here is a knowledge base: --- ${JSON.stringify(knowledgeContext, null, 2)} --- Based ONLY on the knowledge base, synthesize 2-3 solutions.`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: { responseMimeType: "application/json", responseSchema: knowledgeSearchSchema }
        });

        const text = response.text;
        if (!text) {
            console.error('[server] /api/search-public-solutions error: No text in Gemini response.', response);
            throw new Error('Received an empty text response from the AI model.');
        }
        
        res.json(JSON.parse(text.trim()));
    } catch (error) {
        console.error('[server] /api/search-public-solutions error:', error);
        res.status(500).send('Failed to search public solutions.');
    }
});


app.listen(port, () => {
    console.log(`[server]: Tribal Gnosis backend is running at http://localhost:${port}`);
});