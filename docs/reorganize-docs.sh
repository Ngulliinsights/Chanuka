#!/bin/bash
# Docs Reorganization Script

cd "$(dirname "$0")"

# Create new structure
mkdir -p strategy technical guides

# === STRATEGIC (Business/Funding - Don't commit) ===
mv chanuka/chanuka_brand_roadmap.md strategy/ 2>/dev/null
mv chanuka/chanuka_automation_strategy.md strategy/ 2>/dev/null
mv chanuka/api_strategy_doc.md strategy/ 2>/dev/null
mv reference/brand-roadmap.md strategy/ 2>/dev/null
mv reference/chanuka_email_templates.md strategy/ 2>/dev/null
mv reference/chanuka_funder_table\ \(1\).md strategy/ 2>/dev/null
mv reference/Chanuka_Funding_Pitch.md strategy/ 2>/dev/null
mv reference/kba_pitch_deck.md strategy/ 2>/dev/null
mv reference/Strategic\ Funding\ and\ Networking\ Plan.md strategy/ 2>/dev/null
mv reference/Data\ Strategy\ for\ Chanuka\ Launch.md strategy/ 2>/dev/null
mv chanuka/chanuka\ idea\ validation.md strategy/ 2>/dev/null
mv chanuka/chanuka\ idea\ validation.txt strategy/ 2>/dev/null
mv reference/Chanuka\ Validation_\ A\ Rigorous\ Plan.md strategy/ 2>/dev/null
mv reference/Validating\ Legislative\ Intelligence\ Market.md strategy/ 2>/dev/null
mv reference/Validating\ Parliamentary\ Compliance\ Infrastructure.md strategy/ 2>/dev/null

# === TECHNICAL (Architecture/Development) ===
mv BOUNDARY_DEFINITIONS.md technical/
mv CODEBASE_CONTEXT.md technical/
mv IMPORT_PATH_GOVERNANCE.md technical/
mv MIGRATION_LOG.md technical/
mv race-condition-analysis.md technical/
mv architecture/application-flow.md technical/
mv architecture/architecture.md technical/
mv architecture/docs-module.md technical/
mv architecture/schema-domain-relationships.md technical/

# === GUIDES (Developer docs) ===
mv active/configuration-guide.md guides/
mv active/developer-onboarding.md guides/
mv active/setup.md guides/
mv active/troubleshooting-guide.md guides/
mv reference/api-consumer-guide.md guides/
mv reference/documentation-standards.md guides/
mv reference/maintenance-process.md guides/
mv reference/user-manual.md guides/

# === ARCHIVE (Completed/Old) ===
mv GOVERNOR_INTEGRATION_PHASE1.md archive/
mv architecture/CORE_INTEGRATION_STATUS.md archive/
mv architecture/FEATURES_INTEGRATION_STATUS.md archive/
mv architecture/SHARED_INTEGRATION_STATUS.md archive/
mv architecture/FINAL-SCHEMA-INTEGRATION-ZERO-REDUNDANCY.md archive/
mv architecture/REVISED-SCHEMA-INTEGRATION-FOCUSED.md archive/
mv architecture/INHERITANCE_COMPOSITION_ANALYSIS.md archive/
mv architecture/chanuka_architecture.txt archive/
mv chanuka/CHANUKA_CLIENT_COMPREHENSIVE_ANALYSIS.md archive/
mv chanuka/CHANUKA_CLIENT_DEEP_DIVE_ANALYSIS.md archive/
mv chanuka/chanuka_platform_client_improvement_recommendations.md archive/
mv chanuka/missing-strategic-features-analysis.md archive/
mv chanuka/strategic-ui-features-analysis.md archive/

# === DELETE (Redundant/Obsolete) ===
rm -f project-structure.md
rm -f chanuka/chanuka\ architecture2.md
rm -f chanuka/chanuka_design.txt
rm -f chanuka/chanuka_implementation_unified.txt
rm -f chanuka/chanuka_requirements.txt
rm -f reference/chanuka_implementation_guide.md
rm -f reference/chanuka_requirements.txt
rm -f reference/project-structure.md
rm -f reference/project-structure-comparison.md
rm -f reference/schema_analysis.md
rm -f reference/index.md
rm -f reference/API.md

# === KEEP IN PLACE (Reference/Research) ===
# Constitutional research, frameworks, HTML files stay in reference/
# Poems, slogans, design specs stay in chanuka/
# AI code review, frameworks stay in architecture/

# Clean up empty directories
rmdir active 2>/dev/null
rmdir plans 2>/dev/null

echo "✅ Docs reorganization complete!"
echo ""
echo "📁 New structure:"
echo "  - strategy/     (DON'T COMMIT - business/funding)"
echo "  - technical/    (architecture, governance, migrations)"
echo "  - guides/       (developer onboarding, setup, APIs)"
echo "  - archive/      (completed migrations, old analysis)"
echo "  - reference/    (research, constitutional, frameworks)"
echo "  - chanuka/      (brand, design, philosophical)"
echo "  - architecture/ (AI review, frameworks)"
