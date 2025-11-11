# Educational Framework

The Educational Framework provides comprehensive contextual education for legislative content, making complex legal and procedural information accessible to all users.

## Overview

The Educational Framework implements **Task 12: Contextual Educational Framework** from the Chanuka Client UI Upgrade specification. It addresses the requirement for plain language summaries, constitutional context integration, historical precedent references, civic action guidance, process education, and educational tooltips.

## Components

### 1. EducationalFramework
The main component that orchestrates all educational features in a tabbed interface.

**Features:**
- Tabbed navigation between different educational aspects
- Integrated overview with statistics
- Interactive help demonstrations
- Quick access to learning resources

**Usage:**
```tsx
import { EducationalFramework } from '../education/EducationalFramework';

<EducationalFramework bill={bill} />
```

### 2. PlainLanguageSummary
Converts complex legal content into accessible language with impact analysis.

**Features:**
- Section-by-section breakdown of legal text
- Plain language translations
- Impact analysis (who, what, when, cost)
- Complexity and importance indicators
- Toggle between plain language and original legal text

**Usage:**
```tsx
import { PlainLanguageSummary } from '../education/PlainLanguageSummary';

<PlainLanguageSummary
  billId="1"
  billTitle="Healthcare Access Reform Act"
  sections={plainLanguageSections}
/>
```

### 3. ConstitutionalContext
Integrates constitutional provisions with bill content to show legal basis and potential conflicts.

**Features:**
- Constitutional article references
- Impact analysis (supports/conflicts/neutral/unclear)
- Relevance indicators (direct/indirect/contextual)
- Constitutional concerns and precedents
- Article filtering and highlighting

**Usage:**
```tsx
import { ConstitutionalContext } from '../education/ConstitutionalContext';

<ConstitutionalContext
  billId="1"
  billTitle="Healthcare Access Reform Act"
  provisions={constitutionalProvisions}
/>
```

### 4. HistoricalPrecedents
Shows similar legislation outcomes and lessons learned from historical patterns.

**Features:**
- Similar legislation analysis
- Outcome tracking (passed/failed/amended/withdrawn)
- Public support trends
- Constitutional challenges
- Success factors and common pitfalls
- Timeline analysis

**Usage:**
```tsx
import { HistoricalPrecedents } from '../education/HistoricalPrecedents';

<HistoricalPrecedents
  billId="1"
  billTitle="Healthcare Access Reform Act"
  precedents={historicalPrecedents}
/>
```

### 5. ProcessEducation
Explains legislative procedures and timelines with participation opportunities.

**Features:**
- Step-by-step legislative process
- Progress tracking
- Public participation opportunities
- Committee information
- Key deadlines and timeline
- Educational resources

**Usage:**
```tsx
import { ProcessEducation } from '../education/ProcessEducation';

<ProcessEducation
  billId="1"
  billTitle="Healthcare Access Reform Act"
  currentStep="second-reading"
  steps={legislativeSteps}
  committees={committees}
  timeline={timeline}
/>
```

### 6. EducationalTooltip
Provides contextual help and definitions throughout the interface.

**Features:**
- Term definitions with context
- Examples and related terms
- Context-specific styling (legal/procedural/constitutional/civic)
- Learn more links
- Accessible tooltip implementation

**Usage:**
```tsx
import { EducationalTooltip } from '../education/EducationalTooltip';

<EducationalTooltip
  term="Constitutional Review"
  definition="The process of examining whether laws comply with the constitution"
  context="constitutional"
  examples={["Judicial review of new legislation"]}
  relatedTerms={["Judicial Review", "Constitutional Court"]}
>
  <span className="text-blue-600 underline decoration-dotted">
    constitutional review
  </span>
</EducationalTooltip>
```

## Predefined Tooltips

The framework includes several predefined tooltips for common terms:

- `LegalTermTooltip` - For legal precedents and case law
- `ConstitutionalTermTooltip` - For constitutional review concepts
- `ProceduralTermTooltip` - For legislative procedures
- `CivicTermTooltip` - For civic engagement concepts

## Integration

### BillAnalysisTab Integration
The Educational Framework is integrated into the BillAnalysisTab as a new "Learn" tab:

```tsx
<TabsTrigger value="education" className="text-xs lg:text-sm">
  <Lightbulb className="h-4 w-4 mr-1 lg:mr-2" />
  Learn
</TabsTrigger>

<TabsContent value="education" className="space-y-6">
  <EducationalFramework bill={bill} />
</TabsContent>
```

### Tooltip Integration
Educational tooltips are integrated throughout existing components to provide contextual help:

```tsx
// In BillOverviewTab.tsx
<EducationalTooltip
  term="Committee Assignment"
  definition="The process by which bills are referred to specific parliamentary committees"
  context="procedural"
>
  Committee Assignments
</EducationalTooltip>
```

## Data Structure

### PlainLanguageSection
```typescript
interface PlainLanguageSection {
  id: string;
  title: string;
  legalText: string;
  plainLanguage: string;
  keyPoints: string[];
  impact: {
    who: string[];
    what: string[];
    when: string;
    cost?: string;
  };
  complexity: 'low' | 'medium' | 'high';
  importance: 'low' | 'medium' | 'high' | 'critical';
}
```

### ConstitutionalProvision
```typescript
interface ConstitutionalProvision {
  id: string;
  article: string;
  section?: string;
  title: string;
  text: string;
  relevance: 'direct' | 'indirect' | 'contextual';
  impact: 'supports' | 'conflicts' | 'neutral' | 'unclear';
  explanation: string;
}
```

### LegislationOutcome
```typescript
interface LegislationOutcome {
  id: string;
  title: string;
  year: number;
  jurisdiction: string;
  status: 'passed' | 'failed' | 'amended' | 'withdrawn' | 'pending';
  similarity: 'high' | 'medium' | 'low';
  outcome: {
    result: 'successful' | 'unsuccessful' | 'mixed' | 'unknown';
    impact: string;
    lessons: string[];
    challenges: string[];
  };
  publicSupport: {
    initial: number;
    final: number;
    keyFactors: string[];
  };
}
```

## Accessibility

The Educational Framework is built with accessibility in mind:

- **Keyboard Navigation**: All interactive elements are keyboard accessible
- **Screen Reader Support**: Proper ARIA labels and semantic HTML
- **Color Contrast**: Meets WCAG 2.1 AA standards
- **Focus Management**: Clear focus indicators and logical tab order
- **Alternative Text**: Icons have appropriate labels

## Performance

- **Lazy Loading**: Tab content is loaded on demand
- **Memoization**: Components use React.memo where appropriate
- **Efficient Rendering**: Minimal re-renders through proper state management
- **Code Splitting**: Components can be dynamically imported

## Testing

The framework includes comprehensive tests:

- **Unit Tests**: Individual component functionality
- **Integration Tests**: Component interaction and data flow
- **Accessibility Tests**: Screen reader and keyboard navigation
- **Performance Tests**: Rendering and interaction speed

Run tests with:
```bash
npm test -- --testPathPattern=education
```

## Future Enhancements

1. **Multilingual Support**: Translations for different languages
2. **Personalization**: User-specific educational preferences
3. **Interactive Tutorials**: Guided walkthroughs for complex topics
4. **Gamification**: Progress tracking and achievement systems
5. **AI-Powered Explanations**: Dynamic content generation based on user questions

## Requirements Compliance

This implementation fulfills **REQ-BDA-003** from the requirements document:

✅ **Plain language summaries for complex legal content**
- PlainLanguageSummary component with section-by-section breakdown

✅ **Constitutional context integration with bill provisions**
- ConstitutionalContext component with article-by-article analysis

✅ **Historical precedent references with similar legislation outcomes**
- HistoricalPrecedents component with outcome analysis and lessons learned

✅ **Civic action guidance with specific engagement steps**
- Enhanced CivicActionGuidance component (existing, improved)

✅ **Process education explaining legislative procedures and timelines**
- ProcessEducation component with step-by-step guidance

✅ **Educational tooltips and expandable help sections throughout the interface**
- EducationalTooltip component with contextual definitions and examples

The Educational Framework transforms complex legislative information into accessible, actionable knowledge that empowers citizens to engage meaningfully with the democratic process.