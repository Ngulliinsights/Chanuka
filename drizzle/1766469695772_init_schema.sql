
-- Create custom enum types
CREATE TYPE "influence_level" AS ENUM ('high', 'medium', 'low');
CREATE TYPE "importance_level" AS ENUM ('critical', 'important', 'normal');
CREATE TYPE "vote_type" AS ENUM ('yes', 'no', 'abstain');
CREATE TYPE "bill_status" AS ENUM ('draft', 'introduced', 'committee', 'passed', 'enacted', 'failed');


-- Trojan Bill Analysis table
CREATE TABLE "trojan_bill_analysis" (
  "bill_id" UUID PRIMARY KEY REFERENCES "bills" ("id") ON DELETE CASCADE,
  "bill_name" VARCHAR(500),
  "trojan_risk_score" NUMERIC(5,2),
  "stated_purpose" TEXT,
  "hidden_provisions" JSONB NOT NULL DEFAULT '[]'::jsonb,
  "detection_method" VARCHAR(50),
  "detection_date" DATE,
  "detection_confidence" NUMERIC(3,2),
  "public_alert_issued" BOOLEAN NOT NULL DEFAULT false,
  "outcome" VARCHAR(50),
  "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
CREATE INDEX "idx_trojan_bill_analysis_risk_score" ON "trojan_bill_analysis" ("trojan_risk_score");
CREATE INDEX "idx_trojan_bill_analysis_detection_method" ON "trojan_bill_analysis" ("detection_method");
CREATE INDEX "idx_trojan_bill_analysis_outcome" ON "trojan_bill_analysis" ("outcome");
CREATE INDEX "idx_trojan_bill_analysis_detection_date" ON "trojan_bill_analysis" ("detection_date");
CREATE INDEX "idx_trojan_bill_analysis_hidden_provisions" ON "trojan_bill_analysis" USING gin ("hidden_provisions");

-- Hidden Provisions table
CREATE TABLE "hidden_provisions" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "bill_id" UUID NOT NULL REFERENCES "trojan_bill_analysis" ("bill_id") ON DELETE CASCADE,
  "provision_text" TEXT,
  "provision_location" VARCHAR(50),
  "hidden_agenda" VARCHAR(500),
  "power_type" VARCHAR(100),
  "affected_rights" JSONB NOT NULL DEFAULT '[]'::jsonb,
  "affected_institutions" JSONB NOT NULL DEFAULT '[]'::jsonb,
  "severity" VARCHAR(20),
  "detected_by" VARCHAR(100),
  "evidence" TEXT,
  "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
CREATE INDEX "idx_hidden_provisions_bill_severity" ON "hidden_provisions" ("bill_id", "severity");
CREATE INDEX "idx_hidden_provisions_power_type" ON "hidden_provisions" ("power_type");
CREATE INDEX "idx_hidden_provisions_severity" ON "hidden_provisions" ("severity");
CREATE INDEX "idx_hidden_provisions_affected_rights" ON "hidden_provisions" USING gin ("affected_rights");
CREATE INDEX "idx_hidden_provisions_affected_institutions" ON "hidden_provisions" USING gin ("affected_institutions");
CREATE INDEX "idx_hidden_provisions_text" ON "hidden_provisions" ("provision_text");

-- Trojan Techniques table
CREATE TABLE "trojan_techniques" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "bill_id" UUID NOT NULL REFERENCES "trojan_bill_analysis" ("bill_id") ON DELETE CASCADE,
  "technique_type" VARCHAR(50),
  "description" TEXT,
  "example" TEXT,
  "effectiveness_rating" INTEGER,
  "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
CREATE INDEX "idx_trojan_techniques_type" ON "trojan_techniques" ("technique_type");
CREATE INDEX "idx_trojan_techniques_effectiveness" ON "trojan_techniques" ("effectiveness_rating");
CREATE INDEX "idx_trojan_techniques_bill_type" ON "trojan_techniques" ("bill_id", "technique_type");

-- Detection Signals table
CREATE TABLE "detection_signals" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "bill_id" UUID NOT NULL REFERENCES "trojan_bill_analysis" ("bill_id") ON DELETE CASCADE,
  "signal_type" VARCHAR(50),
  "signal_value" NUMERIC(10,4),
  "signal_description" TEXT,
  "contributes_to_risk" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
CREATE INDEX "idx_detection_signals_bill_type" ON "detection_signals" ("bill_id", "signal_type");
CREATE INDEX "idx_detection_signals_value" ON "detection_signals" ("signal_value");
CREATE INDEX "idx_detection_signals_contributes" ON "detection_signals" ("contributes_to_risk");
CREATE INDEX "idx_detection_signals_description" ON "detection_signals" ("signal_description");

-- Elite Knowledge Scores table
CREATE TABLE "elite_knowledge_scores" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "bill_id" UUID NOT NULL REFERENCES "bills" ("id") ON DELETE CASCADE,
  "elite_group" VARCHAR(100) NOT NULL,
  "knowledge_score" NUMERIC(5,2),
  "confidence_level" NUMERIC(3,2),
  "assessment_method" VARCHAR(50),
  "assessed_by" VARCHAR(100),
  "assessment_date" DATE,
  "evidence_sources" JSONB NOT NULL DEFAULT '[]'::jsonb,
  "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
CREATE INDEX "idx_elite_knowledge_scores_bill" ON "elite_knowledge_scores" ("bill_id");
CREATE INDEX "idx_elite_knowledge_scores_group" ON "elite_knowledge_scores" ("elite_group");
CREATE INDEX "idx_elite_knowledge_scores_score" ON "elite_knowledge_scores" ("knowledge_score");

-- Participation Quality Audits table
CREATE TABLE "participation_quality_audits" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "bill_id" UUID NOT NULL REFERENCES "bills" ("id") ON DELETE CASCADE,
  "audit_period_start" DATE NOT NULL,
  "audit_period_end" DATE NOT NULL,
  "total_participants" INTEGER NOT NULL DEFAULT 0,
  "quality_score" NUMERIC(5,2),
  "diversity_score" NUMERIC(5,2),
  "engagement_depth_score" NUMERIC(5,2),
  "influence_effectiveness_score" NUMERIC(5,2),
  "audit_methodology" VARCHAR(100),
  "audited_by" VARCHAR(100),
  "audit_findings" TEXT,
  "recommendations" TEXT,
  "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
CREATE INDEX "idx_participation_quality_audits_bill" ON "participation_quality_audits" ("bill_id");
CREATE INDEX "idx_participation_quality_audits_period" ON "participation_quality_audits" ("audit_period_start", "audit_period_end");
CREATE INDEX "idx_participation_quality_audits_score" ON "participation_quality_audits" ("quality_score");

-- Political Appointments table
CREATE TABLE "political_appointments" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "person_name" VARCHAR(255) NOT NULL,
  "position" VARCHAR(255) NOT NULL,
  "institution" VARCHAR(255) NOT NULL,
  "sponsor_id" UUID REFERENCES "sponsors" ("id") ON DELETE SET NULL,
  "ethnicity" VARCHAR(50),
  "home_county" VARCHAR(50),
  "gender" VARCHAR(20),
  "appointing_government" VARCHAR(100) NOT NULL,
  "appointment_date" DATE NOT NULL,
  "departure_date" DATE,
  "education_level" VARCHAR(100),
  "relevant_experience_years" SMALLINT,
  "previous_positions" JSONB NOT NULL DEFAULT '[]'::jsonb,
  "appointment_type" VARCHAR(50),
  "party_affiliation" VARCHAR(50),
  "political_relationship" VARCHAR(255),
  "performance_rating" NUMERIC(3,2),
  "corruption_allegations" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
CREATE INDEX "idx_appointments_govt_ethnicity" ON "political_appointments" ("appointing_government", "ethnicity");
CREATE INDEX "idx_appointments_institution" ON "political_appointments" ("institution");
CREATE INDEX "idx_appointments_ethnicity_county" ON "political_appointments" ("ethnicity", "home_county");
CREATE INDEX "idx_appointments_type" ON "political_appointments" ("appointment_type");

-- Infrastructure Tenders table
CREATE TABLE "infrastructure_tenders" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "project_name" VARCHAR(255) NOT NULL,
  "project_type" VARCHAR(100) NOT NULL,
  "contracting_authority" VARCHAR(255) NOT NULL,
  "tender_value" NUMERIC(15,2) NOT NULL,
  "final_cost" NUMERIC(15,2),
  "cost_overrun_percentage" NUMERIC(5,2),
  "winning_company" VARCHAR(255) NOT NULL,
  "company_owners" JSONB NOT NULL DEFAULT '[]'::jsonb,
  "beneficial_owners_disclosed" BOOLEAN NOT NULL DEFAULT false,
  "government_at_time" VARCHAR(100) NOT NULL,
  "tender_date" DATE NOT NULL,
  "project_county" VARCHAR(50),
  "coalition_stronghold" BOOLEAN,
  "project_status" VARCHAR(50),
  "completion_percentage" NUMERIC(5,2),
  "corruption_allegations" BOOLEAN NOT NULL DEFAULT false,
  "investigated" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
CREATE INDEX "idx_tenders_govt_county" ON "infrastructure_tenders" ("government_at_time", "project_county");
CREATE INDEX "idx_tenders_status" ON "infrastructure_tenders" ("project_status");
CREATE INDEX "idx_tenders_corruption" ON "infrastructure_tenders" ("corruption_allegations") WHERE "corruption_allegations" = true;

-- Ethnic Advantage Scores table
CREATE TABLE "ethnic_advantage_scores" (
  "community" VARCHAR(100) PRIMARY KEY,
  "colonial_era_score" NUMERIC(5,2),
  "kenyatta_era_score" NUMERIC(5,2),
  "moi_era_score" NUMERIC(5,2),
  "kibaki_era_score" NUMERIC(5,2),
  "uhuru_era_score" NUMERIC(5,2),
  "ruto_era_score" NUMERIC(5,2),
  "education_level_current" NUMERIC(5,2),
  "income_current" NUMERIC(15,2),
  "poverty_rate" NUMERIC(5,2),
  "infrastructure_access" NUMERIC(5,2),
  "cumulative_advantage_score" NUMERIC(5,2) NOT NULL,
  "deficit_score" NUMERIC(6,2),
  "last_updated" DATE NOT NULL DEFAULT NOW(),
  "methodology_version" VARCHAR(20),
  "data_sources" JSONB NOT NULL DEFAULT '{}'::jsonb,
  "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
CREATE INDEX "idx_advantage_deficit" ON "ethnic_advantage_scores" ("deficit_score");
CREATE INDEX "idx_advantage_cumulative" ON "ethnic_advantage_scores" ("cumulative_advantage_score");

-- Strategic Infrastructure Projects table
CREATE TABLE "strategic_infrastructure_projects" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "project_name" VARCHAR(255) NOT NULL UNIQUE,
  "project_code" VARCHAR(50) NOT NULL UNIQUE,
  "project_type" VARCHAR(50) NOT NULL,
  "initiating_government" VARCHAR(100) NOT NULL,
  "initiating_president" VARCHAR(100),
  "current_government" VARCHAR(100),
  "continued_by_successor" BOOLEAN,
  "governments_spanned" SMALLINT NOT NULL DEFAULT 1,
  "planned_start_date" DATE,
  "actual_start_date" DATE,
  "planned_completion_date" DATE,
  "actual_completion_date" DATE,
  "project_status" VARCHAR(50) NOT NULL,
  "completion_percentage" NUMERIC(5,2),
  "abandoned" BOOLEAN NOT NULL DEFAULT false,
  "abandonment_date" DATE,
  "abandonment_reason" TEXT,
  "abandonment_government" VARCHAR(100),
  "initial_budget" NUMERIC(18,2),
  "total_spent" NUMERIC(18,2),
  "legal_protection" BOOLEAN NOT NULL DEFAULT false,
  "protection_mechanism" TEXT,
  "ppp_structure" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
CREATE INDEX "idx_infra_status" ON "strategic_infrastructure_projects" ("project_status");
CREATE INDEX "idx_infra_continued" ON "strategic_infrastructure_projects" ("continued_by_successor");
CREATE INDEX "idx_infra_abandoned" ON "strategic_infrastructure_projects" ("abandoned") WHERE "abandoned" = true;


-- Additional indexes for query optimization
CREATE INDEX "bill_created_at_idx" ON "bills" ("created_at");
CREATE INDEX "user_created_at_idx" ON "users" ("created_at");
CREATE INDEX "comment_created_at_idx" ON "bill_comments" ("created_at");
CREATE INDEX "stakeholder_created_at_idx" ON "stakeholders" ("created_at");


-- Function and triggers to update updated_at timestamp automatically
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at
BEFORE UPDATE ON "users"
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bills_updated_at
BEFORE UPDATE ON "bills"
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bill_analysis_updated_at
BEFORE UPDATE ON "bill_analysis"
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_stakeholders_updated_at
BEFORE UPDATE ON "stakeholders"
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_stakeholder_impacts_updated_at
BEFORE UPDATE ON "stakeholder_impacts"
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bill_comments_updated_at
BEFORE UPDATE ON "bill_comments"
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_flags_updated_at
BEFORE UPDATE ON "user_flags"
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bill_engagement_updated_at
BEFORE UPDATE ON "bill_engagement"
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
