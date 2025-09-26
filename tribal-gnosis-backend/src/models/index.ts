import mongoose from 'mongoose';

const tenantSchema = new mongoose.Schema({
  name: { type: String, required: true },
  companyCode: { type: String, required: true, unique: true },
  domain: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  settings: {
    maxUsers: { type: Number, default: 10 },
    maxStorage: { type: Number, default: 5120 }, // 5GB in MB
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

// Middleware to enforce tenant isolation
knowledgeItemSchema.pre('find', function(this: any) {
  if (!this.getQuery().tenantId) {
    throw new Error('Tenant ID is required for all queries');
  }
});

export const Tenant = mongoose.model('Tenant', tenantSchema);
export const User = mongoose.model('User', userSchema);
export const KnowledgeItem = mongoose.model('KnowledgeItem', knowledgeItemSchema);