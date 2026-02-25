# Mock Data Generation Prompts for Chanuka Platform

Based on architecture analysis and feature requirements, here are AI prompts to generate optimal mock data for NLP training and MVP demonstration.

---

## 📊 Data Requirements Summary

### From Architecture Analysis

**Core Features Requiring Mock Data:**
1. Constitutional Intelligence (AI-powered analysis)
2. Advocacy Coordination (campaigns & actions)
3. Argument Intelligence (NLP clustering)
4. Pretext Detection (misleading title detection)
5. Recommendation Engine (personalized suggestions)
6. Search & Discovery (semantic search)
7. Expert Verification (credibility scoring)

### Volume Requirements

| Data Type | Current | Needed | Purpose |
|-----------|---------|--------|---------|
| Bills | 5 | 500+ | NLP training, search, recommendations |
| Users | 5 | 100+ | Engagement patterns, credibility |
| Comments | 10 | 2000+ | Sentiment analysis, argument clustering |
| Sponsors | 5 | 50+ | Transparency analysis, conflict detection |
| Constitutional Analyses | 0 | 200+ | AI model training |
| Campaigns | 0 | 50+ | Advocacy coordination testing |
| Actions | 0 | 500+ | Impact tracking |
| Arguments | 0 | 1000+ | Argument intelligence training |

---

## 🤖 AI Prompts for Data Generation

### Prompt 1: Kenyan Legislative Bills (500 bills)

```
Generate 500 realistic Kenyan legislative bills with the following specifications:

CONTEXT:
- Kenya's 2010 Constitution framework
- Current legislative priorities (2024-2026)
- Kenyan political and social context
- Real parliamentary procedures

BILL CATEGORIES (distribute evenly):
1. Technology & Digital (75 bills)
   - Digital economy, data protection, cybersecurity
   - Fintech regulation, cryptocurrency
   - AI governance, digital rights

2. Environment & Climate (100 bills)
   - Climate adaptation, carbon trading
   - Wildlife conservation, forestry
   - Water resources, pollution control

3. Healthcare & Social Services (80 bills)
   - Universal healthcare, NHIF reforms
   - Mental health, reproductive health
   - Social protection, disability rights

4. Economy & Finance (120 bills)
   - Tax reforms, budget allocation
   - Trade policy, investment incentives
   - Financial inclusion, SME support

5. Education & Training (50 bills)
   - Curriculum reforms, CBC implementation
   - Higher education funding
   - Technical training, skills development

6. Infrastructure (50 bills)
   - Roads, railways, ports
   - Housing, urban planning
   - Energy, telecommunications

7. Governance & Law (25 bills)
   - Electoral reforms, devolution
   - Anti-corruption, judicial reforms
   - Human rights, police reforms

BILL STRUCTURE:
- Title: Clear, descriptive (10-20 words)
- Bill Number: Format "HB-YYYY-NNN" or "SB-YYYY-NNN"
- Description: 2-3 paragraphs explaining purpose
- Content: Full bill text with:
  * ARRANGEMENT OF CLAUSES
  * PART I - PRELIMINARY (definitions, objects)
  * PART II - MAIN PROVISIONS (3-5 parts)
  * SCHEDULES (if applicable)
- Summary: 1 paragraph executive summary
- Status: Distribute across all stages:
  * draft (10%)
  * introduced (15%)
  * first_reading (15%)
  * committee_review (25%)
  * second_reading (15%)
  * third_reading (10%)
  * passed (8%)
  * rejected (2%)
- Tags: 3-7 relevant tags per bill
- Complexity Score: 1-10 (realistic distribution)
- Introduced Date: Random dates 2023-2024
- Sponsor: Assign to one of 50 sponsors

CONSTITUTIONAL CONCERNS (for 40% of bills):
- Identify potential constitutional issues
- Reference specific constitutional articles
- Severity: low (60%), medium (30%), high (8%), critical (2%)
- Types: rights violations, procedural issues, conflicts

REALISM REQUIREMENTS:
- Use authentic Kenyan legislative language
- Reference real constitutional articles (Kenya 2010)
- Include realistic policy debates
- Reflect current Kenyan political priorities
- Use proper legal formatting

OUTPUT FORMAT: JSON array with all fields populated
```

### Prompt 2: User Profiles & Engagement (100 users)

```
Generate 100 diverse Kenyan user profiles for a civic engagement platform:

USER TYPES (distribute):
- Citizens (60): Regular Kenyans from various backgrounds
- Experts (20): Constitutional lawyers, policy analysts, academics
- Journalists (10): Investigative reporters, political journalists
- Activists (10): Civil society, human rights advocates

DEMOGRAPHICS:
- Counties: All 47 Kenyan counties represented
- Age: 18-70 years (realistic distribution)
- Education: Secondary to PhD
- Occupations: Diverse (teachers, farmers, business owners, etc.)
- Languages: English, Swahili, local languages

PROFILE FIELDS:
- Username: Realistic Kenyan names
- Email: Professional format
- Bio: 2-3 sentences about background and interests
- Expertise: Array of 2-5 areas
- Location: County and constituency
- Organization: Where applicable
- Reputation Score: 0-100 (realistic distribution)
- Verification Status: verified (30%), unverified (70%)

ENGAGEMENT PATTERNS:
- Active users (30%): 50+ comments, high engagement
- Moderate users (50%): 10-30 comments, regular activity
- Lurkers (20%): <10 comments, mostly viewing

EXPERTISE AREAS (for experts):
- Constitutional law
- Environmental policy
- Healthcare policy
- Economic policy
- Human rights
- Technology policy
- Agricultural policy
- Education policy

OUTPUT FORMAT: JSON array with complete user profiles
```

### Prompt 3: Comments & Sentiment (2000 comments)

```
Generate 2000 realistic comments on Kenyan legislative bills:

COMMENT TYPES (distribute):
1. General Discussion (40%): Thoughtful analysis and opinions
2. Support (25%): Positive feedback with reasoning
3. Concern (20%): Constructive criticism and worries
4. Opposition (10%): Strong disagreement with arguments
5. Questions (5%): Seeking clarification

SENTIMENT DISTRIBUTION:
- Positive: 35%
- Neutral: 40%
- Negative: 25%

QUALITY LEVELS:
- Expert-level (20%): Detailed, references law/precedent
- Informed (50%): Well-reasoned, shows understanding
- Basic (30%): Simple opinions, less detailed

LANGUAGE CHARACTERISTICS:
- Formal English (40%)
- Casual English (30%)
- Swahili/English mix (20%)
- Sheng/colloquial (10%)

CONTENT REQUIREMENTS:
- Length: 50-500 words (varied)
- Specific references to bill sections
- Constitutional arguments (for 30% of comments)
- Personal impact stories (for 20% of comments)
- Policy alternatives (for 15% of comments)

ENGAGEMENT METRICS:
- Upvotes: 0-100 (power law distribution)
- Downvotes: 0-20 (sparse)
- Replies: 0-10 (some comments spark discussions)

REALISM:
- Reflect actual Kenyan political discourse
- Include regional perspectives
- Show diverse viewpoints
- Use authentic Kenyan expressions

OUTPUT FORMAT: JSON array with comment text, metadata, and engagement
```

### Prompt 4: Constitutional Analyses (200 analyses)

```
Generate 200 constitutional analyses for Kenyan bills:

ANALYSIS COMPONENTS:

1. ALIGNMENT SCORE (0-100%):
   - Excellent (90-100%): 30% of bills
   - Good (70-89%): 40% of bills
   - Fair (50-69%): 20% of bills
   - Concerns (0-49%): 10% of bills

2. VIOLATIONS (0-5 per bill):
   Types:
   - Rights violations (Bill of Rights, Chapter 4)
   - Procedural issues (legislative process)
   - Devolution conflicts (Chapter 11)
   - Separation of powers (Chapter 8-10)
   - Public participation (Article 10, 35)
   
   Severity Distribution:
   - Low: 60%
   - Medium: 30%
   - High: 8%
   - Critical: 2%

3. AFFECTED ARTICLES:
   - Reference specific Kenya Constitution 2010 articles
   - Explain how bill conflicts or aligns
   - Cite relevant clauses

4. RECOMMENDATIONS:
   - Specific amendments to address concerns
   - Alternative approaches
   - Procedural improvements

5. LEGAL PRECEDENTS (2-5 per analysis):
   - Kenyan Supreme Court cases
   - High Court rulings
   - Court of Appeal decisions
   - Relevance score: 0.5-1.0

PRECEDENT FORMAT:
- Case name: Real or realistic Kenyan case
- Year: 2010-2024
- Court: Supreme Court, High Court, Court of Appeal
- Summary: 2-3 sentences
- Relevance: Why it applies to this bill

CONSTITUTIONAL ARTICLES TO REFERENCE:
- Article 10: National values and principles
- Article 27: Equality and non-discrimination
- Article 35: Access to information
- Article 43: Economic and social rights
- Article 47: Fair administrative action
- Article 69: Environmental rights
- Article 174: Devolution principles
- Article 201: Public finance principles

OUTPUT FORMAT: JSON with complete analysis structure
```

### Prompt 5: Advocacy Campaigns (50 campaigns)

```
Generate 50 realistic advocacy campaigns for Kenyan bills:

CAMPAIGN TYPES:
1. Amendment Campaigns (40%): Seeking specific bill changes
2. Awareness Campaigns (30%): Educating public
3. Opposition Campaigns (20%): Blocking harmful bills
4. Support Campaigns (10%): Promoting good legislation

CAMPAIGN STRUCTURE:

1. BASIC INFO:
   - Title: Clear, action-oriented (5-10 words)
   - Description: 2-3 paragraphs explaining goals
   - Associated Bill: Link to specific bill
   - Organizer: User profile
   - Status: draft (10%), active (60%), completed (20%), paused (10%)

2. GOALS (2-5 per campaign):
   - Specific, measurable objectives
   - Examples:
     * "Amend Section 5 to include disability rights"
     * "Increase public awareness by 50%"
     * "Collect 10,000 petition signatures"
     * "Secure 5 media interviews"

3. TIMELINE:
   - Start date: Random 2023-2024
   - End date: 30-180 days after start
   - Key milestones

4. PARTICIPANTS:
   - 10-1000 participants per campaign
   - Mix of user types
   - Engagement levels vary

5. ACTIONS (5-20 per campaign):
   Types:
   - Contact representative (30%)
   - Submit comment (25%)
   - Attend hearing (15%)
   - Share content (15%)
   - Organize meeting (10%)
   - Petition signature (5%)
   
   Status Distribution:
   - Pending: 30%
   - In Progress: 20%
   - Completed: 45%
   - Skipped: 5%

6. IMPACT METRICS:
   - Bill amendments influenced: 0-5
   - Media mentions: 0-20
   - Committee feedback: 0-3
   - Public awareness increase: 0-80%
   - Legislative responses: 0-10

REALISM:
- Reflect actual Kenyan advocacy tactics
- Include coalition building
- Show diverse strategies
- Realistic success rates

OUTPUT FORMAT: JSON with campaigns, actions, and impact data
```

### Prompt 6: Arguments & Claims (1000 arguments)

```
Generate 1000 structured arguments about Kenyan legislative bills:

ARGUMENT STRUCTURE:

1. CLAIM:
   - Clear statement (1-2 sentences)
   - Position: support, oppose, neutral, conditional
   - Confidence: 0.5-1.0

2. EVIDENCE (1-5 pieces):
   Types:
   - Statistical data
   - Expert testimony
   - Case studies
   - Legal precedent
   - Research findings
   
   Quality:
   - Strong: 40%
   - Moderate: 40%
   - Weak: 20%

3. REASONING:
   - Logical connection between evidence and claim
   - 2-4 sentences
   - Clear argumentation

4. COUNTERARGUMENTS (0-3):
   - Anticipated objections
   - Responses to counterarguments

5. RELATIONSHIPS:
   - Supports: Links to supporting arguments
   - Contradicts: Links to opposing arguments
   - Clarifies: Links to related arguments
   - Expands: Links to broader arguments

ARGUMENT TYPES:
- Constitutional (25%): Based on constitutional principles
- Economic (20%): Cost-benefit analysis
- Social (20%): Impact on communities
- Environmental (15%): Ecological concerns
- Procedural (10%): Process and implementation
- Rights-based (10%): Human rights focus

COMPLEXITY LEVELS:
- Simple (30%): Basic reasoning, 1-2 evidence pieces
- Moderate (50%): Multiple evidence, clear logic
- Complex (20%): Sophisticated, multiple counterarguments

KENYAN CONTEXT:
- Reference local issues and concerns
- Use Kenyan examples and data
- Reflect regional perspectives
- Include devolution considerations

OUTPUT FORMAT: JSON with argument graph structure
```

### Prompt 7: Sponsors & Transparency (50 sponsors)

```
Generate 50 realistic Kenyan legislative sponsor profiles:

SPONSOR TYPES:
- Members of Parliament (30): Various constituencies
- Senators (15): County representatives
- Governors (5): County executives

PROFILE FIELDS:

1. BASIC INFO:
   - Name: Realistic Kenyan names with "Hon." prefix
   - Role: MP, Senator, Governor
   - Party: Major Kenyan parties (UDA, ODM, Jubilee, Wiper, etc.)
   - Constituency/County: All 47 counties represented
   - Contact: Email, phone (realistic formats)

2. BACKGROUND:
   - Bio: 3-4 sentences about career and focus areas
   - Education: Realistic credentials
   - Previous positions: Political history
   - Years in office: 1-15 years

3. TRANSPARENCY METRICS:

   a) Conflict Level:
      - Low (60%): Minimal conflicts
      - Medium (30%): Some concerns
      - High (10%): Significant conflicts
   
   b) Financial Exposure:
      - Range: KES 0 - 50 million
      - Distribution: Realistic (most under 10M)
   
   c) Voting Alignment:
      - Party alignment: 50-95%
      - Constituency alignment: 60-90%
   
   d) Transparency Score:
      - Range: 40-100%
      - Distribution: Normal curve around 75%

4. AFFILIATIONS (0-5 per sponsor):
   Types:
   - Corporate board memberships
   - NGO leadership
   - Professional associations
   - Business interests
   - Family connections
   
   Conflict Types:
   - None (60%)
   - Minor (30%)
   - Moderate (8%)
   - Major (2%)

5. LEGISLATIVE ACTIVITY:
   - Bills sponsored: 1-20
   - Bills co-sponsored: 5-50
   - Committee memberships: 1-5
   - Attendance rate: 60-95%

6. PUBLIC ENGAGEMENT:
   - Social media presence
   - Town halls held: 0-20/year
   - Constituent responses: 40-90%
   - Media appearances: 0-50/year

REALISM:
- Reflect actual Kenyan political landscape
- Include diverse political views
- Show realistic conflict patterns
- Use authentic party affiliations

OUTPUT FORMAT: JSON with complete sponsor profiles
```

### Prompt 8: Search Queries & Patterns (500 queries)

```
Generate 500 realistic search queries for Kenyan legislative platform:

QUERY TYPES:

1. KEYWORD SEARCHES (40%):
   - Single words: "healthcare", "education", "tax"
   - Phrases: "climate change", "digital economy"
   - Kenyan-specific: "devolution", "CDF", "NHIF"

2. BILL SEARCHES (25%):
   - By number: "HB-2024-001"
   - By title: "Digital Economy Act"
   - By sponsor: "Hon. Sarah Mwangi"

3. TOPIC SEARCHES (20%):
   - Policy areas: "environmental protection"
   - Issues: "corruption", "unemployment"
   - Rights: "freedom of expression"

4. SEMANTIC SEARCHES (15%):
   - Questions: "How does this affect small businesses?"
   - Concepts: "bills about climate adaptation"
   - Comparisons: "similar to 2018 data protection law"

SEARCH PATTERNS:

1. USER INTENT:
   - Information seeking (50%)
   - Monitoring specific bills (25%)
   - Research/analysis (15%)
   - Advocacy planning (10%)

2. QUERY COMPLEXITY:
   - Simple (1-2 words): 40%
   - Moderate (3-5 words): 45%
   - Complex (6+ words): 15%

3. LANGUAGE:
   - English: 70%
   - Swahili: 20%
   - Mixed: 10%

4. FILTERS USED:
   - Category filter: 40% of searches
   - Status filter: 30% of searches
   - Date range: 20% of searches
   - Sponsor filter: 10% of searches

ENGAGEMENT METRICS:
- Click-through rate: 20-80%
- Time on result: 30s - 10min
- Refinement rate: 10-30%
- Saved searches: 5-15%

TRENDING TOPICS (include):
- Current Kenyan political issues
- Recent controversial bills
- Seasonal topics (budget, elections)
- Crisis-related (drought, floods)

OUTPUT FORMAT: JSON with queries, filters, and engagement data
```

---

## 🎯 Data Quality Requirements

### Realism Checklist

For all generated data, ensure:

✅ **Kenyan Context**
- Uses authentic Kenyan names, places, issues
- References real constitutional articles
- Reflects current political landscape
- Includes regional diversity (all 47 counties)

✅ **Legislative Authenticity**
- Proper bill formatting (ARRANGEMENT OF CLAUSES, etc.)
- Realistic legal language
- Accurate constitutional references
- Authentic parliamentary procedures

✅ **Diversity**
- Geographic: All regions represented
- Political: Multiple viewpoints
- Demographic: Age, education, occupation
- Linguistic: English, Swahili, mixed

✅ **Consistency**
- Referential integrity (bills ↔ sponsors ↔ comments)
- Temporal logic (dates make sense)
- Realistic distributions (not all perfect scores)
- Coherent narratives

✅ **Completeness**
- All required fields populated
- No placeholder text
- Proper formatting
- Valid data types

---

## 📦 Output Format

### JSON Structure

All prompts should output valid JSON with this structure:

```json
{
  "dataType": "bills|users|comments|etc",
  "version": "1.0",
  "generatedAt": "ISO 8601 timestamp",
  "count": 500,
  "data": [
    {
      // Individual records here
    }
  ],
  "metadata": {
    "distributions": {
      // Category counts, etc.
    },
    "quality": {
      "completeness": 100,
      "consistency": 100
    }
  }
}
```

---

## 🔄 Data Generation Workflow

### Step 1: Generate Core Data
1. Run Prompt 1 (Bills) → 500 bills
2. Run Prompt 2 (Users) → 100 users
3. Run Prompt 7 (Sponsors) → 50 sponsors

### Step 2: Generate Engagement Data
4. Run Prompt 3 (Comments) → 2000 comments
5. Run Prompt 5 (Campaigns) → 50 campaigns
6. Run Prompt 8 (Search Queries) → 500 queries

### Step 3: Generate Analysis Data
7. Run Prompt 4 (Constitutional Analyses) → 200 analyses
8. Run Prompt 6 (Arguments) → 1000 arguments

### Step 4: Validate & Import
9. Validate referential integrity
10. Check data quality metrics
11. Import to database via seed scripts

---

## 🧪 Testing & Validation

### Validation Scripts

Create these validation scripts:

```typescript
// scripts/validate-mock-data.ts
- Check referential integrity
- Verify data distributions
- Validate JSON structure
- Test for duplicates
- Ensure completeness
```

### Quality Metrics

Track these metrics:

- **Completeness**: 100% of fields populated
- **Consistency**: All references valid
- **Diversity**: Proper distributions
- **Realism**: Passes manual review
- **Usability**: Works in actual features

---

## 📊 Expected Outcomes

### NLP Training Datasets

1. **Text Classification**
   - 500 bills categorized
   - 2000 comments with sentiment
   - 200 constitutional analyses

2. **Named Entity Recognition**
   - Sponsor names
   - Constitutional articles
   - Legal terms
   - Geographic locations

3. **Semantic Search**
   - 500 bills with embeddings
   - 500 search queries with results
   - Relevance scores

4. **Argument Mining**
   - 1000 structured arguments
   - Claim-evidence relationships
   - Argument graphs

### MVP Demonstration

1. **Realistic User Experience**
   - Diverse bills to browse
   - Active discussions
   - Real-looking campaigns

2. **Feature Showcase**
   - Constitutional analysis examples
   - Advocacy coordination demos
   - Search and discovery
   - Expert verification

3. **Performance Testing**
   - Load testing with realistic data
   - Search performance
   - API response times

---

## 🚀 Next Steps

1. **Generate Data**: Use prompts with Claude/GPT-4
2. **Validate**: Run validation scripts
3. **Import**: Load into database
4. **Test**: Verify features work
5. **Iterate**: Refine based on feedback

---

**Total Estimated Time**: 2-3 days for complete data generation and validation
**Tools Needed**: Claude/GPT-4 API access, validation scripts, database access
**Output**: ~5000 high-quality mock records ready for NLP training and MVP demo
