import mongoose from 'mongoose';

// User invitation schema
export interface IUserInvitation {
  tenantId: mongoose.Types.ObjectId;
  email: string;
  role: 'admin' | 'analyst' | 'user';
  invitedBy: mongoose.Types.ObjectId;
  token: string;
  expiresAt: Date;
  status: 'pending' | 'accepted' | 'expired' | 'revoked';
  createdAt: Date;
  acceptedAt?: Date;
}

const userInvitationSchema = new mongoose.Schema<IUserInvitation>({
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    required: true
  },
  email: { 
    type: String, 
    required: true,
    lowercase: true,
    trim: true
  },
  role: {
    type: String,
    enum: ['admin', 'analyst', 'user'],
    default: 'user',
    required: true
  },
  invitedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  token: {
    type: String,
    required: true,
    unique: true
  },
  expiresAt: {
    type: Date,
    required: true,
    default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
  },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'expired', 'revoked'],
    default: 'pending'
  },
  createdAt: { type: Date, default: Date.now },
  acceptedAt: Date
});

// Index for efficient queries
userInvitationSchema.index({ tenantId: 1, status: 1 });
userInvitationSchema.index({ token: 1 });
userInvitationSchema.index({ email: 1, tenantId: 1 });
userInvitationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const UserInvitation = mongoose.model<IUserInvitation>('UserInvitation', userInvitationSchema);

// User profile enhancement schema
export interface IUserProfile {
  userId: mongoose.Types.ObjectId;
  displayName?: string;
  avatar?: string;
  timezone?: string;
  language: string;
  notifications: {
    email: boolean;
    inApp: boolean;
    transcriptionComplete: boolean;
    usageLimits: boolean;
    billingUpdates: boolean;
  };
  preferences: {
    defaultTranscriptionLanguage: string;
    autoSaveTranscriptions: boolean;
    showAdvancedFeatures: boolean;
    dashboardLayout: 'compact' | 'detailed' | 'cards';
  };
  lastLoginAt?: Date;
  onboardingCompleted: boolean;
  onboardingStep: number;
}

const userProfileSchema = new mongoose.Schema<IUserProfile>({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  displayName: String,
  avatar: String, // URL or base64
  timezone: { type: String, default: 'UTC' },
  language: { type: String, default: 'en' },
  notifications: {
    email: { type: Boolean, default: true },
    inApp: { type: Boolean, default: true },
    transcriptionComplete: { type: Boolean, default: true },
    usageLimits: { type: Boolean, default: true },
    billingUpdates: { type: Boolean, default: true }
  },
  preferences: {
    defaultTranscriptionLanguage: { type: String, default: 'en-US' },
    autoSaveTranscriptions: { type: Boolean, default: true },
    showAdvancedFeatures: { type: Boolean, default: false },
    dashboardLayout: { 
      type: String, 
      enum: ['compact', 'detailed', 'cards'], 
      default: 'detailed' 
    }
  },
  lastLoginAt: Date,
  onboardingCompleted: { type: Boolean, default: false },
  onboardingStep: { type: Number, default: 0 }
});

userProfileSchema.index({ userId: 1 });

export const UserProfile = mongoose.model<IUserProfile>('UserProfile', userProfileSchema);

// Permission system
export interface IUserPermission {
  userId: mongoose.Types.ObjectId;
  tenantId: mongoose.Types.ObjectId;
  permissions: {
    // Transcription permissions
    createTranscription: boolean;
    viewTranscription: boolean;
    editTranscription: boolean;
    deleteTranscription: boolean;
    
    // Analysis permissions
    runAnalysis: boolean;
    viewAnalysis: boolean;
    editAnalysis: boolean;
    
    // Knowledge base permissions
    viewKnowledgeBase: boolean;
    editKnowledgeBase: boolean;
    manageKnowledgeBase: boolean;
    
    // User management permissions
    inviteUsers: boolean;
    manageUsers: boolean;
    viewUsers: boolean;
    
    // Admin permissions
    manageBilling: boolean;
    viewUsageStats: boolean;
    manageIntegrations: boolean;
    manageSettings: boolean;
    exportData: boolean;
  };
  customPermissions?: string[]; // For future extensibility
  grantedBy: mongoose.Types.ObjectId;
  grantedAt: Date;
}

const userPermissionSchema = new mongoose.Schema<IUserPermission>({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    required: true
  },
  permissions: {
    // Transcription permissions
    createTranscription: { type: Boolean, default: true },
    viewTranscription: { type: Boolean, default: true },
    editTranscription: { type: Boolean, default: false },
    deleteTranscription: { type: Boolean, default: false },
    
    // Analysis permissions
    runAnalysis: { type: Boolean, default: true },
    viewAnalysis: { type: Boolean, default: true },
    editAnalysis: { type: Boolean, default: false },
    
    // Knowledge base permissions
    viewKnowledgeBase: { type: Boolean, default: true },
    editKnowledgeBase: { type: Boolean, default: false },
    manageKnowledgeBase: { type: Boolean, default: false },
    
    // User management permissions
    inviteUsers: { type: Boolean, default: false },
    manageUsers: { type: Boolean, default: false },
    viewUsers: { type: Boolean, default: true },
    
    // Admin permissions
    manageBilling: { type: Boolean, default: false },
    viewUsageStats: { type: Boolean, default: false },
    manageIntegrations: { type: Boolean, default: false },
    manageSettings: { type: Boolean, default: false },
    exportData: { type: Boolean, default: false }
  },
  customPermissions: [String],
  grantedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  grantedAt: { type: Date, default: Date.now }
});

// Compound index for efficient permission lookups
userPermissionSchema.index({ userId: 1, tenantId: 1 }, { unique: true });
userPermissionSchema.index({ tenantId: 1 });

export const UserPermission = mongoose.model<IUserPermission>('UserPermission', userPermissionSchema);

// Default permission templates based on roles
export const ROLE_PERMISSIONS = {
  admin: {
    createTranscription: true,
    viewTranscription: true,
    editTranscription: true,
    deleteTranscription: true,
    runAnalysis: true,
    viewAnalysis: true,
    editAnalysis: true,
    viewKnowledgeBase: true,
    editKnowledgeBase: true,
    manageKnowledgeBase: true,
    inviteUsers: true,
    manageUsers: true,
    viewUsers: true,
    manageBilling: true,
    viewUsageStats: true,
    manageIntegrations: true,
    manageSettings: true,
    exportData: true
  },
  analyst: {
    createTranscription: true,
    viewTranscription: true,
    editTranscription: true,
    deleteTranscription: false,
    runAnalysis: true,
    viewAnalysis: true,
    editAnalysis: true,
    viewKnowledgeBase: true,
    editKnowledgeBase: true,
    manageKnowledgeBase: false,
    inviteUsers: false,
    manageUsers: false,
    viewUsers: true,
    manageBilling: false,
    viewUsageStats: true,
    manageIntegrations: false,
    manageSettings: false,
    exportData: true
  },
  user: {
    createTranscription: true,
    viewTranscription: true,
    editTranscription: false,
    deleteTranscription: false,
    runAnalysis: false,
    viewAnalysis: true,
    editAnalysis: false,
    viewKnowledgeBase: true,
    editKnowledgeBase: false,
    manageKnowledgeBase: false,
    inviteUsers: false,
    manageUsers: false,
    viewUsers: false,
    manageBilling: false,
    viewUsageStats: false,
    manageIntegrations: false,
    manageSettings: false,
    exportData: false
  }
};

// Onboarding steps configuration
export const ONBOARDING_STEPS = [
  {
    id: 1,
    title: 'Welcome to Tribal Gnosis',
    description: 'Complete your profile setup',
    component: 'ProfileSetup',
    required: true
  },
  {
    id: 2,
    title: 'Choose Your Plan',
    description: 'Select a subscription tier that fits your needs',
    component: 'PlanSelection',
    required: false
  },
  {
    id: 3,
    title: 'Upload Your First Transcription',
    description: 'Try our AI-powered transcription service',
    component: 'FirstTranscription',
    required: false
  },
  {
    id: 4,
    title: 'Explore Knowledge Base',
    description: 'Learn how to organize and search your content',
    component: 'KnowledgeBaseTour',
    required: false
  },
  {
    id: 5,
    title: 'Invite Team Members',
    description: 'Collaborate with your team',
    component: 'TeamInvitation',
    required: false
  }
];