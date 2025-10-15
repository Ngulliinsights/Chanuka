
-- Add sponsor tables for bill sponsorship analysis
CREATE TABLE IF NOT EXISTS "sponsors" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "name" varchar(255) NOT NULL,
  "role" varchar(255) NOT NULL,
  "party" varchar(255),
  "constituency" varchar(255),
  "email" varchar(255),
  "phone" varchar(50),
  "conflict_level" varchar(20) DEFAULT 'low',
  "financial_exposure" numeric(15,2) DEFAULT '0',
  "voting_alignment" numeric(5,2) DEFAULT '0',
  "transparency_score" numeric(5,2) DEFAULT '0',
  "bio" text,
  "photo_url" text,
  "is_active" boolean DEFAULT true,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "sponsor_affiliations" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "sponsor_id" uuid NOT NULL,
  "organization" varchar(255) NOT NULL,
  "role" varchar(255) NOT NULL,
  "type" varchar(50) NOT NULL,
  "conflict_type" varchar(50) NOT NULL,
  "start_date" timestamp,
  "end_date" timestamp,
  "is_active" boolean DEFAULT true,
  "created_at" timestamp DEFAULT now(),
  CONSTRAINT "sponsor_affiliations_sponsor_id_sponsors_id_fk" FOREIGN KEY ("sponsor_id") REFERENCES "sponsors"("id") ON DELETE cascade
);

CREATE TABLE IF NOT EXISTS "bill_sponsorships" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "bill_id" uuid NOT NULL,
  "sponsor_id" uuid NOT NULL,
  "sponsorship_type" varchar(20) NOT NULL,
  "sponsorship_date" timestamp DEFAULT now(),
  "withdrawal_date" timestamp,
  "is_active" boolean DEFAULT true,
  "created_at" timestamp DEFAULT now(),
  CONSTRAINT "bill_sponsorships_bill_id_bills_id_fk" FOREIGN KEY ("bill_id") REFERENCES "bills"("id") ON DELETE cascade,
  CONSTRAINT "bill_sponsorships_sponsor_id_sponsors_id_fk" FOREIGN KEY ("sponsor_id") REFERENCES "sponsors"("id") ON DELETE cascade
);

CREATE TABLE IF NOT EXISTS "sponsor_transparency" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "sponsor_id" uuid NOT NULL,
  "disclosure" varchar(20) DEFAULT 'partial',
  "last_updated" timestamp DEFAULT now(),
  "public_statements" integer DEFAULT 0,
  "disclosure_documents" jsonb,
  "verification_status" varchar(20) DEFAULT 'pending',
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now(),
  CONSTRAINT "sponsor_transparency_sponsor_id_sponsors_id_fk" FOREIGN KEY ("sponsor_id") REFERENCES "sponsors"("id") ON DELETE cascade
);

CREATE TABLE IF NOT EXISTS "bill_section_conflicts" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "bill_id" uuid NOT NULL,
  "section_number" varchar(20) NOT NULL,
  "section_title" varchar(255) NOT NULL,
  "conflict_level" varchar(20) DEFAULT 'low',
  "description" text,
  "affected_sponsors" jsonb DEFAULT '[]'::jsonb,
  "analysis_data" jsonb,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now(),
  CONSTRAINT "bill_section_conflicts_bill_id_bills_id_fk" FOREIGN KEY ("bill_id") REFERENCES "bills"("id") ON DELETE cascade
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS "sponsor_name_idx" ON "sponsors" ("name");
CREATE INDEX IF NOT EXISTS "sponsor_party_idx" ON "sponsors" ("party");
CREATE INDEX IF NOT EXISTS "sponsor_affiliations_sponsor_id_idx" ON "sponsor_affiliations" ("sponsor_id");
CREATE INDEX IF NOT EXISTS "bill_sponsorships_bill_id_idx" ON "bill_sponsorships" ("bill_id");
CREATE INDEX IF NOT EXISTS "bill_sponsorships_sponsor_id_idx" ON "bill_sponsorships" ("sponsor_id");
CREATE INDEX IF NOT EXISTS "sponsor_transparency_sponsor_id_idx" ON "sponsor_transparency" ("sponsor_id");
CREATE INDEX IF NOT EXISTS "bill_section_conflicts_bill_id_idx" ON "bill_section_conflicts" ("bill_id");
