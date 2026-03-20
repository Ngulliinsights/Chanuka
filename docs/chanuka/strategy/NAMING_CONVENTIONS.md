# NAMING CONVENTIONS
*Standardized Document Naming for Chanuka Strategy*

**Last Updated:** March 2026  
**Maintained By:** Strategy & Documentation Team  
**Version:** 1.0  

---

## PURPOSE

This document standardizes naming conventions for Chanuka strategy documents to ensure:
- **Clarity:** File names clearly indicate document purpose and audience
- **Organization:** Naming aligns with folder tier structure for easy navigation
- **Consistency:** All team members follow same naming patterns (reduces confusion)
- **Discoverability:** Clear naming enables searching and browsing
- **Professionalism:** Standardized naming conveys intentional organization

---

## QUICK REFERENCE

| Tier | Format | Case Style | Examples | Use Case |
|---|---|---|---|---|
| **Tier 1: Strategic** | `DOCUMENT_TITLE.md` | UPPERCASE_SNAKE_CASE | BRAND_STRATEGY.md, TECHNICAL_ARCHITECTURE.md | Core strategic documents |
| **Tier 2A: Investor Materials** | `DOCUMENT_TITLE.md` in audience folder | UPPERCASE_SNAKE_CASE | APPLICATION_SAMPLES.md | Funder-specific materials |
| **Tier 2B: Partnership Materials** | `DOCUMENT_TITLE.md` in audience folder | UPPERCASE_SNAKE_CASE | ADVISORY_COUNCIL_INVITATION.md | Partner-specific materials |
| **Tier 3: Research Foundation** | `lowercase-kebab-case.md` | lowercase-kebab-case | philosophical-foundations.md | Supporting research |
| **Tier 4: Public Materials** | TBD | TBD | (not yet populated) | Public-facing content |
| **Tier 5: Archive** | `{name}_original_v1.0.md` or `{name}_draft_v1.0.md` | Version notation | api_strategy_doc_original_v1.0.md | Historical versions |

---

## DETAILED NAMING GUIDELINES

### Tier 1: Strategic Foundation Documents

**Format:** `UPPERCASE_SNAKE_CASE.md`

**Characteristics:**
- ALL CAPITALS signal "authoritative, production-ready strategic document"
- Words separated by underscores (no hyphens)
- Short enough to fit in UI menus but descriptive enough to understand purpose
- Minimal abbreviations (prefer TECHNICAL_ARCHITECTURE to ARCH.md)

**Examples:**
- ✅ `BRAND_STRATEGY.md` — Core brand positioning
- ✅ `TECHNICAL_ARCHITECTURE.md` — Technical implementation roadmap
- ✅ `VALIDATION_FRAMEWORK.md` — Validation methodology
- ✅ `FUNDING_STRATEGY.md` — Funding roadmap and contacts
- ✅ `BRAND_EXPRESSIONS.md` — Slogans, poetry, messaging library
- ✅ `FOUNDER_BRIEF.md` — Founder's strategic memo

**Anti-patterns (avoid):**
- ❌ `brand-strategy.md` (lowercase signals research, not strategic)
- ❌ `BrandStrategy.md` (CamelCase not used in this system)
- ❌ `BRAND.md` (too abbreviated; unclear)
- ❌ `strategy_brand.md` (wrong case style)
- ❌ `chanuka_brand_strategy.md` (project name unnecessary; too long)

**Word Order Convention:**
- Noun first, descriptors second: `TECHNICAL_ARCHITECTURE`, not `ARCHITECTURE_TECHNICAL`
- Short adjectives acceptable: `FUNDING_STRATEGY` (funding is descriptor)
- Avoid excessive compound names; max 3-4 words: `STRATEGIC_PARTNERSHIP_DEVELOPMENT_FRAMEWORK` ← prefer breaking into separate docs

**When to Create New Tier 1 Documents:**

New Tier 1 documents should be created when:
1. Document is foundational to organizational strategy
2. Document addresses a complete strategic domain (e.g., "brand" is a domain; "font choice" is not)
3. Document serves multiple audiences (internal + institutional partners)
4. Document has significant internal dependencies with other Tier 1 documents
5. Document is referenced by multiple Tier 2 and Tier 3 documents

**Decision Tree:**
```
Is this a foundational strategic document?
├─ YES (core to strategy): Create as UPPERCASE_SNAKE_CASE in strategic/ tier
├─ NO (supporting material)
│   ├─ Is it audience-specific? (funder, partner, public): Create in Tier 2 folder
│   ├─ Is it research/analysis? Go to Tier 3
│   └─ Is it a previous version? Archive in Tier 5
└─ UNSURE? Strategy team review before creation
```

---

### Tier 2: Audience-Specific Materials (Investor, Partnership)

**Format:** `DESCRIPTIVE_TITLE.md` in audience-specific folder

**Folder Structure:**
- `investor_materials/` for funder/investor-specific documents
- `partnership_materials/` for strategic partner documents
- `application_materials/` for application submissions (not yet populated)
- `public_materials/` for public-facing materials (not yet populated)

**Characteristics:**
- UPPERCASE_SNAKE_CASE (same as Tier 1, showing production-ready status)
- Folder placement indicates audience (not repeated in filename)
- Should be more specific than Tier 1 docs (e.g., "APPLICATION_SAMPLES" not just "APPLICATIONS")
- Reference source Tier 1 strategy doc if derived from it

**Investor Materials Examples:**
- ✅ `investor_materials/APPLICATION_SAMPLES.md` — Fellowship/grant templates
- ✅ `investor_materials/INVESTMENT_DECK.md` — (hypothetical) pitch deck for VC funders

**Partnership Materials Examples:**
- ✅ `partnership_materials/ADVISORY_COUNCIL_INVITATION.md` — Advisory recruitment
- ✅ `partnership_materials/GOETHE_INSTITUT_APPLICATION.md` — German cultural partner
- ✅ `partnership_materials/[FUNDER_NAME]_PARTNERSHIP_PROPOSAL.md` — (future) org-specific proposals

**Anti-patterns (avoid):**
- ❌ `investor_materials/ford-foundation-proposal.md` (lowercase; too specific to folder)
- ❌ `investor_materials/samples.md` (too vague)
- ❌ `investor_materials/APPLICATIONS_AND_PROPOSALS_AND_SAMPLES.md` (too long and vague)
- ❌ `FORD_FOUNDATION_PROPOSAL.md` in root strategic folder (should be in investor_materials with proper folder structure)

**Naming for Funder-Specific Documents:**
If an entire document is tailored to a single funder, use format: `[FUNDER]_[DOCUMENT_TYPE].md`

Examples:
- `FORD_FOUNDATION_PROPOSAL.md`
- `USAID_PARTNERSHIP_AGREEMENT.md`
- `LUMINATE_ELECTORAL_ACCOUNTABILITY_PROPOSAL.md`

These should be in appropriate audience folder (e.g., `investor_materials/FORD_FOUNDATION_PROPOSAL.md`)

---

### Tier 3: Research Foundation Documents

**Format:** `lowercase-kebab-case.md`

**Characteristics:**
- Lowercase signals "supporting research" vs. "authoritative strategy"
- Words separated by hyphens (kebab-case)
- More descriptive than Tier 1 (provides detailed context in filename)
- Can be longer and more specific than Tier 1 names
- Subfolders allowed for research subcategories (e.g., `market-research/`, `technical-research/`)

**Current Examples:**
- ✅ `research_foundation/philosophical-foundations.md` — Philosophical underpinnings
- ✅ `research_foundation/market-validation-study.md` — Commercial viability research
- ✅ `research_foundation/01-technical-implementation-scraping-strategy.md` — Technical how-to guide

**Naming Patterns:**

**For Research Studies:**
- `{topic}-{research-type}-study.md`
- Examples: `market-validation-study.md`, `user-research-findings.md`, `competitive-analysis-study.md`

**For Technical Guides:**
- `{order-number}-{topic}-{guide-type}.md` (optional numbering for sequenced docs)
- Examples: `01-web-scraping-implementation.md`, `data-pipeline-architecture.md`

**For Philosophical/Conceptual Analysis:**
- `{subject}-{type}-analysis.md` or `{subject}-foundations.md`
- Examples: `philosophical-foundations.md`, `brand-positioning-analysis.md`

**Anti-patterns (avoid):**
- ❌ `PHILOSOPHICAL_FOUNDATIONS.md` (should be lowercase for research; CAPS signals Tier 1 strategy)
- ❌ `Philosophical-Foundations.md` (mixed case; use lowercase)
- ❌ `phil_found.md` (too abbreviated)
- ❌ `chanuka-philosophical-analysis.md` (project name unnecessary; too long)
- ❌ `philosophical_foundations.md` (use hyphens not underscores for Tier 3)

**When to Create Tier 3 Documents:**
- Research, analysis, or methodology supporting Tier 1 strategy
- Technical implementation guides and how-tos
- Market studies, user research, competitive analysis
- Philosophical or conceptual exploration
- Literature reviews or background briefings

**Tier 3 Subfolder Structure (Optional):**
As research foundation grows, may organize into subfolders:
- `research_foundation/market-research/` — Commercial studies
- `research_foundation/technical/` — Technical implementation guides
- `research_foundation/philosophy/` — Conceptual and philosophical work

---

### Tier 4: Public Materials

**Format:** TBD (to be established as public materials created)

**Current Status:** Tier reserved; no documents yet published

**Future Guidance (Placeholder):**
When public materials created, should use:
- **Option A:** Same as Tier 1 (UPPERCASE_SNAKE_CASE) — signals "public-ready strategic content"
- **Option B:** Simpler format (e.g., Title Case) — for web/public consumption
- **TBD:** Will establish standard once first public materials created

---

### Tier 5: Archive Documents

**Format:** `{original-name}_original_v{version}.md` or `{name}_draft_v{version}.md`

**Characteristics:**
- Original filename preserved (to maintain historical reference)
- Version notation added in standardized format: `_original_v1.0` or `_draft_v1.0`
- Placed in `_archive/iteration_history/` (invisible from main workflow)
- Never modified after archiving (preserved as immutable historical record)

**Version Notation Explained:**
- `_original_v1.0` — This was the primary version that was consolidated into a new Tier 1 document
- `_draft_v1.0` — This was a draft or secondary version that was superseded
- `_alt_v1.0` — This was an alternative approach that was not adopted

**Examples:**
- ✅ `_archive/iteration_history/api_strategy_doc_original_v1.0.md` — Original API strategy doc (consolidated into TECHNICAL_ARCHITECTURE.md)
- ✅ `_archive/iteration_history/chanuka_brand_roadmap_draft_v1.0.md` — Draft brand roadmap (consolidated into BRAND_STRATEGY.md)
- ✅ `_archive/iteration_history/Strategic_Funding_Plan_original_v1.0.md` — Original funding plan (consolidated into FUNDING_STRATEGY.md)

**Consolidation Record Format:**

When archiving files that were consolidated, maintain this structure:

```
_archive/
├── iteration_history/
│   └── [All consolidated source files with version notation]
└── consolidation_records/
    └── [Consolidation metadata, if detailed records needed]
```

**Archive Preservation Rules:**
- Never delete archived files
- Never modify archived file content
- Use version notation consistently
- Include consolidation date in separate log file (VERSION_CONTROL_LOG.md)

---

## NAMING FOR FUTURE DOCUMENT TYPES

### If Creating Topic-Specific Folders

**Example: Expanding research_foundation/**

Possible subfolders:
- `research_foundation/market-research/` → files: `user-interview-findings.md`, `competitive-landscape-analysis.md`
- `research_foundation/technical/` → files: `django-integration-guide.md`, `api-data-model-specification.md`
- `research_foundation/philosophy/` → files: `ubuntu-based-governance-analysis.md`, `democratic-participation-theory.md`

**Sub-folder Naming:**
- Use `lowercase-kebab-case`
- Names should be plural or aggregating (e.g., `market-research/` not `market-research-doc/`)

### If Creating Correspondence or Time-Sensitive Documents

**Format:** `YYYYMMDD_{topic}_{document-type}.md`

Example:
- `20260315_Ford_Foundation_Email_Exchange.md`
- `20260320_Partner_Meeting_Notes.md`

**Rationale:** Date prefix enables chronological sorting; useful for correspondence, meeting notes, decision logs

---

## SPECIAL NAMING SITUATIONS

### Documents with Multiple Versions Under Active Development

**Situation:** You're working on multiple versions of same document and need to track them

**DO THIS:**
1. Work on document with standard name (e.g., `DOCUMENT_NAME.md`)
2. When ready to archive a draft: Move to archive with `_draft_v1.0` notation
3. Continue improving main document under standard name
4. Once finalized, update version in consolidated document (e.g., "Version 1.2")

**DON'T DO THIS:**
❌ Create files like `DOCUMENT_NAME_v1.md`, `DOCUMENT_NAME_v2.md` in active folder
❌ Use multiple filenames for same concept in active tier

### Documents Awaiting Decision/Review

**Situation:** Document written but not yet approved for publication

**Naming:** Use standard name for intended tier (don't rename for draft status)

Document status tracked separately in DOCUMENT_MANIFEST.md, not in filename

Examples:
- `STRATEGIC_EXPANSION_PLAN.md` (being reviewed, but still uses Tier 1 naming)
- Status in metadata: "In development, awaiting board approval"

---

## CASE SENSITIVITY & SPACES

### Consistent Spacing Rules

**Tier 1 & 2 (UPPERCASE):**
- Use underscores only: `BRAND_STRATEGY`, not `BRAND STRATEGY` or `BRAND-STRATEGY`
- No spaces in filenames (Windows/Unix compatibility)

**Tier 3 (lowercase):**
- Use hyphens only: `market-validation-study`, not `market_validation_study` or `market validation study`
- No spaces in filenames

**Archive:**
- Preserve original spacing/style if different from current convention
- Add standardized version notation with underscores: `ORIGINAL_FILE_NAME_original_v1.0.md`

### File Extension

- **Always:** `.md` (markdown)
- **Never:** `.MD` (case consistency)
- **Never:** `.txt`, `.doc`, `.docx` (use markdown for all strategy documents)

---

## IMPLEMENTATION & MIGRATION

### For Existing Documents

**Already in correct format:**
- BRAND_STRATEGY.md ✅
- TECHNICAL_ARCHITECTURE.md ✅
- VALIDATION_FRAMEWORK.md ✅
- FUNDING_STRATEGY.md ✅
- BRAND_EXPRESSIONS.md ✅
- FOUNDER_BRIEF.md ✅
- APPLICATION_SAMPLES.md ✅
- ADVISORY_COUNCIL_INVITATION.md ✅
- GOETHE_INSTITUT_APPLICATION.md ✅
- philosophical-foundations.md ✅
- market-validation-study.md ✅
- technical-implementation-scraping-strategy.md ✅

**Archived with version notation:**
- api_strategy_doc_original_v1.0.md ✅
- chanuka_brand_roadmap_draft_v1.0.md ✅
- + 13 additional files ✅

### For New Documents

**Board Approval Process:**

Before creating new Tier 1 document:
1. Propose name following UPPERCASE_SNAKE_CASE format
2. Get strategy team approval
3. Create with appropriate header and metadata

Before creating new Tier 3 document:
1. Ensure lowercase-kebab-case format
2. Place in research_foundation/ with appropriate subfolder
3. Link from DOCUMENT_MANIFEST.md when created

---

## NAMING REVIEW CHECKLIST

When creating a new document, verify:

- [ ] **Tier selected correctly?** (Which tier best fits this content?)
- [ ] **Folder placement appropriate?** (Strategic/investor_materials/partnership_materials/research_foundation?)
- [ ] **Case style matches tier?** (UPPERCASE_SNAKE_CASE for Tiers 1-2, lowercase-kebab-case for Tier 3?)
- [ ] **Name is concise but descriptive?** (Can someone understand purpose from filename alone?)
- [ ] **No redundancy with folder?** (Don't include folder name in filename: not "investor_materials_APPLICATION_SAMPLES.md")
- [ ] **No project name in filename?** (Not "chanuka_" prefix unless truly Chanuka-specific vs. framework)
- [ ] **Special characters?** (Only hyphens in Tier 3, only underscores in Tiers 1-2; no spaces)
- [ ] **File extension is .md?** (Lowercase, markdown format)
- [ ] **Updated DOCUMENT_MANIFEST.md?** (New document listed in manifest?)

---

## QUESTIONS & DECISIONS

### Q: Can I use abbreviations?
**A:** Prefer full words for clarity. Only abbreviate if:
- Abbreviation is widely recognized (e.g., "API", "TAM", "WTP")
- Full name would make filename excessively long
- Abbreviation appears in official organization name (e.g., "GOETHE_INSTITUT")

Examples:
- ✅ TECHNICAL_ARCHITECTURE (not ARCH)
- ✅ FUNDING_STRATEGY (not FUN_STRAT)
- ✅ GOETHE_INSTITUT_APPLICATION (official name includes abbreviated form)
- ❌ BRAND_STRAT (avoid: no consistency gain)

### Q: Can I change a filename after creation?
**A:** Avoid after publication. If must change:
1. Update DOCUMENT_MANIFEST.md
2. Update all cross-references in other documents
3. Consider archiving old version if significant name change
4. Note change in VERSION_CONTROL_LOG.md

### Q: What if I have a document that fits multiple tiers?
**A:** Place in primary tier and reference from others.

Example: Market research that informs strategy
- **Primary location:** `research_foundation/market-validation-study.md` (Tier 3, because it's research)
- **Reference in:** FUNDING_STRATEGY.md (Tier 1 strategic document links to it)
- **Why:** Separates research from strategy; enables reuse of research across multiple strategies

### Q: Should archive files be visible in main workspace?
**A:** No. Archive in `_archive/` folder to keep out of active workflow. Key tool: DOCUMENT_MANIFEST.md provides complete reference to all documents, including archives.

---

## FUTURE CONSIDERATIONS

### If Documentation Grows Beyond Current Tiers

Potential future structures:
- **Subdomains:** By topic area (Operations, Product, Finance, Leadership)
- **Timeline tiers:** By date (2026 Priority, 2027 Planning, Long-term Vision)
- **Audience segmentation:** By reader type (Board, Team, Public, Investors)

When scaling, maintain:
- **Consistency:** Same case/style conventions
- **Clarity:** Naming still self-explanatory
- **Discoverability:** DOCUMENT_MANIFEST.md grows to accommodate new structure

---

## CONTACT & QUESTIONS

For naming questions or to propose new conventions:
1. Review this document first
2. Check with strategy team if unsure
3. Maintain consistency with existing patterns
4. Update this document if new pattern established

**Maintained by:** Strategy & Documentation Team  
**Last review:** March 2026  
**Next review scheduled:** Q3 2026 (quarterly review of organizational structure)

---

*This naming convention system is designed to scale with Chanuka's documentation as it grows. New tiers, subfolders, or patterns may be added as the organization evolves.*
