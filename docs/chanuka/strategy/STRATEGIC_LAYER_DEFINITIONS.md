# STRATEGIC LAYER DEFINITIONS
*Decision Framework for Document Tier Placement*

**Last Updated:** March 2026  
**Maintained By:** Strategy & Documentation Team  
**Version:** 1.0  

---

## PURPOSE

This document explains the 5-tier strategy documentation hierarchy and provides clear decision criteria for where new documents belong. It serves as a reference for:
- **Teams creating documents:** Know which tier to target
- **Reviewers:** Understand why documents are placed in specific tiers
- **Readers:** Understand how to navigate the documentation ecosystem
- **Future maintainers:** Apply consistent placement principles as documentation grows

---

## THE 5-TIER HIERARCHY

```
TIER 1: STRATEGIC FOUNDATION
("These define our strategy")
    ↓ (informs/enables)
TIER 2: AUDIENCE-SPECIFIC MATERIALS
("These implement strategy for specific stakeholders")
    ↓ (supported by)
TIER 3: RESEARCH FOUNDATION
("These provide evidence for strategy")
    ↓ (references)
TIER 4: PUBLIC MATERIALS
("These communicate strategy to the world")
    ↓
TIER 5: ARCHIVE
("These show our thinking evolution")
```

---

## TIER 1: STRATEGIC FOUNDATION

### What Belongs Here
**Definition:** Core strategic documents that define Chanuka's approach, theory of change, and direction across major domains

### Characteristics

| Attribute | Description |
|---|---|
| **Scope** | Organizational-wide; addresses complete strategic domain |
| **Audience** | Internal team + institutional partners who need to understand strategy |
| **Status** | Mature, reviewed, production-ready |
| **Dependencies** | Typically informs Tier 2 and Tier 3 documents |
| **Update frequency** | Annual review or when strategy shifts; some evolve continuously |
| **Longevity** | Long-term reference documents (3+ year value) |
| **Cross-references** | Frequently linked from Tier 2 and Tier 3 |
| **Naming** | UPPERCASE_SNAKE_CASE |
| **Location** | `strategic/` folder |

### Current Tier 1 Documents

| Document | Strategic Domain | Why Here |
|---|---|---|
| **BRAND_STRATEGY.md** | Brand & Identity | Defines how Chanuka will be perceived and positioned across all channels |
| **TECHNICAL_ARCHITECTURE.md** | Product & Technology | Specifies technical infrastructure, APIs, data strategy, DevOps approach |
| **VALIDATION_FRAMEWORK.md** | Risk & Testing | Defines methodology for proving assumptions and testing claims |
| **FUNDING_STRATEGY.md** | Fundraising & Partnerships | Establishes 2026-2027 funding roadmap and institutional relationships |
| **BRAND_EXPRESSIONS.md** | Communications & Culture | Defines how Chanuka communicates (slogans, poetry, cultural expressions) |
| **FOUNDER_BRIEF.md** | Strategic Context & Vision | Founder's perspective on urgency, context, and strategic inflection points |

### Decision Criteria: Does This Belong in Tier 1?

Ask these questions in order:

**1. Is this a complete strategic domain?**
- ✅ Domain examples: "Brand," "Technology," "Funding," "Validation," "Communications"
- ❌ NOT a domain: "Font choices for brand guidelines" (sub-component of brand)
- ❌ NOT a domain: "Single funder relationship" (should be in Tier 2)

**2. Does this inform organizational direction?**
- ✅ YES: "This shapes how we approach [major area]"
- ❌ NO: "This is how we execute a tactic"

**3. Is this for internal alignment + institutional partners (not just internal)?**
- ✅ YES: "Funders, partners, advisors need to understand this"
- ❌ NO: "This is only for internal use" (might still be strategic, check #4)

**4. Is this foundational enough to inform multiple other documents?**
- ✅ YES: "3+ other documents should reference this"
- ❌ NO: "Only one other document references this"

**5. Will this be actively used for 3+ years?**
- ✅ YES: "This remains relevant as we evolve"
- ❌ NO: "This will be outdated soon"

### Examples: Tier 1 vs. Other Tiers

| Scenario | Correct Tier | Reasoning |
|---|---|---|
| *"Creating detailed brand guidelines with color codes, typography, image styles"* | **Tier 2** (investor_materials or public_materials) | Sub-component of BRAND_STRATEGY; implementation guide, not strategy |
| *"Writing annual strategic plan for 2027"* | **Tier 1** | Complete strategic domain; informs entire organization |
| *"Creating proposal for Ford Foundation that emphasizes civic participation angle"* | **Tier 2** (investor_materials) | Audience-specific implementation of FUNDING_STRATEGY strategy |
| *"Documenting technical decision: should we use GraphQL or REST?"* | **Tier 3** (research_foundation) | Supporting analysis for TECHNICAL_ARCHITECTURE decisions |
| *"Writing research paper on African democratic institutions"* | **Tier 3** (research_foundation) | Research supporting brand/validation strategy |
| *"Creating marketing copy for website"* | **Tier 4** (public_materials) | Public communications derived from BRAND_STRATEGY |

### When to Create New Tier 1 Documents

Create a new Tier 1 document when:
1. A strategic domain lacks a unified reference document
2. Multiple teams ask the same strategic question repeatedly
3. Multiple Tier 2/3 documents need to reference the same strategic principle
4. External stakeholders (funders, partners) request strategic documentation
5. Strategy team decides a domain is critical enough to codify

**Process:**
1. Propose document title and outline to strategy team
2. Confirm it meets Tier 1 criteria (above)
3. Create with standard Tier 1 naming (UPPERCASE_SNAKE_CASE)
4. Present to team for feedback
5. Add to DOCUMENT_MANIFEST.md and cross-reference from relevant Tier 2/3 documents

---

## TIER 2A: INVESTOR MATERIALS

### What Belongs Here
**Definition:** Documents tailored for funders, investors, and funding-related partners. Emphasize how Chanuka's strategy addresses funder priorities.

### Characteristics

| Attribute | Description |
|---|---|
| **Scope** | Funder-specific or investor-specific |
| **Audience** | Grant review boards, VC investors, foundation program officers |
| **Status** | Polished, mistake-free, formally reviewed |
| **Dependencies** | Derived from Tier 1 strategy (FUNDING_STRATEGY, BRAND_STRATEGY, TECHNICAL_ARCHITECTURE) |
| **Update frequency** | Updated as funder priorities change or applications submitted |
| **Longevity** | 1-3 years (tied to specific grants/funding cycles) |
| **Cross-references** | References Tier 1 strategic documents |
| **Naming** | UPPERCASE_SNAKE_CASE (same as Tier 1, showing maturity) |
| **Location** | `investor_materials/` folder |

### Current Tier 2A Documents

| Document | Purpose | Derived From |
|---|---|---|
| **APPLICATION_SAMPLES.md** | Portfolio of tailored grant/fellowship applications (Code for Africa, Ford, USAID, etc.) | FUNDING_STRATEGY, BRAND_STRATEGY, TECHNICAL_ARCHITECTURE |

### Decision Criteria: Does This Belong in Investor Materials (Tier 2A)?

**Is this designed for a funder/investor?**
- ✅ YES: "This is created specifically for grant review boards or investors"
- ❌ NO: "This is internal documentation"

**Is this derived from Tier 1 strategy?**
- ✅ YES: "This implements Tier 1 strategy for a funder audience"
- ❌ NO: "This is strategic in its own right" (should be Tier 1)

**Does this emphasize funder priorities?**
- ✅ YES: "This reframes our strategy in terms of funder goals"
- ❌ NO: "This is our authentic strategy, not adapted" (still might be Tier 1)

**Is this formal/polished?**
- ✅ YES: "This has been reviewed multiple times"
- ❌ NO: "This is still rough draft" (maybe Tier 3 research, or wait to finalize)

### Examples: Tier 2A vs. Other Tiers

| Scenario | Correct Tier | Reasoning |
|---|---|---|
| *"Writing grant proposal for Ford Foundation that emphasizes civic participation"* | **Tier 2A** | Audience-specific reframing of strategy for funder |
| *"Drafting email to Ford program officer with questions about priorities"* | **Tier 3 or Archive** | Correspondence, not formal application material |
| *"Creating investment deck for potential VC funders"* | **Tier 2A** | Investor-specific material emphasizing market opportunity |
| *"Documenting why we chose to apply to Ford vs. other funders"* | **Tier 3** (research_foundation) | Analysis supporting FUNDING_STRATEGY decision |
| *"Writing internal memo on why Ford is misaligned with our values"* | **Tier 3** (research_foundation) | Internal research, not audience-facing |
| *"Creating summary of open grants in Kenya political tech space"* | **Tier 3** (research_foundation) | Research informing FUNDING_STRATEGY, not audience-facing |

### When to Create New Tier 2A Documents

Create new investor materials when:
1. Applying to major new funder (create funder-specific application)
2. Updating all applications with new market insights
3. Creating new investor pitch deck or one-pager
4. Developing investor FAQ or response to common questions

---

## TIER 2B: PARTNERSHIP MATERIALS

### What Belongs Here
**Definition:** Documents tailored for strategic partners (advisors, cultural partners, academic partners, technology partners). Emphasize partnership value and mutual benefit.

### Characteristics

| Attribute | Description |
|---|---|
| **Scope** | Partner-specific or partner-category-specific |
| **Audience** | Prospective/current advisors, cultural institutions, academic partners, technology partners |
| **Status** | Polished, professionally presented |
| **Dependencies** | Derived from Tier 1 strategy (BRAND_STRATEGY, BRAND_EXPRESSIONS, TECHNICAL_ARCHITECTURE) |
| **Update frequency** | Updated as partnerships evolve or new partner categories added |
| **Longevity** | 2-4 years (tied to specific partnership terms) |
| **Cross-references** | References Tier 1 strategic documents |
| **Naming** | UPPERCASE_SNAKE_CASE (same as Tier 1) |
| **Location** | `partnership_materials/` folder |

### Current Tier 2B Documents

| Document | Purpose | Target Partners |
|---|---|---|
| **ADVISORY_COUNCIL_INVITATION.md** | Recruitment document for prospective advisors; emphasizes developmental stage and theory of change | Academic, civic, technology advisors |
| **GOETHE_INSTITUT_APPLICATION.md** | Cultural mobility grant application; emphasizes artistic/cultural dimensions | Cultural institutions, arts funders |

### Decision Criteria: Does This Belong in Partnership Materials (Tier 2B)?

**Is this designed for a strategic partner?**
- ✅ YES: "This is created for advisors, cultural partners, or technology partners"
- ❌ NO: "This is for internal team or for funders" (Tier 2A)

**Does this emphasize mutual benefit?**
- ✅ YES: "This explains what we need from them AND what they gain from partnering with us"
- ❌ NO: "This only asks what we need" (not pitch-ready)

**Is this a specific partnership proposal?**
- ✅ YES: "This is pitched to [specific organization] for [specific collaboration]"
- ❌ MAYBE: "This is general about partnerships" (consider if broad enough for Tier 1, specific enough for custom document)

**Is this distinct from investor materials?**
- ✅ YES: "Partnership value and funder goals are different"
- If different: Tier 2B; If same: Tier 2A (because funders are highest-priority partners)

### Examples: Tier 2B vs. Other Tiers

| Scenario | Correct Tier | Reasoning |
|---|---|---|
| *"Writing invitation to join advisory council"* | **Tier 2B** | Partnership-specific material for advisors |
| *"Documenting characteristics of ideal advisor"* | **Tier 3** (research_foundation) | Internal research for advisor recruitment strategy |
| *"Creating cultural collaboration proposal for museum partner"* | **Tier 2B** | Partnership-specific material for cultural institution |
| *"Analyzing which types of advisors we should recruit"* | **Tier 3** (research_foundation) | Research supporting advisory strategy |
| *"Writing grant proposal to Goethe-Institut (German cultural funder)"* | **Tier 2B** (or 2A depending on angle) | Application for cultural funding; partnership emphasis |
| *"Creating list of potential technology partners"* | **Tier 3** (research_foundation) | Internal prospecting research |

### When to Create New Tier 2B Documents

Create new partnership materials when:
1. Launching advisory council (recruit advisors)
2. Pursuing new strategic partnership category (corporate partners, academic partners, etc.)
3. Creating partnership MOU or collaboration agreement templates
4. Developing partner FAQ or implementation guide
5. Producing partner testimonial/case study

---

## TIER 3: RESEARCH FOUNDATION

### What Belongs Here
**Definition:** Supporting research, analysis, methodology guides, market studies, philosophical exploration, and technical documentation that informs Tier 1 strategy decisions.

### Characteristics

| Attribute | Description |
|---|---|
| **Scope** | Focused research on specific topic (not organization-wide strategy) |
| **Audience** | Research team, strategy team, relevant specialists |
| **Status** | Can be in-progress or exploratory; doesn't need publication polish |
| **Dependencies** | Supports/informs Tier 1 and Tier 2 documents |
| **Update frequency** | Updated as new research emerges; superseded by new research cycle |
| **Longevity** | 1-3 years (research is often time-bound) |
| **Cross-references** | Referenced FROM Tier 1/2 documents; doesn't reference Tier 4/5 |
| **Naming** | lowercase-kebab-case |
| **Location** | `research_foundation/` folder (with optional subfolders by category) |

### Current Tier 3 Documents

| Document | Research Type | Supports |
|---|---|---|
| **philosophical-foundations.md** | Conceptual Analysis | BRAND_STRATEGY, BRAND_EXPRESSIONS |
| **market-validation-study.md** | Commercial Viability Research | FUNDING_STRATEGY, TECHNICAL_ARCHITECTURE |
| **technical-implementation-scraping-strategy.md** | Technical How-To Guide | TECHNICAL_ARCHITECTURE (data layer) |

### Decision Criteria: Does This Belong in Research Foundation (Tier 3)?

**Is this supporting research/analysis, not strategy itself?**
- ✅ YES: "This proves or explains a strategic decision in Tier 1"
- ❌ NO: "This IS the strategy" (should be Tier 1)

**Is this focused on one topic, not organization-wide?**
- ✅ YES: "This is deep research on [specific area]"
- ❌ NO: "This covers strategic direction across domains" (should be Tier 1)

**Could this be superseded by newer research?**
- ✅ YES: "New research might change this; it's time-bound"
- ❌ NO: "This is evergreen strategic principle" (should be Tier 1)

**Is this accessible to someone wanting to understand strategy depth?**
- ✅ YES: "This is how a reader learns why we made [strategic choice]"
- ❌ NO: "This is too specialized for general understanding" (might be well-placed anyway)

**Would multiple Tier 1/2 documents reference this?**
- ✅ YES: "At least 2 Tier 1/2 documents link to this"
- ❌ NO: "Only one document references this" (might be included in that document instead)

### Types of Tier 3 Documents

| Research Type | Purpose | Examples |
|---|---|---|
| **Market Research** | Validate commercial assumptions or understand market landscape | market-validation-study.md, competitive-landscape-analysis.md |
| **Technical Research** | Document technical decisions, implementation guides, architecture analysis | technical-implementation-scraping-strategy.md, api-paradigm-comparison.md |
| **Philosophical/Conceptual Analysis** | Explore ideas, theories, or conceptual foundations | philosophical-foundations.md, governance-theory-analysis.md |
| **User/Customer Research** | Understand user needs, preferences, pain points | user-interview-synthesis.md, accessibility-audit.md |
| **Literature Review** | Summarize existing knowledge on a topic | african-civic-tech-landscape.md, digital-literacy-research.md |
| **Decision Analysis** | Explain reasoning for specific decisions | "why-we-chose-django-not-rails.md", partner-selection-criteria.md |

### Examples: Tier 3 vs. Other Tiers

| Scenario | Correct Tier | Reasoning |
|---|---|---|
| *"Writing user research study: interviewing 20 parliamentary staff about information needs"* | **Tier 3** | Research supporting TECHNICAL_ARCHITECTURE and FOUNDER_BRIEF |
| *"Documenting 5 scenarios where validation framework fails; risk mitigation"* | **Tier 3** (research_foundation) | Analysis supporting VALIDATION_FRAMEWORK strategy |
| *"Analyzing 50 African civic tech projects to understand competitive landscape"* | **Tier 3** (research_foundation) | Market research informing BRAND_STRATEGY positioning |
| *"Creating technical specification for API design"* | **Tier 3** or **Tier 1** | If deep implementation details: Tier 3; if architectural choice: Tier 1 (part of TECHNICAL_ARCHITECTURE) |
| *"Outlining why poetry matters for democratic participation"* | **Tier 3** (research_foundation/philosophy) | Conceptual research supporting BRAND_EXPRESSIONS and BRAND_STRATEGY |
| *"Writing detailed feature specification for parliamentary search function"* | **Implementation docs** (TBD location) | Currently no Tier 4; might eventually be developer documentation |

### Tier 3 Subfolder Structure

As research grows, organize into meaningful subfolders:

```
research_foundation/
├── market-research/
│   ├── market-validation-study.md
│   ├── competitive-landscape-analysis.md
│   └── user-interview-findings.md
├── technical-research/
│   ├── api-paradigm-comparison.md
│   ├── data-pipeline-architecture.md
│   └── technical-implementation-scraping-strategy.md
├── philosophy-and-theory/
│   ├── philosophical-foundations.md
│   ├── democratic-participation-theory.md
│   └── african-governance-institutions-analysis.md
└── organizational-research/
    ├── advisor-selection-criteria.md
    └── organizational-capacity-assessment.md
```

*Currently using flat structure; subfolders may be added as research_foundation grows*

### When to Create New Tier 3 Documents

Create new research/analysis documents when:
1. Tier 1 strategy is based on specific research that should be documented
2. Strategic question requires deep analysis or literature review
3. Technical decision needs documentation of alternative options considered
4. User/customer research conducted that informs product decisions
5. Philosophical or conceptual exploration supports brand/strategy positioning
6. Methodology or how-to guide needed for implementing technical strategy

---

## TIER 4: PUBLIC MATERIALS

### What Belongs Here
**Definition:** Public-facing communications derived from Tier 1 strategy. Audience-adapted for general public, social media, website, media relations.

### Current Status
**NOT YET POPULATED.** Tier reserved for future public website materials, press releases, social media guides, public-facing FAQs, etc.

### Anticipated Content
Once public materials begin, expected documents:
- `PUBLIC_FAQ.md` — Frequently asked questions for general public
- `MEDIA_BRIEF.md` — Press kit and media background
- `WEBSITE_COPY_HOMEPAGE.md` — Website homepage narrative
- `SOCIAL_MEDIA_PLAYBOOK.md` — Social media voice and content strategy
- `PRESS_RELEASE_TEMPLATES.md` — Templates for announcing milestones/partnerships

### Characteristics (Placeholder)

| Attribute | Description |
|---|---|
| **Scope** | Public-facing version of strategy |
| **Audience** | General public, media, potential users |
| **Status** | Polished, battle-tested, translated/accessible |
| **Simplification** | Tier 1 strategy translated to accessible language |
| **Update frequency** | Updated on website refresh cycle or major news |
| **Longevity** | 1-2 years (tied to website version/brand era) |
| **Naming** | TBD (likely Title Case or lowercase-kebab-case) |
| **Location** | `public_materials/` folder |

### Decision Criteria (Placeholder): Does This Belong in Public Materials (Tier 4)?

When Tier 4 opens, use criteria:
1. **Is this public-facing?** (Not internal)
2. **Is this simplified/accessible?** (General audience, not specialists)
3. **Would external audience use this?** (Website visitors, media, potential users)
4. **Is this derived from Tier 1 strategy?** (Not standalone)

---

## TIER 5: ARCHIVE

### What Belongs Here
**Definition:** Superseded documents, draft versions, historical records. Preserved for version history but not actively used.

### Characteristics

| Attribute | Description |
|---|---|
| **Scope** | Historical versions of documents that have been consolidated or replaced |
| **Audience** | Strategy team (for understanding evolution) and institutional archive (for governance) |
| **Status** | Immutable; never modified after archiving |
| **Dependencies** | Parent documents are in Tier 1 (consolidated versions) |
| **Update frequency** | Never updated (immutable archive) |
| **Longevity** | Permanent (institutional memory) |
| **Naming** | Original-name + `_original_v1.0` or `_draft_v1.0` |
| **Location** | `_archive/iteration_history/` folder |

### Current Tier 5 Documents

15+ source files now archived, including:
- api_strategy_doc_original_v1.0.md (consolidated into TECHNICAL_ARCHITECTURE.md)
- Strategic_Funding_Plan_original_v1.0.md (consolidated into FUNDING_STRATEGY.md)
- chanuka_complete_slogans_original_v1.0.md (consolidated into BRAND_EXPRESSIONS.md)
- ... and 12 others

### Decision Criteria: Should This Be Archived?

**Is this document being superseded?**
- ✅ YES: "This content is now consolidated into [Tier 1 document]"
- ❌ NO: "This is still the primary version" (keep in active tier)

**Is this a draft that won't be used going forward?**
- ✅ YES: "We chose the other approach"
- ❌ NO: "We might still use this" (keep in active tier)

**Is this a historical record that should be preserved?**
- ✅ YES: "For audit trail/governance/learning"
- ❌ NO: "This is just clutter"

### Version Notation Format

**For consolidated documents:**
- Original primary version: `_original_v1.0`
- Example: `api_strategy_doc_original_v1.0.md`

**For superseded drafts:**
- Alternative draft: `_draft_v1.0`
- Example: `chanuka_brand_roadmap_draft_v1.0.md`

**For alternative approaches:**
- Alternate path not taken: `_alt_v1.0`
- Example: `technical-architecture-rest-only_alt_v1.0.md` (if REST-only approach was considered but abandoned)

### Archive Preservation Rules

- **Never delete** archived files
- **Never modify** archived file content after archiving
- **Always** reference archived version in VERSION_CONTROL_LOG.md
- **Always** make parent document (Tier 1) discoverable from archives

---

## DECISION FLOWCHART

Use this flowchart when deciding where a new document belongs:

```
START: Creating new document

┌─ Is this organizational strategy across major domain?
├─ YES → Is this foundational vs. audience-specific?
│  ├─ YES: TIER 1 (BRAND_STRATEGY, TECHNICAL_ARCHITECTURE, etc.)
│  └─ NO: Go to next question
├─ NO: Go to next question
│
├─ Is this for funders/investors?
├─ YES → TIER 2A (investor_materials/)
├─ NO: Go to next question
│
├─ Is this for strategic partners (advisors, cultural, etc.)?
├─ YES → TIER 2B (partnership_materials/)
├─ NO: Go to next question
│
├─ Is this public-facing website/communications?
├─ YES → TIER 4 (public_materials/) [not yet populated]
├─ NO: Go to next question
│
├─ Is this research/analysis supporting strategy?
├─ YES → TIER 3 (research_foundation/)
├─ NO: Go to next question
│
└─ Is this superseded/archived content?
   ├─ YES → TIER 5 (_archive/iteration_history/)
   └─ NO → Reconsider: does this truly need to exist?
```

---

## CROSS-DOCUMENT RELATIONSHIPS

### Strategic Information Flow

```
TIER 1 (Strategy)
    ↓ (informs: "Here's what we're doing")
TIER 2 (Implementation)
    ↓ (emphasizes: "Here's why this matters to YOU")
Audience receives tailored message
    ↓
TIER 3 (Research) ← supports both with evidence
TIER 4 (Public) ← simplifies Tier 1 for general audiences
TIER 5 (Archive) ← preserves thinking evolution
```

### Examples of Complete Document Family

**Example: FUNDING_STRATEGY**

| Tier | Document | Role |
|---|---|---|
| **Tier 1** | FUNDING_STRATEGY.md | Core institutional strategy: 2026 funding landscape, Big Three analysis, 95-org database, contact verification |
| **Tier 2A** | APPLICATION_SAMPLES.md (in investor_materials/) | Reframes strategy for Ford, Luminate, USAID: specific proposals emphasizing each funder's priorities |
| **Tier 3** | market-validation-study.md (in research_foundation/) | Research supporting funding decisions: commercial viability, customer segments, WTP findings |
| **Tier 4** | [TBD] Donor/Partnership FAQ (when created) | Public-facing explanation of what funders are supporting |
| **Tier 5** | Strategic_Funding_Plan_original_v1.0.md (_archive/) | Original planning document before consolidation with contact database |

**Example: TECHNICAL_ARCHITECTURE**

| Tier | Document | Role |
|---|---|---|
| **Tier 1** | TECHNICAL_ARCHITECTURE.md | Core strategy: API design choices, data acquisition tiers, DevOps automation |
| **Tier 2** | None currently | Could create: technology partnership proposals, vendor-specific technical docs |
| **Tier 3** | technical-implementation-scraping-strategy.md | Research: detailed how-to guide for web scraping implementation |
| **Tier 4** | [TBD] Developer documentation (when created) | Public-facing technical documentation for external developers |
| **Tier 5** | api_strategy_doc_original_v1.0.md | Original detailed API analysis before consolidation |

---

## REASSESSMENT: MOVING DOCUMENTS BETWEEN TIERS

### When to Reconsider Tier Placement

A document may need to move tiers if:
1. **Audience changes:** Document becomes more/less public or specialized
2. **Strategic scope changes:** Document becomes foundational vs. supporting (or vice versa)
3. **Usage patterns change:** Suddenly referenced by many vs. few documents
4. **Time sensitivity changes:** Document becomes historical vs. active

### Process for Moving

1. **Tier 2/3 → Tier 1:** Propose to strategy team; confirm meets Tier 1 criteria
2. **Tier 1 → Tier 2/3:** Usually not appropriate (keep authoritative version in Tier 1)
3. **Any → Tier 5:** Archive superseded version; update DOCUMENT_MANIFEST and VERSION_CONTROL_LOG
4. **Tier 5 → Active:** Resurrect if needed; move to appropriate tier; note in VERSION_CONTROL_LOG

---

## TIER MAINTENANCE CHECKLIST

### Quarterly (Policy Review)

- [ ] Do tier definitions still match reality?
- [ ] Are there documents in wrong tier? (Reassess based on usage)
- [ ] Are there empty tiers that should be populated?
- [ ] Do naming conventions still make sense?

### Semi-Annually (Content Audit)

- [ ] Any Tier 1 documents that need updating?
- [ ] Any Tier 3 research still relevant, or should be archived?
- [ ] Any Tier 2A/B documents that haven't been used this cycle?
- [ ] New partnerships/funding opportunities that need Tier 2 docs?

### Annually (Strategic Review)

- [ ] Do Tier 1 documents reflect current strategy?
- [ ] Should any Tier 3 research be elevated to Tier 1 (recurring question)?
- [ ] Is it time to develop Tier 4 public materials?
- [ ] Any major reorganization needed as organization evolves?

---

## FAQ: TIER PLACEMENT

**Q: I have two related documents. Should they both be Tier 1?**
A: Likely no. One should be foundational strategy (Tier 1); the other should be supporting analysis (Tier 3) or audience-specific implementation (Tier 2).

**Q: When does research (Tier 3) become strategy (Tier 1)?**
A: When research findings are so fundamental that they shape organizational direction across multiple domains. Example: If market research shows customers value feature X above all else, that becomes strategic insight codified in TECHNICAL_ARCHITECTURE.

**Q: Can a document be in multiple tiers?**
A: No. A document lives in one tier (its primary purpose). It may be *referenced* by documents in other tiers, but placement should be unambiguous.

**Q: Why archive old documents instead of just deleting?**
A: Institutional memory. Understanding how thinking evolved is valuable for:
- Explaining why current strategy exists
- Learning from past experiments
- Preventing repeating past mistakes
- Governance/audit trail

**Q: Should audience-specific versions be separate (Tier 2) or included in Tier 1?**
A: Separate. Tier 1 documents should be our authentic strategy, not audience-tailored. Tier 2 documents reframe Tier 1 for specific audiences.

**Q: If I'm writing internal documentation for the dev team, where does it go?**
A: Depends on type:
- Technical *strategy* (choice of tooling, architecture): Tier 1 or Tier 3
- Technical *how-to* (implementation guide): Tier 3 (research_foundation/technical/)
- Developer onboarding: Tier 4 eventually (developer materials when created)

---

## CONTACT & QUESTIONS

For questions on tier placement:
1. Review this document and the Decision Flowchart
2. Ask strategy team for guidance on ambiguous cases
3. Propose tier placement before creating document
4. Document decision in VERSION_CONTROL_LOG once created

**Maintained by:** Strategy & Documentation Team  
**Last review:** March 2026  
**Next review scheduled:** Q3 2026 (semi-annual content audit)

---

*This tier structure is designed to grow with Chanuka. As documentation expands, new Tier 2 subcategories (e.g., corporate_partnership_materials/, academic_partnership_materials/) may be added, but core Tier 1-5 structure should remain stable.*
