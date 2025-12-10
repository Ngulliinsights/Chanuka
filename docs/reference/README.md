# Chanuka Platform Documentation

## Document Control
**Version:** 3.0
**Date:** December 3, 2025
**Phase:** Quality Assurance & Version Control

## System Overview

Chanuka is a comprehensive sociotechnical system designed to transform democratic participation in Kenya through research-grounded architecture that actively challenges rather than reinforces existing power inequalities.

The platform serves as a bridge between citizens and legislative processes, providing tools for constitutional analysis, argument intelligence, advocacy coordination, and universal access to ensure marginalized voices are amplified rather than silenced.

## Core Mission

To create a platform where:

- **Participation transforms into influence** through structured argument processing
- **Universal access** reaches citizens regardless of connectivity, literacy, or language
- **Constitutional analysis** grounds legislation in established legal frameworks
- **Advocacy coordination** connects information to actionable campaigns
- **Institutional integration** serves legislative staff while keeping citizen access free
- **Political resilience** protects the platform from suppression attempts

## System Architecture

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

## Key Domains

### 1. Constitutional Analysis Engine

Helps citizens understand constitutional implications of legislation through AI-powered analysis grounded in legal precedent.

### 2. Argument Intelligence Layer

Transforms scattered citizen input into structured legislative impact by extracting claims, validating evidence, and identifying coalitions.

### 3. Universal Access Infrastructure

Ensures platform reaches citizens regardless of connectivity via USSD, ambassadors, and localization.

### 4. Advocacy Coordination

Converts information into action through campaign management, coalition building, and impact tracking.

### 5. Institutional Integration

Serves legislative staff and researchers through APIs while maintaining free citizen access.

### 6. Political Resilience Infrastructure

Protects platform from suppression through distributed backups, legal defense, and rapid response.

### 7. AI Infrastructure & Evaluation

Ensures AI components maintain quality, avoid bias, and operate transparently with rigorous evaluation.

### 8. Impact Measurement

Rigorously evaluates whether platform achieves democratic goals through participation tracking and outcome attribution.

## Technology Stack

### Frontend (Client)

- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS + Radix UI
- **State Management**: Redux Toolkit + React Query
- **Routing**: React Router
- **Testing**: Vitest + Testing Library

### Backend (Server)

- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: JWT + Passport
- **Real-time**: Socket.IO
- **Testing**: Vitest + Supertest

### AI/NLP Infrastructure

- Hugging Face Transformers for NLP models
- Sentence-transformers for embeddings
- Custom fine-tuned models for legal domain
- LangChain for LLM orchestration

### Universal Access

- Africa's Talking or AT&T USSD gateway
- React Native for mobile ambassador tools
- Multi-language localization pipeline

## Data Flow

1. **Client Request** → React component makes API call
2. **API Gateway** → Express router handles request
3. **Business Logic** → Service layer processes request
4. **Database** → Drizzle ORM queries PostgreSQL
5. **Response** → Data flows back through layers
6. **UI Update** → React Query updates component state

## Key Architectural Principles

1. **Explicit Uncertainty**: AI components acknowledge limitations rather than hiding complexity
2. **Grounding in Precedent**: Constitutional analysis always connects to established legal frameworks
3. **Power Balancing**: Systems actively work against amplifying existing power imbalances
4. **Universal Access**: Platform meets citizens where they are, not requiring them to come to technology
5. **Participation → Influence**: Architecture transforms scattered input into structured outputs legislators cannot ignore
6. **Institutional Integration**: Platform integrates into existing legislative workflows
7. **Political Resilience**: Built-in protections against suppression with distributed backups and legal defense
8. **Rigorous Evaluation**: Continuous testing against benchmarks with bias detection and explainability tools

## Security & Performance

- **Authentication**: JWT tokens with refresh mechanism
- **Authorization**: Role-based access control
- **Input Validation**: Zod schemas on all inputs
- **SQL Injection Prevention**: Drizzle ORM
- **XSS Protection**: Content Security Policy headers
- **Caching**: Redis for session and API caching
- **Monitoring**: Structured logging with Pino, performance monitoring, health checks

## 📋 Documentation Index

### Architecture & Design

- [Detailed Architecture](../active/detailed-architecture.md) - High-level system architecture
- [Infrastructure Guide](../active/infrastructure-guide.md) - Database schemas, infrastructure setup, and operational procedures
- [Chanuka Design Specifications](chanuka/chanuka_design_specifications.md) - Detailed UI/UX design specifications and component architecture

### Implementation Guides

- [Chanuka Implementation Guide](chanuka/chanuka_implementation_guide.md) - Complete implementation approach with code examples and testing requirements
- [Platform Consolidation Implementation Tasks](chanuka/%23%20Chanuka%20Platform%20Consolidation%20Impleme.md) - Detailed consolidation implementation tasks and phases
- [API Strategy Document](chanuka/api_strategy_doc.md) - Multi-API strategy and implementation guidance
- [Automation Strategy](chanuka/chanuka_automation_strategy.md) - Platform automation approach

### Project Documentation

- [Requirements](chanuka/chanuka_requirements.txt) - Platform requirements and specifications
- [Web Application Copy](chanuka/chanuka_webapp_copy.md) - Platform messaging and content

### Branding & Communication

- [Complete Slogans](chanuka/chanuka_complete_slogans.md) - Platform slogans and messaging
- [Philosophical Connections](chanuka/philosophical_connections_analysis.md) - Philosophical foundation analysis
- [Scriptural Distributed Leadership](chanuka/Scriptural%20Distributed%20Leadership.md) - Biblical foundations for distributed leadership model
- [Strategic Additions Poems](chanuka/strategic_additions_poems.md) - Creative content for platform

### Prototypes & Mockups

- [Community Input Prototype](chanuka/community-input_1751743369833.html) - Community engagement interface
- [Dashboard Prototype](chanuka/dashboard_1751743369900.html) - Main dashboard interface
- [Expert Verification Prototype](chanuka/expert-verification_1751743369833.html) - Expert verification system
- [Bill Sponsorship Analysis](chanuka/merged_bill_sponsorship.html) - Sponsorship analysis interface
- [Sponsor Analysis](chanuka/sponsorbyreal.html) - Real sponsor analysis tool

### Strategic Analysis

- [Sustainable Uprising](chanuka/sustainable_uprising.md) - Long-term sustainability analysis
- [Global Implications](chanuka/global_implications.md) - International impact assessment
- [Strategic UI Features Analysis](chanuka/strategic-ui-features-analysis.md) - Analysis of missing strategic features
- [Missing Strategic Features Analysis](chanuka/missing-strategic-features-analysis.md) - Gap analysis and implementation priorities
- [Client Platform Improvement Recommendations](chanuka/chanuka_platform_client_improvement_recommendations.md) - Client-side enhancement recommendations

## 🏗️ Architecture Overview

The Chanuka platform is built on a comprehensive architecture that includes:

- **Client Application**: React-based frontend with progressive disclosure and accessibility features
- **Server Application**: Domain-driven backend with 12 specialized domains
- **Shared Code**: Common utilities and type definitions
- **AI Models & Knowledge Base**: Constitutional and legal analysis capabilities
- **Deployment & Infrastructure**: Kubernetes-based scalable deployment

## 🚀 Key Features

- Constitutional analysis and legal precedent matching
- Real-time engagement analytics and community features
- Expert verification and credibility scoring
- Transparency intelligence and conflict detection
- Pretext detection for democratic protection
- Universal access through USSD and ambassador programs

## Getting Started

For detailed technical implementation, see the [Chanuka Implementation Guide](chanuka/chanuka_implementation_guide.md).

For database schemas, infrastructure setup, and operational procedures, see the [Infrastructure Guide](../active/infrastructure-guide.md).
