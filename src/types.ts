export type UserRole = 'analyst' | 'admin' | null;

export interface User {
    name: string;
    email: string;
    role: NonNullable<UserRole>;
    tenantId: string;
}

export interface CustomerProfile {
  name: string;
  accountNumber: string;
}

export interface Analysis {
  customerProfile: CustomerProfile;
  introduction: string;
  problem: string;
  solution: string;
  resolution: string;
  productInformation: string;
}

export type ReviewStatus =
  | 'pending_transcript'
  | 'summarizing'
  | 'pending_summary'
  | 'approved'
  | 'rejected';

export interface DialogueEntry {
    speaker: 'Agent' | 'Customer' | 'Unknown';
    timestamp: string;
    text: string;
}

export interface DetailedTranscript {
    confidenceScore: number;
    dialogue: DialogueEntry[];
}

export interface ReviewItem {
  id: string;
  detailedTranscript: DetailedTranscript;
  status: ReviewStatus;
  summary: Analysis | null;
  audioUrl: string | null;
}

// The new structure for the main knowledge bank, holding a complete record.
export interface KnowledgeBankItem {
  id: string;
  audioUrl: string | null;
  detailedTranscript: DetailedTranscript;
  summary: Analysis;
}


export interface CommonSolution {
  solution: string;
  description: string;
}

export type KnowledgeSearchResults = CommonSolution[];

export interface LiveCall {
    source: 'teams';
    dialogue: string[];
}

export type Tab = 'workflow' | 'analyzer' | 'database' | 'consumer-search' | 'integrations' | 'logistics';