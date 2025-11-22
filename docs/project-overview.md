# Chanuka Platform Project Overview

## 1. Project Overview

The Chanuka platform is a comprehensive civic engagement and governance transparency solution designed to illuminate governmental processes and enable distributed citizen participation in democratic governance. The name "Chanuka" derives from Swahili meaning "to illuminate," capturing the platform's core mission of bringing transparency and clarity to governance systems that have historically been opaque and inaccessible to ordinary citizens.

Rooted in a theological framework that draws from biblical patterns of leadership evolution—from concentrated authority (Moses) through institutional accountability (prophets) to distributed participation (New Testament)—the platform serves kingdom purposes by democratizing access to legislative information, enabling community input in policy development, and fostering accountability in governmental processes. Rather than merely providing political information, Chanuka creates an informed citizenry capable of strategic engagement with governance systems, helping communities transform their relationship with power structures.

The platform addresses systemic challenges in Kenyan governance by providing tools for citizens to understand legislative processes, track bill sponsorship and voting patterns, analyze stakeholder relationships, and participate meaningfully in policy development. This serves both immediate civic purposes and long-term community flourishing by preventing the concentration of power that inevitably leads to corruption and inequality.

## 2. Architecture Overview

The Chanuka platform follows a modern monorepo architecture with clean separation of concerns across multiple specialized modules. The system is designed for scalability, maintainability, and cross-platform compatibility.

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│     Client      │    │     Server      │    │    Database     │
│   (React SPA)   │◄──►│  (Express API)  │◄──►│  (PostgreSQL)   │
│                 │    │                 │    │                 │
│ - React 18      │    │ - Express       │    │ - Drizzle ORM   │
│ - Vite          │    │ - TypeScript    │    │ - Migrations    │
│ - Tailwind CSS  │    │ - Authentication│    │ - Schemas       │
│ - React Query   │    │ - WebSockets    │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
          │                       │                       │
          └───────────────────────┼───────────────────────┘
                                  │
                     ┌─────────────────┐
                     │     Shared      │
                     │   (Utilities)   │
                     │                 │
                     │ - Types         │
                     │ - Schemas       │
                     │ - Validation    │
                     │ - Constants     │
                     └─────────────────┘
```

### Core Architecture Principles

- **Domain-Driven Design**: Organized around business domains (constitutional analysis, advocacy coordination, citizen participation)
- **Clean Architecture**: Clear separation between domain logic, application services, and infrastructure
- **Type Safety**: End-to-end TypeScript implementation ensuring compile-time safety
- **Microservices-Ready**: Modular design supporting future decomposition into microservices
- **Real-time Capabilities**: WebSocket integration for live updates and notifications

### Infrastructure Layers

The architecture implements multiple layers for different concerns:

- **Presentation Layer**: Client module handles user interfaces and interactions
- **Application Layer**: Server module manages business logic and API endpoints
- **Domain Layer**: Shared module contains core business rules and entities
- **Infrastructure Layer**: Database, caching, external APIs, and deployment concerns

## 3. Core Modules

### Client Module
The client module is the primary user interface, built as a modern React single-page application optimized for accessibility and performance. It serves as the main touchpoint for citizens, providing intuitive access to legislative information, community engagement features, and advocacy tools.

**Key Responsibilities:**
- User authentication and profile management
- Legislative bill browsing, tracking, and analysis
- Community discussion and engagement features
- Constitutional analysis and legal research tools
- Real-time notifications and updates
- Mobile-first responsive design

**Notable Features:**
- WCAG 2.1 AA accessibility compliance
- Multi-language support (English, Swahili, Kikuyu, Luo, Kamba)
- Progressive Web App capabilities
- Advanced search with AI-powered natural language processing
- Real-time WebSocket integration for live updates

### Server Module
The server module provides the backend API infrastructure, implementing domain-driven design with clean architecture principles. It handles all business logic, data processing, and external integrations while maintaining security and performance standards.

**Key Responsibilities:**
- RESTful API endpoints for all platform features
- Real-time WebSocket communication
- Authentication and authorization services
- Business logic for constitutional analysis and argument intelligence
- External API integrations (AWS SNS, OpenAI, etc.)
- Background job processing and scheduling

**Notable Features:**
- Clean architecture with domain, application, and infrastructure layers
- Comprehensive security middleware (rate limiting, input validation, CSRF protection)
- AI/ML integration for constitutional analysis and recommendation engines
- Institutional API support with multiple output formats
- Advanced caching and performance optimization

### Shared Module
The shared module contains code used across both client and server applications, ensuring type safety, data consistency, and code reusability. It serves as the single source of truth for schemas, types, and validation logic.

**Key Responsibilities:**
- Database schema definitions (Drizzle ORM)
- TypeScript type definitions and interfaces
- Zod validation schemas
- Shared utility functions and constants
- Internationalization support
- Core domain types and business rules

**Notable Features:**
- Strict TypeScript implementation with no `any` types
- Domain-driven schema organization
- Runtime type validation with Zod
- Cross-platform compatibility (client/server isomorphic code)
- Comprehensive testing coverage for all shared code

## 4. Supporting Modules

### Drizzle Module
Manages database schema definitions, migrations, and schema evolution using Drizzle ORM for type-safe database operations.

**Key Responsibilities:**
- Database migration scripts and version control
- Schema validation and health checks
- Type generation from database schemas
- Migration rollback and recovery procedures

**Notable Features:**
- Type-safe SQL queries with compile-time checking
- Incremental migrations with rollback support
- Full-text search capabilities
- Performance-optimized indexing strategies

### Scripts Module
Contains automation scripts and utilities for development, deployment, testing, and maintenance operations.

**Key Responsibilities:**
- Database setup, migration, and maintenance
- Code quality assurance and automated fixes
- Performance monitoring and optimization
- Testing automation and validation
- Deployment preparation and environment setup

**Notable Features:**
- One-command complex operations
- Automated code analysis and fixing
- Bundle size monitoring and optimization
- Accessibility testing automation
- Cross-platform script compatibility

### Tests Module
Provides comprehensive testing infrastructure covering unit, integration, end-to-end, and performance testing.

**Key Responsibilities:**
- Unit testing for individual components and functions
- Integration testing for service interactions
- End-to-end testing for complete user workflows
- Performance and accessibility testing
- Visual regression testing

**Notable Features:**
- Parallel test execution for speed
- Comprehensive coverage reporting
- Automated accessibility compliance testing
- Cross-browser compatibility testing
- Performance baseline tracking

### Deployment Module
Handles infrastructure configuration, containerization, and deployment pipelines for reliable application delivery.

**Key Responsibilities:**
- Docker containerization and orchestration
- Environment-specific configuration management
- CI/CD pipeline automation
- Monitoring and alerting setup
- CDN integration and asset delivery

**Notable Features:**
- Multi-environment deployment (development, staging, production)
- Infrastructure as code with Kubernetes support
- Automated scaling and load balancing
- Security scanning and compliance
- Disaster recovery and backup procedures

### Docs Module
Maintains comprehensive documentation for the platform, including architecture guides, API references, and operational procedures.

**Key Responsibilities:**
- Technical documentation and API references
- User guides and implementation tutorials
- Research reports and academic publications
- Operational procedures and runbooks
- Legal and compliance documentation

**Notable Features:**
- Research-backed design decisions
- Multi-audience documentation (developers, users, stakeholders)
- Cultural adaptation for Kenyan context
- Living documentation with continuous updates
- Comprehensive implementation guides

## 5. Data Flow and Relationships

### Client ↔ Server Communication
The client module communicates with the server through REST APIs and WebSocket connections. The server provides authentication, data synchronization, and real-time updates while the client handles user interactions and offline capabilities.

### Server ↔ Database Interaction
The server uses the Drizzle module for all database operations, executing migrations defined in the drizzle module and accessing schemas from the shared module. Database connections are managed through connection pooling with monitoring and health checks.

### Shared Module Integration
All modules depend on the shared module for type definitions, validation schemas, and utility functions. The shared module ensures consistency across the entire platform while the drizzle module generates types from shared schemas.

### Infrastructure Dependencies
The scripts module automates operations across all modules, the tests module validates functionality, and the deployment module handles production delivery. The docs module provides guidance for development and operations.

### Development Workflow Integration
During development, the scripts module handles code quality, the tests module ensures reliability, and the docs module maintains knowledge. In production, the deployment module manages scaling while monitoring systems track performance.

## 6. Technology Stack

### Frontend (Client)
- **Framework**: React 18.3.1 with TypeScript 5.6.3
- **Build Tool**: Vite 5.4.15
- **Styling**: Tailwind CSS 3.4.14, Radix UI, Lucide React
- **State Management**: Redux Toolkit 2.10.1, React Query 5.81.5
- **Routing**: React Router DOM 7.7.0, Wouter 3.3.5
- **Forms**: React Hook Form 7.53.1 with Zod 3.23.8
- **Performance**: Web Vitals 5.1.0, DataDog RUM, Sentry
- **Testing**: Vitest 3.2.4, Testing Library, Playwright, Jest Axe
- **Development**: ESLint, Prettier, TypeScript

### Backend (Server)
- **Runtime**: Node.js with TypeScript 5.6.3
- **Framework**: Express 4.21.2
- **Database**: PostgreSQL 8.16.3 with Drizzle ORM 0.38.4
- **Real-time**: Socket.IO 4.8.1, WebSocket
- **Authentication**: Passport.js, JWT (jsonwebtoken), bcrypt
- **Security**: Helmet, CORS, Joi, Zod, DOMPurify
- **External APIs**: AWS SNS, Firebase Admin, OpenAI, Node-cron
- **Development**: Vitest, Supertest, Pino, Boom

### Database & Data
- **Primary Database**: PostgreSQL with pg 8.16.3
- **ORM**: Drizzle ORM 0.38.4 with Drizzle Kit 0.27.1
- **Caching**: Redis 5.9.0
- **Serverless**: Neon Serverless PostgreSQL

### Shared Infrastructure
- **Type Safety**: TypeScript 5.6.3 throughout
- **Validation**: Zod 3.23.8 schemas
- **Build**: TypeScript compilation
- **Testing**: Vitest framework

### DevOps & Deployment
- **Containerization**: Docker, Docker Compose
- **Orchestration**: Kubernetes
- **CI/CD**: GitHub Actions
- **Monitoring**: DataDog, Sentry
- **CDN**: Content delivery networks
- **Cloud**: AWS infrastructure

### Development Tools
- **Version Control**: Git with GitHub
- **Package Management**: pnpm
- **Code Quality**: ESLint, Prettier, Husky
- **Testing**: Vitest, Playwright, Jest
- **Documentation**: Markdown, GitHub

## 7. Key Features and Capabilities

### Civic Engagement Enablement
The architecture enables comprehensive civic participation by providing citizens with tools to understand and influence governance processes. Through transparent access to legislative data, community input mechanisms, and educational resources, the platform transforms passive citizens into active participants in democratic processes.

### Transparency and Accountability
Advanced analytics and visualization tools help citizens track legislative processes, identify stakeholder relationships, and monitor policy outcomes. This transparency serves as both accountability mechanism and educational tool, helping communities recognize how governance decisions affect different constituencies.

### Real-time Collaboration
WebSocket integration enables live discussions, real-time bill updates, and collaborative policy development. Citizens can engage in meaningful dialogue, share insights, and build coalitions around shared interests regardless of geographic location.

### AI-Powered Analysis
Machine learning capabilities provide constitutional analysis, argument intelligence, and recommendation engines that help citizens understand complex legal documents and policy implications. This democratizes access to expertise that was previously available only to professional political analysts.

### Accessibility and Inclusion
WCAG 2.1 AA compliance, multi-language support, and mobile-first design ensure that civic engagement tools are accessible to all citizens regardless of ability, language, or device. The platform actively works to reduce barriers that have historically excluded marginalized communities from political participation.

### Institutional Integration
APIs and multiple output formats enable integration with existing governmental systems, research institutions, and civil society organizations. This creates ecosystems of transparency that extend beyond the platform itself.

### Security and Privacy
Comprehensive security measures including input validation, rate limiting, encryption, and privacy compliance ensure that citizen data is protected while maintaining the transparency necessary for accountability.

## 8. Development Workflow

### Local Development
Developers work within the monorepo structure, using shared scripts for setup and maintenance. The client and server modules run concurrently with hot reloading, while the shared module ensures type consistency across all components.

### Code Quality Assurance
Automated scripts handle code formatting, linting, and type checking. The tests module runs comprehensive test suites, while accessibility and performance tests ensure quality standards are maintained.

### Database Development
Schema changes in the shared module trigger migration generation in the drizzle module. Scripts automate migration testing and rollback procedures, ensuring safe database evolution across environments.

### Integration and Testing
The tests module provides multi-level testing (unit, integration, e2e) that validates interactions between modules. CI/CD pipelines automate testing and deployment, with the deployment module handling environment-specific configurations.

### Deployment Pipeline
The deployment module orchestrates containerization, environment setup, and production deployment. Monitoring systems track performance and errors, with automated rollback capabilities for reliability.

### Documentation and Knowledge Management
The docs module maintains living documentation that evolves with the platform. Implementation guides, API references, and operational procedures ensure that knowledge is preserved and accessible to all team members.

### Continuous Improvement
Performance monitoring, user analytics, and research integration drive ongoing platform improvement. The architecture supports feature flags, A/B testing, and gradual rollouts to minimize risk during updates.

This comprehensive architecture enables the Chanuka platform to serve its mission of illuminating governance processes and enabling distributed citizen participation, creating systems that foster transparency, accountability, and community flourishing in alignment with kingdom purposes.