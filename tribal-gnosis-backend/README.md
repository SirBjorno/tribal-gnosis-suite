# Tribal Gnosis Backend

This is the backend server for the Tribal Gnosis application. It provides API endpoints for user management, transcription, analysis, and knowledge base functionality.

## Prerequisites

- Node.js (v18+)
- MongoDB (v4.4+)
- npm or yarn

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Configure environment variables:
   - Copy `.env.example` to `.env`
   - Update the `DATABASE_URL` with your MongoDB connection string
   - Adjust other settings as needed

3. Build the application:
   ```bash
   npm run build
   ```

4. Initialize the database:
   ```bash
   npm run seed
   ```
   This will create:
   - A master tenant
   - A master admin user (default: master@tribal-gnosis.com)

5. Start the server:
   - Development mode: `npm run dev`
   - Production mode: `npm start`

## Project Structure

- `src/config/` - Configuration files
- `src/models/` - Database models and schemas
- `src/routes/` - API route definitions
- `src/services/` - Business logic and services
- `src/scripts/` - Utility scripts like database seeding

## Database Schema

### Tenant
- Multi-tenant architecture
- Company details and settings
- Feature flags and limits

### User
- Role-based access (master, admin, analyst)
- Tenant association
- Authentication details

### KnowledgeItem
- Content storage and organization
- Transcription and analysis results
- Tenant isolation

## Environment Variables

- `DATABASE_URL`: MongoDB connection string
- `MASTER_EMAIL`: Master admin email
- `MASTER_PASSWORD`: Master admin password
- `MASTER_COMPANY_CODE`: Master tenant company code
- `PORT`: Server port (default: 3001)
- `NODE_ENV`: Environment setting (development/production)