# Tribal Gnosis Project Overview

## Purpose
Tribal Gnosis is a multi-tenant knowledge management system that helps organizations transcribe, analyze, and organize their tribal knowledge.

## Core Features
1. **Multi-tenant System**
   - Each organization (tenant) has isolated data
   - Master admin can manage multiple tenants
   - Company-specific access through company codes

2. **User Management**
   - Role hierarchy: master > admin > analyst
   - Master: Can manage all tenants and create new companies
   - Admin: Can manage their organization and create analysts
   - Analyst: Can use features within their organization

3. **Master Dashboard**
   - **Company Management**: Create and manage organizational tenants
   - **Demo Environment**: Switch to admin context for platform demonstrations
   - **Tenant Creation**: Set up new companies with initial admin users
   - **Role Switching**: Seamless transition between master and demo modes

4. **Knowledge Management**
   - Transcription of audio content
   - AI-powered analysis
   - Knowledge base organization
   - Search and retrieval

## Technical Architecture

### Frontend (React + TypeScript)
- **Multi-role Interface**: Different dashboards for master/admin/analyst roles
- **Master Dashboard**: Company management and demo environment switching
- **Login and tenant verification**: Company code-based authentication
- **Real-time transcription interface**: Audio processing and analysis
- **Knowledge search and organization**: Tenant-isolated data management
- **Analysis visualization**: AI-powered insights and reporting
- **Role-based Navigation**: Dynamic UI based on user permissions

### Backend (Node.js + TypeScript)
- Multi-tenant API
- MongoDB database integration
- Authentication and authorization
- Integration with AI services (Google's Gemini)

### Database Structure
1. **Tenants**
   ```typescript
   {
     name: string
     companyCode: string
     domain: string
     settings: {
       maxUsers: number
       maxStorage: number
       features: {
         transcription: boolean
         analysis: boolean
         knowledgeBase: boolean
       }
     }
   }
   ```

2. **Users**
   ```typescript
   {
     name: string
     email: string
     role: 'master' | 'admin' | 'analyst'
     tenantId: ObjectId
     active: boolean
   }
   ```

3. **KnowledgeItems**
   ```typescript
   {
     tenantId: ObjectId
     title: string
     content: string
     tags: string[]
     audioUrl?: string
     transcription?: {
       text: string
       confidence: number
     }
     analysis?: {
       summary: string
       keyPoints: string[]
       sentiment: string
     }
   }
   ```

## Environment Variables
### Backend
- `DATABASE_URL`: MongoDB connection string
- `MASTER_EMAIL`: Master admin email
- `MASTER_PASSWORD`: Master admin password
- `MASTER_COMPANY_CODE`: Master tenant identifier
- `GEMINI_API_KEY`: Google's Gemini AI API key
- `JWT_SECRET`: Authentication token secret

### Frontend
- `VITE_API_BASE_URL`: Backend API URL
- `VITE_GEMINI_API_KEY`: Gemini API key for client-side features

## Current Status
- **Backend deployment**: Running on Render with MongoDB Atlas
- **Frontend deployment**: Running on Render with role-based routing
- **Database**: MongoDB Atlas configured with multi-tenant architecture
- **Authentication**: bcrypt-based password hashing with MongoDB user storage
- **Master Console**: Fully functional with company management and demo modes
- **Default master tenant**: TRIBAL-MASTER-2025 (Master Admin: bjorn.bovim@gmail.com)

## Latest Updates (September 2025)
- ✅ **Master Dashboard Implementation**: Two-section dashboard for master users
- ✅ **Demo Mode**: Master users can switch to admin context for demonstrations
- ✅ **Role-based Navigation**: Dynamic UI adaptation based on user role
- 🚧 **Company Creation System**: In development - tenant and admin user creation
- 🚧 **Enhanced Company Management**: Tenant settings, user management, analytics

## Development Workflow
1. **Local development** uses `.env` for environment variables
2. **Render deployments** use environment variables in dashboard
3. **MongoDB Atlas** provides database service with multi-tenant collections
4. **GitHub** holds source code repository with automated deployments
5. **Master user seeding** via Render shell: `npm run seed`
6. **Role testing** through master dashboard demo mode switching

## Development Roadmap (Updated September 28, 2025)

### 🚀 **Phase 1: Subscription & Billing System (Priority 1)**
**Timeline: 2-3 weeks**
- **Subscription Tiers**: Minute-based pricing with user limits
  - 🎯 **STARTER** (Free): 100 minutes/month, 1 company, 3 users
  - 📈 **GROWTH** ($79/month): 1,000 minutes/month, 3 companies, 15 users  
  - 🚀 **PROFESSIONAL** ($299/month): 5,000 minutes/month, 10 companies, 50 users
  - 🏢 **ENTERPRISE** ($699/month): 15,000 minutes/month, unlimited companies/users
  - 💼 **ENTERPRISE+** ($1299/month): 30,000+ minutes/month, custom features
- **Stripe Integration**: Payment processing, subscription management
- **Usage Tracking**: Transcription minutes, storage, API calls per tenant
- **Feature Gating**: Restrict features based on subscription tier and limits
- **Billing Dashboard**: Admin interface for subscription and usage management

### 📊 **Phase 2: Enhanced User Management (2-3 weeks)**
- **User Invitations**: Email-based onboarding system
- **Advanced Permissions**: Custom role creation and management
- **Profile Management**: User settings, preferences, activity tracking
- **Role-based Features**: Granular access control per subscription tier

### 📈 **Phase 3: Advanced Analytics & Reporting (2-3 weeks)**
- **Usage Analytics**: Real-time dashboards for transcription metrics
- **Cost Tracking**: Per-tenant cost analysis and profit margins
- **AI Quality Metrics**: Transcription accuracy and analysis insights
- **Business Intelligence**: Revenue analytics, user engagement, churn prediction

### 🔗 **Phase 4: Integration & API Platform (3-4 weeks)**
- **REST API**: Third-party integrations with documentation
- **Zoom/Teams Integration**: Direct meeting transcription
- **Mobile APIs**: iOS/Android app support
- **Webhook System**: Real-time notifications for external systems
- **Zapier Integration**: No-code automation workflows

### 🧠 **Phase 5: AI Enhancement Features (4-5 weeks)**
- **Custom AI Models**: Industry-specific transcription and analysis
- **Multi-language Support**: Global market expansion
- **Speaker Identification**: Advanced audio processing
- **Auto-generated Insights**: Predictive analytics and recommendations

### 🎯 **Quick Wins (1-2 weeks)**
- **Enhanced Onboarding**: Interactive tutorials and welcome flows  
- **UI/UX Improvements**: Loading states, error handling, dark mode
- **Export Features**: PDF reports, CSV data, backup functionality

## 💰 **Revenue Model & Cost Structure**

### **Transcription Cost Analysis (Per 5,000 minutes/month)**
- **OpenAI Whisper API**: ~$30/month (recommended)
- **Google Speech-to-Text**: ~$120/month
- **AWS Transcribe**: ~$120/month
- **Platform Margin**: 300-400% markup for value-added services

### **Pricing Strategy**
Minute-based tiers with significant value-add through AI analysis, knowledge management, and multi-tenant capabilities. Each tier includes:
- Core transcription minutes allocation
- User seat limits based on tier
- Storage quotas
- Feature access levels
- Support tiers

## 🛠 **Management & Operations Strategy**

### **Virtual Assistant Capabilities**
**✅ Can Handle:**
- Customer support (tier 1) via chat/email
- Account setup and onboarding
- Billing inquiries and subscription changes
- Usage monitoring and alerts
- Content moderation and quality checks
- Social media management
- Documentation updates

**❌ Requires Technical Expertise:**
- Server maintenance and deployments
- Database optimization and scaling
- API integrations and debugging
- Security updates and monitoring
- Custom feature development
- Enterprise client implementations

### **Recommended Team Structure**
1. **You (Technical Lead)**: Architecture, development, enterprise sales
2. **Virtual Assistant**: Customer success, operations, content
3. **Part-time Developer** (as you scale): Feature development, maintenance

### **Operational Tools Needed**
- **Customer Support**: Intercom, Zendesk, or Help Scout
- **Analytics**: Mixpanel, Amplitude for user behavior
- **Monitoring**: Sentry for error tracking, New Relic for performance
- **Business Intelligence**: Stripe Dashboard + custom analytics
- **Team Communication**: Slack, Notion for documentation