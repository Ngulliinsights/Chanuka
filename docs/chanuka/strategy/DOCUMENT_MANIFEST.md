# CHANUKA STRATEGY DOCUMENT MANIFEST
*Complete Inventory and Metadata Reference*

**Last Updated:** March 2026  
**Maintained By:** Strategy Team  
**Version:** 1.0  

---

## OVERVIEW

This manifest provides a complete inventory of all Chanuka strategy documents, organized by tier and including metadata for each document: purpose, audience, status, version history, and cross-references.

**Total Documents:** 15 consolidated + 8 metadata = 23 active documents  
**Archive Documents:** 15 source files (version history preserved)  
**Last Major Consolidation:** January 2026

---

## TIER 1: STRATEGIC FOUNDATION LAYER

These documents establish Chanuka's core strategy, theory of change, and philosophical foundations. Intended for internal alignment and institutional partnerships.

### Strategic Tier: Core Strategic Documents

| Document | Purpose | Audience | Status | Created | Last Updated | Version |
|---|---|---|---|---|---|---|
| **BRAND_STRATEGY.md** | Comprehensive brand positioning, 6-phase brand evolution (Foundation→Personality→Identity→Messaging→Content→Launch) | Internal team, institutional partners, brand partners | Complete, Production-ready | Jan 2026 | Jan 2026 | 1.0 |
| **TECHNICAL_ARCHITECTURE.md** | Technical implementation roadmap: API architecture analysis (7 paradigms analyzed), data acquisition strategy (3-tier), operational automation (6 personas) | Technical team, technology partners, developer documentation | Complete, Production-ready | Jan 2026 | Jan 2026 | 1.0 |
| **VALIDATION_FRAMEWORK.md** | Comprehensive validation methodology: market validation, adversarial testing, claims audit, risk scenarios (Part 1-3) | Research team, institutional partners for validation | Complete, Production-ready | Jan 2026 | Jan 2026 | 1.0 |
| **FUNDING_STRATEGY.md** | 2026 funding roadmap: Big Three foundations (Ford, Luminate, OSF), USAID electoral funding, 2026 event calendar, 95 funder targets with contact verification | Fundraising team, board, institutional partners | Complete, Active (rolling implementation) | Jan 2026 | Mar 2026 | 1.2 |
| **BRAND_EXPRESSIONS.md** | Three-layer brand messaging system: 95 slogans (organized by theme), complete poem cycle (30+ poems), platform integration guide | Marketing, communications, platform UX teams | Complete, Production-ready | Jan 2026 | Jan 2026 | 1.0 |
| **FOUNDER_BRIEF.md** | Internal strategic memo on democratic infrastructure, inflection points, urgency of the moment, governance crisis | Founder, board, strategic partners | Reference | Mar 2026 | Mar 2026 | 1.0 |

### Strategic Tier: Consolidated Foundation Documents

*Consolidated from earlier iterations; now part of strategic reference layer*

| Document | Consolidates | Audience | Purpose | Status |
|---|---|---|---|---|
| **Strategic Foundation** | BRAND_STRATEGY + FOUNDATION documents | Internal | Establish brand architecture and positioning | Integrated into BRAND_STRATEGY.md |
| **Validation Integrated** | 3 validation sources | Research team | Market, adversarial, and claims validation unified | Integrated into VALIDATION_FRAMEWORK.md |
| **Technical Complete** | API strategy + Data strategy + Automation | Technical team | API, data, operations architecture unified | Integrated into TECHNICAL_ARCHITECTURE.md |
| **Funding Master** | Strategic plan + Funder table | Fundraising | Institutional strategy + contact database unified | Integrated into FUNDING_STRATEGY.md |
| **Brand Master** | Slogans + Poems + Strategic additions | Communications | Messaging architecture complete with all expressions | Integrated into BRAND_EXPRESSIONS.md |

---

## TIER 2: INVESTOR & PARTNERSHIP MATERIALS

Documents designed for specific audiences: funders, partners, advisors. Tailored framing and audience-specific value propositions.

### Investor Materials Folder

| Document | Purpose | Audience | Status | Created |
|---|---|---|---|---|
| **APPLICATION_SAMPLES.md** | Curated collection of fellowship and grant applications (Code for Africa, USAID, etc.) with tailored framing for each audience | Fellowship committees, grant review boards, funder evaluation teams | Complete | Mar 2026 |

### Partnership Materials Folder

| Document | Purpose | Audience | Status | Created |
|---|---|---|---|---|
| **ADVISORY_COUNCIL_INVITATION.md** | Candid invitation to prospective advisors; emphasizes developmental stage; theory of change explanation | Prospective advisory council members, networks of existing advisors | Complete | Mar 2026 |
| **GOETHE_INSTITUT_APPLICATION.md** | Cultural mobility grant application positioning Chanuka as civic design + media art practice; emphasizes artistic and cultural dimensions | Goethe-Institut review boards, cultural partnership organizations | Complete | Mar 2026 |

---

## TIER 3: RESEARCH FOUNDATION LAYER

Foundational research, philosophical analysis, market studies, and technical implementation guides. Supporting evidence for strategic positions.

### Research Foundation Folder

| Document | Category | Purpose | Audience | Status | Created |
|---|---|---|---|---|---|
| **philosophical-foundations.md** | Philosophy | Thematic analysis connecting threshold poems ("Inheritance of Dust," "The Republic of Silence") to 20-poem main cycle; structural and conceptual connections | Educators, cultural partners, deep-dive audiences | Reference | Mar 2026 |
| **market-validation-study.md** | Market Research | Commercial viability assessment of legislative intelligence platform; 20 structured interviews across banks, law firms, donor organizations; TAM analysis, WTP findings, strategic pivots | Business team, investors, strategic partners | Complete | Mar 2026 |
| **01-technical-implementation-scraping-strategy.md** | Technical Research | Web scraping implementation guide for parliament.go.ke; Drupal CMS challenges, PDF parsing requirements, multi-subdomain architecture | Development team, technical partners | Complete | Mar 2026 |

---

## TIER 4: PUBLIC MATERIALS

*To be populated as public website/communication materials are created*

Current status: Tier reserved; no documents yet published. Audience-facing materials to be developed from strategic foundation documents.

---

## TIER 5: ARCHIVE LAYER

Version history and iteration records. All superseded documents preserved with datestamps for audit trail and reference.

### Archive Structure: iteration_history/

**Consolidation Records:** (Each consolidated file archived with source notation)

| Original Files | Consolidated Into | Archive Path | Date Archived |
|---|---|---|---|
| brand-roadmap.md + chanuka_brand_roadmap.md | BRAND_STRATEGY.md | brand-roadmap_original_v1.0.md | Jan 2026 |
| chanuka_brand_roadmap.md | BRAND_STRATEGY.md | chanuka_brand_roadmap_draft_v1.0.md | Jan 2026 |
| chanuka idea validation.md + Chanuka Validation_ A Rigorous Plan.md + ASPIRATIONAL_CLAIMS_AUDIT.md | VALIDATION_FRAMEWORK.md | [3 files archived with _original_v1.0 notation] | Jan 2026 |
| api_strategy_doc.md + Data Strategy for Chanuka Launch.md + chanuka_automation_strategy.md | TECHNICAL_ARCHITECTURE.md | [3 files archived with _original_v1.0 notation] | Jan 2026 |
| Strategic Funding and Networking Plan.md + chanuka_funder_table (1).md | FUNDING_STRATEGY.md | [2 files archived with _original_v1.0 notation] | Jan 2026 |
| chanuka_complete_slogans.md + chanuka_final_poems.md + strategic_additions_poems.md | BRAND_EXPRESSIONS.md | [3 files archived with _original_v1.0 notation] | Jan 2026 |

**Archive Location:** `_archive/iteration_history/` (15 source files preserved)

---

## DOCUMENT RELATIONSHIP MAP

### Strategic Hierarchy

```
Tier 1: STRATEGIC FOUNDATION (5 major documents)
├── BRAND_STRATEGY
├── TECHNICAL_ARCHITECTURE
├── VALIDATION_FRAMEWORK
├── FUNDING_STRATEGY
└── BRAND_EXPRESSIONS

Tier 2: AUDIENCE-SPECIFIC MATERIALS (3 documents)
├── investor_materials/
│   └── APPLICATION_SAMPLES
├── partnership_materials/
│   ├── ADVISORY_COUNCIL_INVITATION
│   └── GOETHE_INSTITUT_APPLICATION
└── strategic/
    └── FOUNDER_BRIEF

Tier 3: RESEARCH FOUNDATION (3 documents)
├── philosophical-foundations
├── market-validation-study
└── technical-implementation-scraping-strategy
```

### Cross-Document Dependencies

| Document | Depends On | Referenced By |
|---|---|---|
| **BRAND_STRATEGY** | Theory of change implicitly throughout | BRAND_EXPRESSIONS, APPLICATION_SAMPLES |
| **TECHNICAL_ARCHITECTURE** | Market assumptions from VALIDATION_FRAMEWORK | None yet |
| **VALIDATION_FRAMEWORK** | Market context from FUNDING_STRATEGY | TECHNICAL_ARCHITECTURE (data strategy) |
| **FUNDING_STRATEGY** | Market findings from market-validation-study | FOUNDER_BRIEF (context) |
| **BRAND_EXPRESSIONS** | Philosophical framework from philosophical-foundations | Social media integration (TBD) |
| **FOUNDER_BRIEF** | Strategic foundation from Tier 1 documents | Internal reference only |
| **market-validation-study** | Technical feasibility from TECHNICAL_ARCHITECTURE | FUNDING_STRATEGY (customer segments) |

---

## METADATA STANDARDS

### Document Header Format

All active documents include:

```markdown
# DOCUMENT TITLE
*Subtitle or document type*

## Document Consolidation History / Document Context
- Sources merged (if applicable)
- Audience(s)
- Status

## Version Notes
- Key insight notes
- Consolidation rationale (if applicable)
```

### Status Classifications

- **Complete, Production-ready:** Fully written, reviewed, ready for use by intended audience
- **Complete, Active (rolling implementation):** Written but subject to updates as external conditions change (e.g., FUNDING_STRATEGY as 2026 unfolds)
- **Reference:** Standby document for context or background understanding
- **In Development:** Being actively worked on

### Audience Classifications

- **Internal team:** Founder, core team members
- **Strategic partners:** Institutions working closely with Chanuka
- **Institutional partners:** Funders, advisors, board members
- **Research team:** Specific department/working group
- **Public-facing:** Audience outside the organization
- **TBD:** Audience not yet defined

---

## NAMING CONVENTIONS

### Active Documents (Strategic Foundation & Tier 2)

**Format:** `UPPERCASE_SNAKE_CASE.md`

Examples:
- `BRAND_STRATEGY.md`
- `TECHNICAL_ARCHITECTURE.md`
- `VALIDATION_FRAMEWORK.md`
- `FOUNDER_BRIEF.md`

**Rationale:** ALL CAPS signals "authoritative, production-ready strategic document" vs. lowercase signals "working document or research."

### Research & Reference Documents (Tier 3)

**Format:** `lowercase-kebab-case.md`

Examples:
- `philosophical-foundations.md`
- `market-validation-study.md`
- `technical-implementation-scraping-strategy.md`

**Rationale:** Lowercase signals "supporting research" vs. strategic tier UPPERCASE documents.

### Audience-Specific Materials (Tier 2)

**Format:** `TITLE_CASE_WITH_UNDERSCORES.md` in audience folder

Examples:
- `APPLICATION_SAMPLES.md` (in investor_materials/)
- `ADVISORY_COUNCIL_INVITATION.md` (in partnership_materials/)
- `GOETHE_INSTITUT_APPLICATION.md` (in partnership_materials/)

**Rationale:** Folder structure indicates audience; title case indicates specific, tailored content.

### Archive Documents

**Format:** `{original-name}_original_v1.0.md` or `{description}_draft_v1.0.md`

Examples:
- `brand-roadmap_original_v1.0.md`
- `chanuka_brand_roadmap_draft_v1.0.md`
- `api_strategy_doc_original_v1.0.md`

**Rationale:** Version notation indicates these are historical versions; organization into _archive/iteration_history/ makes them invisible to current workflow.

---

## CONSOLIDATION SUMMARY

### Consolidation Achievements (Jan-Mar 2026)

**8 Initial Consolidations Completed:**

1. ✅ **BRAND_STRATEGY.md** - 2 sources merged (comprehensive brand roadmap + draft) 
2. ✅ **VALIDATION_FRAMEWORK.md** - 3 sources merged (market analysis + adversarial testing + claims audit)
3. ✅ **TECHNICAL_ARCHITECTURE.md** - 3 sources merged (API architecture + data strategy + automation)
4. ✅ **FUNDING_STRATEGY.md** - 2 sources merged (strategic plan + funder/contact database) 
5. ✅ **BRAND_EXPRESSIONS.md** - 3 sources merged (slogans + poems + strategic additions)
6. ✅ **File Organization** - 5 numbered application files moved to appropriate audience folders
7. ✅ **Research Organization** - 2 research files moved to research_foundation tier
8. ✅ **Archive Structure** - 15 source files preserved in _archive/iteration_history/ with version notation

**Folder Structure Created:**
- ✅ 5-tier hierarchy (strategic, investor_materials, partnership_materials, application_materials, public_materials)
- ✅ research_foundation/ with organized research subcategories
- ✅ _archive/ with iteration_history/ and completed_applications/ subfolders

---

## NEXT STEPS FOR STRATEGY TEAM

### High Priority

1. **Cross-reference Review** - Update internal links in all documents to reflect new file locations
2. **APPLICATION_STATUS_LEGEND.md** - Create tracking document for all grant/fellowship applications (Code for Africa, USAID, etc.)
3. **STRATEGIC_LAYER_DEFINITIONS.md** - Document decision framework for where new documents belong
4. **VERSION_CONTROL_LOG.md** - Complete audit trail of all consolidations and reorganizations

### Medium Priority

5. Update README files in each folder explaining folder purpose and document organization
6. Create index files for quick navigation by audience type
7. Establish document review and update schedule
8. Create accessibility guide for non-technical stakeholders

### Low Priority

9. Develop public website version (extraction from strategic documents)
10. Create presentation decks from strategic documents
11. Build API schema for document discovery/access

---

## HOW TO USE THIS MANIFEST

### For Internal Team
Use this manifest to:
- Understand what strategic documents exist and their purpose
- Find documents relevant to your work
- Understand how documents relate to each other
- Know the version history of any given document

### For Institutional Partners
Use this to:
- Identify relevant documents for your area of focus
- Understand the landscape of Chanuka's strategic thinking
- Know which documents inform specific decisions
- Track changes and updates over time

### For Funders/Advisors
Use this to:
- Understand the depth and breadth of strategic planning
- Identify which documents address your specific interests
- See how different strategic areas interconnect
- Understand governance and documentation rigor

---

## DOCUMENT FEEDBACK & UPDATES

**For corrections or suggestions:**
- Typos or factual errors: File GitHub issue with "docs:" prefix
- Strategic questions: Bring to strategy team meeting
- Audience feedback: Report via [feedback mechanism TBD]
- Version updates needed: Contact strategy team lead

**Update Frequency:**
- FUNDING_STRATEGY.md: Rolling updates (monthly during active fundraising season)
- Other strategic documents: Annual major review or as strategy shifts
- Archive documents: Never modified (preserved as-is for historical reference)

---

*This manifest itself is version 1.0 and will be updated as new documents are created or major revisions occur.*
