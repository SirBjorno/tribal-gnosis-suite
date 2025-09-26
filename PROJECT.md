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
   - Master: Can manage all tenants
   - Admin: Can manage their organization
   - Analyst: Can use features within their organization

3. **Knowledge Management**
   - Transcription of audio content
   - AI-powered analysis
   - Knowledge base organization
   - Search and retrieval

## Technical Architecture

### Frontend (React + TypeScript)
- Login and tenant verification
- Real-time transcription interface
- Knowledge search and organization
- Analysis visualization

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
- Backend deployment: Running on Render
- Frontend deployment: Running on Render
- Database: MongoDB Atlas configured
- Authentication: JWT-based
- Default master tenant code: TRIBAL-MASTER-2025

## Development Workflow
1. Local development uses `.env` for environment variables
2. Render deployments use environment variables in dashboard
3. MongoDB Atlas provides database service
4. GitHub holds source code repository