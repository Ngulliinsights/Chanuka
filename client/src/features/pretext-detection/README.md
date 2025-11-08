# Pretext Detector & Civic Remediation Suite - Technical Specification

## Overview
A transparent analytics and education module that identifies when legitimate public concerns are used as pretext for other agendas, while empowering citizens with practical legal knowledge and remediation tools.

## Core Architecture

### Data Pipeline
```
Parliamentary Data → Knowledge Graph → Analysis Engine → Citizen Interface
```

### Key Components

#### 1. Data Ingestion Service
- **Input Sources**: Parliamentary hansards, bill texts, procurement records, news feeds
- **Processing**: Entity extraction, relationship mapping, temporal event sequencing
- **Storage**: Graph database with audit trails

#### 2. Pretext Analysis Engine
- **Scoring Algorithm**: Composite score (0-100) based on:
  - Timing indicators (crisis→policy correlation)
  - Beneficiary mismatch analysis
  - Network centrality of actors
  - Legal scope creep detection
- **Explainability**: Each score includes human-readable rationale with source links

#### 3. Civic Remediation Interface
- **Pretext Watch Cards**: Timeline visualization with actionable insights
- **Know Your Rights**: Legal literacy modules (arrest, accident, small claims)
- **Action Toolbox**: FOI templates, petition generators, legal aid directory

## API Endpoints

### Analysis API
```typescript
GET /api/pretext/bills/{billId}/analysis
POST /api/pretext/analyze
GET /api/pretext/timeline/{eventId}
```

### Civic Tools API
```typescript
GET /api/civic/rights-cards
POST /api/civic/foi-request
GET /api/civic/legal-aid/{location}
```

## Data Models

### Pretext Score
```typescript
interface PretextScore {
  billId: string;
  score: number; // 0-100
  confidence: number;
  indicators: {
    timing: number;
    beneficiaryMismatch: number;
    scopeCreep: number;
    networkCentrality: number;
  };
  rationale: string[];
  sources: Source[];
  reviewStatus: 'pending' | 'verified' | 'disputed';
}
```

### Civic Action
```typescript
interface CivicAction {
  type: 'foi' | 'petition' | 'complaint';
  template: string;
  requiredFields: string[];
  localContacts: Contact[];
  estimatedTime: string;
}
```

## UI Components

### PretextWatchCard
- Score visualization with confidence intervals
- Timeline of events with source links
- Action buttons for civic engagement
- Share/report functionality

### RightsEducationModule
- Interactive cards for common legal scenarios
- Local contact integration
- Multi-language support (English/Swahili)

### ActionToolbox
- Template generators with pre-filled local data
- Progress tracking for submitted requests
- Community coordination features

## Implementation Phases

### Phase 1 (30 days) - MVP
- [ ] Basic data ingestion pipeline
- [ ] Simple scoring algorithm
- [ ] Single bill analysis demo
- [ ] Core UI components

### Phase 2 (60 days) - Enhanced Analysis
- [ ] Network analysis integration
- [ ] Multi-source data correlation
- [ ] User testing with local CSOs
- [ ] Editorial review workflow

### Phase 3 (90 days) - Full Platform
- [ ] Multi-language support
- [ ] Mobile optimization
- [ ] Community features
- [ ] API for researchers

## Ethical Safeguards

### Technical Measures
- All algorithms explainable and auditable
- Human review required before public flags
- Privacy-preserving data handling
- Open methodology publication

### Governance
- Independent oversight by academic partners
- Regular bias audits
- Community feedback mechanisms
- Legal review for high-impact claims

## Success Metrics
- **Precision**: >70% of flags verified as legitimate concerns
- **Engagement**: Civic action conversion rate >15%
- **Education**: Legal literacy improvement measurable via pre/post tests
- **Impact**: Documented policy changes from community pressure

## Integration Points
- Leverage existing `UserJourneyTracker` for engagement analytics
- Extend `bill-analysis` components for pretext scoring
- Use `performance-monitor` for system health tracking
- Build on `mobile-optimized-forms` for civic action templates