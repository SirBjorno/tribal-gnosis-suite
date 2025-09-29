import mongoose from 'mongoose';

// Subscription tier definitions with explicit typing
type SubscriptionTier = {
  name: string;
  price: number;
  minutesPerMonth: number;
  maxCompanies: number;
  maxUsers: number;
  storageGB: number;
  features: {
    transcription: boolean;
    analysis: boolean;
    knowledgeBase: boolean;
    apiAccess: boolean;
    customModels: boolean;
    whiteLabel: boolean;
  };
};

const SUBSCRIPTION_TIERS: Record<string, SubscriptionTier> = {
  STARTER: {
    name: 'Starter',
    price: 0,
    minutesPerMonth: 100,
    maxCompanies: 1,
    maxUsers: 3,
    storageGB: 1,
    features: {
      transcription: true,
      analysis: true,
      knowledgeBase: true,
      apiAccess: false,
      customModels: false,
      whiteLabel: false
    }
  },
  GROWTH: {
    name: 'Growth',
    price: 79,
    minutesPerMonth: 1000,
    maxCompanies: 3,
    maxUsers: 15,
    storageGB: 10,
    features: {
      transcription: true,
      analysis: true,
      knowledgeBase: true,
      apiAccess: true,
      customModels: false,
      whiteLabel: false
    }
  },
  PROFESSIONAL: {
    name: 'Professional',
    price: 299,
    minutesPerMonth: 5000,
    maxCompanies: 10,
    maxUsers: 50,
    storageGB: 50,
    features: {
      transcription: true,
      analysis: true,
      knowledgeBase: true,
      apiAccess: true,
      customModels: true,
      whiteLabel: false
    }
  },
  ENTERPRISE: {
    name: 'Enterprise',
    price: 699,
    minutesPerMonth: 15000,
    maxCompanies: -1, // unlimited
    maxUsers: -1, // unlimited
    storageGB: 200,
    features: {
      transcription: true,
      analysis: true,
      knowledgeBase: true,
      apiAccess: true,
      customModels: true,
      whiteLabel: true
    }
  },
  ENTERPRISE_PLUS: {
    name: 'Enterprise Plus',
    price: 1299,
    minutesPerMonth: 30000,
    maxCompanies: -1,
    maxUsers: -1,
    storageGB: 500,
    features: {
      transcription: true,
      analysis: true,
      knowledgeBase: true,
      apiAccess: true,
      customModels: true,
      whiteLabel: true
    }
  }
};

const tenantSchema = new mongoose.Schema({
  name: { type: String, required: true },
  companyCode: { type: String, required: true, unique: true },
  domain: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  
  // Subscription information
  subscription: {
    tier: { 
      type: String, 
      enum: ['STARTER', 'GROWTH', 'PROFESSIONAL', 'ENTERPRISE', 'ENTERPRISE_PLUS'],
      default: 'STARTER'
    },
    stripeCustomerId: String,
    stripeSubscriptionId: String,
    status: { 
      type: String, 
      enum: ['active', 'past_due', 'canceled', 'incomplete', 'trialing'],
      default: 'active'
    },
    currentPeriodStart: Date,
    currentPeriodEnd: Date,
    cancelAtPeriodEnd: { type: Boolean, default: false }
  },
  
  // Usage tracking
  usage: {
    currentPeriod: {
      transcriptionMinutes: { type: Number, default: 0 },
      apiCalls: { type: Number, default: 0 },
      storageUsedMB: { type: Number, default: 0 }
    },
    lastResetDate: { type: Date, default: Date.now }
  },
  
  // Legacy settings for backward compatibility
  settings: {
    maxUsers: { type: Number, default: 3 },
    maxStorage: { type: Number, default: 1024 }, // 1GB in MB
    features: {
      transcription: { type: Boolean, default: true },
      analysis: { type: Boolean, default: true },
      knowledgeBase: { type: Boolean, default: true }
    }
  }
});

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { 
    type: String, 
    enum: ['master', 'admin', 'analyst'], 
    required: true 
  },
  tenantId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Tenant',
    required: true
  },
  lastLogin: { type: Date },
  active: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
});

const knowledgeItemSchema = new mongoose.Schema({
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    required: true
  },
  title: { type: String, required: true },
  content: { type: String, required: true },
  tags: [String],
  category: { type: String },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  audioUrl: String,
  transcription: {
    text: String,
    confidence: Number
  },
  analysis: {
    summary: String,
    keyPoints: [String],
    sentiment: String
  },
  metadata: {
    source: String,
    languageCode: String,
    duration: Number
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Add indexes for better query performance
userSchema.index({ tenantId: 1 });
knowledgeItemSchema.index({ tenantId: 1 });
knowledgeItemSchema.index({ 
  title: 'text', 
  content: 'text', 
  tags: 'text' 
});

// Usage tracking schema for detailed analytics
interface IUsageRecord {
  tenantId: mongoose.Types.ObjectId;
  date: Date;
  type: 'transcription' | 'analysis' | 'api_call' | 'storage_update';
  details: any;
  cost?: number;
}

const usageRecordSchema = new mongoose.Schema<IUsageRecord>({
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    required: true
  },
  date: { type: Date, default: Date.now },
  type: { 
    type: String, 
    enum: ['transcription', 'analysis', 'api_call', 'storage_update'],
    required: true 
  },
  details: mongoose.Schema.Types.Mixed,
  cost: Number
});

// Billing event schema for Stripe webhooks
interface IBillingEvent {
  tenantId: mongoose.Types.ObjectId;
  stripeEventId?: string;
  eventType?: string;
  amount?: number;
  currency: string;
  status?: string;
  createdAt: Date;
  metadata?: any;
}

const billingEventSchema = new mongoose.Schema<IBillingEvent>({
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    required: true
  },
  stripeEventId: { type: String, unique: true },
  eventType: String,
  amount: Number,
  currency: { type: String, default: 'usd' },
  status: String,
  createdAt: { type: Date, default: Date.now },
  metadata: mongoose.Schema.Types.Mixed
});

// Add indexes for better query performance
tenantSchema.index({ 'subscription.stripeCustomerId': 1 });
tenantSchema.index({ 'subscription.status': 1 });
usageRecordSchema.index({ tenantId: 1, date: -1 });
usageRecordSchema.index({ type: 1, date: -1 });
billingEventSchema.index({ tenantId: 1, createdAt: -1 });
billingEventSchema.index({ stripeEventId: 1 });

userSchema.index({ tenantId: 1 });
knowledgeItemSchema.index({ tenantId: 1 });
knowledgeItemSchema.index({ 
  title: 'text', 
  content: 'text', 
  tags: 'text' 
});

// Middleware to enforce tenant isolation
knowledgeItemSchema.pre('find', function(this: any) {
  if (!this.getQuery().tenantId) {
    throw new Error('Tenant ID is required for all queries');
  }
});

// Export subscription tiers for use in application
export { SUBSCRIPTION_TIERS };

export const Tenant = mongoose.model('Tenant', tenantSchema);
export const User = mongoose.model('User', userSchema);  
export const KnowledgeItem = mongoose.model('KnowledgeItem', knowledgeItemSchema);
export const UsageRecord = mongoose.model<IUsageRecord>('UsageRecord', usageRecordSchema);
export const BillingEvent = mongoose.model<IBillingEvent>('BillingEvent', billingEventSchema);