import type { Analysis, KnowledgeSearchResults, DetailedTranscript, KnowledgeBankItem, User } from '../types.ts';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

// --- NEW Authentication API ---

export const loginUser = async (credentials: Record<string, string>): Promise<User> => {
    const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials),
    });
    const data = await response.json();
    if (!response.ok) {
        throw new Error(data.message || 'Failed to login.');
    }
    return data;
};

export const signupUser = async (details: Record<string, string>): Promise<{ message: string }> => {
    const response = await fetch(`${API_BASE_URL}/api/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(details),
    });
    const data = await response.json();
    if (!response.ok) {
        throw new Error(data.message || 'Failed to sign up.');
    }
    return data;
};


// --- Cloud Knowledge Bank API ---

export const getKnowledgeBankFromCloud = async (tenantId: string): Promise<KnowledgeBankItem[]> => {
    console.log(`API SERVICE: Fetching knowledge bank for tenant ${tenantId} from cloud...`);
    const response = await fetch(`${API_BASE_URL}/api/knowledge-bank/${tenantId}`);
    if (!response.ok) {
        const errorText = await response.text();
        console.error("Failed to fetch knowledge bank:", errorText);
        throw new Error('Failed to fetch knowledge bank from cloud.');
    }
    return response.json();
};

export const addKnowledgeBankItemToCloud = async (tenantId: string, item: KnowledgeBankItem): Promise<KnowledgeBankItem> => {
    console.log(`API SERVICE: Adding item ${item.id} to cloud for tenant ${tenantId}...`);
    const response = await fetch(`${API_BASE_URL}/api/knowledge-bank/${tenantId}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(item),
    });
    if (!response.ok) {
        const errorText = await response.text();
        console.error("Failed to add knowledge bank item:", errorText);
        throw new Error('Failed to add item to cloud knowledge bank.');
    }
    return response.json();
};


// --- Secure Backend Gemini API Wrappers ---

/**
 * Public API method to analyze a transcript.
 * This now calls our secure backend endpoint.
 */
export const analyzeTranscript = async (transcript: string): Promise<Analysis> => {
    console.log("API SERVICE: Calling backend for analysis...");
    const response = await fetch(`${API_BASE_URL}/api/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript }),
    });
    if (!response.ok) {
        const errorText = await response.text();
        console.error("Analysis API call failed:", errorText);
        throw new Error('Failed to analyze transcript via backend.');
    }
    return response.json();
};

/**
 * Public API method to generate a detailed transcript from raw text.
 * This now calls our secure backend endpoint.
 */
export const generateDetailedTranscript = async (rawTranscript: string): Promise<DetailedTranscript> => {
    console.log("API SERVICE: Calling backend for detailed transcript generation...");
    const response = await fetch(`${API_BASE_URL}/api/generate-detailed-transcript`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rawTranscript }),
    });
    if (!response.ok) {
        const errorText = await response.text();
        console.error("Detailed transcript generation failed:", errorText);
        throw new Error('Failed to generate detailed transcript via backend.');
    }
    return response.json();
};

/**
 * Public API method to search the main knowledge bank.
 * This now calls our secure backend endpoint.
 */
export const searchPublicSolutions = async (query: string, knowledgeBank: KnowledgeBankItem[]): Promise<KnowledgeSearchResults> => {
    console.log("API SERVICE: Calling backend for public search...");
     const response = await fetch(`${API_BASE_URL}/api/search-public-solutions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, knowledgeBank }),
    });
    if (!response.ok) {
        const errorText = await response.text();
        console.error("Public search failed:", errorText);
        throw new Error('Failed to search public solutions via backend.');
    }
    return response.json();
};

/**
 * MOCKED Public API method to search the temporary session knowledge bank.
 * This remains a local operation as it doesn't require a powerful LLM.
 */
export const searchSessionSolutions = (query: string, sessionKnowledgeBank: Analysis[]): Promise<KnowledgeSearchResults> => {
    console.log("MOCK API: Simulating session search for:", query);
    const mockResults: KnowledgeSearchResults = sessionKnowledgeBank
        .filter(analysis => analysis.problem.toLowerCase().includes(query.toLowerCase()))
        .map(analysis => ({
            solution: `Session-Specific: ${analysis.solution}`,
            description: `A solution was found in the current session for a similar problem: "${analysis.problem}"`
        }));
        
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve(mockResults.slice(0, 2)); // Return max 2 results
        }, 400); // Short delay for local search
    });
};