# Chanuka Platform Detailed Architecture

## Document Control
**Version:** 3.0
**Date:** December 3, 2025
**Phase:** Quality Assurance & Version Control

## Table of Contents

1. [Project Structure](#project-structure)
2. [Domain Architectures](#domain-architectures)
3. [Technical Implementation](#technical-implementation)
4. [Cross-Domain Data Flows](#cross-domain-data-flows)
5. [Implementation Priorities](#implementation-priorities)
6. [Enhanced Features](#enhanced-features)
7. [Infrastructure Components](#infrastructure-components)

## Project Structure

```
chanuka-platform/
├── client/                                    # Frontend application
│   ├── public/
│   │   ├── assets/
│   │   │   ├── images/
│   │   │   ├── audio/                        # Audio versions of key content
│   │   │   └── locales/                      # Multi-language resources
│   │   ├── manifest.json
│   │   ├── sw.js                             # Service worker for offline capability
│   │   └── offline.html
│   ├── src/
│   │   ├── components/
│   │   │   ├── accessibility/
│   │   │   │   ├── audio-content-player.tsx  # Plays audio versions of content
│   │   │   │   ├── literacy-level-adapter.tsx # Adjusts complexity by user literacy
│   │   │   │   └── accessibility-manager.tsx
│   │   │   ├── analysis/
│   │   │   │   ├── constitutional/
│   │   │   │   ├── argument-intelligence/
│   │   │   │   └── transparency/
│   │   │   ├── advocacy/
│   │   │   ├── ambassador/
│   │   │   ├── bills/
│   │   │   ├── community/
│   │   │   └── transparency/
│   │   ├── features/
│   │   │   ├── constitutional-analysis/
│   │   │   ├── argument-intelligence/
│   │   │   ├── advocacy/
│   │   │   ├── transparency-intelligence/    # NEW: Conflict visualization
│   │   │   ├── expert-verification/          # NEW: Expert credibility system
│   │   │   ├── real-time-engagement/         # NEW: Live metrics dashboard
│   │   │   ├── gamification/                 # NEW: Civic scoring system
│   │   │   ├── pretext-detection/            # NEW: Democratic safeguard alerts
│   │   │   ├── advanced-search/              # NEW: Multi-dimensional discovery
│   │   │   └── [existing features]
│   │   ├── i18n/                            # Full localization system
│   │   └── pages/
├── server/                                   # Backend application
│   ├── core/
│   │   ├── auth/
│   │   ├── constitutional/
│   │   ├── argumentation/
│   │   ├── advocacy/
│   │   └── [existing core modules]
│   ├── features/
│   │   ├── constitutional-analysis/
│   │   ├── argument-intelligence/
│   │   ├── universal-access/
│   │   ├── advocacy/
│   │   ├── institutional-integration/
│   │   ├── political-resilience/
│   │   ├── transparency-hub/                # NEW: Financial disclosure analysis
│   │   ├── expert-verification/             # NEW: Credential validation system
│   │   ├── pretext-detection/               # NEW: Pattern recognition engine
│   │   └── discovery-intelligence/          # NEW: Advanced search orchestration
│   ├── infrastructure/
│   │   ├── ai/
│   │   ├── nlp/
│   │   ├── knowledge-base/
│   │   ├── events/                          # NEW: Event-driven architecture
│   │   ├── websocket/                       # NEW: Real-time communication
│   │   └── [existing infrastructure]
├── shared/                                   # Shared code between client/server
│   ├── core/
│   │   ├── constitutional/
│   │   ├── argumentation/
│   │   ├── accessibility/
│   │   └── [existing shared code]
│   └── types/
├── ai-models/                               # AI model storage and config
├── knowledge-base/                          # Structured knowledge storage
├── ussd-gateway/                            # USSD service infrastructure
├── ambassador-tools/                        # Community ambassador toolkit
├── institutional-api/                       # API for institutional clients
├── resilience-infrastructure/               # Political resilience tools
├── evaluation-framework/                    # AI evaluation infrastructure
├── impact-measurement/                      # Impact tracking infrastructure
├── integration-tests/                       # Comprehensive integration tests
├── documentation/                           # Comprehensive documentation
├── deployment/                              # Deployment infrastructure
└── scripts/                                 # Utility scripts
```

## Domain Architectures

### DOMAIN 1: Constitutional Analysis Engine

**Purpose**: Helps citizens understand constitutional implications of legislation

**Research Foundation**: Addresses "veneer of neutrality" problem through grounding

**Core Flow**:
```
Bill Text → Provision Matcher (semantic embeddings)
        → Grounding Service (precedent connection)
        → Uncertainty Assessor (interpretive complexity)
        → Expert Flagging (human review when needed)
        → Citizen-Facing Display
```

**Key Components**:
- **Provision Matcher**: Uses semantic embeddings to identify relevant constitutional provisions
- **Grounding Service**: Connects every analysis to established legal precedent
- **Uncertainty Assessor**: Categorizes confidence levels explicitly
- **Expert Flagging**: Routes complex cases to verified constitutional lawyers

**Integration Points**:
- Feeds constitutional analysis into bill detail views
- Informs argument intelligence layer for validation
- Provides context for advocacy campaigns
- Delivers structured analysis through institutional API

### DOMAIN 2: Argument Intelligence Layer

**Purpose**: Transforms scattered citizen input into structured legislative impact

**Research Foundation**: Participation only matters when it produces outputs legislators cannot ignore

**Core Flow**:
```
Citizen Comments → Structure Extractor (identify claims/evidence/reasoning)
                → Clustering Service (find patterns across thousands)
                → Evidence Validator (assess claim quality)
                → Coalition Finder (identify potential alliances)
                → Brief Generator (create legislative summaries)
                → Power Balancer (ensure minority voice visibility)
```

**Key Components**:
- **Structure Extractor**: NLP model trained on informal argumentation patterns
- **Clustering Service**: Semantic similarity reveals patterns in diverse phrasing
- **Evidence Validator**: Checks claims against credible sources
- **Coalition Finder**: Identifies complementary concerns between groups
- **Brief Generator**: Creates parliamentary committee summaries
- **Power Balancer**: Evaluates quality not just volume

### DOMAIN 3: Universal Access Infrastructure

**Purpose**: Ensures platform reaches citizens regardless of connectivity, device, literacy, or language

**Research Foundation**: Platforms serving only privileged users reinforce power imbalances

**Core Components**:

**A. USSD Gateway (Zero-Data Access)**
- Works on any phone including basic feature phones
- Costs users nothing (uses signaling channel)
- 160-character screen limit requires careful formatting
- Stateless protocol requires session management
- Telco integrations for Safaricom, Airtel, Telkom

**B. Ambassador Program (Human Infrastructure)**
- Community ambassadors trained in facilitation
- Offline-capable mobile app for areas without connectivity
- Local storage + sync queue for disconnected operation
- Facilitation guides for community workshops

**C. Localization Pipeline (Cultural + Linguistic Adaptation)**
- Translation into Swahili, Kikuyu, Luo, Kamba
- Legal term glossaries ensure consistency
- Cultural adaptation adjusts examples to regional contexts
- Audio generation for limited literacy users
- Complexity adjustment based on user literacy level

### DOMAIN 4: Advocacy Coordination

**Purpose**: Transforms platform from information source to organizing tool

**Research Foundation**: Participation must connect to pathways for influence

**Core Flow**:
```
Constitutional Analysis + Argument Intelligence + Citizen Concern
  → Campaign Dashboard (discover/join campaigns)
  → Action Coordinator (concrete steps: contact reps, attend hearings)
  → Coalition Builder (connect citizens with complementary concerns)
  → Impact Tracker (document outcomes, show participation matters)
  → Representative Contact Tool (everything needed for effective outreach)
```

### DOMAIN 5: Institutional Integration

**Purpose**: Serve institutional users while maintaining citizen-facing platform as free

**Core Components**:
- **API Gateway**: Structured access with authentication and rate limiting
- **Committee Adapters**: Format data for specific parliamentary committees
- **Format Adapters**: Export in formats institutions use (PDF, Word, Excel)
- **Subscription Model**: Creates sustainable funding while keeping citizen access free

### DOMAIN 6: Political Resilience Infrastructure

**Purpose**: Protect platform from political suppression attempts

**Core Components**:
- **Threat Monitoring**: Scans media for hostile rhetoric, tracks legislation
- **Distributed Backup**: Encrypted backups across multiple jurisdictions
- **Legal Defense**: Relationships with freedom of information law firms
- **Rapid Response**: Coordinates immediate action when threats emerge

### DOMAIN 7: AI Infrastructure & Evaluation

**Purpose**: Ensure AI components maintain quality, avoid bias, operate transparently

**Core Components**:
- **Model Storage**: All trained models with configurations and documentation
- **Evaluation Framework**: Continuous testing against Legal-GLUE benchmarks
- **Bias Detection**: Monitors for political, demographic, and fairness bias
- **Explainability Tools**: Attention visualization, reasoning traces, uncertainty quantification

### DOMAIN 8: Impact Measurement

**Purpose**: Rigorously evaluate whether platform achieves democratic goals

**Core Components**:
- **Participation Tracker**: Monitors demographics, geography, literacy levels
- **Advocacy Tracker**: Follows campaigns from initiation through outcomes
- **Legislative Outcome Tracker**: Records amendments and votes
- **Attribution Engine**: Assesses causal links between engagement and outcomes

## Enhanced Features (Architecture 2.0)

### DOMAIN 9: Transparency Intelligence Hub

**New Components**:
- **Financial Disclosure Analysis**: Conflict detection and network analysis
- **Sponsor Analysis**: Voting patterns, industry alignment, disclosure completeness
- **Workaround Tracking**: Alternative implementation monitoring
- **Visualization**: Network graphs, timeline views, impact mapping

### DOMAIN 10: Expert Verification System

**New Components**:
- **Credential Validation**: Expert status verification
- **Credibility Scoring**: Dynamic reputation system
- **Peer Review Coordination**: Expert consensus tracking
- **Fraud Detection**: Automated verification of expert claims

### DOMAIN 11: Pretext Detection System

**New Components**:
- **Pattern Recognition**: Historical pretext pattern matching
- **Bill Similarity Detection**: Identifies concerning legislative patterns
- **Risk Assessment**: Democratic safeguard evaluation
- **Civic Action Tools**: Remediation guides and community alerts

### DOMAIN 12: Discovery Intelligence

**New Components**:
- **Advanced Search**: Multi-dimensional filtering and smart suggestions
- **Semantic Search**: Intent classification and relevance prediction
- **Connection Finding**: Relationship discovery across legislation
- **Trend Detection**: Controversy level analysis and impact prediction

## Technical Implementation

### Client Architecture (Enhanced)

**Progressive Disclosure System**:
- Complexity analyzer adapts content based on user literacy
- Reading path navigation guides users through complex topics
- Mobile optimization with gesture navigation and bottom sheets

**Real-time Engagement**:
- WebSocket connections for live metrics
- Live dashboards showing community pulse and sentiment
- Activity feeds and participation tracking

**Gamification Engine**:
- Civic scoring system with achievement tracking
- Leaderboards and progress visualization
- Reward notifications and badge systems

### Server Architecture (Enhanced)

**Event-Driven Infrastructure**:
- Kafka event bus for inter-service communication
- Event handlers for analytics, notifications, and gamification
- Streaming pipelines for real-time metrics aggregation

**AI Integration**:
- Constitutional conflict detection models
- Argument sentiment analysis
- Transparency scoring and network analysis
- Pretext pattern recognition

**Infrastructure Enhancements**:
- WebSocket server for real-time features
- Enhanced caching with warming and invalidation
- AI middleware for request processing

### Shared Architecture

**Credibility Framework**:
- Context-aware credibility calculation
- Progressive disclosure utilities
- Accessibility adapters for different user needs

**Schema Extensions**:
- Transparency intelligence schemas
- Expert verification data models
- Pretext detection patterns
- Discovery intelligence metadata

## Cross-Domain Data Flows

### Example: Bill Introduction to Legislative Outcome

1. **New bill enters Parliament**
2. **Constitutional Analysis Engine** analyzes for rights implications
3. **Analysis reaches citizens** through multiple pathways (web, USSD, ambassadors, localization)
4. **Citizens respond** with comments and concerns
5. **Argument Intelligence Layer** processes input
6. **Advocacy Coordination** activates campaigns
7. **Institutional Integration** delivers to legislative staff
8. **Legislative staff engage** with structured input
9. **Bill amended** in response to citizen concerns
10. **Impact Measurement** tracks outcome and provides feedback

## Implementation Priorities & Rationale

### PRIORITY 1: Constitutional Analysis Engine
**Rationale**: Provides immediate high-value functionality that differentiates Chanuka from simple legislative tracking.

**Minimum Viable Implementation**:
- Bill text analysis against Bill of Rights provisions
- Basic precedent matching from Supreme Court database
- Simple uncertainty indicators (clear/uncertain/complex)
- Manual expert review workflow

### PRIORITY 2: Argument Intelligence Layer
**Rationale**: Transforms participation from expression to influence.

**Minimum Viable Implementation**:
- Basic claim extraction from comments
- Simple clustering by keyword similarity
- Manual brief generation with extracted arguments

### PRIORITY 3: Universal Access - USSD Gateway
**Rationale**: Addresses fundamental equity issue.

**Minimum Viable Implementation**:
- Basic USSD menu structure (voting records, bill alerts, rep info)
- Single telco integration (e.g., Safaricom)
- Text formatting for 160-character constraint

### PRIORITY 4: Advocacy Coordination
**Rationale**: Connects information to action.

### PRIORITY 5-8: Remaining Core Domains
**Maintained functionality with enhanced features**

### PRIORITY 9-12: Enhanced Features
**Transparency, Expert Verification, Pretext Detection, Discovery Intelligence**

## Technical Stack & Dependencies

### Client:
- React + TypeScript for type safety
- Tailwind CSS for responsive design
- Service workers for offline capability
- i18next for internationalization

### Server:
- Node.js + TypeScript
- Clean architecture (domain-driven design)
- PostgreSQL for relational data
- Vector database for semantic search (embeddings)

### AI/NLP:
- Hugging Face Transformers for NLP models
- Sentence-transformers for embeddings
- Custom fine-tuned models for legal domain
- LangChain for LLM orchestration

### USSD:
- Africa's Talking or AT&T USSD gateway
- Redis for session management
- SMS fallback for notifications

### Ambassador Tools:
- React Native for cross-platform mobile
- SQLite for offline storage
- Background sync for disconnected operation

### Infrastructure:
- Kubernetes for orchestration
- Docker for containerization
- Multi-region deployment for resilience
- Encrypted backup to multiple jurisdictions

## Key Architectural Principles

1. **EXPLICIT UNCERTAINTY**: AI components acknowledge limitations rather than hiding behind confident prose. Uncertainty indicators visible to users. Complex cases flagged for human expertise.

2. **GROUNDING IN PRECEDENT**: Constitutional analysis always connects to established legal frameworks. No interpretations generated without citing existing precedent, court cases, scholarly work.

3. **POWER BALANCING**: Automated systems actively work against amplifying existing power imbalances. Marginalized voices flagged even when numerically smaller. Coordinated lobbying identified and labeled.

4. **UNIVERSAL ACCESS**: Platform meets citizens where they are rather than requiring them to come to the technology. USSD for zero-data access, ambassadors for facilitation, localization for language/culture, audio for limited literacy.

5. **PARTICIPATION → INFLUENCE**: Architecture transforms scattered input into structured outputs legislators cannot ignore. Argument intelligence creates legislative briefs. Advocacy tools coordinate collective action. Impact tracking proves participation produces results.

6. **INSTITUTIONAL INTEGRATION**: Platform doesn't operate outside existing systems but integrates into legislative workflows. API for staff use, committee-specific formatting, export in formats institutions actually use.

7. **POLITICAL RESILIENCE**: Built-in protections against suppression. Distributed backups across jurisdictions, legal defense relationships, rapid response capability, threat monitoring and early warning.

8. **RIGOROUS EVALUATION**: Continuous testing against benchmarks, bias detection, explainability tools, impact measurement. Claims of democratic effectiveness backed by data not assumptions.

## Infrastructure Components

### AI Models & Knowledge Base
- Constitutional provision matcher and precedent finder
- Argument extraction and evidence evaluation models
- Transparency detection and network analysis models
- Pretext pattern recognition and risk prediction models
- Semantic search and intent classification models

### Deployment Infrastructure
- Kubernetes deployments for each domain service
- Multi-region backup infrastructure
- Monitoring dashboards for system health and AI performance
- Alert systems for performance, security, and integrity issues

### Evaluation Framework
- Legal-GLUE benchmark runner
- Constitutional reasoning test scenarios
- Bias detection for political and demographic factors
- Explainability testing for reasoning coherence and citation accuracy

This architecture represents Chanuka: A comprehensive sociotechnical system designed to transform democratic participation in Kenya through research-grounded architecture that actively challenges rather than reinforces existing power inequalities.