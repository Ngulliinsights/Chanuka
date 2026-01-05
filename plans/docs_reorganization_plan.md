# Documentation Reorganization Plan

## Proposed Structure

The `docs/` directory will be reorganized with the following subdirectories:

- `guides/` (new) - Implementation tutorials and step-by-step guides
- `architecture/` (existing) - Technical design documents and system architecture
- `reports/` (new) - Status updates, summaries, and analysis reports
- `chanuka/` (existing) - Chanuka platform-specific documentation
- `consolidated/` (existing) - Consolidated project guides and overviews
- `reference/` (existing) - Reference materials, research, and foundational documents
- `archive/` (existing) - Archived documentation
- `active/` (existing) - Active development guides

## File Movements

### To `docs/chanuka/`
- `chanuka idea validation.md` - Chanuka-specific idea validation document
- `chanuka idea validation.txt` - Chanuka-specific idea validation notes

### To `docs/reference/`
- `Constitutional Normalization in Kenya_ The CDF Paradigm and the Erosion of Democratic Memory.md` - Academic research on constitutional normalization
- `constitutional-normalization-study.md` - Study on constitutional normalization
- `Detecting Legislative Pretext_ A Framework.md` - Framework for detecting legislative pretext
- `Grounding Constitutional Analysis in Pragmatism.md` - Pragmatic approach to constitutional analysis
- `Kenyan Civic Tech Data Research Plan.md` - Research plan for Kenyan civic tech data
- `Kenyan Constitutionalism Research Synthesis.md` - Synthesis of Kenyan constitutionalism research
- `Kenyan Legislative Challenges and Judicial Outcomes Database - Table 1.csv` - Database of legislative challenges
- `Kenyan Legislative Data Generation Plan.md` - Plan for generating legislative data
- `Kenyan Legislative Intelligence Database Project.md` - Project documentation for legislative intelligence database
- `Legislative Relationship Mapping Framework.md` - Framework for mapping legislative relationships
- `Operationalizing Academic Research for Impact.md` - Guide to operationalizing academic research
- `relationship-mapping-framework.md` - Framework for relationship mapping
- `Research Strategy for Kenyan Constitutionalism.md` - Research strategy document
- `prompt-1-constitutional-vulnerabilities.md` - Research prompt on constitutional vulnerabilities
- `prompt-2-underutilized-strengths.md` - Research prompt on underutilized strengths
- `prompt-3-elite-literacy-loopholes.md` - Research prompt on elite literacy loopholes
- `prompt-4-public-participation.md` - Research prompt on public participation
- `prompt-5-trojan-bills.md` - Research prompt on trojan bills
- `prompt-6-ethnic-patronage.md` - Research prompt on ethnic patronage
- `database-research-prompt.md` - Prompt for database research
- `data-entry-templates.json` - Templates for data entry

### To `docs/guides/`
- `MVP-DATABASE-INTEGRATION-GUIDE.md` - Guide for MVP database integration
- `functional-validator-guide.md` - Guide for functional validation
- `research-implementation-guide.md` - Guide for implementing research
- `IMPORT_MAPPING_GUIDE.md` - Guide for import mapping
- `phase1-quick-reference.md` - Quick reference for phase 1
- `quick-reference-guide.md` - General quick reference guide
- `project-structure.md` - Guide to project structure

### To `docs/architecture/`
- `INHERITANCE_COMPOSITION_ANALYSIS.md` - Analysis of inheritance and composition
- `FINAL-SCHEMA-INTEGRATION-ZERO-REDUNDANCY.md` - Final schema integration design
- `REVISED-SCHEMA-INTEGRATION-FOCUSED.md` - Revised schema integration design
- `docs-module.md` - Documentation module design

### To `docs/reports/`
- `CLIENT_FIXES_FINAL_SUMMARY.md` - Summary of client fixes
- `CLIENT_VALIDATION_COMPLETE.md` - Completion report for client validation
- `COLLECTION-SUMMARY.md` - Summary of collections
- `CRITICAL_FIXES_SUMMARY.md` - Summary of critical fixes
- `DESIGN_SYSTEM_COMPLETE.md` - Completion report for design system
- `DOCUMENTATION_ORGANIZATION_COMPLETE.md` - Completion report for documentation organization
- `DOCUMENTATION_ORGANIZATION_INDEX.md` - Index of documentation organization
- `DOCUMENTATION_ORGANIZATION_SUMMARY.md` - Summary of documentation organization
- `ERROR_HANDLING_INTEGRATION_SUMMARY.md` - Summary of error handling integration
- `FEATURE_COMPLETENESS_ANALYSIS.md` - Analysis of feature completeness
- `Framework Deployment Ready_ Final Steps.md` - Final steps for framework deployment
- `Framework Progress and Next Steps.md` - Progress and next steps for framework
- `IMPORT_FIX_EXECUTION_PLAN.md` - Execution plan for import fixes
- `MASTER-SUMMARY.md` - Master summary of project
- `RECOVERY_UI_FIX_SUMMARY.md` - Summary of UI recovery fixes
- `RESOLUTION_STATUS_REPORT.md` - Report on resolution status
- `RESOLVED_ISSUES_INDEX.md` - Index of resolved issues
- `SHARED_UI_BUG_ANALYSIS.md` - Analysis of shared UI bugs
- `SHARED_UI_FIX_PLAN.md` - Plan for shared UI fixes
- `SHARED_UI_FIXES_IMPLEMENTED.md` - Report of implemented shared UI fixes
- `SHARED_UI_GUIDELINES.md` - Guidelines for shared UI
- `SHARED_UI_IMPLEMENTATION_COMPLETE.md` - Completion report for shared UI implementation
- `SHARED_UI_IMPLEMENTATION_SUMMARY.md` - Summary of shared UI implementation
- `THREE-PROMPTS-SUMMARY.md` - Summary of three prompts
- `TYPE_SYSTEM_AUDIT_REPORT.md` - Report on type system audit
- `TYPE_SYSTEM_COMPLETION_SUMMARY.md` - Summary of type system completion
- `TYPE_SYSTEM_FIXES_PHASE1.md` - Phase 1 fixes for type system
- `TYPE_SYSTEM_MIGRATION.md` - Migration plan for type system
- `TYPE_SYSTEM_QUICK_REFERENCE.md` - Quick reference for type system
- `TYPE_SYSTEM_REMEDIATION_COMPLETE.md` - Completion report for type system remediation
- `TYPESCRIPT_ERROR_ANALYSIS.md` - Analysis of TypeScript errors
- `TYPESCRIPT_FIXES_APPLIED.md` - Report of applied TypeScript fixes
- `COMPLETED_ISSUES_ARCHIVE_README.md` - README for completed issues archive
- `CLIENT_DEEP_DIVE_ANALYSIS.md` - Deep dive analysis of client
- `fix-implementation-phase1.md` - Phase 1 fix implementation
- `functional-validation.md` - Functional validation report
- `import-analysis.md` - Analysis of imports
- `import-export-analysis.md` - Analysis of import/export
- `import-resolution-report.md` - Report on import resolution
- `race-condition-analysis.md` - Analysis of race conditions
- `runtime-diagnostics.md` - Runtime diagnostics report
- `export-analysis-updated.md` - Updated export analysis
- `export-analysis.md` - Export analysis

### Files to Remain at Root
- `index.md` - Main documentation index

## Reasoning

- **guides/**: Contains practical, step-by-step guides for implementation, tutorials, and quick references to help developers get started and perform tasks.
- **architecture/**: Focuses on technical design, system architecture, and integration designs that describe how the system is structured.
- **reports/**: Aggregates all status updates, completion summaries, analysis reports, and progress documents for tracking project status and outcomes.
- **chanuka/**: Dedicated to Chanuka platform-specific content, keeping related documents together.
- **reference/**: Houses foundational research, academic papers, frameworks, and reference materials that provide background and context.
- **consolidated/**: Already contains consolidated guides, so utilized for project-level overviews.
- **archive/** and **active/**: Already well-organized, no changes needed.

This reorganization improves discoverability by grouping similar document types and reduces clutter in the root directory.