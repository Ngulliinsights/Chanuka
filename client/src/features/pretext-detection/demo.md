# Pretext Detection & Civic Remediation Suite - Demo

## Quick Start

The Pretext Detection system is now integrated into your bill detail pages. Here's how it works:

### 1. Navigate to any bill detail page
```
http://localhost:3000/bill-detail/BILL-2024-001
```

### 2. The system will show:
- **Initial state**: "Start Analysis" button
- **Loading state**: "Analyzing bill for pretext indicators..."
- **Results**: Pretext Watch Card with score and civic actions

### 3. Example Analysis Results

For a bill with potential pretext indicators, you'll see:

```
┌─ Pretext Watch ─────────────────────────────┐
│ High Risk                            78/100 │
│                                             │
│ Why flagged:                                │
│ • Bill introduced 3 days after crisis      │
│ • Major contractor linked to sponsor       │
│ • Broad emergency powers beyond scope      │
│                                             │
│ [View Details] [Take Action] [Report Issue] │
└─────────────────────────────────────────────┘
```

### 4. Civic Action Toolbox

Users can then:
- **File FOI requests** with pre-filled templates
- **Submit petitions** for public hearings
- **Report ethics violations** to authorities
- **Access "Know Your Rights"** cards for legal scenarios

## Sample Data

The system currently uses mock data that demonstrates:

### Timing Indicators
- Crisis events → Policy responses
- Rapid legislative introductions
- Emergency law patterns

### Beneficiary Analysis
- Sponsor-contractor connections
- Procurement award timing
- Financial interest mapping

### Scope Creep Detection
- Broad language analysis
- Powers beyond stated purpose
- Amendment pattern analysis

### Network Analysis
- Actor connection density
- Financial relationship mapping
- Influence pattern detection

## Ethical Safeguards

Every analysis includes:
- **Source transparency**: All claims link to primary sources
- **Human review**: High-risk flags require editorial verification
- **Explainable scoring**: Clear rationale for each indicator
- **Non-partisan approach**: Methodology published openly

## Next Steps

To make this production-ready:

1. **Connect real data sources**:
   - Parliamentary hansard API
   - Procurement databases
   - News feed integration
   - Court records access

2. **Implement editorial workflow**:
   - Review queue for high-risk flags
   - Verification process with local CSOs
   - Legal review for public claims

3. **Add multilingual support**:
   - Swahili translations
   - Local language civic guides
   - Cultural context adaptation

4. **Mobile optimization**:
   - USSD access for feature phones
   - Offline civic action templates
   - SMS-based alerts

## Technical Architecture

```
Data Sources → Analysis Engine → Civic Interface
     ↓              ↓               ↓
Parliamentary   Pretext Score   Action Toolbox
News Feeds      Explainability  Rights Education
Procurement     Human Review    Community Tools
Court Records   Audit Trail     Legal Aid Directory
```

The system is designed to be:
- **Transparent**: All methodology published
- **Auditable**: Complete source tracking
- **Actionable**: Immediate civic remediation tools
- **Educational**: Legal literacy for citizens
- **Safe**: Privacy-preserving and non-partisan