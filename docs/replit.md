# Chanuka - Legislative Transparency Platform

## Overview

Chanuka is a civic technology platform designed to democratize legislative transparency and enhance citizen engagement in the democratic process. The platform transforms complex legislation into accessible information, provides stakeholder analysis, and enables informed public participation.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript, built using Vite
- **UI Framework**: Tailwind CSS with shadcn/ui components configured in "new-york" style
- **State Management**: Zustand or React Query for server state management
- **Routing**: React Router for client-side navigation
- **Authentication**: JWT-based with OAuth support (Google)
- **Internationalization**: Support for multiple languages including English and Swahili

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: Passport.js with local and OAuth strategies
- **Session Management**: Express sessions with database storage
- **API Design**: RESTful API with versioned endpoints

### Database Architecture
- **ORM**: Drizzle ORM with PostgreSQL dialect
- **Connection**: Neon serverless PostgreSQL for cloud deployment
- **Migrations**: Automated migration system with version control
- **Schema**: Comprehensive legislative data model including bills, users, stakeholders, comments, and verification systems

## Key Components

### 1. Legislative Analysis Engine
- **Bill Processing**: Complex legislation parsing and simplification
- **Constitutional Analysis**: AI-powered analysis of potential constitutional conflicts
- **Stakeholder Mapping**: Relationship visualization between legislation sponsors and beneficiaries
- **Impact Assessment**: Analysis of who benefits from specific legislation

### 2. User Engagement System
- **Public Input Collection**: Weighted feedback system based on user expertise
- **Community Verification**: Peer review and fact-checking mechanisms  
- **Expert Verification**: Professional validation of analysis and claims
- **Social Integration**: Sharing capabilities across major social platforms

### 3. Transparency Features
- **Conflict of Interest Detection**: Analysis of potential conflicts among legislators
- **Financial Relationship Mapping**: Visualization of financial connections
- **Voting Pattern Analysis**: Historical voting behavior tracking
- **Timeline Tracking**: Legislative process progress monitoring

### 4. Authentication & Authorization
- **Multi-Provider Auth**: Local registration and OAuth (Google) support
- **Role-Based Access**: User, expert, and admin role differentiation
- **Profile Management**: User expertise tracking and reputation systems
- **Session Security**: Secure session management with configurable timeouts

## Data Flow

### 1. Data Ingestion
- Legislative documents are collected from official sources
- Text processing and entity extraction using NLP services
- Stakeholder information gathering from public records
- Financial disclosure data integration

### 2. Analysis Pipeline
- Constitutional analysis using specialized ML models
- Stakeholder relationship mapping through graph algorithms
- Impact assessment generation based on historical data
- Complexity scoring for public accessibility

### 3. User Interaction
- Citizens access simplified bill summaries and analysis
- Community provides feedback through structured input systems
- Experts verify analysis accuracy and provide additional insights
- Real-time updates and notifications for legislative changes

## External Dependencies

### Database & Infrastructure
- **Neon Database**: Serverless PostgreSQL hosting
- **Drizzle Kit**: Database migration and schema management

### Authentication Services
- **Passport.js**: Authentication middleware
- **OAuth Providers**: Google OAuth integration
- **bcrypt**: Password hashing and security

### UI & Styling
- **Tailwind CSS**: Utility-first CSS framework
- **Radix UI**: Headless component library for accessibility
- **shadcn/ui**: Pre-built component system

### Development Tools
- **Vite**: Build tool and development server
- **TypeScript**: Static type checking
- **ESBuild**: Production bundling

## Deployment Strategy

### Development Environment
- **Local Development**: Vite dev server with hot reload
- **Database**: Local PostgreSQL or Neon development instance
- **Environment Variables**: `.env` file configuration

### Replit Environment  
- **PORT Configuration**: **IMPORTANT** - Replit requires the server to bind to port 5000 on 0.0.0.0
  - Set `PORT=5000` in Replit Secrets or environment variables
  - The server defaults to port 5000 in code, but environment variables take precedence
  - Without PORT=5000, the Replit workflow will fail to start
- **Database Setup**: Run `npx drizzle-kit push` to sync the database schema
- **Server Binding**: Already configured to bind to 0.0.0.0:5000 for Replit compatibility

### Production Deployment
- **Build Process**: Vite build for frontend, ESBuild for backend
- **Server**: Node.js production server
- **Database**: Neon PostgreSQL with connection pooling
- **Session Storage**: Database-backed session management

### Architecture Decisions

1. **Drizzle ORM Choice**: Selected for type safety, PostgreSQL optimization, and modern TypeScript support over traditional ORMs
2. **Serverless Database**: Neon chosen for scalability and managed infrastructure
3. **Monorepo Structure**: Single repository with shared schema for consistency between frontend and backend
4. **Progressive Enhancement**: Core functionality works without JavaScript, enhanced with interactive features

## Changelog

- October 08, 2025: Migrated project to Replit environment
  - ✓ Updated server to bind to 0.0.0.0:5000 for Replit compatibility
  - ✓ Fixed frontend import errors (deprecated hooks replaced with useKeyboardFocus)
  - ✓ Fixed MobileNavigation component to use local state
  - ✓ Successfully pushed database schema using Drizzle Kit
  - ✓ Database connection established and working
  - ⚠️ Requires PORT=5000 to be set in Replit Secrets for workflow to start

- July 05, 2025: Completed systematic storage and schema consistency improvements
  - ✓ Consolidated storage layer to use only legislative transparency schema
  - ✓ Created comprehensive LegislativeStorage interface with all required methods
  - ✓ Removed inconsistent storage files that referenced non-existent schema types
  - ✓ Fixed all import path issues across server routes and storage components
  - ✓ Established clean separation between legislative storage and routes
  - ✓ Updated system routes to handle database schema analysis properly
  - ✓ Verified all API endpoints are functioning correctly with legislative schema
  - ✓ Successfully pushed complete legislative database schema (12 tables)
  - ✓ All storage components now consistently use the same legislative schema types

- July 03, 2025: Fixed critical database consistency issues
  - ✓ Resolved missing Settings import in SystemHealth component  
  - ✓ Added missing SQL import in routes.ts for schema analysis queries
  - ✓ Created proper IStorage interface and fixed storage implementation
  - ✓ Resolved circular dependency in comments table schema
  - ✓ Successfully pushed database schema using Drizzle ORM
  - ✓ Fixed CSS styling issues (border-border class conflicts)
  - ✓ Cleaned up duplicate ML analysis service functions
  - ✓ Established comprehensive database monitoring with real-time metrics

- July 02, 2025: Initial setup

## User Preferences

Preferred communication style: Simple, everyday language.