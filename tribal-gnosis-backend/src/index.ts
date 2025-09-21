// FIX: Import Request and Response types from express with aliases to avoid conflicts with global DOM types.
import express, { Express, Request as ExpressRequest, Response as ExpressResponse } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from "@google/genai";

// A simple type for our knowledge bank items for type safety on the backend
interface KnowledgeBankItem {
  id: string;
  [key: string]: any;
}

dotenv.config();

const app: Express = express();
const port = process.env.PORT || 3001;

// Middlewares
app.use(cors());
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

// In-memory data store to simulate a multi-tenant database
const tenantData: Record<string, any> = {
    'acme-corp': {
        "error": "data corruption",
        "data": "should not be here"
    }, 
    'globex-inc': [
        {
            id: "globex_log_001",
            audioUrl: null,
            detailedTranscript: { confidenceScore: 0.99, dialogue: [] },
            summary: {
                customerProfile: { name: "Art Vandelay", accountNumber: "GL-123" },
                problem: "Cannot export architectural drawings.",
                solution: "User was trying to export to a proprietary format. Advised to use standard PDF export.",
                resolution: "Resolved.",
                productInformation: "Vandelay Industries Architect Pro v3.0",
            },
        },
    ],
};

// --- Knowledge Bank API Endpoints ---
// FIX: Correctly typed the req and res parameters to use aliased express types to avoid type conflicts.
app.get('/api/knowledge-bank/:tenantId', (req: ExpressRequest, res: ExpressResponse) => {
    const { tenantId } = req.params;
    console.log(`[GET /api/knowledge-bank/${tenantId}] - Request received.`);
    let knowledgeBank = tenantData[tenantId];
    if (!knowledgeBank || !Array.isArray(knowledgeBank)) {
        console.warn(`[server]: Data for tenant '${tenantId}' is missing or malformed. Self-healing and returning empty array.`);
        tenantData[tenantId] = [];
        return res.status(200).json([]);
    }
    res.status(200).json(knowledgeBank);
});

// FIX: Correctly typed the req and res parameters to use aliased express types to avoid type conflicts.
app.post('/api/knowledge-bank/:tenantId', (req: ExpressRequest, res: ExpressResponse) => {
    const { tenantId } = req.params;
    const newItem = req.body as KnowledgeBankItem;
    console.log(`[POST /api/knowledge-bank/${tenantId}] - Request to add item: ${newItem.id}`);
    if (!tenantData[tenantId] || !Array.isArray(tenantData[tenantId])) {
        tenantData[tenantId] = [];
    }
    if (tenantData[tenantId].find((item: KnowledgeBankItem) => item.id === newItem.id)) {
        return res.status(200).json(newItem);
    }
    tenantData[tenantId].push(newItem);
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