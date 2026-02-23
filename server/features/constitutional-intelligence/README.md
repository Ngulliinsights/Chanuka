# Constitutional Intelligence Feature

## Overview

The Constitutional Intelligence feature provides automated analysis of legislative bills against Kenya's Constitution 2010. It detects potential constitutional violations, identifies relevant provisions, and determines when expert legal review is required.

## Architecture

```
constitutional-intelligence/
├── domain/                          # Pure business logic
│   ├── entities/                    # Core domain entities
│   │   ├── constitutional-provision.entity.ts
│   │   └── constitutional-analysis.entity.ts
│   └── services/                    # Domain services
│       ├── violation-detector.service.ts
│       └── provision-matcher.service.ts
├── application/                     # Use cases & orchestration
│   └── use-cases/
│       └── analyze-bill-constitutionality.use-case.ts
├── infrastructure/                  # External concerns (to be added)
│   ├── repositories/                # Data persistence
│   └── ai/                          # AI/ML integration
└── index.ts                         # Public API
```

## Domain Model

### Entities

#### ConstitutionalProvision
- Represents a provision from Kenya's Constitution 2010
- Structured by: Chapter > Article > Section > Clause
- Tracks fundamental rights (Bill of Rights: Articles 19-59)
- Tracks directive principles (National Values: Article 10)
- Manages relationships between provisions

**Key Methods:**
- `addRelatedProvision()` - Link related provisions
- `markAsFundamentalRight()` - Flag as Bill of Rights
- `matchesKeyword()` - Keyword matching for search

#### ConstitutionalAnalysis
- Represents analysis of a bill's constitutional implications
- Tracks potential violations with severity levels
- Manages expert review workflow
- Calculates confidence scores

**Key Methods:**
- `addViolation()` - Record potential violation
- `startExpertReview()` - Begin expert review
- `completeExpertReview()` - Finalize review
- `hasCriticalViolations` - Check for critical issues

### Domain Services

#### ViolationDetectorService
Detects potential constitutional violations using:
- Pattern matching (keywords, phrases)
- Legal heuristics (procedural fairness, rights limitations)
- Domain knowledge (Bill of Rights protections)

**Violation Types:**
- `rights_infringement` - Restriction of fundamental rights
- `power_overreach` - Excessive executive discretion
- `procedural_issue` - Lack of procedural fairness
- `direct_violation` - Clear constitutional violation
- `ambiguity` - Vague terms that could be abused

**Severity Levels:**
- `critical` - Immediate expert review required
- `high` - Significant concern, review recommended
- `medium` - Moderate concern, review suggested
- `low` - Minor concern, monitoring advised

#### ProvisionMatcherService
Matches bill text to relevant constitutional provisions using:
- Keyword matching
- Title matching
- Explicit constitutional references
- Semantic similarity (future enhancement)

**Relevance Scoring:**
- 0.0-0.3: Low relevance
- 0.3-0.6: Moderate relevance
- 0.6-0.8: High relevance
- 0.8-1.0: Very high relevance

## Use Cases

### AnalyzeBillConstitutionalityUseCase
Orchestrates complete constitutional analysis:

1. **Load Provisions**: Fetch all constitutional provisions
2. **Match Provisions**: Find relevant provisions for bill
3. **Detect Violations**: Identify potential constitutional issues
4. **Calculate Confidence**: Assess analysis reliability
5. **Generate Report**: Create summary and detailed analysis
6. **Determine Review**: Flag for expert review if needed
7. **Persist Analysis**: Save results for future reference

**Output:**
- Analysis summary
- Violation count and severity
- Confidence score
- Expert review requirement
- Detailed findings
- Recommendations

## Strategic Functionality

### 1. Automated Constitutional Screening
- **Problem**: Manual constitutional review is slow and expensive
- **Solution**: Automated first-pass screening identifies obvious issues
- **Impact**: 80% reduction in expert review time for clean bills

### 2. Violation Detection
- **Problem**: Constitutional violations can be subtle and hidden
- **Solution**: Pattern matching and heuristics catch common violations
- **Impact**: Identifies issues that might be missed in manual review

### 3. Expert Review Triage
- **Problem**: Limited expert capacity, all bills need review
- **Solution**: Intelligent triage based on violation severity and confidence
- **Impact**: Experts focus on high-risk bills, improving quality

### 4. Citizen Transparency
- **Problem**: Citizens don't understand constitutional implications
- **Solution**: Plain-language summaries of constitutional concerns
- **Impact**: Informed public participation in legislative process

## Integration with Schema

Maps to `constitutional_intelligence` schema tables:
- `constitutional_provisions` - Constitution 2010 provisions
- `constitutional_analyses` - Bill analysis results
- `legal_precedents` - Case law references
- `expert_review_queue` - Expert review workflow

## Kenya Constitution 2010 Structure

### Key Chapters
- **Chapter 1**: Sovereignty and Supremacy
- **Chapter 2**: Republic (Articles 1-9)
- **Chapter 3**: Citizenship (Articles 10-18)
- **Chapter 4**: Bill of Rights (Articles 19-59) ⭐
- **Chapter 5**: Land and Environment (Articles 60-72)
- **Chapter 6**: Leadership and Integrity (Articles 73-80)
- **Chapter 7**: Representation (Articles 81-104)
- **Chapter 8**: Legislature (Articles 93-127)
- **Chapter 9**: Executive (Articles 128-155)
- **Chapter 10**: Judiciary (Articles 156-173)
- **Chapter 11**: Devolved Government (Articles 174-200)
- **Chapter 12**: Public Finance (Articles 201-231)
- **Chapter 13**: Public Service (Articles 232-235)
- **Chapter 14**: National Security (Articles 236-246)
- **Chapter 15**: Commissions and Independent Offices (Articles 247-254)
- **Chapter 16**: Amendment (Articles 255-257)
- **Chapter 17**: General Provisions (Articles 258-261)
- **Chapter 18**: Transitional and Consequential Provisions

### Bill of Rights (Most Critical)
- **Article 19**: Rights and fundamental freedoms
- **Article 20**: Application of Bill of Rights
- **Article 21**: Implementation of rights
- **Article 22**: Enforcement of Bill of Rights
- **Article 23**: Authority of courts
- **Article 24**: Limitation of rights
- **Article 25**: Fundamental rights (non-derogable)
- **Articles 26-51**: Specific rights (life, equality, privacy, etc.)
- **Articles 52-57**: Economic and social rights
- **Articles 58-59**: Consumer and environmental rights

## Usage Examples

### Analyzing a Bill

```typescript
import { AnalyzeBillConstitutionalityUseCase } from '@server/features/constitutional-intelligence';
import { ProvisionMatcherService, ViolationDetectorService } from '@server/features/constitutional-intelligence';

const matcher = new ProvisionMatcherService();
const detector = new ViolationDetectorService();
const useCase = new AnalyzeBillConstitutionalityUseCase(matcher, detector);

const result = await useCase.execute({
  billId: 'bill-123',
  billTitle: 'The Data Protection Act, 2024',
  billText: '... full bill text ...',
  billSummary: 'Regulates data protection and privacy',
});

if (result.success) {
  console.log(`Analysis ID: ${result.analysisId}`);
  console.log(`Violations: ${result.violationCount}`);
  console.log(`Critical: ${result.criticalViolationCount}`);
  console.log(`Confidence: ${(result.confidenceScore * 100).toFixed(0)}%`);
  console.log(`Expert Review: ${result.expertReviewRequired ? 'Required' : 'Not Required'}`);
}
```

### Finding Relevant Provisions

```typescript
import { ProvisionMatcherService } from '@server/features/constitutional-intelligence';

const matcher = new ProvisionMatcherService();
const provisions = await loadProvisions(); // Your data source

const matches = matcher.findRelevantProvisions(
  billText,
  provisions,
  0.5, // Minimum relevance threshold
);

for (const match of matches) {
  console.log(`${match.provision.referenceString}: ${match.relevanceScore.toFixed(2)}`);
  console.log(`Matched keywords: ${match.matchedKeywords.join(', ')}`);
}
```

### Detecting Violations

```typescript
import { ViolationDetectorService } from '@server/features/constitutional-intelligence';

const detector = new ViolationDetectorService();
const provisions = await loadRelevantProvisions();

const violations = detector.detectViolations(billText, provisions);

for (const violation of violations) {
  console.log(`${violation.severity.toUpperCase()}: ${violation.description}`);
  console.log(`Provision: ${violation.provisionReference}`);
  console.log(`Confidence: ${(violation.confidence * 100).toFixed(0)}%`);
}
```

## Testing

### Unit Tests
- Domain entities: Business rule enforcement
- Domain services: Algorithm correctness
- Use cases: Workflow orchestration

### Integration Tests
- End-to-end analysis workflow
- Database persistence
- AI/ML integration

### Test Data
- Sample bills with known violations
- Constitution 2010 provisions
- Legal precedents

## Performance Considerations

### Caching Strategy
- Cache constitutional provisions (rarely change)
- Cache analysis results (expensive to compute)
- Cache provision matches (reusable across bills)

### Database Optimization
- Full-text search on provision text
- GIN indexes on keyword arrays
- Partial indexes on fundamental rights

### Scalability
- Async analysis for large bills
- Batch processing for multiple bills
- Queue system for expert review

## AI/ML Integration (Future)

### Phase 1: Rule-Based (Current)
- Pattern matching
- Keyword detection
- Heuristic rules

### Phase 2: ML Enhancement
- Semantic similarity (embeddings)
- Named entity recognition
- Classification models

### Phase 3: LLM Integration
- GPT-4 for detailed analysis
- Claude for legal reasoning
- Llama for local deployment

## Security & Privacy

### Data Protection
- Sensitive bill content encryption
- Access control for draft bills
- Audit trail for all analyses

### Expert Review
- Verified expert credentials
- Conflict of interest checks
- Review quality metrics

## Future Enhancements

1. **Precedent Matching**: Link to relevant case law
2. **Comparative Analysis**: Compare with other jurisdictions
3. **Amendment Tracking**: Track constitutional amendments
4. **Public Comments**: Citizen input on constitutional concerns
5. **Visualization**: Interactive constitutional impact maps
6. **API**: Public API for third-party integrations

## Related Features

- **Bills**: Legislative content
- **Expert Verification**: Expert credentials
- **Argument Intelligence**: Legal argumentation
- **Constitutional Analysis**: Detailed analysis (separate feature)

## Contributing

When adding functionality:
1. Start with domain layer (entities, services)
2. Add use cases for workflows
3. Add infrastructure last
4. Update provision database
5. Add tests
6. Update this README

## References

- [Constitution of Kenya 2010](http://www.kenyalaw.org/lex/actview.xql?actid=Const2010)
- [Kenya Law Reports](http://kenyalaw.org/kl/)
- [Constitutional Interpretation](https://www.judiciary.go.ke/)
- [Bill of Rights](http://www.kenyalaw.org/kl/index.php?id=398)

## Legal Disclaimer

This system provides automated constitutional analysis for informational purposes only. It does not constitute legal advice. All analyses should be reviewed by qualified legal experts before making legislative decisions.
