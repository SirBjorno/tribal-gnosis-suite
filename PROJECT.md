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

## Upcoming Features
- **Company Creation API**: Backend endpoints for tenant and user creation
- **Company Management UI**: Full CRUD interface for managing organizations
- **Demo Tenant Setup**: Pre-populated demo environment with sample data
- **Analytics Dashboard**: Usage metrics and tenant overview for master users
- **User Management**: Admin interface for managing analysts within organizations